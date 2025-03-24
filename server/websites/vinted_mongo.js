const axios = require("axios");
const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require('path');

const { MongoClient } = require("mongodb");

const MONGODB_URI = "mongodb+srv://hugomermet53:%24S%40snXdDp6Don9fJ@cluster0.lbbkr.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const MONGODB_DB_NAME = "vinted";

async function connectToMongoDB() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  console.log("✅ Connecté à MongoDB Atlas !");
  return client.db(MONGODB_DB_NAME); // Corrige également le nom de la DB
}

async function listDatabases() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const databases = await client.db().admin().listDatabases();
  console.log("📂 Bases de données existantes :", databases.databases); // Affiche les différentes bases de données existantes
  await client.close();
}

listDatabases();

async function checkCollections() {
  const db = await connectToMongoDB();
  const collections = await db.listCollections().toArray();
  console.log("📂 Collections existantes dans 'lego' :", collections.map(c => c.name)); // Si l'onglet deals est présent le base de données contient bien des informations
}

checkCollections();

async function getVintedAccessToken() {
  console.log("📡 Récupération des cookies via Puppeteer...");
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto("https://www.vinted.fr/", { waitUntil: "networkidle2" });
  const cookies = await page.cookies();
  await browser.close();

  const accessTokenCookie = cookies.find(cookie => cookie.name === "access_token_web");
  if (!accessTokenCookie) {
    throw new Error("❌ Impossible de récupérer le cookie access_token_web.");
  }

  console.log("✅ Cookie récupéré avec succès !");
  return accessTokenCookie.value;
}

// Fonction pour scraper les détails d'un article
async function scrapeItemDetails(url) {
    console.log(`🔍 Scraping détails pour: ${url}`);
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    try {
        await page.goto(url, { waitUntil: "networkidle2" });

        // Extraction du nombre de vues
        const viewCountElement = await page.$('[itemprop="view_count"]');
        const viewCount = viewCountElement
            ? await page.evaluate(el => el.innerText.trim(), viewCountElement)
            : "N/A";

        // Extraction de la date d'ajout
        const uploadDateElement = await page.$('[itemprop="upload_date"]');
        const uploadDate = uploadDateElement
            ? await page.evaluate(el => el.innerText.trim(), uploadDateElement)
            : "N/A";

        console.log(`✅ Scrapé: Vues: ${viewCount} | Ajouté: ${uploadDate}`);
        
        return { viewCount, uploadDate };
    } catch (error) {
        console.error(`❌ Erreur lors du scraping de ${url}:`, error.message);
        return { viewCount: "Erreur", uploadDate: "Erreur" };
    } finally {
        await browser.close();
    }
}

const search_text = "42151";

async function scrapeVinted(searchText) {
    try {
      const accessToken = await getVintedAccessToken();
      const VINTED_API_URL = `https://www.vinted.fr/api/v2/catalog/items?page=1&per_page=96&search_text=${encodeURIComponent(searchText)}`;
  
      const HEADERS = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Cookie: `access_token_web=${accessToken}`,
      };
  
      console.log(`🔍 Recherche des articles pour "${searchText}"...`);
      const response = await axios.get(VINTED_API_URL, { headers: HEADERS });
      const items = response.data.items;
  
      const deals = [];
  
      for (const item of items) {
        // Vérification de l'existence des propriétés requises
        if (!item || !item.url || !item.photo || !item.user) {
            console.warn("⚠️ Item invalide détecté, il sera ignoré :", item);
            continue;
        }

        const { viewCount, uploadDate } = await scrapeItemDetails(item.url);

        deals.push({
            id: item.id,
            title: item.title || "Titre inconnu",
            price: item.price?.amount || 0,
            price_with_fees: item.total_item_price?.amount || 0,
            url: `https://www.vinted.fr/items/${item.id}`,
            photo_url: item.photo?.url || "Aucune image",
            user_id: item.user?.id || "Inconnu",
            user_login: item.user?.login || "Inconnu",
            user_pp: item.user?.photo?.url || "Aucune image",
            user_url: item.user?.profile_url || "URL inconnue",
            upload_date: uploadDate,
            scrape_date: new Date(),
            favorite_count: item.favourite_count || 0,
            vue_count: viewCount,
            isPromoted: item.promoted || false
        });
  
        console.log(`✅ Scrapé: ${item.title} | Vues: ${viewCount} | Ajouté: ${uploadDate}`);
      }

    console.log(`✅ ${deals.length} articles récupérés pour "${searchText}" !`);

    // Connexion à MongoDB et insertion
    const db = await connectToMongoDB();
    const collection = db.collection("deals");

    const result = await collection.insertMany(deals);
    console.log(`💾 ${result.insertedCount} deals insérés dans la base de données !`);
  } catch (error) {
    console.error("❌ Erreur :", error.message);
  }
}

// 🔥 Lancer la recherche sur Vinted
scrapeVinted(search_text);