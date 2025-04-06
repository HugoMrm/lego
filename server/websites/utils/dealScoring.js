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
        hotnessScore: calculateHotnessScore(deal), // Changé ici
        liquidityScore: 0,
        riskScore: 0,
        totalScore: calculateTotalScore({
          percentileScore: 0,
          profitScore: calculateProfitScore(deal),
          marketScore: 0,
          hotnessScore: calculateHotnessScore(deal), // Changé ici
          liquidityScore: 0,
          riskScore: 0
        })
      };
    }
  
    const vintedPrices = vintedData.map(item => item.price).filter(price => !isNaN(price));
    const percentile = calculatePercentile(deal.price, vintedPrices);
    
    const scores = {
      percentileScore: calculatePercentileScore(percentile),
      profitScore: calculateProfitScore(deal),
      marketScore: calculateMarketScore(vintedData),
      hotnessScore: calculateHotnessScore(deal), // Changé ici
      liquidityScore: calculateLiquidityScore(vintedData),
      riskScore: calculateRiskScore(deal, vintedData)
    };
    
    return {
      ...scores,
      totalScore: calculateTotalScore(scores)
    };
  }
  
  function calculateHotnessScore(deal) {
    if (!deal || typeof deal.hotness !== 'number') return 0;
    
    const hotness = deal.hotness;
    
    // Score basé sur la hotness du deal
    if (hotness >= 500) return 15;
    if (hotness >= 300) return 10;
    if (hotness >= 100) return 8;
    if (hotness >= 50) return 5;
    if (hotness >= 15) return 3;
    return 0;
  }
  
  function calculateLiquidityScore(vintedData) {
    if (!vintedData || vintedData.length === 0) return 0;
    
    // Score basé sur la vitesse de vente moyenne
    const validItems = vintedData.filter(item => 
      item.datePublished && item.dateSold && !isNaN(new Date(item.datePublished)) && !isNaN(new Date(item.dateSold))
    );
    
    if (validItems.length === 0) return 5; // Score par défaut si pas de données
    
    const avgDaysOnMarket = validItems.reduce((sum, item) => {
      const days = (new Date(item.dateSold) - new Date(item.datePublished)) / (1000 * 60 * 60 * 24);
      return sum + days;
    }, 0) / validItems.length;
    
    // Plus les articles se vendent vite, meilleur est le score
    if (avgDaysOnMarket <= 3) return 10;
    if (avgDaysOnMarket <= 7) return 8;
    if (avgDaysOnMarket <= 14) return 6;
    if (avgDaysOnMarket <= 30) return 4;
    return 2;
  }
  
  function calculateRiskScore(deal, vintedData) {
    let score = 5; // Score de base
    
    // Pénalité si prix très différent du marché
    if (vintedData && vintedData.length > 0) {
      const avgPrice = vintedData.reduce((sum, item) => sum + item.price, 0) / vintedData.length;
      const priceDiff = Math.abs(deal.price - avgPrice) / avgPrice;
      
      if (priceDiff > 0.5) score -= 3;
      else if (priceDiff > 0.3) score -= 2;
      else if (priceDiff > 0.1) score -= 1;
    }
    
    // Pénalité si état non précisé ou mauvais
    if (!deal.condition || deal.condition === 'satisfactory') score -= 2;
    
    return Math.max(0, Math.min(10, score)); // Garantir entre 0 et 10
  }
  
  function calculatePriceTrendScore(prices) {
    if (!prices || prices.length < 3) return 0;
    
    const sortedPrices = [...prices].sort((a, b) => a - b);
    const median = sortedPrices[Math.floor(sortedPrices.length / 2)];
    const average = prices.reduce((a, b) => a + b, 0) / prices.length;
    
    // Si le prix moyen est significativement supérieur à la médiane
    // cela peut indiquer une tendance à la hausse
    if (average > median * 1.15) return 3;
    if (average > median * 1.05) return 1;
    
    // Si le prix moyen est significativement inférieur à la médiane
    // cela peut indiquer une tendance à la baisse
    if (average < median * 0.85) return -2;
    if (average < median * 0.95) return -1;
    
    return 0;
  }
  
  function calculatePercentileScore(percentile) {
    // Plus le percentile est bas, meilleur est le score (car prix bas)
    if (percentile < 10) return 10;
    if (percentile < 20) return 9;
    if (percentile < 30) return 8;
    if (percentile < 40) return 7;
    if (percentile < 50) return 6;
    if (percentile < 60) return 5;
    if (percentile < 70) return 4;
    if (percentile < 80) return 3;
    if (percentile < 90) return 2;
    return 1;
  }
  
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
  
