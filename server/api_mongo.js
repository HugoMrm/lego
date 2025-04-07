// api/index.js - Version avec le nouveau système de scoring
const cors = require('cors');
const express = require('express');
const helmet = require('helmet');
const { MongoClient } = require('mongodb');
const path = require('path');
require('dotenv').config();

// Import des fonctions de scoring
const { 
  calculateDealScore,
  calculateProfitScore
} = require('./websites/utils/dealScoring');

const PORT = process.env.PORT || 8092;
const MONGODB_URI = process.env.MONGODB_URI;

const app = express();

// Middlewares
app.use(express.json());
app.use(cors());
app.use(helmet());
app.options('*', cors());

// MongoDB client setup
let client;

async function connectToMongo(dbName) {
  console.log(`🔌 Tentative de connexion à MongoDB (base: ${dbName})...`);
  
  try {
    if (!client) {
      console.log('🆕 Création d\'une nouvelle connexion MongoDB');
      client = new MongoClient(MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        maxPoolSize: 10
      });
      await client.connect();
    }

    const db = client.db(dbName);
    console.log(`✅ Connecté à MongoDB - Base: ${dbName}`);
    
    // Vérification que la collection existe
    const collections = await db.listCollections().toArray();
    console.log(`📚 Collections disponibles dans ${dbName}:`, collections.map(c => c.name));
    
    return db;
  } catch (error) {
    console.error(`❌ Erreur de connexion à MongoDB (base: ${dbName}):`, error);
    throw error;
  }
}

// Fonction helper pour calculer le Nième percentile
function calculateNthPercentile(n, array) {
  if (!array || array.length === 0) return 0;
  
  const sorted = [...array].sort((a, b) => a - b);
  const index = Math.ceil((n / 100) * sorted.length) - 1;
  
  return sorted[Math.max(0, index)];
}

function getRatingFromScore(totalScore) {
  if (totalScore >= 90) return 'Excellent';
  if (totalScore >= 75) return 'Très bon';
  if (totalScore >= 60) return 'Bon';
  if (totalScore >= 40) return 'Moyen';
  return 'Faible';
}

// Route racine - Doit être placée avant les autres routes
app.get('/', (req, res) => {
  res.json({
    message: "API Lego en marche!",
    endpoints: {
      dealabs: "/api/dealabs/deals",
      vinted: "/api/vinted/sales",
      docs: "/api-docs" // Si vous avez une documentation
    }
  });
});

// Route Dealabs avec le nouveau système de scoring
app.get('/api/dealabs/deals', async (req, res) => {
  console.log('🛒 Requête GET /api/dealabs/deals', { query: req.query });
  
  try {
    console.time('⏱️ Temps total Dealabs');
    
    // Connexion aux bases
    console.time('⏱️ Connexion DB Dealabs');
    const dealabsDb = await connectToMongo('dealabs');
    console.timeEnd('⏱️ Connexion DB Dealabs');
    
    console.time('⏱️ Connexion DB Vinted');
    const vintedDb = await connectToMongo('vinted');
    console.timeEnd('⏱️ Connexion DB Vinted');

    // Construction de la requête
    const { legoSetId } = req.query;
    const query = {};
    
    if (legoSetId) {
      query.title = { $regex: legoSetId, $options: 'i' };
      console.log(`🔍 Filtre Dealabs: LEGO Set ID = ${legoSetId}`);
    } else {
      console.log('🔍 Pas de filtre LEGO Set ID');
    }

    // Récupération des deals
    console.time('⏱️ Récupération deals Dealabs');
    const deals = await dealabsDb.collection('deals').find(query).toArray();
    console.timeEnd('⏱️ Récupération deals Dealabs');
    console.log(`📊 ${deals.length} deals trouvés`);

    // Traitement des deals
    const scoredDeals = [];
    console.log(`🔄 Début du traitement de ${deals.length} deals...`);
    
    for (const [index, deal] of deals.entries()) {
      if (!deal.id_lego && !legoSetId) {
        console.log(`⏭️ Deal ${index} ignoré (pas d'ID LEGO)`);
        continue;
      }
      
      const searchTerm = deal.id_lego || legoSetId;
      console.log(`🔎 Recherche Vinted pour: ${searchTerm} (Deal ${index + 1}/${deals.length})`);
      
      const vintedQuery = { title: { $regex: searchTerm, $options: 'i' } };
      
      console.time(`⏱️ Recherche Vinted ${index}`);
      const vintedData = await vintedDb.collection('deals')
        .find(vintedQuery)
        .toArray();
      console.timeEnd(`⏱️ Recherche Vinted ${index}`);
      console.log(`📊 ${vintedData.length} résultats Vinted trouvés`);

      // Préparation des données pour le scoring
      const vintedPrices = vintedData.map(item => item.price).filter(price => !isNaN(price));
      const fifthPercentilePrice = vintedPrices.length > 0 ? 
        calculateNthPercentile(5, vintedPrices) : 
        (deal.original_price || deal.price || 0);
      
      // Calcul du score complet
      const score = calculateDealScore(
        {
          ...deal,
          price: deal.price || 0,
          originalPrice: fifthPercentilePrice,
          condition: deal.condition || 'good'
        }, 
        vintedData.map(item => ({
          price: item.price,
          datePublished: item.upload_date,
          dateSold: item.scrape_date
        }))
      );

      // Calcul spécifique du profit score avec les données Vinted
      score.profitScore = calculateProfitScore(
        { price: deal.price || 0 }, 
        vintedData
      );
      
      // Recalcul du totalScore avec le nouveau profitScore
      score.totalScore = Object.values({
        ...score,
        profitScore: score.profitScore
      }).reduce((a,b) => a + b, 0);
      
      scoredDeals.push({
        ...deal,
        score: {
          ...score,
          rating: getRatingFromScore(score.totalScore),
          fifthPercentilePrice
        }
      });
      
      console.log(`⭐ Deal ${index} scoré: ${score.totalScore.toFixed(1)} (${getRatingFromScore(score.totalScore)})`);
    }

    // Tri et réponse
    const sortedDeals = scoredDeals.sort((a, b) => b.score.totalScore - a.score.totalScore);
    console.log(`🏁 ${sortedDeals.length} deals traités avec succès`);
    console.timeEnd('⏱️ Temps total Dealabs');
    
    res.json(sortedDeals);
    
  } catch (error) {
    console.error('💥 ERREUR:', error);
    res.status(500).json({ 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// ... (le reste de votre code API reste inchangé)

// Export pour Vercel
module.exports = app;

// Pour le développement local
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log('🔍 Pour déboguer:');
    console.log(`- Dealabs: http://localhost:${PORT}/api/dealabs/deals?legoSetId=10278`);
    console.log(`- Vinted: http://localhost:${PORT}/api/vinted/sales?legoSetId=10278`);
  });

  // Nettoyage à la fermeture
  process.on('SIGINT', async () => {
    if (client) {
      await client.close();
      console.log('📦 Connexion MongoDB fermée');
    }
    process.exit(0);
  });
}