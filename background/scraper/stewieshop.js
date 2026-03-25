// scraper/stewieshop.js
const stewieshopScraper = {
  async search(query, category) {
    try {
      const targetUrl = `https://stewieshop.mysellauth.com/search?q=${encodeURIComponent(query)}`;
      const response = await fetch(`${PROXY_URL}?url=${encodeURIComponent(targetUrl)}`);
      const html = await response.text();
      const results = [];
      const blockRegex = /<(?:div|li)[^>]*class="[^"]*(?:product|item|card)[^"]*"[^>]*>([\s\S]*?)<\/(?:div|li)>/gi;
      let block;
      while ((block = blockRegex.exec(html)) !== null) {
        const b = block[0];
        const titleMatch = b.match(/class="[^"]*(?:name|title)[^"]*"[^>]*>([\s\S]*?)<\/[^>]+>/i) || b.match(/<h[34][^>]*>([\s\S]*?)<\/h[34]>/i);
        const priceMatch = b.match(/class="[^"]*price[^"]*"[^>]*>([\s\S]*?)<\/[^>]+>/i);
        const linkMatch = b.match(/href="(https?:\/\/stewieshop\.mysellauth\.com\/[^"]+|\/[^"]+)"/i);
        if (titleMatch && priceMatch && linkMatch) {
          const titleText = titleMatch[1].replace(/<[^>]+>/g, '').trim();
          const priceText = priceMatch[1].replace(/<[^>]+>/g, '').trim();
          const priceNum = priceText.match(/[\d,.]+/);
          const href = linkMatch[1];
          if (titleText && priceNum) {
            results.push({ platform: 'stewieshop', title: titleText, price: parseFloat(priceNum[0].replace(',', '')), currency: 'USD', url: href.startsWith('http') ? href : `https://stewieshop.mysellauth.com${href}`, seller_rating: null });
          }
        }
      }
      return results.slice(0, 10);
    } catch (error) { console.error('StewieShop scraper error:', error); return []; }
  }
};