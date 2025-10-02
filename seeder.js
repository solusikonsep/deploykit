const bcrypt = require('bcryptjs');
const Database = require('better-sqlite3');
const path = require('path');

// Initialize database
const db = new Database('users.db');

// Sample data for seeding
const demoUsers = [
  {
    username: 'admin',
    email: 'admin@deploykit.id',
    password: 'admin123', // In production, use a strong password
    is_admin: true
  },
  {
    username: 'john_doe',
    email: 'john@example.com',
    password: 'password123',
    is_admin: false
  },
  {
    username: 'jane_smith',
    email: 'jane@example.com',
    password: 'password123',
    is_admin: false
  },
  {
    username: 'bob_williams',
    email: 'bob@example.com',
    password: 'password123',
    is_admin: false
  },
  {
    username: 'alice_brown',
    email: 'alice@example.com',
    password: 'password123',
    is_admin: false
  }
];

const subscriptions = [
  { username: 'admin', plan_type: 'business', status: 'active' },
  { username: 'john_doe', plan_type: 'pro', status: 'active' },
  { username: 'jane_smith', plan_type: 'starter', status: 'active' },
  { username: 'bob_williams', plan_type: 'starter', status: 'expired' },
  { username: 'alice_brown', plan_type: 'pro', status: 'pending_payment' }
];

const applications = [
  { username: 'admin', name: 'ecommerce-platform', status: 'active' },
  { username: 'admin', name: 'blog-cms', status: 'active' },
  { username: 'admin', name: 'analytics-dashboard', status: 'active' },
  { username: 'john_doe', name: 'portfolio-site', status: 'active' },
  { username: 'john_doe', name: 'api-service', status: 'active' },
  { username: 'jane_smith', name: 'personal-website', status: 'active' },
  { username: 'bob_williams', name: 'old-project', status: 'expired' },
  { username: 'alice_brown', name: 'mobile-backend', status: 'active' },
  { username: 'alice_brown', name: 'data-processor', status: 'active' }
];

const payments = [
  { 
    username: 'admin', 
    amount: 399000, 
    payment_method: 'bank_transfer', 
    bank_account_name: 'Alam Santiko Wibowo', 
    bank_account_number: '4330427430', 
    verification_status: 'verified',
    notes: 'Business plan payment'
  },
  { 
    username: 'john_doe', 
    amount: 149000, 
    payment_method: 'bank_transfer', 
    bank_account_name: 'Alam Santiko Wibowo', 
    bank_account_number: '4330427430', 
    verification_status: 'verified',
    notes: 'Pro plan payment'
  },
  { 
    username: 'jane_smith', 
    amount: 49000, 
    payment_method: 'bank_transfer', 
    bank_account_name: 'Alam Santiko Wibowo', 
    bank_account_number: '4330427430', 
    verification_status: 'verified',
    notes: 'Starter plan payment'
  },
  { 
    username: 'bob_williams', 
    amount: 49000, 
    payment_method: 'bank_transfer', 
    bank_account_name: 'Alam Santiko Wibowo', 
    bank_account_number: '4330427430', 
    verification_status: 'verified',
    notes: 'Expired subscription'
  },
  { 
    username: 'alice_brown', 
    amount: 149000, 
    payment_method: 'bank_transfer', 
    bank_account_name: 'Alam Santiko Wibowo', 
    bank_account_number: '4330427430', 
    verification_status: 'pending',
    notes: 'Pending payment for pro plan'
  }
];

// Function to seed the database
async function seedDatabase() {
  console.log('Seeding database with demo data...');

  // Clear existing data (optional - comment out if you want to preserve existing data)
  try {
    db.exec('DELETE FROM applications');
    db.exec('DELETE FROM payments');
    db.exec('DELETE FROM subscriptions');
    db.exec('DELETE FROM users');
    console.log('Cleared existing data');
  } catch (error) {
    console.log('Could not clear existing data, proceeding with seeding...');
  }

  // Insert users
  console.log('Creating users...');
  const userStmt = db.prepare(`
    INSERT INTO users (username, email, password_hash)
    VALUES (?, ?, ?)
  `);

  const userIds = {};
  for (const user of demoUsers) {
    const password_hash = bcrypt.hashSync(user.password, 10);
    const result = userStmt.run(user.username, user.email, password_hash);
    userIds[user.username] = result.lastInsertRowid;
    console.log(`  Created user: ${user.username}`);
  }

  // Insert subscriptions
  console.log('Creating subscriptions...');
  const subStmt = db.prepare(`
    INSERT INTO subscriptions (user_id, plan_type, status)
    VALUES (?, ?, ?)
  `);

  for (const sub of subscriptions) {
    const userId = userIds[sub.username];
    if (userId) {
      subStmt.run(userId, sub.plan_type, sub.status);
      console.log(`  Created subscription for user: ${sub.username} (Plan: ${sub.plan_type}, Status: ${sub.status})`);
    }
  }

  // Insert applications
  console.log('Creating applications...');
  const appStmt = db.prepare(`
    INSERT INTO applications (user_id, name, status)
    VALUES (?, ?, ?)
  `);

  for (const app of applications) {
    const userId = userIds[app.username];
    if (userId) {
      appStmt.run(userId, app.name, app.status);
      console.log(`  Created application: ${app.name} for user: ${app.username} (Status: ${app.status})`);
    }
  }

  // Insert payments
  console.log('Creating payments...');
  const paymentStmt = db.prepare(`
    INSERT INTO payments (user_id, subscription_id, amount, payment_method, bank_account_name, bank_account_number, verification_status, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const payment of payments) {
    const userId = userIds[payment.username];
    if (userId) {
      // Get the subscription ID for this user
      const subResult = db.prepare(`
        SELECT id FROM subscriptions 
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT 1
      `).get(userId);
      
      if (subResult) {
        paymentStmt.run(
          userId, 
          subResult.id, 
          payment.amount, 
          payment.payment_method, 
          payment.bank_account_name, 
          payment.bank_account_number, 
          payment.verification_status, 
          payment.notes
        );
        console.log(`  Created payment for user: ${payment.username} (Amount: ${payment.amount}, Status: ${payment.verification_status})`);
      }
    }
  }

  console.log('Database seeding completed successfully!');
  console.log('\nDemo accounts created:');
  console.log('- Admin account: admin@deploykit.id / admin123');
  console.log('- User accounts with various subscription statuses');
  console.log('\nUse these accounts to test the billing system and application management features.');
}

// Run the seeder if this file is executed directly
if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log('\nSeeder completed. Database is now ready with demo data.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error during seeding:', error);
      process.exit(1);
    });
}

module.exports = { seedDatabase };