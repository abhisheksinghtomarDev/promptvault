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
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const encoded = params.get('data');
    if (!encoded) return null;
    const decoded = decodeURIComponent(atob(encoded));
    return {
      prompt: JSON.parse(decoded),
      extensionId: params.get('ext') || ''
    };
  } catch (error) {
    return null;
  }
}

function isExtensionPage() {
  return window.location.protocol === 'chrome-extension:';
}

function showPublicPrompt(share) {
  document.getElementById('prompt-title').textContent = share.prompt.t || 'Shared Prompt';
  document.getElementById('prompt-content').textContent = share.prompt.c || '';
  document.getElementById('import-prompt-btn').disabled = !share.extensionId;
  showState('viewer');
}

function showCloseHelp() {
  const existing = document.getElementById('close-help');
  existing?.remove();

  const help = document.createElement('p');
  help.id = 'close-help';
  help.textContent = 'Chrome cannot close tabs that were opened manually. Use Ctrl+W or close this tab from the browser.';
  help.style.margin = '16px 0 0';
  help.style.color = '#64748b';
  help.style.fontSize = '13px';

  const visiblePanel = document.querySelector('#success:not(.hidden), #error:not(.hidden)');
  visiblePanel?.appendChild(help);
}

function confirmCloseTab() {
  const shouldClose = window.confirm('Close this tab?');
  if (!shouldClose) return;

  if (window.opener || isExtensionPage()) {
    window.close();
    return;
  }

  showCloseHelp();
}

function buildPrompt(data) {
  const now = new Date().toISOString();
  return {
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
  const share = parseShareUrl();

  if (!share) {
    showState('error', 'The shared link appears to be invalid.');
    return;
  }
  if (!share.prompt.c) {
    showState('error', 'This shared link does not contain prompt content.');
    return;
  }

  if (!isExtensionPage()) {
    showPublicPrompt(share);
    return;
  }

  try {
    await withTimeout(savePrompt(buildPrompt(share.prompt)), IMPORT_TIMEOUT_MS);
    showState('success');
    window.history.replaceState(null, '', window.location.pathname);
  } catch (error) {
    console.error('Import error:', error);
    showState('error', error.message || 'Prompt import failed. Please try again.');
  }
}

document.querySelectorAll('.close-btn').forEach((button) => {
  button.addEventListener('click', confirmCloseTab);
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

document.getElementById('import-prompt-btn').addEventListener('click', async () => {
  const button = document.getElementById('import-prompt-btn');
  const share = parseShareUrl();

  if (!share?.extensionId) {
    button.textContent = 'Extension not detected';
    setTimeout(() => { button.textContent = 'Import to PromptVault'; }, 2200);
    return;
  }

  try {
    button.disabled = true;
    button.textContent = 'Importing...';
    const response = await chrome.runtime.sendMessage(share.extensionId, {
      action: 'importSharedPrompt',
      prompt: buildPrompt(share.prompt)
    });

    if (response?.success) {
      showState('success');
      return;
    }

    throw new Error(response?.error || 'PromptVault could not import this prompt.');
  } catch (error) {
    button.disabled = false;
    button.textContent = 'Import failed';
    document.getElementById('error-msg').textContent = 'Install or reload PromptVault, then try again. You can still copy the prompt.';
    setTimeout(() => { button.textContent = 'Import to PromptVault'; }, 2200);
  }
});

importPrompt();
