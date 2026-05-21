// ============================================================
//  ROUTES: Coupons, Offers, Categories
// ============================================================
const express = require('express');
const router  = express.Router();
const db      = require('../db');
const logger  = require('../logger');

// ── Coupons ──────────────────────────────────────────────
router.get('/coupons', (req, res) => {
  let coupons = db.getCoupons();
  if (req.query.active) coupons = coupons.filter(c => c.isActive);
  res.json({ success: true, data: coupons });
});

router.post('/coupons', (req, res) => {
  const { code, discount, type, minOrder, description, isActive } = req.body;
  if (!code || !discount || !type) return res.status(400).json({ success: false, message: 'code, discount, type required' });
  const coupons = db.getCoupons();
  if (coupons.find(c => c.code.toUpperCase() === code.toUpperCase())) {
    return res.status(400).json({ success: false, message: 'Coupon code already exists' });
  }
  const newCoupon = { code: code.toUpperCase(), discount: Number(discount), type, minOrder: Number(minOrder) || 0, description: description || '', isActive: isActive !== false };
  coupons.push(newCoupon);
  db.write('coupons', coupons);
  logger.db(`Coupon created: ${code}`);
  res.status(201).json({ success: true, data: newCoupon });
});

router.put('/coupons/:code', (req, res) => {
  const coupons = db.getCoupons();
  const idx = coupons.findIndex(c => c.code.toUpperCase() === req.params.code.toUpperCase());
  if (idx === -1) return res.status(404).json({ success: false, message: 'Coupon not found' });
  coupons[idx] = { ...coupons[idx], ...req.body, code: coupons[idx].code };
  db.write('coupons', coupons);
  res.json({ success: true, data: coupons[idx] });
});

router.delete('/coupons/:code', (req, res) => {
  const coupons = db.getCoupons().filter(c => c.code.toUpperCase() !== req.params.code.toUpperCase());
  db.write('coupons', coupons);
  res.json({ success: true, message: 'Coupon deleted' });
});

router.post('/coupons/verify', (req, res) => {
  const { code, total } = req.body;
  if (!code || total == null) return res.status(400).json({ success: false, message: 'code and total required' });
  const result = db.verifyCoupon(code, Number(total));
  res.json({ success: true, ...result });
});

// ── Offers ───────────────────────────────────────────────
router.get('/offers', (req, res) => {
  let offers = db.getOffers();
  if (req.query.active) offers = offers.filter(o => o.isActive);
  res.json({ success: true, data: offers });
});

router.post('/offers', (req, res) => {
  const { title, description, badge, image, isActive } = req.body;
  if (!title) return res.status(400).json({ success: false, message: 'title required' });
  const offers = db.getOffers();
  const newOffer = { id: 'offer_' + Date.now(), title, description: description || '', badge: badge || '', image: image || '🎉', isActive: isActive !== false };
  offers.push(newOffer);
  db.write('offers', offers);
  res.status(201).json({ success: true, data: newOffer });
});

router.put('/offers/:id', (req, res) => {
  const offers = db.getOffers();
  const idx = offers.findIndex(o => o.id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, message: 'Offer not found' });
  offers[idx] = { ...offers[idx], ...req.body, id: req.params.id };
  db.write('offers', offers);
  res.json({ success: true, data: offers[idx] });
});

router.delete('/offers/:id', (req, res) => {
  db.write('offers', db.getOffers().filter(o => o.id !== req.params.id));
  res.json({ success: true, message: 'Offer deleted' });
});

// ── Categories ───────────────────────────────────────────
router.get('/categories', (req, res) => {
  res.json({ success: true, data: db.getCategories() });
});

router.post('/categories', (req, res) => {
  const { id, name, icon, badge, brand } = req.body;
  if (!id || !name) return res.status(400).json({ success: false, message: 'id and name required' });
  const cats = db.getCategories();
  if (cats.find(c => c.id === id)) return res.status(400).json({ success: false, message: 'Category already exists' });
  const newCat = { id, name, icon: icon || '🍽️', badge: badge || '' };
  cats.push(newCat);
  db.write('categories', cats);
  res.status(201).json({ success: true, data: newCat });
});

router.delete('/categories/:id', (req, res) => {
  db.write('categories', db.getCategories().filter(c => c.id !== req.params.id));
  res.json({ success: true, message: 'Category deleted' });
});

module.exports = router;
