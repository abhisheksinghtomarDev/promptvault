const PROMPT_SELECTORS = [
  '#prompt-textarea',
  '[data-testid="prompt-textarea"]',
  'div.ProseMirror[contenteditable="true"]',
  'textarea[data-id="root"]',
  'textarea[name="message"]',
  'textarea[name="question"]',
  'textarea',
  '[contenteditable="true"]'
];

function getElementText(element) {
  if (!element) return '';
  if ('value' in element) return element.value || '';
  return element.innerText || element.textContent || '';
}

function isVisible(element) {
  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);
  return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
}

function findPromptInput() {
  const active = document.activeElement;
  const activeText = getElementText(active).trim();
  if (activeText && (active.matches?.('textarea, [contenteditable="true"]') || active.closest?.('[contenteditable="true"]'))) {
    return activeText;
  }

  for (const selector of PROMPT_SELECTORS) {
    const elements = [...document.querySelectorAll(selector)];
    for (const element of elements) {
      if (!isVisible(element)) continue;
      const text = getElementText(element).trim();
      if (text) return text;
    }
  }

  return '';
}

function slugify(text) {
  return text.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 80);
}

function showToast(message, type = 'success') {
  const oldToast = document.getElementById('promptvault-toast');
  oldToast?.remove();

  const toast = document.createElement('div');
  toast.id = 'promptvault-toast';
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    right: 20px;
    bottom: 20px;
    z-index: 2147483647;
    padding: 12px 14px;
    border-radius: 8px;
    background: ${type === 'error' ? '#dc2626' : '#059669'};
    color: #fff;
    font: 500 14px/1.3 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    box-shadow: 0 14px 40px rgba(15, 23, 42, 0.25);
  `;
  document.documentElement.appendChild(toast);
  setTimeout(() => toast.remove(), 2600);
}

function injectModalStyles() {
  if (document.getElementById('promptvault-modal-styles')) return;

  const style = document.createElement('style');
  style.id = 'promptvault-modal-styles';
  style.textContent = `
    #promptvault-modal {
      position: fixed;
      inset: 0;
      z-index: 2147483647;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: #0f172a;
    }
    #promptvault-modal * { box-sizing: border-box; }
    #promptvault-modal .pv-overlay {
      position: absolute;
      inset: 0;
      background: rgba(15, 23, 42, 0.48);
    }
    #promptvault-modal .pv-dialog {
      position: absolute;
      left: 50%;
      top: 50%;
      width: min(420px, calc(100vw - 32px));
      transform: translate(-50%, -50%);
      border-radius: 12px;
      background: #fff;
      padding: 22px;
      box-shadow: 0 24px 80px rgba(15, 23, 42, 0.35);
    }
    #promptvault-modal h2 {
      margin: 0 0 16px;
      font-size: 20px;
      line-height: 1.2;
      font-weight: 700;
    }
    #promptvault-modal label {
      display: block;
      margin-bottom: 6px;
      font-size: 13px;
      font-weight: 600;
      color: #475569;
    }
    #promptvault-modal input,
    #promptvault-modal textarea {
      width: 100%;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 10px 12px;
      font: 14px/1.4 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      color: #0f172a;
      background: #fff;
    }
    #promptvault-modal textarea {
      min-height: 90px;
      margin-top: 12px;
      resize: vertical;
    }
    #promptvault-modal input:focus,
    #promptvault-modal textarea:focus {
      border-color: #4f46e5;
      outline: 3px solid rgba(79, 70, 229, 0.15);
    }
    #promptvault-modal .pv-actions {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      margin-top: 18px;
    }
    #promptvault-modal button {
      border: 0;
      border-radius: 8px;
      padding: 10px 14px;
      font: 600 14px/1 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      cursor: pointer;
    }
    #promptvault-modal .pv-cancel {
      background: #e2e8f0;
      color: #0f172a;
    }
    #promptvault-modal .pv-save {
      background: #4f46e5;
      color: #fff;
    }
    #promptvault-modal .pv-error {
      min-height: 18px;
      margin-top: 8px;
      color: #dc2626;
      font-size: 12px;
    }
  `;
  document.documentElement.appendChild(style);
}

function showSaveModal(promptText) {
  document.getElementById('promptvault-modal')?.remove();
  injectModalStyles();

  const modal = document.createElement('div');
  modal.id = 'promptvault-modal';
  modal.innerHTML = `
    <div class="pv-overlay"></div>
    <div class="pv-dialog" role="dialog" aria-modal="true" aria-labelledby="promptvault-title">
      <h2 id="promptvault-title">Save Prompt</h2>
      <form>
        <label for="promptvault-title-input">Title</label>
        <input id="promptvault-title-input" type="text" required minlength="3" maxlength="100" placeholder="Give this prompt a title">
        <textarea id="promptvault-content-input" aria-label="Prompt content"></textarea>
        <div class="pv-error" aria-live="polite"></div>
        <div class="pv-actions">
          <button class="pv-cancel" type="button">Cancel</button>
          <button class="pv-save" type="submit">Save</button>
        </div>
      </form>
    </div>
  `;

  const form = modal.querySelector('form');
  const titleInput = modal.querySelector('#promptvault-title-input');
  const contentInput = modal.querySelector('#promptvault-content-input');
  const error = modal.querySelector('.pv-error');
  const close = () => modal.remove();

  contentInput.value = promptText;
  titleInput.value = promptText.split(/\s+/).slice(0, 8).join(' ').slice(0, 80);

  modal.querySelector('.pv-overlay').addEventListener('click', close);
  modal.querySelector('.pv-cancel').addEventListener('click', close);
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const title = titleInput.value.trim();
    const content = contentInput.value.trim();

    if (title.length < 3) {
      error.textContent = 'Title must be at least 3 characters.';
      titleInput.focus();
      return;
    }
    if (!content) {
      error.textContent = 'Prompt content is empty.';
      contentInput.focus();
      return;
    }

    const now = new Date().toISOString();
    const response = await chrome.runtime.sendMessage({
      action: 'savePrompt',
      prompt: {
        id: 'pv-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 11),
        userId: 'local-user',
        title,
        slug: slugify(title),
        content,
        description: '',
        visibility: 'public',
        isFavorite: false,
        createdAt: now,
        updatedAt: now,
        tags: []
      }
    });

    if (response?.success) {
      close();
      showToast('Prompt saved to PromptVault');
    } else {
      error.textContent = response?.error || 'Could not save prompt.';
    }
  });

  document.documentElement.appendChild(modal);
  titleInput.focus();
  titleInput.select();
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action !== 'capturePrompt') return false;

  const promptText = findPromptInput();
  if (!promptText) {
    showToast('No prompt text found. Click inside the prompt box and try again.', 'error');
    sendResponse({ success: false, error: 'No prompt text found' });
    return false;
  }

  showSaveModal(promptText);
  sendResponse({ success: true });
  return false;
});
