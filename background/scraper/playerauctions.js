// scraper/playerauctions.js
const playerauctionsScraper = {
  async search(query, category) {
    try {
      const targetUrl = `https://www.playerauctions.com/search/?q=${encodeURIComponent(query)}`;
      const response = await fetch(`${PROXY_URL}?url=${encodeURIComponent(targetUrl)}`);
      const html = await response.text();
      const results = [];
      const blockRegex = /<(?:div|li)[^>]*class="[^"]*(?:offer|product|item)[^"]*"[^>]*>([\s\S]*?)<\/(?:div|li)>/gi;
      let block;
      while ((block = blockRegex.exec(html)) !== null) {
        const b = block[0];
        const titleMatch = b.match(/<h[34][^>]*>([\s\S]*?)<\/h[34]>/i) || b.match(/class="[^"]*(?:title|name)[^"]*"[^>]*>([\s\S]*?)<\/[^>]+>/i);
        const priceMatch = b.match(/class="[^"]*price[^"]*"[^>]*>([\s\S]*?)<\/[^>]+>/i);
        const linkMatch = b.match(/href="(https?:\/\/(?:www\.)?playerauctions\.com\/[^"]+|\/[^"]+)"/i);
        if (titleMatch && priceMatch && linkMatch) {
          const titleText = titleMatch[1].replace(/<[^>]+>/g, '').trim();
          const priceText = priceMatch[1].replace(/<[^>]+>/g, '').trim();
          const priceNum = priceText.match(/[\d,.]+/);
          const href = linkMatch[1];
          if (titleText && priceNum) {
            results.push({ platform: 'playerauctions', title: titleText, price: parseFloat(priceNum[0].replace(',', '')), currency: 'USD', url: href.startsWith('http') ? href : `https://www.playerauctions.com${href}`, seller_rating: null });
          }
        }
      }
      return results.slice(0, 10);
    } catch (error) { console.error('PlayerAuctions scraper error:', error); return []; }
  }
};