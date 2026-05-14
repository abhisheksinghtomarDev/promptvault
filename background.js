// IndexedDB Database Name and Version
const DB_NAME = 'promptvault-db';
const DB_VERSION = 1;

// Initialize IndexedDB
function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Prompts store
      if (!db.objectStoreNames.contains('prompts')) {
        const promptStore = db.createObjectStore('prompts', { keyPath: 'id' });
        promptStore.createIndex('userId', 'userId', { unique: false });
        promptStore.createIndex('title', 'title', { unique: false });
        promptStore.createIndex('isFavorite', 'isFavorite', { unique: false });
      }

      // Settings store
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
    };
  });
}

// DB Operations
async function getAllPrompts(userId) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('prompts', 'readonly');
    const store = tx.objectStore('prompts');
    const index = store.index('userId');
    const request = index.getAll(userId);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getPromptById(id) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('prompts', 'readonly');
    const store = tx.objectStore('prompts');
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
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

async function deletePrompt(id) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('prompts', 'readwrite');
    const store = tx.objectStore('prompts');
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function checkTitleExists(title, userId) {
  const prompts = await getAllPrompts(userId);
  return prompts.some(p => p.title.toLowerCase() === title.toLowerCase());
}

async function getFavorites(userId) {
  const prompts = await getAllPrompts(userId);
  return prompts.filter(p => p.isFavorite);
}

async function searchPrompts(userId, term) {
  const prompts = await getAllPrompts(userId);
  const lowerTerm = term.toLowerCase();
  return prompts.filter(p =>
    p.title.toLowerCase().includes(lowerTerm) ||
    p.content.toLowerCase().includes(lowerTerm)
  );
}

// Generate unique ID
function generateId() {
  return 'pv-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 9);
}

// Generate share URL with prompt data
function generateShareUrl(prompt) {
  const data = {
    t: prompt.title,
    c: prompt.content,
    d: prompt.description || '',
    v: prompt.visibility || 'public'
  };
  const encoded = btoa(encodeURIComponent(JSON.stringify(data)));
  return `https://promptvault.app/share#data=${encoded}`;
}

// Parse shared URL
function parseShareUrl(url) {
  try {
    const hashIndex = url.indexOf('#data=');
    if (hashIndex === -1) return null;
    const encoded = url.substring(hashIndex + 6);
    const decoded = decodeURIComponent(atob(encoded));
    return JSON.parse(decoded);
  } catch (e) {
    return null;
  }
}

// Get current user ID (stored locally)
function getUserId() {
  return localStorage.getItem('promptvault_user_id') || 'local-user';
}

let capturedPrompt = '';
let capturedTitle = '';

// Listen for keyboard shortcut
browser.commands.onCommand.addListener(async (command) => {
  if (command === 'save-prompt') {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      await browser.tabs.sendMessage(tab.id, { action: 'capturePrompt' });
    }
  }
});

// Listen for messages from content script or popup
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'promptCaptured') {
    capturedPrompt = message.content;
    showTitleModal();
  }
  return true;
});

