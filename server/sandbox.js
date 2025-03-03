const parseDomain = require('parse-domain');
const websites = require('require-all')(`${__dirname}/websites`);

async function sandbox(website = 'https://www.avenuedelabrique.com/nouveautes-lego') {
  try {
    console.log(`🕵️‍♀️  browsing ${website} website`);
    
    const url = new URL(website);
    const hostname = url.hostname;
    
    const domainParts = hostname.split('.');
    let domain = domainParts[0] === 'www' ? domainParts[1] : domainParts[0];
    
    if (!websites[domain]) {
      throw new Error(`No scraper found for domain: ${domain}`);
    }
    
    const deals = await websites[domain].scrape(website);
    console.log(deals);
    console.log('done');
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

const [,, eshop] = process.argv;
sandbox(eshop);