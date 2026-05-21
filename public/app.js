// ============================================================
//  MOMO TANTRA + ICHHEYDOTCOM — UNIFIED CUSTOMER APP
// ============================================================

let cart          = JSON.parse(localStorage.getItem('mt_cart') || '[]');
let appliedCoupon = null;
let cartDiscount  = 0;
let DELIVERY_FEE  = 20;
let FREE_DELIVERY_ABOVE = 200;
let reviewRating  = 0;
let currentOrderType  = 'delivery';
let currentPayment    = 'cod';
let reviewsShown  = 6;
let allReviews    = [];
let allMenu       = [];
let lastMenuState = "";
let lastCategoriesState = "";
let menuSearchQuery = '';
let activeBrand = localStorage.getItem('mt_active_brand') || 'momotantra';

// ── INIT ────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  // Fade loader
  setTimeout(() => {
    const ol = document.getElementById('loading-overlay');
    if (ol) { ol.style.opacity = '0'; setTimeout(() => ol.remove(), 500); }
  }, 1200);

  // Navbar scroll
  window.addEventListener('scroll', () =>
    document.getElementById('navbar')?.classList.toggle('scrolled', window.scrollY > 20)
  );

  // ScrollSpy for navbar links
  const sections = document.querySelectorAll('section[id], header, footer');
  const navLinkEls = document.querySelectorAll('.nav-link-item');
  window.addEventListener('scroll', () => {
    let currentSec = '';
    const scrollPos = window.scrollY + 100;
    sections.forEach(sec => {
      const top = sec.offsetTop;
      const height = sec.offsetHeight;
      if (scrollPos >= top && scrollPos < top + height) {
        currentSec = sec.getAttribute('id');
      }
    });
    
    if (scrollPos < 300) currentSec = 'app-body';
    
    navLinkEls.forEach(link => {
      link.classList.remove('active');
      const href = link.getAttribute('href');
      if (href === '#' + currentSec || (currentSec === 'app-body' && href === '#app-body')) {
        link.classList.add('active');
      }
    });
  });

  // Animate on scroll
  const obs = new IntersectionObserver(entries =>
    entries.forEach(e => e.isIntersecting && e.target.classList.add('visible')), { threshold: 0.1 });
  document.querySelectorAll('.animate-on-scroll').forEach(el => obs.observe(el));

  // Load everything in parallel
  await Promise.all([
    loadRestaurantInfo(),
    renderOffers(),
    renderMenu(),
    loadReviews()
  ]);

  updateCartUI();
  initLiveOrderHub();
  applyBrandUI();
  renderFeaturesBanner();
  initTiltEffects();
  startStorefrontPolling();
  syncDrawerToggle();
  initGoogleSignIn();
});

// ── DUAL BRAND TOGGLE ────────────────────────────────────
function toggleBrand() {
  activeBrand = activeBrand === 'momotantra' ? 'ichheydotcom' : 'momotantra';
  localStorage.setItem('mt_active_brand', activeBrand);
  applyBrandUI();
  renderMenu(menuSearchQuery);
  renderFeaturesBanner();
  syncDrawerToggle();
}

function applyBrandUI() {
  const body = document.getElementById('app-body');
  const sw   = document.getElementById('brand-toggle-switch');
  const heroMT = document.getElementById('hero-momotantra');
  const heroIC = document.getElementById('hero-ichheydotcom');
  const logoMT = document.getElementById('nav-logo-mt');
  const logoIC = document.getElementById('nav-logo-ic');
  const heroImg = document.getElementById('hero-logo-img');
  const heroCircle = document.getElementById('hero-img-circle');
  const ichheyFloats = document.getElementById('ichhey-float-badges');
  const ichheyAbout  = document.getElementById('ichhey-about');
  const brandName    = document.getElementById('nav-brand-name');
  const brandTagline = document.getElementById('nav-brand-tagline');
  const menuLabel    = document.getElementById('menu-section-label');
  const menuTitle    = document.getElementById('menu-section-title');

  if (activeBrand === 'ichheydotcom') {
    body?.classList.add('theme-ichheydotcom');
    body?.classList.remove('theme-momotantra');
    sw?.classList.add('active');
    if (heroMT) heroMT.style.display = 'none';
    if (heroIC) heroIC.style.display = 'block';
    if (logoMT) logoMT.style.opacity = '0.5';
    if (logoIC) { logoIC.style.opacity = '1'; logoIC.style.border = '2px solid var(--yellow)'; }
    if (heroImg) heroImg.src = '/images/ichhey_logo.jpg';
    if (heroCircle) heroCircle.style.borderColor = 'var(--yellow)';
    if (ichheyFloats) ichheyFloats.style.display = 'block';
    if (ichheyAbout)  ichheyAbout.style.display  = 'block';
    if (brandName)    brandName.textContent = 'Ichheydotcom';
    if (brandTagline) brandTagline.textContent = 'Your Wish is Our Business®';
    if (menuLabel)    menuLabel.textContent = '🎁 Our Store';
    if (menuTitle)    menuTitle.innerHTML   = 'Shop Our <span>Collection</span>';
  } else {
    body?.classList.remove('theme-ichheydotcom');
    body?.classList.add('theme-momotantra');
    sw?.classList.remove('active');
    if (heroMT) heroMT.style.display = 'block';
    if (heroIC) heroIC.style.display = 'none';
    if (logoMT) logoMT.style.opacity = '1';
    if (logoIC) { logoIC.style.opacity = '0.5'; logoIC.style.border = '2px solid rgba(255,214,10,0.3)'; }
    if (heroImg) heroImg.src = '/images/logo.jpg';
    if (heroCircle) heroCircle.style.borderColor = 'var(--red)';
    if (ichheyFloats) ichheyFloats.style.display = 'none';
    if (ichheyAbout)  ichheyAbout.style.display  = 'none';
    if (brandName)    brandName.textContent = 'MoMo Tantra';
    if (brandTagline) brandTagline.textContent = 'মোমো তন্ত্র · Love at First Bite';
    if (menuLabel)    menuLabel.textContent = '🍽️ Our Menu';
    if (menuTitle)    menuTitle.innerHTML   = 'What Would You <span>Like?</span>';
  }
}

function renderFeaturesBanner() {
  const el = document.getElementById('features-grid');
  if (!el) return;
  const features = activeBrand === 'ichheydotcom' ? [
    { icon: '🎁', text: 'Personalized Gifts', sub: 'Photo mugs, frames & hampers' },
    { icon: '🕉️', text: 'God & Goddess Idols', sub: 'Brass, terracotta & wood' },
    { icon: '🎀', text: 'Return Gifts', sub: 'Weddings, pujas & more' },
    { icon: '📦', text: 'Seller Packaging', sub: 'Boxes, bubble wrap, bags' }
  ] : [
    { icon: '🛵', text: 'Fast Delivery', sub: 'Konnagar & nearby' },
    { icon: '🥟', text: '20+ Momo Varieties', sub: 'Veg · Chicken · Mutton' },
    { icon: '💯', text: 'Fresh & Hygienic', sub: 'Made fresh every day' },
    { icon: '💳', text: 'Easy Payments', sub: 'UPI, Cards & COD' }
  ];
  el.innerHTML = features.map(f => `
    <div class="feature-card">
      <div class="feature-icon">${f.icon}</div>
      <div><div class="feature-text">${f.text}</div><div class="feature-sub">${f.sub}</div></div>
    </div>`).join('');
}

// ── RESTAURANT ──────────────────────────────────────────
async function loadRestaurantInfo() {
  try {
    const { data } = await api.get('/restaurant');
    DELIVERY_FEE        = data.deliveryFee        || 20;
    FREE_DELIVERY_ABOVE = data.freeDeliveryAbove  || 200;
    // Patch phone links
    document.querySelectorAll('[data-phone]').forEach(el => {
      el.href = `tel:+91${data.phone1?.replace(/\s/g,'')}`;
      el.textContent = data.phone1;
    });
  } catch {}
}

// ── OFFERS ──────────────────────────────────────────────
async function renderOffers() {
  try {
    const { data } = await api.get('/offers?active=true');
    const el = document.getElementById('offers-track');
    if (!el) return;
    if (!data.length) { el.closest('section')?.style && (el.closest('section').style.display = 'none'); return; }
    el.innerHTML = data.map(o => `
      <div class="offer-card tilt-3d" onclick="applyOfferCoupon('${o.description}')">
        <div class="offer-icon">${o.image}</div>
        <div class="offer-title">${o.title}</div>
        <div class="offer-desc">${o.description}</div>
        <span class="badge badge-red offer-badge">${o.badge}</span>
      </div>`).join('');
  } catch (e) { console.warn('Offers load failed', e); }
}

