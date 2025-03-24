const axios = require('axios');
const puppeteer = require('puppeteer');
const fs = require('fs');
const { MongoClient } = require('mongodb');
require('dotenv').config();
const solver = require('2captcha').Solver;

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB_NAME = 'lego';
const COLLECTION_NAME = 'deals';

async function getVintedAccessToken() {
  console.log('📡 Récupération des cookies via Puppeteer...');
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  await page.goto('https://www.vinted.fr/', { waitUntil: 'domcontentloaded' });

  // Vérifie si le CAPTCHA est visible
  const captchaFrame = await page.$('iframe[src*="captcha"]');
  if (captchaFrame) {
    console.log('⚠️ CAPTCHA détecté. Résolution en cours...');

    // Récupère l'image CAPTCHA
    const captchaImageSrc = await captchaFrame.evaluate(frame => frame.src);
    const captchaImageBuffer = await page.goto(captchaImageSrc).then(res => res.buffer());

    // Utilise le service 2Captcha pour résoudre le CAPTCHA
    const solverInstance = new solver(process.env.CAPTCHA_API_KEY);
    const result = await solverInstance.solveImageCaptcha(captchaImageBuffer);

    if (result.error) {
      console.log('❌ Impossible de résoudre le CAPTCHA');
      await browser.close();
      return;
    }

    console.log('✅ CAPTCHA résolu !');
    await page.type('input[name="captcha_answer"]', result.text);
    await page.click('button[type="submit"]'); // Soumettre la réponse
    await page.waitForNavigation({ waitUntil: 'domcontentloaded' });
  }

  const cookies = await page.cookies();
  await browser.close();

  const accessTokenCookie = cookies.find(cookie => cookie.name === 'access_token_web');
  if (!accessTokenCookie) {
    throw new Error('❌ Impossible de récupérer le cookie access_token_web.');
  }

  console.log('✅ Cookie récupéré avec succès !');
  return accessTokenCookie.value;
}

async function scrapeVinted(searchText) {
  try {
    const accessToken = await getVintedAccessToken();
    const VINTED_API_URL = `https://www.vinted.fr/api/v2/catalog/items?page=1&per_page=96&search_text=${encodeURIComponent(searchText)}`;

    const HEADERS = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
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
      date_scraped: new Date(),
    }));

    console.log(`✅ ${filteredItems.length} articles récupérés pour "${searchText}" !`);
    console.log(filteredItems);

    // Enregistrement dans MongoDB
    await saveToDatabase(filteredItems);

    // Enregistrement des résultats dans un fichier JSON
    fs.writeFileSync('deals.json', JSON.stringify(filteredItems, null, 2));
    console.log('💾 Données enregistrées dans deals.json');
  } catch (error) {
    console.error('❌ Erreur :', error.message);
  }
}

async function saveToDatabase(deals) {
  const client = new MongoClient(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });

  try {
    await client.connect();
    const db = client.db(MONGODB_DB_NAME);
    const collection = db.collection(COLLECTION_NAME);

    console.log('💾 Enregistrement dans MongoDB...');
    const result = await collection.insertMany(deals);
    console.log(`✅ ${result.insertedCount} offres insérées !`);
  } catch (error) {
    console.error('❌ Erreur MongoDB :', error.message);
  } finally {
    await client.close();
  }
}

// 🔥 Lancer la recherche sur Vinted
scrapeVinted('42151');