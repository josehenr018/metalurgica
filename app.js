// ============================================================
//  STATE E VARIÁVEIS GERAIS
// ============================================================
let cart = [];
let products = [];
let categories = [];
let analytics = { visits: 0, cartAdds: 0, orders: 0, productViews: {}, dailyVisits: [], activity: [] };
let currentModalProduct = null;
let modalQty = 1;
let currentImageIndex = 0;

// ============================================================
//  STORAGE HELPERS
// ============================================================
function save(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch(e){} }
function load(key, def) { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : def; } catch(e){ return def; } }

// ============================================================
//  INIT (COM PROTEÇÃO ANTI-CRASH)
// ============================================================
function init() {
  products = load('mm_products', getDefaultProducts());
  
  // Proteção: Se houver dados antigos corrompidos no navegador, reseta o analytics
  try {
    analytics = load('mm_analytics', null);
    if (!analytics || !analytics.dailyVisits || !Array.isArray(analytics.dailyVisits)) {
      analytics = { visits: 0, cartAdds: 0, orders: 0, productViews: {}, dailyVisits: generateDefaultVisits(), activity: [] };
    }
    
    analytics.visits++;
    if (analytics.dailyVisits.length > 0) {
      analytics.dailyVisits[analytics.dailyVisits.length - 1].val++;
    }
    logActivity('👁️ Nova visita ao site', 'blue');
    save('mm_analytics', analytics);
  } catch (e) {
    console.warn('Resetando analytics devido a dados antigos incompativeis.');
    analytics = { visits: 1, cartAdds: 0, orders: 0, productViews: {}, dailyVisits: generateDefaultVisits(), activity: [] };
    save('mm_analytics', analytics);
  }

  applyTexts();
  renderCategories();
  renderProducts('Todos');
  checkAdmin();
}

function generateDefaultVisits() {
  const days = ['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'];
  return days.map(d => ({ label: d, val: Math.floor(Math.random()*20)+5 }));
}

function getDefaultProducts() {
  return [
    { id: 1, name: 'Cadeira Industrial com Encosto', cat: 'Cadeiras', price: 189.90, unit: 'por peça', desc: 'Estrutura em aço carbono, assento reforçado. Ideal para escritórios, fábricas e refeitórios.', icon: '🪑', images: ['🪑', '📦', '📐'], specs: ['Suporta até 150kg', 'Aço Carbono 1.5mm', 'Pintura Eletrostática', 'Altura do assento: 45cm'], badge: 'Mais Vendido' },
    { id: 2, name: 'Banco de Espera 3 Lugares', cat: 'Bancos', price: 329.00, unit: 'por unidade', desc: 'Banco em aço galvanizado com assentos estofados. Perfeito para recepções e clínicas.', icon: '🛋️', images: ['🛋️', '🏥'], specs: ['Largura: 150cm', 'Aço Galvanizado', 'Estofado courino'], badge: '' },
    { id: 3, name: 'Mesa de Escritório Industrial', cat: 'Mesas', price: 549.00, unit: 'por peça', desc: 'Mesa metálica com tampo em MDF laminado, estrutura de aço 1.5mm.', icon: '🖥️', images: ['🖥️', '🪵'], specs: ['Tampo em MDF 15mm', 'Pés niveladores'], badge: 'Lançamento' },
    { id: 4, name: 'Estante Metálica 5 Prateleiras', cat: 'Estantes', price: 420.00, unit: 'por unidade', desc: 'Estante em chapa de aço, capacidade 50kg por prateleira.', icon: '🗄️', images: ['🗄️', '🛠️'], specs: ['Capacidade: 250kg total', 'Chapa 24', 'Cor Cinza Padrão'], badge: '' },
  ];
}

// ============================================================
//  CATEGORIES E PRODUCTS RENDER
// ============================================================
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
  document.getElementById('products-subtitle').textContent = cat === 'Todos' ? 'Todos os produtos disponíveis para atacado' : `Categoria: ${cat}`;
}

