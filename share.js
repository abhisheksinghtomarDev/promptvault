const DB_NAME = 'promptvault-db';
const DB_VERSION = 1;
const IMPORT_TIMEOUT_MS = 5000;

function showState(state, message = '') {
  document.getElementById('loading').classList.toggle('hidden', state !== 'loading');
  document.getElementById('success').classList.toggle('hidden', state !== 'success');
  document.getElementById('viewer').classList.toggle('hidden', state !== 'viewer');
  document.getElementById('error').classList.toggle('hidden', state !== 'error');

  if (message) {
    document.getElementById('error-msg').textContent = message;
  }
}

function withTimeout(promise, ms) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('Import timed out. Reload the extension and try again.')), ms);
  });

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId));
}

function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error || new Error('Could not open local prompt storage.'));
    request.onblocked = () => reject(new Error('Local prompt storage is busy. Close other PromptVault tabs and try again.'));
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('prompts')) {
        const store = db.createObjectStore('prompts', { keyPath: 'id' });
        store.createIndex('userId', 'userId', { unique: false });
        store.createIndex('title', 'title', { unique: false });
        store.createIndex('isFavorite', 'isFavorite', { unique: false });
      }
    };
  });
}

function getUserId() {
  return localStorage.getItem('promptvault_user_id') || 'local-user';
}

function generateId() {
  return 'pv-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 11);
}

function parseShareUrl() {
  try {
    const hashIndex = window.location.hash.indexOf('#data=');
    if (hashIndex === -1) return null;
    const encoded = window.location.hash.substring(hashIndex + 6);
    const decoded = decodeURIComponent(atob(encoded));
    return JSON.parse(decoded);
  } catch (error) {
    return null;
  }
}

function isExtensionPage() {
  return window.location.protocol === 'chrome-extension:';
}

function showPublicPrompt(data) {
  document.getElementById('prompt-title').textContent = data.t || 'Shared Prompt';
  document.getElementById('prompt-content').textContent = data.c || '';
  showState('viewer');
}

async function savePrompt(prompt) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('prompts', 'readwrite');
    const store = tx.objectStore('prompts');
    tx.oncomplete = () => {
      db.close();
      resolve(prompt);
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error || new Error('Could not save prompt.'));
    };
    tx.onabort = () => {
      db.close();
      reject(tx.error || new Error('Prompt import was aborted.'));
    };
    store.put(prompt);
  });
}

async function importPrompt() {
  showState('loading');
  const data = parseShareUrl();

  if (!data) {
    showState('error', 'The shared link appears to be invalid.');
    return;
  }
  if (!data.c) {
    showState('error', 'This shared link does not contain prompt content.');
    return;
  }

  if (!isExtensionPage()) {
    showPublicPrompt(data);
    return;
  }

  try {
    const now = new Date().toISOString();
    const prompt = {
      id: generateId(),
      userId: getUserId(),
      title: data.t || 'Imported Prompt',
      slug: (data.t || 'imported').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
      content: data.c || '',
      description: data.d || '',
      visibility: data.v || 'public',
      isFavorite: false,
      createdAt: now,
      updatedAt: now,
      tags: [],
      importedFrom: 'shared'
    };

    await withTimeout(savePrompt(prompt), IMPORT_TIMEOUT_MS);
    showState('success');
    window.history.replaceState(null, '', window.location.pathname);
  } catch (error) {
    console.error('Import error:', error);
    showState('error', error.message || 'Prompt import failed. Please try again.');
  }
}

document.querySelectorAll('.close-btn').forEach((button) => {
  button.addEventListener('click', () => window.close());
});

document.getElementById('copy-prompt-btn').addEventListener('click', async () => {
  const button = document.getElementById('copy-prompt-btn');
  const content = document.getElementById('prompt-content').textContent;

  try {
    await navigator.clipboard.writeText(content);
    button.textContent = 'Copied!';
    setTimeout(() => { button.textContent = 'Copy Prompt'; }, 1600);
  } catch (error) {
    button.textContent = 'Select and copy manually';
    setTimeout(() => { button.textContent = 'Copy Prompt'; }, 2200);
  }
});

importPrompt();
