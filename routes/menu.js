// ============================================================
//  ROUTES: Menu
// ============================================================
const express = require('express');
const router  = express.Router();
const db      = require('../db');
const logger  = require('../logger');

// GET all menu items
router.get('/', (req, res) => {
  const { category, search, available } = req.query;
  let items = db.getMenu();
  if (category)  items = items.filter(i => i.category === category);
  if (available) items = items.filter(i => i.isAvailable === (available === 'true'));
  if (search)    items = items.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    i.description.toLowerCase().includes(search.toLowerCase())
  );
  res.json({ success: true, data: items, total: items.length });
});

// GET single item
router.get('/:id', (req, res) => {
  const item = db.getMenu().find(i => i.id === req.params.id);
  if (!item) return res.status(404).json({ success: false, message: 'Item not found' });
  res.json({ success: true, data: item });
});

// POST create item (admin)
router.post('/', (req, res) => {
  const { name, category, price, description, servingSize, image, isVeg, isSpicy, isBestseller, isAvailable } = req.body;
  if (!name || !category || price == null) return res.status(400).json({ success: false, message: 'name, category, price required' });
  const newItem = {
    id: name.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now(),
    category, name, description: description || '', price: Number(price),
    servingSize: servingSize || '1 serve',
    image: image || '/images/chicken_momo.png',
    isVeg: !!isVeg, isSpicy: !!isSpicy, isBestseller: !!isBestseller,
    isAvailable: isAvailable !== false,
    rating: 4.5, reviews: 0, createdAt: Date.now()
  };
  const menu = db.getMenu();
  menu.push(newItem);
  db.write('menu', menu);
  logger.db(`Menu item added: ${name}`);
  res.status(201).json({ success: true, data: newItem });
});

// PUT update item (admin)
router.put('/:id', (req, res) => {
  const menu = db.getMenu();
  const idx  = menu.findIndex(i => i.id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, message: 'Item not found' });
  menu[idx] = { ...menu[idx], ...req.body, id: req.params.id, updatedAt: Date.now() };
  db.write('menu', menu);
  logger.db(`Menu item updated: ${menu[idx].name}`);
  res.json({ success: true, data: menu[idx] });
});

// DELETE item (admin)
router.delete('/:id', (req, res) => {
  const menu = db.getMenu();
  const item = menu.find(i => i.id === req.params.id);
  if (!item) return res.status(404).json({ success: false, message: 'Item not found' });
  db.write('menu', menu.filter(i => i.id !== req.params.id));
  logger.db(`Menu item deleted: ${item.name}`);
  res.json({ success: true, message: 'Item deleted' });
});

module.exports = router;
