const fetch = require('node-fetch');
const cheerio = require('cheerio');

/**
 * Parse webpage data response
 * @param  {String} data - html response
 * @return {Object} deal
 */
const parse = data => {
  const $ = cheerio.load(data, {'xmlMode': true});

  return $('div.prods a')
    .map((i, element) => {
      const price = parseFloat(
        $(element)
          .find('span.thread-price')
          .text()
      );

      const discount = $(element).find('div.textBadge--green').text().trim(); // Extraction de la réduction

      const link = $(element).find('a.thread-title').attr('href');

      const title = $(element).find('strong.thread-title a.cept-tt').text();

      return {
        discount,
        price,
        title,
        link: `https://www.dealabs.com${link}`, // URL complète
      };
    })
    .get();
};

/**
 * Scrape a given url page
 * @param {String} url - url to parse
 * @returns 
 */
module.exports.scrape = async url => {
  const response = await fetch(url);

  if (response.ok) {
    const body = await response.text();

    return parse(body);
  }

  console.error(response);

  return null;
};