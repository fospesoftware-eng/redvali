const DEFAULT_API_URL = 'http://localhost:3000';

// In-memory cache for evaluated posts
const validationCache = new Map();

// Service worker listeners
chrome.runtime.onInstalled.addListener(() => {
  console.log('[RedditValidator Background] Extension installed.');
  chrome.storage.local.get(['apiUrl'], (result) => {
    if (!result.apiUrl) {
      chrome.storage.local.set({ apiUrl: DEFAULT_API_URL, autoScan: false });
    }
  });
});

// Handle incoming messages from Content Script or Popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'VALIDATE_POST') {
    handleValidatePost(request.payload)
      .then(report => sendResponse({ status: 'success', data: report }))
      .catch(err => sendResponse({ status: 'error', message: err.message }));
    return true; // Keep message channel open for async response
  }

  if (request.action === 'GET_CACHED_REPORT') {
    const report = validationCache.get(request.postId);
    sendResponse({ report: report || null });
    return false;
  }

  if (request.action === 'CLEAR_CACHE') {
    validationCache.clear();
    sendResponse({ status: 'success' });
    return false;
  }
});

async function handleValidatePost(postPayload) {
  if (!postPayload || !postPayload.id) {
    throw new Error('Invalid post payload format.');
  }

  // Check cache
  if (validationCache.has(postPayload.id)) {
    console.log('[Background] Returning cached report for:', postPayload.id);
    return validationCache.get(postPayload.id);
  }

  // Get API URL from storage
  const config = await chrome.storage.local.get(['apiUrl']);
  const apiUrl = (config.apiUrl || DEFAULT_API_URL).replace(/\/$/, '');

  console.log(`[Background] Sending validation request to ${apiUrl}/api/validate for post:`, postPayload.id);

  const response = await fetch(`${apiUrl}/api/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(postPayload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API error (${response.status}): ${errorText}`);
  }

  const report = await response.json();
  validationCache.set(postPayload.id, report);
  return report;
}
