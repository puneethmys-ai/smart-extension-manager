let extListSelect = document.getElementById('extList');

chrome.management.getAll(function(exts) {
  exts.filter(x => x.type === 'extension' && x.id !== chrome.runtime.id).forEach(ext => {
    let option = document.createElement('option');
    option.value = ext.id;
    option.text = ext.name;
    extListSelect.appendChild(option);
  });
});

function refreshRules() {
  let rulesUl = document.getElementById('rules');
  rulesUl.innerHTML = '';
  chrome.storage.sync.get(['rules'], ({ rules }) => {
    rules = rules || [];
    rules.forEach((rule, idx) => {
      let li = document.createElement('li');
      li.textContent = 
        `On ${rule.site}: ${rule.enabled ? 'Enable' : 'Disable'} ${rule.extensionName}`;
      let btn = document.createElement('button');
      btn.textContent = 'Delete';
      btn.onclick = function() {
        rules.splice(idx, 1);
        chrome.storage.sync.set({ 'rules': rules }, refreshRules);
      };
      li.appendChild(btn);
      rulesUl.appendChild(li);
    });
  });
}

document.getElementById('ruleForm').addEventListener('submit', function(e) {
  e.preventDefault();
  let site = document.getElementById('site').value.trim();
  let extensionId = extListSelect.value;
  let extensionName = extListSelect.options[extListSelect.selectedIndex].text;
  let enabled = document.getElementById('enable').checked;
  chrome.storage.sync.get(['rules'], ({ rules }) => {
    rules = rules || [];
    rules.push({ site, extensionId, extensionName, enabled });
    chrome.storage.sync.set({ 'rules': rules }, refreshRules);
  });
  this.reset();
});

document.addEventListener('DOMContentLoaded', refreshRules);