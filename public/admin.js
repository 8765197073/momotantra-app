// ============================================================
//  MOMO TANTRA — ADMIN PANEL (API-backed)
// ============================================================

let adminToken = localStorage.getItem('mt_admin_token') || null;

// Dynamically load and filter category selector options by brand
async function updateCategorySelect(brand) {
  try {
    const { data } = await api.get('/categories');
    const select = document.getElementById('item-category');
    if (!select) return;
    const filtered = data.filter(c => !c.brand || c.brand === brand);
    select.innerHTML = filtered.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  } catch (e) {
    console.error('Failed to load categories for select dropdown', e);
  }
}


document.addEventListener('DOMContentLoaded', () => {
  updateClock();
  setInterval(updateClock, 1000);
  setInterval(updateBadges, 20000);
  if (window.innerWidth < 768) document.getElementById('sidebar-toggle').style.display = 'block';
  if (adminToken) showAdminPanel();
  
  // Attach brand change listener to product form
  document.getElementById('item-brand')?.addEventListener('change', (e) => {
    updateCategorySelect(e.target.value);
  });
  updateCategorySelect('momotantra');
});

function updateClock() {
  const el = document.getElementById('admin-time');
  if (el) el.textContent = new Date().toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit', second:'2-digit' });
}

// ── AUTH ────────────────────────────────────────────────
async function doLogin() {
  const user = document.getElementById('login-user')?.value?.trim();
  const pass = document.getElementById('login-pass')?.value?.trim();
  const errEl = document.getElementById('login-error');
  try {
    const res = await api.post('/auth/login', { username: user, password: pass });
    if (res.success) {
      adminToken = res.token;
      localStorage.setItem('mt_admin_token', adminToken);
      showAdminPanel();
    }
  } catch (e) {
    if (errEl) { errEl.style.display = 'block'; errEl.textContent = '❌ Invalid credentials. Try admin / momotantra123'; }
  }
}

function showAdminPanel() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('admin-panel').style.display  = 'block';
  window.currentAdminPage = 'dashboard';
  refreshAll();
}

function doLogout() {
  adminToken = null;
  localStorage.removeItem('mt_admin_token');
  document.getElementById('admin-panel').style.display = 'none';
  document.getElementById('login-screen').style.display = 'flex';
}

// ── NAV ─────────────────────────────────────────────────
function showPage(pageId, btn) {
  window.currentAdminPage = pageId;
  document.querySelectorAll('.admin-page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.admin-nav-item').forEach(b => b.classList.remove('active'));
  document.getElementById('page-' + pageId)?.classList.add('active');
  if (btn) btn.classList.add('active');
  const titles = { dashboard:'Dashboard', operations:'Operations Control', orders:'Orders', menu:'Menu Management', coupons:'Coupons & Offers', reviews:'Reviews', customers:'Customer Database', restaurant:'Restaurant Info', logs:'Live Logs' };
  document.getElementById('page-title').textContent = titles[pageId] || pageId;

  // Clear operations pooling intervals if switching away
  if (pageId !== 'operations') {
    if (window._opsInterval) { clearInterval(window._opsInterval); window._opsInterval = null; }
    if (window._opsLogInterval) { clearInterval(window._opsLogInterval); window._opsLogInterval = null; }
  }

  const loaders = { dashboard: loadDashboard, operations: loadOperationsPage, orders: renderOrdersTable, menu: renderMenuTable,
    coupons: renderCouponsTable, reviews: renderReviewsAdmin, customers: renderCustomersTable,
    restaurant: loadRestaurantForm, logs: renderLogsPage };
  if (loaders[pageId]) loaders[pageId]();
  if (window.innerWidth < 768) document.getElementById('admin-sidebar')?.classList.remove('open');
}

function toggleSidebar() {
  document.getElementById('admin-sidebar')?.classList.toggle('open');
}

async function refreshAll() {
  await Promise.all([loadDashboard(), renderOrdersTable(), renderMenuTable(),
    renderCouponsTable(), renderReviewsAdmin(), renderCustomersTable(), updateBadges()]);
  showToast('🔄 Refreshed!');
}

async function updateBadges() {
  try {
    const { data: stats } = await api.get('/orders/admin/stats');
    const pb = document.getElementById('pending-badge');
    const ob = document.getElementById('orders-badge');
    if (pb) { pb.style.display = stats.pending > 0 ? 'inline-block' : 'none'; pb.textContent = stats.pending; }
    if (ob) { ob.style.display = stats.pending > 0 ? 'inline-block' : 'none'; ob.textContent = stats.pending; }

    const revs = (await api.get('/reviews?approved=false')).data;
    const rb = document.getElementById('reviews-badge');
    if (rb) { rb.style.display = revs.length > 0 ? 'inline-block' : 'none'; rb.textContent = revs.length; }
  } catch {}
}

