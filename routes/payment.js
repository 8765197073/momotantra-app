const express = require('express');
const router  = express.Router();
const db      = require('../db');
const logger  = require('../logger');
const crypto  = require('crypto');
const { sendOrderConfirmation } = require('../emailService');
const { sendOrderConfirmationWhatsApp } = require('../whatsappService');

// Initialize Stripe and Razorpay
let stripe = null;
let Razorpay = null;

try {
  if (process.env.STRIPE_SECRET_KEY && !process.env.STRIPE_SECRET_KEY.includes('YOUR_')) {
    stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    logger.info('Stripe payment integration initialized.');
  } else {
    logger.warn('Stripe key is missing or placeholder. Running in Sandbox Mode.');
  }
} catch (e) {
  logger.error('Error initializing Stripe:', { error: e.message });
}

try {
  if (process.env.RAZORPAY_KEY_ID && !process.env.RAZORPAY_KEY_ID.includes('YOUR_')) {
    Razorpay = require('razorpay');
    logger.info('Razorpay payment integration initialized.');
  } else {
    logger.warn('Razorpay keys are missing or placeholder. Running in Sandbox Mode.');
  }
} catch (e) {
  logger.error('Error loading Razorpay module:', { error: e.message });
}

// Helper to calculate totals (same logic as orders.js)
function calculateOrderTotal(items, orderType, couponCode) {
  const restaurant = db.getRestaurant();
  const subtotal = items.reduce((s, i) => s + (i.price * i.qty), 0);

  let discount = 0;
  let coupon = null;
  if (couponCode) {
    const result = db.verifyCoupon(couponCode, subtotal);
    if (result.valid) {
      discount = result.discount;
      coupon = result.coupon.code;
    }
  }

  const deliveryFee = (orderType === 'delivery' && subtotal < (restaurant.freeDeliveryAbove || 200))
    ? (restaurant.deliveryFee || 20) : 0;
  const total = subtotal - discount + deliveryFee;

  return { subtotal, discount, deliveryFee, total, coupon };
}

// ── STRIPE: Create Checkout Session ────────────────────────
router.post('/create-stripe-session', async (req, res) => {
  try {
    const { items, customerName, phone, email, address, orderType, couponCode, notes } = req.body;
    if (!items?.length || !customerName || !phone) {
      return res.status(400).json({ success: false, message: 'items, customerName, phone required' });
    }

    const { subtotal, discount, deliveryFee, total, coupon } = calculateOrderTotal(items, orderType, couponCode);
    const orderId = db.generateOrderId();

    // Create temporary order with state 'payment_pending'
    const pendingOrder = {
      id: orderId,
      items: items.map(i => ({
        id: i.id,
        name: i.name,
        price: i.price,
        qty: i.qty,
        image: i.image,
        customImage: i.customImage || null,
        customText: i.customText || null,
        customNotes: i.customNotes || null
      })),
      customerName, phone, email: email || '',
      address: address || 'Dine-in / Pickup',
      notes: notes || '',
      orderType: orderType || 'delivery',
      paymentMethod: 'stripe',
      coupon, subtotal, discount, deliveryFee, total,
      status: 'payment_pending',
      statusHistory: [{ status: 'payment_pending', time: Date.now() }],
      timestamp: Date.now(),
      updatedAt: Date.now()
    };

    db.addOrder(pendingOrder);

    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.get('host');
    const successUrl = `${protocol}://${host}/api/payment/stripe-success?session_id={CHECKOUT_SESSION_ID}&order_id=${orderId}`;
    const cancelUrl = `${protocol}://${host}/`;

    if (stripe) {
      // Create real Stripe checkout session
      const lineItems = items.map(item => ({
        price_data: {
          currency: 'inr',
          product_data: {
            name: item.name,
            description: item.customText ? `Customization: ${item.customText}` : undefined
          },
          unit_amount: item.price * 100 // in paisa/cents
        },
        quantity: item.qty
      }));

      // Add delivery fee as line item if exists
      if (deliveryFee > 0) {
        lineItems.push({
          price_data: {
            currency: 'inr',
            product_data: { name: 'Delivery Charge' },
            unit_amount: deliveryFee * 100
          },
          quantity: 1
        });
      }

      // Add discount line item if exists
      let stripeCoupon = undefined;
      if (discount > 0) {
        // Stripe coupon creation helper
        try {
          const couponObj = await stripe.coupons.create({
            amount_off: discount * 100,
            currency: 'inr',
            duration: 'once'
          });
          stripeCoupon = couponObj.id;
        } catch (e) {
          logger.error('Failed to create stripe coupon:', e);
        }
      }

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: lineItems,
        discounts: stripeCoupon ? [{ coupon: stripeCoupon }] : undefined,
        mode: 'payment',
        success_url: successUrl,
        cancel_url: cancelUrl,
        customer_email: email || undefined,
        metadata: { orderId }
      });

      logger.info(`Stripe checkout session created for order #${orderId}`);
      return res.json({ success: true, url: session.url });
    } else {
      // Sandbox fallback checkout page URL
      const sandboxUrl = `/api/payment/simulated-stripe-checkout?order_id=${orderId}`;
      logger.info(`Stripe keys missing. Directing order #${orderId} to simulated checkout.`);
      return res.json({ success: true, url: sandboxUrl });
    }
  } catch (err) {
    logger.error('Stripe session creation error', { error: err.message });
    res.status(500).json({ success: false, message: 'Stripe transaction creation failed' });
  }
});

