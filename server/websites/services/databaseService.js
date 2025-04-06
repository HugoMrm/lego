const mongoose = require('mongoose');

async function withDB(dbName, fn) {
  const conn = await mongoose.createConnection(process.env.MONGODB_URI, {
    dbName: dbName,
    retryWrites: true
  }).asPromise();

  try {
    return await fn(conn);
  } finally {
    await conn.close();
  }
}

module.exports = {
  refreshCollection: async (dbName, collectionName, dataFn) => {
    await withDB(dbName, async (conn) => {
      await conn.dropCollection(collectionName);
      console.log(`♻️ Collection ${collectionName} nettoyée dans ${dbName}`);
      const data = await dataFn();
      await conn.collection(collectionName).insertMany(data);
      console.log(`💾 ${data.length} documents insérés`);
    });
  },

  getDistinctValues: async (dbName, collectionName, field) => {
    return withDB(dbName, async (conn) => {
      return conn.collection(collectionName)
        .distinct(field)
        .then(values => values.filter(Boolean));
    });
  }
};