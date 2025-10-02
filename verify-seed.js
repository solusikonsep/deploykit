const Database = require('better-sqlite3');
const db = new Database('users.db');

console.log('=== DEMO DATA VERIFICATION ===\n');

console.log('Users in the database:');
const users = db.prepare('SELECT id, username, email FROM users').all();
users.forEach(user => console.log(`- ID: ${user.id}, Username: ${user.username}, Email: ${user.email}`));

console.log('\nSubscriptions in the database:');
const subs = db.prepare('SELECT id, user_id, plan_type, status FROM subscriptions').all();
subs.forEach(sub => console.log(`- ID: ${sub.id}, User ID: ${sub.user_id}, Plan: ${sub.plan_type}, Status: ${sub.status}`));

console.log('\nApplications in the database:');
const apps = db.prepare('SELECT id, user_id, name, status FROM applications').all();
apps.forEach(app => console.log(`- ID: ${app.id}, User ID: ${app.user_id}, Name: ${app.name}, Status: ${app.status}`));

console.log('\nPayments in the database:');
const payments = db.prepare('SELECT id, user_id, amount, verification_status FROM payments').all();
payments.forEach(payment => console.log(`- ID: ${payment.id}, User ID: ${payment.user_id}, Amount: ${payment.amount}, Status: ${payment.verification_status}`));

console.log('\n=== VERIFICATION COMPLETE ===');