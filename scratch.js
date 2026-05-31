const fetch = require('cross-fetch');
fetch('https://html.duckduckgo.com/html/?q=eiffel+tower')
  .then(r => r.text())
  .then(html => {
    // try to find abstract
    const result = {
      abstract: '',
      image: '',
      source: '',
      sourceUrl: ''
    };
    
    // Abstract text
    let m = html.match(/class="module__text"[^>]*>\s*([^<]+)/i);
    if(m) result.abstract = m[1].trim();
    
    // Abstract image (DuckDuckGo sometimes puts it in img.module__image)
    let m2 = html.match(/<img[^>]*class="[^"]*module__image[^"]*"[^>]*src="([^"]+)"/i);
    if(m2) result.image = m2[1];
    
    // More at Wikipedia
    let m3 = html.match(/class="module__more-at"[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/i);
    if(m3) {
      result.sourceUrl = m3[1];
      result.source = m3[2].trim();
    }
    
    console.log(JSON.stringify(result, null, 2));
  });
