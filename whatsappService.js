const logger = require('./logger');

// Send order confirmation WhatsApp message
async function sendOrderConfirmationWhatsApp(order) {
  const phone = order.phone;
  if (!phone) {
    logger.info('[WHATSAPP] No phone number for order #' + order.id + ', skipping');
    return { skipped: true };
  }

  // Normalize phone number: remove any non-digit chars, check length
  let cleanPhone = phone.replace(/\D/g, '');
  if (cleanPhone.length === 10) {
    cleanPhone = '91' + cleanPhone; // Default to India country prefix if 10 digits
  }

  const itemsList = order.items.map(item => `* ${item.name} (Qty: ${item.qty})`).join('\n');
  const typeText = order.orderType === 'delivery' ? '🚗 Delivery' : '🍽️ Dine-in / Pickup';
  const paymentText = order.paymentMethod === 'cod' ? '💵 Cash on Delivery' : '💳 Paid Online';
  
  const msgText = `🔔 *Order Confirmed!*
Your order *#${order.id}* at MoMo Tantra & Ichheydotcom has been successfully placed.

📋 *Order Summary:*
${itemsList}

💰 *Total Amount:* ₹${order.total} (${paymentText})
🚚 *Order Type:* ${typeText}
📍 *Address:* ${order.deliveryAddress || 'N/A'}

🔗 *Track Order:* http://localhost:3000/track?id=${order.id}

Thank you for choosing us! 🥟❤️`;

  return await sendWhatsAppMessage(cleanPhone, msgText);
}

// Send status update WhatsApp message
async function sendStatusUpdateWhatsApp(order) {
  const phone = order.phone;
  if (!phone) return { skipped: true };

  let cleanPhone = phone.replace(/\D/g, '');
  if (cleanPhone.length === 10) {
    cleanPhone = '91' + cleanPhone;
  }

  const statusIcons = {
    placed: '📥',
    confirmed: '✅',
    preparing: '👨‍🍳',
    ready: '🥡',
    delivered: '🎉',
    rejected: '❌'
  };

  const icon = statusIcons[order.status] || '🔔';
  const msgText = `${icon} *Order Update: ${order.status.toUpperCase()}*
Your order *#${order.id}* status has been updated to *${order.status.toUpperCase()}*.

🔗 *Track live status:* http://localhost:3000/track?id=${order.id}

Thanks for shopping with MoMo Tantra & Ichheydotcom! 🥟✨`;

  return await sendWhatsAppMessage(cleanPhone, msgText);
}

async function sendWhatsAppMessage(to, message) {
  // 1. WhatsApp Cloud API (Graph API)
  if (process.env.WHATSAPP_CLOUD_API_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID) {
    try {
      const url = `https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.WHATSAPP_CLOUD_API_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: to,
          type: "text",
          text: { preview_url: true, body: message }
        })
      });
      const data = await response.json();
      logger.info('[WHATSAPP] Message sent via Cloud API', { to, messageId: data.messages?.[0]?.id });
      return { success: true, provider: 'cloud-api', data };
    } catch (e) {
      logger.error('[WHATSAPP] Cloud API send failed', { error: e.message });
    }
  }

  // 2. Twilio WhatsApp API
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_WHATSAPP_NUMBER) {
    try {
      const twilio = require('twilio');
      const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      const res = await client.messages.create({
        from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
        to: `whatsapp:+${to}`,
        body: message
      });
      logger.info('[WHATSAPP] Message sent via Twilio', { to, sid: res.sid });
      return { success: true, provider: 'twilio', sid: res.sid };
    } catch (e) {
      logger.error('[WHATSAPP] Twilio send failed', { error: e.message });
    }
  }

  // 3. UltraMsg API
  if (process.env.ULTRAMSG_API_KEY && process.env.ULTRAMSG_INSTANCE_ID) {
    try {
      const url = `https://api.ultramsg.com/${process.env.ULTRAMSG_INSTANCE_ID}/messages/chat`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          token: process.env.ULTRAMSG_API_KEY,
          to: '+' + to,
          body: message
        })
      });
      const data = await response.text();
      logger.info('[WHATSAPP] Message sent via UltraMsg', { to, response: data });
      return { success: true, provider: 'ultramsg', data };
    } catch (e) {
      logger.error('[WHATSAPP] UltraMsg send failed', { error: e.message });
    }
  }

  // 4. Wassenger API
  if (process.env.WASSENGER_API_KEY) {
    try {
      const response = await fetch('https://api.wassenger.com/v1/messages', {
        method: 'POST',
        headers: {
          'Token': process.env.WASSENGER_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ phone: '+' + to, message: message })
      });
      const data = await response.json();
      logger.info('[WHATSAPP] Message sent via Wassenger', { to, messageId: data.id });
      return { success: true, provider: 'wassenger', data };
    } catch (e) {
      logger.error('[WHATSAPP] Wassenger send failed', { error: e.message });
    }
  }

  // Fallback / Log
  logger.info('[WHATSAPP] No API credentials set - pre-filled template message logged successfully:', { to, message });
  return { success: false, reason: 'credentials-not-set', message };
}

module.exports = {
  sendOrderConfirmationWhatsApp,
  sendStatusUpdateWhatsApp
};