// ── DASHBOARD ───────────────────────────────────────────
async function loadDashboard() {
  try {
    const [statsRes, ordersRes] = await Promise.all([
      api.get('/orders/admin/stats'),
      api.get('/orders?limit=5')
    ]);
    const s = statsRes.data;

    document.getElementById('stats-grid').innerHTML = `
      <div class="stat-card"><div class="stat-icon">📋</div><div><div class="stat-value">${s.total}</div><div class="stat-label">Total Orders</div><div class="stat-change">↑ All time</div></div></div>
      <div class="stat-card"><div class="stat-icon">💰</div><div><div class="stat-value">₹${s.revenue.toLocaleString()}</div><div class="stat-label">Revenue</div><div class="stat-change">Delivered orders</div></div></div>
      <div class="stat-card"><div class="stat-icon">⏳</div><div><div class="stat-value" style="color:var(--yellow)">${s.pending}</div><div class="stat-label">Pending</div><div class="stat-change" style="color:var(--yellow)">Need action!</div></div></div>
      <div class="stat-card"><div class="stat-icon">👥</div><div><div class="stat-value">${s.customers}</div><div class="stat-label">Customers</div><div class="stat-change">Unique phones</div></div></div>`;

    document.getElementById('today-stats').innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div style="background:var(--bg-card2);padding:16px;border-radius:var(--radius-md)"><div style="font-size:24px;font-weight:900">${s.todayOrders}</div><div style="font-size:12px;color:var(--text-muted)">Today's Orders</div></div>
        <div style="background:var(--bg-card2);padding:16px;border-radius:var(--radius-md)"><div style="font-size:24px;font-weight:900">₹${s.todayRevenue}</div><div style="font-size:12px;color:var(--text-muted)">Today's Revenue</div></div>
        <div style="background:var(--bg-card2);padding:16px;border-radius:var(--radius-md)"><div style="font-size:24px;font-weight:900">${s.delivered}</div><div style="font-size:12px;color:var(--text-muted)">Delivered</div></div>
        <div style="background:var(--bg-card2);padding:16px;border-radius:var(--radius-md)"><div id="menu-count-dash" style="font-size:24px;font-weight:900">—</div><div style="font-size:12px;color:var(--text-muted)">Menu Items</div></div>
      </div>`;

    api.get('/menu').then(r => {
      const el = document.getElementById('menu-count-dash');
      if (el) el.textContent = r.data.length;
    });

    const recentEl = document.getElementById('dashboard-recent-orders');
    const orders   = ordersRes.data;
    if (recentEl) {
      recentEl.innerHTML = orders.length ? orders.map(o => `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 20px;border-bottom:1px solid var(--border);font-size:13px;cursor:pointer" onclick="viewOrderDetail('${o.id}')">
          <div>
            <div style="font-weight:700;color:var(--red)">#${o.id}</div>
            <div style="color:var(--text-secondary)">${o.customerName} · ${o.items.length} item(s)</div>
          </div>
          <div style="text-align:right">
            <div style="font-weight:700">₹${o.total}</div>
            <span class="status-pill status-${o.status}">${o.status}</span>
          </div>
        </div>`).join('') :
        '<div style="padding:24px;text-align:center;color:var(--text-muted)">No orders yet</div>';
    }
    updateBadges();
  } catch (e) { console.error('Dashboard load error', e); }
}

// ── ORDERS ──────────────────────────────────────────────
async function renderOrdersTable() {
  const search = document.getElementById('order-search')?.value?.toLowerCase() || '';
  const status = document.getElementById('order-status-filter')?.value || '';
  try {
    const url = '/orders?' + (status ? `status=${status}&` : '') + 'limit=200';
    const { data: orders } = await api.get(url);
    let filtered = search ? orders.filter(o =>
      o.id.toLowerCase().includes(search) ||
      o.customerName.toLowerCase().includes(search) ||
      o.phone.includes(search)) : orders;

    document.getElementById('orders-count').textContent = filtered.length + ' orders';
    const tbody = document.getElementById('orders-tbody');
    if (!tbody) return;

    tbody.innerHTML = filtered.length ? filtered.map(o => `
      <tr>
        <td><strong style="color:var(--red);font-family:monospace">#${o.id}</strong></td>
        <td><div style="font-weight:600">${o.customerName}</div><div style="font-size:12px;color:var(--text-muted)">${o.phone}</div></td>
        <td style="max-width:200px;font-size:12px">${o.items.slice(0,2).map(i=>i.name+'×'+i.qty).join(', ')}${o.items.length>2?` +${o.items.length-2} more`:''}</td>
        <td><strong>₹${o.total}</strong></td>
        <td><span style="font-size:12px;background:var(--bg-card2);padding:3px 8px;border-radius:var(--radius-full)">${o.orderType||'delivery'}</span></td>
        <td><span class="status-pill status-${o.status}">${o.status}</span></td>
        <td style="font-size:12px;color:var(--text-secondary)">${formatDate(o.timestamp)}</td>
        <td>
          <div class="action-btns">
            <button class="action-btn action-btn-blue" onclick="viewOrderDetail('${o.id}')">👁</button>
            ${o.status==='placed' ? `
              <button class="action-btn action-btn-green" onclick="updateStatus('${o.id}','confirmed')">✅ Accept</button>
              <button class="action-btn action-btn-red" onclick="updateStatus('${o.id}','rejected')">❌ Reject</button>` : ''}
            ${o.status==='confirmed' ? `<button class="action-btn action-btn-yellow" onclick="updateStatus('${o.id}','preparing')">👨‍🍳 Prepare</button>` : ''}
            ${o.status==='preparing' ? `<button class="action-btn action-btn-green" onclick="updateStatus('${o.id}','ready')">🛵 Ready</button>` : ''}
            ${o.status==='ready' ? `<button class="action-btn action-btn-green" onclick="updateStatus('${o.id}','delivered')">🎉 Delivered</button>` : ''}
          </div>
        </td>
      </tr>`).join('') :
      '<tr><td colspan="8" style="text-align:center;padding:40px;color:var(--text-muted)">No orders found</td></tr>';
  } catch (e) { console.error('Orders load error', e); }
}

async function updateStatus(orderId, newStatus) {
  try {
    await api.put(`/orders/${orderId}/status`, { status: newStatus });
    const labels = { confirmed:'✅ Confirmed', rejected:'❌ Rejected', preparing:'👨‍🍳 Preparing', ready:'🛵 Ready!', delivered:'🎉 Delivered!' };
    showNotification(`Order #${orderId} — ${labels[newStatus]||newStatus}`, 'success');
    renderOrdersTable(); loadDashboard();
  } catch (e) { showToast('❌ ' + e.message); }
}