function applyOfferCoupon(desc) {
  const m = desc.match(/code\s+([A-Z0-9]+)/i);
  if (m) {
    toggleCart();
    setTimeout(() => {
      const inp = document.getElementById('coupon-input');
      if (inp) { inp.value = m[1]; applyCoupon(); }
    }, 400);
  } else {
    showToast('💡 ' + desc);
    document.getElementById('menu')?.scrollIntoView({ behavior: 'smooth' });
  }
}

// ── MENU ────────────────────────────────────────────────
async function renderMenu(searchQuery = '') {
  try {
    const [menuRes, catRes] = await Promise.all([
      api.get('/menu' + (searchQuery ? `?search=${encodeURIComponent(searchQuery)}` : '')),
      api.get('/categories')
    ]);
    allMenu = menuRes.data;
    const allCats = catRes.data;

    // Filter by active brand
    const brandItems = allMenu.filter(i => !i.brand || i.brand === activeBrand);
    const cats = allCats.filter(cat => {
      const hasBrand = !cat.brand || cat.brand === activeBrand;
      const hasItems = brandItems.some(i => i.category === cat.id);
      return hasBrand && hasItems;
    });

    const sidebar = document.getElementById('menu-sidebar');
    const content = document.getElementById('menu-content');
    if (!sidebar || !content) return;

    // Sidebar
    const badgeColor = activeBrand === 'ichheydotcom' ? 'badge-yellow' : 'badge-red';
    sidebar.innerHTML = '<div class="menu-sidebar-title" style="width:100%">Categories</div>' +
      cats.map(cat => `
        <button class="cat-btn" id="cat-btn-${cat.id}" onclick="scrollToCategory('${cat.id}')">
          <span class="cat-icon">${cat.icon}</span>
          <span>${cat.name}</span>
          ${cat.badge ? `<span class="badge ${badgeColor} cat-badge">${cat.badge}</span>` : ''}
        </button>`).join('');

    // Content
    content.innerHTML = cats.map(cat => {
      const items = brandItems.filter(i => i.category === cat.id);
      if (!items.length) return '';
      return `
        <div class="menu-category-section animate-on-scroll" id="cat-section-${cat.id}">
          <div class="cat-section-title">${cat.icon} ${cat.name}</div>
          <div class="menu-grid">${items.map(renderMenuCard).join('')}</div>
        </div>`;
    }).join('');

    if (!content.innerHTML.trim()) {
      content.innerHTML = '<div style="text-align:center;padding:60px;color:var(--text-secondary)"><div style="font-size:48px;margin-bottom:16px">🎁</div>No items found.</div>';
    }

    // Re-observe new elements
    const obs = new IntersectionObserver(entries =>
      entries.forEach(e => e.isIntersecting && e.target.classList.add('visible')), { threshold: 0.05 });
    content.querySelectorAll('.animate-on-scroll').forEach(el => obs.observe(el));

    // Scroll-spy sidebar
    const catObs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          const id = e.target.id.replace('cat-section-', '');
          document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
          document.getElementById('cat-btn-' + id)?.classList.add('active');
        }
      });
    }, { threshold: 0.3 });
    content.querySelectorAll('.menu-category-section').forEach(s => catObs.observe(s));

    if (cats.length) document.getElementById('cat-btn-' + cats[0].id)?.classList.add('active');
  } catch (e) {
    console.error('Menu load failed', e);
    document.getElementById('menu-content').innerHTML =
      '<div style="text-align:center;padding:40px;color:var(--text-secondary)">⚠️ Could not load menu. Make sure the server is running.</div>';
  }
}

function renderMenuCard(item) {
  const inCart = cart.find(c => c.id === item.id);
  const qty = inCart ? inCart.qty : 0;
  return `
    <div class="menu-card tilt-3d${!item.isAvailable ? ' item-unavailable' : ''}" id="menu-card-${item.id}">
      <div class="menu-img-wrap">
        <img src="${item.image}" alt="${item.name}" class="menu-card-img"
          onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 300 180%22><rect width=%22300%22 height=%22180%22 fill=%22%231a0000%22/><text x=%2250%25%22 y=%2255%25%22 font-size=%2260%22 text-anchor=%22middle%22 dominant-baseline=%22middle%22>🥟</text></svg>'">
        <div class="menu-card-badges">
          ${item.isBestseller ? '<span class="badge badge-red">🔥 Bestseller</span>' : ''}
          ${item.isSpicy ? '<span class="badge badge-yellow">🌶️ Spicy</span>' : ''}
        </div>
        ${!item.isAvailable ? `<div style="position:absolute;inset:0;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:#aaa">Currently Unavailable</div>` : ''}
      </div>
      <div class="menu-card-body">
        <div class="menu-card-top">
          <div class="menu-card-name">${item.name}</div>
          <span class="${item.isVeg ? 'tag-veg' : 'tag-nonveg'}"></span>
        </div>
        <div style="font-size:12px;color:var(--text-muted);margin-bottom:6px">
          ⭐ ${item.rating} · ${item.reviews} reviews · ${item.servingSize}
        </div>
        <div class="menu-card-desc">${item.description}</div>
        <div class="menu-card-footer">
          <div class="menu-card-price">₹${item.price} <span>/ ${item.servingSize}</span></div>
          ${item.isAvailable ? renderQtyControl(item, qty) : `<span style="font-size:12px;color:var(--text-muted)">Unavailable</span>`}
        </div>
      </div>
    </div>`;
}

function renderQtyControl(item, qty) {
  if (qty > 0) {
    return `<div class="qty-control">
      <button class="qty-btn" onclick="updateQty('${item.id}',-1)">−</button>
      <span class="qty-num" id="qty-${item.id}">${qty}</span>
      <button class="qty-btn add-btn" onclick="updateQty('${item.id}',1)">+</button>
    </div>`;
  }
  if (item.requiresCustomization) {
    return `<button class="qty-btn add-btn" style="width:auto;padding:0 16px;border-radius:var(--radius-sm);height:36px"
      onclick="openCustomization('${item.id}')">🎨 Customize</button>`;
  }
  return `<button class="qty-btn add-btn" style="width:auto;padding:0 16px;border-radius:var(--radius-sm);height:36px"
    onclick="addToCart('${item.id}','${item.name}',${item.price},'${item.image}')">+ Add</button>`;
}

function filterMenu(query) {
  menuSearchQuery = query;
  renderMenu(query);
}

function scrollToCategory(catId) {
  const el = document.getElementById('cat-section-' + catId);
  if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 90, behavior: 'smooth' });
}

// ── CART ────────────────────────────────────────────────
function saveCart() { localStorage.setItem('mt_cart', JSON.stringify(cart)); }

function addToCart(id, name, price, image) {
  const ex = cart.find(c => c.id === id);
  if (ex) ex.qty++;
  else cart.push({ id, name, price, image, qty: 1 });
  saveCart(); updateCartUI(); refreshMenuCardButtons(id);
  showToast(`🛒 ${name} added!`);
  const btn = document.getElementById('cart-btn');
  if (btn) { btn.style.transform = 'scale(1.12)'; setTimeout(() => btn.style.transform = '', 200); }
}

function updateQty(id, delta) {
  const idx = cart.findIndex(c => c.id === id);
  if (idx === -1) return;
  cart[idx].qty += delta;
  if (cart[idx].qty <= 0) cart.splice(idx, 1);
  saveCart(); updateCartUI(); refreshMenuCardButtons(id);
}

function refreshMenuCardButtons(itemId) {
  const item = allMenu.find(i => i.id === itemId);
  const footer = document.querySelector(`#menu-card-${itemId} .menu-card-footer`);
  if (!item || !footer) return;
  const priceDiv = footer.querySelector('.menu-card-price');
  if (!priceDiv) return;
  const qty = (cart.find(c => c.id === itemId) || {}).qty || 0;
  while (priceDiv.nextSibling) priceDiv.nextSibling.remove();
  footer.insertAdjacentHTML('beforeend', renderQtyControl(item, qty));
}

