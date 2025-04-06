// utils/mathUtils.js
function calculatePercentile(value, array) {
    if (!array || array.length === 0) return 0;
    const validArray = array.filter(x => typeof x === 'number' && !isNaN(x));
    if (validArray.length === 0) return 0;
    
    const sorted = [...validArray].sort((a,b) => a - b);
    const count = sorted.filter(x => x <= value).length;
    return (count / sorted.length) * 100;
  }
  
  function calculateStandardDeviation(arr) {
    if (!arr || arr.length === 0) return 0;
    const validArr = arr.filter(x => typeof x === 'number' && !isNaN(x));
    if (validArr.length === 0) return 0;
    
    const avg = validArr.reduce((a,b) => a + b, 0) / validArr.length;
    const squaredDiffs = validArr.map(x => Math.pow(x - avg, 2));
    const variance = squaredDiffs.reduce((a,b) => a + b, 0) / validArr.length;
    return Math.sqrt(variance);
  }
  
  function calculatePriceStabilityScore(stdDev, avgPrice) {
    if (avgPrice === 0 || isNaN(stdDev) || isNaN(avgPrice)) return 0;
    
    const volatility = (stdDev / avgPrice) * 100;
    
    if (volatility <= 10) return 8;
    if (volatility <= 15) return 6;
    if (volatility <= 20) return 4;
    if (volatility <= 30) return 2;
    if (volatility <= 40) return 1;
    return 0;
  }
  
  module.exports = {
    calculatePercentile,
    calculateStandardDeviation,
    calculatePriceStabilityScore
  };