async function viewOrderDetail(orderId) {
  try {
    const { data: o } = await api.get(`/orders/${orderId}`);
    document.getElementById('order-detail-title').textContent = 'Order #' + o.id;
    document.getElementById('order-detail-body').innerHTML = `
      <div style="margin-bottom:16px">
        <span class="status-pill status-${o.status}">${o.status}</span>
        <span style="font-size:13px;color:var(--text-secondary);margin-left:12px">${formatDate(o.timestamp)}</span>
      </div>
      <div style="background:var(--bg-card2);border-radius:var(--radius-md);padding:16px;margin-bottom:16px">
        <div style="font-size:13px;font-weight:700;margin-bottom:8px;color:var(--text-secondary);text-transform:uppercase;letter-spacing:1px">Customer</div>
        <div><strong>${o.customerName}</strong></div>
        <div style="color:var(--text-secondary);font-size:13px">${o.phone}${o.email?' · '+o.email:''}</div>
        <div style="color:var(--text-secondary);font-size:13px;margin-top:4px">📍 ${o.address}</div>
        <div style="font-size:13px;margin-top:4px"><span style="color:var(--blue)">${o.orderType}</span> · <span style="color:var(--yellow)">${o.paymentMethod==='cod'?'Cash on Delivery':'Online'}</span></div>
        ${o.notes?`<div style="margin-top:8px;color:var(--yellow);font-size:13px">📝 ${o.notes}</div>`:''}
      </div>
      <div style="background:var(--bg-card2);border-radius:var(--radius-md);padding:16px">
        <div style="font-size:13px;font-weight:700;margin-bottom:12px;color:var(--text-secondary);text-transform:uppercase;letter-spacing:1px">Items</div>
        ${o.items.map(i=>`
          <div style="border-bottom:1px solid rgba(255,255,255,0.05);padding-bottom:8px;margin-bottom:8px">
            <div style="display:flex;justify-content:space-between;font-size:14px">
              <span><strong>${i.name}</strong> ×${i.qty}</span>
              <span>₹${i.price*i.qty}</span>
            </div>
            ${i.customText ? `<div style="font-size:12px;color:var(--yellow);margin-top:2px">✍️ Custom Text: "${i.customText}"</div>` : ''}
            ${i.customNotes ? `<div style="font-size:12px;color:var(--text-muted);margin-top:2px">📝 Instructions: ${i.customNotes}</div>` : ''}
            ${i.customImage ? `<div style="margin-top:4px"><a href="${i.customImage}" target="_blank" style="font-size:11px;color:var(--green);text-decoration:underline">🖼️ View Uploaded Photo</a></div>` : ''}
          </div>`).join('')}
        <div style="border-top:1px solid var(--border);margin-top:8px;padding-top:8px">
          ${o.discount>0?`<div style="display:flex;justify-content:space-between;font-size:13px;color:var(--green)"><span>🎁 Discount</span><span>-₹${o.discount}</span></div>`:''}
          <div style="display:flex;justify-content:space-between;font-size:18px;font-weight:900;margin-top:8px"><span>Total</span><span style="color:var(--red)">₹${o.total}</span></div>
        </div>
      </div>`;

    document.getElementById('order-detail-footer').innerHTML = `
      <div style="display:flex;gap:8px;flex-wrap:wrap;width:100%">
        ${o.status==='placed' ? `<button class="btn btn-primary" onclick="updateStatus('${o.id}','confirmed');closeOrderDetail()">✅ Accept</button><button class="btn btn-outline" style="color:var(--red)" onclick="updateStatus('${o.id}','rejected');closeOrderDetail()">❌ Reject</button>` : ''}
        ${o.status==='confirmed' ? `<button class="btn btn-yellow" onclick="updateStatus('${o.id}','preparing');closeOrderDetail()">👨‍🍳 Start Preparing</button>` : ''}
        ${o.status==='preparing' ? `<button class="btn btn-primary" onclick="updateStatus('${o.id}','ready');closeOrderDetail()">🛵 Mark Ready</button>` : ''}
        ${o.status==='ready' ? `<button class="btn btn-primary" onclick="updateStatus('${o.id}','delivered');closeOrderDetail()">🎉 Mark Delivered</button>` : ''}
        <button class="btn btn-outline" onclick="closeOrderDetail()" style="margin-left:auto">Close</button>
      </div>`;

    document.getElementById('order-detail-modal')?.classList.add('open');
    document.body.style.overflow = 'hidden';
  } catch (e) { showToast('Could not load order: ' + e.message); }
}

function closeOrderDetail() {
  document.getElementById('order-detail-modal')?.classList.remove('open');
  document.body.style.overflow = '';
}

// ── MENU ────────────────────────────────────────────────
async function renderMenuTable() {
  try {
    const { data } = await api.get('/menu');
    document.getElementById('menu-count').textContent = data.length + ' items';
    const tbody = document.getElementById('menu-tbody');
    if (!tbody) return;
    tbody.innerHTML = data.map(item => `
      <tr>
        <td>
          <span style="font-size:14px">${item.brand === 'ichheydotcom' ? '🎁' : '🥟'}</span> 
          <span style="font-size:11px;color:var(--text-muted)">${item.brand === 'ichheydotcom' ? 'Ichhey' : 'MoMo'}</span>
        </td>
        <td>
          <div style="display:flex;align-items:center;gap:10px">
            <img src="${item.image}" style="width:40px;height:40px;border-radius:var(--radius-sm);object-fit:cover" onerror="this.style.display='none'">
            <div>
              <div style="font-weight:700">${item.name}</div>
              ${item.isBestseller?'<span class="badge badge-red" style="font-size:10px">Bestseller</span>':''}
            </div>
          </div>
        </td>
        <td style="font-size:13px;color:var(--text-secondary)">${item.category.replace(/_/g,' ')}</td>
        <td><strong>₹${item.price}</strong> <span style="font-size:12px;color:var(--text-muted)">/ ${item.servingSize}</span></td>
        <td><span class="${item.isVeg?'tag-veg':'tag-nonveg'}"></span> <span style="font-size:12px;margin-left:4px">${item.isVeg?'Veg':'Non-Veg'}</span></td>
        <td>
          <label class="form-switch">
            <input type="checkbox" ${item.isAvailable?'checked':''} onchange="toggleItemAvail('${item.id}',this.checked)">
            <span class="switch"></span>
          </label>
        </td>
        <td>
          <div class="action-btns">
            <button class="action-btn action-btn-yellow" onclick="editMenuItem('${item.id}')">✏️ Edit</button>
            <button class="action-btn action-btn-red" onclick="deleteMenuItem('${item.id}')">🗑</button>
          </div>
        </td>
      </tr>`).join('');
  } catch (e) { console.error('Menu table error', e); }
}

async function saveMenuItem() {
  const id          = document.getElementById('edit-item-id')?.value;
  const name        = document.getElementById('item-name')?.value?.trim();
  const category    = document.getElementById('item-category')?.value;
  const brand       = document.getElementById('item-brand')?.value || 'momotantra';
  const price       = parseInt(document.getElementById('item-price')?.value);
  const serving     = document.getElementById('item-serving')?.value?.trim() || '1 serve';
  const description = document.getElementById('item-desc')?.value?.trim();
  const image       = document.getElementById('item-image')?.value?.trim() || '/images/chicken_momo.png';
  const isVeg       = document.getElementById('item-veg')?.checked;
  const isSpicy     = document.getElementById('item-spicy')?.checked;
  const isBestseller= document.getElementById('item-bestseller')?.checked;
  const isAvailable = document.getElementById('item-available')?.checked;

  if (!name || !price || !category) { showToast('Fill required fields'); return; }
  const body = { name, category, brand, price, servingSize: serving, description, image, isVeg, isSpicy, isBestseller, isAvailable };
  try {
    if (id) {
      await api.put(`/menu/${id}`, body);
      showNotification('✅ Item updated!', 'success');
    } else {
      await api.post('/menu', body);
      showNotification('✅ Item added!', 'success');
    }
    clearMenuForm(); renderMenuTable();
  } catch (e) { showToast('❌ ' + e.message); }
}

async function editMenuItem(itemId) {
  const { data } = await api.get(`/menu/${itemId}`);
  document.getElementById('edit-item-id').value       = data.id;
  document.getElementById('item-name').value          = data.name;
  document.getElementById('item-category').value      = data.category;
  if (document.getElementById('item-brand')) {
    document.getElementById('item-brand').value       = data.brand || 'momotantra';
  }
  await updateCategorySelect(data.brand || 'momotantra');
  document.getElementById('item-category').value      = data.category;
  document.getElementById('item-price').value         = data.price;
  document.getElementById('item-serving').value       = data.servingSize;
  document.getElementById('item-desc').value          = data.description;
  document.getElementById('item-image').value         = data.image;
  document.getElementById('item-veg').checked         = data.isVeg;
  document.getElementById('item-spicy').checked       = data.isSpicy;
  document.getElementById('item-bestseller').checked  = data.isBestseller;
  document.getElementById('item-available').checked   = data.isAvailable;
  document.getElementById('menu-form-title').textContent = '✏️ Edit: ' + data.name;
  document.getElementById('page-menu').scrollIntoView({ behavior: 'smooth' });
}