function updateCartUI() {
  const count    = cart.reduce((s, i) => s + i.qty, 0);
  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);

  // Revalidate coupon
  if (appliedCoupon && subtotal < appliedCoupon.minOrder) {
    appliedCoupon = null; cartDiscount = 0;
    const m = document.getElementById('coupon-msg');
    if (m) { m.style.display = 'none'; }
  }

  const delivery = subtotal >= FREE_DELIVERY_ABOVE ? 0 : (count > 0 ? DELIVERY_FEE : 0);
  const total = subtotal - cartDiscount + delivery;

  // Navbar count
  const countEl = document.getElementById('cart-count');
  if (countEl) { countEl.style.display = count > 0 ? 'flex' : 'none'; countEl.textContent = count; }
  const navTotal = document.getElementById('cart-total-nav');
  if (navTotal) navTotal.textContent = count > 0 ? `₹${total}` : '';

  // Cart list
  const listEl   = document.getElementById('cart-items-list');
  const footerEl = document.getElementById('cart-footer');
  if (!listEl) return;

  if (!cart.length) {
    listEl.innerHTML = `<div class="cart-empty"><div class="cart-empty-icon">🛒</div>
      <div style="font-size:16px;font-weight:700;margin-bottom:8px">Your cart is empty</div>
      <div style="font-size:13px;color:var(--text-muted)">Add some delicious momos!</div></div>`;
    if (footerEl) footerEl.style.display = 'none';
    return;
  }

  listEl.innerHTML = cart.map(item => `
    <div class="cart-item">
      <img src="${item.image}" alt="${item.name}" class="cart-item-img"
        onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 60 60%22><rect width=%2260%22 height=%2260%22 fill=%22%231a0000%22/><text x=%2250%25%22 y=%2255%25%22 font-size=%2230%22 text-anchor=%22middle%22>🥟</text></svg>'">
      <div class="cart-item-info">
        <div class="cart-item-name">${item.name}</div>
        ${item.customText ? `<div style="font-size:11px;color:var(--yellow);font-weight:700">✍️ Text: "${item.customText}"</div>` : ''}
        ${item.customImage ? `<div style="font-size:11px;color:var(--green);font-weight:700">🖼️ Photo Attached</div>` : ''}
        ${item.customNotes ? `<div style="font-size:11px;color:var(--text-muted)">📝 Note: ${item.customNotes}</div>` : ''}
        <div class="cart-item-price" style="margin-top:4px">₹${item.price} × ${item.qty}</div>
        <div class="qty-control" style="margin-top:6px;display:inline-flex">
          <button class="qty-btn" style="width:28px;height:28px" onclick="updateQty('${item.id}',-1)">−</button>
          <span class="qty-num" style="min-width:28px;font-size:14px">${item.qty}</span>
          <button class="qty-btn add-btn" style="width:28px;height:28px" onclick="updateQty('${item.id}',1)">+</button>
        </div>
      </div>
      <div class="cart-item-total">₹${item.price * item.qty}</div>
    </div>`).join('');

  if (footerEl) footerEl.style.display = 'block';

  document.getElementById('cart-subtotal').textContent = '₹' + subtotal;
  document.getElementById('cart-delivery').textContent = delivery === 0 && count > 0 ? '🎉 Free!' : '₹' + delivery;
  document.getElementById('cart-total').textContent    = '₹' + total;
  const discRow = document.getElementById('discount-row');
  if (discRow) {
    discRow.style.display = cartDiscount > 0 ? 'flex' : 'none';
    document.getElementById('cart-discount').textContent = '-₹' + cartDiscount;
  }
}

function toggleCart() {
  document.getElementById('cart-sidebar')?.classList.toggle('open');
  document.getElementById('cart-overlay')?.classList.toggle('open');
  document.body.style.overflow = document.getElementById('cart-sidebar')?.classList.contains('open') ? 'hidden' : '';
}

async function applyCoupon() {
  const code     = document.getElementById('coupon-input')?.value?.trim();
  const msgEl    = document.getElementById('coupon-msg');
  if (!code || !msgEl) return;
  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  try {
    const res = await api.post('/coupons/verify', { code, total: subtotal });
    msgEl.style.display = 'block';
    if (res.valid) {
      appliedCoupon = res.coupon; cartDiscount = res.discount;
      msgEl.className = 'coupon-msg success'; msgEl.textContent = '✅ ' + res.message;
      showToast('🎁 Saved ₹' + res.discount + '!');
    } else {
      appliedCoupon = null; cartDiscount = 0;
      msgEl.className = 'coupon-msg error'; msgEl.textContent = '❌ ' + res.message;
    }
    updateCartUI();
  } catch { showToast('Could not verify coupon'); }
}

// ── CHECKOUT ────────────────────────────────────────────
function openCheckout() {
  if (!cart.length) { showToast('Add items to cart first!'); return; }
  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const delivery = subtotal >= FREE_DELIVERY_ABOVE ? 0 : DELIVERY_FEE;
  const total    = subtotal - cartDiscount + delivery;

  const listEl = document.getElementById('checkout-items-list');
  if (listEl) {
    listEl.innerHTML =
      cart.map(i => `
        <div style="display:flex;justify-content:space-between;margin-bottom:2px">
          <span><strong>${i.name}</strong> ×${i.qty}</span>
          <span>₹${i.price*i.qty}</span>
        </div>
        ${i.customText ? `<div style="font-size:11px;color:var(--yellow);margin-bottom:4px">✍️ Text: "${i.customText}"</div>` : ''}
        ${i.customNotes ? `<div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">📝 Notes: ${i.customNotes}</div>` : ''}
      `).join('') +
      (cartDiscount > 0 ? `<div style="display:flex;justify-content:space-between;margin-bottom:6px;color:var(--green)"><span>🎁 Discount</span><span>-₹${cartDiscount}</span></div>` : '') +
      `<div style="display:flex;justify-content:space-between;color:var(--text-secondary)"><span>Delivery</span><span>${delivery===0?'Free':'₹'+delivery}</span></div>`;
  }
  document.getElementById('checkout-total').textContent = '₹' + total;
  toggleCart();
  document.getElementById('checkout-modal')?.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeCheckout() {
  document.getElementById('checkout-modal')?.classList.remove('open');
  document.body.style.overflow = '';
}

function setOrderType(type, btn) {
  currentOrderType = type;
  document.querySelectorAll('.order-type-btn').forEach(b => {
    if (b.onclick?.toString().includes('setOrderType')) b.classList.remove('active');
  });
  btn.classList.add('active');
  document.getElementById('address-group').style.display = type === 'delivery' ? 'block' : 'none';
}

function setPayment(type, btn) {
  currentPayment = type;
  document.querySelectorAll('.order-type-btn').forEach(b => {
    if (b.onclick?.toString().includes('setPayment')) b.classList.remove('active');
  });
  btn.classList.add('active');
}

async function placeOrder() {
  const name    = document.getElementById('co-name')?.value?.trim();
  const phone   = document.getElementById('co-phone')?.value?.trim();
  const email   = document.getElementById('co-email')?.value?.trim();
  const address = document.getElementById('co-address')?.value?.trim();
  const notes   = document.getElementById('co-notes')?.value?.trim();

  if (!name)  { showToast('Please enter your name'); return; }
  if (!phone || phone.length !== 10) { showToast('Enter a valid 10-digit phone number'); return; }
  if (currentOrderType === 'delivery' && !address) { showToast('Please enter delivery address'); return; }

  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const delivery = subtotal >= FREE_DELIVERY_ABOVE ? 0 : DELIVERY_FEE;
  const total    = subtotal - cartDiscount + delivery;

  const placeBtn = document.querySelector('#checkout-modal .btn-primary[onclick="placeOrder()"]');
  if (placeBtn) { placeBtn.disabled = true; placeBtn.textContent = 'Placing...'; }

  const submitPayload = async (paymentId = null) => {
    try {
      const { data: order } = await api.post('/orders', {
        items:         cart,
        customerName:  name,
        phone, email, address: address || currentOrderType,
        notes: notes + (paymentId ? ` [Paid: ${paymentId}]` : ''),
        orderType: currentOrderType,
        paymentMethod: currentPayment,
        couponCode:    appliedCoupon?.code || null
      });

      cart = []; appliedCoupon = null; cartDiscount = 0;
      localStorage.removeItem('mt_cart');
      updateCartUI();
      closeCheckout();
      localStorage.setItem('mt_active_order_id', order.id);
      initLiveOrderHub();
      showOrderSuccess(order);
      showNotification(`🎉 Order #${order.id} placed!`, 'success');
    } catch (e) {
      showToast(e.message || 'Error placing order');
      if (placeBtn) { placeBtn.disabled = false; placeBtn.textContent = '✅ Place Order'; }
    }
  };

  if (currentPayment === 'stripe') {
    try {
      const res = await fetch('/api/payment/create-stripe-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart,
          customerName: name,
          phone, email,
          address: address || currentOrderType,
          orderType: currentOrderType,
          couponCode: appliedCoupon?.code || null,
          notes
        })
      });
      const data = await res.json();
      if (data.success && data.url) {
        cart = []; appliedCoupon = null; cartDiscount = 0;
        localStorage.removeItem('mt_cart');
        updateCartUI();
        closeCheckout();
        window.location.href = data.url;
      } else {
        showToast('❌ Stripe checkout failed: ' + data.message);
        if (placeBtn) { placeBtn.disabled = false; placeBtn.textContent = '✅ Place Order'; }
      }
    } catch (e) {
      showToast('❌ Stripe redirection error');
      if (placeBtn) { placeBtn.disabled = false; placeBtn.textContent = '✅ Place Order'; }
    }
  } else if (currentPayment === 'razorpay') {
    try {
      const res = await fetch('/api/payment/create-razorpay-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart,
          customerName: name,
          phone, email,
          address: address || currentOrderType,
          orderType: currentOrderType,
          couponCode: appliedCoupon?.code || null,
          notes
        })
      });
      const data = await res.json();
      if (!data.success) {
        showToast('❌ Razorpay checkout failed: ' + data.message);
        if (placeBtn) { placeBtn.disabled = false; placeBtn.textContent = '✅ Place Order'; }
        return;
      }

      if (data.mock) {
        openOnlinePaymentModal(total, async () => {
          try {
            const verifyRes = await fetch('/api/payment/razorpay-verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_payment_id: 'pay_mock_' + Date.now(),
                razorpay_order_id: data.razorpayOrderId,
                order_id: data.orderId
              })
            });
            const verifyData = await verifyRes.json();
            if (verifyData.success) {
              cart = []; appliedCoupon = null; cartDiscount = 0;
              localStorage.removeItem('mt_cart');
              updateCartUI();
              closeCheckout();
              localStorage.setItem('mt_active_order_id', data.orderId);
              initLiveOrderHub();
              const orderRes = await fetch(`/api/orders/${data.orderId}`);
              const orderJson = await orderRes.json();
              showOrderSuccess(orderJson.data);
              showNotification(`🎉 Order placed successfully (Sandbox Mode)!`, 'success');
            } else {
              showToast('❌ Sandbox verification failed');
            }
          } catch(e) {
            showToast('❌ Sandbox verification error');
          }
        });
      } else {
        const options = {
          key: data.key,
          amount: data.amount,
          currency: 'INR',
          name: 'MoMo Tantra & Ichheydotcom',
          description: 'Payment Checkout',
          order_id: data.razorpayOrderId,
          handler: async function (response) {
            try {
              const verifyRes = await fetch('/api/payment/razorpay-verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_signature: response.razorpay_signature,
                  order_id: data.orderId
                })
              });
              const verifyData = await verifyRes.json();
              if (verifyData.success) {
                cart = []; appliedCoupon = null; cartDiscount = 0;
                localStorage.removeItem('mt_cart');
                updateCartUI();
                closeCheckout();
                localStorage.setItem('mt_active_order_id', data.orderId);
                initLiveOrderHub();
                const orderRes = await fetch(`/api/orders/${data.orderId}`);
                const orderJson = await orderRes.json();
                showOrderSuccess(orderJson.data);
                showNotification(`🎉 Payment verified & order placed!`, 'success');
              } else {
                showToast('❌ Payment verification failed');
              }
            } catch (err) {
              showToast('❌ Payment signature verification error');
            }
          },
          prefill: {
            name: name,
            email: email || '',
            contact: phone
          },
          theme: {
            color: '#e63946'
          }
        };
        const rzp = new Razorpay(options);
        rzp.open();
        if (placeBtn) { placeBtn.disabled = false; placeBtn.textContent = '✅ Place Order'; }
      }
    } catch (e) {
      showToast('❌ Razorpay order creation error');
      if (placeBtn) { placeBtn.disabled = false; placeBtn.textContent = '✅ Place Order'; }
    }
  } else {
    submitPayload();
  }
}

