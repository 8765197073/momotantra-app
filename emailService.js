// ============================================================
//  EMAIL SERVICE — nodemailer + Gmail SMTP
//  Business Email: ichheyhelpdesk@gmail.com
//  To enable: create Gmail App Password at
//  https://myaccount.google.com/apppasswords
// ============================================================
const nodemailer = require('nodemailer');

// Create reusable transporter — uses Gmail SMTP with App Password
function createTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER || 'ichheyhelpdesk@gmail.com',
      pass: process.env.EMAIL_PASS || '' // Set Gmail App Password in .env
    }
  });
}

// ── ORDER CONFIRMATION EMAIL ────────────────────────────
async function sendOrderConfirmation(order) {
  if (!process.env.EMAIL_PASS) {
    console.log('[EMAIL] EMAIL_PASS not set — skipping email send');
    return { skipped: true };
  }
  if (!order.customerEmail) {
    console.log('[EMAIL] No customer email — skipping');
    return { skipped: true };
  }

  const transporter = createTransporter();

  const itemsHtml = order.items.map(item => `
    <tr>
      <td style="padding:10px;border-bottom:1px solid #f0e0e0;font-size:14px">${item.name}</td>
      <td style="padding:10px;border-bottom:1px solid #f0e0e0;text-align:center;font-size:14px">×${item.qty}</td>
      <td style="padding:10px;border-bottom:1px solid #f0e0e0;text-align:right;font-size:14px;font-weight:700">₹${item.price * item.qty}</td>
    </tr>
    ${item.customText ? `<tr><td colspan="3" style="padding:4px 10px 10px;font-size:12px;color:#888">📝 Custom: ${item.customText}</td></tr>` : ''}
  `).join('');

  const trackUrl = `http://localhost:3000/track?id=${order.id}`;
  const waUrl = `https://wa.me/919079937257?text=${encodeURIComponent(`Hi! I'm tracking my order #${order.id}. Please update me on the status.`)}`;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f0f0;font-family:'Segoe UI',Arial,sans-serif">
  <div style="max-width:600px;margin:20px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.1)">

    <!-- HEADER -->
    <div style="background:linear-gradient(135deg,#8b0000,#cc0000,#ff334b);padding:32px 24px;text-align:center">
      <div style="font-size:40px;margin-bottom:8px">🥟🎁</div>
      <div style="color:#fff;font-size:24px;font-weight:900;letter-spacing:1px">MoMo Tantra & Ichheydotcom</div>
      <div style="color:rgba(255,255,255,0.8);font-size:13px;margin-top:4px">মোমো তন্ত্র · Love at First Bite</div>
    </div>

    <!-- ORDER SUCCESS BADGE -->
    <div style="background:#f0fff4;border-bottom:3px solid #00c851;padding:20px 24px;text-align:center">
      <div style="font-size:32px">✅</div>
      <div style="font-size:20px;font-weight:800;color:#00c851;margin-top:8px">Order Confirmed!</div>
      <div style="font-size:14px;color:#555;margin-top:4px">Your order has been received and is being prepared.</div>
    </div>

    <!-- ORDER DETAILS -->
    <div style="padding:24px">
      <div style="display:flex;justify-content:space-between;background:#fef9f0;padding:16px;border-radius:10px;margin-bottom:20px;border:1px solid #f5d9a0;flex-wrap:wrap;gap:12px">
        <div><div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:1px">Order ID</div><div style="font-size:20px;font-weight:900;color:#cc0000">#${order.id}</div></div>
        <div><div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:1px">Status</div><div style="font-size:16px;font-weight:700;color:#f0a500">⏳ ${order.status.toUpperCase()}</div></div>
        <div><div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:1px">Payment</div><div style="font-size:14px;font-weight:700">${order.paymentMethod === 'cod' ? '💵 Cash on Delivery' : '💳 Online'}</div></div>
        <div><div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:1px">Type</div><div style="font-size:14px;font-weight:700">${order.orderType === 'delivery' ? '🛵 Delivery' : order.orderType === 'dine-in' ? '🍽️ Dine-in' : '🚗 Pickup'}</div></div>
      </div>

      <div style="font-size:13px;font-weight:800;color:#333;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px">📋 Order Summary</div>
      <table width="100%" style="border-collapse:collapse">
        <thead>
          <tr style="background:#f8f0f0">
            <th style="padding:10px;text-align:left;font-size:12px;color:#888">Item</th>
            <th style="padding:10px;text-align:center;font-size:12px;color:#888">Qty</th>
            <th style="padding:10px;text-align:right;font-size:12px;color:#888">Total</th>
          </tr>
        </thead>
        <tbody>${itemsHtml}</tbody>
        <tfoot>
          <tr><td colspan="3" style="padding:4px"></td></tr>
          ${order.discount > 0 ? `<tr><td style="padding:8px 10px;color:#00a651;font-size:13px">🎁 Discount</td><td></td><td style="padding:8px 10px;text-align:right;color:#00a651;font-weight:700">-₹${order.discount}</td></tr>` : ''}
          <tr><td style="padding:8px 10px;font-size:13px">Delivery</td><td></td><td style="padding:8px 10px;text-align:right;font-size:13px">₹${order.deliveryFee || 0}</td></tr>
          <tr style="background:#cc0000">
            <td style="padding:12px 10px;font-size:16px;font-weight:900;color:#fff">TOTAL</td>
            <td></td>
            <td style="padding:12px 10px;text-align:right;font-size:20px;font-weight:900;color:#fff">₹${order.total}</td>
          </tr>
        </tfoot>
      </table>

      ${order.deliveryAddress ? `
      <div style="margin-top:20px;padding:16px;background:#f8f8f8;border-radius:10px;border-left:4px solid #cc0000">
        <div style="font-size:12px;color:#888;margin-bottom:4px">📍 DELIVERY ADDRESS</div>
        <div style="font-size:14px;color:#333">${order.deliveryAddress}</div>
      </div>` : ''}

      <!-- CTA BUTTONS -->
      <div style="margin-top:24px;text-align:center">
        <a href="${trackUrl}" style="display:inline-block;background:linear-gradient(135deg,#cc0000,#ff334b);color:#fff;text-decoration:none;padding:14px 28px;border-radius:50px;font-weight:800;font-size:15px;margin:6px">🛵 Track Your Order</a>
        <a href="${waUrl}" style="display:inline-block;background:#25d366;color:#fff;text-decoration:none;padding:14px 28px;border-radius:50px;font-weight:800;font-size:15px;margin:6px">💬 WhatsApp Support</a>
      </div>
    </div>

    <!-- FOOTER -->
    <div style="background:#1a0000;padding:24px;text-align:center">
      <div style="color:#ffc300;font-size:16px;font-weight:800">MoMo Tantra & Ichheydotcom</div>
      <div style="color:rgba(255,255,255,0.5);font-size:12px;margin-top:8px">Nabagram, Konnagar, West Bengal — 712233</div>
      <div style="margin-top:12px;display:flex;justify-content:center;gap:16px;flex-wrap:wrap">
        <a href="tel:+919079937257" style="color:#ffc300;text-decoration:none;font-size:13px">📞 +91 90799 37257</a>
        <a href="mailto:ichheyhelpdesk@gmail.com" style="color:#ffc300;text-decoration:none;font-size:13px">📧 ichheyhelpdesk@gmail.com</a>
      </div>
      <div style="color:rgba(255,255,255,0.3);font-size:11px;margin-top:16px">© 2025 MoMo Tantra & Ichheydotcom. All Rights Reserved.</div>
    </div>
  </div>
</body>
</html>`;

  try {
    await transporter.sendMail({
      from: `"MoMo Tantra & Ichheydotcom" <${process.env.EMAIL_USER || 'ichheyhelpdesk@gmail.com'}>`,
      to: order.customerEmail,
      subject: `✅ Order Confirmed #${order.id} — MoMo Tantra & Ichheydotcom`,
      html
    });
    console.log(`[EMAIL] ✅ Order confirmation sent to ${order.customerEmail}`);
    return { success: true };
  } catch (err) {
    console.error('[EMAIL] ❌ Failed to send email:', err.message);
    return { error: err.message };
  }
}

