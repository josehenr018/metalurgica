let cart = [];
let products = [];
let categories = [];
let currentModalProduct = null;
let modalQty = 1;
let currentImageIndex = 0; // Estado para o carrossel

function save(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch(e){} }
function load(key, def) { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : def; } catch(e){ return def; } }

function init() {
  products = load('mm_products', getDefaultProducts());
  renderCategories();
  renderProducts('Todos');
  checkAdmin();
}

// ATUALIZADO: Produtos agora possuem array de 'images' e 'specs'
function getDefaultProducts() {
  return [
    { 
      id: 1, name: 'Cadeira Industrial com Encosto', cat: 'Cadeiras', price: 189.90, unit: 'por peça', 
      desc: 'Estrutura em aço carbono, assento reforçado. Ideal para escritórios, fábricas e refeitórios.', 
      images: ['🪑', '📦', '📐'], // Podem ser URLs de imagens reais no futuro
      specs: ['Suporta até 150kg', 'Aço Carbono 1.5mm', 'Pintura Eletrostática', 'Altura do assento: 45cm'],
      icon: '🪑', badge: 'Mais Vendido' 
    },
    { 
      id: 2, name: 'Banco de Espera 3 Lugares', cat: 'Bancos', price: 329.00, unit: 'por unidade', 
      desc: 'Banco em aço galvanizado com assentos estofados. Perfeito para recepções e clínicas.', 
      images: ['🛋️', '🛋️'], 
      specs: ['Largura: 150cm', 'Aço Galvanizado', 'Estofado courino'],
      icon: '🛋️', badge: '' 
    }
  ];
}

function renderCategories() {
  const catMap = { 'Todos': '🏷️', 'Cadeiras': '🪑', 'Mesas': '🖥️', 'Bancos': '🛋️', 'Estantes': '🗄️' };
  const cats = ['Todos', ...new Set(products.map(p => p.cat))];
  categories = cats;
  const grid = document.getElementById('categories-grid');
  grid.innerHTML = cats.map((c, i) => `
    <div class="cat-card ${i===0?'active':''}" onclick="filterCategory(this,'${c}')">
      <div class="cat-icon">${catMap[c] || '📦'}</div>
      <div class="cat-label">${c}</div>
    </div>
  `).join('');
}

function filterCategory(el, cat) {
  document.querySelectorAll('.cat-card').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  renderProducts(cat);
}

function renderProducts(cat) {
  const filtered = cat === 'Todos' ? products : products.filter(p => p.cat === cat);
  const grid = document.getElementById('products-grid');
  grid.innerHTML = filtered.map(p => `
    <div class="product-card" onclick="openModal(${p.id})">
      <div class="product-img">${p.icon || '📦'}</div>
      <div class="product-body">
        ${p.badge ? `<span class="product-badge">${p.badge}</span>` : ''}
        <div class="product-name">${p.name}</div>
        <div class="product-desc">${p.desc.substring(0, 60)}...</div>
        <div class="product-footer">
          <div><div class="product-price">R$ ${parseFloat(p.price).toFixed(2).replace('.',',')}</div><div class="product-unit">${p.unit}</div></div>
          <button class="add-to-cart" onclick="event.stopPropagation();quickAdd(${p.id})">+ Adicionar</button>
        </div>
      </div>
    </div>
  `).join('');
}

// --- LÓGICA DO MODAL (CARROSSEL E SPECS) ---
function openModal(id) {
  const p = products.find(x => x.id === id);
  if (!p) return;
  currentModalProduct = p;
  modalQty = 1;
  currentImageIndex = 0; // Reseta carrossel
  
  updateCarouselImage(); // Atualiza a foto inicial
  
  document.getElementById('product-modal-name').textContent = p.name;
  document.getElementById('product-modal-price').textContent = 'R$ ' + parseFloat(p.price).toFixed(2).replace('.',',') + ' / ' + p.unit;
  document.getElementById('product-modal-desc').textContent = p.desc;
  
  // Renderiza especificações (Mercado Livre Style)
  const specsContainer = document.getElementById('product-modal-specs');
  if(p.specs && p.specs.length > 0) {
      specsContainer.innerHTML = '<ul>' + p.specs.map(s => `<li>${s}</li>`).join('') + '</ul>';
      specsContainer.style.display = 'block';
  } else {
      specsContainer.style.display = 'none';
  }

  document.getElementById('modal-qty').textContent = 1;
  document.getElementById('product-modal').classList.add('open');
}

function changeImage(direction) {
  if(!currentModalProduct || !currentModalProduct.images) return;
  const totalImages = currentModalProduct.images.length;
  currentImageIndex = (currentImageIndex + direction + totalImages) % totalImages; // Lógica circular
  updateCarouselImage();
}

function updateCarouselImage() {
  const imgContainer = document.getElementById('product-modal-img');
  if(currentModalProduct.images && currentModalProduct.images.length > 0) {
      // Se futuramente você for usar URL: imgContainer.innerHTML = `<img src="${currentModalProduct.images[currentImageIndex]}">`
      imgContainer.textContent = currentModalProduct.images[currentImageIndex]; 
  } else {
      imgContainer.textContent = currentModalProduct.icon || '📦';
  }
}

function closeModal() { document.getElementById('product-modal').classList.remove('open'); }
function handleModalClick(e) { if (e.target === document.getElementById('product-modal')) closeModal(); }

function changeModalQty(d) {
  modalQty = Math.max(1, modalQty + d);
  document.getElementById('modal-qty').textContent = modalQty;
}

// ... Restante das funções de Carrinho (toggleCart, addModalToCart, sendToWhatsApp) ...
// ... E funções do adminPanel que estavam no seu script original ...

document.addEventListener('DOMContentLoaded', init);