function renderProducts(cat) {
  const filtered = cat === 'Todos' ? products : products.filter(p => p.cat === cat);
  const grid = document.getElementById('products-grid');
  if (!filtered.length) { grid.innerHTML = '<p style="color:var(--muted)">Nenhum produto nesta categoria.</p>'; return; }
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

// ============================================================
//  CART
// ============================================================
function toggleCart() {
  const ov = document.getElementById('cart-overlay');
  ov.classList.toggle('open');
  if (ov.classList.contains('open')) renderCartItems();
}

function handleOverlayClick(e) { if (e.target === document.getElementById('cart-overlay')) toggleCart(); }

function quickAdd(id) {
  const p = products.find(x => x.id === id);
  if (!p) return;
  const existing = cart.find(x => x.id === id);
  if (existing) existing.qty++; else cart.push({ ...p, qty: 1 });
  updateCartCount();
  analytics.cartAdds++; logActivity(`🛒 Adicionado: ${p.name}`); save('mm_analytics', analytics);
  showToast(`✅ ${p.name} adicionado!`);
}

function updateCartCount() { document.getElementById('cart-count').textContent = cart.reduce((s, i) => s + i.qty, 0); }

function renderCartItems() {
  const container = document.getElementById('cart-items');
  if (!cart.length) { container.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--muted)">🛒 Carrinho vazio</div>'; document.getElementById('total-val').textContent = 'R$ 0,00'; return; }
  container.innerHTML = cart.map(item => `
    <div class="cart-item">
      <div class="cart-item-icon">${item.icon || '📦'}</div>
      <div class="cart-item-info">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-price">R$ ${(item.price * item.qty).toFixed(2).replace('.',',')}</div>
        <div class="cart-qty">
          <button onclick="changeQty(${item.id},-1)">−</button>
          <span>${item.qty}</span>
          <button onclick="changeQty(${item.id},1)">+</button>
        </div>
      </div>
      <button class="cart-remove" onclick="removeFromCart(${item.id})">🗑️</button>
    </div>
  `).join('');
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  document.getElementById('total-val').textContent = 'R$ ' + total.toFixed(2).replace('.',',');
}

function changeQty(id, delta) {
  const item = cart.find(x => x.id === id); if (!item) return;
  item.qty += delta; if (item.qty <= 0) cart = cart.filter(x => x.id !== id);
  updateCartCount(); renderCartItems();
}

function removeFromCart(id) { cart = cart.filter(x => x.id !== id); updateCartCount(); renderCartItems(); }

function sendToWhatsApp() {
  if (!cart.length) { showToast('⚠️ Carrinho vazio!'); return; }
  const cfg = load('mm_wa', { number: '', message: 'Olá! Gostaria de fazer um pedido:' });
  if (!cfg.number) { showToast('⚠️ WhatsApp não configurado no Admin!'); return; }
  const items = cart.map(i => `• ${i.name} x${i.qty} = R$ ${(i.price*i.qty).toFixed(2).replace('.',',')}`).join('\n');
  const total = cart.reduce((s,i) => s+i.price*i.qty, 0);
  const msg = `${cfg.message}\n\n${items}\n\n*Total: R$ ${total.toFixed(2).replace('.',',')}*\n\nAguardo confirmação e formas de pagamento.`;
  analytics.orders++; logActivity('📱 Pedido enviado via WhatsApp', 'green'); save('mm_analytics', analytics);
  window.open(`https://wa.me/${cfg.number}?text=${encodeURIComponent(msg)}`, '_blank');
}

// ============================================================
//  PRODUCT MODAL (CARROSSEL E SPECS)
// ============================================================
function openModal(id) {
  const p = products.find(x => x.id === id);
  if (!p) return;
  currentModalProduct = p;
  modalQty = 1;
  currentImageIndex = 0;
  
  updateCarouselImage();
  document.getElementById('product-modal-name').textContent = p.name;
  document.getElementById('product-modal-price').textContent = 'R$ ' + parseFloat(p.price).toFixed(2).replace('.',',') + ' / ' + p.unit;
  document.getElementById('product-modal-desc').textContent = p.desc;
  
  const specsContainer = document.getElementById('product-modal-specs');
  if(p.specs && p.specs.length > 0) {
      specsContainer.innerHTML = '<ul>' + p.specs.map(s => `<li>${s.trim()}</li>`).join('') + '</ul>';
      specsContainer.style.display = 'block';
  } else {
      specsContainer.style.display = 'none';
  }

  document.getElementById('modal-qty').textContent = 1;
  document.getElementById('product-modal').classList.add('open');
  analytics.productViews[p.name] = (analytics.productViews[p.name] || 0) + 1; save('mm_analytics', analytics);
}

function changeImage(direction) {
  if(!currentModalProduct || !currentModalProduct.images || currentModalProduct.images.length === 0) return;
  const totalImages = currentModalProduct.images.length;
  currentImageIndex = (currentImageIndex + direction + totalImages) % totalImages;
  updateCarouselImage();
}

function updateCarouselImage() {
  const imgContainer = document.getElementById('product-modal-img');
  if(currentModalProduct.images && currentModalProduct.images.length > 0) {
      imgContainer.textContent = currentModalProduct.images[currentImageIndex]; 
  } else {
      imgContainer.textContent = currentModalProduct.icon || '📦';
  }
}

function closeModal() { document.getElementById('product-modal').classList.remove('open'); }
function handleModalClick(e) { if (e.target === document.getElementById('product-modal')) closeModal(); }
function changeModalQty(d) { modalQty = Math.max(1, modalQty + d); document.getElementById('modal-qty').textContent = modalQty; }

function addModalToCart() {
  if (!currentModalProduct) return;
  const existing = cart.find(x => x.id === currentModalProduct.id);
  if (existing) existing.qty += modalQty; else cart.push({ ...currentModalProduct, qty: modalQty });
  updateCartCount(); analytics.cartAdds++; logActivity(`🛒 ${currentModalProduct.name} x${modalQty} adicionado`); save('mm_analytics', analytics);
  closeModal(); showToast(`✅ ${currentModalProduct.name} adicionado ao carrinho!`);
}

// ============================================================
//  ADMIN CORRIGIDO PARA GITHUB PAGES
// ============================================================
function checkAdmin() { 
  // Agora só abre o admin se tiver estritamente #admin no final da URL
  if (window.location.hash === '#admin') {
    openAdmin(); 
  }
}

window.addEventListener('hashchange', () => { if (window.location.hash === '#admin') openAdmin(); else closeAdmin(); });

function openAdmin() {
  document.getElementById('admin-panel').classList.add('open');
  document.body.style.overflow = 'hidden';
  refreshAdminDashboard(); loadAdminForms();
}

function closeAdmin() {
  document.getElementById('admin-panel').classList.remove('open');
  document.body.style.overflow = '';
  if (window.location.hash === '#admin') history.pushState(null, '', window.location.pathname);
}

function switchTab(tab) {
  document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
  document.getElementById('tab-' + tab).classList.add('active');
  event.target.classList.add('active');
  if (tab === 'dashboard') refreshAdminDashboard();
  if (tab === 'products') renderProductsTable();
}

function refreshAdminDashboard() {
  document.getElementById('stat-visits').textContent = analytics.visits;
  document.getElementById('stat-cart-adds').textContent = analytics.cartAdds;
  document.getElementById('stat-orders').textContent = analytics.orders;
  const views = analytics.productViews || {};
  const top = Object.entries(views).sort((a,b) => b[1]-a[1])[0];
  document.getElementById('stat-top').textContent = top ? top[0] : '—';

  const max = Math.max(...analytics.dailyVisits.map(d => d.val), 1);
  document.getElementById('visits-chart').innerHTML = analytics.dailyVisits.map(d => `
    <div class="bar-col">
      <div class="bar" style="height:${Math.round((d.val/max)*80)+8}px" title="${d.val} visitas"></div>
      <div class="bar-label">${d.label}</div>
    </div>
  `).join('');

  const log = document.getElementById('activity-log');
  const acts = (analytics.activity || []).slice(-10).reverse();
  if (!acts.length) { log.innerHTML = '<p style="color:var(--muted);font-size:.88rem">Nenhuma atividade registrada ainda.</p>'; return; }
  log.innerHTML = acts.map(a => `
    <div class="activity-item">
      <div class="activity-dot ${a.type||''}"></div>
      <div class="activity-text">${a.msg}</div>
      <div class="activity-time">${a.time}</div>
    </div>
  `).join('');
}

function logActivity(msg, type) {
  if (!analytics.activity) analytics.activity = [];
  const now = new Date().toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'});
  analytics.activity.push({ msg, type: type||'', time: now });
  if (analytics.activity.length > 50) analytics.activity = analytics.activity.slice(-50);
}

// ============================================================
//  ADMIN — PRODUCTS CRUD
// ============================================================
function renderProductsTable() {
  const tbody = document.getElementById('products-table-body');
  tbody.innerHTML = products.map(p => `
    <tr>
      <td style="font-size:1.4rem">${p.icon||'📦'}</td>
      <td><strong>${p.name}</strong></td>
      <td>${p.cat}</td>
      <td style="color:var(--accent);font-weight:700">R$ ${parseFloat(p.price).toFixed(2).replace('.',',')}</td>
      <td>${p.badge ? `<span class="product-badge">${p.badge}</span>` : '—'}</td>
      <td>
        <button class="btn-edit" onclick="editProduct(${p.id})">✏️ Editar</button>
        <button class="btn-danger" onclick="deleteProduct(${p.id})">🗑️ Excluir</button>
      </td>
    </tr>
  `).join('');
}

function saveProduct() {
  const name = document.getElementById('prod-name').value.trim();
  const cat = document.getElementById('prod-cat').value.trim();
  const price = parseFloat(document.getElementById('prod-price').value);
  const unit = document.getElementById('prod-unit').value.trim();
  const desc = document.getElementById('prod-desc').value.trim();
  const icon = document.getElementById('prod-icon').value.trim();
  const badge = document.getElementById('prod-badge').value.trim();
  
  const specsRaw = document.getElementById('prod-specs').value;
  const specs = specsRaw ? specsRaw.split(',').map(s => s.trim()) : [];
  
  const imagesRaw = document.getElementById('prod-images').value;
  const images = imagesRaw ? imagesRaw.split(',').map(i => i.trim()) : (icon ? [icon] : []);

  const editId = document.getElementById('prod-edit-id').value;

  if (!name || !price || !cat) { showToast('⚠️ Preencha nome, categoria e preço!'); return; }

  if (editId) {
    const idx = products.findIndex(p => p.id == editId);
    if (idx !== -1) products[idx] = { ...products[idx], name, cat, price, unit, desc, icon, badge, specs, images };
    showToast('✅ Produto atualizado!'); logActivity(`✏️ Produto editado: ${name}`);
  } else {
    const newId = Date.now();
    products.push({ id: newId, name, cat, price, unit, desc, icon, badge, specs, images });
    showToast('✅ Produto adicionado!'); logActivity(`➕ Novo produto: ${name}`);
  }

  save('mm_products', products); save('mm_analytics', analytics);
  renderCategories(); renderProducts('Todos'); renderProductsTable(); cancelEdit();
}

function editProduct(id) {
  const p = products.find(x => x.id === id); if (!p) return;
  document.getElementById('prod-name').value = p.name;
  document.getElementById('prod-cat').value = p.cat;
  document.getElementById('prod-price').value = p.price;
  document.getElementById('prod-unit').value = p.unit;
  document.getElementById('prod-desc').value = p.desc;
  document.getElementById('prod-icon').value = p.icon || '';
  document.getElementById('prod-badge').value = p.badge || '';
  document.getElementById('prod-specs').value = (p.specs || []).join(', ');
  document.getElementById('prod-images').value = (p.images || []).join(', ');
  
  document.getElementById('prod-edit-id').value = p.id;
  document.getElementById('product-form-title').textContent = '✏️ Editando: ' + p.name;
  document.getElementById('tab-products').scrollTop = 0; document.getElementById('admin-content').scrollTop = 0;
}

function cancelEdit() {
  ['prod-name','prod-cat','prod-price','prod-unit','prod-desc','prod-icon','prod-badge', 'prod-specs', 'prod-images'].forEach(id => { const el = document.getElementById(id); if(el) el.value = ''; });
  document.getElementById('prod-edit-id').value = ''; document.getElementById('product-form-title').textContent = '➕ Adicionar Novo Produto';
}

function deleteProduct(id) {
  if (!confirm('Tem certeza que deseja excluir este produto?')) return;
  const p = products.find(x => x.id === id); products = products.filter(x => x.id !== id);
  save('mm_products', products); if (p) logActivity(`🗑️ Produto excluído: ${p.name}`); save('mm_analytics', analytics);
  renderProducts('Todos'); renderProductsTable(); renderCategories(); showToast('🗑️ Produto excluído');
}

// ============================================================
//  ADMIN — TEXTS
// ============================================================
function loadAdminForms() {
  const texts = load('mm_texts', {}); const cfg = load('mm_wa', {});
  const setVal = (id, key, fallback) => { const el = document.getElementById(id); if(el) el.value = texts[key] !== undefined ? texts[key] : fallback; };
  setVal('txt-sitename', 'sitename', 'MetalMóveis'); setVal('txt-announce', 'announce', '🚚 Entrega para toda a região — Pedidos no atacado com melhores preços!');
  setVal('txt-hero-title', 'heroTitle', 'Móveis Metálicos de Alta Durabilidade'); setVal('txt-hero-sub', 'heroSub', 'Compra no atacado direto da fábrica.');
  setVal('txt-about-title', 'aboutTitle', 'Tradição e Qualidade em Cada Peça'); setVal('txt-about1', 'about1', document.getElementById('about-text1')?.textContent || '');
  setVal('txt-about2', 'about2', document.getElementById('about-text2')?.textContent || ''); setVal('txt-stat1', 'stat1', '+500');
  setVal('txt-stat2', 'stat2', '15'); setVal('txt-stat3', 'stat3', '100%'); setVal('txt-stat4', 'stat4', '24h');
  setVal('txt-footer-phone', 'footerPhone', '📞 Fone: (00) 00000-0000 | 📍 Sua cidade, SP');
  const waNum = document.getElementById('wa-number'); if(waNum) waNum.value = cfg.number || '';
  const waMsg = document.getElementById('wa-message'); if(waMsg) waMsg.value = cfg.message || 'Olá! Gostaria de fazer um pedido:';
  renderProductsTable();
}

function saveTexts() {
  const texts = {
    sitename: document.getElementById('txt-sitename')?.value || 'MetalMóveis', announce: document.getElementById('txt-announce')?.value || '',
    heroTitle: document.getElementById('txt-hero-title')?.value || '', heroSub: document.getElementById('txt-hero-sub')?.value || '',
    aboutTitle: document.getElementById('txt-about-title')?.value || '', about1: document.getElementById('txt-about1')?.value || '',
    about2: document.getElementById('txt-about2')?.value || '', stat1: document.getElementById('txt-stat1')?.value || '',
    stat2: document.getElementById('txt-stat2')?.value || '', stat3: document.getElementById('txt-stat3')?.value || '',
    stat4: document.getElementById('txt-stat4')?.value || '', footerPhone: document.getElementById('txt-footer-phone')?.value || '',
  };
  save('mm_texts', texts); applyTexts(); logActivity('✏️ Textos do site atualizados'); save('mm_analytics', analytics); showToast('✅ Textos salvos e aplicados!');
}

function applyTexts() {
  const texts = load('mm_texts', {});
  const set = (id, key, fallback) => { const el = document.getElementById(id); if(el && texts[key]) el.textContent = texts[key]; else if(el && fallback !== undefined) el.textContent = fallback; };
  if (texts.sitename) { document.title = texts.sitename + ' — Atacado'; set('site-name-nav', 'sitename'); set('footer-name', 'sitename'); }
  set('announce', 'announce'); set('hero-title', 'heroTitle'); set('hero-subtitle', 'heroSub'); set('about-title', 'aboutTitle');
  set('about-text1', 'about1'); set('about-text2', 'about2'); set('stat1', 'stat1'); set('stat2', 'stat2'); set('stat3', 'stat3');
  set('stat4', 'stat4'); set('footer-phone', 'footerPhone');
}

// ============================================================
//  ADMIN — WHATSAPP
// ============================================================
function saveWhatsApp() {
  const number = document.getElementById('wa-number')?.value.replace(/\D/g,'') || '';
  const message = document.getElementById('wa-message')?.value || 'Olá! Gostaria de fazer um pedido:';
  if (!number) { showToast('⚠️ Insira o número do WhatsApp!'); return; }
  save('mm_wa', { number, message }); updateWAPreview(); showToast('✅ WhatsApp configurado!'); logActivity('📱 WhatsApp configurado'); save('mm_analytics', analytics);
}

function updateWAPreview() {
  const message = document.getElementById('wa-message')?.value || '';
  const preview = `${message}\n\n• Cadeira Industrial x2 = R$ 379,80\n• Estante 5 Prateleiras x1 = R$ 420,00\n\n*Total: R$ 799,80*\n\nAguardo confirmação e formas de pagamento.`;
  const el = document.getElementById('wa-preview'); if (el) el.textContent = preview;
}

document.getElementById('wa-message')?.addEventListener('input', updateWAPreview);

function testWhatsApp() {
  const cfg = load('mm_wa', { number: '', message: '' });
  if (!cfg.number) { showToast('⚠️ Salve o número primeiro!'); return; }
  window.open(`https://wa.me/${cfg.number}?text=${encodeURIComponent(cfg.message + '\n\n[TESTE DO SISTEMA]')}`, '_blank');
}

// ============================================================
//  TOAST
// ============================================================
function showToast(msg) { const t = document.getElementById('toast'); t.textContent = msg; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 2500); }

// ============================================================
//  START
// ============================================================
document.addEventListener('DOMContentLoaded', init);