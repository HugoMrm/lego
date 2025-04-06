async function fetchDeals() {
    const response = await fetch('http://localhost:8092/api/dealabs/deals');
    return await response.json();
  }
  
  function displayDeals(deals) {
    const dealsSection = document.getElementById('deals');
    dealsSection.innerHTML = '';
  
    deals.forEach(deal => {
      const card = document.createElement('div');
      card.classList.add('deal-card');
  
      card.innerHTML = `
        <img src="${deal.photo_url}" alt="Image du set LEGO" />
        <div class="deal-info">
          <h3>${deal.title}</h3>
          <p>Set ID: ${deal.id_lego || 'N/A'}</p>
          <p>Prix: ${deal.price}€ <span class="discount">(${deal.discount}%)</span></p>
          <p>Score: <strong>${deal.score?.totalScore?.toFixed(1) || 'N/A'}</strong>/100</p>
          <button class="view-detail" data-id="${deal._id}">Détails</button>
        </div>
      `;
      dealsSection.appendChild(card);
    });
  
    document.querySelectorAll('.view-detail').forEach(btn => {
      btn.addEventListener('click', e => {
        const id = e.target.dataset.id;
        showDealDetails(id);
      });
    });
  }
  
  function showDealDetails(id) {
    fetchDeals().then(deals => {
      const deal = deals.find(d => d._id === id);
      if (!deal) return;
  
      const section = document.getElementById('deal-detail');
      const content = document.getElementById('deal-detail-content');
  
      content.innerHTML = `
        <img src="${deal.photo_url}" style="max-width: 200px;" />
        <h3>${deal.title}</h3>
        <p><a href="${deal.url}" target="_blank">Voir sur Dealabs</a></p>
        <ul>
          <li><strong>Set ID:</strong> ${deal.id_lego || 'N/A'}</li>
          <li><strong>Prix:</strong> ${deal.price}€</li>
          <li><strong>Réduction:</strong> ${deal.discount}%</li>
          <li><strong>Hotness:</strong> ${deal.hotness}</li>
          <li><strong>Commentaires:</strong> ${deal.comments_count}</li>
          <li><strong>Score total:</strong> ${deal.score?.totalScore?.toFixed(1) || 'N/A'}</li>
          <li><strong>Profit:</strong> ${deal.score?.profitScore || 'N/A'}</li>
        </ul>
      `;
      section.style.display = 'block';
    });
  }
  
  function setupFilters() {
    const discountSlider = document.getElementById('discountSlider');
    const commentSlider = document.getElementById('commentSlider');
  
    discountSlider.addEventListener('input', () => {
      document.getElementById('discountValue').textContent = discountSlider.value;
      applyFilters();
    });
  
    commentSlider.addEventListener('input', () => {
      document.getElementById('commentValue').textContent = commentSlider.value;
      applyFilters();
    });
  
    document.getElementById('lego-set-id-select').addEventListener('change', applyFilters);
  }
  
  async function applyFilters() {
    const allDeals = await fetchDeals();
  
    const discountMin = parseInt(document.getElementById('discountSlider').value);
    const commentMin = parseInt(document.getElementById('commentSlider').value);
    const selectedSet = document.getElementById('lego-set-id-select').value;
  
    const filtered = allDeals.filter(deal => {
      const discountOk = parseInt(deal.discount) <= -discountMin;
      const commentOk = deal.comments_count >= commentMin;
      const setOk = selectedSet ? deal.id_lego === selectedSet : true;
      return discountOk && commentOk && setOk;
    });
  
    displayDeals(filtered);
  }
  
  async function populateSetIdList() {
    const deals = await fetchDeals();
    const select = document.getElementById('lego-set-id-select');
    const ids = [...new Set(deals.map(d => d.id_lego).filter(Boolean))];
  
    ids.forEach(id => {
      const option = document.createElement('option');
      option.value = id;
      option.textContent = id;
      select.appendChild(option);
    });
  }
  
  document.addEventListener('DOMContentLoaded', async () => {
    const deals = await fetchDeals();
    displayDeals(deals);
    populateSetIdList();
    setupFilters();
  });  