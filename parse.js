const html = require('fs').readFileSync('yahoo.html', 'utf8'); const matches = html.match(/<div class="compText[^>]*>.*?<\/div>/gs); console.log(matches ? matches.slice(0, 3) : null);
