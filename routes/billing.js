const express = require('express');
const { authenticateToken } = require('../auth');
const { 
  getUserSubscription,
  createPayment,
  getUserPayments,
  createApplication,
  getApplicationsByUser,
  getAppLimitByPlan
} = require('../db');

const router = express.Router();

// Get user subscription
router.get('/subscription', authenticateToken, async (req, res) => {
  try {
    const subscription = await getUserSubscription(req.user.id);
    
    if (!subscription) {
      return res.status(404).json({ error: 'No subscription found' });
    }
    
    res.json({
      subscription
    });
  } catch (error) {
    console.error('Error fetching subscription:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a payment record (for bank transfer)
router.post('/payment', authenticateToken, async (req, res) => {
  try {
    const { amount, paymentMethod, bankAccountName, bankAccountNumber, paymentReference, notes } = req.body;
    const userId = req.user.id;
    
    // Get user's subscription to link payment to it
    const subscription = await getUserSubscription(userId);
    if (!subscription) {
      return res.status(400).json({ error: 'No subscription found for user' });
    }
    
    // Validate required fields
    if (!amount || !paymentMethod || !bankAccountName || !bankAccountNumber) {
      return res.status(400).json({ error: 'Amount, payment method, bank account name, and bank account number are required' });
    }
    
    // Create payment record
    const payment = await createPayment(
      userId,
      subscription.id,
      amount,
      paymentMethod,
      bankAccountName,
      bankAccountNumber,
      paymentReference,
      notes
    );
    
    res.status(201).json({
      message: 'Payment record created successfully',
      paymentId: payment.id
    });
  } catch (error) {
    console.error('Error creating payment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user payments
router.get('/payments', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const payments = await getUserPayments(userId);
    
    res.json({
      payments
    });
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new application
router.post('/applications', authenticateToken, async (req, res) => {
  try {
    const { name } = req.body;
    const userId = req.user.id;
    
    if (!name) {
      return res.status(400).json({ error: 'Application name is required' });
    }
    
    // Check if user has an active subscription
    const subscription = await getUserSubscription(userId);
    if (!subscription || subscription.status !== 'active') {
      return res.status(400).json({ error: 'You need an active subscription to create applications' });
    }
    
    // Check if user has reached app limit
    const applications = await getApplicationsByUser(userId);
    const maxApps = getAppLimitByPlan(subscription.plan_type);
    
    if (applications.length >= maxApps) {
      return res.status(400).json({ 
        error: `You have reached the limit of ${maxApps} applications for your plan. Upgrade to create more.` 
      });
    }
    
    // Create the application
    const app = await createApplication(userId, name);
    
    res.status(201).json({
      message: 'Application created successfully',
      application: app
    });
  } catch (error) {
    console.error('Error creating application:', error);
    res.status(500).json({ 
      error: error.message || 'Internal server error' 
    });
  }
});

// Get user applications
router.get('/applications', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const applications = await getApplicationsByUser(userId);
    const subscription = await getUserSubscription(userId);
    const appLimit = subscription ? getAppLimitByPlan(subscription.plan_type) : 0;
    
    res.json({
      applications,
      appLimit,
      usedApps: applications.length
    });
  } catch (error) {
    console.error('Error fetching applications:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;