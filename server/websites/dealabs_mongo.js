// dealabs_mongo.js
const puppeteer = require('puppeteer');
const { MongoClient } = require('mongodb');
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME_DEALABS;

async function connectToMongoDB() {
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    return client.db(MONGODB_DB_NAME);
}

async function scrapeDealabs(searchText = 'lego') {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    const url = `https://www.dealabs.com/search?q=${encodeURIComponent(searchText)}&?hide_expired=true`;
    await page.setUserAgent('Mozilla/5.0 ...');
    await page.goto(url, { waitUntil: 'networkidle2' });

    const deals = await page.evaluate(() => {
        const dealElements = document.querySelectorAll('article.thread');
        const extractedDeals = [];

        dealElements.forEach(deal => {
            const id = deal.getAttribute('id')?.replace('thread_', '') ?? null;
            const title = deal.querySelector('.cept-tt')?.innerText.trim() ?? "No title";
            const id_lego = title.match(/\b\d{5}\b/)?.[0] ?? null;
            const price = parseFloat(deal.querySelector('.thread-price')?.innerText.replace(/[^0-9.,]/g, '').replace(',', '.') ?? 0);
            const priceBefore = parseFloat(deal.querySelector('.text--lineThrough')?.innerText.replace(/[^0-9.,]/g, '').replace(',', '.') ?? null);
            const discount = deal.querySelector('.textBadge--green')?.innerText.replace('%', '').trim() ?? null;
            const link = deal.querySelector('a.cept-tt')?.href ?? null;
            let imageUrl = deal.querySelector('img')?.src || "No image";

            if (imageUrl.includes("202x202")) {
                imageUrl = imageUrl.replace("202x202", "1024x1024");
            }

            const hotness = parseInt(deal.querySelector('.cept-vote-temp')?.innerText.replace(/[^0-9+-]/g, '') ?? 0);
            const description = deal.querySelector('.size--all-s')?.innerText.trim() ?? "";

            extractedDeals.push({
                id, id_lego, title, price, price_before_discount: priceBefore,
                discount, url: link, photo_url: imageUrl, hotness, description,
                scrape_date: new Date().toISOString()
            });
        });

        return extractedDeals;
    });

    await browser.close();
    return deals; // ❗ On retourne les données sans les enregistrer ici
}

module.exports = {
    scrapeDealabs
};