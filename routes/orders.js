// ============================================================
//  ROUTES: Orders
// ============================================================
const express = require('express');
const router  = express.Router();
const db      = require('../db');
const logger  = require('../logger');
const { sendOrderConfirmation, sendStatusUpdateEmail } = require('../emailService');
const { sendOrderConfirmationWhatsApp, sendStatusUpdateWhatsApp } = require('../whatsappService');

const ORDER_STATUSES = ['placed','confirmed','preparing','ready','delivered','rejected'];

// GET all orders (admin or customer history)
router.get('/', (req, res) => {
  const { status, phone, email, limit = 100, offset = 0 } = req.query;
  let orders = db.getOrders();
  if (status) orders = orders.filter(o => o.status === status);
  if (phone)  orders = orders.filter(o => o.phone === phone);
  if (email)  orders = orders.filter(o => o.email && o.email.toLowerCase() === email.toLowerCase());
  const total = orders.length;
  orders = orders.slice(Number(offset), Number(offset) + Number(limit));
  res.json({ success: true, data: orders, total });
});

// GET single order by ID
router.get('/:id', (req, res) => {
  const order = db.getOrder(req.params.id.toUpperCase());
  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
  res.json({ success: true, data: order });
});

// POST place new order
router.post('/', (req, res) => {
  const { items, customerName, phone, email, address, orderType, paymentMethod, couponCode, notes } = req.body;
  if (!items?.length || !customerName || !phone) {
    return res.status(400).json({ success: false, message: 'items, customerName, phone required' });
  }
  if (phone.length !== 10) {
    return res.status(400).json({ success: false, message: 'Phone must be 10 digits' });
  }

  const restaurant = db.getRestaurant();
  const subtotal = items.reduce((s, i) => s + (i.price * i.qty), 0);

  // Coupon
  let discount = 0;
  let coupon   = null;
  if (couponCode) {
    const result = db.verifyCoupon(couponCode, subtotal);
    if (result.valid) { discount = result.discount; coupon = result.coupon.code; }
  }

  const deliveryFee = (orderType === 'delivery' && subtotal < (restaurant.freeDeliveryAbove || 200))
    ? (restaurant.deliveryFee || 20) : 0;
  const total = subtotal - discount + deliveryFee;

  const order = {
    id:            db.generateOrderId(),
    items:         items.map(i => ({
      id: i.id,
      name: i.name,
      price: i.price,
      qty: i.qty,
      image: i.image,
      customImage: i.customImage || null,
      customText: i.customText || null,
      customNotes: i.customNotes || null
    })),
    customerName,  phone, email: email || '',
    address:       address || 'Dine-in / Pickup',
    notes:         notes || '',
    orderType:     orderType || 'delivery',
    paymentMethod: paymentMethod || 'cod',
    coupon,        subtotal, discount, deliveryFee, total,
    status:        'placed',
    statusHistory: [{ status: 'placed', time: Date.now() }],
    timestamp:     Date.now(),
    updatedAt:     Date.now()
  };

  db.addOrder(order);
  
  // Send email confirmation (non-blocking)
  if (order.email) {
    order.customerEmail = order.email; // Ensure we map email for emailService
    sendOrderConfirmation(order).catch(err => logger.error('Order email failed', { error: err.message }));
  }

  // Send WhatsApp confirmation (non-blocking)
  sendOrderConfirmationWhatsApp(order).catch(err => logger.error('Order WhatsApp failed', { error: err.message }));

  logger.order(`New order placed #${order.id} by ${customerName} (₹${total})`);
  res.status(201).json({ success: true, data: order, message: 'Order placed successfully!' });
});

// PUT update order status (admin)
router.put('/:id/status', (req, res) => {
  const { status } = req.body;
  if (!ORDER_STATUSES.includes(status)) {
    return res.status(400).json({ success: false, message: `Invalid status. Use: ${ORDER_STATUSES.join(', ')}` });
  }
  const order = db.getOrder(req.params.id.toUpperCase());
  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

  const history = order.statusHistory || [];
  history.push({ status, time: Date.now() });

  const updated = db.updateOrder(req.params.id.toUpperCase(), { status, statusHistory: history });
  
  // Send status update email (non-blocking)
  if (updated.email) {
    updated.customerEmail = updated.email;
    sendStatusUpdateEmail(updated).catch(err => logger.error('Status email failed', { error: err.message }));
  }

  // Send status update WhatsApp (non-blocking)
  sendStatusUpdateWhatsApp(updated).catch(err => logger.error('Status WhatsApp failed', { error: err.message }));

  logger.order(`Order #${updated.id} status → ${status}`);
  res.json({ success: true, data: updated });
});

// PUT update any order fields (admin)
router.put('/:id', (req, res) => {
  const order = db.getOrder(req.params.id.toUpperCase());
  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
  const updated = db.updateOrder(req.params.id.toUpperCase(), req.body);
  res.json({ success: true, data: updated });
});

// DELETE order (admin)
router.delete('/:id', (req, res) => {
  const orders = db.getOrders().filter(o => o.id !== req.params.id.toUpperCase());
  db.write('orders', orders);
  logger.order(`Order #${req.params.id} deleted`);
  res.json({ success: true, message: 'Order deleted' });
});

// GET order stats (admin)
router.get('/admin/stats', (req, res) => {
  const orders   = db.getOrders();
  const today    = new Date(); today.setHours(0,0,0,0);
  const todayOrders = orders.filter(o => new Date(o.timestamp) >= today);
  const revenue  = orders.filter(o => o.status === 'delivered').reduce((s,o) => s + o.total, 0);
  const pending  = orders.filter(o => o.status === 'placed').length;
  const delivered = orders.filter(o => o.status === 'delivered').length;
  const customers = [...new Set(orders.map(o => o.phone))].length;
  const todayRevenue = todayOrders.filter(o => o.status === 'delivered').reduce((s,o) => s + o.total, 0);
  res.json({ success: true, data: { total: orders.length, revenue, pending, delivered, customers, todayOrders: todayOrders.length, todayRevenue } });
});

module.exports = router;
