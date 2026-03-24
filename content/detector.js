// content/detector.js
(function() {
  'use strict';
  
  const PLATFORM_DETECTORS = {
    'g2g.com': {
      name: 'g2g',
      detect: () => {
        const url = window.location.href;
        if (!url.includes('/offer/')) return null;
        
        const titleEl = document.querySelector('h1.offer__title, .product-title');
        const priceEl = document.querySelector('.offer__price, .product-price');
        
        if (!titleEl) return null;
        
        return {
          title: titleEl.textContent.trim(),
          price: priceEl ? parsePrice(priceEl.textContent) : null,
          category: detectCategory(window.location.href)
        };
      }
    },
    'funpay.com': {
      name: 'funpay',
      detect: () => {
        const url = window.location.href;
        if (!url.includes('/lots/offer')) return null;
        
        const titleEl = document.querySelector('.offer-description h1, .tc-header');
        const priceEl = document.querySelector('.tc-price, .offer-price');
        
        if (!titleEl) return null;
        
        return {
          title: titleEl.textContent.trim(),
          price: priceEl ? parsePrice(priceEl.textContent) : null,
          category: detectCategory(window.location.href)
        };
      }
    },
    'playerauctions.com': {
      name: 'playerauctions',
      detect: () => {
        const url = window.location.href;
        if (!url.includes('/offer/')) return null;
        
        const titleEl = document.querySelector('.offer-title, h1.title');
        const priceEl = document.querySelector('.offer-price-amount, .price');
        
        if (!titleEl) return null;
        
        return {
          title: titleEl.textContent.trim(),
          price: priceEl ? parsePrice(priceEl.textContent) : null,
          category: detectCategory(window.location.href)
        };
      }
    },
    'eldorado.gg': {
      name: 'eldorado',
      detect: () => {
        const url = window.location.href;
        if (!url.includes('/offers/')) return null;
        
        const titleEl = document.querySelector('h1, .offer-title');
        const priceEl = document.querySelector('.price, .offer-price');
        
        if (!titleEl) return null;
        
        return {
          title: titleEl.textContent.trim(),
          price: priceEl ? parsePrice(priceEl.textContent) : null,
          category: detectCategory(window.location.href)
        };
      }
    },
    'z2u.com': {
      name: 'z2u',
      detect: () => {
        const url = window.location.href;
        if (!url.includes('/product/')) return null;
        
        const titleEl = document.querySelector('.product-name, h1');
        const priceEl = document.querySelector('.product-price, .price');
        
        if (!titleEl) return null;
        
        return {
          title: titleEl.textContent.trim(),
          price: priceEl ? parsePrice(priceEl.textContent) : null,
          category: detectCategory(window.location.href)
        };
      }
    },
    'igvault.com': {
      name: 'igvault',
      detect: () => {
        const url = window.location.href;
        if (!url.includes('/product/')) return null;
        
        const titleEl = document.querySelector('.product-title, h1');
        const priceEl = document.querySelector('.price, .product-price');
        
        if (!titleEl) return null;
        
        return {
          title: titleEl.textContent.trim(),
          price: priceEl ? parsePrice(priceEl.textContent) : null,
          category: detectCategory(window.location.href)
        };
      }
    },
    'stewieshop.myselauth.com': {
      name: 'stewieshop',
      detect: () => {
        const url = window.location.href;
        if (!url.includes('/product/')) return null;
        
        const titleEl = document.querySelector('.product-name, h1');
        const priceEl = document.querySelector('.product-price, .price');
        
        if (!titleEl) return null;
        
        return {
          title: titleEl.textContent.trim(),
          price: priceEl ? parsePrice(priceEl.textContent) : null,
          category: detectCategory(window.location.href)
        };
      }
    },
    'gameflip.com': {
      name: 'gameflip',
      detect: () => {
        const url = window.location.href;
        if (!url.includes('/item/')) return null;
        
        const titleEl = document.querySelector('h1, .item-title');
        const priceEl = document.querySelector('.price, .item-price');
        
        if (!titleEl) return null;
        
        return {
          title: titleEl.textContent.trim(),
          price: priceEl ? parsePrice(priceEl.textContent) : null,
          category: detectCategory(window.location.href)
        };
      }
    }
  };
  
  function parsePrice(text) {
    const match = text.match(/[\d,]+\.?\d*/);
    return match ? parseFloat(match[0].replace(',', '')) : null;
  }
  
  function detectCategory(url) {
    const lower = url.toLowerCase();
    if (lower.includes('gold') || lower.includes('currency')) return 'currency';
    if (lower.includes('account')) return 'account';
    if (lower.includes('item') || lower.includes('skin')) return 'item';
    if (lower.includes('boost') || lower.includes('service')) return 'service';
    return 'other';
  }
  
  function getCurrentPlatform() {
    const hostname = window.location.hostname;
    for (const [domain, detector] of Object.entries(PLATFORM_DETECTORS)) {
      if (hostname.includes(domain)) {
        return detector.name;
      }
    }
    return null;
  }
  
  function detectItem() {
    const hostname = window.location.hostname;
    
    for (const [domain, detector] of Object.entries(PLATFORM_DETECTORS)) {
      if (hostname.includes(domain)) {
        return detector.detect();
      }
    }
    
    return null;
  }
  
  let detectionTimeout;
  function scheduleDetection() {
    clearTimeout(detectionTimeout);
    detectionTimeout = setTimeout(() => {
      const item = detectItem();
      if (item) {
        const currentPlatform = getCurrentPlatform();
        window.dispatchEvent(new CustomEvent('priceScoutItemDetected', {
          detail: {
            ...item,
            currentPlatform
          }
        }));
      }
    }, 1000);
  }
  
  scheduleDetection();
  
  const observer = new MutationObserver(() => {
    scheduleDetection();
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
})();