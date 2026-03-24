// scraper/eldorado.js
const PROXY_URL = 'https://pricescout.senturk2017p.workers.dev';

const eldoradoScraper = {
  async search(query, category) {
    try {
      const targetUrl = `https://www.eldorado.gg/search?query=${encodeURIComponent(query)}`;
      const response = await fetch(`${PROXY_URL}?url=${encodeURIComponent(targetUrl)}`);
      const html = await response.text();
      const results = [];
      const blockRegex = /<(?:div|li|article)[^>]*class="[^"]*(?:offer|product|card)[^"]*"[^>]*>([\s\S]*?)<\/(?:div|li|article)>/gi;
      let block;
      while ((block = blockRegex.exec(html)) !== null) {
        const b = block[0];
        const titleMatch = b.match(/<h[34][^>]*>([\s\S]*?)<\/h[34]>/i) || b.match(/class="[^"]*title[^"]*"[^>]*>([\s\S]*?)<\/[^>]+>/i);
        const priceMatch = b.match(/class="[^"]*price[^"]*"[^>]*>([\s\S]*?)<\/[^>]+>/i);
        const linkMatch = b.match(/href="(https?:\/\/(?:www\.)?eldorado\.gg\/[^"]+|\/[^"]+)"/i);
        if (titleMatch && priceMatch && linkMatch) {
          const titleText = titleMatch[1].replace(/<[^>]+>/g, '').trim();
          const priceText = priceMatch[1].replace(/<[^>]+>/g, '').trim();
          const priceNum = priceText.match(/[\d,.]+/);
          const href = linkMatch[1];
          if (titleText && priceNum) {
            results.push({ platform: 'eldorado', title: titleText, price: parseFloat(priceNum[0].replace(',', '')), currency: 'USD', url: href.startsWith('http') ? href : `https://www.eldorado.gg${href}`, seller_rating: null });
          }
        }
      }
      return results.slice(0, 10);
    } catch (error) { console.error('Eldorado scraper error:', error); return []; }
  }
};
