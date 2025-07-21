// Global variables
let extensionsList = [];
let ruleForm;
let siteInput;
let rulesContainer;
let searchRulesInput;
let searchExtensionsInput;
let extensionsForRuleContainer;
let selectedExtensionIds = []; // Changed from single ID to array of IDs

async function initializePopup() {
  setupTabs();
  await refreshList();
  setupSearchAndFilter();
  setupSortingOptions();
  await loadRuleElements();
  refreshRules();
  setupRuleEventListeners();
}

// Setup tab functionality
function setupTabs() {
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  
  tabButtons.forEach(button => {
    button.addEventListener('click', async () => {
      // Remove active class from all buttons and contents
      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabContents.forEach(content => content.classList.remove('active'));
      
      // Add active class to clicked button and corresponding content
      button.classList.add('active');
      const tabId = button.dataset.tab;
      document.getElementById(tabId).classList.add('active');
      
      // Handle extension states based on tab
      if (tabId === 'rules-tab') {
        // Reset selected extensions
        selectedExtensionIds = [];
        
        // Update extension toggles
        document.querySelectorAll('#extensionsForRule input[type="checkbox"]').forEach(cb => {
          cb.checked = false;
        });
        

      } else if (tabId === 'extensions-tab') {
        // Restore original extension states when going back to extensions tab
        try {
          await refreshList(); // This will refresh the UI with current extension states
        } catch (error) {
          showError('Failed to refresh extensions');
        }
      }
    });
  });
}

async function loadRuleElements() {
  // Initialize rule elements
  ruleForm = document.getElementById('ruleForm');
  siteInput = document.getElementById('site');
  rulesContainer = document.getElementById('rules');
  searchRulesInput = document.getElementById('searchRules');
  searchExtensionsInput = document.getElementById('searchExtensions');
  extensionsForRuleContainer = document.getElementById('extensionsForRule');
  
  // Render extensions for rule creation
  renderExtensionsForRule(extensionsList);
  
  // Setup search for extensions in rule tab
  searchExtensionsInput.addEventListener('input', () => {
    const searchTerm = searchExtensionsInput.value.toLowerCase();
    const filteredExtensions = extensionsList.filter(ext => 
      ext.name.toLowerCase().includes(searchTerm));
    renderExtensionsForRule(filteredExtensions);
  });
}

async function refreshList() {
  try {
    const exts = await chrome.management.getAll();
    extensionsList = exts.filter(x => x.type === 'extension' && x.id !== chrome.runtime.id);
    renderExtensions(extensionsList);
  } catch (error) {
    console.error('Error loading extensions:', error);
    document.getElementById('error-message').textContent = 'Failed to load extensions';
  }
}

function renderExtensions(extensions) {
  const list = document.getElementById('extList');
  list.innerHTML = '';
  
  if (extensions.length === 0) {
    list.innerHTML = '<li class="no-results">No extensions found</li>';
    return;
  }

  extensions.forEach(ext => {
    const li = document.createElement('li');
    li.className = 'extension-item';
    li.innerHTML = `
      <div class="extension-row">
        <label class="switch">
          <input type="checkbox" ${ext.enabled ? 'checked' : ''} data-id="${ext.id}">
          <span class="slider round"></span>
        </label>
        <img src="${ext.icons ? ext.icons[0].url : 'default-icon.png'}" class="extension-icon">
        <div class="extension-info">
          <span class="extension-name">${ext.name}</span>
          <span class="extension-version">v${ext.version}</span>
        </div>
        <button class="add-rule-btn" data-id="${ext.id}" data-name="${ext.name}">Add Rule</button>
      </div>
    `;

    // Toggle extension enabled/disabled
    const toggle = li.querySelector('input[type="checkbox"]');
    toggle.addEventListener('change', async function() {
      try {
        await chrome.management.setEnabled(ext.id, this.checked);
        showSuccess(`${ext.name} ${this.checked ? 'enabled' : 'disabled'}`);
      } catch (error) {
        showError(`Failed to ${this.checked ? 'enable' : 'disable'} ${ext.name}`);
        this.checked = !this.checked; // Revert the toggle
      }
    });

    // Quick add rule button
    const addRuleBtn = li.querySelector('.add-rule-btn');
    addRuleBtn.addEventListener('click', async () => {

      
      // Switch to rules tab
      document.querySelector('[data-tab="rules-tab"]').click();
      
      // Set the selected extension ID
      selectedExtensionIds = [ext.id];
      
      // Update the extension toggles to reflect the selected extension
      setTimeout(() => {
        document.querySelectorAll('#extensionsForRule input[type="checkbox"]').forEach(cb => {
          cb.checked = selectedExtensionIds.includes(cb.dataset.id);
        });
        
        // Focus on the site input
        siteInput.focus();
      }, 100); // Small delay to ensure DOM is updated
    });

    list.appendChild(li);
  });
}

