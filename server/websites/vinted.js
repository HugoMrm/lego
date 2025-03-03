const axios = require("axios");
const puppeteer = require("puppeteer");

/*async function scrapeVinted() {
  try {
    const response = await axios.get(VINTED_API_URL, { headers: HEADERS });
    const items = response.data.items;
    console.log("Nombre d'articles récupérés:", items.length);
    console.log(items); // Affiche tous les articles récupérés
  } catch (error) {
    console.error("Erreur lors de la requête :", error.message);
  }
}*/

async function getVintedAccessToken() {
  console.log("📡 Récupération des cookies via Puppeteer...");
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  // Aller sur la page d'accueil de Vinted
  await page.goto("https://www.vinted.fr/", { waitUntil: "networkidle2" });

  // Récupérer tous les cookies de la page
  const cookies = await page.cookies();

  await browser.close();

  // Chercher le cookie "access_token_web"
  const accessTokenCookie = cookies.find(cookie => cookie.name === "access_token_web");
  
  if (!accessTokenCookie) {
    throw new Error("❌ Impossible de récupérer le cookie access_token_web.");
  }

  console.log("✅ Cookie récupéré avec succès !");
  return accessTokenCookie.value; // Retourne le token sous forme de chaîne
}

const search_text = "42151"; // Value we want to search

async function scrapeVinted(searchText) {
  try {
    const accessToken = await getVintedAccessToken();

    const VINTED_API_URL = `https://www.vinted.fr/api/v2/catalog/items?page=1&per_page=96&search_text=${encodeURIComponent(searchText)}`;

    const HEADERS = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Cookie: `access_token_web=${accessToken}`, // Ajout du token récupéré dynamiquement
    };

    console.log(`🔍 Recherche des articles pour "${searchText}"...`);
    const response = await axios.get(VINTED_API_URL, { headers: HEADERS });
    const items = response.data.items;

    // Filtrer uniquement certains champs utiles
    const filteredItems = items.map(item => ({
      id: item.id,
      title: item.title,
      price: item.price_numeric, // Vérifie que c'est bien le bon champ pour le prix
      url: `https://www.vinted.fr/items/${item.id}`, // Ajoute un lien direct vers l'article
    }));

    console.log(`✅ ${filteredItems.length} articles récupérés pour "${searchText}" !`);
    console.log(filteredItems);
  } catch (error) {
    console.error("❌ Erreur :", error.message);
  }
}

// 🔥 Lancer la recherche sur Vinted
scrapeVinted(search_text);