async function deleteMenuItem(itemId) {
  if (!confirm('Delete this menu item?')) return;
  try { await api.del(`/menu/${itemId}`); renderMenuTable(); showNotification('🗑 Item deleted', 'info'); }
  catch (e) { showToast('❌ ' + e.message); }
}

async function toggleItemAvail(itemId, val) {
  await api.put(`/menu/${itemId}`, { isAvailable: val });
  showToast(val ? '✅ Item enabled' : '⛔ Item disabled');
}

function clearMenuForm() {
  ['edit-item-id','item-name','item-price','item-serving','item-desc','item-image'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  const elBrand = document.getElementById('item-brand');
  if(elBrand) elBrand.value = 'momotantra';
  updateCategorySelect('momotantra');
  document.getElementById('item-veg').checked = false;
  document.getElementById('item-spicy').checked = false;
  document.getElementById('item-bestseller').checked = false;
  document.getElementById('item-available').checked = true;
  document.getElementById('menu-form-title').textContent = '➕ Add New Menu Item';
}

// ── CUSTOMERS ───────────────────────────────────────────
async function renderCustomersTable() {
  try {
    const { data } = await api.get('/auth/users');
    document.getElementById('customers-count').textContent = data.length + ' registered';
    const tbody = document.getElementById('customers-tbody');
    if (!tbody) return;
    tbody.innerHTML = data.length ? data.map(u => `
      <tr>
        <td>
          <div style="font-weight:700">${u.name}</div>
          <div style="font-size:11px;color:var(--text-muted)">ID: ${u.id}</div>
        </td>
        <td>${u.email}</td>
        <td>${u.phone || '-'}</td>
        <td style="font-size:12px;color:var(--text-secondary)">${formatDate(u.createdAt)}</td>
      </tr>
    `).join('') : '<tr><td colspan="4" style="text-align:center;padding:20px">No users found</td></tr>';
  } catch (e) { console.error('Error fetching customers', e); }
}

// ── COUPONS ─────────────────────────────────────────────
async function renderCouponsTable() {
  try {
    const { data } = await api.get('/coupons');
    const tbody = document.getElementById('coupons-tbody');
    if (!tbody) return;
    tbody.innerHTML = data.map((c,i) => `
      <tr>
        <td><strong style="font-family:monospace;color:var(--yellow)">${c.code}</strong></td>
        <td>${c.type === 'percent' ? 'Percentage' : 'Flat'}</td>
        <td><strong>${c.type==='percent'?c.discount+'%':'₹'+c.discount}</strong></td>
        <td>₹${c.minOrder}</td>
        <td style="font-size:13px;color:var(--text-secondary)">${c.description}</td>
        <td><label class="form-switch"><input type="checkbox" ${c.isActive?'checked':''} onchange="toggleCoupon('${c.code}',this.checked)"><span class="switch"></span></label></td>
        <td><div class="action-btns">
          <button class="action-btn action-btn-yellow" onclick="editCouponForm(${i})">✏️</button>
          <button class="action-btn action-btn-red" onclick="deleteCoupon('${c.code}')">🗑</button>
        </div></td>
      </tr>`).join('') || '<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--text-muted)">No coupons</td></tr>';
    window._coupons = data;
    renderOffersTable();
  } catch {}
}

async function saveCoupon() {
  const code     = document.getElementById('coupon-code')?.value?.trim().toUpperCase();
  const type     = document.getElementById('coupon-type')?.value;
  const value    = parseInt(document.getElementById('coupon-value')?.value);
  const minOrder = parseInt(document.getElementById('coupon-minorder')?.value) || 0;
  const desc     = document.getElementById('coupon-desc')?.value?.trim();
  const isActive = document.getElementById('coupon-active')?.checked;
  const editCode = document.getElementById('edit-coupon-code')?.value;
  if (!code || !value) { showToast('Fill required fields'); return; }
  try {
    if (editCode) {
      await api.put(`/coupons/${editCode}`, { discount: value, type, minOrder, description: desc, isActive });
    } else {
      await api.post('/coupons', { code, discount: value, type, minOrder, description: desc, isActive });
    }
    clearCouponForm(); renderCouponsTable();
    showNotification('✅ Coupon saved!', 'success');
  } catch (e) { showToast('❌ ' + e.message); }
}

function editCouponForm(idx) {
  const c = (window._coupons || [])[idx];
  if (!c) return;
  document.getElementById('edit-coupon-code').value   = c.code;
  document.getElementById('coupon-code').value        = c.code;
  document.getElementById('coupon-type').value        = c.type;
  document.getElementById('coupon-value').value       = c.discount;
  document.getElementById('coupon-minorder').value    = c.minOrder;
  document.getElementById('coupon-desc').value        = c.description;
  document.getElementById('coupon-active').checked    = c.isActive;
}

async function deleteCoupon(code) {
  if (!confirm('Delete coupon ' + code + '?')) return;
  await api.del(`/coupons/${code}`); renderCouponsTable();
}

async function toggleCoupon(code, active) {
  await api.put(`/coupons/${code}`, { isActive: active });
}

function clearCouponForm() {
  ['edit-coupon-code','coupon-code','coupon-value','coupon-minorder','coupon-desc'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  document.getElementById('coupon-active').checked = true;
}

async function addOffer() {
  const title  = document.getElementById('offer-title')?.value?.trim();
  const desc   = document.getElementById('offer-desc')?.value?.trim();
  const badge  = document.getElementById('offer-badge')?.value?.trim();
  const image  = document.getElementById('offer-image')?.value?.trim() || '🎉';
  const active = document.getElementById('offer-active')?.checked;
  if (!title) { showToast('Enter offer title'); return; }
  try {
    await api.post('/offers', { title, description: desc, badge, image, isActive: active });
    renderOffersTable(); showNotification('✅ Offer added!', 'success');
    ['offer-title','offer-desc','offer-badge','offer-image'].forEach(id => { const el = document.getElementById(id); if (el) el.value=''; });
  } catch (e) { showToast('❌ ' + e.message); }
}

async function renderOffersTable() {
  try {
    const { data } = await api.get('/offers');
    const tbody = document.getElementById('offers-tbody');
    if (!tbody) return;
    tbody.innerHTML = data.map((o,i) => `
      <tr>
        <td><span style="font-size:20px">${o.image}</span> <strong>${o.title}</strong></td>
        <td style="font-size:13px;color:var(--text-secondary)">${o.description}</td>
        <td><span class="badge badge-red">${o.badge}</span></td>
        <td><label class="form-switch"><input type="checkbox" ${o.isActive?'checked':''} onchange="toggleOffer('${o.id}',this.checked)"><span class="switch"></span></label></td>
        <td><button class="action-btn action-btn-red" onclick="deleteOffer('${o.id}')">🗑</button></td>
      </tr>`).join('') || '<tr><td colspan="5" style="text-align:center;padding:24px;color:var(--text-muted)">No offers</td></tr>';
  } catch {}
}

async function toggleOffer(id, active) { await api.put(`/offers/${id}`, { isActive: active }); }
async function deleteOffer(id) { await api.del(`/offers/${id}`); renderOffersTable(); }

// ── REVIEWS ─────────────────────────────────────────────
async function renderReviewsAdmin() {
  try {
    const { data } = await api.get('/reviews');
    const el = document.getElementById('reviews-admin-list');
    if (!el) return;
    el.innerHTML = data.length ? data.map(r => `
      <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-lg);padding:20px;margin-bottom:16px;border-left:4px solid ${r.isApproved?'var(--green)':'var(--yellow)'}">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap">
          <div style="flex:1">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
              <div style="width:40px;height:40px;border-radius:50%;background:var(--red);display:flex;align-items:center;justify-content:center;font-weight:700">${r.avatar}</div>
              <div>
                <div style="font-weight:700">${r.name}</div>
                <div style="font-size:12px;color:var(--text-muted)">${r.date}${r.phone?' · '+r.phone:''}</div>
              </div>
              <div style="margin-left:auto">${'⭐'.repeat(r.rating)}</div>
            </div>
            <div style="font-size:14px;color:var(--text-secondary);margin-bottom:12px">${r.comment}</div>
            ${r.ownerResponse?`<div style="background:rgba(230,57,70,0.08);padding:10px;border-radius:var(--radius-sm);font-size:13px"><strong style="color:var(--red)">Owner Response:</strong> ${r.ownerResponse}</div>`:''}
            <textarea class="form-textarea" id="resp-${r.id}" placeholder="Reply to this review..." style="margin-top:12px;min-height:60px;font-size:13px">${r.ownerResponse||''}</textarea>
            <button class="action-btn action-btn-blue" style="margin-top:6px" onclick="saveResponse('${r.id}')">💬 Save Response</button>
          </div>
          <div style="display:flex;flex-direction:column;gap:8px;flex-shrink:0">
            <span style="font-size:12px;font-weight:700;color:${r.isApproved?'var(--green)':'var(--yellow)'};text-align:center">${r.isApproved?'✅ Approved':'⏳ Pending'}</span>
            ${!r.isApproved?`<button class="action-btn action-btn-green" onclick="approveReview('${r.id}')">✅ Approve</button>`:''}
            <button class="action-btn action-btn-red" onclick="deleteReview('${r.id}')">🗑 Delete</button>
          </div>
        </div>
      </div>`).join('') : '<div style="text-align:center;padding:40px;color:var(--text-muted)">No reviews yet</div>';
    updateBadges();
  } catch {}
}

async function approveReview(id) {
  await api.put(`/reviews/${id}/approve`, {}); renderReviewsAdmin(); showNotification('✅ Review approved!', 'success');
}
async function deleteReview(id) {
  if (!confirm('Delete this review?')) return;
  await api.del(`/reviews/${id}`); renderReviewsAdmin();
}
async function saveResponse(id) {
  const resp = document.getElementById('resp-' + id)?.value?.trim();
  await api.put(`/reviews/${id}/respond`, { ownerResponse: resp || '' });
  showToast('💬 Response saved!');
}

// ── CUSTOMERS ───────────────────────────────────────────
async function renderCustomersTable() {
  try {
    const { data: orders } = await api.get('/orders?limit=500');
    const map = {};
    orders.forEach(o => {
      if (!map[o.phone]) map[o.phone] = { name: o.customerName, phone: o.phone, email: o.email||'', orders:0, spent:0, last:0 };
      map[o.phone].orders++;
      map[o.phone].spent += o.total;
      if (o.timestamp > map[o.phone].last) { map[o.phone].last = o.timestamp; map[o.phone].name = o.customerName; }
    });
    const customers = Object.values(map).sort((a,b) => b.last - a.last);
    document.getElementById('customers-count').textContent = customers.length + ' customers';
    const tbody = document.getElementById('customers-tbody');
    if (!tbody) return;
    tbody.innerHTML = customers.length ? customers.map(c => `
      <tr>
        <td><strong>${c.name}</strong></td>
        <td><a href="tel:${c.phone}" style="color:var(--red);text-decoration:none">${c.phone}</a></td>
        <td style="font-size:13px;color:var(--text-secondary)">${c.email||'—'}</td>
        <td><strong>${c.orders}</strong></td>
        <td><strong style="color:var(--green)">₹${c.spent}</strong></td>
        <td style="font-size:12px;color:var(--text-secondary)">${c.last?formatDate(c.last):'—'}</td>
        <td><div class="action-btns">
          <a href="tel:${c.phone}" class="action-btn action-btn-green" style="text-decoration:none">📞</a>
          <a href="https://wa.me/91${c.phone}" target="_blank" class="action-btn action-btn-blue" style="text-decoration:none">💬</a>
        </div></td>
      </tr>`).join('') : '<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--text-muted)">No customers yet</td></tr>';
  } catch {}
}

// ── RESTAURANT ──────────────────────────────────────────
async function loadRestaurantForm() {
  try {
    const { data: r } = await api.get('/restaurant');
    const fields = { name:r.name, tagline:r.tagline, phone1:r.phone1, phone2:r.phone2,
      whatsapp:r.whatsapp, email:r.email||'', open:r.openTime, close:r.closeTime,
      address:r.address, landmark:r.landmark, maplink:r.mapLink||'' };
    Object.entries(fields).forEach(([k,v]) => { const el = document.getElementById('r-'+k); if (el) el.value = v; });
    renderCategoriesList();
  } catch {}
}

async function saveRestaurantInfo() {
  try {
    const fields = { name:'r-name', tagline:'r-tagline', phone1:'r-phone1', phone2:'r-phone2',
      whatsapp:'r-whatsapp', email:'r-email', openTime:'r-open', closeTime:'r-close',
      address:'r-address', landmark:'r-landmark', mapLink:'r-maplink' };
    const body = {};
    Object.entries(fields).forEach(([k, elId]) => {
      const el = document.getElementById(elId); if (el) body[k] = el.value;
    });
    await api.put('/restaurant', body);
    showNotification('✅ Restaurant info updated!', 'success');
  } catch (e) { showToast('❌ ' + e.message); }
}

async function addCategory() {
  const id   = document.getElementById('cat-id')?.value?.trim().replace(/\s+/g,'_');
  const name = document.getElementById('cat-name')?.value?.trim();
  const icon = document.getElementById('cat-icon')?.value?.trim() || '🍽️';
  const badge= document.getElementById('cat-badge')?.value?.trim();
  if (!id || !name) { showToast('Enter category ID and name'); return; }
  try {
    await api.post('/categories', { id, name, icon, badge });
    renderCategoriesList(); showNotification('✅ Category added!', 'success');
  } catch (e) { showToast('❌ ' + e.message); }
}

async function renderCategoriesList() {
  try {
    const { data } = await api.get('/categories');
    const el = document.getElementById('cats-list');
    if (!el) return;
    el.innerHTML = `<div style="display:flex;flex-wrap:wrap;gap:10px">` +
      data.map(c => `
        <div style="background:var(--bg-card2);border:1px solid var(--border);border-radius:var(--radius-md);padding:10px 16px;display:flex;align-items:center;gap:8px">
          <span>${c.icon}</span><span style="font-size:14px;font-weight:600">${c.name}</span>
          <button style="background:none;border:none;color:var(--red);cursor:pointer;font-size:16px" onclick="deleteCategory('${c.id}')">×</button>
        </div>`).join('') + '</div>';
  } catch {}
}

async function deleteCategory(id) {
  if (!confirm('Delete this category?')) return;
  await api.del(`/categories/${id}`); renderCategoriesList();
}

// ── LOGS PAGE ───────────────────────────────────────────
async function renderLogsPage() {
  try {
    const { data, total } = await api.get('/logs?limit=200');
    const el = document.getElementById('logs-content');
    if (!el) return;
    el.innerHTML = `<div style="font-size:12px;color:var(--text-muted);margin-bottom:12px">${total} total log lines · showing last ${data.length}</div>` +
      `<pre style="font-family:monospace;font-size:12px;line-height:1.6;white-space:pre-wrap;color:var(--text-secondary)">${
        data.map(line => {
          if (line.includes('[ORDER')) return `<span style="color:var(--yellow)">${escHtml(line)}</span>`;
          if (line.includes('[ERROR')) return `<span style="color:var(--red)">${escHtml(line)}</span>`;
          if (line.includes('[SUCCESS')) return `<span style="color:var(--green)">${escHtml(line)}</span>`;
          if (line.includes('[HTTP'))  return `<span style="color:#a78bfa">${escHtml(line)}</span>`;
          if (line.includes('[SERVER')) return `<span style="color:var(--green)">${escHtml(line)}</span>`;
          return escHtml(line);
        }).join('\n')}</pre>`;
    el.scrollTop = el.scrollHeight;
  } catch (e) { console.error('Logs error', e); }
}

function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ── UNIFIED OPERATIONS COMMAND CENTER LOGIC ──────────────────
let selectedOpsOrderId = null;
let opsActiveOrders = [];

async function loadOperationsPage() {
  selectedOpsOrderId = null;
  opsActiveOrders = [];
  
  const detailsEl = document.getElementById('ops-order-details');
  const idleEl = document.getElementById('ops-no-order');
  if (detailsEl) detailsEl.style.display = 'none';
  if (idleEl) idleEl.style.display = 'flex';

  await refreshOpsActiveOrders();
  await pollOpsLogs();

  // Setup live loops
  if (window._opsInterval) clearInterval(window._opsInterval);
  window._opsInterval = setInterval(refreshOpsActiveOrders, 5000);

  if (window._opsLogInterval) clearInterval(window._opsLogInterval);
  window._opsLogInterval = setInterval(pollOpsLogs, 3000);
}

async function refreshOpsActiveOrders() {
  try {
    const { data: orders } = await api.get('/orders?limit=200');
    // Filter active orders (not delivered and not rejected)
    opsActiveOrders = orders.filter(o => o.status !== 'delivered' && o.status !== 'rejected');
    
    // Update badge count
    const badgeEl = document.getElementById('ops-badge');
    const countEl = document.getElementById('active-orders-count');
    if (badgeEl) {
      badgeEl.style.display = opsActiveOrders.length > 0 ? 'inline-block' : 'none';
      badgeEl.textContent = opsActiveOrders.length;
    }
    if (countEl) {
      countEl.textContent = opsActiveOrders.length;
    }

    const searchVal = document.getElementById('ops-search-input')?.value || '';
    renderOpsOrders(searchVal);
  } catch (e) {
    console.error('Ops active orders error', e);
  }
}

function filterOpsOrders() {
  const query = document.getElementById('ops-search-input')?.value || '';
  renderOpsOrders(query);
}

function renderOpsOrders(searchQuery = '') {
  const listEl = document.getElementById('ops-orders-list');
  if (!listEl) return;

  const query = searchQuery.toLowerCase().trim();
  const filtered = query ? opsActiveOrders.filter(o => 
    o.id.toLowerCase().includes(query) || 
    o.customerName.toLowerCase().includes(query) || 
    o.phone.includes(query)
  ) : opsActiveOrders;

  if (!filtered.length) {
    listEl.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-secondary)">No active orders matching "${escHtml(searchQuery)}"</div>`;
    return;
  }

  listEl.innerHTML = filtered.map(o => {
    const isSelected = o.id === selectedOpsOrderId;
    const timeAgo = formatTimeAgo(o.timestamp);
    return `
      <div class="ops-order-item ${isSelected ? 'selected' : ''}" onclick="selectOpsOrder('${o.id}')">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span class="ops-order-id">#${o.id}</span>
          <span class="status-pill status-${o.status}" style="font-size:10px;padding:2px 8px">${o.status}</span>
        </div>
        <div class="ops-order-meta">
          <span>${escHtml(o.customerName)}</span>
          <span>₹${o.total}</span>
        </div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:4px;text-align:right">Placed ${timeAgo}</div>
      </div>
    `;
  }).join('');
}

async function selectOpsOrder(orderId) {
  selectedOpsOrderId = orderId;
  renderOpsOrders(document.getElementById('ops-search-input')?.value || '');
  
  try {
    const { data: order } = await api.get(`/orders/${orderId}`);
    showOpsOrderDetail(order);
  } catch (e) {
    showToast('Error loading active order: ' + e.message);
  }
}

function showOpsOrderDetail(o) {
  const idleEl = document.getElementById('ops-no-order');
  const detailsEl = document.getElementById('ops-order-details');
  if (!detailsEl) return;
  if (idleEl) idleEl.style.display = 'none';
  detailsEl.style.display = 'block';

  // Define steps
  const steps = ['placed', 'confirmed', 'preparing', 'ready', 'delivered'];
  const currentStepIdx = steps.indexOf(o.status);

  let timelineHtml = `<div style="display:flex;justify-content:space-between;margin:24px 0 32px;position:relative;padding:0 10px">
    <div style="position:absolute;top:10px;left:10px;right:10px;height:4px;background:var(--border);z-index:1">
      <div style="height:100%;background:var(--red);width:${currentStepIdx >= 0 ? (currentStepIdx / (steps.length - 1)) * 100 : 0}%;transition:width 0.4s ease"></div>
    </div>`;

  timelineHtml += steps.map((s, idx) => {
    const isDone = idx <= currentStepIdx;
    const isActive = idx === currentStepIdx;
    let label = s.toUpperCase();
    let emoji = '⚪';
    if (s === 'placed') emoji = '📥';
    if (s === 'confirmed') emoji = '✅';
    if (s === 'preparing') emoji = '👨‍🍳';
    if (s === 'ready') emoji = '🛵';
    if (s === 'delivered') emoji = '🎉';

    return `
      <div style="display:flex;flex-direction:column;align-items:center;z-index:2;position:relative">
        <div style="width:24px;height:24px;border-radius:50%;background:${isDone ? 'var(--red)' : 'var(--bg-dark)'};border:2px solid ${isDone ? 'var(--red)' : 'var(--border)'};display:flex;align-items:center;justify-content:center;font-size:12px;box-shadow:${isActive ? '0 0 10px var(--red)' : 'none'};transition:all 0.3s">
          ${isDone ? '✓' : ''}
        </div>
        <span style="font-size:10px;font-weight:800;color:${isActive ? 'var(--red)' : (isDone ? 'var(--text-primary)' : 'var(--text-secondary)')};margin-top:6px;letter-spacing:0.5px">${emoji} ${label}</span>
      </div>
    `;
  }).join('') + '</div>';

  // Quick Action Buttons
  let actionButtonsHtml = '';
  if (o.status === 'placed') {
    actionButtonsHtml = `
      <button class="btn btn-primary" onclick="updateOpsStatus('${o.id}', 'confirmed')">✅ Accept Order</button>
      <button class="btn btn-outline" style="color:var(--red);border-color:var(--red)" onclick="updateOpsStatus('${o.id}', 'rejected')">❌ Reject Order</button>
    `;
  } else if (o.status === 'confirmed') {
    actionButtonsHtml = `
      <button class="btn btn-yellow" onclick="updateOpsStatus('${o.id}', 'preparing')">👨‍🍳 Start Preparing</button>
    `;
  } else if (o.status === 'preparing') {
    actionButtonsHtml = `
      <button class="btn btn-primary" onclick="updateOpsStatus('${o.id}', 'ready')">🛵 Mark Ready</button>
    `;
  } else if (o.status === 'ready') {
    actionButtonsHtml = `
      <button class="btn btn-primary" onclick="updateOpsStatus('${o.id}', 'delivered')">🎉 Mark Delivered</button>
    `;
  } else {
    actionButtonsHtml = `<span style="font-size:14px;color:var(--green);font-weight:700">🎉 Order Delivered successfully.</span>`;
  }

  const phoneLink = `tel:+91${o.phone}`;
  const whatsappMsg = `Hello ${o.customerName}, Momo Tantra মম তন্ত্র here. Your order #${o.id} is now ${o.status.toUpperCase()}! 🥟 We are preparing it with love. Track status here: http://localhost:3000/track?order=${o.id}`;
  const whatsappLink = `https://wa.me/91${o.phone}?text=${encodeURIComponent(whatsappMsg)}`;
  // Google Map Route Redirect link
  const googleMapLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(o.address + ', Nabagram, Hooghly')}`;

  detailsEl.innerHTML = `
    <!-- Top summary -->
    <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:1px solid var(--border);padding-bottom:16px;margin-bottom:20px;flex-wrap:wrap;gap:10px">
      <div>
        <h2 style="font-size:24px;font-weight:900;margin-bottom:4px">Order <span style="color:var(--red)">#${o.id}</span></h2>
        <div style="font-size:13px;color:var(--text-secondary)">Placed on ${formatDate(o.timestamp)} (${formatTimeAgo(o.timestamp)})</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:22px;font-weight:900;color:var(--yellow)">₹${o.total}</div>
        <span class="status-pill status-${o.status}">${o.status}</span>
      </div>
    </div>

    <!-- Timeline Stepper -->
    ${timelineHtml}

    <!-- Quick controls -->
    <div style="background:rgba(255,255,255,0.02);border:1px solid var(--border);border-radius:var(--radius-md);padding:16px;margin-bottom:24px;display:flex;gap:12px;align-items:center;flex-wrap:wrap">
      <div style="font-size:13px;font-weight:700;color:var(--text-secondary);text-transform:uppercase;letter-spacing:1px;margin-right:8px">Actions:</div>
      ${actionButtonsHtml}
    </div>

    <!-- Contact & Logistics Panel -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:24px;align-items:stretch">
      <div style="background:var(--bg-card2);border:1px solid var(--border);border-radius:var(--radius-md);padding:16px;display:flex;flex-direction:column;justify-content:between">
        <div>
          <div style="font-size:12px;font-weight:800;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">Customer Contact</div>
          <div style="font-weight:700;font-size:16px;margin-bottom:4px">${escHtml(o.customerName)}</div>
          <div style="font-size:13px;color:var(--text-secondary);margin-bottom:12px">${o.phone}</div>
        </div>
        <div style="display:flex;gap:8px;margin-top:auto">
          <a href="${phoneLink}" class="btn btn-outline btn-sm" style="flex:1;justify-content:center">📞 Call</a>
          <a href="${whatsappLink}" target="_blank" class="btn btn-yellow btn-sm" style="flex:1.2;justify-content:center;background:#22c55e;color:#fff;border:none">💬 WhatsApp</a>
        </div>
      </div>
      <div style="background:var(--bg-card2);border:1px solid var(--border);border-radius:var(--radius-md);padding:16px;display:flex;flex-direction:column;justify-content:between">
        <div>
          <div style="font-size:12px;font-weight:800;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">Delivery Logistics</div>
          <div style="font-size:13px;color:var(--text-secondary);line-height:1.4;margin-bottom:12px">📍 ${escHtml(o.address)}</div>
        </div>
        <div style="display:flex;gap:8px;margin-top:auto">
          <a href="${googleMapLink}" target="_blank" class="btn btn-outline btn-sm" style="width:100%;justify-content:center;border-color:var(--yellow);color:var(--yellow)">📍 Google Map Redirect</a>
        </div>
      </div>
    </div>

    <!-- Items summary -->
    <div style="background:var(--bg-card2);border:1px solid var(--border);border-radius:var(--radius-md);padding:20px">
      <div style="font-size:13px;font-weight:700;margin-bottom:12px;color:var(--text-secondary);text-transform:uppercase;letter-spacing:1px">Items Breakdown</div>
      <div style="display:flex;flex-direction:column;gap:8px">
        ${o.items.map(i => `
          <div style="border-bottom:1px solid rgba(255,255,255,0.05);padding-bottom:8px;margin-bottom:8px">
            <div style="display:flex;justify-content:space-between;font-size:14px">
              <span><strong>${escHtml(i.name)}</strong> <strong style="color:var(--yellow)">×${i.qty}</strong></span>
              <span>₹${i.price * i.qty}</span>
            </div>
            ${i.customText ? `<div style="font-size:12px;color:var(--yellow);margin-top:2px">✍️ Custom Text: "${i.customText}"</div>` : ''}
            ${i.customNotes ? `<div style="font-size:12px;color:var(--text-muted);margin-top:2px">📝 Instructions: ${i.customNotes}</div>` : ''}
            ${i.customImage ? `<div style="margin-top:4px"><a href="${i.customImage}" target="_blank" style="font-size:11px;color:var(--green);text-decoration:underline">🖼️ View Uploaded Photo</a></div>` : ''}
          </div>
        `).join('')}
      </div>
      <div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--border)">
        <div style="display:flex;justify-content:space-between;font-size:13px;color:var(--text-secondary)">
          <span>Subtotal</span><span>₹${o.subtotal}</span>
        </div>
        ${o.discount > 0 ? `
          <div style="display:flex;justify-content:space-between;font-size:13px;color:var(--green);margin-top:4px">
            <span>Discount</span><span>-₹${o.discount}</span>
          </div>
        ` : ''}
        <div style="display:flex;justify-content:space-between;font-size:13px;color:var(--text-secondary);margin-top:4px">
          <span>Delivery Charge</span><span>${o.deliveryFee > 0 ? '₹' + o.deliveryFee : 'Free'}</span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:18px;font-weight:900;margin-top:12px;color:var(--red);border-top:1px solid rgba(255,255,255,0.05);padding-top:8px">
          <span>Total Payable</span><span>₹${o.total}</span>
        </div>
      </div>
    </div>
  `;
}

async function updateOpsStatus(orderId, newStatus) {
  try {
    await api.put(`/orders/${orderId}/status`, { status: newStatus });
    const labels = { confirmed:'Confirmed', rejected:'Rejected', preparing:'Preparing', ready:'Ready!', delivered:'Delivered!' };
    showNotification(`Ops Center: Order #${orderId} updated to ${labels[newStatus] || newStatus}`, 'success');
    
    // Add local log instantly for nice UI reactivity
    appendLocalOpsLog(`Status of order #${orderId} changed to ${newStatus.toUpperCase()}`, 'order');

    await refreshOpsActiveOrders();
    
    // If order was delivered or rejected, it's no longer active. Hide detail panel.
    if (newStatus === 'delivered' || newStatus === 'rejected') {
      selectedOpsOrderId = null;
      document.getElementById('ops-order-details').style.display = 'none';
      document.getElementById('ops-no-order').style.display = 'flex';
    } else {
      // Reload detail
      await selectOpsOrder(orderId);
    }
  } catch (e) {
    showToast('Error updating status: ' + e.message);
  }
}