function showOrderSuccess(order) {
  const body = document.getElementById('success-body');
  if (!body) return;
  body.innerHTML = `
    <div class="order-success">
      <div class="order-success-icon">🎉</div>
      <div class="order-success-title">Order Placed!</div>
      <div class="order-success-id">Your Order ID: <strong>${order.id}</strong></div>
      <div class="order-card">
        ${order.items.map(i=>`
          <div class="order-card-row" style="display:flex;justify-content:space-between">
            <span><strong>${i.name}</strong> ×${i.qty}</span>
            <span>₹${i.price*i.qty}</span>
          </div>
          ${i.customText ? `<div style="font-size:11px;color:var(--yellow);margin:-4px 0 8px 12px;text-align:left">✍️ Text: "${i.customText}"</div>` : ''}
          ${i.customNotes ? `<div style="font-size:11px;color:var(--text-muted);margin:-4px 0 8px 12px;text-align:left">📝 Notes: ${i.customNotes}</div>` : ''}
        `).join('')}
        ${order.discount>0?`<div class="order-card-row" style="color:var(--green)"><span>🎁 Discount</span><span>-₹${order.discount}</span></div>`:''}
        <div class="order-card-row" style="color:var(--text-secondary)"><span>Delivery</span><span>${order.deliveryFee?'₹'+order.deliveryFee:'Free'}</span></div>
        <div class="order-card-row"><span>Total</span><span>₹${order.total}</span></div>
      </div>
      <p style="color:var(--text-secondary);font-size:14px;margin-bottom:24px">
        📍 ${order.address}<br>⏱️ Expected: <strong>30–45 mins</strong>
      </p>
      <div class="order-actions">
        <a href="/track?order=${order.id}" class="btn btn-primary">🛵 Track Order</a>
        <button class="btn btn-yellow" onclick='shareOnWhatsApp(${JSON.stringify(order).replace(/'/g,"&#39;")})'>💬 WhatsApp</button>
        <button class="btn btn-outline" onclick="printInvoice(${JSON.stringify(order).replace(/'/g,"&#39;")})">🧾 Invoice</button>
        <button class="btn btn-outline" onclick="document.getElementById('success-modal').classList.remove('open');document.body.style.overflow=''">✕ Close</button>
      </div>
    </div>`;
  document.getElementById('success-modal')?.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function printInvoice(order) {
  const w = window.open('', '_blank');
  w.document.write(`<html><head><title>Invoice #${order.id}</title>
  <style>body{font-family:monospace;padding:40px;max-width:600px;margin:0 auto}
  h1{text-align:center}hr{border:1px solid #ccc;margin:16px 0}
  table{width:100%;border-collapse:collapse}td,th{padding:6px 0}
  th{text-align:left;border-bottom:2px solid #000}</style></head><body>
  <h1>🥟 MOMO TANTRA</h1>
  <p style="text-align:center;margin:-10px 0 4px">Love at First Bite | মম তন্ত্র</p>
  <p style="text-align:center;font-size:12px;color:#666">12A JC Bose Rd, Nabagram, Hooghly | Ph: 90079 93582</p><hr>
  <h2>INVOICE — #${order.id}</h2>
  <table>
    <tr><td>Date</td><td style="text-align:right">${formatDate(order.timestamp)}</td></tr>
    <tr><td>Customer</td><td style="text-align:right">${order.customerName}</td></tr>
    <tr><td>Phone</td><td style="text-align:right">${order.phone}</td></tr>
    <tr><td>Address</td><td style="text-align:right">${order.address}</td></tr>
    <tr><td>Order Type</td><td style="text-align:right">${order.orderType}</td></tr>
    <tr><td>Payment</td><td style="text-align:right">${order.paymentMethod==='cod'?'Cash on Delivery':'Online'}</td></tr>
  </table><hr>
  <table><thead><tr><th>Item</th><th style="text-align:center">Qty</th><th style="text-align:center">Rate</th><th style="text-align:right">Amount</th></tr></thead>
  <tbody>${order.items.map(i=>`
    <tr>
      <td>
        <strong>${i.name}</strong>
        ${i.customText ? `<br><small style="color:#666">✍️ Print: "${i.customText}"</small>` : ''}
        ${i.customNotes ? `<br><small style="color:#666">📝 Instructions: ${i.customNotes}</small>` : ''}
      </td>
      <td style="text-align:center">${i.qty}</td>
      <td style="text-align:center">₹${i.price}</td>
      <td style="text-align:right">₹${i.price*i.qty}</td>
    </tr>`).join('')}</tbody>
  </table><hr>
  <table>
    <tr><td>Subtotal</td><td style="text-align:right">₹${order.subtotal}</td></tr>
    ${order.discount>0?`<tr><td>Discount ${order.coupon?'('+order.coupon+')':''}</td><td style="text-align:right">-₹${order.discount}</td></tr>`:''}
    <tr><td>Delivery</td><td style="text-align:right">${order.deliveryFee>0?'₹'+order.deliveryFee:'Free'}</td></tr>
    <tr style="font-weight:bold;font-size:18px;border-top:2px solid #000"><td>TOTAL</td><td style="text-align:right">₹${order.total}</td></tr>
  </table><hr>
  <p style="text-align:center;font-size:12px;color:#666">Thank you for ordering from Momo Tantra!</p>
  </body></html>`);
  w.document.close(); w.focus(); setTimeout(() => w.print(), 500);
}

// ── REVIEWS ─────────────────────────────────────────────
async function loadReviews() {
  try {
    const [revRes, statsRes] = await Promise.all([
      api.get('/reviews?approved=true'),
      api.get('/reviews/stats')
    ]);
    allReviews = revRes.data;
    renderRatingSummary(statsRes.data);
    renderReviews();
  } catch (e) { console.warn('Reviews load failed', e); }
}

function renderRatingSummary(stats) {
  if (!stats) return;
  const { avg, total, distribution } = stats;
  document.getElementById('avg-rating').textContent  = avg || '4.6';
  document.getElementById('review-count').textContent = (total || 30) + ' reviews';

  const starsEl = document.getElementById('avg-stars');
  if (starsEl) starsEl.innerHTML = [1,2,3,4,5].map(i =>
    `<span style="color:${i<=Math.round(avg)?'var(--yellow)':'var(--border)'}">★</span>`).join('');

  const barsEl = document.getElementById('rating-bars');
  if (barsEl && distribution) {
    barsEl.innerHTML = [5,4,3,2,1].map(star => {
      const cnt = distribution[star] || 0;
      const pct = total ? Math.round(cnt/total*100) : 0;
      return `<div class="rating-bar-row">
        <span>${star} ★</span>
        <div class="rating-bar-track"><div class="rating-bar-fill" style="width:${pct}%"></div></div>
        <span style="min-width:30px;text-align:right;color:var(--text-secondary)">${cnt}</span>
      </div>`;
    }).join('');
  }
}

function renderReviews() {
  const el = document.getElementById('reviews-grid');
  if (!el) return;
  const shown = allReviews.slice(0, reviewsShown);
  el.innerHTML = shown.map(r => `
    <div class="review-card animate-on-scroll">
      <div class="review-header">
        <div class="review-avatar" style="background:${avatarColor(r.avatar)}">${r.avatar}</div>
        <div>
          <div class="review-name">${r.name}</div>
          <div class="review-date">${r.date}</div>
          ${r.isVerified ? '<div class="review-verified">✅ Verified Customer</div>' : ''}
        </div>
      </div>
      <div class="review-stars">${'⭐'.repeat(r.rating)}</div>
      <div class="review-text">${r.comment}</div>
      ${r.ownerResponse ? `<div class="owner-response"><strong>🏪 Owner's Response</strong>${r.ownerResponse}</div>` : ''}
    </div>`).join('');

  document.getElementById('load-more-reviews').style.display = allReviews.length > reviewsShown ? 'inline-flex' : 'none';

  const obs = new IntersectionObserver(entries =>
    entries.forEach(e => e.isIntersecting && e.target.classList.add('visible')), { threshold: 0.1 });
  el.querySelectorAll('.animate-on-scroll').forEach(el => obs.observe(el));
}

function loadMoreReviews() {
  reviewsShown += 6;
  renderReviews();
}

function setRating(val) {
  reviewRating = val;
  document.getElementById('review-rating').value = val;
  document.querySelectorAll('.star-btn').forEach(b =>
    b.classList.toggle('active', parseInt(b.dataset.val) <= val));
}

async function submitReview(e) {
  e.preventDefault();
  const name   = document.getElementById('review-name')?.value?.trim();
  const text   = document.getElementById('review-text')?.value?.trim();
  const phone  = document.getElementById('review-phone')?.value?.trim();
  if (!name || !text) { showToast('Please fill all required fields'); return; }
  if (reviewRating === 0) { showToast('Please select a rating'); return; }
  try {
    await api.post('/reviews', { name, phone, rating: reviewRating, comment: text });
    document.getElementById('review-form')?.reset();
    reviewRating = 0;
    document.querySelectorAll('.star-btn').forEach(b => b.classList.remove('active'));
    showToast('✅ Review submitted! Pending approval.');
    showNotification('Thank you! Your review is pending moderation.', 'success');
  } catch (e) { showToast('❌ ' + (e.message || 'Could not submit review')); }
}

function shareReviewWhatsApp() {
  const name  = document.getElementById('review-name')?.value?.trim() || 'A customer';
  const text  = document.getElementById('review-text')?.value?.trim() || 'Great food!';
  const msg   = `⭐ ${'⭐'.repeat(reviewRating)} Review for Momo Tantra\n\n"${text}"\n— ${name}\n\nMomo Tantra | Love at First Bite\n12A JC Bose Rd, Nabagram, Hooghly`;
  window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
}

// ── CUSTOMER LIVE ORDER TRACKING HUB LOGIC ──────────────────
let liveOrderHubInterval = null;

function initLiveOrderHub() {
  const orderId = localStorage.getItem('mt_active_order_id');
  const hubEl = document.getElementById('live-order-hub');
  if (!orderId || !hubEl) {
    if (hubEl) hubEl.style.display = 'none';
    if (liveOrderHubInterval) clearInterval(liveOrderHubInterval);
    return;
  }
  hubEl.style.display = 'block';
  pollLiveOrderHub(orderId);
  if (liveOrderHubInterval) clearInterval(liveOrderHubInterval);
  liveOrderHubInterval = setInterval(() => pollLiveOrderHub(orderId), 5000);
}

async function pollLiveOrderHub(orderId) {
  try {
    const res = await api.get(`/orders/${orderId}`);
    if (!res.success || !res.data) {
      localStorage.removeItem('mt_active_order_id');
      initLiveOrderHub();
      return;
    }
    renderLiveOrderHub(res.data);
  } catch (e) {
    console.error('Polling active order error', e);
  }
}

function clearLiveOrderHub() {
  localStorage.removeItem('mt_active_order_id');
  initLiveOrderHub();
}

function toggleHubMinimize(btn) {
  const content = document.getElementById('hub-collapsible-content');
  if (!content) return;
  const isHidden = content.style.display === 'none';
  content.style.display = isHidden ? 'block' : 'none';
  btn.textContent = isHidden ? '➖ Minimize' : '➕ Expand';
}

function renderLiveOrderHub(order) {
  const hubEl = document.getElementById('live-order-hub');
  if (!hubEl) return;

  const steps = ['placed', 'confirmed', 'preparing', 'ready', 'delivered'];
  const currentStepIdx = steps.indexOf(order.status);
  
  let statusText = "Processing your order...";
  let statusDesc = "Waiting for restaurant to confirm your delicious feast.";
  if (order.status === 'confirmed') {
    statusText = "Order Confirmed!";
    statusDesc = "The chef is getting ready to prepare your momos.";
  } else if (order.status === 'preparing') {
    statusText = "Momos in the Making!";
    statusDesc = "Our expert kitchen is steaming and frying your momos with love.";
  } else if (order.status === 'ready') {
    statusText = "Out for Delivery / Ready!";
    statusDesc = "Your order is ready to grab or is on its way to your location.";
  } else if (order.status === 'delivered') {
    statusText = "Delivered & Enjoyed!";
    statusDesc = "Thank you for choosing Momo Tantra! Love at First Bite.";
  } else if (order.status === 'rejected') {
    statusText = "Order Rejected";
    statusDesc = "Unfortunately, we had to reject this order. Please contact us.";
  }

  // Create timeline HTML
  let timelineHtml = `
    <div class="live-timeline" style="display:flex;justify-content:space-between;position:relative;margin:28px 0 16px;padding:0 10px">
      <div style="position:absolute;top:12px;left:10px;right:10px;height:4px;background:rgba(255,255,255,0.05);z-index:1;border-radius:2px">
        <div style="height:100%;background:linear-gradient(90deg, var(--red), var(--yellow));width:${currentStepIdx >= 0 ? (currentStepIdx / (steps.length - 1)) * 100 : 0}%;transition:width 0.5s ease"></div>
      </div>
  `;

  timelineHtml += steps.map((s, idx) => {
    const isDone = idx <= currentStepIdx;
    const isActive = idx === currentStepIdx;
    let icon = "📥";
    if (s === 'confirmed') icon = "✓";
    if (s === 'preparing') icon = "🍳";
    if (s === 'ready') icon = "🛵";
    if (s === 'delivered') icon = "🎉";

    let dotClass = "live-timeline-dot";
    if (isActive) dotClass += " active";
    else if (isDone) dotClass += " done";

    return `
      <div class="live-timeline-step">
        <div class="${dotClass}">
          ${icon}
        </div>
        <span style="font-size:10px;font-weight:800;color:${isActive ? 'var(--yellow)' : (isDone ? 'var(--text-primary)' : 'var(--text-muted)')};margin-top:8px;text-transform:uppercase;letter-spacing:0.5px">${s}</span>
      </div>
    `;
  }).join('') + '</div>';

  const isCompleted = order.status === 'delivered' || order.status === 'rejected';

  // WhatsApp template content
  const trackingUrl = `${window.location.origin}/track?order=${order.id}`;
  const whatsappMsg = `Hi! I placed an order with Momo Tantra! 🥟\nOrder ID: #${order.id}\nStatus: ${order.status.toUpperCase()}\nItems: ${order.items.map(i => i.name + ' x' + i.qty).join(', ')}\nTotal: ₹${order.total}\nTrack live here: ${trackingUrl}`;
  const whatsappShareLink = `https://wa.me/?text=${encodeURIComponent(whatsappMsg)}`;
  const waContactLink = `https://wa.me/919007993582?text=Hi%20Momo%20Tantra%2C%20checking%20status%20for%20order%20%23${order.id}`;

  // Preserve collapsed/expanded state if user has interacted
  const contentEl = document.getElementById('hub-collapsible-content');
  const wasHidden = contentEl ? contentEl.style.display === 'none' : false;

  hubEl.innerHTML = `
    <div class="hub-glass-wrapper animate-on-scroll visible">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px">
        <div>
          <div style="display:flex;align-items:center;gap:8px">
            <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:var(--green);box-shadow:0 0 10px var(--green);animation:pulse 1.5s infinite"></span>
            <span style="font-size:12px;font-weight:800;color:var(--yellow);text-transform:uppercase;letter-spacing:1.5px">Live Order Tracking Hub</span>
          </div>
          <h3 style="font-size:20px;font-weight:900;margin-top:4px">Order <span style="color:var(--red)">#${order.id}</span></h3>
        </div>
        
        <div style="display:flex;gap:8px;align-items:center">
          ${isCompleted ? `
            <button class="btn btn-outline btn-sm" onclick="clearLiveOrderHub()" style="border-color:var(--red);color:var(--red);border-radius:var(--radius-sm)">✕ Clear Tracker</button>
          ` : `
            <button class="btn btn-outline btn-sm" onclick="toggleHubMinimize(this)" style="border-radius:var(--radius-sm)">${wasHidden ? '➕ Expand' : '➖ Minimize'}</button>
          `}
          <a href="/track?order=${order.id}" class="btn btn-outline btn-sm" style="text-decoration:none;border-radius:var(--radius-sm)">🌐 Open Full Track</a>
        </div>
      </div>

      <div id="hub-collapsible-content" style="display:${wasHidden ? 'none' : 'block'}">
        <!-- Status summary card -->
        <div style="margin-top:16px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);padding:14px;border-radius:var(--radius-md)">
          <div style="font-size:17px;font-weight:800;color:var(--red)">${statusText}</div>
          <div style="font-size:13px;color:var(--text-secondary);margin-top:2px">${statusDesc}</div>
        </div>

        <!-- Stepper timeline -->
        ${timelineHtml}

        <!-- Order details summary -->
        <div style="display:flex;justify-content:space-between;align-items:center;font-size:13px;color:var(--text-secondary);border-top:1px solid rgba(255,255,255,0.05);padding-top:12px;margin-top:16px;flex-wrap:wrap;gap:8px">
          <div>
            <span>Items: <strong>${order.items.map(i => i.name + ' ×' + i.qty).join(', ')}</strong></span>
          </div>
          <div>
            <span>Total Paid: <strong style="color:var(--yellow);font-size:15px">₹${order.total}</strong></span>
          </div>
        </div>

        <!-- Real-time actions sharing -->
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:20px;border-top:1px solid rgba(255,255,255,0.05);padding-top:16px;flex-wrap:wrap;gap:12px">
          <div style="font-size:12px;color:var(--text-muted)">
            * Live updates syncing automatically with kitchen logs.
          </div>
          <div style="display:flex;gap:8px">
            <a href="${whatsappShareLink}" target="_blank" class="btn btn-yellow btn-sm" style="background:#00e676;color:#000;border:none;font-weight:800">
              💬 Share Status
            </a>
            <a href="${waContactLink}" target="_blank" class="btn btn-outline btn-sm">
              🧑‍🍳 WhatsApp Kitchen
            </a>
          </div>
        </div>
      </div>
    </div>
  `;
}

function shareOnWhatsApp(order) {
  const trackingUrl = `${window.location.origin}/track?order=${order.id}`;
  const whatsappMsg = `Hi! I placed an order with Momo Tantra! 🥟\nOrder ID: #${order.id}\nStatus: PLACED\nItems: ${order.items.map(i => i.name + ' x' + i.qty).join(', ')}\nTotal: ₹${order.total}\nTrack live here: ${trackingUrl}`;
  window.open(`https://wa.me/?text=${encodeURIComponent(whatsappMsg)}`, '_blank');
}

// ── CUSTOMIZATION HELPERS ──────────────────────────────
let currentCustItemId = null;
let currentCustImage = null;

function openCustomization(itemId) {
  currentCustItemId = itemId;
  currentCustImage = null;
  
  const item = allMenu.find(i => i.id === itemId);
  if (!item) return;

  const previewEl = document.getElementById('cust-item-preview');
  if (previewEl) {
    previewEl.innerHTML = `
      <img src="${item.image}" style="width:50px;height:50px;border-radius:var(--radius-sm);object-fit:cover;border:1px solid var(--border)" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 50 50%22><rect width=%2250%22 height=%2250%22 fill=%22%231a0000%22/><text x=%2250%25%22 y=%2255%25%22 font-size=%2224%22 text-anchor=%22middle%22>🥟</text></svg>'">
      <div>
        <strong style="color:var(--text-primary)">${item.name}</strong>
        <div style="font-size:12px;color:var(--yellow)">₹${item.price} / ${item.servingSize}</div>
      </div>
    `;
  }

  document.getElementById('cust-text').value = '';
  document.getElementById('cust-notes').value = '';
  const imgPreview = document.getElementById('cust-img-preview');
  if (imgPreview) { imgPreview.style.display = 'none'; imgPreview.src = ''; }
  const dropzoneText = document.querySelector('#cust-dropzone p');
  if (dropzoneText) dropzoneText.textContent = 'Drag & drop or Click to upload photo';

  document.getElementById('customization-modal').style.display = 'flex';
  
  document.getElementById('cust-save-btn').onclick = () => saveCustomizationAndAdd(item);
}

function handleCustFileSelect(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    currentCustImage = e.target.result;
    const imgPreview = document.getElementById('cust-img-preview');
    if (imgPreview) {
      imgPreview.src = currentCustImage;
      imgPreview.style.display = 'block';
    }
    const dropzoneText = document.querySelector('#cust-dropzone p');
    if (dropzoneText) dropzoneText.textContent = 'Photo attached successfully!';
  };
  reader.readAsDataURL(file);
}

function closeCustomization() {
  document.getElementById('customization-modal').style.display = 'none';
}

function saveCustomizationAndAdd(item) {
  const customText = document.getElementById('cust-text').value.trim();
  const customNotes = document.getElementById('cust-notes').value.trim();

  const ex = cart.find(c => c.id === item.id && c.customText === customText && c.customImage === currentCustImage && c.customNotes === customNotes);
  
  if (ex) {
    ex.qty++;
  } else {
    cart.push({
      id: item.id,
      name: item.name,
      price: item.price,
      image: item.image,
      qty: 1,
      customText: customText || null,
      customImage: currentCustImage || null,
      customNotes: customNotes || null
    });
  }

  saveCart();
  updateCartUI();
  refreshMenuCardButtons(item.id);
  closeCustomization();
  showToast(`🛒 ${item.name} customized & added!`);
}

// ── ONLINE PAYMENT SIMULATOR HELPERS ────────────────────
let paymentSuccessCallback = null;
let paymentTimerInterval = null;

function openOnlinePaymentModal(amount, onSuccess) {
  paymentSuccessCallback = onSuccess;
  document.getElementById('pay-amount-label').textContent = `₹${amount}`;
  document.getElementById('online-payment-modal').style.display = 'flex';
  
  setPayTab('upi');
  
  let duration = 180;
  const timerEl = document.getElementById('pay-timer');
  if (paymentTimerInterval) clearInterval(paymentTimerInterval);
  
  paymentTimerInterval = setInterval(() => {
    const mins = Math.floor(duration / 60).toString().padStart(2, '0');
    const secs = (duration % 60).toString().padStart(2, '0');
    if (timerEl) timerEl.textContent = `${mins}:${secs}`;
    if (duration <= 0) {
      clearInterval(paymentTimerInterval);
      showToast('❌ Payment QR expired. Please retry.');
      cancelPayment();
    }
    duration--;
  }, 1000);
}

function setPayTab(tab) {
  document.getElementById('pay-content-upi').style.display = tab === 'upi' ? 'block' : 'none';
  document.getElementById('pay-content-card').style.display = tab === 'card' ? 'block' : 'none';
  
  document.getElementById('tab-upi').classList.toggle('active-tab-btn', tab === 'upi');
  document.getElementById('tab-card').classList.toggle('active-tab-btn', tab === 'card');
}

function cancelPayment() {
  document.getElementById('online-payment-modal').style.display = 'none';
  if (paymentTimerInterval) clearInterval(paymentTimerInterval);
  const placeBtn = document.querySelector('#checkout-modal .btn-primary[onclick="placeOrder()"]');
  if (placeBtn) { placeBtn.disabled = false; placeBtn.textContent = '✅ Place Order'; }
}

function formatCardNum(input) {
  let v = input.value.replace(/\D/g, '');
  let formatted = v.match(/.{1,4}/g)?.join(' ') || '';
  input.value = formatted;
  document.getElementById('card-num-preview').textContent = formatted || '•••• •••• •••• ••••';
}

function formatCardExpiry(input) {
  let v = input.value.replace(/\D/g, '');
  if (v.length > 2) {
    input.value = v.substring(0, 2) + '/' + v.substring(2, 4);
  } else {
    input.value = v;
  }
  document.getElementById('card-expiry-preview').textContent = input.value || 'MM/YY';
}

function formatCardName(input) {
  document.getElementById('card-name-preview').textContent = input.value.toUpperCase() || 'YOUR NAME';
}

function submitSimulatedPayment() {
  const submitBtn = document.getElementById('pay-submit-btn');
  submitBtn.disabled = true;
  submitBtn.textContent = '🔒 Processing Payment...';
  
  setTimeout(() => {
    submitBtn.textContent = '✅ Payment Successful!';
    setTimeout(() => {
      document.getElementById('online-payment-modal').style.display = 'none';
      if (paymentTimerInterval) clearInterval(paymentTimerInterval);
      submitBtn.disabled = false;
      submitBtn.textContent = '💸 Complete Payment';
      if (paymentSuccessCallback) paymentSuccessCallback();
    }, 1000);
  }, 2000);
}

// -- USER AUTHENTICATION ----------------------------------
let currentUser = null;

function toggleAuthForm(type) {
  if (type === 'login') {
    document.getElementById('auth-login-form').style.display = 'block';
    document.getElementById('auth-register-form').style.display = 'none';
  } else {
    document.getElementById('auth-login-form').style.display = 'none';
    document.getElementById('auth-register-form').style.display = 'block';
  }
}

function openAuthModal() {
  document.getElementById('auth-modal').style.display = 'flex';
  if (currentUser) {
    document.getElementById('auth-login-form').style.display = 'none';
    document.getElementById('auth-register-form').style.display = 'none';
    document.getElementById('auth-profile-view').style.display = 'block';
    document.getElementById('auth-orders-view').style.display = 'none';
    document.getElementById('auth-profile-name').textContent = currentUser.name;
    document.getElementById('auth-profile-email').textContent = currentUser.email;
    document.getElementById('auth-modal-title').textContent = '👤 My Profile';
  } else {
    toggleAuthForm('login');
    document.getElementById('auth-profile-view').style.display = 'none';
    document.getElementById('auth-orders-view').style.display = 'none';
    document.getElementById('auth-modal-title').textContent = '👤 Login to Your Account';
    // Initialize/render Google Sign-in button when opening login modal
    setTimeout(initGoogleSignIn, 100);
  }
}

function closeAuthModal() {
  document.getElementById('auth-modal').style.display = 'none';
}

async function handleLogin() {
  const email = document.getElementById('auth-login-email').value;
  const password = document.getElementById('auth-login-pass').value;
  if(!email || !password) return showToast('🔑 Enter email and password');
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if(data.success) {
      localStorage.setItem('mt_token', data.token);
      currentUser = data.user;
      showToast('🎉 Login successful!');
      closeAuthModal();
      updateAuthUI();
    } else {
      showToast('❌ ' + data.message);
    }
  } catch(e) { showToast('⚠️ Login failed'); }
}

