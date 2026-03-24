// utils/parser.js
function normalizeItemName(name) {
  let normalized = name.toLowerCase();
  
  normalized = normalized.replace(/[⚡🔥💎✨]/g, '');
  
  const stopWords = ['cheap', 'fast', 'instant', 'safe', 'legit', 'trusted', 'best', 'reliable', 'quick', 'delivery'];
  stopWords.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    normalized = normalized.replace(regex, '');
  });
  
  normalized = normalized.replace(/[^\w\s]/g, ' ');
  normalized = normalized.replace(/\s+/g, ' ').trim();
  
  return normalized;
}