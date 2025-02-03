// Invoking strict mode https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Strict_mode#invoking_strict_mode
'use strict';

/**
Description of the available api
GET https://lego-api-blue.vercel.app/deals

Search for specific deals

This endpoint accepts the following optional query string parameters:

- `page` - page of deals to return
- `size` - number of deals to return

GET https://lego-api-blue.vercel.app/sales

Search for current Vinted sales for a given lego set id

This endpoint accepts the following optional query string parameters:

- `id` - lego set id to return
*/

// current deals on the page
let currentDeals = [];
let currentPagination = {};

// instantiate the selectors
const selectShow = document.querySelector('#show-select');
const selectPage = document.querySelector('#page-select');
const selectLegoSetIds = document.querySelector('#lego-set-id-select');
const sectionDeals= document.querySelector('#deals');
const spanNbDeals = document.querySelector('#nbDeals');
const bestDiscountButton = document.querySelector('#bestDiscountButton');
const mostCommentedButton = document.querySelector('#mostCommentedButton');
const hotDealsButton = document.querySelector('#hotDealsButton');

/**
 * Set global value
 * @param {Array} result - deals to display
 * @param {Object} meta - pagination meta info
 */
const setCurrentDeals = ({result, meta}) => {
  currentDeals = result;
  currentPagination = meta;
};

/**
 * Fetch deals from api
 * @param  {Number}  [page=1] - current page to fetch
 * @param  {Number}  [size=12] - size of the page
 * @return {Object}
 */
const fetchDeals = async (page = 1, size = 6) => {
  try {
    const response = await fetch(
      `https://lego-api-blue.vercel.app/deals?page=${page}&size=${size}`
    );
    const body = await response.json();

    if (body.success !== true) {
      console.error(body);
      return {currentDeals, currentPagination};
    }

    return body.data;
  } catch (error) {
    console.error(error);
    return {currentDeals, currentPagination};
  }
};

/**
 * Render list of deals
 * @param  {Array} deals
 */
const renderDeals = deals => {
  const fragment = document.createDocumentFragment();
  const div = document.createElement('div');
  const template = deals
    .map(deal => {
      return `
      <div class="deal" id=${deal.uuid}>
        <span>${deal.id}</span>
        <a href="${deal.link}">${deal.title}</a>
        <span>${deal.price}</span>
      </div>
    `;
    })
    .join('');

  div.innerHTML = template;
  fragment.appendChild(div);
  sectionDeals.innerHTML = '<h2>Deals</h2>';
  sectionDeals.appendChild(fragment);
};

/**
 * Render page selector
 * @param  {Object} pagination
 */
const renderPagination = pagination => {
  const {currentPage, pageCount} = pagination;
  const options = Array.from(
    {'length': pageCount},
    (value, index) => `<option value="${index + 1}">${index + 1}</option>`
  ).join('');

  selectPage.innerHTML = options;
  selectPage.selectedIndex = currentPage - 1;
};

/**
 * Render lego set ids selector
 * @param  {Array} lego set ids
 */
const renderLegoSetIds = deals => {
  const ids = getIdsFromDeals(deals);
  const options = ids.map(id => 
    `<option value="${id}">${id}</option>`
  ).join('');

  selectLegoSetIds.innerHTML = options;
};

/**
 * Render page selector
 * @param  {Object} pagination
 */
const renderIndicators = pagination => {
  const {count} = pagination;

  spanNbDeals.innerHTML = count;
};

const render = (deals, pagination) => {
  renderDeals(deals);
  renderPagination(pagination);
  renderIndicators(pagination);
  renderLegoSetIds(deals)
};

/**
 * Declaration of all Listeners
 */

/**
 * Select the number of deals to display
 */
selectShow.addEventListener('change', async (event) => {
  // Fetch the deals for the selected page
  const deals = await fetchDeals(currentPagination.currentPage, parseInt(event.target.value));

  setCurrentDeals(deals);
  render(currentDeals, currentPagination);
});

document.addEventListener('DOMContentLoaded', async () => {
  const deals = await fetchDeals();

  setCurrentDeals(deals);
  render(currentDeals, currentPagination);
});

selectPage.addEventListener('change', async (event) => {
  console.log('select page');
  // Feature 1
  // Load the selected page
  const selectedPage = parseInt(event.target.value);

  // Fetch the deals for the selected page
  const deals = await fetchDeals(selectedPage, currentPagination.pageSize);

  setCurrentDeals(deals);
  render(currentDeals, currentPagination);
});

const discountSlider = document.querySelector('#discountSlider');
const discountValue = document.querySelector('#discountValue');
let discount = 50;

// Écouter les changements de valeur du slider
discountSlider.addEventListener('input', async (event) => {
  discount = parseInt(event.target.value); // Récupérer la valeur du slider
  discountValue.textContent = discount; // Mettre à jour la valeur affichée
});

bestDiscountButton.addEventListener('click', async (event) => {
  console.log('Best Discount');

  // Récupérer tous les deals avec la fonction modifiée
  const allDeals = await fetchAllDealsUsingFetchDeals();

  // Filtrer les deals avec une réduction >= 50 %
  const filteredDeals = filterByBestDiscount(allDeals, discount);

  // Afficher les résultats filtrés (toutes pages combinées)
  setCurrentDeals({ result: filteredDeals, meta: { count: filteredDeals.length } });
  render(filteredDeals, { count: filteredDeals.length, currentPage: 1, pageCount: 1 });
});

const commentSlider = document.querySelector('#commentSlider');
const commentValue = document.querySelector('#commentValue');
let comments = 5;

// Écouter les changements de valeur du slider
commentSlider.addEventListener('input', async (event) => {
  comments = parseInt(event.target.value); // Récupérer la valeur du slider
  commentValue.textContent = comments; // Mettre à jour la valeur affichée
});

mostCommentedButton.addEventListener('click', async (event) => {
  console.log('Most Commented');

  // Récupérer toutes les offres
  const allDeals = await fetchAllDealsUsingFetchDeals();

  // Filtrer les offres avec plus de 15 commentaires
  const filteredDeals = filterByMostCommented(allDeals);

  // Mettre à jour les données affichées
  setCurrentDeals({ result: filteredDeals, meta: { count: filteredDeals.length } });
  render(filteredDeals, { count: filteredDeals.length, currentPage: 1, pageCount: 1 });
});

hotDealsButton.addEventListener('click', async (event) => {
  console.log('Hot Deals');
});

// Feature 2 - Filter by best discount
function filterByBestDiscount(deals, discount) {
  // Problem with "deals" instead of "currentDeals", deals is not an array so we can't do ".filter".
  if (!Array.isArray(deals)) {
    console.error('Expected an array, but got:', deals);
    return [];
  }
  return deals.filter(deal => deal.discount >= discount);
}

const fetchAllDealsUsingFetchDeals = async () => {
  let allDeals = [];
  let page = 1;
  let size = 24; // Nombre maximal d'éléments par page
  let hasMorePages = true;

  while (hasMorePages) {
    const { result, meta } = await fetchDeals(page, size);

    // Ajouter les deals de la page actuelle à la liste complète
    allDeals = allDeals.concat(result);

    // Vérifier si on a atteint la dernière page
    hasMorePages = meta.currentPage < meta.pageCount;
    page++;
  }

  return allDeals;
};

/**
 * Filter deals by most commented
 * @param {Array} deals - List of deals to filter
 * @return {Array} - Deals with more than 15 comments
 */
function filterByMostCommented(deals) {
  if (!Array.isArray(deals)) {
    console.error('Expected an array, but got:', deals);
    return [];
  }

  return deals.filter(deal => deal.comments >= comments);
}