const puppeteer = require('puppeteer');
const fs = require('fs');
const { MongoClient } = require('mongodb');
const path = require('path');

const MONGODB_URI = "mongodb+srv://hugomermet53:%24S%40snXdDp6Don9fJ@cluster0.lbbkr.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const MONGODB_DB_NAME = "dealabs";

// Connexion à MongoDB
async function connectToMongoDB() {
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log("✅ Connecté à MongoDB Atlas !");
    return client.db(MONGODB_DB_NAME);
}

async function scrapeDealabs(searchText = 'lego') {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    const url = `https://www.dealabs.com/search?q=${encodeURIComponent(searchText)}&?hide_expired=true`;
    console.log(`🔍 Chargement de ${url}...`);

    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    await page.goto(url, { waitUntil: 'networkidle2' });

    const deals = await page.evaluate(() => {
        const dealElements = document.querySelectorAll('article.thread');
        const extractedDeals = [];

        dealElements.forEach(deal => {
            const id = deal.getAttribute('id') ? deal.getAttribute('id').replace('thread_', '') : null;
            const title = deal.querySelector('.cept-tt') ? deal.querySelector('.cept-tt').innerText.trim() : "No title";

            // Extraction du modèle LEGO (5 chiffres)
            const idLegoMatch = title.match(/\b\d{5}\b/);
            const id_lego = idLegoMatch ? idLegoMatch[0] : null;

            const priceElement = deal.querySelector('.thread-price');
            const price = priceElement ? parseFloat(priceElement.innerText.replace(/[^0-9.,]/g, '').replace(',', '.')) : 0;

            const priceBeforeElement = deal.querySelector('.text--lineThrough');
            const priceBefore = priceBeforeElement ? parseFloat(priceBeforeElement.innerText.replace(/[^0-9.,]/g, '').replace(',', '.')) : null;

            const discountElement = deal.querySelector('.textBadge--green');
            const discount = discountElement ? discountElement.innerText.replace('%', '').trim() : null;

            const linkElement = deal.querySelector('a.cept-tt');
            const link = linkElement ? linkElement.href : null;

            const imageElement = deal.querySelector('img');
            let imageUrl = imageElement ? imageElement.src || imageElement.dataset.src : "No image";

            // Amélioration de la qualité de l'image (202x202 → 1024x1024)
            if (imageUrl.includes("202x202")) {
                imageUrl = imageUrl.replace("202x202", "1024x1024");
            }

            const hotnessElement = deal.querySelector('.cept-vote-temp');
            const hotness = hotnessElement ? parseInt(hotnessElement.innerText.replace(/[^0-9+-]/g, '')) : 0;

            const descriptionElement = deal.querySelector('.size--all-s');
            const description = descriptionElement ? descriptionElement.innerText.trim() : "";

            extractedDeals.push({
                id, id_lego, title, price, price_before_discount: priceBefore, discount, url: link,
                photo_url: imageUrl, hotness, description, scrape_date: new Date().toISOString()
            });
        });

        return extractedDeals;
    });

    await browser.close();

    // Connexion à MongoDB
    const db = await connectToMongoDB();
    const collection = db.collection('deals');

    if (deals.length > 0) {
        try {
            const result = await collection.insertMany(deals, { ordered: false });
            console.log(`💾 ${result.insertedCount} deals enregistrés dans MongoDB !`);
        } catch (error) {
            console.error("❌ Erreur lors de l'insertion MongoDB:", error.message);
        }
    } else {
        console.log('⚠️ Aucun deal trouvé');
    }

    return deals;
}

// Lancer le scraping
scrapeDealabs('lego')
    .then(deals => console.log(`🎉 Scraping terminé ! ${deals.length} deals trouvés`))
    .catch(err => console.error('❌ Erreur globale:', err));

module.exports = {
    scrapeDealabs
};