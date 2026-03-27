const form = document.getElementById('search-form');
const queryInput = document.getElementById('query');
const results = document.getElementById('results');

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const query = queryInput.value.trim();
  if (!query) return;

  results.textContent = 'Searching...';
  const response = await chrome.runtime.sendMessage({ type: 'SEARCH', query });
  const items = (response?.results || []).slice(0, 3);
  results.innerHTML = items.length
    ? items.map((item) => `<div class="card"><strong>${escapeHtml(item.title)}</strong><div>${escapeHtml(formatPrice(item.price, item.currency))}</div><a href="${escapeAttr(item.url)}" target="_blank" rel="noreferrer">View Deal</a></div>`).join('')
    : '<div>No results</div>';

  for (const link of results.querySelectorAll('a[href]')) {
    chrome.runtime.sendMessage({ type: 'SHORTEN_URL', url: link.getAttribute('href') }, (shortened) => {
      if (shortened?.shortUrl) {
        link.href = shortened.shortUrl;
      }
    });
  }

  chrome.runtime.sendMessage({ type: 'REGISTER_SESSION_DEAL', data: { query } });
});

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