async function handleRegister() {
  const name = document.getElementById('auth-reg-name').value;
  const email = document.getElementById('auth-reg-email').value;
  const phone = document.getElementById('auth-reg-phone').value;
  const password = document.getElementById('auth-reg-pass').value;
  if(!name || !email || !password) return showToast('⚠️ Name, email, and password required');
  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, phone, password })
    });
    const data = await res.json();
    if(data.success) {
      localStorage.setItem('mt_token', data.token);
      currentUser = data.user;
      showToast('🎉 Account created! Welcome!');
      closeAuthModal();
      updateAuthUI();
    } else {
      showToast('❌ ' + data.message);
    }
  } catch(e) { showToast('⚠️ Registration failed'); }
}

function handleLogout() {
  localStorage.removeItem('mt_token');
  currentUser = null;
  showToast('👋 Logged out');
  closeAuthModal();
  updateAuthUI();
}

async function checkAuthStatus() {
  const token = localStorage.getItem('mt_token');
  if(!token) return;
  try {
    const res = await fetch('/api/auth/me', { headers: { 'Authorization': `Bearer ${token}` } });
    const data = await res.json();
    if(data.success) {
      currentUser = data.user;
      updateAuthUI();
    } else {
      localStorage.removeItem('mt_token');
    }
  } catch(e) {}
}

