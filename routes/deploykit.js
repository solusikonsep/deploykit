const express = require('express');
const { runDeployKit, stopApplication } = require('../utils/deploykitRunner');
const { authenticateToken } = require('../auth');
const { 
  getUserSubscription, 
  getApplicationsByUser, 
  updateApplicationStatus,
  updateSubscriptionStatus
} = require('../db');

const router = express.Router();

// Run Dokku commands with provided arguments (requires authentication)
router.post('/run', authenticateToken, async (req, res) => {
  try {
    const { args = [] } = req.body;

    // Validate that args is an array
    if (!Array.isArray(args)) {
      return res.status(400).json({ 
        error: 'Args must be an array of command arguments' 
      });
    }

    // Check if user has an active subscription
    const subscription = await getUserSubscription(req.user.id);
    if (!subscription || subscription.status !== 'active') {
      return res.status(403).json({ 
        error: 'You need an active subscription to run Dokku commands' 
      });
    }

    // Check if any of the arguments relate to stopped/expired apps
    const applications = await getApplicationsByUser(req.user.id);
    const appNames = args.filter(arg => 
      applications.some(app => 
        app.name === arg && (app.status === 'stopped' || app.status === 'expired')
      )
    );

    if (appNames.length > 0) {
      return res.status(403).json({ 
        error: `Cannot run commands on application(s) ${appNames.join(', ')} as they are stopped or expired` 
      });
    }

    // Run Dokku with the provided arguments
    const result = await runDeployKit(args);

    res.json({
      message: 'Dokku command executed successfully',
      ...result
    });
  } catch (error) {
    console.error('Dokku execution error:', error);
    res.status(500).json({
      error: 'Failed to execute Dokku command',
      details: error.error || error.message
    });
  }
});

// Get Dokku status (requires authentication)
router.get('/status', authenticateToken, async (req, res) => {
  try {
    // Check if user has an active subscription
    const subscription = await getUserSubscription(req.user.id);
    if (!subscription || subscription.status !== 'active') {
      return res.status(403).json({ 
        error: 'You need an active subscription to check Dokku status' 
      });
    }

    // Run Dokku with a status command
    const result = await runDeployKit(['apps:list']);

    res.json({
      message: 'Dokku status retrieved successfully',
      ...result
    });
  } catch (error) {
    console.error('Dokku status error:', error);
    res.status(500).json({
      error: 'Failed to get Dokku status',
      details: error.error || error.message
    });
  }
});

// Deploy a project using Dokku (requires authentication)
router.post('/deploy', authenticateToken, async (req, res) => {
  try {
    const { project, environment = 'production' } = req.body;

    if (!project) {
      return res.status(400).json({ 
        error: 'Project name is required' 
      });
    }

    // Check if user has an active subscription
    const subscription = await getUserSubscription(req.user.id);
    if (!subscription || subscription.status !== 'active') {
      return res.status(403).json({ 
        error: 'You need an active subscription to deploy projects' 
      });
    }

    // Check if the project matches an expired/stopped app
    const applications = await getApplicationsByUser(req.user.id);
    const app = applications.find(a => a.name === project);
    
    if (app && (app.status === 'stopped' || app.status === 'expired')) {
      return res.status(403).json({ 
        error: `Cannot deploy to application ${project} as it is stopped or expired` 
      });
    }

    // Run Dokku deploy command (this would typically be handled through git push in practice)
    const result = await runDeployKit(['apps:create', project]);

    res.json({
      message: `Deployment of ${project} to ${environment} initiated successfully`,
      ...result
    });
  } catch (error) {
    console.error('Dokku deployment error:', error);
    res.status(500).json({
      error: 'Failed to deploy project',
      details: error.error || error.message
    });
  }
});

// Stop an application using Dokku
router.post('/stop-app', authenticateToken, async (req, res) => {
  try {
    const { appName } = req.body;

    if (!appName) {
      return res.status(400).json({ 
        error: 'Application name is required' 
      });
    }

    // Check if user has an active subscription
    const subscription = await getUserSubscription(req.user.id);
    if (!subscription || subscription.status !== 'active') {
      return res.status(403).json({ 
        error: 'You need an active subscription to manage applications' 
      });
    }

    // Check if the app belongs to the user
    const applications = await getApplicationsByUser(req.user.id);
    const app = applications.find(a => a.name === appName);
    
    if (!app) {
      return res.status(404).json({ 
        error: 'Application not found or does not belong to you' 
      });
    }

    // Use Dokku to stop the application by scaling web processes to 0
    const result = await stopApplication(appName);
    
    if (result.success) {
      // Update the app status in database
      await updateApplicationStatus(app.id, 'stopped');
      
      res.json({
        message: `Application ${appName} stopped successfully`,
        ...result
      });
    } else {
      res.status(500).json({
        error: 'Failed to stop application using Dokku',
        details: result.error
      });
    }
  } catch (error) {
    console.error('Dokku stop app error:', error);
    res.status(500).json({
      error: 'Failed to stop application',
      details: error.message
    });
  }
});

// Restart an application using Dokku
router.post('/restart-app', authenticateToken, async (req, res) => {
  try {
    const { appName } = req.body;

    if (!appName) {
      return res.status(400).json({ 
        error: 'Application name is required' 
      });
    }

    // Check if user has an active subscription
    const subscription = await getUserSubscription(req.user.id);
    if (!subscription || subscription.status !== 'active') {
      return res.status(403).json({ 
        error: 'You need an active subscription to manage applications' 
      });
    }

    // Check if the app belongs to the user
    const applications = await getApplicationsByUser(req.user.id);
    const app = applications.find(a => a.name === appName);
    
    if (!app) {
      return res.status(404).json({ 
        error: 'Application not found or does not belong to you' 
      });
    }

    if (app.status !== 'stopped') {
      return res.status(400).json({ 
        error: 'Application must be in stopped state to restart' 
      });
    }

    // Use Dokku to restart the application by scaling web processes back up
    const result = await runDeployKit(['ps:scale', appName, 'web=1']);
    
    if (result.success) {
      // Update the app status in database
      await updateApplicationStatus(app.id, 'active');
      
      res.json({
        message: `Application ${appName} restarted successfully`,
        ...result
      });
    } else {
      res.status(500).json({
        error: 'Failed to restart application using Dokku',
        details: result.error
      });
    }
  } catch (error) {
    console.error('Dokku restart app error:', error);
    res.status(500).json({
      error: 'Failed to restart application',
      details: error.message
    });
  }
});

module.exports = router;