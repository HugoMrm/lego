// dealabs_mongo.js
const puppeteer = require('puppeteer');
const { MongoClient } = require('mongodb');
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME_DEALABS;

// Fonction pour parser les dates relatives
const parseRelativeTime = (timeText) => {
  if (!timeText) return null;

  const daysMatch = timeText.match(/(\d+)\s*j/);
  const hoursMatch = timeText.match(/(\d+)\s*h/);
  const minutesMatch = timeText.match(/(\d+)\s*min/);

  const days = daysMatch ? parseInt(daysMatch[1]) : 0;
  const hours = hoursMatch ? parseInt(hoursMatch[1]) : 0;
  const minutes = minutesMatch ? parseInt(minutesMatch[1]) : 0;

  if (days === 0 && hours === 0 && minutes === 0) return null;

  const now = new Date();
  const approxDate = new Date(now);
  approxDate.setDate(approxDate.getDate() - days);
  approxDate.setHours(approxDate.getHours() - hours);
  approxDate.setMinutes(approxDate.getMinutes() - minutes);

  return approxDate.toISOString();
};

async function connectToMongoDB() {
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    return client.db(MONGODB_DB_NAME);
}

async function scrapeDealabs(searchText = 'lego') {
    const browser = await puppeteer.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    const url = `https://www.dealabs.com/search?q=${encodeURIComponent(searchText)}&?hide_expired=true`;
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

    const deals = await page.evaluate((parseRelativeTimeFn) => {
        // Réimplémentation de la fonction dans le contexte de la page
        const parseRelativeTime = new Function('return ' + parseRelativeTimeFn)();
        
        const dealElements = document.querySelectorAll('article.thread');
        const extractedDeals = [];
        const now = new Date();

        dealElements.forEach(deal => {
            try {
                const id = deal.getAttribute('id')?.replace('thread_', '') ?? null;
                const title = deal.querySelector('.cept-tt')?.textContent.trim() ?? "No title";
                const id_lego = title.match(/\b\d{5}\b/)?.[0] ?? null;
                const price = parseFloat(deal.querySelector('.thread-price')?.textContent.replace(/[^0-9.,]/g, '').replace(',', '.') ?? 0);
                const priceBefore = parseFloat(deal.querySelector('.text--lineThrough')?.textContent.replace(/[^0-9.,]/g, '').replace(',', '.')) ?? null;
                const discount = deal.querySelector('.textBadge--green')?.textContent.replace('%', '').trim() ?? null;
                const link = deal.querySelector('a.cept-tt')?.href ?? null;
                
                // Compteur de commentaires - Correction basée sur votre capture
                const commentsElement = deal.querySelector('a[title="Commentaires"] span') || 
                deal.querySelector('.icon--comments').nextSibling;
                const comments_count = commentsElement ? parseInt(commentsElement.textContent.trim()) : 0;
                
                // Image
                let imageUrl = deal.querySelector('img')?.src || "No image";
                if (imageUrl.includes("202x202")) {
                    imageUrl = imageUrl.replace("202x202", "1024x1024");
                }

                // Popularité
                const hotness = parseInt(deal.querySelector('.cept-vote-temp')?.textContent.replace(/[^0-9+-]/g, '')) ?? 0;
                
                // Date de publication
                const dateText = deal.querySelector('.size--all-s, .text--color-greyShade')?.textContent.trim() ?? "";
                let date_upload = null;
                
                if (dateText.includes("Aujourd'hui")) {
                    date_upload = now.toISOString();
                } else if (dateText.includes("Hier")) {
                    const yesterday = new Date(now);
                    yesterday.setDate(yesterday.getDate() - 1);
                    date_upload = yesterday.toISOString();
                } else {
                    date_upload = parseRelativeTime(dateText) || dateText;
                }

                extractedDeals.push({
                    id, 
                    id_lego, 
                    title, 
                    price, 
                    price_before_discount: priceBefore,
                    discount, 
                    url: link, 
                    comments_count,
                    photo_url: imageUrl, 
                    hotness, 
                    date_upload,
                    scrape_date: now.toISOString()
                });
            } catch (error) {
                console.error('Error processing deal:', error);
            }
        });

        return extractedDeals;
    }, parseRelativeTime.toString());

    await browser.close();
    return deals;
}

module.exports = {
    scrapeDealabs
};