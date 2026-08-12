(function () {
  console.log('[RedditValidator Content Script] Loaded on Reddit.');

  // Store reports by permalink URL path
  const reportsByUrl = new Map();
  let currentUrl = window.location.href;

  // Listen to messages from Popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'CLEAR_CACHE') {
      reportsByUrl.clear();
      sendResponse({ status: 'success' });
      return false;
    }
    if (request.action === 'GET_ACTIVE_POST_REPORT') {
      const currentPath = window.location.pathname;
      const report = reportsByUrl.get(currentPath) || null;
      const postEl = document.querySelector('sh-reddit-post, main, article, div[data-testid="post-container"], div.Post, div.thing.link') || document.body;
      const postData = extractPostData(postEl);

      sendResponse({ 
        report, 
        currentUrl: window.location.href,
        currentPath,
        currentPostData: postData
      });
      return false;
    }
    if (request.action === 'TRIGGER_ACTIVE_POST_SCAN') {
      const postEl = document.querySelector('sh-reddit-post, main, article, div[data-testid="post-container"], div.Post, div.thing.link') || document.body;
      const postInfo = extractPostData(postEl);

      if (postInfo && postInfo.title) {
        let badgeBtn = postEl.querySelector('.rv-badge-btn') || postEl.querySelector('.rv-score-pill');
        if (!badgeBtn) {
          badgeBtn = document.createElement('button');
          badgeBtn.className = 'rv-badge-btn';
          badgeBtn.innerHTML = `<span>🛡️ Verify</span>`;
          (postEl.querySelector('h1') || postEl.querySelector('h3') || postEl).appendChild(badgeBtn);
        }

        triggerValidation(postEl, postInfo, badgeBtn, (report) => {
          sendResponse({ status: 'success', data: report });
        });
        return true; // Keep response channel open for async validation
      } else {
        sendResponse({ status: 'error', message: 'Could not extract post content from page.' });
        return false;
      }
    }
  });

  // Detect SPA URL changes
  setInterval(() => {
    if (window.location.href !== currentUrl) {
      currentUrl = window.location.href;
      scanPosts();
    }
  }, 1000);

  // Initialize observer to process dynamically loaded posts (infinite scroll)
  initPostScanner();

  function initPostScanner() {
    scanPosts();
    // Observe DOM changes for new Reddit infinite scrolling
    const observer = new MutationObserver(() => {
      scanPosts();
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  function scanPosts() {
    // Reddit DOM Selectors (Supports sh-reddit web components, new Reddit post containers, old Reddit link rows)
    const postElements = document.querySelectorAll(`
      sh-reddit-post,
      div[data-testid="post-container"],
      div.Post,
      div.thing.link
    `);

    postElements.forEach(postEl => {
      if (postEl.dataset.rvInjected) return;
      postEl.dataset.rvInjected = "true";

      injectValidationBadge(postEl);
    });
  }

  function injectValidationBadge(postEl) {
    const postInfo = extractPostData(postEl);
    if (!postInfo || !postInfo.title) return;

    // Locate header action bar to place badge
    const headerContainer = 
      postEl.querySelector('[slot="credit-bar"]') ||
      postEl.querySelector('.post-metadata') ||
      postEl.querySelector('div[data-testid="post-top-meta"]') ||
      postEl.querySelector('p.title') ||
      postEl.querySelector('.entry') ||
      postEl;

    const badgeBtn = document.createElement('button');
    badgeBtn.className = 'rv-badge-btn';
    badgeBtn.setAttribute('type', 'button');
    badgeBtn.innerHTML = `<span>🛡️ Verify</span>`;
    badgeBtn.title = 'Click to analyze post claims & AI authenticity';

    badgeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      triggerValidation(postEl, postInfo, badgeBtn);
    });

    headerContainer.appendChild(badgeBtn);
  }

  function extractPostData(postEl) {
    let id = postEl.getAttribute('id') || postEl.getAttribute('data-fullname') || postEl.getAttribute('data-post-id') || postEl.getAttribute('post-id');
    
    // Title Extraction
    let title = postEl.getAttribute('post-title') || '';
    if (!title) {
      const titleEl = postEl.querySelector('h1[slot="title"]') ||
                      postEl.querySelector('h1') ||
                      postEl.querySelector('h3') ||
                      postEl.querySelector('a.title') ||
                      postEl.querySelector('[data-click-id="body"] h2') ||
                      document.querySelector('h1');
      if (titleEl) title = titleEl.innerText.trim();
    }
    if (!title && document.title) {
      title = document.title.replace(/\s*:\s*r\/\w+.*$/, '').replace(/ - Reddit.*$/, '').trim();
    }

    // Body Extraction
    let body = '';
    const bodyEl = postEl.querySelector('[slot="text-body"]') ||
                   postEl.querySelector('sh-reddit-post-body') ||
                   postEl.querySelector('div[id*="-post-rtjson"]') ||
                   postEl.querySelector('div[data-click-id="text"]') ||
                   postEl.querySelector('.usertext-body') ||
                   postEl.querySelector('article') ||
                   postEl.querySelector('p');
    if (bodyEl) body = bodyEl.innerText.trim();

    // Author Extraction
    let author = postEl.getAttribute('author') || '[unknown]';
    if (author === '[unknown]') {
      const authorEl = postEl.querySelector('a[href*="/user/"]') ||
                       postEl.querySelector('[slot="author-name"]') ||
                       postEl.querySelector('.author');
      if (authorEl) {
        author = authorEl.innerText.replace(/^u\//, '').trim();
      }
    }

    // Links Extraction
    const linkEls = (postEl.querySelectorAll ? postEl : document).querySelectorAll('a[href^="http"]:not([href*="reddit.com"])');
    const links = Array.from(linkEls).map(a => a.href).slice(0, 10);

    // Media Extraction
    const mediaEls = (postEl.querySelectorAll ? postEl : document).querySelectorAll('img[src*="redd.it"], img[src*="imgur"], a[href*=".jpg"], a[href*=".png"]');
    const mediaUrls = Array.from(mediaEls).map(el => el.src || el.href).slice(0, 5);

    if (!id) {
      id = `post_${Math.abs(hashString(title || 'reddit_post'))}`;
    }

    return {
      id,
      title,
      body,
      author,
      links,
      mediaUrls,
      permalink: window.location.pathname
    };
  }

  function triggerValidation(postEl, postInfo, badgeBtn, callback) {
    if (activeDrawers.has(postInfo.id)) {
      toggleDrawer(postInfo.id);
      if (callback && latestAnalyzedReport) callback(latestAnalyzedReport);
      return;
    }

    badgeBtn.classList.add('loading');
    badgeBtn.innerHTML = `<span class="rv-spinner"></span> <span>Analyzing...</span>`;

    chrome.runtime.sendMessage({ action: 'VALIDATE_POST', payload: postInfo }, (response) => {
      badgeBtn.classList.remove('loading');

      if (!response || response.status === 'error') {
        badgeBtn.innerHTML = `<span>⚠️ Error</span>`;
        console.error('[RedditValidator] Error:', response ? response.message : 'No response');
        return;
      }

      const report = response.data;
      reportsByUrl.set(window.location.pathname, report);
      if (postInfo.permalink) reportsByUrl.set(postInfo.permalink, report);

      renderScorePill(badgeBtn, report);
      renderEvidenceDrawer(postEl, postInfo.id, report);

      if (callback) callback(report);
    });
  }

  function renderScorePill(badgeBtn, report) {
    let trustClass = 'trust-moderate';
    if (report.overallScore >= 80) trustClass = 'trust-high';
    else if (report.overallScore <= 40) trustClass = 'trust-critical';
    else if (report.overallScore < 60) trustClass = 'trust-suspicious';

    badgeBtn.className = `rv-score-pill ${trustClass}`;
    badgeBtn.innerHTML = `<span>🛡️ ${report.overallScore}%</span> <span>${report.trustRating}</span>`;
  }

  function renderEvidenceDrawer(postEl, postId, report) {
    // Remove existing if present
    const existing = postEl.querySelector(`.rv-drawer-container[data-post-id="${postId}"]`);
    if (existing) existing.remove();

    const drawer = document.createElement('div');
    drawer.className = 'rv-drawer-container';
    drawer.dataset.postId = postId;

    const keyFlagsHTML = report.keyFlags.map(flag => `
      <div class="rv-flag-item ${flag.type}">
        <span>${flag.type === 'danger' ? '⚠️' : flag.type === 'warning' ? '⚡' : '✅'}</span>
        <span>${flag.text}</span>
      </div>
    `).join('');

    const claimsListHTML = (report.vectorBreakdown.claims.extractedClaims || []).map(c => `
      <li class="rv-claim-item ${c.suspicionFlag ? 'suspicious' : ''}">
        <div><strong>Claim:</strong> "${c.statement}"</div>
        <div class="rv-claim-meta">Category: ${c.category} | Verifiability: ${c.verifiability.toUpperCase()}</div>
      </li>
    `).join('') || '<div style="font-size:12px; color:#9ca3af;">No specific factual claim assertions detected.</div>';

    const linksListHTML = (report.vectorBreakdown.sources.linkDetails || []).map(l => `
      <div style="font-size:11px; margin-bottom:4px;">
        <span style="color:${l.rating === 'high' ? '#34d399' : l.rating === 'suspicious' ? '#f87171' : '#60a5fa'}">● [${l.rating.toUpperCase()}]</span> 
        <a href="${l.url}" target="_blank" style="color:#a5b4fc; text-decoration:none;">${l.domain}</a> - ${l.note}
      </div>
    `).join('') || '<div style="font-size:12px; color:#9ca3af;">No external citation links in post.</div>';

    drawer.innerHTML = `
      <div class="rv-drawer-header">
        <div class="rv-drawer-title">
          <span>🛡️ Authenticity Evidence Report</span>
          <span class="rv-score-badge-lg" style="background:${report.badgeColor}; color:#fff;">${report.overallScore}/100</span>
        </div>
        <button type="button" class="rv-drawer-close" title="Close Drawer">&times;</button>
      </div>

      ${keyFlagsHTML ? `<div class="rv-flags-grid">${keyFlagsHTML}</div>` : ''}

      <div class="rv-vectors-grid">
        <div class="rv-vector-card">
          <div class="rv-vector-name"><span>Factual Claims</span> <span>${report.vectorBreakdown.claims.score}/100</span></div>
          <div class="rv-progress-bg"><div class="rv-progress-bar" style="width:${report.vectorBreakdown.claims.score}%; background:${getScoreColor(report.vectorBreakdown.claims.score)};"></div></div>
          <div class="rv-vector-summary">${report.vectorBreakdown.claims.summary}</div>
        </div>

        <div class="rv-vector-card">
          <div class="rv-vector-name"><span>AI Text Detection</span> <span>${report.vectorBreakdown.aiText.score}/100</span></div>
          <div class="rv-progress-bg"><div class="rv-progress-bar" style="width:${report.vectorBreakdown.aiText.score}%; background:${getScoreColor(report.vectorBreakdown.aiText.score)};"></div></div>
          <div class="rv-vector-summary">AI Prob: ${Math.round(report.vectorBreakdown.aiText.aiProbability * 100)}% (${report.vectorBreakdown.aiText.isLikelyAI ? 'Likely Synthetic' : 'Human'})</div>
        </div>

        <div class="rv-vector-card">
          <div class="rv-vector-name"><span>Source Credibility</span> <span>${report.vectorBreakdown.sources.score}/100</span></div>
          <div class="rv-progress-bg"><div class="rv-progress-bar" style="width:${report.vectorBreakdown.sources.score}%; background:${getScoreColor(report.vectorBreakdown.sources.score)};"></div></div>
          <div class="rv-vector-summary">${report.vectorBreakdown.sources.summary}</div>
        </div>

        <div class="rv-vector-card">
          <div class="rv-vector-name"><span>Account Signals</span> <span>${report.vectorBreakdown.account.score}/100</span></div>
          <div class="rv-progress-bg"><div class="rv-progress-bar" style="width:${report.vectorBreakdown.account.score}%; background:${getScoreColor(report.vectorBreakdown.account.score)};"></div></div>
          <div class="rv-vector-summary">Trust: ${report.vectorBreakdown.account.trustLevel.toUpperCase()}</div>
        </div>
      </div>

      <div class="rv-section-box">
        <div class="rv-section-title">📌 Extracted Factual Claims (${report.vectorBreakdown.claims.extractedClaims.length})</div>
        <ul class="rv-claim-list">${claimsListHTML}</ul>
      </div>

      <div class="rv-section-box">
        <div class="rv-section-title">🔗 Source & Domain Verification (${report.vectorBreakdown.sources.linkDetails.length})</div>
        <div>${linksListHTML}</div>
      </div>
    `;

    drawer.querySelector('.rv-drawer-close').addEventListener('click', () => {
      drawer.remove();
      activeDrawers.delete(postId);
    });

    postEl.appendChild(drawer);
    activeDrawers.set(postId, drawer);
  }

  function toggleDrawer(postId) {
    const drawer = activeDrawers.get(postId);
    if (drawer) {
      if (drawer.style.display === 'none') {
        drawer.style.display = 'block';
      } else {
        drawer.style.display = 'none';
      }
    }
  }

  function getScoreColor(score) {
    if (score >= 80) return '#10b981';
    if (score >= 60) return '#3b82f6';
    if (score >= 40) return '#f97316';
    return '#ef4444';
  }

  function hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return hash;
  }
})();
