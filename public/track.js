// ============================================================
//  MOMO TANTRA — ORDER TRACKING (API-backed)
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  window.addEventListener('scroll', () =>
    document.getElementById('navbar')?.classList.toggle('scrolled', window.scrollY > 20));

  const params  = new URLSearchParams(window.location.search);
  const orderId = params.get('order');
  if (orderId) {
    document.getElementById('order-id-input').value = orderId.toUpperCase();
    searchOrder(orderId);
  } else {
    showAllOrders();
  }

  // Auto-refresh every 30s if showing an order
  setInterval(() => {
    const id = document.getElementById('order-id-input')?.value?.trim();
    if (id && document.getElementById('track-result')?.style.display !== 'none') searchOrder(id);
  }, 30000);
});

async function searchOrder(id) {
  const orderId = (id || document.getElementById('order-id-input')?.value?.trim())?.toUpperCase();
  if (!orderId) return;

  document.getElementById('track-result').style.display = 'none';
  document.getElementById('track-empty').style.display  = 'none';
  document.getElementById('all-orders-section').style.display = 'none';

  try {
    const { data: order } = await api.get(`/orders/${orderId}`);
    renderTrackingPage(order);
    document.getElementById('track-result').style.display = 'block';
  } catch {
    document.getElementById('track-empty').style.display = 'block';
  }
}

