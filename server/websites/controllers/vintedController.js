const { scrapeVinted } = require('../vinted_mongo'); // Adaptez l'export

module.exports = {
  scrapeVinted: async (searchTerm) => {
    return scrapeVinted(searchTerm);
  }
};