async function pollOpsLogs() {
  try {
    const { data } = await api.get('/logs?limit=80');
    const el = document.getElementById('ops-log-content');
    if (!el) return;

    el.innerHTML = data.map(line => {
      let isTarget = false;
      if (selectedOpsOrderId && line.includes(selectedOpsOrderId)) {
        isTarget = true;
      }

      // Format log tag
      let tagClass = 'tag-info';
      let tagLabel = 'INFO';

      if (line.includes('[ORDER]')) { tagClass = 'tag-order'; tagLabel = 'ORDER'; }
      else if (line.includes('[ERROR]')) { tagClass = 'tag-error'; tagLabel = 'ERROR'; }
      else if (line.includes('[DB]')) { tagClass = 'tag-db'; tagLabel = 'DB'; }
      else if (line.includes('[HTTP]')) { tagClass = 'tag-http'; tagLabel = 'HTTP'; }

      // Extract timestamp and content
      const m = line.match(/^\[([^\]]+)\]\s+\[([^\]]+)\]\s+(.*)$/);
      let timestamp = '';
      let content = line;
      if (m) {
        timestamp = m[1];
        tagLabel = m[2];
        content = m[3];
      }

      const styleString = isTarget ? 'border: 1px solid var(--red); background: rgba(230,57,70,0.12); padding: 4px; border-radius: 4px; color: #fff; font-weight: bold; box-shadow: 0 0 10px rgba(230,57,70,0.2)' : '';

      return `
        <div class="ops-log-line" style="${styleString}">
          <span class="timestamp">[${timestamp}]</span>
          <span class="tag ${tagClass}">${tagLabel}</span>
          <span>${escHtml(content)}</span>
        </div>
      `;
    }).join('');
    
    // Auto-scroll to bottom of logs
    el.scrollTop = el.scrollHeight;
  } catch (e) {
    console.error('Ops logs error', e);
  }
}

