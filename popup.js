function refreshList() {
  chrome.management.getAll(function(exts) {
    let list = document.getElementById('extList');
    list.innerHTML = '';
    exts.filter(x => x.type === 'extension' && x.id !== chrome.runtime.id).forEach(ext => {
      let li = document.createElement('li');
      li.innerHTML = `
        <input type="checkbox" ${ext.enabled ? 'checked' : ''} id="${ext.id}">
        <label>${ext.name}</label>
      `;
      li.querySelector('input').addEventListener('change', function () {
        chrome.management.setEnabled(ext.id, this.checked);
      });
      list.appendChild(li);
    });
  });
}

document.addEventListener('DOMContentLoaded', refreshList);