const fetch = require('cross-fetch');
fetch('https://html.duckduckgo.com/html/?q=test', { headers: {'User-Agent': 'Mozilla/5.0'} })
.then(r=>r.text())
.then(html=>{
  const results = [];
  const regex = /<a class="result__url" href="([^"]+)".*?>(.*?)<\/a>.*?<a class="result__snippet[^>]*>(.*?)<\/a>/gs;
  let match;
  while ((match = regex.exec(html)) !== null && results.length < 10) {
    results.push(match[1]);
  }
  console.log('Found:', results.length);
  if (results.length > 0) console.log(results[0]);
});
