// popup/popup.js
(function() {
  'use strict';
  
  const searchInput = document.getElementById('search-input');
  const searchButton = document.getElementById('search-button');
  const resultsContainer = document.getElementById('results-container');
  const supporterBtn = document.getElementById('supporter-btn');
  
  searchButton.addEventListener('click', handleSearch);
  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  });
  
  supporterBtn.addEventListener('click', showSupporterModal);
  
  async function handleSearch() {
    const query = searchInput.value.trim();
    if (!query) return;
    
    searchButton.disabled = true;
    resultsContainer.innerHTML = '<div class="loading">Searching across platforms...</div>';
    
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'SEARCH_PRICES',
        data: {
          query,
          category: 'other',
          currentPlatform: null
        }
      });
      
      if (response.success && response.results.length > 0) {
        displayResults(response.results);
      } else {
        resultsContainer.innerHTML = '<div class="empty-state">No results found</div>';
      }
    } catch (error) {
      console.error('Search error:', error);
      resultsContainer.innerHTML = '<div class="empty-state">Search failed. Please try again.</div>';
    } finally {
      searchButton.disabled = false;
    }
  }
  
  function displayResults(results) {
    results.sort((a, b) => a.price - b.price);
    
    resultsContainer.innerHTML = results.map(result => `
      <div class="result-card">
        <div class="result-platform">${result.platform}</div>
        <div class="result-title">${escapeHtml(result.title)}</div>
        <div class="result-price">$${result.price.toFixed(2)}</div>
        <a href="${result.url}" target="_blank" class="result-link">View Deal →</a>
      </div>
    `).join('');
  }
  
  function showSupporterModal() {
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
    `;
    
    modal.innerHTML = `
      <div style="background: white; padding: 24px; border-radius: 12px; max-width: 400px; width: 90%;">
        <h2 style="margin: 0 0 16px 0; font-size: 18px;">Become a Supporter</h2>
        <p style="margin: 0 0 12px 0; font-size: 14px; color: #374151;">
          <strong>Benefits:</strong>
        </p>
        <ul style="margin: 0 0 16px 20px; font-size: 14px; color: #374151;">
          <li>View all price results</li>
          <li>30-day price history</li>
          <li>Price drop alerts</li>
          <li>Support development</li>
        </ul>
        <a href="https://ko-fi.com/pricescout" target="_blank" style="display: block; text-align: center; background: #2563eb; color: white; text-decoration: none; padding: 10px; border-radius: 6px; margin-bottom: 16px;">
          Support via Ko-fi
        </a>
        <p style="margin: 0 0 8px 0; font-size: 14px; color: #374151;"><strong>Already a supporter?</strong></p>
        <input type="text" id="modal-code" placeholder="Enter confirmation code" style="width: 100%; padding: 8px; border: 1px solid #e5e5e5; border-radius: 6px; margin-bottom: 8px;">
        <button id="modal-activate" style="width: 100%; padding: 10px; background: #2563eb; color: white; border: none; border-radius: 6px; cursor: pointer;">
          Activate
        </button>
        <button id="modal-close" style="width: 100%; margin-top: 8px; padding: 10px; background: #f3f4f6; color: #374151; border: none; border-radius: 6px; cursor: pointer;">
          Close
        </button>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    document.getElementById('modal-close').addEventListener('click', () => modal.remove());
    document.getElementById('modal-activate').addEventListener('click', async () => {
      const code = document.getElementById('modal-code').value.trim();
      if (code) {
        await chrome.storage.local.set({ supporterCode: code });
        alert('Supporter status activated!');
        modal.remove();
      }
    });
  }
  
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
})();