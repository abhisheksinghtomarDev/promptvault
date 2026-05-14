# PromptVault - Save and Share AI Prompts Locally

<p align="center">
  <img src="icons/icon128.png" alt="PromptVault" width="128" height="128">
</p>

<p align="center">
  <strong>The fastest way to save and share your AI prompts.</strong>
</p>

<p align="center">
  🔒 100% Local | 📱 No Account Needed | 🚀 No Server Required
</p>

---

## Features

- ✅ **Quick Save** - Press `Ctrl+Shift+S` to save any prompt
- ✅ **Local Storage** - All prompts stored in your browser (IndexedDB)
- ✅ **Privacy First** - Your prompts never leave your device
- ✅ **Share via URL** - Generate shareable links with prompt data encoded
- ✅ **Search & Filter** - Find prompts instantly
- ✅ **Favorites** - Mark your best prompts
- ✅ **Import Shared Prompts** - One click to import shared prompts

---

## Supported AI Sites

- ChatGPT (chat.openai.com)
- Claude (claude.ai)
- Gemini (gemini.google.com)
- Perplexity (perplexity.ai)
- Any textarea on any website

---

## Installation

### Option 1: Download & Install (Recommended for MVP)

1. Download the latest release from the [Releases page](https://github.com/abhisheksinghtomarDev/promptvault/releases)
2. Extract the ZIP file
3. Open Chrome and go to `chrome://extensions/`
4. Enable **Developer mode** (toggle in top right)
5. Click **"Load unpacked"**
6. Select the `promptvault-extension` folder
7. Click the extension icon in your toolbar to start using!

### Option 2: Clone & Install

```bash
# Clone the repository
git clone https://github.com/abhisheksinghtomarDev/promptvault.git

# Open Chrome extensions
chrome://extensions/

# Enable Developer mode, click "Load unpacked"
# Select: promptvault/extension/promptvault-extension/
```

---

## Usage

### Save a Prompt

1. Go to ChatGPT, Claude, or any AI site
2. Type your prompt in the text box
3. Press `Ctrl+Shift+S` (or click the extension icon → "Save Current Prompt")
4. Enter a title and click Save

### Manage Your Prompts

1. Click the PromptVault icon in your browser toolbar
2. View all your saved prompts
3. Use the search bar to filter
4. Click tabs to switch between "All" and "Favorites"

### Share a Prompt

1. Click the PromptVault icon
2. Find your prompt and click **"Share"**
3. The share link is copied to your clipboard
4. Send it to anyone!

### Import a Shared Prompt

When someone shares a PromptVault link with you:
1. Open the shared link
2. The prompt is automatically imported to your library
3. Done! No account needed.

---

## How Sharing Works

```
┌─────────────────┐     ┌──────────────────┐
│  Your Browser   │     │  Friend's        │
│  (IndexedDB)     │────▶│  Browser         │
│                 │ Link │  (IndexedDB)     │
└─────────────────┘     └──────────────────┘
```

Prompt data is encoded directly in the URL - no server, no database, no accounts.

---

## For Shared Links to Work

The `share.html` page needs to be hosted. This is already set up for GitHub Pages.

1. Enable GitHub Pages in your repository settings
2. Set source to `main` branch, `/docs` folder (or root)
3. Shared links will work automatically!

---

## File Structure

```
extension/
└── promptvault-extension/
    ├── manifest.json      # Chrome extension configuration
    ├── background.js       # Core logic & IndexedDB storage
    ├── content.js          # Captures prompts from AI sites
    ├── share.html          # Import page for shared prompts
    ├── popup/
    │   ├── popup.html      # Extension popup interface
    │   ├── popup.js        # Popup logic & IndexedDB queries
    │   └── popup.css        # Popup styling
    └── icons/              # Extension icons
```

---

## Privacy

- 🔒 All data stored locally in your browser
- 🔒 No data sent to any server
- 🔒 No cookies, no tracking, no analytics
- 🔒 No account required

---

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

## License

MIT License - feel free to use, modify, and distribute.

---

## Support

If you find this useful, consider:

- ⭐ Starring the repository
- 🐛 Reporting issues
- 💡 Suggesting features
- 📢 Sharing with others

---

<p align="center">
  Made with ❤️ for AI users everywhere
</p>
