require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const cron = require('node-cron');

// Import routes
const userRoutes = require('./routes/users');
const deploykitRoutes = require('./routes/deploykit');
const billingRoutes = require('./routes/billing');
const adminRoutes = require('./routes/admin');
const { checkExpiredSubscriptions } = require('./db');

// Initialize app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/users', userRoutes);
app.use('/api/deploykit', deploykitRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/admin', adminRoutes);

// Basic health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Welcome to DeployKit SaaS API',
    endpoints: {
      register: 'POST /api/users/register',
      login: 'POST /api/users/login',
      profile: 'GET /api/users/me (requires auth)',
      runDeployKit: 'POST /api/deploykit/run (requires auth)',
      deploykitStatus: 'GET /api/deploykit/status (requires auth)',
      deployProject: 'POST /api/deploykit/deploy (requires auth)',
      getSubscription: 'GET /api/billing/subscription (requires auth)',
      createPayment: 'POST /api/billing/payment (requires auth)',
      getPayments: 'GET /api/billing/payments (requires auth)',
      createApp: 'POST /api/billing/applications (requires auth)',
      getApps: 'GET /api/billing/applications (requires auth)',
      getPendingPayments: 'GET /api/admin/pending-payments (admin only)',
      verifyPayment: 'POST /api/admin/verify-payment/:id (admin only)'
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Schedule task to check for expired subscriptions every day at midnight
cron.schedule('0 0 * * *', () => {
  console.log('Running scheduled task to check for expired subscriptions...');
  checkExpiredSubscriptions();
});

// Start server
app.listen(PORT, () => {
  console.log(`DeployKit SaaS API server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;