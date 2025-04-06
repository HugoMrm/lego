// vinted_mongo.js
const axios = require("axios");
const puppeteer = require("puppeteer");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });

// Cache pour le token
let vintedTokenCache = null;
let lastTokenFetchTime = 0;
const TOKEN_EXPIRY_TIME = 3600000; // 1 heure en ms

async function getVintedAccessToken() {
    // Si le token est encore valide, on le retourne
    if (vintedTokenCache && Date.now() - lastTokenFetchTime < TOKEN_EXPIRY_TIME) {
        console.log("♻️ Utilisation du token Vinted en cache");
        return vintedTokenCache;
    }

    console.log("📡 Récupération d'un nouveau token Vinted via Puppeteer...");
    const browser = await puppeteer.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    
    try {
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
        await page.goto("https://www.vinted.fr/", { 
            waitUntil: "domcontentloaded",
            timeout: 60000 
        });

        const cookies = await page.cookies(page.url());
        const accessTokenCookie = cookies.find(cookie => cookie.name === "access_token_web");
        
        if (!accessTokenCookie) {
            throw new Error("❌ Impossible de récupérer le cookie access_token_web.");
        }

        console.log("✅ Nouveau token Vinted récupéré avec succès !");
        vintedTokenCache = accessTokenCookie.value;
        lastTokenFetchTime = Date.now();
        return accessTokenCookie.value;
    } finally {
        await browser.close();
    }
}

async function scrapeVinted(searchText) {
    try {
        const accessToken = await getVintedAccessToken();
        const VINTED_API_URL = `https://www.vinted.fr/api/v2/catalog/items?page=1&per_page=96&search_text=${encodeURIComponent(searchText)}`;

        const HEADERS = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
            Cookie: `access_token_web=${accessToken}`,
        };

        const response = await axios.get(VINTED_API_URL, { 
            headers: HEADERS,
            timeout: 30000
        });
        
        const items = response.data.items || [];
        console.log(`🔍 ${items.length} items trouvés sur Vinted pour "${searchText}"`);

        return items.map(item => ({
            id: item.id,
            title: item.title || "Titre inconnu",
            price: parseFloat(item.price?.amount) || 0,
            price_with_fees: parseFloat(item.total_item_price?.amount) || 0,
            url: `https://www.vinted.fr/items/${item.id}`,
            photo_url: item.photo?.url || "Aucune image",
            user_id: item.user?.id || "Inconnu",
            user_login: item.user?.login || "Inconnu",
            user_pp: item.user?.photo?.url || "Aucune image",
            user_url: item.user?.profile_url || "URL inconnue",
            upload_date: item.photo?.high_resolution?.timestamp ? 
                new Date(item.photo.high_resolution.timestamp * 1000).toISOString() : null,
            scrape_date: new Date().toISOString(),
            favorite_count: parseInt(item.favourite_count) || 0,
            isPromoted: item.promoted || false
        }));
    } catch (error) {
        console.error("❌ Erreur lors du scraping Vinted:", error.message);
        throw error;
    }
}

module.exports = {
    scrapeVinted
};