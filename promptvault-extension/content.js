const SUPPORTED_SITES = [
  { name: 'ChatGPT', textareaSelector: 'textarea[data-id="root"]', url: 'chat.openai.com' },
  { name: 'Claude', textareaSelector: 'div[contenteditable="true"]', url: 'claude.ai' },
  { name: 'Gemini', textareaSelector: 'textarea[name="message"]', url: 'gemini.google.com' },
  { name: 'Perplexity', textareaSelector: 'textarea[name="question"]', url: 'www.perplexity.ai' }
];

function findPromptInput() {
  const currentUrl = window.location.hostname;

  for (const site of SUPPORTED_SITES) {
    if (currentUrl.includes(site.url)) {
      const textarea = document.querySelector(site.textareaSelector);
      if (textarea) {
        return textarea.value || textarea.innerText || '';
      }
    }
  }

  const textareas = document.querySelectorAll('textarea');
  for (const ta of textareas) {
    if (ta.offsetParent !== null && !ta.hidden && ta.disabled === false) {
      return ta.value || '';
    }
  }

  const contentEditable = document.querySelectorAll('[contenteditable="true"]');
  for (const el of contentEditable) {
    if (el.offsetParent !== null && el.innerText.trim()) {
      return el.innerText.trim();
    }
  }

  return '';
}

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'capturePrompt') {
    const promptText = findPromptInput();
    if (promptText && promptText.trim()) {
      browser.runtime.sendMessage({
        action: 'promptCaptured',
        content: promptText.trim()
      });
      sendResponse({ success: true });
    } else {
      sendResponse({ success: false, error: 'No prompt text found' });
    }
  }
  return true;
});