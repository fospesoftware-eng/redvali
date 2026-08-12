document.addEventListener('DOMContentLoaded', async () => {
  const DEFAULT_API_URL = 'http://localhost:3000';
  let currentApiUrl = DEFAULT_API_URL;

  // Load API config
  const storage = await chrome.storage.local.get(['apiUrl']);
  currentApiUrl = storage.apiUrl || DEFAULT_API_URL;
  document.getElementById('inputApiUrl').value = currentApiUrl;

  // Check Backend Server Health
  checkBackendHealth(currentApiUrl);

  // Check Active Tab for Reddit Post
  inspectActiveTab();

  // Event Listeners
  document.getElementById('btnSettings').addEventListener('click', () => {
    document.getElementById('settingsModal').classList.remove('hidden');
  });

  document.getElementById('btnCloseSettings').addEventListener('click', () => {
    document.getElementById('settingsModal').classList.add('hidden');
  });

  document.getElementById('btnSaveSettings').addEventListener('click', async () => {
    const newUrl = document.getElementById('inputApiUrl').value.trim();
    if (newUrl) {
      currentApiUrl = newUrl;
      await chrome.storage.local.set({ apiUrl: currentApiUrl });
      document.getElementById('settingsModal').classList.add('hidden');
      checkBackendHealth(currentApiUrl);
    }
  });

  document.getElementById('btnClearCache').addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'CLEAR_CACHE' }, (res) => {
      // Clear content script cache
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          chrome.tabs.sendMessage(tabs[0].id, { action: 'CLEAR_CACHE' });
        }
      });

      showToast('✅ Validation cache cleared successfully.');
      setTimeout(() => location.reload(), 800);
    });
  });

  function showToast(message) {
    const toast = document.getElementById('toastBanner');
    toast.textContent = message;
    toast.classList.remove('hidden');
    setTimeout(() => {
      toast.classList.add('hidden');
    }, 2500);
  }

  function showErrorView(message) {
    document.getElementById('noPostView').classList.add('hidden');
    document.getElementById('postReportView').classList.add('hidden');
    document.getElementById('errorView').classList.remove('hidden');
    document.getElementById('errorMsgText').textContent = message || 'Validation request failed.';
  }

  const triggerActiveScan = (forceRefresh = false) => {
    const btnScan = document.getElementById('btnScanActive');
    const btnRescan = document.getElementById('btnRescan');

    if (forceRefresh) {
      if (btnRescan) {
        btnRescan.textContent = '⏳ Rescanning...';
        btnRescan.disabled = true;
      }
    } else {
      if (btnScan) {
        btnScan.textContent = '⏳ Analyzing Post...';
        btnScan.disabled = true;
      }
    }

    document.getElementById('errorView').classList.add('hidden');

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (!activeTab || !activeTab.id || !activeTab.url?.includes('reddit.com')) {
        showToast('⚠️ Please open a post on reddit.com first.');
        resetButtons();
        return;
      }

      chrome.tabs.sendMessage(activeTab.id, { action: 'TRIGGER_ACTIVE_POST_SCAN', forceRefresh }, (res) => {
        resetButtons();

        if (chrome.runtime.lastError) {
          // Dynamic injection fallback
          chrome.scripting.executeScript({
            target: { tabId: activeTab.id },
            files: ['content/content.js']
          }, () => {
            chrome.scripting.insertCSS({
              target: { tabId: activeTab.id },
              files: ['content/content.css']
            }, () => {
              setTimeout(() => {
                chrome.tabs.sendMessage(activeTab.id, { action: 'TRIGGER_ACTIVE_POST_SCAN', forceRefresh }, (res2) => {
                  if (res2 && res2.status === 'success' && res2.data) {
                    renderReportView(res2.data);
                  } else {
                    showErrorView(res2 ? res2.message : 'Extension script execution error.');
                  }
                });
              }, 300);
            });
          });
        } else if (res && res.status === 'success' && res.data) {
          renderReportView(res.data);
        } else {
          showErrorView(res ? res.message : 'Validation request failed.');
        }
      });
    });
  };

  function resetButtons() {
    const btnScan = document.getElementById('btnScanActive');
    const btnRescan = document.getElementById('btnRescan');
    if (btnScan) {
      btnScan.textContent = '⚡ Scan Current Post';
      btnScan.disabled = false;
    }
    if (btnRescan) {
      btnRescan.textContent = '🔄 Rescan Current Post';
      btnRescan.disabled = false;
    }
  }

  document.getElementById('btnScanActive').addEventListener('click', () => triggerActiveScan(false));
  document.getElementById('btnRescan').addEventListener('click', () => triggerActiveScan(true));
  document.getElementById('btnRetryScan').addEventListener('click', () => triggerActiveScan(true));

  async function checkBackendHealth(apiUrl) {
    const statusPill = document.getElementById('apiStatus');
    const statusText = document.getElementById('statusText');

    try {
      const res = await fetch(`${apiUrl.replace(/\/$/, '')}/api/health`);
      if (res.ok) {
        statusPill.className = 'status-pill online';
        statusText.textContent = 'Connected';
      } else {
        throw new Error('Non-200 status');
      }
    } catch (e) {
      statusPill.className = 'status-pill offline';
      statusText.textContent = 'Offline';
    }
  }

  function inspectActiveTab() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0] || !tabs[0].url.includes('reddit.com')) {
        return; // Show empty state default
      }

      // Query content script for current post data
      chrome.tabs.sendMessage(tabs[0].id, { action: 'GET_ACTIVE_POST_REPORT' }, (response) => {
        if (chrome.runtime.lastError || !response) {
          return;
        }

        if (response.currentPostData && response.currentPostData.title) {
          document.getElementById('detectedPostTitle').textContent = response.currentPostData.title;
          document.getElementById('detectedPostSub').textContent = `by u/${response.currentPostData.author || 'user'}`;
        }

        if (response.report) {
          renderReportView(response.report);
        } else {
          document.getElementById('noPostView').classList.remove('hidden');
          document.getElementById('postReportView').classList.add('hidden');
          document.getElementById('errorView').classList.add('hidden');
        }
      });
    });
  }

  function renderReportView(report) {
    document.getElementById('noPostView').classList.add('hidden');
    document.getElementById('errorView').classList.add('hidden');
    document.getElementById('postReportView').classList.remove('hidden');

    document.getElementById('reportTitle').textContent = report.title || 'Reddit Post';
    document.getElementById('reportAuthor').textContent = report.vectorBreakdown?.account?.summary || '';

    // Render Dual Primary Highlighted Scores
    if (report.primaryScores) {
      const eng = report.primaryScores.communityEngagement;
      const lead = report.primaryScores.leadTruthfulness;

      document.getElementById('scoreEngagementNum').textContent = `${eng.score}%`;
      document.getElementById('scoreEngagementNum').style.color = getScoreColor(eng.score);
      document.getElementById('scoreEngagementTag').textContent = eng.rating;

      document.getElementById('scoreLeadNum').textContent = `${lead.score}%`;
      document.getElementById('scoreLeadNum').style.color = getScoreColor(lead.score);
      document.getElementById('scoreLeadTag').textContent = lead.rating;
    }

    // Overall Score Gauge
    const score = report.overallScore || 0;
    document.getElementById('reportScore').textContent = score;

    const ringProgress = document.getElementById('scoreRingProgress');
    const strokeDashoffset = 264 - (264 * score / 100);
    ringProgress.style.strokeDashoffset = strokeDashoffset;
    ringProgress.style.stroke = getScoreColor(score);

    // Rating Badge
    const badge = document.getElementById('reportRatingBadge');
    badge.textContent = report.trustRating;
    badge.style.background = report.badgeColor;
    badge.style.color = '#fff';

    // Vector Bars
    setVectorBar('vClaim', report.vectorBreakdown.claims.score);
    setVectorBar('vAi', report.vectorBreakdown.aiText.score);
    setVectorBar('vSource', report.vectorBreakdown.sources.score);
    setVectorBar('vAccount', report.vectorBreakdown.account.score);
  }

  function setVectorBar(prefix, score) {
    document.getElementById(`${prefix}Score`).textContent = `${score}/100`;
    const bar = document.getElementById(`${prefix}Bar`);
    bar.style.width = `${score}%`;
    bar.style.background = getScoreColor(score);
  }

  function getScoreColor(score) {
    if (score >= 80) return '#10b981';
    if (score >= 60) return '#3b82f6';
    if (score >= 40) return '#f97316';
    return '#ef4444';
  }
});
