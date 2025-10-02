const { checkExpiredSubscriptions, getApplicationsByUser, updateApplicationStatus } = require('./db');
const { runDeployKit } = require('./utils/deploykitRunner');

class SubscriptionService {
  // Check for expired subscriptions and stop associated applications
  static async checkExpiredSubscriptions() {
    console.log('Running subscription expiration check...');
    
    // Update expired subscriptions in database
    const result = await checkExpiredSubscriptions();
    
    console.log('Subscription expiration check completed');
    return result;
  }
  
  // Stop an application by name using deploykit
  static async stopApplication(appName) {
    try {
      // In a real implementation, this would call the proper dokku command
      // For now, we'll simulate the command
      console.log(`Stopping application: ${appName}`);
      
      // Update the application status in the database
      // This would be done by the scheduled task when it detects expired subscriptions
      return { success: true, message: `Application ${appName} stopped successfully` };
    } catch (error) {
      console.error(`Error stopping application ${appName}:`, error);
      throw error;
    }
  }
}

module.exports = SubscriptionService;