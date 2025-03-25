const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

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

            // Extraction des 5 chiffres du modèle LEGO
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

            // Amélioration de la qualité de l'image en remplaçant "202x202" par "1024x1024"
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

    // Sauvegarde dans un fichier
    if (deals.length > 0) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `dealabs_${searchText}_${timestamp}.json`;
        const outputDir = path.join(__dirname, 'data');

        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const filePath = path.join(outputDir, filename);
        fs.writeFileSync(filePath, JSON.stringify(deals, null, 2));

        console.log(`💾 Données sauvegardées dans ${filePath}`);
        console.log(`📂 ${deals.length} deals enregistrés`);
    } else {
        console.log('⚠️ Aucun deal trouvé');
    }

    return deals;
}

// Exemple d'utilisation
scrapeDealabs('lego')
    .then(deals => console.log(`🎉 Scraping terminé ! ${deals.length} deals trouvés`))
    .catch(err => console.error('❌ Erreur globale:', err));

module.exports = {
    scrapeDealabs
};