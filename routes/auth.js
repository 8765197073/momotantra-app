const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const logger = require('../logger');
const { sendWelcomeEmail } = require('../emailService');

const JWT_SECRET = process.env.JWT_SECRET || 'momotantra_secret_key_2024';

// Middleware to authenticate JWT
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (token == null) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// ── Register ─────────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required' });
    }

    const users = db.getUsers();
    if (users.find(u => u.email === email)) {
      return res.status(400).json({ success: false, message: 'User already exists with this email' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
      id: 'u' + Date.now(),
      name,
      email,
      phone: phone || '',
      password: hashedPassword,
      createdAt: Date.now()
    };

    users.push(newUser);
    db.write('users', users);
    
    // Send welcome email
    sendWelcomeEmail(newUser);

    const token = jwt.sign({ id: newUser.id, email: newUser.email, name: newUser.name }, JWT_SECRET, { expiresIn: '7d' });
    
    logger.info(`New user registered: ${email}`);
    res.status(201).json({ success: true, token, user: { id: newUser.id, name: newUser.name, email: newUser.email, phone: newUser.phone } });
  } catch (err) {
    logger.error('Registration error', { error: err.message });
    res.status(500).json({ success: false, message: 'Server error during registration' });
  }
});

// ── Login ────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, username, password } = req.body;
    
    // Support admin login via same route due to route registration conflict (Express matching /api/auth/login first)
    const loginIdentifier = email || username;
    if (loginIdentifier === 'admin' && password === 'momotantra123') {
      logger.info('Admin logged in');
      return res.json({ success: true, token: 'mt-admin-token-2024', role: 'admin' });
    }
    
    const users = db.getUsers();
    const user = users.find(u => u.email === loginIdentifier);
    
    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ success: false, message: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
    
    logger.info(`User logged in: ${loginIdentifier}`);
    res.json({ success: true, token, user: { id: user.id, name: user.name, email: user.email, phone: user.phone } });
  } catch (err) {
    logger.error('Login error', { error: err.message });
    res.status(500).json({ success: false, message: 'Server error during login' });
  }
});

// ── Get Profile ──────────────────────────────────────────
router.get('/me', authenticateToken, (req, res) => {
  const users = db.getUsers();
  const user = users.find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  
  res.json({ success: true, user: { id: user.id, name: user.name, email: user.email, phone: user.phone } });
});

// ── Google Authentication ────────────────────────────────
router.post('/google', async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ success: false, message: 'Google credential token required' });
    }
    
    const parts = credential.split('.');
    if (parts.length !== 3) {
      return res.status(400).json({ success: false, message: 'Invalid token format' });
    }
    
    const payloadBuf = Buffer.from(parts[1], 'base64');
    const payload = JSON.parse(payloadBuf.toString('utf8'));
    
    if (!payload.email || !payload.iss.includes('accounts.google.com')) {
      return res.status(400).json({ success: false, message: 'Invalid Google token' });
    }
    
    const email = payload.email;
    const name = payload.name || email.split('@')[0];
    const googleId = payload.sub;
    
    const users = db.getUsers();
    let user = users.find(u => u.email === email);
    
    if (!user) {
      user = {
        id: 'u_google_' + googleId,
        name,
        email,
        phone: '',
        googleId,
        createdAt: Date.now()
      };
      users.push(user);
      db.write('users', users);
      
      sendWelcomeEmail(user).catch(err => logger.error('Google welcome email failed', { error: err.message }));
    }
    
    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    logger.info(`Google login successful: ${email}`);
    res.json({
      success: true,
      token,
      user: { id: user.id, name: user.name, email: user.email, phone: user.phone || '' }
    });
  } catch (err) {
    logger.error('Google login error', { error: err.message });
    res.status(500).json({ success: false, message: 'Server error during Google auth' });
  }
});

// ── Admin Get All Users ──────────────────────────────────
router.get('/users', (req, res) => {
  // Simple protection or just open for admin local network
  const users = db.getUsers().map(u => ({ id: u.id, name: u.name, email: u.email, phone: u.phone, createdAt: u.createdAt }));
  res.json({ success: true, data: users, total: users.length });
});

module.exports = router;
