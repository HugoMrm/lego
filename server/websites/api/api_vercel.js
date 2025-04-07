const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "..", ".env") });
const express = require('express');
const { MongoClient } = require('mongodb');
const cors = require('cors');
const helmet = require('helmet');

const app = express();
app.use(cors());
app.use(express.json());
app.use(helmet());

// Gestion optimisée des connexions pour Vercel
let cachedDb = null;

async function connectToDatabase() {
  if (cachedDb) return cachedDb;
  
  const client = await MongoClient.connect(process.env.MONGODB_URI, {
    maxPoolSize: 1,
    connectTimeoutMS: 30000,
    socketTimeoutMS: 20000
  });

  cachedDb = client;
  return client;
}

// Route Dealabs
app.get('/api/dealabs/deals', async (req, res) => {
  try {
    const client = await connectToDatabase();
    const db = client.db('dealabs');
    const vintedDb = client.db('vinted');
    
    // ... (le reste de votre logique existante reste inchangé)
    
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Route Vinted
app.get('/api/vinted/sales', async (req, res) => {
  try {
    const client = await connectToDatabase();
    const db = client.db('vinted');
    
    // ... (le reste de votre logique existante reste inchangé)
    
  } catch (error) {
    console.error('Vinted API Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Gestion des erreurs
app.use((req, res) => {
  res.status(404).json({ error: "Endpoint not found" });
});

// Export pour Vercel (ESSENTIEL)
module.exports = app;

// Pour le développement local seulement
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running locally on port ${PORT}`);
  });
}