// scraper/funpay.js
const PROXY_URL = 'https://pricescout.senturk2017p.workers.dev';

const funpayScraper = {
  async search(query, category) {
    try {
      const targetUrl = `https://funpay.com/en/search/?query=${encodeURIComponent(query)}`;
      const response = await fetch(`${PROXY_URL}?url=${encodeURIComponent(targetUrl)}`);
      const html = await response.text();
      const results = [];
      const blockRegex = /<(?:div|li)[^>]*class="[^"]*tc-item[^"]*"[^>]*>([\s\S]*?)<\/(?:div|li)>/gi;
      let block;
      while ((block = blockRegex.exec(html)) !== null) {
        const b = block[0];
        const titleMatch = b.match(/class="[^"]*tc-desc-text[^"]*"[^>]*>([\s\S]*?)<\/[^>]+>/i);
        const priceMatch = b.match(/class="[^"]*tc-price[^"]*"[^>]*>([\s\S]*?)<\/[^>]+>/i);
        const linkMatch = b.match(/href="(https?:\/\/funpay\.com\/lots\/[^"]+|\/lots\/[^"]+)"/i);
        if (titleMatch && priceMatch && linkMatch) {
          const titleText = titleMatch[1].replace(/<[^>]+>/g, '').trim();
          const priceText = priceMatch[1].replace(/<[^>]+>/g, '').trim();
          const priceNum = priceText.match(/[\d,.]+/);
          const href = linkMatch[1];
          if (titleText && priceNum) {
            results.push({ platform: 'funpay', title: titleText, price: parseFloat(priceNum[0].replace(',', '')), currency: 'USD', url: href.startsWith('http') ? href : `https://funpay.com${href}`, seller_rating: null });
          }
        }
      }
      return results.slice(0, 10);
    } catch (error) { console.error('FunPay scraper error:', error); return []; }
  }
};