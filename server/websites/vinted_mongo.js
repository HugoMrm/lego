const axios = require("axios");
const puppeteer = require("puppeteer");
const { MongoClient } = require("mongodb");

const MONGODB_URI = "mongodb+srv://hugomermet53:%24S%40snXdDp6Don9fJ@cluster0.lbbkr.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const MONGODB_DB_NAME = "vinted";
const MAX_CONCURRENT_SCRAPES = 5;

async function connectToMongoDB() {
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log("✅ Connecté à MongoDB Atlas !");
    return client.db(MONGODB_DB_NAME);
}

// Convertir les vues en nombres
function parseViewCount(viewCount) {
    if (!viewCount) return 0;
    const cleaned = viewCount.replace(/[^0-9.,kKmM]/g, '').replace(',', '.');
    return cleaned.toLowerCase().includes('k') ? parseFloat(cleaned) * 1000 :
           cleaned.toLowerCase().includes('m') ? parseFloat(cleaned) * 1000000 :
           parseFloat(cleaned) || 0;
}

// Scraper les détails d'un item
async function scrapeItemDetails(browser, url) {
    console.log(`🔍 Scraping détails pour: ${url}`);
    const page = await browser.newPage();
    try {
        await page.goto(url, { waitUntil: "networkidle2", timeout: 15000 });

        const viewCountElement = await page.$('[itemprop="view_count"]');
        let viewCount = viewCountElement ? await page.evaluate(el => el.innerText.trim(), viewCountElement) : "0";
        viewCount = parseViewCount(viewCount);

        const uploadDateElement = await page.$('[itemprop="upload_date"]');
        const uploadDate = uploadDateElement ? await page.evaluate(el => el.innerText.trim(), uploadDateElement) : "N/A";

        console.log(`✅ Scrapé: Vues: ${viewCount} | Ajouté: ${uploadDate}`);
        return { viewCount, uploadDate };
    } catch (error) {
        console.error(`❌ Erreur scraping ${url}:`, error.message);
        return { viewCount: 0, uploadDate: "Erreur" };
    } finally {
        await page.close();
    }
}

async function getVintedAccessToken() {
    console.log("📡 Récupération des cookies via Puppeteer...");
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto("https://www.vinted.fr/", { waitUntil: "networkidle2" });

    const cookies = await page.cookies();
    await browser.close();

    const accessTokenCookie = cookies.find(cookie => cookie.name === "access_token_web");
    if (!accessTokenCookie) throw new Error("❌ Impossible de récupérer le cookie access_token_web.");
    
    console.log("✅ Cookie récupéré avec succès !");
    return accessTokenCookie.value;
}

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
        if (!items || items.length === 0) {
            console.log("⚠️ Aucun article trouvé !");
            return;
        }

        // ✅ Lancer un SEUL navigateur Puppeteer
        const browser = await puppeteer.launch({ headless: true });

        // Tableaux pour gérer les batchs
        let tasks = [];
        let deals = [];

        for (const item of items) {
            if (!item || !item.url || !item.photo || !item.user) {
                console.warn("⚠️ Item invalide détecté, il sera ignoré :", item);
                continue;
            }

            // Ajouter la tâche dans le tableau
            tasks.push(
                scrapeItemDetails(browser, item.url).then(details => {
                    return {
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
                        upload_date: details.uploadDate,
                        scrape_date: new Date(),
                        favorite_count: parseInt(item.favourite_count) || 0,
                        view_count: parseInt(details.viewCount) || 0,
                        isPromoted: item.promoted || false
                    };
                })
            );

            // Si on atteint la limite de batch, on exécute et on vide la liste
            if (tasks.length >= MAX_CONCURRENT_SCRAPES) {
                const batchResults = await Promise.all(tasks);
                deals.push(...batchResults);
                tasks = [];
            }
        }

        // Exécuter les tâches restantes
        if (tasks.length > 0) {
            const batchResults = await Promise.all(tasks);
            deals.push(...batchResults);
        }

        // ✅ Fermer Puppeteer après le scraping
        await browser.close();
        console.log(`✅ ${deals.length} articles récupérés pour "${searchText}" !`);

        // ✅ Enregistrement dans MongoDB
        const db = await connectToMongoDB();
        const collection = db.collection("deals");
        const result = await collection.insertMany(deals);
        console.log(`💾 ${result.insertedCount} deals insérés dans la base de données !`);
    } catch (error) {
        console.error("❌ Erreur :", error.message);
    }
}

// 🔥 Lancer la recherche sur Vinted
scrapeVinted("42151");