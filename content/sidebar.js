import { detectMarketplace, extractQueryFromPage } from './detector.js';

if (detectMarketplace()) {
  const mount = document.createElement('div');
  mount.id = 'pricescout-root';
  document.documentElement.appendChild(mount);

  const shadow = mount.attachShadow({ mode: 'open' });
  shadow.innerHTML = `
    <style>
      @import url('${chrome.runtime.getURL('content/sidebar.css')}');
    </style>
    <div class="pricescout-sidebar" part="sidebar">
      <div class="pricescout-header">PriceScout</div>
      <div class="pricescout-body">
        <div class="pricescout-status" id="pricescout-status">Loading...</div>
        <div class="pricescout-results" id="pricescout-results"></div>
      </div>
    </div>
  `;

  const status = shadow.getElementById('pricescout-status');
  const results = shadow.getElementById('pricescout-results');
  const query = extractQueryFromPage();
  const searchQuery = query || document.title || '';

  status.textContent = searchQuery ? `Searching for ${searchQuery}` : 'No item detected';

  chrome.runtime.sendMessage({ type: 'SEARCH', query: searchQuery }, (response) => {
    if (chrome.runtime.lastError) {
      status.textContent = 'Search failed';
      return;
    }

    const items = (response?.results || []).slice(0, 3);
    if (!items.length) {
      status.textContent = 'No results found';
      return;
    }

    status.textContent = `Found ${items.length} results`;
    results.innerHTML = items.map((item) => renderCard(item)).join('');

    for (const link of results.querySelectorAll('[data-shortened-link]')) {
      const originalUrl = link.getAttribute('href');
      chrome.runtime.sendMessage({ type: 'SHORTEN_URL', url: originalUrl }, (shortened) => {
        if (shortened?.shortUrl) {
          link.href = shortened.shortUrl;
        }
      });
    }

    chrome.runtime.sendMessage({ type: 'REGISTER_SESSION_DEAL', data: { query: searchQuery } });
  });
}

function renderCard(item) {
  return `
    <div class="pricescout-card">
      <div class="pricescout-card-title">${escapeHtml(item.title)}</div>
      <div class="pricescout-card-meta">${escapeHtml(item.platform)} · ${escapeHtml(formatPrice(item.price, item.currency))}</div>
      <a data-shortened-link class="pricescout-link" href="${escapeAttr(item.url)}" target="_blank" rel="noreferrer">View Deal</a>
    </div>
  `;
}

function formatPrice(price, currency) {
  if (price == null) return 'Price unavailable';
  return `${currency || 'USD'} ${Number(price).toFixed(2)}`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, '&#96;');
}
