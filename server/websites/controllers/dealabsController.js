const { scrapeDealabs } = require('../dealabs_mongo'); // Adaptez l'export

module.exports = {
  scrapeDealabs: async (searchTerm) => {
    const results = await scrapeDealabs(searchTerm);
    return results.filter(deal => deal.id_lego); // Ne garder que les deals avec ID LEGO
  }
};