const OUNO_API_KEY = 'DqcUwvlx';
const TOP_FREE_RESULTS = 3;

const SCRAPER_DEFINITIONS = [
  {
    platform: 'g2g',
    buildUrl: (query) => `https://www.g2g.com/search?query=${encodeURIComponent(query)}`,
    selectors: {
      cards: ['[data-testid*="product"]', '.product-card', 'article'],
      title: (card) => textOf(card.querySelector('a[href] h3, a[href] h2, h1, h2, h3, .product-title, [data-testid*="title"]')),
      price: (card) => extractPrice(card),
      url: (card) => card.querySelector('a[href]')?.href || '',
      rating: (card) => textOf(card.querySelector('[data-testid*="rating"], .rating, [class*="seller"]')) || null
    }
  },
  {
    platform: 'funpay',
    buildUrl: (query) => `https://funpay.com/en/search/?query=${encodeURIComponent(query)}`,
    selectors: {
      cards: ['.tc-item', '.product', 'article'],
      title: (card) => textOf(card.querySelector('.tc-title, h3, h2, [class*="title"]')),
      price: (card) => extractPrice(card),
      url: (card) => card.querySelector('a[href]')?.href || '',
      rating: (card) => textOf(card.querySelector('[class*="rating"], .rating, [class*="seller"]')) || null
    }
  },
  {
    platform: 'eldorado',
    buildUrl: (query) => `https://www.eldorado.gg/search?query=${encodeURIComponent(query)}`,
    selectors: {
      cards: ['[data-testid*="listing"]', '[class*="search-result"]', '.product-card', 'article'],
      title: (card) => textOf(card.querySelector('h2, h3, [class*="title"], [data-testid*="title"]')),
      price: (card) => extractPrice(card),
      url: (card) => card.querySelector('a[href]')?.href || '',
      rating: (card) => textOf(card.querySelector('[class*="rating"], .rating, [class*="seller"]')) || null
    }
  },
  {
    platform: 'playerauctions',
    buildUrl: (query) => `https://www.playerauctions.com/search/?q=${encodeURIComponent(query)}`,
    selectors: {
      cards: ['[data-testid*="listing"]', '[class*="item-card"]', '.product-card', 'article'],
      title: (card) => textOf(card.querySelector('h2, h3, [class*="title"], [data-testid*="title"]')),
      price: (card) => extractPrice(card),
      url: (card) => card.querySelector('a[href]')?.href || '',
      rating: (card) => textOf(card.querySelector('[class*="rating"], .rating, [class*="seller"]')) || null
    }
  },
  {
    platform: 'z2u',
    buildUrl: (query) => `https://www.z2u.com/search?keywords=${encodeURIComponent(query)}`,
    selectors: {
      cards: ['[data-testid*="product"]', '[class*="search-item"]', '.product-card', 'article'],
      title: (card) => textOf(card.querySelector('h2, h3, [class*="title"], [data-testid*="title"]')),
      price: (card) => extractPrice(card),
      url: (card) => card.querySelector('a[href]')?.href || '',
      rating: (card) => textOf(card.querySelector('[class*="rating"], .rating, [class*="seller"]')) || null
    }
  },
  {
    platform: 'gameflip',
    buildUrl: (query) => `https://gameflip.com/search?q=${encodeURIComponent(query)}`,
    selectors: {
      cards: ['[data-testid*="listing"]', '[class*="listing"]', '.product-card', 'article'],
      title: (card) => textOf(card.querySelector('h2, h3, [class*="title"], [data-testid*="title"]')),
      price: (card) => extractPrice(card),
      url: (card) => card.querySelector('a[href]')?.href || '',
      rating: (card) => textOf(card.querySelector('[class*="rating"], .rating, [class*="seller"]')) || null
    }
  },
  {
    platform: 'stewieshop',
    buildUrl: (query) => `https://stewieshop.mysellauth.com/search?q=${encodeURIComponent(query)}`,
    selectors: {
      cards: ['[data-testid*="product"]', '[class*="product"]', '.product-card', 'article'],
      title: (card) => textOf(card.querySelector('h2, h3, [class*="title"], [data-testid*="title"]')),
      price: (card) => extractPrice(card),
      url: (card) => card.querySelector('a[href]')?.href || '',
      rating: (card) => textOf(card.querySelector('[class*="rating"], .rating, [class*="seller"]')) || null
    }
  },
  {
    platform: 'plati',
    buildUrl: (query) => `https://plati.market/search/${encodeURIComponent(query)}`,
    selectors: {
      cards: ['[data-testid*="product"]', '[class*="product"]', '.product-card', 'article'],
      title: (card) => textOf(card.querySelector('h2, h3, [class*="title"], [data-testid*="title"]')),
      price: (card) => extractPrice(card),
      url: (card) => card.querySelector('a[href]')?.href || '',
      rating: (card) => textOf(card.querySelector('[class*="rating"], .rating, [class*="seller"]')) || null
    }
  }
];

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === 'SCRAPE') {
    scrapeAll(message.query)
      .then(sendResponse)
      .catch((error) => sendResponse({ ok: false, error: error?.message || 'Scrape failed', results: [] }));
    return true;
  }

  if (message?.type === 'SHORTEN_URL') {
    shortenUrl(message.url)
      .then((result) => sendResponse({ ok: true, ...result }))
      .catch(() => sendResponse({ ok: true, shortUrl: message.url, cached: false }));
    return true;
  }

  if (message?.type === 'UPDATE_PRICE_HISTORY') {
    updatePriceHistory(message.key, message.entry)
      .then(() => sendResponse({ ok: true }))
      .catch(() => sendResponse({ ok: false }));
    return true;
  }

  if (message?.type === 'REGISTER_SESSION_DEAL') {
    registerDeal(message.data)
      .then((payload) => sendResponse({ ok: true, payload }))
      .catch(() => sendResponse({ ok: false }));
    return true;
  }

  return false;
});

