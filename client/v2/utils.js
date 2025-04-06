// Fonction pour formater la date
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('fr-FR', options);
  }
  
  // Fonction pour calculer le pourcentage de réduction
  function calculateDiscount(price, originalPrice) {
    return Math.round((1 - price / originalPrice) * 100);
  }