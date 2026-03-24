// background/service-worker.js
importScripts(
  'scraper/g2g.js',
  'scraper/funpay.js',
  'scraper/playerauctions.js',
  'scraper/eldorado.js',
  'scraper/z2u.js',
  'scraper/igvault.js',
  'scraper/stewieshop.js',
  'scraper/gameflip.js',
  'utils/parser.js',
  'utils/storage.js'
);

const SCRAPERS = {
  'g2g': g2gScraper,
  'funpay': funpayScraper,
  'playerauctions': playerauctionsScraper,
  'eldorado': eldoradoScraper,
  'z2u': z2uScraper,
  'igvault': igvaultScraper,
  'stewieshop': stewieshopScraper,
  'gameflip': gameflipScraper
};

const CACHE_DURATION = 10 * 60 * 1000;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SEARCH_PRICES') {
    handleSearchPrices(message.data).then(sendResponse);
    return true;
  }
  
  if (message.type === 'GET_PRICE_HISTORY') {
    handleGetPriceHistory(message.data).then(sendResponse);
    return true;
  }
  
  if (message.type === 'RECORD_SAVINGS') {
    handleRecordSavings(message.data).then(sendResponse);
    return true;
  }
  
  if (message.type === 'CHECK_TIP_PROMPT') {
    handleCheckTipPrompt().then(sendResponse);
    return true;
  }
});

async function handleSearchPrices({ query, category, currentPlatform }) {
  const normalized = normalizeItemName(query);
  const cacheKey = `cache_${normalized}`;
  
  try {
    const cached = await chrome.storage.session.get(cacheKey);
    if (cached[cacheKey] && Date.now() - cached[cacheKey].timestamp < CACHE_DURATION) {
      return { success: true, results: cached[cacheKey].results };
    }
  } catch (e) {
    console.log('Cache check failed:', e);
  }
  
  const results = [];
  const promises = [];
  
  for (const [platformName, scraper] of Object.entries(SCRAPERS)) {
    if (platformName === currentPlatform) continue;
    
    promises.push(
      scraper.search(normalized, category)
        .then(items => {
          if (items && items.length > 0) {
            results.push(...items);
          }
        })
        .catch(err => {
          console.error(`Scraper ${platformName} failed:`, err);
        })
    );
  }
  
  await Promise.all(promises);
  
  await storePriceHistory(results, normalized);
  
  try {
    await chrome.storage.session.set({
      [cacheKey]: {
        results,
        timestamp: Date.now()
      }
    });
  } catch (e) {
    console.log('Cache set failed:', e);
  }
  
  return { success: true, results };
}

async function handleGetPriceHistory({ itemName }) {
  const normalized = normalizeItemName(itemName);
  
  try {
    const data = await chrome.storage.local.get('priceHistory');
    const history = data.priceHistory || [];
    
    const itemHistory = history.filter(entry => entry.item_normalized === normalized);
    
    const supporter = await checkSupporterStatus();
    const daysLimit = supporter ? 30 : 7;
    const cutoffTime = Date.now() - (daysLimit * 24 * 60 * 60 * 1000);
    
    const filtered = itemHistory.filter(entry => entry.timestamp >= cutoffTime);
    
    const grouped = {};
    filtered.forEach(entry => {
      if (!grouped[entry.platform]) {
        grouped[entry.platform] = [];
      }
      grouped[entry.platform].push({
        price: entry.price,
        timestamp: entry.timestamp
      });
    });
    
    return { success: true, history: grouped };
  } catch (e) {
    console.error('Get price history failed:', e);
    return { success: false, history: {} };
  }
}

async function storePriceHistory(results, normalized) {
  if (!results || results.length === 0) return;
  
  try {
    const data = await chrome.storage.local.get('priceHistory');
    let history = data.priceHistory || [];
    
    const timestamp = Date.now();
    results.forEach(result => {
      history.push({
        item_normalized: normalized,
        platform: result.platform,
        price: result.price,
        currency: result.currency,
        timestamp
      });
    });
    
    history.sort((a, b) => b.timestamp - a.timestamp);
    history = history.slice(0, 500);
    
    await chrome.storage.local.set({ priceHistory: history });
  } catch (e) {
    console.error('Store price history failed:', e);
  }
}

async function handleRecordSavings({ amount }) {
  try {
    const data = await chrome.storage.local.get(['savingsCount', 'lastTipPrompt']);
    let savingsCount = (data.savingsCount || 0) + 1;
    
    await chrome.storage.local.set({ savingsCount });
    
    return { success: true, count: savingsCount };
  } catch (e) {
    console.error('Record savings failed:', e);
    return { success: false };
  }
}

async function handleCheckTipPrompt() {
  try {
    const supporter = await checkSupporterStatus();
    if (supporter) {
      return { showPrompt: false };
    }
    
    const data = await chrome.storage.local.get(['savingsCount', 'lastTipPrompt']);
    const savingsCount = data.savingsCount || 0;
    const lastTipPrompt = data.lastTipPrompt || 0;
    const oneWeek = 7 * 24 * 60 * 60 * 1000;
    
    if (savingsCount >= 3 && Date.now() - lastTipPrompt > oneWeek) {
      await chrome.storage.local.set({ lastTipPrompt: Date.now() });
      return { showPrompt: true };
    }
    
    return { showPrompt: false };
  } catch (e) {
    console.error('Check tip prompt failed:', e);
    return { showPrompt: false };
  }
}

async function checkSupporterStatus() {
  try {
    const data = await chrome.storage.local.get('supporterCode');
    return !!(data.supporterCode && data.supporterCode.length > 0);
  } catch (e) {
    return false;
  }
}