const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const binDir = path.join(__dirname, '../bin');
if (!fs.existsSync(binDir)) {
  fs.mkdirSync(binDir, { recursive: true });
}

const torExePath = path.join(binDir, 'tor', 'tor.exe');
if (fs.existsSync(torExePath)) {
  console.log('Tor is already downloaded and ready.');
  process.exit(0);
}

const TOR_URL = 'https://archive.torproject.org/tor-package-archive/torbrowser/13.0.14/tor-expert-bundle-windows-x86_64-13.0.14.tar.gz';
const archivePath = path.join(binDir, 'tor.tar.gz');

try {
  console.log('Downloading Tor Expert Bundle... (This may take a minute)');
  execSync(`curl -L -o "${archivePath}" "${TOR_URL}"`, { stdio: 'inherit' });

  console.log('Extracting Tor...');
  // Windows 10+ has tar built-in
  execSync(`tar -xzf "${archivePath}" -C "${binDir}"`, { stdio: 'inherit' });

  // Clean up archive
  if (fs.existsSync(archivePath)) {
    fs.unlinkSync(archivePath);
  }

  console.log('Tor bundled successfully!');
} catch (error) {
  console.error('Failed to download or extract Tor:', error.message);
  process.exit(1);
}
