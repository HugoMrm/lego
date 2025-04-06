const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dealsRoutes = require('./routes'); // Importez vos routes

// Initialisation Express
const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Connexion MongoDB (optimisée pour multi-bases)
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ Connected to MongoDB'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// Routes
app.use('/', dealsRoutes); // Intègre toutes les routes

// Gestion des erreurs 404
app.use((req, res) => {
  res.status(404).json({ error: "Endpoint not found" });
});

// Démarrage du serveur
const PORT = process.env.PORT || 8092;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});