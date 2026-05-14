# PromptVault - Save and Share AI Prompts Locally

<p align="center">
  <img src="icons/icon.svg" alt="PromptVault" width="128" height="128">
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

### Quick Install

1. Download the latest release from [Releases](https://github.com/abhisheksinghtomarDev/promptvault/releases)
2. Extract the ZIP file
3. Open Chrome → `chrome://extensions/`
4. Enable **Developer mode**
5. Click **"Load unpacked"**
6. Select the extracted `promptvault` folder

That's it! Press `Ctrl+Shift+S` on any AI site to save prompts.

### Clone & Install

```bash
git clone https://github.com/abhisheksinghtomarDev/promptvault.git
# Then load the extension from the cloned promptvault folder
```

---

## Usage

### Save a Prompt

1. Go to ChatGPT, Claude, or any AI site
2. Type your prompt in the text box
3. Press `Ctrl+Shift+S` (or click extension icon → "Save Current Prompt")
4. Enter title and save

### Share a Prompt

1. Click extension icon
2. Click **"Share"** on any prompt
3. Link is copied - send to anyone!

### Import Shared Prompt

1. Open the shared link
2. Prompt auto-imports to your library

---

## How Sharing Works

```
┌─────────────┐     ┌─────────────┐
│ Your Browser│────▶│ Friend's    │
│  (Local DB)  │ Link│  (Local DB) │
└─────────────┘     └─────────────┘
```

No server, no accounts - data lives in the URL!

---

## File Structure

```
promptvault/
├── manifest.json   # Extension config
├── background.js  # Core logic (IndexedDB)
├── content.js     # Captures prompts
├── share.html     # Import page for shared links
├── popup/         # UI components
└── icons/         # Extension icons
```

---

## Privacy

- 🔒 100% local storage
- 🔒 No server calls
- 🔒 No tracking
- 🔒 No account needed

---

## License

MIT
