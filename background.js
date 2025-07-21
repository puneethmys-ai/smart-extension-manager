// Cache rules in memory for better performance
let cachedRules = null;

// Initialize rules cache
chrome.storage.sync.get(['rules'], ({ rules }) => {
  cachedRules = rules || [];
});

// Listen for rule changes
chrome.storage.onChanged.addListener((changes) => {
  if (changes.rules) {
    cachedRules = changes.rules.newValue || [];
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    applyRulesForURL(tab.url);
  }
});

// Listen for tab activation (switching between tabs)
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (tab.url) {
      applyRulesForURL(tab.url);
    }
  } catch (error) {
    console.error('Error handling tab activation:', error);
  }
});

async function applyRulesForURL(url) {
  if (!cachedRules || !cachedRules.length) return;

  try {
    // Find all rules that match the current URL
    const matchingRules = cachedRules.filter(rule => {
      // Convert site pattern to regex for better matching
      const pattern = rule.site.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        .replace(/\\\*/g, '.*');
      return new RegExp(pattern).test(url);
    });

    // Get all extensions
    const allExtensions = await chrome.management.getAll();
    const extensionsToManage = allExtensions.filter(ext => 
      ext.type === 'extension' && ext.id !== chrome.runtime.id
    );
    
    // If no matching rules, disable all extensions
    if (matchingRules.length === 0) {
      const disablePromises = extensionsToManage
        .filter(ext => ext.enabled)
        .map(ext => chrome.management.setEnabled(ext.id, false));
      
      await Promise.all(disablePromises);
      return;
    }
    
    // Get unique sites from matching rules
    const matchingSites = [...new Set(matchingRules.map(rule => rule.site))];
    
    // If multiple sites match, prioritize the most specific one (longest site string)
    const primarySite = matchingSites.sort((a, b) => b.length - a.length)[0];
    
    // Get all extensions that should be enabled for this site
    const extensionsToEnable = matchingRules
      .filter(rule => rule.site === primarySite && rule.enabled)
      .map(rule => rule.extensionId);
    
    // Create a list of promises for all extension state changes
    const stateChangePromises = [];
    
    // Process each extension
    for (const ext of extensionsToManage) {
      // If the extension should be enabled for this site
      if (extensionsToEnable.includes(ext.id)) {
        if (!ext.enabled) {
          stateChangePromises.push(chrome.management.setEnabled(ext.id, true));
        }
      } 
      // Otherwise disable it
      else if (ext.enabled) {
        stateChangePromises.push(chrome.management.setEnabled(ext.id, false));
      }
    }

    // Apply all state changes in parallel
    await Promise.all(stateChangePromises);
    
    console.log(`Applied rules for ${primarySite}: Enabled ${extensionsToEnable.length} extension(s)`);
  } catch (error) {
    console.error('Error applying rules:', error);
  }
}