const fs = require('fs');
const path = require('path');
const https = require('https');

const modelId = 'Xenova/TinyLlama-1.1B-Chat-v1.0';
const files = [
  'config.json',
  'generation_config.json',
  'tokenizer.json',
  'tokenizer_config.json',
  'onnx/model_q4f16.onnx'
];

const targetDir = path.join(__dirname, '../public/models', modelId);

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    
    let downloaded = 0;
    if (fs.existsSync(dest)) {
      downloaded = fs.statSync(dest).size;
    }
    
    console.log(`Downloading ${url} (Resuming from ${downloaded} bytes)...`);
    
    const options = {
      headers: {
        'Range': `bytes=${downloaded}-`
      }
    };
    
    https.get(url, options, (response) => {
      if ([301, 302, 307, 308].includes(response.statusCode)) {
        let redirectUrl = response.headers.location;
        if (redirectUrl.startsWith('/')) {
          redirectUrl = new URL(redirectUrl, 'https://huggingface.co').href;
        }
        return downloadFile(redirectUrl, dest).then(resolve).catch(reject);
      }
      
      if (response.statusCode === 416) {
        // Range not satisfiable -> already fully downloaded
        console.log(`\nFile fully downloaded: ${dest}`);
        return resolve();
      }
      
      if (response.statusCode !== 200 && response.statusCode !== 206) {
        return reject(new Error(`Failed to get '${url}' (${response.statusCode})`));
      }
      
      const file = fs.createWriteStream(dest, { flags: downloaded > 0 && response.statusCode === 206 ? 'a' : 'w' });
      if (response.statusCode !== 206) {
        downloaded = 0; // Server didn't support range request, start over
      }
      
      let total = parseInt(response.headers['content-length'] || '0', 10) + downloaded;
      
      response.on('data', (chunk) => {
        downloaded += chunk.length;
        if (total > downloaded) {
          const percent = ((downloaded / total) * 100).toFixed(1);
          process.stdout.write(`\rProgress: ${percent}%`);
        } else {
          process.stdout.write(`\rDownloaded: ${(downloaded / 1024 / 1024).toFixed(2)} MB`);
        }
      });
      
      response.pipe(file);
      file.on('finish', () => {
        process.stdout.write('\n');
        if (total > 0 && downloaded < total) {
          file.close();
          console.log(`\nConnection dropped prematurely (${downloaded}/${total}). Retrying in 3 seconds...`);
          setTimeout(() => downloadFile(url, dest).then(resolve).catch(reject), 3000);
        } else {
          file.close(resolve);
        }
      });
    }).on('error', (err) => {
      console.log(`\nError: ${err.message}. Retrying in 3 seconds...`);
      setTimeout(() => downloadFile(url, dest).then(resolve).catch(reject), 3000);
    });
  });
}

async function run() {
  for (const file of files) {
    const url = `https://huggingface.co/${modelId}/resolve/main/${file}`;
    const dest = path.join(targetDir, file);
    await downloadFile(url, dest);
  }
  console.log('All model files downloaded successfully!');
}

run().catch(console.error);
