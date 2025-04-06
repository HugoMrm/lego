// databases.js
const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;

// Connexion principale (peut servir de connexion par défaut)
const mainConnection = mongoose.createConnection(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Méthode pour obtenir une connexion à une base spécifique
function getDatabaseConnection(dbName) {
  return mongoose.createConnection(MONGODB_URI, {
    dbName: dbName, // C'est ici qu'on spécifie le nom de la base
    useNewUrlParser: true,
    useUnifiedTopology: true
  });
}

// Connexions pré-configurées
const dealabsConnection = getDatabaseConnection('dealabs');
const vintedConnection = getDatabaseConnection('vinted');

module.exports = {
  mainConnection,
  dealabsConnection,
  vintedConnection,
  getDatabaseConnection
};