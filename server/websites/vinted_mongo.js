// vinted_mongo.js
const axios = require("axios");
const puppeteer = require("puppeteer");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });

function parseViewCount(viewCount) {
    if (!viewCount) return 0;
    const cleaned = viewCount.replace(/[^0-9.,kKmM]/g, '').replace(',', '.');
    return cleaned.toLowerCase().includes('k') ? parseFloat(cleaned) * 1000 :
           cleaned.toLowerCase().includes('m') ? parseFloat(cleaned) * 1000000 :
           parseFloat(cleaned) || 0;
}

async function scrapeItemDetails(browser, url) {
    const page = await browser.newPage();
    try {
        await page.goto(url, { waitUntil: "networkidle2", timeout: 15000 });
        const viewCountElement = await page.$('[itemprop="view_count"]');
        const viewCount = viewCountElement ? await page.evaluate(el => el.innerText.trim(), viewCountElement) : "0";
        const uploadDateElement = await page.$('[itemprop="upload_date"]');
        const uploadDate = uploadDateElement ? await page.evaluate(el => el.innerText.trim(), uploadDateElement) : "N/A";
        return {
            viewCount: parseViewCount(viewCount),
            uploadDate
        };
    } catch (error) {
        return { viewCount: 0, uploadDate: "Erreur" };
    } finally {
        await page.close();
    }
}

async function getVintedAccessToken() {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto("https://www.vinted.fr/", { waitUntil: "networkidle2" });
    const cookies = await page.cookies();
    await browser.close();

    const accessTokenCookie = cookies.find(cookie => cookie.name === "access_token_web");
    if (!accessTokenCookie) throw new Error("Cookie access_token_web non trouvé.");
    return accessTokenCookie.value;
}

async function scrapeVinted(searchText) {
    const accessToken = await getVintedAccessToken();
    const VINTED_API_URL = `https://www.vinted.fr/api/v2/catalog/items?page=1&per_page=96&search_text=${encodeURIComponent(searchText)}`;

    const HEADERS = {
        "User-Agent": "Mozilla/5.0 ...",
        Cookie: `access_token_web=${accessToken}`,
    };

    const response = await axios.get(VINTED_API_URL, { headers: HEADERS });
    const items = response.data.items || [];

    const browser = await puppeteer.launch({ headless: true });
    const deals = [];

    const tasks = items.map(item =>
        scrapeItemDetails(browser, item.url).then(details => ({
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
        }))
    );

    const results = await Promise.allSettled(tasks);
    results.forEach(result => {
        if (result.status === "fulfilled") {
            deals.push(result.value);
        }
    });

    await browser.close();
    return deals; // ❗ Idem, on retourne les données sans les insérer ici
}

module.exports = {
    scrapeVinted
};