// content/sidebar.js
(function() {
  'use strict';
  
  let sidebarInjected = false;
  let currentItem = null;
  let allResults = [];
  let isSupporter = false;
  
  window.addEventListener('priceScoutItemDetected', async (event) => {
    if (sidebarInjected) {
      updateSidebar(event.detail);
    } else {
      injectSidebar(event.detail);
    }
  });
  
  async function checkSupporterStatus() {
    try {
      const data = await chrome.storage.local.get('supporterCode');
      isSupporter = !!(data.supporterCode && data.supporterCode.length > 0);
    } catch (e) {
      isSupporter = false;
    }
  }
  
  function injectSidebar(item) {
    if (sidebarInjected) return;
    
    const sidebar = document.createElement('div');
    sidebar.id = 'pricescout-sidebar';
    sidebar.innerHTML = `
      <div class="pricescout-header">
        <div class="pricescout-title">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 6v6l4 2"/>
          </svg>
          <span>PriceScout</span>
        </div>
        <button class="pricescout-toggle" title="Toggle sidebar">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
      </div>
      <div class="pricescout-content">
        <div class="pricescout-item-name"></div>
        <div class="pricescout-results"></div>
        <div class="pricescout-history"></div>
        <div class="pricescout-tip-prompt" style="display: none;"></div>
      </div>
    `;
    
    document.body.appendChild(sidebar);
    sidebarInjected = true;
    
    const toggle = sidebar.querySelector('.pricescout-toggle');
    toggle.addEventListener('click', () => {
      sidebar.classList.toggle('collapsed');
      const svg = toggle.querySelector('svg polyline');
      if (sidebar.classList.contains('collapsed')) {
        svg.setAttribute('points', '9 18 15 12 9 6');
      } else {
        svg.setAttribute('points', '15 18 9 12 15 6');
      }
    });
    
    updateSidebar(item);
  }
  
  async function updateSidebar(item) {
    currentItem = item;
    await checkSupporterStatus();
    
    const sidebar = document.getElementById('pricescout-sidebar');
    if (!sidebar) return;
    
    const itemNameEl = sidebar.querySelector('.pricescout-item-name');
    itemNameEl.textContent = item.title;
    
    const resultsEl = sidebar.querySelector('.pricescout-results');
    resultsEl.innerHTML = `
      <div class="pricescout-loading">
        ${generateSkeletonCards()}
      </div>
    `;
    
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'SEARCH_PRICES',
        data: {
          query: item.title,
          category: item.category,
          currentPlatform: item.currentPlatform
        }
      });
      
      if (response.success) {
        allResults = response.results;
        displayResults(allResults, item.price);
        loadPriceHistory(item.title);
        checkTipPrompt();
      }
    } catch (e) {
      console.error('Search failed:', e);
      resultsEl.innerHTML = '<div class="pricescout-error">Failed to load prices</div>';
    }
  }
  
  function generateSkeletonCards() {
    return Array(3).fill('').map(() => `
      <div class="pricescout-skeleton-card">
        <div class="pricescout-skeleton-line"></div>
        <div class="pricescout-skeleton-line short"></div>
      </div>
    `).join('');
  }
  
  function displayResults(results, currentPrice) {
    const resultsEl = document.querySelector('.pricescout-results');
    if (!results || results.length === 0) {
      resultsEl.innerHTML = '<div class="pricescout-empty">No prices found on other platforms</div>';
      return;
    }
    
    results.sort((a, b) => a.price - b.price);
    
    const displayLimit = isSupporter ? results.length : Math.min(3, results.length);
    const displayResults = results.slice(0, displayLimit);
    
    const cheapestPrice = results[0].price;
    let savings = 0;
    if (currentPrice && cheapestPrice < currentPrice) {
      savings = currentPrice - cheapestPrice;
      chrome.runtime.sendMessage({
        type: 'RECORD_SAVINGS',
        data: { amount: savings }
      });
    }
    
    resultsEl.innerHTML = displayResults.map((result, index) => {
      const isCheapest = index === 0;
      return `
        <div class="pricescout-result-card ${isCheapest ? 'cheapest' : ''}">
          <div class="pricescout-result-header">
            <img src="${getPlatformFavicon(result.platform)}" alt="${result.platform}" class="pricescout-favicon">
            <span class="pricescout-platform">${result.platform}</span>
          </div>
          <div class="pricescout-result-title">${escapeHtml(result.title)}</div>
          <div class="pricescout-result-footer">
            <div class="pricescout-price">$${result.price.toFixed(2)}</div>
            ${result.seller_rating ? `<div class="pricescout-rating">⭐ ${result.seller_rating}</div>` : ''}
          </div>
          <a href="${result.url}" target="_blank" class="pricescout-view-deal">View Deal</a>
        </div>
      `;
    }).join('');
    
    if (!isSupporter && results.length > 3) {
      resultsEl.innerHTML += `
        <div class="pricescout-upgrade-prompt">
          <p>🔓 Unlock ${results.length - 3} more results</p>
          <button class="pricescout-upgrade-btn">Become a Supporter</button>
        </div>
      `;
      
      const upgradeBtn = resultsEl.querySelector('.pricescout-upgrade-btn');
      upgradeBtn.addEventListener('click', showSupporterModal);
    }
  }
  
  async function loadPriceHistory(itemName) {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'GET_PRICE_HISTORY',
        data: { itemName }
      });
      
      if (response.success && Object.keys(response.history).length > 0) {
        displayPriceHistory(response.history);
      }
    } catch (e) {
      console.error('Load price history failed:', e);
    }
  }
  
  function displayPriceHistory(history) {
    const historyEl = document.querySelector('.pricescout-history');
    
    const canvas = document.createElement('canvas');
    canvas.width = 280;
    canvas.height = 200;
    canvas.style.width = '100%';
    canvas.style.height = '200px';
    
    historyEl.innerHTML = '<div class="pricescout-history-title">Price History</div>';
    historyEl.appendChild(canvas);
    
    const ctx = canvas.getContext('2d');
    const allPoints = [];
    
    Object.values(history).forEach(platformHistory => {
      platformHistory.forEach(point => {
        allPoints.push(point);
      });
    });
    
    allPoints.sort((a, b) => a.timestamp - b.timestamp);
    
    if (allPoints.length === 0) return;
    
    const prices = allPoints.map(p => p.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice || 1;
    
    const padding = 20;
    const width = canvas.width - padding * 2;
    const height = canvas.height - padding * 2;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#2563eb';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    allPoints.forEach((point, index) => {
      const x = padding + (index / (allPoints.length - 1)) * width;
      const y = padding + height - ((point.price - minPrice) / priceRange) * height;
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    
    ctx.stroke();
    
    ctx.fillStyle = '#6b7280';
    ctx.font = '12px sans-serif';
    ctx.fillText(`Low: $${minPrice.toFixed(2)}`, padding, canvas.height - 5);
    ctx.fillText(`High: $${maxPrice.toFixed(2)}`, canvas.width - padding - 80, padding + 10);
  }
  
  async function checkTipPrompt() {
    if (isSupporter) return;
    
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'CHECK_TIP_PROMPT'
      });
      
      if (response.showPrompt) {
        showTipPrompt();
      }
    } catch (e) {
      console.error('Check tip prompt failed:', e);
    }
  }
  
  function showTipPrompt() {
    const promptEl = document.querySelector('.pricescout-tip-prompt');
    promptEl.style.display = 'block';
    promptEl.innerHTML = `
      <div class="pricescout-tip-content">
        <h3>💰 You've saved money 3 times!</h3>
        <p>Support PriceScout development with a small tip</p>
        <div class="pricescout-tip-buttons">
          <button class="pricescout-tip-btn">Tip $1-2/month</button>
          <button class="pricescout-dismiss-btn">Maybe later</button>
        </div>
      </div>
    `;
    
    promptEl.querySelector('.pricescout-tip-btn').addEventListener('click', showSupporterModal);
    promptEl.querySelector('.pricescout-dismiss-btn').addEventListener('click', () => {
      promptEl.style.display = 'none';
    });
  }
  
  function showSupporterModal() {
    const modal = document.createElement('div');
    modal.className = 'pricescout-modal';
    modal.innerHTML = `
      <div class="pricescout-modal-content">
        <div class="pricescout-modal-header">
          <h2>Become a Supporter</h2>
          <button class="pricescout-modal-close">&times;</button>
        </div>
        <div class="pricescout-modal-body">
          <p><strong>Supporter Benefits:</strong></p>
          <ul>
            <li>✓ View all price results (not just top 3)</li>
            <li>✓ 30-day price history (vs 7-day)</li>
            <li>✓ Price drop alerts</li>
            <li>✓ Support development</li>
          </ul>
          <p>Pay what you want: $1-2/month via Ko-fi or Stripe</p>
          <div class="pricescout-payment-links">
            <a href="https://ko-fi.com/pricescout" target="_blank" class="pricescout-payment-btn">Support via Ko-fi</a>
          </div>
          <hr>
          <p><strong>Already a supporter?</strong></p>
          <input type="text" id="pricescout-confirmation-code" placeholder="Enter confirmation code">
          <button id="pricescout-activate-btn">Activate</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    modal.querySelector('.pricescout-modal-close').addEventListener('click', () => {
      modal.remove();
    });
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
    
    modal.querySelector('#pricescout-activate-btn').addEventListener('click', async () => {
      const code = modal.querySelector('#pricescout-confirmation-code').value.trim();
      if (code) {
        await chrome.storage.local.set({ supporterCode: code });
        alert('Supporter status activated! Refresh the page to see all features.');
        modal.remove();
      }
    });
  }
  
  function getPlatformFavicon(platform) {
    const domains = {
      'g2g': 'https://www.g2g.com/favicon.ico',
      'funpay': 'https://funpay.com/favicon.ico',
      'playerauctions': 'https://www.playerauctions.com/favicon.ico',
      'eldorado': 'https://www.eldorado.gg/favicon.ico',
      'z2u': 'https://www.z2u.com/favicon.ico',
      'igvault': 'https://www.igvault.com/favicon.ico',
      'stewieshop': 'https://stewieshop.myselauth.com/favicon.ico',
      'gameflip': 'https://gameflip.com/favicon.ico'
    };
    return domains[platform] || '';
  }
  
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
})();