function appendLocalOpsLog(lineText, type = 'info') {
  const el = document.getElementById('ops-log-content');
  if (!el) return;
  const timeStr = new Date().toLocaleTimeString('en-IN', { hour12: false });
  let tagClass = 'tag-info';
  if (type === 'order') tagClass = 'tag-order';
  if (type === 'error') tagClass = 'tag-error';
  
  el.insertAdjacentHTML('beforeend', `
    <div class="ops-log-line" style="border: 1px solid var(--yellow); background: rgba(255,214,10,0.1); padding: 4px; border-radius: 4px">
      <span class="timestamp">[${timeStr}]</span>
      <span class="tag ${tagClass}">${type.toUpperCase()}</span>
      <span>${escHtml(lineText)}</span>
    </div>
  `);
  el.scrollTop = el.scrollHeight;
}

function clearOpsLocalLogs() {
  const el = document.getElementById('ops-log-content');
  if (el) el.innerHTML = `<div class="ops-log-line"><span class="timestamp">[${new Date().toLocaleTimeString('en-IN', { hour12: false })}]</span> <span class="tag tag-info">INFO</span> Logs cleared.</div>`;
}

function formatTimeAgo(timestamp) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours} hr ago`;
}

// --- ADMIN AUTO-SYNC INTERCONNECTIVITY POLLING ---
setInterval(() => {
  if (!adminToken) return;
  const page = window.currentAdminPage || 'dashboard';
  
  const activeEl = document.activeElement;
  if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'SELECT')) {
    if (activeEl.id !== 'order-search' && activeEl.id !== 'item-search') {
      return;
    }
  }
  
  const loaders = {
    dashboard: loadDashboard,
    orders: renderOrdersTable,
    menu: renderMenuTable,
    reviews: renderReviewsAdmin,
    customers: renderCustomersTable
  };
  
  if (loaders[page]) {
    loaders[page]();
  }
}, 8000);
