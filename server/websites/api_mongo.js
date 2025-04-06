const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

// Initialisation Express
const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Connexion MongoDB principale
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ Connected to MongoDB'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// Routes existantes (à conserver)
const dealsRoutes = require('./routes/syncRoutes');
app.use('/', dealsRoutes);

// Nouveau système de synchronisation
const { startScheduler } = require('./services/schedulerService');
const syncRoutes = require('./routes/syncRoutes');
app.use('/api', syncRoutes); // Nouveaux endpoints sous /api

// Gestion des erreurs
app.use((req, res) => {
  res.status(404).json({ error: "Endpoint not found" });
});

// Démarrer le serveur ET le scheduler
const PORT = process.env.PORT || 8092;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  startScheduler(); // Lance le scheduler horaire
});