function calculateProfitScore(deal, vintedData) {
    if (!deal || !deal.price || !vintedData || vintedData.length === 0) {
        return 0;
    }

    // Extraire les prix et calculer le 5ème percentile
    const vintedPrices = vintedData.map(item => item.price).filter(price => !isNaN(price));
    if (vintedPrices.length === 0) return 0;

    const fifthPercentilePrice = calculateNthPercentile(5, vintedPrices);
    
    // Calcul du profit par rapport au 5ème percentile
    const profit = fifthPercentilePrice - deal.price;
    const profitPercentage = (profit / fifthPercentilePrice) * 100;

    // Score basé sur le pourcentage de profit
    let percentageScore = 0;
    if (profitPercentage >= 50) percentageScore = 10;
    else if (profitPercentage >= 40) percentageScore = 9;
    else if (profitPercentage >= 30) percentageScore = 8;
    else if (profitPercentage >= 25) percentageScore = 7;
    else if (profitPercentage >= 20) percentageScore = 6;
    else if (profitPercentage >= 15) percentageScore = 5;
    else if (profitPercentage >= 10) percentageScore = 4;
    else if (profitPercentage >= 5) percentageScore = 3;
    else if (profitPercentage >= 0) percentageScore = 2;
    else percentageScore = 0; // Pénalité si prix au-dessus du 5ème percentile

    // Score basé sur le profit absolu
    let absoluteProfitScore = 0;
    if (profit >= 100) absoluteProfitScore = 10;
    else if (profit >= 75) absoluteProfitScore = 9;
    else if (profit >= 50) absoluteProfitScore = 8;
    else if (profit >= 40) absoluteProfitScore = 7;
    else if (profit >= 30) absoluteProfitScore = 6;
    else if (profit >= 20) absoluteProfitScore = 5;
    else if (profit >= 10) absoluteProfitScore = 4;
    else if (profit >= 5) absoluteProfitScore = 3;
    else if (profit >= 0) absoluteProfitScore = 2;
    else absoluteProfitScore = 0;

    // Combinaison des scores (pondération: 60% pourcentage, 40% absolu)
    const totalScore = (percentageScore * 0.6) + (absoluteProfitScore * 0.4);

    return Math.min(Math.round(totalScore * 10) / 10, 10); // Arrondi à 1 décimale, max 10
}

// Fonction helper pour calculer le Nième percentile
function calculateNthPercentile(n, array) {
    if (!array || array.length === 0) return 0;
    
    const sorted = [...array].sort((a, b) => a - b);
    const index = Math.ceil((n / 100) * sorted.length) - 1;
    
    return sorted[Math.max(0, index)];
}
  
function calculateTotalScore(scores) {
    // Pondérations pour chaque critère
    const weights = {
      percentileScore: 0.25,  // 25%
      profitScore: 0.25,      // 25%
      marketScore: 0.15,      // 15%
      hotnessScore: 0.15,     // 15% (remplace qualityScore)
      liquidityScore: 0.10,   // 10%
      riskScore: 0.10         // 10%
    };
  
    // Calcul du score total pondéré
    const totalScore = 
      (scores.percentileScore * weights.percentileScore) +
      (scores.profitScore * weights.profitScore) +
      (scores.marketScore * weights.marketScore) +
      (scores.hotnessScore * weights.hotnessScore) +
      (scores.liquidityScore * weights.liquidityScore) +
      (scores.riskScore * weights.riskScore);
  
    return Math.min(Math.round(totalScore * 10) / 10, 10); // Arrondi à 1 décimale, max 10
  }
  
  module.exports = {
    calculateDealScore,
    calculateProfitScore,
    calculateHotnessScore, // Changé ici
    calculateLiquidityScore,
    calculateRiskScore,
    calculateMarketScore,
    calculatePercentileScore,
    calculateTotalScore
  };