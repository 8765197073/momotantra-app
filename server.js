// ============================================================
//  MOMO TANTRA — EXPRESS SERVER
//  Node.js v24 · Express 4 · File-backed JSON DB
// ============================================================
'use strict';
require('dotenv').config();

const express = require('express');
const morgan  = require('morgan');
const cors    = require('cors');
const path    = require('path');
const fs      = require('fs');
const logger  = require('./logger');
const db      = require('./db');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ───────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// HTTP request logging via Morgan → our logger
app.use(morgan(
  ':method :url :status :res[content-length]b — :response-time ms',
  { stream: logger.morganStream }
));

// Static files (HTML, CSS, JS, images)
app.use(express.static(path.join(__dirname, 'public')));

// ── API Routes ───────────────────────────────────────────
app.use('/api/menu',    require('./routes/menu'));
app.use('/api/orders',  require('./routes/orders'));
app.use('/api/auth',    require('./routes/auth'));
app.use('/api/payment', require('./routes/payment'));
app.use('/api',         require('./routes/catalog'));   // coupons, offers, categories
app.use('/api',         require('./routes/misc'));       // reviews, restaurant, auth, logs

// ── Page Routes ──────────────────────────────────────────
// Serve HTML pages — clean URLs without .html
app.get('/',       (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/admin',  (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.get('/track',  (req, res) => res.sendFile(path.join(__dirname, 'public', 'track.html')));
app.get('/logs',   (req, res) => res.redirect('/admin'));

// ── Health check ─────────────────────────────────────────
app.get('/api/health', (req, res) => {
  const restaurant = db.getRestaurant();
  res.json({
    status: 'ok',
    app: restaurant.name,
    tagline: restaurant.tagline,
    version: '1.0.0',
    uptime: Math.floor(process.uptime()) + 's',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development'
  });
});

// ── API docs (quick reference) ───────────────────────────
app.get('/api', (req, res) => {
  res.json({
    name: 'Momo Tantra API',
    version: '1.0.0',
    baseUrl: `http://localhost:${PORT}/api`,
    endpoints: {
      menu:       { GET: '/api/menu', POST: '/api/menu', PUT: '/api/menu/:id', DELETE: '/api/menu/:id' },
      orders:     { GET: '/api/orders', POST: '/api/orders', PUT: '/api/orders/:id/status', stats: '/api/orders/admin/stats' },
      coupons:    { GET: '/api/coupons', POST: '/api/coupons', verify: 'POST /api/coupons/verify' },
      offers:     { GET: '/api/offers', POST: '/api/offers' },
      reviews:    { GET: '/api/reviews', POST: '/api/reviews', approve: 'PUT /api/reviews/:id/approve', respond: 'PUT /api/reviews/:id/respond' },
      restaurant: { GET: '/api/restaurant', PUT: '/api/restaurant' },
      auth:       { login: 'POST /api/auth/login' },
      logs:       { GET: '/api/logs?limit=100' },
      health:     { GET: '/api/health' }
    }
  });
});

// ── 404 handler ──────────────────────────────────────────
app.use((req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} not found` });
  }
  res.status(404).sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Global error handler ─────────────────────────────────
app.use((err, req, res, next) => {
  logger.error(`Unhandled error on ${req.method} ${req.path}`, { error: err.message, stack: err.stack });
  res.status(500).json({ success: false, message: 'Internal server error', error: err.message });
});

// ── Start server ─────────────────────────────────────────
if (require.main === module) {
  app.listen(PORT, () => {
    logger.banner(PORT);
    logger.server(`Server started on port ${PORT}`);
    logger.db(`Data directory: ${path.join(__dirname, 'data')}`);
    logger.db(`Log file: ${logger.logFile}`);

    // Log initial data counts
    const menu     = db.getMenu().length;
    const coupons  = db.getCoupons().length;
    const orders   = db.getOrders().length;
    const reviews  = db.getReviews().length;
    logger.info(`Loaded: ${menu} menu items, ${coupons} coupons, ${orders} orders, ${reviews} reviews`);
  });
}

// ── Graceful shutdown ─────────────────────────────────────
process.on('SIGINT',  () => { logger.warn('Server shutting down (SIGINT)...');  process.exit(0); });
process.on('SIGTERM', () => { logger.warn('Server shutting down (SIGTERM)...'); process.exit(0); });
process.on('uncaughtException',  err => logger.error('Uncaught Exception',  { error: err.message }));
process.on('unhandledRejection', err => logger.error('Unhandled Rejection', { error: String(err) }));

module.exports = app;
