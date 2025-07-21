let extListSelect = document.getElementById('extList');
let ruleForm = document.getElementById('ruleForm');
let siteInput = document.getElementById('site');
let enableCheckbox = document.getElementById('enable');
let rulesContainer = document.getElementById('rules');
let searchInput = document.getElementById('searchRules');

// Load extensions
async function loadExtensions() {
  try {
    const exts = await chrome.management.getAll();
    const sortedExts = exts
      .filter(x => x.type === 'extension' && x.id !== chrome.runtime.id)
      .sort((a, b) => a.name.localeCompare(b.name));

    extListSelect.innerHTML = '<option value="" disabled selected>Select an extension</option>';
    
    sortedExts.forEach(ext => {
      const option = document.createElement('option');
      option.value = ext.id;
      option.text = ext.name;
      option.dataset.icon = ext.icons ? ext.icons[0].url : '';
      extListSelect.appendChild(option);
    });
  } catch (error) {
    showError('Failed to load extensions');
  }
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

    filteredRules.forEach((rule, idx) => {
      const li = document.createElement('li');
      li.className = 'rule-item';
      li.innerHTML = `
        <div class="rule-info">
          <span class="rule-site">${escapeHtml(rule.site)}</span>
          <span class="rule-action ${rule.enabled ? 'enable' : 'disable'}">
            ${rule.enabled ? 'Enables' : 'Disables'}
          </span>
          <span class="rule-extension">${escapeHtml(rule.extensionName)}</span>
        </div>
        <div class="rule-actions">
          <button class="edit-btn" title="Edit rule">Edit</button>
          <button class="delete-btn" title="Delete rule">Delete</button>
        </div>
      `;

      // Delete handler
      li.querySelector('.delete-btn').onclick = async () => {
        if (confirm('Are you sure you want to delete this rule?')) {
          try {
            rules.splice(idx, 1);
            await chrome.storage.sync.set({ rules });
            refreshRules(searchInput.value);
            showSuccess('Rule deleted successfully');
          } catch (error) {
            showError('Failed to delete rule');
          }
        }
      };

      // Edit handler
      li.querySelector('.edit-btn').onclick = () => {
        siteInput.value = rule.site;
        extListSelect.value = rule.extensionId;
        enableCheckbox.checked = rule.enabled;
        rules.splice(idx, 1);
        chrome.storage.sync.set({ rules });
        refreshRules(searchInput.value);
        siteInput.focus();
      };

      rulesContainer.appendChild(li);
    });
  });
}

// Form submission handler
ruleForm.addEventListener('submit', async function(e) {
  e.preventDefault();
  
  const site = siteInput.value.trim();
  const extensionId = extListSelect.value;
  const extensionName = extListSelect.options[extListSelect.selectedIndex].text;
  const enabled = enableCheckbox.checked;

  // Validation
  if (!site || !extensionId) {
    showError('Please fill in all required fields');
    return;
  }

  try {
    // Check for duplicates
    const { rules = [] } = await chrome.storage.sync.get(['rules']);
    const isDuplicate = rules.some(rule =>
      rule.site === site && rule.extensionId === extensionId
    );

    if (isDuplicate) {
      showError('A rule for this site and extension already exists');
      return;
    }

    // Add new rule
    rules.push({ site, extensionId, extensionName, enabled });
    await chrome.storage.sync.set({ rules });
    
    this.reset();
    refreshRules();
    showSuccess('Rule added successfully');
  } catch (error) {
    showError('Failed to save rule');
  }
});

// Search handler
searchInput.addEventListener('input', (e) => {
  refreshRules(e.target.value.trim());
});

// Utility functions
function showError(message) {
  const errorDiv = document.getElementById('error-message');
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

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadExtensions();
  refreshRules();
});