function renderTrackingPage(order) {
  const steps      = getOrderStatusSteps();
  const currentIdx = getStatusIndex(order.status);

  // Header
  document.getElementById('display-order-id').textContent = '#' + order.id;
  document.getElementById('display-order-time').textContent = formatDate(order.timestamp);
  const pill = document.getElementById('display-status-pill');
  if (pill) { pill.textContent = order.status; pill.className = 'status-pill status-' + order.status; }

  // Estimated time / section color
  const section  = document.getElementById('estimated-section');
  const timeEl   = document.getElementById('estimated-time');
  const labelEl  = document.getElementById('estimated-label');
  const subEl    = document.getElementById('estimated-sub');
  const barEl    = document.getElementById('progress-bar');
  const times    = { placed:'35–45 mins', confirmed:'30–40 mins', preparing:'20–30 mins', ready:'5–15 mins' };
  const msgs     = { placed:'Waiting for restaurant confirmation…', confirmed:'Order confirmed! Preparing soon…', preparing:'Your momos are being prepared with love 🥟', ready:'Ready! Out for delivery 🛵' };

  if (order.status === 'delivered') {
    if (section) { section.style.background='rgba(34,197,94,0.1)'; section.style.borderColor='rgba(34,197,94,0.2)'; }
    if (timeEl)  { timeEl.textContent='🎉 Delivered!'; timeEl.style.color='var(--green)'; }
    if (labelEl)  labelEl.textContent = 'Order Complete';
    if (subEl)    subEl.textContent   = 'Thank you for choosing Momo Tantra!';
    if (barEl)   { barEl.style.background='var(--green)'; barEl.style.animation='none'; }
  } else if (order.status === 'rejected') {
    if (timeEl)  { timeEl.textContent='❌ Rejected'; timeEl.style.color='var(--red)'; }
    if (labelEl)  labelEl.textContent = 'Order Status';
    if (subEl)    subEl.textContent   = 'Please contact us for assistance.';
    if (barEl)    barEl.style.display = 'none';
  } else {
    if (timeEl)  timeEl.textContent    = times[order.status] || '30–45 mins';
    if (subEl)   subEl.textContent     = msgs[order.status]  || '';
  }

  // Steps
  const stepsEl = document.getElementById('status-steps');
  if (stepsEl) {
    stepsEl.innerHTML = steps.map((step, idx) => {
      const done   = idx < currentIdx;
      const active = idx === currentIdx;
      const entry  = order.statusHistory?.find(h => h.status === step.key);
      return `
        <div class="status-step ${done?'done':''} ${active?'active':''}">
          <div class="step-icon" style="${done?'background:var(--green);border-color:var(--green)':active?'border-color:var(--yellow)':''}">
            ${done ? '✓' : step.icon}
          </div>
          <div class="step-content">
            <div class="step-label" style="${done||active?'color:var(--text-primary)':'color:var(--text-muted)'}">${step.label}</div>
            ${entry ? `<div class="step-time">${formatDate(entry.time)}</div>` : active ? `<div class="step-time" style="color:var(--yellow)">In progress…</div>` : ''}
          </div>
        </div>`;
    }).join('');
  }

  // Items
  const itemsEl = document.getElementById('track-items');
  if (itemsEl) {
    itemsEl.innerHTML = order.items.map(i => `
      <div style="display:flex;flex-direction:column;font-size:14px;margin-bottom:8px;padding:8px 0;border-bottom:1px solid var(--border)">
        <div style="display:flex;justify-content:space-between">
          <span>${i.name} <span style="color:var(--text-muted)">×${i.qty}</span></span>
          <span style="font-weight:700">₹${i.price * i.qty}</span>
        </div>
        ${i.customText ? `<div style="font-size:12px;color:var(--yellow);margin-top:4px">✍️ Text: "${i.customText}"</div>` : ''}
        ${i.customNotes ? `<div style="font-size:12px;color:var(--text-muted);margin-top:2px">📝 Notes: ${i.customNotes}</div>` : ''}
      </div>`).join('');
  }

  // Totals
  const totalsEl = document.getElementById('track-totals');
  if (totalsEl) {
    totalsEl.innerHTML = `
      <div style="display:flex;justify-content:space-between;font-size:14px;color:var(--text-secondary);margin-bottom:6px"><span>Subtotal</span><span>₹${order.subtotal}</span></div>
      ${order.discount>0?`<div style="display:flex;justify-content:space-between;font-size:14px;color:var(--green);margin-bottom:6px"><span>🎁 Discount${order.coupon?' ('+order.coupon+')':''}</span><span>-₹${order.discount}</span></div>`:''}
      <div style="display:flex;justify-content:space-between;font-size:14px;color:var(--text-secondary);margin-bottom:6px"><span>Delivery</span><span>${order.deliveryFee>0?'₹'+order.deliveryFee:'Free'}</span></div>
      <div style="display:flex;justify-content:space-between;font-size:18px;font-weight:900;color:var(--red);margin-top:8px"><span>Total</span><span>₹${order.total}</span></div>`;
  }

  // Customer
  const custEl = document.getElementById('track-customer');
  if (custEl) {
    custEl.innerHTML = `
      <div style="font-size:14px;font-weight:700;margin-bottom:12px;color:var(--text-secondary);text-transform:uppercase;letter-spacing:1px">Customer Details</div>
      <div style="font-size:15px;font-weight:700;margin-bottom:6px">👤 ${order.customerName}</div>
      <div style="font-size:14px;color:var(--text-secondary);margin-bottom:4px">📞 ${order.phone}</div>
      ${order.email?`<div style="font-size:14px;color:var(--text-secondary);margin-bottom:4px">📧 ${order.email}</div>`:''}
      <div style="font-size:14px;color:var(--text-secondary);margin-bottom:4px">📍 ${order.address}</div>
      <div style="font-size:14px;color:var(--text-secondary);margin-bottom:4px">🛵 ${order.orderType} · 💳 ${order.paymentMethod==='cod'?'Cash on Delivery':'Online Payment'}</div>
      ${order.notes?`<div style="font-size:14px;color:var(--yellow);margin-top:8px">📝 Notes: ${order.notes}</div>`:''}`;
  }

  // Actions
  const actionsEl = document.getElementById('track-actions');
  if (actionsEl) {
    actionsEl.innerHTML = `
      <button class="btn btn-primary" onclick='shareOnWhatsApp(${JSON.stringify(order)})'>💬 WhatsApp</button>
      <button class="btn btn-outline" onclick='downloadInvoice(${JSON.stringify(order)})'>🧾 Invoice</button>
      <a href="tel:+919007993582" class="btn btn-outline" style="text-decoration:none">📞 Call</a>
      <a href="/" class="btn btn-yellow" style="text-decoration:none">🥟 Order More</a>`;
  }
}

