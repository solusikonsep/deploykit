const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');

// Initialize database
const db = new Database('users.db');

// Create users table if it doesn't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Create subscriptions table
db.exec(`
  CREATE TABLE IF NOT EXISTS subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    plan_type TEXT NOT NULL CHECK(plan_type IN ('starter', 'pro', 'business')),
    status TEXT NOT NULL CHECK(status IN ('active', 'inactive', 'expired', 'pending_payment')) DEFAULT 'inactive',
    start_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    end_date DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
  )
`);

// Create payments table for tracking bank transfers
db.exec(`
  CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    subscription_id INTEGER NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    payment_method TEXT NOT NULL,
    bank_account_name TEXT NOT NULL,
    bank_account_number TEXT NOT NULL,
    payment_reference TEXT,
    verification_status TEXT NOT NULL CHECK(verification_status IN ('pending', 'verified', 'rejected')) DEFAULT 'pending',
    verification_date DATETIME,
    verified_by TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    FOREIGN KEY (subscription_id) REFERENCES subscriptions (id) ON DELETE CASCADE
  )
`);

// Create applications table to track user applications
db.exec(`
  CREATE TABLE IF NOT EXISTS applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('active', 'stopped', 'expired')) DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
  )
`);

// Function to create a new user
function createUser(username, email, password) {
  // Hash the password
  const password_hash = bcrypt.hashSync(password, 10);
  
  try {
    const stmt = db.prepare(`
      INSERT INTO users (username, email, password_hash)
      VALUES (?, ?, ?)
    `);
    
    const result = stmt.run(username, email, password_hash);
    
    // Create a default inactive subscription for the new user
    createSubscription(result.lastInsertRowid, 'starter', 'inactive');
    
    return {
      success: true,
      userId: result.lastInsertRowid
    };
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      return {
        success: false,
        error: 'Username or email already exists'
      };
    }
    throw error;
  }
}

// Function to find a user by username or email
function findUser(identifier) {
  const stmt = db.prepare(`
    SELECT id, username, email, password_hash
    FROM users
    WHERE username = ? OR email = ?
  `);
  
  return stmt.get(identifier, identifier);
}

