const axios = require("axios");
const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require('path');

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

    const filteredItems = items.map(item => ({
      id: item.id,
      title: item.title,
      price: item.price_numeric,
      url: `https://www.vinted.fr/items/${item.id}`,
      date: item.photo?.high_resolution?.timestamp ? new Date(item.photo.high_resolution.timestamp * 1000).toISOString(): null
    }));

    console.log(`✅ ${filteredItems.length} articles récupérés pour "${searchText}" !`);
    console.log(filteredItems);

    // Enregistrement des résultats dans un fichier JSON
    const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
    const filename = `vinted_deals_${timestamp}.json`;
    const dataDir = path.join(__dirname, '..', 'data'); // Ensure consistent directory structure
    const filePath = path.join(dataDir, filename);
    fs.writeFileSync(filePath, JSON.stringify(filteredItems, null, 2));
    console.log(`💾 Données enregistrées dans ${filePath}`);
  } catch (error) {
    console.error("❌ Erreur :", error.message);
  }
}

// 🔥 Lancer la recherche sur Vinted
scrapeVinted(search_text);