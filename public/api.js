// ============================================================
//  MOMO TANTRA — API CLIENT
//  Shared fetch wrapper for all pages
// ============================================================

const API_BASE = '/api';

const api = {
  async get(endpoint) {
    try {
      const res = await fetch(API_BASE + endpoint);
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Request failed');
      return json;
    } catch (e) { console.error('GET', endpoint, e); throw e; }
  },

  async post(endpoint, body) {
    try {
      const res = await fetch(API_BASE + endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Request failed');
      return json;
    } catch (e) { console.error('POST', endpoint, e); throw e; }
  },

  async put(endpoint, body) {
    try {
      const res = await fetch(API_BASE + endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Request failed');
      return json;
    } catch (e) { console.error('PUT', endpoint, e); throw e; }
  },

  async del(endpoint) {
    try {
      const res = await fetch(API_BASE + endpoint, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Request failed');
      return json;
    } catch (e) { console.error('DELETE', endpoint, e); throw e; }
  }
};

// ── Shared helpers ──────────────────────────────────────
function formatDate(ts) {
  return new Date(ts).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

function getOrderStatusSteps() {
  return [
    { key: 'placed',    label: 'Order Placed',        icon: '📋', color: '#22c55e' },
    { key: 'confirmed', label: 'Confirmed',            icon: '✅', color: '#3b82f6' },
    { key: 'preparing', label: 'Preparing',            icon: '👨‍🍳', color: '#f59e0b' },
    { key: 'ready',     label: 'Ready / On the Way',   icon: '🛵', color: '#8b5cf6' },
    { key: 'delivered', label: 'Delivered',            icon: '🎉', color: '#10b981' }
  ];
}

function getStatusIndex(status) {
  return getOrderStatusSteps().findIndex(s => s.key === status);
}

function showToast(message, duration = 2200) {
  const c = document.getElementById('toast-container');
  if (!c) return;
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = message;
  c.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = '0.3s ease';
    setTimeout(() => el.remove(), 350);
  }, duration);
}

function showNotification(message, type = 'info') {
  const wrap = document.getElementById('notification-wrap');
  if (!wrap) return;
  const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
  const el = document.createElement('div');
  el.className = `notification ${type}`;
  el.innerHTML = `<span>${icons[type] || 'ℹ️'}</span><span>${message}</span>`;
  wrap.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0'; el.style.transition = '0.3s';
    setTimeout(() => el.remove(), 350);
  }, 3500);
}

function openGoogleMaps() {
  window.open(
    'https://www.google.com/maps/place/Momo+Tantra/@22.7042467,88.3402636',
    '_blank'
  );
}

function avatarColor(letter) {
  const m = { A:'#e63946',B:'#3b82f6',C:'#22c55e',D:'#f97316',E:'#8b5cf6',
    F:'#14b8a6',G:'#ec4899',H:'#f59e0b',M:'#e63946',P:'#10b981',R:'#f97316',
    S:'#22c55e' };
  return m[(letter||'A').toUpperCase()] || '#e63946';
}

async function shareOnWhatsApp(order) {
  let info = { name: 'Momo Tantra', tagline: 'Love at First Bite', whatsapp: '919079937257' };
  try { const r = await api.get('/restaurant'); info = r.data; } catch {}

  let msg = `🥟 *Order from ${info.name}*\n`;
  msg += `📋 *Order ID: ${order.id}*\n`;
  msg += `📅 *${formatDate(order.timestamp)}*\n\n`;
  msg += `*Items:*\n`;
  order.items.forEach(i => { msg += `• ${i.name} ×${i.qty} — ₹${i.price * i.qty}\n`; });
  msg += `\n💰 *Subtotal: ₹${order.subtotal}*\n`;
  if (order.discount > 0) msg += `🎁 *Discount: -₹${order.discount}*\n`;
  msg += `🚚 *Delivery: ₹${order.deliveryFee}*\n`;
  msg += `💳 *TOTAL: ₹${order.total}*\n\n`;
  msg += `📍 ${order.address}\n📞 ${order.phone}\n\n`;
  msg += `Track: ${location.origin}/track?order=${order.id}\n`;
  msg += `_${info.tagline}_`;
  window.open(`https://wa.me/${info.whatsapp}?text=${encodeURIComponent(msg)}`, '_blank');
}