function updateAuthUI() {
  const authBtn = document.getElementById('auth-btn');
  if(!authBtn) return;
  if (currentUser) {
    authBtn.innerHTML = '<span style="font-size:16px">👤</span> <span style="font-size:12px;font-weight:700;color:var(--yellow)">'+currentUser.name.split(' ')[0]+'</span>';
    
    // Auto-fill checkout fields if they exist
    const coName = document.getElementById('co-name');
    const coEmail = document.getElementById('co-email');
    const coPhone = document.getElementById('co-phone');
    if(coName && !coName.value) coName.value = currentUser.name;
    if(coEmail && !coEmail.value) coEmail.value = currentUser.email;
    if(coPhone && !coPhone.value) coPhone.value = currentUser.phone;
  } else {
    authBtn.innerHTML = '👤';
  }
}

// ── MOBILE DRAWER CONTROLLERS ────────────────────────────
function openMobileDrawer() {
  const drawer = document.getElementById('mobile-drawer');
  const overlay = document.getElementById('mobile-drawer-overlay');
  if (drawer && overlay) {
    drawer.classList.add('open');
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
}

function closeMobileDrawer() {
  const drawer = document.getElementById('mobile-drawer');
  const overlay = document.getElementById('mobile-drawer-overlay');
  if (drawer && overlay) {
    drawer.classList.remove('open');
    overlay.classList.remove('open');
    document.body.style.overflow = '';
  }
}

function syncDrawerToggle() {
  const drawerSw = document.getElementById('drawer-brand-toggle-switch');
  const drawerLogo = document.getElementById('drawer-logo-img');
  const drawerBrandName = document.getElementById('drawer-brand-name');
  
  if (activeBrand === 'ichheydotcom') {
    drawerSw?.classList.add('active');
    if (drawerLogo) drawerLogo.src = '/images/ichhey_logo.jpg';
    if (drawerBrandName) {
      drawerBrandName.textContent = 'Ichheydotcom';
      drawerBrandName.style.color = 'var(--yellow)';
    }
  } else {
    drawerSw?.classList.remove('active');
    if (drawerLogo) drawerLogo.src = '/images/logo.jpg';
    if (drawerBrandName) {
      drawerBrandName.textContent = 'MoMo Tantra';
      drawerBrandName.style.color = 'var(--red)';
    }
  }
}

// ── GOOGLE SIGN IN ───────────────────────────────────────
function initGoogleSignIn() {
  if (typeof google === 'undefined') {
    setTimeout(initGoogleSignIn, 500);
    return;
  }
  
  try {
    google.accounts.id.initialize({
      client_id: '714088019053-9sdbj4dhlgl1s15c1g8h91h25r29vmo9.apps.googleusercontent.com',
      callback: handleGoogleSignInResponse,
      auto_select: false,
      cancel_on_tap_outside: true
    });
    
    const btn = document.getElementById('google-signin-btn');
    if (btn) {
      google.accounts.id.renderButton(btn, {
        type: 'standard',
        theme: 'filled_blue',
        size: 'large',
        text: 'signin_with',
        shape: 'rectangular',
        logo_alignment: 'left',
        width: 320
      });
    }
  } catch (err) {
    console.error("Google Identity Service initialization failed", err);
  }
}

async function handleGoogleSignInResponse(response) {
  try {
    const res = await fetch('/api/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: response.credential })
    });
    const data = await res.json();
    if (data.success) {
      localStorage.setItem('mt_token', data.token);
      currentUser = data.user;
      showToast('🎉 Login successful with Google!');
      closeAuthModal();
      updateAuthUI();
    } else {
      showToast('❌ Google auth failed: ' + data.message);
    }
  } catch (e) {
    console.error("Google Auth error", e);
    showToast('❌ Google authentication error');
  }
}