function setupSearchAndFilter() {
  const searchInput = document.getElementById('searchInput');
  const filterSelect = document.getElementById('filterSelect');

  function updateList() {
    const searchTerm = searchInput.value.toLowerCase();
    const filterValue = filterSelect.value;

    const filtered = extensionsList.filter(ext => {
      const matchesSearch = ext.name.toLowerCase().includes(searchTerm);
      const matchesFilter = filterValue === 'all' ||
        (filterValue === 'enabled' && ext.enabled) ||
        (filterValue === 'disabled' && !ext.enabled);
      return matchesSearch && matchesFilter;
    });

    renderExtensions(filtered);
  }

  searchInput.addEventListener('input', updateList);
  filterSelect.addEventListener('change', updateList);
}

function setupSortingOptions() {
  const sortSelect = document.getElementById('sortSelect');

  sortSelect.addEventListener('change', () => {
    const sortValue = sortSelect.value;
    extensionsList.sort((a, b) => {
      switch (sortValue) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'enabled':
          return b.enabled - a.enabled;
        case 'recent':
          return new Date(b.lastUsed) - new Date(a.lastUsed);
        default:
          return 0;
      }
    });
    renderExtensions(extensionsList);
  });
}

// Refresh rules list with search and sort
function refreshRules(searchTerm = '') {
  chrome.storage.sync.get(['rules'], ({ rules = [] }) => {
    const filteredRules = searchTerm
      ? rules.filter(rule =>
          rule.site.toLowerCase().includes(searchTerm.toLowerCase()) ||
          rule.extensionName.toLowerCase().includes(searchTerm.toLowerCase()))
      : rules;

    rulesContainer.innerHTML = '';
    
    if (filteredRules.length === 0) {
      const emptyMessage = document.createElement('div');
      emptyMessage.className = 'empty-message';
      emptyMessage.textContent = searchTerm 
        ? 'No matching rules found'
        : 'No rules added yet. Create your first rule above.';
      rulesContainer.appendChild(emptyMessage);
      return;
    }

    // Group rules by site for better organization
    const rulesBySite = {};
    filteredRules.forEach(rule => {
      if (!rulesBySite[rule.site]) {
        rulesBySite[rule.site] = [];
      }
      rulesBySite[rule.site].push(rule);
    });

    // Create rule items grouped by site
    Object.entries(rulesBySite).forEach(([site, siteRules]) => {
      const siteHeader = document.createElement('div');
      siteHeader.className = 'site-header';
      siteHeader.textContent = site;
      rulesContainer.appendChild(siteHeader);

      // Create a container for all extensions in this site rule
      const ruleContainer = document.createElement('div');
      ruleContainer.className = 'site-rule-container';
      
      siteRules.forEach((rule, idx) => {
        const ruleIndex = filteredRules.findIndex(r => 
          r.site === rule.site && r.extensionId === rule.extensionId);
        
        const li = document.createElement('li');
        li.className = 'rule-item';
        li.innerHTML = `
          <div class="rule-info">
            <span class="rule-action ${rule.enabled ? 'enable' : 'disable'}">
              ${rule.enabled ? 'Enable' : 'Disable'}
            </span>
            <span class="rule-extension">${escapeHtml(rule.extensionName)}</span>
          </div>
          <div class="rule-actions">
            <button class="delete-single-btn" title="Delete this extension rule">Remove</button>
          </div>
        `;
        
        ruleContainer.appendChild(li);
        
        // Add delete handler for individual extension rule
        li.querySelector('.delete-single-btn').onclick = async () => {
          if (confirm(`Are you sure you want to remove ${rule.extensionName} from this rule?`)) {
            try {
              rules.splice(ruleIndex, 1);
              await chrome.storage.sync.set({ rules });
              refreshRules(searchRulesInput.value);
              showSuccess(`${rule.extensionName} removed from rule`);
            } catch (error) {
              showError('Failed to update rule');
            }
          }
        };
      });
      
      // Add edit and delete buttons for the entire site rule
      const ruleActions = document.createElement('div');
      ruleActions.className = 'site-rule-actions';
      ruleActions.innerHTML = `
        <button class="edit-btn" title="Edit all rules for this site">Edit All</button>
        <button class="delete-btn" title="Delete all rules for this site">Delete All</button>
      `;

      // Add the rule container to the DOM
      rulesContainer.appendChild(ruleContainer);
      
      // Add the actions to the DOM
      rulesContainer.appendChild(ruleActions);
      
      // Delete all handler for this site
      ruleActions.querySelector('.delete-btn').onclick = async () => {
        if (confirm(`Are you sure you want to delete all rules for ${site}?`)) {
          try {
            // Remove all rules for this site
            const updatedRules = rules.filter(rule => rule.site !== site);
            await chrome.storage.sync.set({ rules: updatedRules });
            refreshRules(searchRulesInput.value);
            showSuccess(`All rules for ${site} deleted successfully`);
          } catch (error) {
            showError('Failed to delete rules');
          }
        }
      };

      // Edit handler for all rules for this site
      ruleActions.querySelector('.edit-btn').onclick = () => {
        siteInput.value = site;
        selectedExtensionIds = siteRules.map(rule => rule.extensionId);
        
        // Update the extension toggles to reflect the selected extensions
        document.querySelectorAll('#extensionsForRule input[type="checkbox"]').forEach(cb => {
          cb.checked = selectedExtensionIds.includes(cb.dataset.id);
        });
        
        // Update the counter
        const selectedCounter = document.querySelector('.selected-counter');
        if (selectedCounter) {
          selectedCounter.textContent = `Selected: ${selectedExtensionIds.length} extension(s)`;
        }
        
        // Remove all rules for this site and then refresh
        const updatedRules = rules.filter(rule => rule.site !== site);
        chrome.storage.sync.set({ rules: updatedRules }, () => {
          refreshRules(searchRulesInput.value);
          // Switch to rules tab
          document.querySelector('[data-tab="rules-tab"]').click();
          siteInput.focus();
        });
      };
      });
    });
} // End of refreshRules function

