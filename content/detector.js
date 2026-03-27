const HOSTS = [
  'www.g2g.com',
  'funpay.com',
  'www.eldorado.gg',
  'www.playerauctions.com',
  'www.z2u.com',
  'gameflip.com',
  'stewieshop.mysellauth.com',
  'plati.market'
];

export function detectMarketplace(hostname = location.hostname) {
  return HOSTS.includes(hostname) ? hostname : null;
}

export function extractQueryFromPage() {
  const title = document.title || '';
  const h1 = document.querySelector('h1')?.textContent || '';
  return (h1 || title).replace(/\s+/g, ' ').trim();
}
