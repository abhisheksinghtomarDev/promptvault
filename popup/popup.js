const DB_NAME = 'promptvault-db';
const DB_VERSION = 1;

// IndexedDB helpers
function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
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

async function getAllPrompts(userId) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('prompts', 'readonly');
    const store = tx.objectStore('prompts');
    const index = store.index('userId');
    const request = index.getAll(userId);
    request.onsuccess = () => resolve(request.result || []);
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

async function toggleFavorite(id, currentState) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('prompts', 'readwrite');
    const store = tx.objectStore('prompts');
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const prompt = getReq.result;
      prompt.isFavorite = !currentState;
      prompt.updatedAt = new Date().toISOString();
      store.put(prompt);
      resolve(prompt);
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

async function copyToClipboard(text) {
  await navigator.clipboard.writeText(text);
}

// Get user ID
function getUserId() {
  return localStorage.getItem('promptvault_user_id') || 'local-user';
}

// Format date
function formatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now - date;

  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;

  return date.toLocaleDateString();
}

// Generate share URL
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

// Render prompts
function renderPrompts(prompts) {
  const list = document.getElementById('prompts-list');
  const emptyState = document.getElementById('empty-state');

  if (prompts.length === 0) {
    list.innerHTML = '';
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');

  // Sort by updated date
  prompts.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

  list.innerHTML = prompts.map(prompt => `
    <div class="prompt-card" data-id="${prompt.id}">
      <div class="title">${escapeHtml(prompt.title)}</div>
      <div class="preview">${escapeHtml(prompt.content.substring(0, 100))}</div>
      <div class="meta">
        <span class="date">${formatDate(prompt.updatedAt)}</span>
        <div class="actions">
          <button class="action-btn copy-btn" data-id="${prompt.id}" data-content="${escapeAttr(prompt.content)}">Copy</button>
          <button class="action-btn share-btn" data-id="${prompt.id}">Share</button>
          <button class="action-btn fav-btn ${prompt.isFavorite ? 'favorite' : ''}" data-id="${prompt.id}" data-fav="${prompt.isFavorite}">
            ${prompt.isFavorite ? '★' : '☆'}
          </button>
          <button class="action-btn delete-btn" data-id="${prompt.id}">×</button>
        </div>
      </div>
    </div>
  `).join('');

  // Add event listeners
  list.querySelectorAll('.copy-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      await copyToClipboard(btn.dataset.content);
      btn.textContent = 'Copied!';
      setTimeout(() => btn.textContent = 'Copy', 1500);
    });
  });

  list.querySelectorAll('.share-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const prompt = prompts.find(p => p.id === btn.dataset.id);
      if (prompt) {
        const url = generateShareUrl(prompt);
        await copyToClipboard(url);
        btn.textContent = 'Copied!';
        setTimeout(() => btn.textContent = 'Share', 1500);
      }
    });
  });

  list.querySelectorAll('.fav-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const isFav = btn.dataset.fav === 'true';
      await toggleFavorite(id, isFav);
      loadPrompts();
    });
  });

  list.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (confirm('Delete this prompt?')) {
        await deletePrompt(btn.dataset.id);
        loadPrompts();
      }
    });
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function escapeAttr(text) {
  return text.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// Load prompts
let allPrompts = [];

async function loadPrompts() {
  const userId = getUserId();
  try {
    allPrompts = await getAllPrompts(userId);
    filterPrompts();
  } catch (error) {
    console.error('Failed to load prompts:', error);
    document.getElementById('prompts-list').innerHTML = '<div class="loading">Error loading prompts</div>';
  }
}

// Filter prompts based on current tab and search
function filterPrompts() {
  const searchTerm = document.getElementById('search-input').value.toLowerCase();
  const activeTab = document.querySelector('.tab-btn.active').dataset.tab;

  let filtered = allPrompts;

  if (activeTab === 'favorites') {
    filtered = filtered.filter(p => p.isFavorite);
  }

  if (searchTerm) {
    filtered = filtered.filter(p =>
      p.title.toLowerCase().includes(searchTerm) ||
      p.content.toLowerCase().includes(searchTerm)
    );
  }

  renderPrompts(filtered);
}

// Event listeners
document.getElementById('save-btn').addEventListener('click', async () => {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) {
    await browser.tabs.sendMessage(tab.id, { action: 'capturePrompt' });
  }
});

document.getElementById('search-input').addEventListener('input', filterPrompts);

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    filterPrompts();
  });
});

// Keyboard shortcut listener
browser.commands.onCommand.addListener(async (command) => {
  if (command === 'save-prompt') {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      await browser.tabs.sendMessage(tab.id, { action: 'capturePrompt' });
    }
  }
});

// Initial load
loadPrompts();