// Render extensions for rule creation with toggle switches
function renderExtensionsForRule(extensions) {
  extensionsForRuleContainer.innerHTML = '';
  
  if (extensions.length === 0) {
    extensionsForRuleContainer.innerHTML = '<div class="no-results">No extensions found</div>';
    return;
  }

  // Add a counter for selected extensions
  const selectedCounter = document.createElement('div');
  selectedCounter.className = 'selected-counter';
  selectedCounter.textContent = `Selected: ${selectedExtensionIds.length} extension(s)`;
  extensionsForRuleContainer.appendChild(selectedCounter);

  extensions.forEach(ext => {
    const extDiv = document.createElement('div');
    extDiv.className = 'extension-rule-item';
    extDiv.innerHTML = `
      <div class="extension-row">
        <label class="switch">
          <input type="checkbox" data-id="${ext.id}" ${selectedExtensionIds.includes(ext.id) ? 'checked' : ''}>
          <span class="slider round"></span>
        </label>
        <img src="${ext.icons ? ext.icons[0].url : 'default-icon.png'}" class="extension-icon">
        <div class="extension-info">
          <span class="extension-name">${ext.name}</span>
          <span class="extension-version">v${ext.version}</span>
        </div>
      </div>
    `;

    // Toggle extension selection
    const toggle = extDiv.querySelector('input[type="checkbox"]');
    toggle.addEventListener('change', async function() {
      const extId = ext.id;
      
      if (this.checked) {
        // Add to selected extensions if not already included
        if (!selectedExtensionIds.includes(extId)) {
          selectedExtensionIds.push(extId);
        }
        

      } else {
        // Remove from selected extensions
        selectedExtensionIds = selectedExtensionIds.filter(id => id !== extId);
        

      }
      
      // Update the counter
      selectedCounter.textContent = `Selected: ${selectedExtensionIds.length} extension(s)`;
    });

    extensionsForRuleContainer.appendChild(extDiv);
  });
}

// Setup rule event listeners
function setupRuleEventListeners() {
  // Form submission handler
  ruleForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const site = siteInput.value.trim();
    
    // Validation
    if (!site || selectedExtensionIds.length === 0) {
      showError('Please fill in the site field and select at least one extension');
      return;
    }

    try {
      // Get existing rules
      let { rules = [] } = await chrome.storage.sync.get(['rules']);
      
      // Check if a rule for this site already exists
      const siteExists = rules.some(rule => rule.site === site);
      
      if (siteExists) {
        // Ask user if they want to replace the existing rule
        if (confirm(`A rule for ${site} already exists. Do you want to replace it?`)) {
          // Remove all rules for this site
          rules = rules.filter(rule => rule.site !== site);
        } else {
          return; // User canceled
        }
      }
      
      // Add new rules for each selected extension
      for (const extensionId of selectedExtensionIds) {
        const extension = extensionsList.find(ext => ext.id === extensionId);
        if (extension) {
          rules.push({
            site,
            extensionId,
            extensionName: extension.name,
            enabled: true // Default to enabling the extension
          });
        }
      }
      
      await chrome.storage.sync.set({ rules });
      
      const numExtensions = selectedExtensionIds.length;
      
      this.reset();
      selectedExtensionIds = []; // Reset selected extensions
      document.querySelectorAll('#extensionsForRule input[type="checkbox"]').forEach(cb => {
        cb.checked = false;
      });
      document.querySelector('.selected-counter').textContent = 'Selected: 0 extension(s)';
      
      refreshRules();
      showSuccess(`Rule for ${site} with ${numExtensions} extension(s) added successfully`);
    } catch (error) {
      showError('Failed to save rule');
    }
  });

  // Search rules handler
  searchRulesInput.addEventListener('input', (e) => {
    refreshRules(e.target.value.trim());
  });
}

// Utility functions
function showError(message) {
  const errorDiv = document.getElementById('rules-error-message');
  errorDiv.textContent = message;
  errorDiv.style.display = 'block';
  setTimeout(() => {
    errorDiv.style.display = 'none';
  }, 3000);
}

function showSuccess(message) {
  const successDiv = document.getElementById('success-message');
  successDiv.textContent = message;
  successDiv.style.display = 'block';
  setTimeout(() => {
    successDiv.style.display = 'none';
  }, 3000);
}

function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

document.addEventListener('DOMContentLoaded', initializePopup);