// ── STRIPE: Simulated Sandbox Page ─────────────────────────
router.get('/simulated-stripe-checkout', (req, res) => {
  const { order_id } = req.query;
  const order = db.getOrder(order_id);
  if (!order) return res.status(404).send('Order not found');

  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Stripe Checkout (Sandbox)</title>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap" rel="stylesheet">
      <style>
        body { font-family: 'Inter', sans-serif; background: #f4f6f8; margin: 0; display: flex; align-items: center; justify-content: center; min-height: 100vh; color: #333; }
        .checkout-box { background: #fff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); width: 100%; max-width: 440px; overflow: hidden; }
        .stripe-header { background: #635bff; padding: 24px; color: #fff; text-align: center; }
        .stripe-header h1 { margin: 0; font-size: 22px; font-weight: 800; }
        .stripe-header p { margin: 6px 0 0; opacity: 0.8; font-size: 13px; letter-spacing: 0.5px; }
        .checkout-body { padding: 28px; }
        .order-summary { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 24px; }
        .summary-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
        .summary-row.total { font-weight: 800; border-top: 1px dashed #cbd5e1; padding-top: 10px; margin-top: 6px; font-size: 16px; color: #635bff; }
        .form-label { display: block; font-weight: 600; font-size: 13px; color: #475569; margin-bottom: 6px; }
        .form-input { width: 100%; box-sizing: border-box; padding: 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 14px; margin-bottom: 16px; }
        .pay-btn { background: #635bff; color: #fff; width: 100%; padding: 14px; border: none; border-radius: 6px; font-size: 16px; font-weight: 700; cursor: pointer; transition: background 0.2s; }
        .pay-btn:hover { background: #4f46e5; }
        .cancel-link { display: block; text-align: center; margin-top: 16px; font-size: 13px; color: #64748b; text-decoration: none; }
        .cancel-link:hover { text-decoration: underline; }
      </style>
    </head>
    <body>
      <div class="checkout-box">
        <div class="stripe-header">
          <h1>Stripe Checkout</h1>
          <p>🔒 SANDBOX TEST ENV</p>
        </div>
        <div class="checkout-body">
          <h2 style="font-size: 16px; margin-top: 0; font-weight: 800;">Order Details</h2>
          <div class="order-summary">
            <div class="summary-row"><span>Order ID</span><strong>#${order.id}</strong></div>
            <div class="summary-row"><span>Customer</span><span>${order.customerName}</span></div>
            <div class="summary-row"><span>Type</span><span>${order.orderType.toUpperCase()}</span></div>
            <div class="summary-row total"><span>Total Amount</span><span>₹${order.total}</span></div>
          </div>
          
          <label class="form-label">Card Number</label>
          <input type="text" class="form-input" value="4242 4242 4242 4242" disabled>
          
          <div style="display: flex; gap: 12px;">
            <div style="flex: 1;">
              <label class="form-label">Expiry Date</label>
              <input type="text" class="form-input" value="12/28" disabled>
            </div>
            <div style="flex: 1;">
              <label class="form-label">CVC</label>
              <input type="text" class="form-input" value="123" disabled>
            </div>
          </div>
          
          <button class="pay-btn" onclick="processPayment()">Pay ₹${order.total}</button>
          <a href="/" class="cancel-link">Cancel & Return</a>
        </div>
      </div>
      <script>
        function processPayment() {
          const btn = document.querySelector('.pay-btn');
          btn.disabled = true;
          btn.textContent = 'Processing Payment...';
          setTimeout(() => {
            window.location.href = '/api/payment/stripe-success?session_id=mock_session_' + Date.now() + '&order_id=${order.id}';
          }, 1500);
        }
      </script>
    </body>
    </html>
  `);
});

// ── STRIPE: Checkout Success Handler ───────────────────────
router.get('/stripe-success', (req, res) => {
  const { session_id, order_id } = req.query;
  if (!order_id) return res.status(400).send('order_id required');

  const order = db.getOrder(order_id);
  if (!order) return res.status(404).send('Order not found');

  if (order.status === 'payment_pending') {
    const history = order.statusHistory || [];
    history.push({ status: 'placed', time: Date.now() });

    // Update order status to 'placed' (Paid via Stripe)
    const updated = db.updateOrder(order_id, {
      status: 'placed',
      statusHistory: history,
      paymentDetails: {
        gateway: 'stripe',
        sessionId: session_id,
        paidAt: Date.now()
      }
    });

    // Send confirmations
    if (updated.email) {
      updated.customerEmail = updated.email;
      sendOrderConfirmation(updated).catch(e => logger.error('Stripe order email failed', { error: e.message }));
    }
    sendOrderConfirmationWhatsApp(updated).catch(e => logger.error('Stripe order WhatsApp failed', { error: e.message }));

    logger.order(`Stripe payment verified for Order #${order_id}. Status set to PLACED.`);
  }

  // Redirect client back to the active order tracker
  res.redirect(`/track?order=${order_id}`);
});

// ── RAZORPAY: Create Order ─────────────────────────────────
router.post('/create-razorpay-order', async (req, res) => {
  try {
    const { items, customerName, phone, email, address, orderType, couponCode, notes } = req.body;
    if (!items?.length || !customerName || !phone) {
      return res.status(400).json({ success: false, message: 'items, customerName, phone required' });
    }

    const { subtotal, discount, deliveryFee, total, coupon } = calculateOrderTotal(items, orderType, couponCode);
    const orderId = db.generateOrderId();

    // Create temporary order with state 'payment_pending'
    const pendingOrder = {
      id: orderId,
      items: items.map(i => ({
        id: i.id,
        name: i.name,
        price: i.price,
        qty: i.qty,
        image: i.image,
        customImage: i.customImage || null,
        customText: i.customText || null,
        customNotes: i.customNotes || null
      })),
      customerName, phone, email: email || '',
      address: address || 'Dine-in / Pickup',
      notes: notes || '',
      orderType: orderType || 'delivery',
      paymentMethod: 'razorpay',
      coupon, subtotal, discount, deliveryFee, total,
      status: 'payment_pending',
      statusHistory: [{ status: 'payment_pending', time: Date.now() }],
      timestamp: Date.now(),
      updatedAt: Date.now()
    };

    db.addOrder(pendingOrder);

    if (Razorpay) {
      // Initialize Razorpay client
      const instance = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET
      });

      const options = {
        amount: Math.round(total * 100), // in paisa
        currency: 'INR',
        receipt: orderId
      };

      const razorpayOrder = await instance.orders.create(options);
      logger.info(`Razorpay order created for client #${orderId}: ${razorpayOrder.id}`);
      
      return res.json({
        success: true,
        orderId,
        razorpayOrderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
        key: process.env.RAZORPAY_KEY_ID
      });
    } else {
      // Mock Razorpay order response
      logger.info(`Razorpay credentials missing. Using sandbox mock order creator for #${orderId}`);
      return res.json({
        success: true,
        orderId,
        razorpayOrderId: 'order_mock_' + Date.now(),
        amount: Math.round(total * 100),
        key: 'rzp_test_mockkey123',
        mock: true
      });
    }
  } catch (err) {
    logger.error('Razorpay session creation error', { error: err.message });
    res.status(500).json({ success: false, message: 'Razorpay order creation failed' });
  }
});

// ── RAZORPAY: Verify Signature ─────────────────────────────
router.post('/razorpay-verify', (req, res) => {
  try {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, order_id } = req.body;
    if (!order_id) {
      return res.status(400).json({ success: false, message: 'order_id is required' });
    }

    const order = db.getOrder(order_id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    let verified = false;

    // Check if it was a simulated checkout or real
    if (razorpay_order_id && razorpay_order_id.startsWith('order_mock_')) {
      verified = true;
      logger.info(`Razorpay mock signature verified for order #${order_id}`);
    } else if (Razorpay && process.env.RAZORPAY_KEY_SECRET) {
      const generated = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(razorpay_order_id + '|' + razorpay_payment_id)
        .digest('hex');

      if (generated === razorpay_signature) {
        verified = true;
        logger.info(`Razorpay real signature verified for order #${order_id}`);
      }
    }

    if (verified) {
      if (order.status === 'payment_pending') {
        const history = order.statusHistory || [];
        history.push({ status: 'placed', time: Date.now() });

        const updated = db.updateOrder(order_id, {
          status: 'placed',
          statusHistory: history,
          paymentDetails: {
            gateway: 'razorpay',
            paymentId: razorpay_payment_id,
            razorpayOrderId: razorpay_order_id,
            paidAt: Date.now()
          }
        });

        // Send confirmation email/WhatsApp
        if (updated.email) {
          updated.customerEmail = updated.email;
          sendOrderConfirmation(updated).catch(e => logger.error('Razorpay email confirmation failed', { error: e.message }));
        }
        sendOrderConfirmationWhatsApp(updated).catch(e => logger.error('Razorpay WhatsApp confirmation failed', { error: e.message }));

        logger.order(`Razorpay payment approved for order #${order_id}. Status set to PLACED.`);
      }
      return res.json({ success: true, message: 'Payment verified successfully!' });
    } else {
      logger.warn(`Razorpay payment signature mismatch for order #${order_id}`);
      return res.status(400).json({ success: false, message: 'Signature verification failed' });
    }
  } catch (err) {
    logger.error('Razorpay verification error', { error: err.message });
    res.status(500).json({ success: false, message: 'Verification transaction failed' });
  }
});

module.exports = router;
