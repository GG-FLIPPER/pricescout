const OFFSCREEN_URL = 'background/offscreen.html';
const WEEK = 7 * 24 * 60 * 60 * 1000;

async function ensureOffscreen() {
  if (await chrome.offscreen.hasDocument()) {
    return;
  }

  await chrome.offscreen.createDocument({
    url: chrome.runtime.getURL(OFFSCREEN_URL),
    reasons: [chrome.offscreen.Reason.DOM_SCRAPING],
    justification: 'Fetch and parse marketplace HTML for price comparison'
  });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === 'SEARCH') {
    handleSearch(message.query, message.category)
      .then(sendResponse)
      .catch((error) => sendResponse({ ok: false, error: error?.message || 'Search failed', results: [] }));
    return true;
  }

  if (message?.type === 'PRICE_DROP') {
    handlePriceDrop(message.item).then(sendResponse);
    return true;
  }

  if (message?.type === 'CHECK_TIP_PROMPT') {
    handleTipPromptCheck().then(sendResponse);
    return true;
  }

  return false;
});

async function handleSearch(query, category) {
  await ensureOffscreen();

  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'SCRAPE', query, category }, (results) => {
      if (chrome.runtime.lastError) {
        resolve({ ok: false, error: chrome.runtime.lastError.message, results: [] });
        return;
      }

      resolve(results);
    });
  });
}

async function handlePriceDrop(item) {
  const isSupporter = await isSupporterActive();
  if (!isSupporter) {
    return { ok: true, notified: false };
  }

  await chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: 'PriceScout price drop',
    message: `${item?.title || 'An item'} dropped to ${formatPrice(item?.price, item?.currency)}`
  });

  return { ok: true, notified: true };
}

async function handleTipPromptCheck() {
  const stats = await getSessionStats();
  const allowed = await shouldShowTipPrompt();
  if (!allowed || (stats.cheaperDeals || 0) < 3) {
    return { ok: true, showTip: false };
  }

  await markTipPromptShown();
  return { ok: true, showTip: true };
}

async function isSupporterActive() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['supporter'], (items) => {
      const supporter = items.supporter;
      if (!supporter) {
        resolve(false);
        return;
      }

      if (supporter.supporterType === 'lifetime') {
        resolve(true);
        return;
      }

      const unlockedAt = Number(supporter.unlockedAt || 0);
      resolve(Date.now() - unlockedAt <= 35 * 24 * 60 * 60 * 1000);
    });
  });
}

function formatPrice(price, currency) {
  if (price == null) return 'Price unavailable';
  return `${currency || 'USD'} ${Number(price).toFixed(2)}`;
}

async function getSessionStats() {
  return new Promise((resolve) => chrome.storage.local.get(['sessionStats'], (items) => resolve(items.sessionStats || { cheaperDeals: 0, lastTipPromptAt: 0 })));
}

async function shouldShowTipPrompt(now = Date.now()) {
  const stats = await getSessionStats();
  return !stats.lastTipPromptAt || now - stats.lastTipPromptAt >= WEEK;
}

async function markTipPromptShown(now = Date.now()) {
  const stats = await getSessionStats();
  return new Promise((resolve) => chrome.storage.local.set({ sessionStats: { ...stats, lastTipPromptAt: now } }, () => resolve()));
}