// ── USER ORDER HISTORY ───────────────────────────────────
async function loadMyOrders() {
  if (!currentUser || !currentUser.email) return;
  const listEl = document.getElementById('auth-orders-list');
  const profileView = document.getElementById('auth-profile-view');
  const ordersView = document.getElementById('auth-orders-view');
  
  if (!listEl || !profileView || !ordersView) return;
  
  profileView.style.display = 'none';
  ordersView.style.display = 'block';
  listEl.innerHTML = '<div style="text-align:center;padding:20px;color:var(--yellow)">⏳ Loading orders...</div>';
  
  try {
    const res = await api.get('/orders?email=' + encodeURIComponent(currentUser.email));
    if (!res.success || !res.data || !res.data.length) {
      listEl.innerHTML = '<div style="text-align:center;padding:30px;color:var(--text-secondary);font-size:13px">No orders found yet. Order some delicious food or gifts!</div>';
      return;
    }
    
    // Sort by timestamp descending
    const orders = res.data.sort((a, b) => b.timestamp - a.timestamp);
    
    listEl.innerHTML = orders.map(o => {
      const dateStr = formatDate(o.timestamp);
      let statusColor = 'var(--text-secondary)';
      if (o.status === 'delivered') statusColor = 'var(--green)';
      else if (o.status === 'rejected') statusColor = 'var(--red)';
      else if (o.status === 'placed') statusColor = 'var(--yellow)';
      else statusColor = 'var(--yellow)';
      
      const itemsSummary = o.items.map(i => `${i.name} ×${i.qty}`).join(', ');
      
      return `
        <div class="past-order-card" style="background:rgba(255,255,255,0.02);border:1px solid var(--border);border-radius:var(--radius-md);padding:12px;margin-bottom:10px;text-align:left;position:relative;transition:0.2s" onmouseover="this.style.borderColor='var(--yellow)'" onmouseout="this.style.borderColor='var(--border)'">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
            <span style="font-weight:800;color:var(--red);font-size:13px">#${o.id}</span>
            <span style="font-size:11px;color:${statusColor};text-transform:uppercase;font-weight:700">${o.status}</span>
          </div>
          <div style="font-size:11px;color:var(--text-secondary);margin-bottom:6px">${dateStr}</div>
          <div style="font-size:12px;color:var(--text-secondary);margin-bottom:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${itemsSummary}">${itemsSummary}</div>
          <div style="display:flex;justify-content:space-between;align-items:center;border-top:1px solid rgba(255,255,255,0.05);padding-top:8px">
            <span style="font-weight:700;color:var(--yellow);font-size:14px">₹${o.total}</span>
            <button class="btn btn-outline btn-sm" onclick="viewOrderTracking('${o.id}')" style="padding:4px 10px;font-size:11px;border-radius:var(--radius-sm)">🛵 Track</button>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    listEl.innerHTML = '<div style="text-align:center;padding:20px;color:var(--red)">⚠️ Failed to load orders</div>';
  }
}

function showProfileMain() {
  const profileView = document.getElementById('auth-profile-view');
  const ordersView = document.getElementById('auth-orders-view');
  if (profileView && ordersView) {
    profileView.style.display = 'block';
    ordersView.style.display = 'none';
  }
}

function viewOrderTracking(orderId) {
  closeAuthModal();
  document.getElementById('track-order-id').value = orderId;
  openOrderHub();
  fetchTrackingData(orderId);
}

// Check auth on load
document.addEventListener('DOMContentLoaded', checkAuthStatus);

// -- EMBEDDED TRACKING ------------------------------------
function openOrderHub() {
  document.getElementById('live-order-hub').style.display = 'block';
  document.getElementById('live-order-hub').scrollIntoView({ behavior: 'smooth' });
}

function closeOrderHub() {
  document.getElementById('live-order-hub').style.display = 'none';
}

async function fetchTrackingData(orderId) {
  const id = orderId || document.getElementById('track-order-id').value.trim();
  if (!id) return showToast('?? Enter an Order ID');
  const resultEl = document.getElementById('tracking-result');
  resultEl.innerHTML = '<div style="text-align:center;padding:20px;color:var(--yellow)">? Searching...</div>';
  try {
    const res = await fetch(`/api/orders/${id}`);
    const data = await res.json();
    if (!data.success) {
      resultEl.innerHTML = `<div style="color:var(--red);text-align:center;padding:20px">? Order not found. Check the ID and try again.</div>`;
      return;
    }
    const o = data.data;
    
    // Format statuses
    const statuses = ['placed', 'confirmed', 'preparing', 'ready', 'out-for-delivery', 'delivered'];
    const currentIdx = statuses.indexOf(o.status);
    let timelineHtml = `<div class="tracking-timeline">`;
    statuses.forEach((st, idx) => {
      let icon = '?';
      if(st === 'placed') icon = '??';
      if(st === 'confirmed') icon = '?';
      if(st === 'preparing') icon = '?????';
      if(st === 'ready') icon = '???';
      if(st === 'out-for-delivery') icon = '??';
      if(st === 'delivered') icon = '??';
      
      const isPast = idx <= currentIdx;
      const isCurrent = idx === currentIdx;
      let color = isPast ? 'var(--green)' : 'var(--border2)';
      if (isCurrent) color = 'var(--yellow)';
      
      timelineHtml += `
        <div style="display:flex;align-items:center;margin-bottom:12px;opacity:${isPast ? 1 : 0.4}">
          <div style="width:30px;height:30px;border-radius:50%;background:${color};display:flex;align-items:center;justify-content:center;font-size:14px;margin-right:12px">${icon}</div>
          <div style="flex:1">
            <div style="font-weight:700;color:${isCurrent ? 'var(--yellow)' : 'var(--text-primary)'}">${st.toUpperCase().replace(/-/g, ' ')}</div>
            ${isCurrent ? '<div style="font-size:11px;color:var(--text-muted)">Current status</div>' : ''}
          </div>
        </div>
      `;
    });
    timelineHtml += `</div>`;
    
    resultEl.innerHTML = `
      <div style="background:rgba(0,0,0,0.3);padding:16px;border-radius:var(--radius-md);border:1px solid var(--border)">
        <div style="display:flex;justify-content:space-between;margin-bottom:16px;border-bottom:1px solid var(--border2);padding-bottom:12px">
          <div><div style="font-size:11px;color:var(--text-muted)">Order ID</div><div style="font-weight:900;color:var(--red)">#${o.id}</div></div>
          <div style="text-align:right"><div style="font-size:11px;color:var(--text-muted)">Total</div><div style="font-weight:900;color:var(--yellow)">?${o.total}</div></div>
        </div>
        ${timelineHtml}
        <div style="margin-top:16px;font-size:12px;color:var(--text-secondary)">
          <strong>Items:</strong> ${o.items.map(i => i.name + ' �' + i.qty).join(', ')}
        </div>
      </div>
    `;
  } catch(e) {
    resultEl.innerHTML = `<div style="color:var(--red);text-align:center;padding:20px">? Error fetching order status.</div>`;
  }
}

// Redirect handling if ?track=ID is in URL
document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const trackId = urlParams.get('track');
  if (trackId) {
    document.getElementById('track-order-id').value = trackId;
    openOrderHub();
    fetchTrackingData(trackId);
  }
});

// --- DYNAMIC 3D TILT EFFECT FOR CARDS ---
function initTiltEffects() {
  document.addEventListener('mousemove', (e) => {
    const card = e.target.closest('.tilt-3d');
    if (!card) return;
    
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const rotateX = ((centerY - y) / centerY) * 10;
    const rotateY = ((x - centerX) / centerX) * 10;
    
    card.style.transform = `translateY(-6px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
  });
  
  document.addEventListener('mouseout', (e) => {
    const card = e.target.closest('.tilt-3d');
    if (!card) return;
    
    const related = e.relatedTarget;
    if (related && card.contains(related)) return;
    
    card.style.transform = '';
  });
}

// --- STOREFRONT AUTO-SYNC POLLING ---
async function startStorefrontPolling() {
  try {
    const [menuRes, catRes] = await Promise.all([
      api.get('/menu'),
      api.get('/categories')
    ]);
    lastMenuState = JSON.stringify(menuRes.data);
    lastCategoriesState = JSON.stringify(catRes.data);
  } catch (e) {
    console.error("Failed to initialize sync polling cache", e);
  }

  setInterval(async () => {
    try {
      const checkoutModal = document.getElementById('checkout-modal');
      if (checkoutModal && checkoutModal.classList.contains('open')) return;
      
      const [menuRes, catRes] = await Promise.all([
        api.get('/menu' + (menuSearchQuery ? `?search=${encodeURIComponent(menuSearchQuery)}` : '')),
        api.get('/categories')
      ]);
      
      const currentMenuStr = JSON.stringify(menuRes.data);
      const currentCatsStr = JSON.stringify(catRes.data);
      
      if (currentMenuStr !== lastMenuState || currentCatsStr !== lastCategoriesState) {
        lastMenuState = currentMenuStr;
        lastCategoriesState = currentCatsStr;
        
        renderMenu(menuSearchQuery);
        console.log("Storefront updated dynamically due to backend updates.");
      }
    } catch (e) {
      console.error("Storefront sync error:", e);
    }
  }, 8000);
}