// ── STATUS UPDATE EMAIL ─────────────────────────────────
async function sendStatusUpdateEmail(order) {
  if (!process.env.EMAIL_PASS || !order.customerEmail) return { skipped: true };
  const transporter = createTransporter();

  const statusEmoji = { placed: '📋', confirmed: '✅', preparing: '👨‍🍳', ready: '🎉', 'out-for-delivery': '🛵', delivered: '🏠', cancelled: '❌' };
  const emoji = statusEmoji[order.status] || '📦';

  const html = `
<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="font-family:'Segoe UI',Arial,sans-serif;background:#f5f0f0;margin:0;padding:20px">
<div style="max-width:500px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.1)">
  <div style="background:linear-gradient(135deg,#8b0000,#cc0000);padding:24px;text-align:center">
    <div style="font-size:48px">${emoji}</div>
    <div style="color:#fff;font-size:20px;font-weight:900;margin-top:8px">Order Update!</div>
  </div>
  <div style="padding:24px;text-align:center">
    <div style="font-size:14px;color:#555;margin-bottom:8px">Your Order <strong style="color:#cc0000">#${order.id}</strong> is now</div>
    <div style="font-size:28px;font-weight:900;color:#cc0000;text-transform:uppercase">${order.status.replace(/-/g,' ')}</div>
    ${order.status === 'delivered' ? '<div style="margin-top:16px;font-size:14px;color:#555">Thank you for ordering! We hope you loved it. ❤️</div>' : ''}
    ${order.status === 'out-for-delivery' ? '<div style="margin-top:16px;font-size:14px;color:#555">Your order is on its way! 🛵</div>' : ''}
    <a href="http://localhost:3000/?track=${order.id}" style="display:inline-block;margin-top:24px;background:linear-gradient(135deg,#cc0000,#ff334b);color:#fff;text-decoration:none;padding:12px 28px;border-radius:50px;font-weight:800">🛵 Track Order</a>
  </div>
  <div style="background:#1a0000;padding:16px;text-align:center">
    <div style="color:rgba(255,255,255,0.4);font-size:11px">MoMo Tantra & Ichheydotcom · Konnagar, West Bengal</div>
  </div>
</div>
</body></html>`;

  try {
    await transporter.sendMail({
      from: `"MoMo Tantra & Ichheydotcom" <${process.env.EMAIL_USER || 'ichheyhelpdesk@gmail.com'}>`,
      to: order.customerEmail,
      subject: `${emoji} Order #${order.id} — Status: ${order.status.toUpperCase()}`,
      html
    });
    return { success: true };
  } catch (err) {
    console.error('[EMAIL] Status update send failed:', err.message);
    return { error: err.message };
  }
}

