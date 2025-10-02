const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('./db');
require('dotenv').config();

// Secret key for JWT (should be in environment variable)
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key';

// Middleware to authenticate user using JWT
function authenticateToken(req, res, next) {
  // Get token from header
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  // Verify token
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    
    req.user = user;
    next();
  });
}

// Function to generate JWT token
function generateToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, email: user.email },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

// Function to validate user credentials
function validateCredentials(username, password) {
  // Find user in database
  const user = db.findUser(username);
  
  if (!user) {
    return { success: false, error: 'Invalid credentials' };
  }

  // Compare passwords
  const isValidPassword = bcrypt.compareSync(password, user.password_hash);
  
  if (!isValidPassword) {
    return { success: false, error: 'Invalid credentials' };
  }

  // Update last login timestamp
  db.updateLastLogin(user.id);

  return { success: true, user };
}

// Middleware to check if user is admin
function requireAdmin(req, res, next) {
  // For demo purposes, we'll just check if the username from the token is 'admin'
  // In a real application, you would have a dedicated 'is_admin' field in the database
  if (req.user && req.user.username === 'admin') {
    next();
  } else {
    res.status(403).json({ error: 'Access denied. Admin only.' });
  }
}

module.exports = {
  authenticateToken,
  generateToken,
  validateCredentials,
  requireAdmin
};