const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { ObjectId } = require('mongodb');
const helmet = require('helmet'); // Import manquant ajouté ici
// Dans api_mongo.js
// Modifiez l'import en haut du fichier
const { 
  calculateDealScore,
  calculateProfitScore // Ajoutez cet import
} = require('./utils/dealScoring');

// Initialisation Express
const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(helmet()); // Maintenant helmet est défini

// Connexion MongoDB principale
mongoose.connect(process.env.MONGODB_URI)
.then(() => console.log('✅ Connected to MongoDB'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// Nouveau système de synchronisation
const { startScheduler } = require('./services/schedulerService');
const syncRoutes = require('./routes/syncRoutes');
app.use('/api', syncRoutes);

// **************************************
// ROUTES CORRIGÉES
// **************************************

// Modifiez la route Dealabs
app.get('/api/dealabs/deals', async (req, res) => {
  try {
    const db = mongoose.connection.client.db('dealabs');
    const vintedDb = mongoose.connection.client.db('vinted');
    
    const { legoSetId } = req.query;
    const query = {};
    
    if (legoSetId) {
      query.title = { $regex: legoSetId, $options: 'i' };
    }
    
    const deals = await db.collection('deals').find(query).toArray();
    const scoredDeals = [];
    
    for (const deal of deals) {
      if (!deal.id_lego && !legoSetId) continue;
      
      // Recherche dans Vinted basée sur le titre similaire
      const vintedQuery = {};
      if (deal.id_lego) {
        vintedQuery.title = { $regex: deal.id_lego, $options: 'i' };
      } else if (legoSetId) {
        vintedQuery.title = { $regex: legoSetId, $options: 'i' };
      }
      
      const vintedData = await vintedDb.collection('deals')
        .find(vintedQuery)
        .toArray();
      
      // Préparation des données pour le scoring
      const vintedPrices = vintedData.map(item => item.price).filter(price => !isNaN(price));
      const fifthPercentilePrice = vintedPrices.length > 0 ? 
        calculateNthPercentile(5, vintedPrices) : 
        (deal.original_price || deal.price || 0);
      
      const score = calculateDealScore({
        ...deal,
        price: deal.price || 0,
        originalPrice: fifthPercentilePrice, // Utilisation du 5ème percentile comme référence
        condition: deal.condition || 'good'
      }, vintedData.map(item => ({
        price: item.price,
        datePublished: item.upload_date,
        dateSold: item.scrape_date
      })));
      
      // Calcul spécifique du profit score avec les données Vinted
      score.profitScore = calculateProfitScore(
        { price: deal.price || 0 }, 
        vintedData
      );
      
      // Recalcul du totalScore avec le nouveau profitScore
      score.totalScore = Object.values({
        ...score,
        profitScore: score.profitScore // On s'assure d'utiliser la nouvelle valeur
      }).reduce((a,b) => a + b, 0);
      
      scoredDeals.push({
        ...deal,
        score: {
          ...score,
          rating: getRatingFromScore(score.totalScore),
          fifthPercentilePrice // Ajout pour information
        }
      });
    }
    
    res.json(scoredDeals.sort((a,b) => b.score.totalScore - a.score.totalScore));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

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

// Route Vinted corrigée
app.get('/api/vinted/sales', async (req, res) => {
  try {
    const db = mongoose.connection.client.db('vinted');
    
    const { limit = 96, legoSetId, minPrice, maxPrice, sortBy = 'upload_date', sortOrder = -1 } = req.query;
    const query = {};
    
    if (legoSetId) {
      query.title = { $regex: legoSetId, $options: 'i' };
    }
    
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseFloat(minPrice);
      if (maxPrice) query.price.$lte = parseFloat(maxPrice);
    }
    
    const sortOptions = {};
    sortOptions[sortBy] = parseInt(sortOrder);

    const sales = await db.collection('deals')
      .find(query)
      .sort(sortOptions)
      .limit(parseInt(limit))
      .toArray();

    res.json({ 
      limit: parseInt(limit),
      total: sales.length,
      results: sales.map(sale => ({
        id: sale.id,
        title: sale.title,
        price: sale.price,
        price_with_fees: sale.price_with_fees,
        url: sale.url,
        photo_url: sale.photo_url,
        upload_date: sale.upload_date,
        favorite_count: sale.favorite_count,
        isPromoted: sale.isPromoted
      }))
    });
  } catch (error) {
    console.error('Vinted error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Gestion des erreurs
app.use((req, res) => {
  res.status(404).json({ error: "Endpoint not found" });
});

// Démarrer le serveur ET le scheduler
const PORT = process.env.PORT || 8092;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  startScheduler();
});