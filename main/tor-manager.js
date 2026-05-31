const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

let torProcess = null;
let isBootstrapped = false;
let startPromise = null;

function startTor(onProgress) {
  if (isBootstrapped) return Promise.resolve();
  if (startPromise) return startPromise;

  startPromise = new Promise((resolve, reject) => {
    console.log('Starting Tor process...');
    
    try {
      const torExe = path.join(__dirname, '../bin/tor/tor.exe');
      const torData = path.join(__dirname, '../bin/tor/data');
      
      if (!fs.existsSync(torExe)) {
        throw new Error(`Bundled Tor executable not found at ${torExe}.`);
      }
      if (!fs.existsSync(torData)) {
        fs.mkdirSync(torData, { recursive: true });
      }

      torProcess = spawn(torExe, ['--SocksPort', '9999', '--DataDirectory', torData], { detached: false });

      torProcess.stdout.on('data', (data) => {
        const out = data.toString();
        console.log(`[Tor]: ${out.trim()}`);
        
        // Match progress
        const match = out.match(/Bootstrapped (\d+)%.*?: (.*)/);
        if (match && onProgress) {
          onProgress(parseInt(match[1]), match[2].trim());
        }

        if (out.includes('Bootstrapped 100%')) {
          console.log('Tor is fully bootstrapped and ready!');
          isBootstrapped = true;
          startPromise = null;
          resolve();
        }
      });

      torProcess.stderr.on('data', (data) => {
        console.error(`[Tor Error]: ${data.toString().trim()}`);
      });

      torProcess.on('close', (code) => {
        console.log(`Tor process exited with code ${code}`);
        torProcess = null;
        isBootstrapped = false;
        startPromise = null;
      });

      torProcess.on('error', (err) => {
        console.error('Failed to start Tor process.', err);
        torProcess = null;
        isBootstrapped = false;
        startPromise = null;
        reject(err);
      });

      // Timeout if it takes too long to bootstrap (45s)
      setTimeout(() => {
        if (!isBootstrapped) {
          if (torProcess) torProcess.kill();
          torProcess = null;
          startPromise = null;
          reject(new Error('Tor bootstrap timed out after 45 seconds. Your network might be blocking Tor.'));
        }
      }, 45000);

    } catch (err) {
      console.error('Error starting Tor', err);
      startPromise = null;
      reject(err);
    }
  });

  return startPromise;
}

function stopTor() {
  if (torProcess) {
    torProcess.kill();
    torProcess = null;
  }
  isBootstrapped = false;
  startPromise = null;
}

module.exports = { startTor, stopTor };