// Show title modal
function showTitleModal() {
  const modal = document.createElement('div');
  modal.id = 'promptvault-modal';
  modal.innerHTML = `
    <div class="modal-overlay"></div>
    <div class="modal-content">
      <h2>Save Prompt</h2>
      <form id="promptvault-form">
        <label for="title-input">Title</label>
        <input type="text" id="title-input" placeholder="Enter prompt title..." required minlength="3" maxlength="100">
        <div id="title-error" class="error"></div>
        <div id="duplicate-options" class="hidden">
          <p>A prompt with this title already exists.</p>
          <button type="button" id="replace-btn">Replace Existing</button>
          <button type="button" id="rename-btn">Enter New Title</button>
        </div>
        <div class="buttons">
          <button type="button" id="cancel-btn">Cancel</button>
          <button type="submit" id="save-btn">Save</button>
        </div>
      </form>
      <div id="result" class="hidden">
        <p>Prompt saved successfully!</p>
        <div class="share-link">
          <input type="text" id="share-url" readonly>
          <button type="button" id="copy-btn">Copy</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  injectModalStyles();

  const form = modal.querySelector('#promptvault-form');
  const titleInput = modal.querySelector('#title-input');
  const titleError = modal.querySelector('#title-error');
  const duplicateOptions = modal.querySelector('#duplicate-options');
  const cancelBtn = modal.querySelector('#cancel-btn');
  const resultDiv = modal.querySelector('#result');
  const shareUrl = modal.querySelector('#share-url');
  const copyBtn = modal.querySelector('#copy-btn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    capturedTitle = titleInput.value.trim();

    if (!capturedTitle || capturedTitle.length < 3) {
      titleError.textContent = 'Title must be at least 3 characters';
      return;
    }

    titleError.textContent = '';
    await checkAndSave();
  });

  cancelBtn.addEventListener('click', closeModal);
  modal.querySelector('.modal-overlay').addEventListener('click', closeModal);

  let existingPromptId = null;

  async function checkAndSave(replaceId = null) {
    const userId = getUserId();

    if (!replaceId) {
      const exists = await checkTitleExists(capturedTitle, userId);
      if (exists) {
        duplicateOptions.classList.remove('hidden');
        const prompts = await getAllPrompts(userId);
        const existing = prompts.find(p => p.title.toLowerCase() === capturedTitle.toLowerCase());
        existingPromptId = existing?.id;
        return;
      }
    }

    await saveNewPrompt(replaceId);
  }

  async function saveNewPrompt(replaceId = null) {
    const userId = getUserId();
    const now = new Date().toISOString();

    const prompt = {
      id: replaceId || generateId(),
      userId: userId,
      title: capturedTitle,
      slug: capturedTitle.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
      content: capturedPrompt,
      description: '',
      visibility: 'public',
      isFavorite: false,
      createdAt: replaceId ? undefined : now,
      updatedAt: now,
      tags: []
    };

    if (replaceId) {
      const existing = await getPromptById(replaceId);
      prompt.createdAt = existing?.createdAt || now;
    }

    await savePrompt(prompt);

    const shareUrlValue = generateShareUrl(prompt);
    shareUrl.value = shareUrlValue;

    form.classList.add('hidden');
    resultDiv.classList.remove('hidden');
  }

  modal.querySelector('#replace-btn').onclick = async () => {
    if (existingPromptId) {
      await checkAndSave(existingPromptId);
    }
  };

  modal.querySelector('#rename-btn').onclick = () => {
    duplicateOptions.classList.add('hidden');
    titleInput.value = '';
    titleInput.focus();
  };

  copyBtn.onclick = () => {
    navigator.clipboard.writeText(shareUrl.value);
    copyBtn.textContent = 'Copied!';
    setTimeout(() => { copyBtn.textContent = 'Copy'; }, 2000);
  };

  function closeModal() {
    modal.remove();
  }

  titleInput.focus();
}

// Import shared prompt from URL
async function importFromUrl() {
  const url = window.location.href;
  const data = parseShareUrl(url);

  if (data) {
    const userId = getUserId();
    const prompt = {
      id: generateId(),
      userId: userId,
      title: data.t,
      slug: data.t.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
      content: data.c,
      description: data.d || '',
      visibility: data.v || 'public',
      isFavorite: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: [],
      importedFrom: 'shared'
    };

    await savePrompt(prompt);
    return true;
  }
  return false;
}

// Check if this is a shared URL on page load
if (window.location.href.includes('promptvault.app/share#data=')) {
  importFromUrl().then(() => {
    // Redirect to clean URL after import
    window.history.replaceState(null, '', '/');
  });
}

// Modal styles injection
function injectModalStyles() {
  const styleId = 'promptvault-modal-styles';
  if (document.getElementById(styleId)) return;

  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    #promptvault-modal { position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 999999; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .modal-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.5); }
    .modal-content { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 400px; max-width: 90%; background: white; border-radius: 12px; padding: 24px; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3); }
    .modal-content h2 { font-size: 20px; margin-bottom: 20px; color: #333; }
    .modal-content label { display: block; font-size: 14px; color: #666; margin-bottom: 6px; }
    .modal-content input[type="text"] { width: 100%; padding: 12px 14px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px; outline: none; transition: border-color 0.2s; }
    .modal-content input[type="text"]:focus { border-color: #4F46E5; }
    .modal-content .error { color: #dc2626; font-size: 12px; margin-top: 6px; }
    .modal-content .buttons { display: flex; gap: 12px; margin-top: 20px; justify-content: flex-end; }
    .modal-content button { padding: 10px 20px; border: none; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer; transition: background 0.2s; }
    .modal-content button[type="submit"], .modal-content button[type="button"]:not(#cancel-btn) { background: #4F46E5; color: white; }
    .modal-content button[type="submit"]:hover, .modal-content button[type="button"]:hover { background: #4338CA; }
    .modal-content button[type="button"]:first-of-type { background: #e5e7eb; color: #333; }
    .modal-content button[type="button"]:first-of-type:hover { background: #d1d5db; }
    .modal-content .hidden { display: none; }
    .modal-content #duplicate-options { margin-top: 16px; padding: 16px; background: #fef3c7; border-radius: 8px; }
    .modal-content #duplicate-options p { font-size: 14px; color: #92400e; margin-bottom: 12px; }
    .modal-content #duplicate-options button { margin-right: 8px; }
    .modal-content .share-link { margin-top: 16px; display: flex; gap: 8px; }
    .modal-content .share-link input { flex: 1; padding: 10px 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 12px; background: #f9fafb; }
    .modal-content .share-link button { padding: 10px 16px; background: #10b981; }
    .modal-content .share-link button:hover { background: #059669; }
    .modal-content #result p:first-child { font-size: 16px; color: #059669; font-weight: 500; }
  `;
  document.head.appendChild(style);
}

// Initialize DB on startup
initDB().catch(console.error);