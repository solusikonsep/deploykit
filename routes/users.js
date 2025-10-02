const express = require('express');
const bcrypt = require('bcryptjs');
const { createUser } = require('../db');
const { generateToken, validateCredentials } = require('../auth');

const router = express.Router();

// Register a new user
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Validate input
    if (!username || !email || !password) {
      return res.status(400).json({ 
        error: 'Username, email, and password are required' 
      });
    }

    // Validate password strength (at least 6 characters)
    if (password.length < 6) {
      return res.status(400).json({ 
        error: 'Password must be at least 6 characters long' 
      });
    }

    // Create user in database
    const result = await createUser(username, email, password);
    
    if (!result.success) {
      return res.status(409).json({ error: result.error });
    }

    // Generate JWT token
    const user = {
      id: result.userId,
      username,
      email
    };
    
    const token = generateToken(user);

    // Respond with token and user info
    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login a user
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({ 
        error: 'Username and password are required' 
      });
    }

    // Validate credentials
    const validation = await validateCredentials(username, password);
    
    if (!validation.success) {
      return res.status(401).json({ error: validation.error });
    }

    // Generate JWT token
    const token = generateToken(validation.user);

    // Respond with token and user info
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: validation.user.id,
        username: validation.user.username,
        email: validation.user.email
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user info (requires authentication)
router.get('/me', (req, res) => {
  // This route is protected by the authenticateToken middleware
  // The user is already attached to req.user
  res.json({
    user: req.user
  });
});

module.exports = router;