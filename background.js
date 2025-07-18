chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    applyRulesForURL(tab.url);
  }
});

function applyRulesForURL(url) {
  chrome.storage.sync.get(['rules'], ({ rules }) => {
    if (!rules) return;
    rules.forEach(rule => {
      if (url.includes(rule.site)) {
        chrome.management.setEnabled(rule.extensionId, rule.enabled);
      }
    });
  });
}