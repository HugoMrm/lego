// utils/dealscoring.js
const { 
    calculatePercentile,
    calculateStandardDeviation,
    calculatePriceStabilityScore
  } = require('./mathUtils');
  
  // Fonction principale de scoring
  function calculateDealScore(deal, vintedData) {
    // Vérification des données Vinted
    if (!vintedData || vintedData.length === 0) {
      return {
        percentileScore: 0,
        profitScore: calculateProfitScore(deal),
        marketScore: 0,
        qualityScore: calculateQualityScore(deal),
        liquidityScore: 0,
        riskScore: 0,
        totalScore: 0
      };
    }
  
    const vintedPrices = vintedData.map(item => item.price).filter(price => !isNaN(price));
    const percentile = calculatePercentile(deal.price, vintedPrices);
    
    return {
      percentileScore: calculatePercentileScore(percentile),
      profitScore: calculateProfitScore(deal),
      marketScore: calculateMarketScore(vintedData),
      qualityScore: calculateQualityScore(deal),
      liquidityScore: calculateLiquidityScore(vintedData),
      riskScore: calculateRiskScore(deal, vintedData),
      totalScore: 0 // Initialisé plus bas
    };
  }
  
  // ... (gardez le reste des fonctions de scoring inchangé)
  
  function calculateMarketScore(vintedData) {
    if (!vintedData || vintedData.length === 0) return 0;
  
    const count = vintedData.length;
    const prices = vintedData.map(d => d.price).filter(price => !isNaN(price));
    
    if (prices.length === 0) return 0;
  
    const priceStdDev = calculateStandardDeviation(prices);
    const avgPrice = prices.reduce((a,b) => a + b, 0) / prices.length;
    
    // Score nombre d'annonces
    let countScore = 0;
    if (count >= 15) countScore = 8;
    else if (count >= 10) countScore = 6;
    else if (count >= 5) countScore = 4;
    else if (count >= 3) countScore = 2;
    else if (count >= 1) countScore = 1;
  
    // Score stabilité des prix
    const stabilityScore = calculatePriceStabilityScore(priceStdDev, avgPrice);
    
    // Score tendance (comparaison prix moyen/médian)
    const trendScore = calculatePriceTrendScore(prices);
  
    return countScore + stabilityScore + trendScore;
  }
  
  // Supprimez la fonction calculateStandardDeviation locale puisque vous l'importez maintenant