// ── WELCOME EMAIL ───────────────────────────────────────
async function sendWelcomeEmail(user) {
  if (!process.env.EMAIL_PASS || !user.email) return { skipped: true };
  const transporter = createTransporter();

  const html = `
<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="font-family:'Segoe UI',Arial,sans-serif;background:#f5f0f0;margin:0;padding:20px">
<div style="max-width:500px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden">
  <div style="background:linear-gradient(135deg,#8b0000,#cc0000,#ff6b35);padding:32px;text-align:center">
    <div style="font-size:48px">🥟🎁</div>
    <div style="color:#fff;font-size:24px;font-weight:900;margin-top:12px">Welcome to MoMo Tantra & Ichheydotcom!</div>
    <div style="color:rgba(255,255,255,0.8);margin-top:6px">মোমো তন্ত্র · Love at First Bite</div>
  </div>
  <div style="padding:32px;text-align:center">
    <div style="font-size:20px;font-weight:800;color:#333">Hi ${user.name}! 👋</div>
    <p style="color:#555;margin-top:12px;line-height:1.6">Welcome to our family! You can now enjoy seamless food ordering, personalized gifts, and much more — all in one place.</p>
    <div style="background:#f8f0f0;border-radius:12px;padding:20px;margin:20px 0;text-align:left">
      <div style="font-weight:800;margin-bottom:12px">Your Account Details:</div>
      <div style="font-size:14px;color:#555;margin-bottom:6px">📧 Email: <strong>${user.email}</strong></div>
      <div style="font-size:14px;color:#555">📱 Phone: <strong>${user.phone || 'Not added'}</strong></div>
    </div>
    <div style="margin:16px 0">
      <div style="font-size:13px;font-weight:800;color:#cc0000;margin-bottom:8px">🎁 Your Welcome Coupon:</div>
      <div style="display:inline-block;background:#cc0000;color:#fff;padding:12px 24px;border-radius:50px;font-size:20px;font-weight:900;letter-spacing:2px">FIRSTBITE</div>
      <div style="font-size:12px;color:#888;margin-top:8px">Use for 20% OFF on your first order!</div>
    </div>
    <a href="http://localhost:3000" style="display:inline-block;margin-top:16px;background:linear-gradient(135deg,#cc0000,#ff334b);color:#fff;text-decoration:none;padding:14px 32px;border-radius:50px;font-weight:800;font-size:16px">🥟 Start Ordering Now</a>
  </div>
  <div style="background:#1a0000;padding:20px;text-align:center">
    <div style="color:#ffc300;font-size:14px;font-weight:800">MoMo Tantra & Ichheydotcom</div>
    <div style="color:rgba(255,255,255,0.4);font-size:11px;margin-top:6px">Nabagram, Konnagar, West Bengal — 712233</div>
  </div>
</div>
</body></html>`;

  try {
    await transporter.sendMail({
      from: `"MoMo Tantra & Ichheydotcom" <${process.env.EMAIL_USER || 'ichheyhelpdesk@gmail.com'}>`,
      to: user.email,
      subject: `🎉 Welcome to MoMo Tantra & Ichheydotcom, ${user.name}!`,
      html
    });
    return { success: true };
  } catch (err) {
    console.error('[EMAIL] Welcome email failed:', err.message);
    return { error: err.message };
  }
}

module.exports = { sendOrderConfirmation, sendStatusUpdateEmail, sendWelcomeEmail };
