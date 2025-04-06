// routes/syncRoutes.js
const express = require('express');
const router = express.Router();
const { fullSync } = require('../controllers/syncController');

// Gardez uniquement la route de synchronisation
router.post('/sync/lego-deals', async (req, res) => {
  try {
    await fullSync();
    res.json({ success: true, message: "Synchronisation terminée" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;