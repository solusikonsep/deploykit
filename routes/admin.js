const express = require('express');
const { 
  getPendingPayments,
  verifyPayment,
  getPaymentById
} = require('../db');
const { requireAdmin } = require('../auth');

const router = express.Router();

// Get pending payments for verification
router.get('/pending-payments', requireAdmin, async (req, res) => {
  try {
    const pendingPayments = await getPendingPayments();
    
    res.json({
      pendingPayments
    });
  } catch (error) {
    console.error('Error fetching pending payments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify a payment
router.post('/verify-payment/:id', requireAdmin, async (req, res) => {
  try {
    const paymentId = parseInt(req.params.id);
    const { status = 'verified', notes } = req.body;
    const adminUsername = req.user ? req.user.username : 'admin'; // This will work because requireAdmin sets req.user
    
    // Validate status
    if (!['verified', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid verification status. Use "verified" or "rejected".' });
    }
    
    // Verify the payment
    await verifyPayment(paymentId, adminUsername, status);
    
    res.json({
      message: `Payment ${status} successfully`
    });
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get a specific payment by ID
router.get('/payments/:id', requireAdmin, async (req, res) => {
  try {
    const paymentId = parseInt(req.params.id);
    const payment = await getPaymentById(paymentId);
    
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }
    
    res.json({
      payment
    });
  } catch (error) {
    console.error('Error fetching payment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;