// Function to update user timestamp
function updateLastLogin(userId) {
  const stmt = db.prepare(`
    UPDATE users
    SET updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);
  
  stmt.run(userId);
}

// Function to create a subscription
function createSubscription(userId, planType, status = 'inactive') {
  const stmt = db.prepare(`
    INSERT INTO subscriptions (user_id, plan_type, status)
    VALUES (?, ?, ?)
  `);
  
  const result = stmt.run(userId, planType, status);
  
  return {
    id: result.lastInsertRowid,
    user_id: userId,
    plan_type: planType,
    status: status
  };
}

// Function to get user subscription
function getUserSubscription(userId) {
  const stmt = db.prepare(`
    SELECT s.id, s.user_id, s.plan_type, s.status, s.start_date, s.end_date
    FROM subscriptions s
    WHERE s.user_id = ?
    ORDER BY s.created_at DESC
    LIMIT 1
  `);
  
  return stmt.get(userId);
}

// Function to update subscription status
function updateSubscriptionStatus(subscriptionId, status, endDate = null) {
  let stmt;
  if (endDate) {
    stmt = db.prepare(`
      UPDATE subscriptions
      SET status = ?, end_date = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    stmt.run(status, endDate, subscriptionId);
  } else {
    stmt = db.prepare(`
      UPDATE subscriptions
      SET status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    stmt.run(status, subscriptionId);
  }
  
  return { success: true };
}

// Function to create a payment
function createPayment(userId, subscriptionId, amount, paymentMethod, bankAccountName, bankAccountNumber, paymentReference = null, notes = null) {
  const stmt = db.prepare(`
    INSERT INTO payments (user_id, subscription_id, amount, payment_method, bank_account_name, bank_account_number, payment_reference, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const result = stmt.run(userId, subscriptionId, amount, paymentMethod, bankAccountName, bankAccountNumber, paymentReference, notes);
  
  return {
    id: result.lastInsertRowid,
    user_id: userId,
    subscription_id: subscriptionId
  };
}

// Function to get user payments
function getUserPayments(userId) {
  const stmt = db.prepare(`
    SELECT p.id, p.user_id, p.subscription_id, p.amount, p.payment_method, p.bank_account_name, 
           p.bank_account_number, p.payment_reference, p.verification_status, p.verification_date, 
           p.created_at, p.notes
    FROM payments p
    WHERE p.user_id = ?
    ORDER BY p.created_at DESC
  `);
  
  return stmt.all(userId);
}

// Function to get pending payments for admin verification
function getPendingPayments() {
  const stmt = db.prepare(`
    SELECT p.id, p.user_id, p.subscription_id, p.amount, p.payment_method, p.bank_account_name, 
           p.bank_account_number, p.payment_reference, p.notes, p.created_at,
           u.username, u.email
    FROM payments p
    JOIN users u ON p.user_id = u.id
    WHERE p.verification_status = 'pending'
    ORDER BY p.created_at ASC
  `);
  
  return stmt.all();
}

// Function to verify a payment
function verifyPayment(paymentId, verifiedBy, status = 'verified') {
  const stmt = db.prepare(`
    UPDATE payments
    SET verification_status = ?, verification_date = CURRENT_TIMESTAMP, verified_by = ?
    WHERE id = ?
  `);
  
  stmt.run(status, verifiedBy, paymentId);
  
  // If payment is verified, activate the subscription
  if (status === 'verified') {
    const payment = getPaymentById(paymentId);
    const threeMonthsLater = new Date();
    threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);
    
    updateSubscriptionStatus(payment.subscription_id, 'active', threeMonthsLater.toISOString());
  }
  
  return { success: true };
}

// Function to get payment by ID
function getPaymentById(paymentId) {
  const stmt = db.prepare(`
    SELECT *
    FROM payments
    WHERE id = ?
  `);
  
  return stmt.get(paymentId);
}

// Function to create an application for a user
function createApplication(userId, appName) {
  // Check if user has reached the app limit based on their subscription
  const subscription = getUserSubscription(userId);
  if (!subscription || subscription.status !== 'active') {
    throw new Error('User does not have an active subscription');
  }
  
  const appCount = getApplicationsByUser(userId).length;
  const maxApps = getAppLimitByPlan(subscription.plan_type);
  
  if (appCount >= maxApps) {
    throw new Error(`You have reached the limit of ${maxApps} applications for your plan`);
  }
  
  const stmt = db.prepare(`
    INSERT INTO applications (user_id, name)
    VALUES (?, ?)
  `);
  
  const result = stmt.run(userId, appName);
  
  return {
    id: result.lastInsertRowid,
    user_id: userId,
    name: appName,
    status: 'active'
  };
}

// Function to get applications by user
function getApplicationsByUser(userId) {
  const stmt = db.prepare(`
    SELECT *
    FROM applications
    WHERE user_id = ?
    ORDER BY created_at DESC
  `);
  
  return stmt.all(userId);
}

// Function to get app limit by plan
function getAppLimitByPlan(planType) {
  const limits = {
    'starter': 2,
    'pro': 5,
    'business': 10
  };
  
  return limits[planType] || 0;
}

// Function to update application status
function updateApplicationStatus(appId, status) {
  const stmt = db.prepare(`
    UPDATE applications
    SET status = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);
  
  stmt.run(status, appId);
  
  return { success: true };
}

// Function to check expired subscriptions and update app statuses
function checkExpiredSubscriptions() {
  const stmt = db.prepare(`
    UPDATE subscriptions
    SET status = 'expired'
    WHERE end_date < CURRENT_TIMESTAMP AND status = 'active'
  `);
  
  stmt.run();
  
  // Update applications for expired subscriptions
  const expiredAppsStmt = db.prepare(`
    UPDATE applications
    SET status = 'expired'
    WHERE user_id IN (
      SELECT user_id FROM subscriptions WHERE status = 'expired'
    ) AND status = 'active'
  `);
  
  expiredAppsStmt.run();
  
  return { success: true };
}

module.exports = {
  createUser,
  findUser,
  updateLastLogin,
  createSubscription,
  getUserSubscription,
  updateSubscriptionStatus,
  createPayment,
  getUserPayments,
  getPendingPayments,
  verifyPayment,
  getPaymentById,
  createApplication,
  getApplicationsByUser,
  getAppLimitByPlan,
  updateApplicationStatus,
  checkExpiredSubscriptions
};