async function scrapeAll(query) {
  const settled = await Promise.allSettled(
    SCRAPER_DEFINITIONS.map((definition) => scrapeSite(definition, query))
  );

  const results = settled.flatMap((entry) => (entry.status === 'fulfilled' ? entry.value : []));
  results.sort((a, b) => (priceValue(a.price) ?? Infinity) - (priceValue(b.price) ?? Infinity));
  return { ok: true, results: results.slice(0, TOP_FREE_RESULTS) };
}

async function scrapeSite(definition, query) {
  try {
    const html = await fetchHtml(definition.buildUrl(query));
    const doc = parseDocument(html);
    const results = [];

    for (const selector of definition.selectors.cards) {
      for (const card of doc.querySelectorAll(selector)) {
        const title = definition.selectors.title(card);
        const url = definition.selectors.url(card);
        if (!title || !url) continue;

        results.push({
          platform: definition.platform,
          title,
          price: definition.selectors.price(card),
          currency: detectCurrency(card) || 'USD',
          url,
          seller_rating: definition.selectors.rating(card)
        });
      }
      if (results.length) break;
    }

    if (!results.length) {
      for (const item of extractJsonLd(doc)) {
        const offers = Array.isArray(item?.offers) ? item.offers[0] : item?.offers;
        if (item?.name && offers?.url) {
          results.push({
            platform: definition.platform,
            title: item.name,
            price: toPrice(offers.price),
            currency: offers.priceCurrency || 'USD',
            url: offers.url,
            seller_rating: null
          });
        }
      }
    }

    return results;
  } catch {
    return [];
  }
}

async function shortenUrl(url) {
  const supporter = await getSupporterState();
  if (supporter) {
    return { shortUrl: url, cached: true };
  }

  const cached = await getSessionShortLinks();
  if (cached[url]) {
    return { shortUrl: cached[url], cached: true };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3000);

  try {
    const response = await fetch(`https://ouo.io/api/${OUNO_API_KEY}?s=${encodeURIComponent(url)}`, {
      signal: controller.signal,
      credentials: 'omit'
    });
    const shortUrl = (await response.text()).trim();
    if (!shortUrl) {
      throw new Error('Empty short url');
    }

    cached[url] = shortUrl;
    await setSessionShortLinks(cached);
    return { shortUrl, cached: false };
  } catch {
    return { shortUrl: url, cached: false };
  } finally {
    clearTimeout(timer);
  }
}

async function updatePriceHistory(key, entry) {
  const history = await getPriceHistory();
  history[key] = [...(history[key] || []), entry].slice(-30);
  await setPriceHistory(history);
}

async function registerDeal(data) {
  const stats = await getSessionStats();
  stats.cheaperDeals += 1;
  await setSessionStats(stats);
  return stats;
}

async function fetchHtml(url) {
  const response = await fetch(url, {
    credentials: 'omit',
    cache: 'no-store'
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.text();
}

function parseDocument(html) {
  return new DOMParser().parseFromString(html, 'text/html');
}

function extractJsonLd(doc) {
  return Array.from(doc.querySelectorAll('script[type="application/ld+json"]'))
    .map((script) => {
      try {
        return JSON.parse(script.textContent || 'null');
      } catch {
        return null;
      }
    })
    .flatMap((value) => (Array.isArray(value) ? value : [value]))
    .filter(Boolean);
}

function textOf(node) {
  return node?.textContent?.replace(/\s+/g, ' ').trim() || '';
}

function extractPrice(card) {
  const text = textOf(card.querySelector('[class*="price"], .price, [data-testid*="price"]')) || textOf(card);
  const match = text.match(/([€$£]?)\s*([\d.,]+)/);
  return match ? toPrice(match[2]) : null;
}

function toPrice(value) {
  const match = String(value || '').match(/([\d.,]+)/);
  return match ? Number(match[1].replace(/,/g, '')) : null;
}

function priceValue(price) {
  return typeof price === 'number' ? price : toPrice(price);
}

function detectCurrency(card) {
  const text = textOf(card).toUpperCase();
  if (text.includes('EUR') || text.includes('€')) return 'EUR';
  if (text.includes('GBP') || text.includes('£')) return 'GBP';
  return 'USD';
}

async function getSupporterState() {
  return new Promise((resolve) => chrome.storage.local.get(['supporter'], (items) => resolve(items.supporter || null)));
}

async function getSessionShortLinks() {
  return new Promise((resolve) => chrome.storage.session.get(['shortLinks'], (items) => resolve(items.shortLinks || {})));
}

async function setSessionShortLinks(shortLinks) {
  return new Promise((resolve) => chrome.storage.session.set({ shortLinks }, () => resolve()));
}

async function getPriceHistory() {
  return new Promise((resolve) => chrome.storage.local.get(['priceHistory'], (items) => resolve(items.priceHistory || {})));
}

async function setPriceHistory(priceHistory) {
  return new Promise((resolve) => chrome.storage.local.set({ priceHistory }, () => resolve()));
}

async function getSessionStats() {
  return new Promise((resolve) => chrome.storage.local.get(['sessionStats'], (items) => resolve(items.sessionStats || { cheaperDeals: 0, lastTipPromptAt: 0 })));
}

async function setSessionStats(sessionStats) {
  return new Promise((resolve) => chrome.storage.local.set({ sessionStats }, () => resolve()));
}
