const { spawn, exec } = require('child_process');
const path = require('path');

// Dokku server configuration
const DOKKU_HOST = '202.155.90.19';
const DOKKU_USER = 'dokku';
const SSH_KEY_PATH = process.env.DOKKU_SSH_KEY || '/root/.ssh/id_rsa';

// Function to run Dokku commands with given arguments via SSH
function runDeployKit(args = []) {
  return new Promise((resolve, reject) => {
    // Join the arguments into a single command string
    const command = args.join(' ');
    
    // Construct the SSH command to run Dokku on the remote server
    const sshCommand = `ssh -i ${SSH_KEY_PATH} ${DOKKU_USER}@${DOKKU_HOST} ${command}`;
    
    // Execute the SSH command
    const process = exec(sshCommand, {
      stdio: ['pipe', 'pipe', 'pipe']  // stdin, stdout, stderr
    });

    let stdout = '';
    let stderr = '';

    // Collect stdout
    process.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    // Collect stderr
    process.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    // Handle process completion
    process.on('close', (code) => {
      // Resolve regardless of exit code to allow the API to return output even for non-zero exit codes
      resolve({
        success: code === 0,
        output: stdout,
        error: stderr || null,
        exitCode: code
      });
    });

    // Handle process errors
    process.on('error', (error) => {
      reject({
        success: false,
        error: error.message
      });
    });
  });
}

// Function to stop an application by name using Dokku via SSH
function stopApplication(appName) {
  return new Promise((resolve, reject) => {
    // Construct the SSH command to stop the app by scaling web processes to 0
    const sshCommand = `ssh -i ${SSH_KEY_PATH} ${DOKKU_USER}@${DOKKU_HOST} dokku ps:scale ${appName} web=0`;
    
    // Execute the SSH command
    const process = exec(sshCommand, {
      stdio: ['pipe', 'pipe', 'pipe']  // stdin, stdout, stderr
    });

    let stdout = '';
    let stderr = '';

    // Collect stdout
    process.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    // Collect stderr
    process.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    // Handle process completion
    process.on('close', (code) => {
      if (code === 0) {
        resolve({
          success: true,
          message: `Application ${appName} stopped successfully`,
          output: stdout
        });
      } else {
        // If ps:scale fails, try apps:destroy as fallback
        const destroyCommand = `ssh -i ${SSH_KEY_PATH} ${DOKKU_USER}@${DOKKU_HOST} dokku apps:destroy ${appName} --force`;
        const destroyProcess = exec(destroyCommand, {
          stdio: ['pipe', 'pipe', 'pipe']
        });
        
        let destroyStdout = '';
        let destroyStderr = '';
        
        destroyProcess.stdout.on('data', (data) => {
          destroyStdout += data.toString();
        });
        
        destroyProcess.stderr.on('data', (data) => {
          destroyStderr += data.toString();
        });
        
        destroyProcess.on('close', (destroyCode) => {
          if (destroyCode === 0) {
            resolve({
              success: true,
              message: `Application ${appName} destroyed successfully`,
              output: destroyStdout
            });
          } else {
            reject({
              success: false,
              error: destroyStderr || `Failed to stop/destroy application ${appName}`,
              exitCode: destroyCode
            });
          }
        });
      }
    });

    // Handle process errors
    process.on('error', (error) => {
      reject({
        success: false,
        error: error.message
      });
    });
  });
}

module.exports = {
  runDeployKit,
  stopApplication
};