async function showAllOrders() {
  try {
    // Use phone from localStorage if available
    const { data: orders } = await api.get('/orders?limit=20');
    if (!orders.length) return;
    const el   = document.getElementById('all-orders-section');
    const list = document.getElementById('all-orders-list');
    if (!el || !list) return;
    el.style.display = 'block';
    list.innerHTML = orders.map(o => `
      <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-lg);padding:20px;margin-bottom:16px;cursor:pointer;transition:var(--transition)"
        onclick="trackById('${o.id}')" onmouseenter="this.style.borderColor='var(--red)'" onmouseleave="this.style.borderColor='var(--border)'">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
          <div>
            <div style="font-size:16px;font-weight:800;color:var(--red)">#${o.id}</div>
            <div style="font-size:13px;color:var(--text-secondary);margin-top:4px">${formatDate(o.timestamp)}</div>
            <div style="font-size:13px;margin-top:6px">${o.items.map(i=>i.name+'×'+i.qty).join(' · ')}</div>
          </div>
          <div style="text-align:right">
            <div style="font-size:20px;font-weight:900">₹${o.total}</div>
            <span class="status-pill status-${o.status}">${o.status}</span>
          </div>
        </div>
      </div>`).join('');
  } catch {}
}

function trackById(id) {
  document.getElementById('order-id-input').value = id;
  document.getElementById('all-orders-section').style.display = 'none';
  searchOrder(id);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function downloadInvoice(order) {
  const w = window.open('', '_blank');
  w.document.write(`<html><head><title>Invoice #${order.id}</title>
  <style>body{font-family:monospace;padding:40px;max-width:600px;margin:0 auto}h1{text-align:center}hr{border:1px solid #ccc;margin:16px 0}
  table{width:100%;border-collapse:collapse}td,th{padding:6px 0}th{text-align:left;border-bottom:2px solid #000}</style></head><body>
  <h1>🥟 MOMO TANTRA</h1>
  <p style="text-align:center;margin:-10px 0 4px">Love at First Bite | মম তন্ত্র</p>
  <p style="text-align:center;font-size:12px;color:#666">12A JC Bose Rd, Nabagram, Hooghly · Ph: 90079 93582</p><hr>
  <h2>INVOICE — #${order.id}</h2>
  <table>
    <tr><td>Date</td><td style="text-align:right">${formatDate(order.timestamp)}</td></tr>
    <tr><td>Customer</td><td style="text-align:right">${order.customerName}</td></tr>
    <tr><td>Phone</td><td style="text-align:right">${order.phone}</td></tr>
    <tr><td>Address</td><td style="text-align:right">${order.address}</td></tr>
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
    </tr>`).join('')}</tbody></table><hr>
  <table>
    <tr><td>Subtotal</td><td style="text-align:right">₹${order.subtotal}</td></tr>
    ${order.discount>0?`<tr><td>Discount${order.coupon?' ('+order.coupon+')':''}</td><td style="text-align:right">-₹${order.discount}</td></tr>`:''}
    <tr><td>Delivery</td><td style="text-align:right">${order.deliveryFee>0?'₹'+order.deliveryFee:'Free'}</td></tr>
    <tr style="font-weight:bold;font-size:18px;border-top:2px solid #000"><td>TOTAL</td><td style="text-align:right">₹${order.total}</td></tr>
  </table><hr>
  <p style="text-align:center;font-size:12px;color:#666">Thank you for ordering! momotantra@gmail.com</p>
  </body></html>`);
  w.document.close(); w.focus(); setTimeout(() => w.print(), 500);
}
