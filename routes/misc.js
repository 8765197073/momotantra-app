// ============================================================
//  ROUTES: Reviews & Restaurant Info
// ============================================================
const express = require('express');
const router  = express.Router();
const db      = require('../db');
const logger  = require('../logger');

// ── Reviews ──────────────────────────────────────────────
router.get('/reviews', (req, res) => {
  let reviews = db.getReviews();
  if (req.query.approved !== undefined) {
    const approved = req.query.approved === 'true';
    reviews = reviews.filter(r => r.isApproved === approved);
  }
  reviews.sort((a, b) => b.timestamp - a.timestamp);
  res.json({ success: true, data: reviews, total: reviews.length });
});

router.post('/reviews', (req, res) => {
  const { name, rating, comment, phone } = req.body;
  if (!name || !comment || !rating) return res.status(400).json({ success: false, message: 'name, rating, comment required' });
  if (rating < 1 || rating > 5) return res.status(400).json({ success: false, message: 'Rating must be 1–5' });
  const review = {
    id: 'r' + Date.now(),
    name, phone: phone || '',
    avatar: name[0].toUpperCase(),
    rating: Number(rating), comment,
    date: 'Just now',
    isVerified: false, isApproved: false, ownerResponse: '',
    timestamp: Date.now()
  };
  const reviews = db.getReviews();
  reviews.unshift(review);
  db.write('reviews', reviews);
  logger.info(`New review submitted by ${name} (${rating}★) — pending approval`);
  res.status(201).json({ success: true, data: review, message: 'Review submitted! Pending approval.' });
});

router.put('/reviews/:id/approve', (req, res) => {
  const reviews = db.getReviews();
  const idx = reviews.findIndex(r => r.id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, message: 'Review not found' });
  reviews[idx].isApproved = true;
  reviews[idx].date = new Date().toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });
  db.write('reviews', reviews);
  logger.info(`Review approved: ${reviews[idx].name}`);
  res.json({ success: true, data: reviews[idx] });
});

router.put('/reviews/:id/respond', (req, res) => {
  const { ownerResponse } = req.body;
  const reviews = db.getReviews();
  const idx = reviews.findIndex(r => r.id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, message: 'Review not found' });
  reviews[idx].ownerResponse = ownerResponse || '';
  db.write('reviews', reviews);
  res.json({ success: true, data: reviews[idx] });
});

router.delete('/reviews/:id', (req, res) => {
  db.write('reviews', db.getReviews().filter(r => r.id !== req.params.id));
  res.json({ success: true, message: 'Review deleted' });
});

// Review stats
router.get('/reviews/stats', (req, res) => {
  const reviews = db.getReviews().filter(r => r.isApproved);
  if (!reviews.length) return res.json({ success: true, data: { avg: 0, total: 0, distribution: {} } });
  const avg = (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1);
  const distribution = { 1:0, 2:0, 3:0, 4:0, 5:0 };
  reviews.forEach(r => distribution[r.rating] = (distribution[r.rating] || 0) + 1);
  res.json({ success: true, data: { avg: Number(avg), total: reviews.length, distribution } });
});

// ── Restaurant Info ───────────────────────────────────────
router.get('/restaurant', (req, res) => {
  res.json({ success: true, data: db.getRestaurant() });
});

router.put('/restaurant', (req, res) => {
  const current = db.getRestaurant();
  const updated = { ...current, ...req.body, updatedAt: Date.now() };
  db.write('restaurant', updated);
  logger.info('Restaurant info updated');
  res.json({ success: true, data: updated });
});

// Auth (simple admin login)
router.post('/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (username === 'admin' && password === 'momotantra123') {
    logger.info('Admin logged in');
    res.json({ success: true, token: 'mt-admin-token-2024', role: 'admin' });
  } else {
    logger.warn('Failed admin login attempt', { username });
    res.status(401).json({ success: false, message: 'Invalid credentials' });
  }
});

// Logs endpoint (last N lines)
router.get('/logs', (req, res) => {
  const fs = require('fs');
  const path = require('path');
  const logFile = path.join(__dirname, '../logs/combined.log');
  if (!fs.existsSync(logFile)) return res.json({ success: true, data: [] });
  const lines = fs.readFileSync(logFile, 'utf8').trim().split('\n');
  const limit = Math.min(Number(req.query.limit) || 100, 500);
  res.json({ success: true, data: lines.slice(-limit), total: lines.length });
});

module.exports = router;
