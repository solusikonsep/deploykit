const { spawn } = require('child_process');
const path = require('path');

// Function to run Dokku commands with given arguments
function runDeployKit(args = []) {
  return new Promise((resolve, reject) => {
    // Spawn the dokku command as a child process
    const process = spawn('dokku', args, {
      stdio: ['pipe', 'pipe', 'pipe'],  // stdin, stdout, stderr
      env: { ...process.env }  // Pass through environment variables
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

// Function to stop an application by name using Dokku
function stopApplication(appName) {
  return new Promise((resolve, reject) => {
    // Use dokku to stop the app by scaling web processes to 0
    const process = spawn('dokku', ['ps:scale', appName, 'web=0'], {
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
        const destroyProcess = spawn('dokku', ['apps:destroy', appName, '--force'], {
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