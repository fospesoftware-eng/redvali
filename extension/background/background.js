const DEFAULT_API_URL = 'http://localhost:3000';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours TTL

// In-memory fallback cache for fast response
const memoryCache = new Map();

// Initialize extension defaults
chrome.runtime.onInstalled.addListener(() => {
  console.log('[RedValley Background] Extension installed/updated.');
  chrome.storage.local.get(['apiUrl', 'autoScan'], (result) => {
    if (!result.apiUrl) {
      chrome.storage.local.set({ apiUrl: DEFAULT_API_URL, autoScan: false });
    }
  });
});

// Handle incoming messages from Content Scripts and Popup UI
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'VALIDATE_POST') {
    handleValidatePost(request.payload)
      .then(report => sendResponse({ status: 'success', data: report }))
      .catch(err => {
        console.error('[RedValley Background] Validation error:', err.message);
        sendResponse({ status: 'error', message: err.message || 'Validation request failed.' });
      });
    return true; // Keep async response channel open
  }

  if (request.action === 'GET_CACHED_REPORT') {
    getCachedReport(request.postId)
      .then(report => sendResponse({ report }))
      .catch(() => sendResponse({ report: null }));
    return true;
  }

  if (request.action === 'CLEAR_CACHE') {
    memoryCache.clear();
    chrome.storage.local.remove(['cache_reports'], () => {
      sendResponse({ status: 'success' });
    });
    return true;
  }
});

async function getCachedReport(postId) {
  if (!postId) return null;

  // Check memory cache first
  if (memoryCache.has(postId)) {
    const entry = memoryCache.get(postId);
    if (Date.now() - entry.timestamp < CACHE_TTL_MS) {
      return entry.report;
    } else {
      memoryCache.delete(postId);
    }
  }

  // Check storage cache
  const storage = await chrome.storage.local.get(['cache_reports']);
  const reports = storage.cache_reports || {};
  if (reports[postId] && (Date.now() - reports[postId].timestamp < CACHE_TTL_MS)) {
    memoryCache.set(postId, reports[postId]);
    return reports[postId].report;
  }

  return null;
}

async function setCachedReport(postId, report) {
  if (!postId || !report) return;

  const entry = { timestamp: Date.now(), report };
  memoryCache.set(postId, entry);

  try {
    const storage = await chrome.storage.local.get(['cache_reports']);
    const reports = storage.cache_reports || {};
    reports[postId] = entry;

    // Prune cache if exceeds 200 posts
    const keys = Object.keys(reports);
    if (keys.length > 200) {
      delete reports[keys[0]];
    }

    await chrome.storage.local.set({ cache_reports: reports });
  } catch (err) {
    console.warn('[RedValley Background] Cache save error:', err.message);
  }
}

async function handleValidatePost(postPayload) {
  if (!postPayload || (!postPayload.id && !postPayload.title)) {
    throw new Error('Invalid post payload format. Title or ID required.');
  }

  const postId = postPayload.id || `post_${postPayload.title.substring(0, 20)}`;

  // Check Cache
  const cached = await getCachedReport(postId);
  if (cached) {
    console.log('[RedValley Background] Returning cached report for:', postId);
    return cached;
  }

  // Get API Endpoint URL from storage
  const config = await chrome.storage.local.get(['apiUrl']);
  const baseUrl = (config.apiUrl || DEFAULT_API_URL).replace(/\/$/, '');
  const targetUrl = `${baseUrl}/api/validate`;

  console.log(`[RedValley Background] Fetching validation from ${targetUrl} for post:`, postId);

  // Fetch with 10s timeout via AbortController
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(postPayload),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Server returned HTTP ${response.status}: ${errorText.substring(0, 100)}`);
    }

    const report = await response.json();
    await setCachedReport(postId, report);
    return report;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('API server request timed out after 10 seconds.');
    }
    throw new Error(`Connection to Red Valley API failed (${baseUrl}). Ensure backend server is running.`);
  }
}
