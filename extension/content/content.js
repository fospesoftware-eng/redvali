(function () {
  console.log('[RedValley Content Script] Loaded on Reddit.');

  // Store reports by permalink URL path
  const reportsByUrl = new Map();
  const activeDrawers = new Map();
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
      const postEl = getTargetPostElement();
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
      const postEl = getTargetPostElement();
      const postInfo = extractPostData(postEl);

      if (postInfo && postInfo.title) {
        let badgeBtn = postEl.querySelector('.rv-badge-btn') || postEl.querySelector('.rv-score-pill');
        if (!badgeBtn) {
          badgeBtn = document.createElement('button');
          badgeBtn.className = 'rv-badge-btn';
          const iconUrl = chrome.runtime.getURL('icons/icon16.png');
          badgeBtn.innerHTML = `<img src="${iconUrl}" style="width:14px; height:14px; border-radius:2px;"> <span>Verify</span>`;
          
          const titleEl = postEl.querySelector('h1[slot="title"]') || postEl.querySelector('h1') || postEl.querySelector('h3') || postEl;
          titleEl.parentNode.insertBefore(badgeBtn, titleEl.nextSibling);
        }

        triggerValidation(postEl, postInfo, badgeBtn, (report) => {
          sendResponse({ status: 'success', data: report });
        });
        return true; // Keep async response channel open
      } else {
        sendResponse({ status: 'error', message: 'Could not extract Reddit post title or content.' });
        return false;
      }
    }
  });

  function getTargetPostElement() {
    return document.querySelector('sh-reddit-post, main, article, div[data-testid="post-container"], div.Post, div.thing.link') || document.body;
  }

  // Detect SPA URL changes
  setInterval(() => {
    if (window.location.href !== currentUrl) {
      currentUrl = window.location.href;
      scanPosts();
    }
  }, 1000);

  // Initialize scanner
  initPostScanner();

  function initPostScanner() {
    scanPosts();
    const observer = new MutationObserver(() => {
      scanPosts();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function scanPosts() {
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

    // Avoid injecting if already present
    if (postEl.querySelector('.rv-badge-btn') || postEl.querySelector('.rv-score-pill')) return;

    const iconUrl = chrome.runtime.getURL('icons/icon16.png');
    const badgeBtn = document.createElement('button');
    badgeBtn.className = 'rv-badge-btn';
    badgeBtn.setAttribute('type', 'button');
    badgeBtn.innerHTML = `<img src="${iconUrl}" style="width:14px; height:14px; border-radius:2px;"> <span>Verify</span>`;
    badgeBtn.title = 'Red Valley - Click to analyze post claims & AI authenticity';

    badgeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      triggerValidation(postEl, postInfo, badgeBtn);
    });

    const targetNode = postEl.querySelector('[slot="credit-bar"]') ||
                       postEl.querySelector('.post-metadata') ||
                       postEl.querySelector('div[data-testid="post-top-meta"]') ||
                       postEl.querySelector('p.title') ||
                       postEl.querySelector('h1') ||
                       postEl.querySelector('.entry') ||
                       postEl;

    if (targetNode) {
      targetNode.appendChild(badgeBtn);
    }
  }

  function extractPostData(postEl) {
    let id = postEl.getAttribute('id') || postEl.getAttribute('data-fullname') || postEl.getAttribute('data-post-id') || postEl.getAttribute('post-id');
    
    // Clean Title Extraction without button text pollution
    let title = postEl.getAttribute('post-title') || '';
    if (!title) {
      const titleEl = postEl.querySelector('h1[slot="title"]') ||
                      postEl.querySelector('h1') ||
                      postEl.querySelector('h3') ||
                      postEl.querySelector('a.title') ||
                      postEl.querySelector('[data-click-id="body"] h2') ||
                      document.querySelector('h1');
      if (titleEl) {
        const clone = titleEl.cloneNode(true);
        clone.querySelectorAll('.rv-badge-btn, .rv-score-pill').forEach(el => el.remove());
        title = clone.innerText.trim();
      }
    }
    if (!title && document.title) {
      title = document.title.replace(/\s*:\s*r\/\w+.*$/, '').replace(/ - Reddit.*$/, '').trim();
    }

    // Clean title from any stray button strings
    title = title.replace(/\s*Verify\s*$/i, '').replace(/\s*Analyzing\.\.\.\s*$/i, '').trim();

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
      const existingReport = reportsByUrl.get(window.location.pathname);
      if (callback && existingReport) callback(existingReport);
      return;
    }

    badgeBtn.classList.add('loading');
    badgeBtn.innerHTML = `<span class="rv-spinner"></span> <span>Analyzing...</span>`;

    chrome.runtime.sendMessage({ action: 'VALIDATE_POST', payload: postInfo }, (response) => {
      badgeBtn.classList.remove('loading');

      if (!response || response.status === 'error') {
        badgeBtn.innerHTML = `<span>⚠️ API Offline</span>`;
        console.error('[RedValley] Error:', response ? response.message : 'No response from background script');
        if (callback) callback({ status: 'error', message: response ? response.message : 'API offline' });
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

    const iconUrl = chrome.runtime.getURL('icons/icon16.png');
    badgeBtn.className = `rv-score-pill ${trustClass}`;
    badgeBtn.innerHTML = `<img src="${iconUrl}" style="width:14px; height:14px; border-radius:2px;"> <span>${report.overallScore}%</span> <span>${report.trustRating}</span>`;
  }

  function renderEvidenceDrawer(postEl, postId, report) {
    const existing = postEl.querySelector(`.rv-drawer-container[data-post-id="${postId}"]`);
    if (existing) existing.remove();

    const drawer = document.createElement('div');
    drawer.className = 'rv-drawer-container';
    drawer.dataset.postId = postId;

    const logoUrl = chrome.runtime.getURL('icons/icon48.png');

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

    const engScore = report.primaryScores?.communityEngagement?.score || report.overallScore;
    const leadScore = report.primaryScores?.leadTruthfulness?.score || report.overallScore;

    drawer.innerHTML = `
      <div class="rv-drawer-header">
        <div class="rv-drawer-title">
          <img src="${logoUrl}" style="width:20px; height:20px; border-radius:4px;">
          <span>Red Valley Authenticity Evidence Report</span>
          <span class="rv-score-badge-lg" style="background:${report.badgeColor}; color:#fff;">${report.overallScore}/100</span>
        </div>
        <button type="button" class="rv-drawer-close" title="Close Drawer">&times;</button>
      </div>

      <!-- DUAL SCORE HIGHLIGHT CARDS IN DRAWER -->
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:14px;">
        <div style="background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); padding:10px; border-radius:8px; text-align:center;">
          <div style="font-size:10px; color:#9ca3af; text-transform:uppercase; font-weight:700;">💬 Community Engagement</div>
          <div style="font-size:20px; font-weight:800; color:${getScoreColor(engScore)}; margin:2px 0;">${engScore}%</div>
          <div style="font-size:9px; background:rgba(255,255,255,0.08); color:#a5b4fc; padding:2px 6px; border-radius:4px; display:inline-block;">${report.primaryScores?.communityEngagement?.rating || 'ORGANIC'}</div>
        </div>

        <div style="background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); padding:10px; border-radius:8px; text-align:center;">
          <div style="font-size:10px; color:#9ca3af; text-transform:uppercase; font-weight:700;">🎯 Lead & Factual Truth</div>
          <div style="font-size:20px; font-weight:800; color:${getScoreColor(leadScore)}; margin:2px 0;">${leadScore}%</div>
          <div style="font-size:9px; background:rgba(255,255,255,0.08); color:#a5b4fc; padding:2px 6px; border-radius:4px; display:inline-block;">${report.primaryScores?.leadTruthfulness?.rating || 'GENUINE'}</div>
        </div>
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
