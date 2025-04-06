const DealabsService = require('./dealabsController');
const VintedService = require('./vintedController');
const DatabaseService = require('../services/databaseService');
const { delay } = require('../utils/helpers');

async function fullSync() {
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

  // 3. Synchronisation Vinted par lot
  const BATCH_SIZE = 5;
  for (let i = 0; i < legoIds.length; i += BATCH_SIZE) {
    const batch = legoIds.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(legoId => 
        VintedService.scrapeVinted(`Lego ${legoId}`)
          .then(() => delay(5000)) // Anti-rate limiting
        )
    );
  }
}

module.exports = { fullSync };