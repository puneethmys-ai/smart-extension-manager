# Smart Extension Manager 🚀

A Chrome extension that lets you automatically enable or disable other extensions based on the websites you visit.

## 🔧 Features

- ✅ Manually toggle extensions from a convenient popup
- 🌐 Set site-specific rules to auto-enable/disable extensions
- 🔄 Automatically apply rules when a tab is updated
- ⚙️ Simple options UI to add, view, and delete rules
- 🧠 Remembers your configurations using Chrome storage

---

## 📦 How to Use

1. Go to **chrome://extensions/** and turn on **Developer mode** (top right).
2. Click **"Load unpacked"** and select the `smart-extension-manager` folder.
3. Click the extension icon in your Chrome toolbar to open the popup.
4. Use the **Options page** to set automation rules for different websites.

---

## 📁 Folder Structure

smart-extension-manager/
├── background.js
├── manifest.json
├── options.html
├── options.js
├── popup.html
├── popup.js
├── styles.css
├── README.md


---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

## 🙌 Contributing

Pull requests are welcome! If you'd like to contribute or suggest improvements, feel free to create an issue or a PR.

---

## 🛡 Disclaimer

Due to Chrome extension API limitations, enabling/disabling extensions works globally – not per-tab. This extension simulates per-site behavior by applying rules upon tab changes.