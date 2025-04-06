const DealabsService = require('./dealabsController');
const VintedService = require('./vintedController');
const DatabaseService = require('../services/databaseService');
const { delay } = require('../utils/helpers');

async function fullSync() {
  try {
    // 1. Synchronisation Dealabs
    await DatabaseService.refreshCollection(
      'dealabs', 
      'deals', 
      () => DealabsService.scrapeDealabs('lego')
    );

    // 2. Récupération des IDs LEGO uniques
    const legoIds = await DatabaseService.getDistinctValues(
      'dealabs', 
      'deals', 
      'id_lego'
    );

    console.log(`🔍 ${legoIds.length} IDs Lego trouvés pour synchronisation Vinted`);

    // 3. Synchronisation Vinted par lot avec sauvegarde des résultats
    const BATCH_SIZE = 5;
    const allVintedDeals = [];
    
    for (let i = 0; i < legoIds.length; i += BATCH_SIZE) {
      const batch = legoIds.slice(i, i + BATCH_SIZE);
      
      // Récupération des deals pour le lot courant
      const batchResults = await Promise.all(
        batch.map(legoId => 
          VintedService.scrapeVinted(`Lego ${legoId}`)
            .then(deals => {
              console.log(`✅ ${deals.length} items trouvés pour Lego ${legoId}`);
              return deals;
            })
            .catch(err => {
              console.error(`❌ Erreur pour Lego ${legoId}:`, err.message);
              return []; // Retourne un tableau vide en cas d'erreur
            })
        )
      );

      // Ajout des résultats au tableau global
      allVintedDeals.push(...batchResults.flat());
      
      // Délai anti-rate limiting entre les lots
      if (i + BATCH_SIZE < legoIds.length) {
        console.log(`⏳ Pause de 5s avant le prochain lot...`);
        await delay(5000);
      }
    }

    // 4. Sauvegarde finale dans MongoDB
    if (allVintedDeals.length > 0) {
      await DatabaseService.refreshCollection(
        'vinted',
        'deals',
        () => Promise.resolve(allVintedDeals)
      );
      console.log(`💾 ${allVintedDeals.length} deals Vinted sauvegardés`);
    } else {
      console.log('ℹ️ Aucun deal Vinted à sauvegarder');
    }

  } catch (error) {
    console.error('❌ Erreur fatale lors de la synchronisation:', error);
    throw error;
  }
}

module.exports = { fullSync };