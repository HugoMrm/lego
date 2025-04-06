const DealabsService = require('./dealabsController');
const VintedService = require('./vintedController');
const DatabaseService = require('../services/databaseService');
const { delay } = require('../utils/helpers');

async function fullSync() {
  // 1. Synchronisation Dealabs
  await DatabaseService.refreshCollection(
    'dealabs', // Nom de la base
    'deals',   // Nom de la collection
    () => DealabsService.scrapeDealabs('lego')
  );

  // 2. Synchronisation Vinted
  const legoIds = await DatabaseService.getDistinctValues(
    'dealabs', 
    'deals', 
    'id_lego'
  );

  const allVintedDeals = [];
  for (const legoId of legoIds) {
    const deals = await VintedService.scrapeVinted(`Lego ${legoId}`);
    allVintedDeals.push(...deals);
    await delay(2000); // Anti-rate limiting
  }

  await DatabaseService.refreshCollection(
    'vinted',
    'deals',
    () => Promise.resolve(allVintedDeals)
  );
}

module.exports = { fullSync };