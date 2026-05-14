const DB_NAME = 'promptvault-db';
const DB_VERSION = 1;
const TRUSTED_SHARE_ORIGIN = 'https://abhisheksinghtomardev.github.io';

function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains('prompts')) {
        const promptStore = db.createObjectStore('prompts', { keyPath: 'id' });
        promptStore.createIndex('userId', 'userId', { unique: false });
        promptStore.createIndex('title', 'title', { unique: false });
        promptStore.createIndex('isFavorite', 'isFavorite', { unique: false });
      }

      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
    };
  });
}

async function savePrompt(prompt) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('prompts', 'readwrite');
    const store = tx.objectStore('prompts');
    const request = store.put(prompt);
    request.onsuccess = () => resolve(prompt);
    request.onerror = () => reject(request.error);
  });
}

async function captureFromActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    return { success: false, error: 'No active tab found' };
  }

  try {
    return await chrome.tabs.sendMessage(tab.id, { action: 'capturePrompt' });
  } catch (error) {
    return {
      success: false,
      error: 'PromptVault cannot read this page. Reload the page and try again.'
    };
  }
}

chrome.commands.onCommand.addListener((command) => {
  if (command === 'save-prompt') {
    captureFromActiveTab();
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'captureFromActiveTab') {
    captureFromActiveTab().then(sendResponse);
    return true;
  }

  if (message.action === 'savePrompt') {
    savePrompt(message.prompt)
      .then((prompt) => sendResponse({ success: true, prompt }))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true;
  }

  return false;
});

chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  if (sender.origin !== TRUSTED_SHARE_ORIGIN) {
    sendResponse({ success: false, error: 'Untrusted share page.' });
    return false;
  }

  if (message.action === 'importSharedPrompt') {
    savePrompt(message.prompt)
      .then((prompt) => sendResponse({ success: true, prompt }))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true;
  }

  return false;
});

initDB().catch(console.error);
