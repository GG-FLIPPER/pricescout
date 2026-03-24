// utils/similarity.js
const similarityUtils = {
  levenshteinDistance(str1, str2) {
    const len1 = str1.length;
    const len2 = str2.length;
    const matrix = [];
    
    for (let i = 0; i <= len1; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
      }
    }
    
    return matrix[len1][len2];
  },
  
  similarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) {
      return 1.0;
    }
    
    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  },
  
  fuzzyMatch(query, candidates, threshold = 0.6) {
    const results = [];
    
    candidates.forEach(candidate => {
      const score = this.similarity(query.toLowerCase(), candidate.title.toLowerCase());
      if (score >= threshold) {
        results.push({
          ...candidate,
          matchScore: score
        });
      }
    });
    
    results.sort((a, b) => b.matchScore - a.matchScore);
    return results;
  }
};