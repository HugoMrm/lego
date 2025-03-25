// Fonction unifiée pour lancer les deux scrapers
async function searchAllPlatforms(searchText = '42151') {
    try {
      console.log(`🔥 Lancement de la recherche pour "${searchText}" sur toutes les plateformes`);
      
      // Exécution en parallèle (à adapter si vous voulez utiliser puppeteer)
      const [vintedResults, dealabsResults] = await Promise.all([
        scrapeVinted(searchText),
        scrapeDealabs(searchText)
      ]);
  
      console.log(`✅ Total résultats: 
        Vinted: ${vintedResults.length} 
        Dealabs: ${dealabsResults.length}`);
  
      return [...vintedResults, ...dealabsResults];
    } catch (error) {
      console.error('❌ Erreur recherche globale:', error);
      return [];
    }
  }
  
  // Exemple d'utilisation
  searchAllPlatforms('lego 42151');
  
  // Export pour modularité
  module.exports = {
    scrapeDealabs,
    searchAllPlatforms
  };