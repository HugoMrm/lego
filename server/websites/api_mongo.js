const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { ObjectId } = require('mongodb');
const helmet = require('helmet'); // Import manquant ajouté ici
// Dans api_mongo.js
const { calculateDealScore } = require('./utils/dealScoring');

// Initialisation Express
const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(helmet()); // Maintenant helmet est défini

// Connexion MongoDB principale
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
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
    
    const deals = await db.collection('deals').find().toArray();
    const scoredDeals = [];
    
    for (const deal of deals) {
      if (!deal.id_lego) continue;
      
      const vintedData = await vintedDb.collection('deals')
        .find({ id_lego: deal.id_lego })
        .toArray();
      
      const score = calculateDealScore(deal, vintedData);
      score.totalScore = Object.values(score).reduce((a,b) => a + b, 0);
      
      scoredDeals.push({
        ...deal,
        score: {
          ...score,
          rating: getRatingFromScore(score.totalScore)
        }
      });
    }
    
    res.json(scoredDeals.sort((a,b) => b.score.totalScore - a.score.totalScore));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

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
    const db = mongoose.connection.client.db('vinted'); // Accès à la base 'vinted'
    
    const { limit = 96, legoSetId } = req.query;
    const query = {};
    
    if (legoSetId) {
      query.title = { $regex: legoSetId, $options: 'i' }; // 'i' pour insensible à la casse
    }    

    const sales = await db.collection('deals') // Collection 'deals' dans 'vinted'
      .find(query)
      .sort({ upload_date: -1 })
      .limit(parseInt(limit))
      .toArray();

    res.json({ 
      limit: parseInt(limit),
      total: sales.length,
      results: sales 
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