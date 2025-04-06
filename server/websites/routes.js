const express = require('express');
const router = express.Router();
const DealabsDeal = require('./models/api_dealabs_deals'); // Votre modèle Mongoose
const VintedDeal = require('./models/api_vinted_deals');

// Route pour Dealabs
router.get('/dealabs/deals', async (req, res) => {
  try {
    const deals = await DealabsDeal.find().limit(50); // Récupère 50 deals max
    res.json(deals);
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Route pour Vinted
router.get('/vinted/deals', async (req, res) => {
  try {
    const deals = await VintedDeal.find().limit(50);
    res.json(deals);
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Exportez le router
module.exports = router;