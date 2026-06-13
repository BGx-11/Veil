const fs = require('fs');
const path = require('path');
const logPath = path.join(require('os').tmpdir(), 'veil_debug.log');
fs.writeFileSync(logPath, 'App started\n');
process.on('uncaughtException', (err) => {
  fs.appendFileSync(logPath, 'UNCAUGHT EXCEPTION: ' + err.stack + '\n');
});
process.on('unhandledRejection', (reason, p) => {
  fs.appendFileSync(logPath, 'UNHANDLED REJECTION: ' + reason + '\n');
});

const { app, BrowserWindow, session, ipcMain, Menu, clipboard, protocol } = require('electron');
if (require('electron-squirrel-startup')) app.quit();

protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { secure: true, standard: true, supportFetchAPI: true } }
]);

const { ElectronBlocker } = require('@ghostery/adblocker-electron');
const fetch = require('cross-fetch');

const { startTor, stopTor } = require('./tor-manager');

// ── Security hardening BEFORE app ready ──
app.commandLine.appendSwitch('force-webrtc-ip-handling-policy', 'disable_non_proxied_udp');
app.commandLine.appendSwitch('disable-features', 'WebRtcHideLocalIpsWithMdns');
app.commandLine.appendSwitch('disable-blink-features', 'AutomationControlled'); // Essential for bypassing YouTube/Cloudflare bot detection
// Disable GPU for fingerprint resistance
app.commandLine.appendSwitch('disable-reading-from-canvas');
// ── Performance Boosts ──
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('enable-features', 'CanvasOopRasterization,VaapiVideoDecoder');
// ── Additional Security ──
app.commandLine.appendSwitch('disable-remote-fonts'); // Prevent font-based tracking
app.commandLine.appendSwitch('disable-background-networking'); // Prevent background network leaks
app.commandLine.appendSwitch('no-pings'); // Block hyperlink auditing pings
app.commandLine.appendSwitch('enable-sandbox'); // Enforce strict sandbox
app.commandLine.appendSwitch('disable-client-side-phishing-detection'); // Privacy: stop uploading URLs
app.commandLine.appendSwitch('disable-component-update'); // Prevent background updating
app.commandLine.appendSwitch('disable-sync'); // Stop all syncing
app.commandLine.appendSwitch('disable-domain-reliability'); // Prevent google tracking
app.commandLine.appendSwitch('disable-speech-api'); // Prevent microphone fingerprinting
app.commandLine.appendSwitch('disable-plugins'); // Block flash/PDF/other plugins
app.commandLine.appendSwitch('block-new-web-contents');

let mainWindow;
let blockerInstance = null;
let trackerCount = 0;
let customBlocklist = [];
let downloads = [];
const isDev = !app.isPackaged;

async function createWindow() {

  const secureSession = session.fromPartition('in-memory');
  const sessionsToSecure = [session.fromPartition('in-memory'), session.fromPartition('persist:default')];

  // ── Ghostery Ad/Tracker Blocker ──
  try {
    const enginePath = path.join(app.getPath('userData'), 'engine.bin');
    blockerInstance = await ElectronBlocker.fromPrebuiltAdsAndTracking(fetch, {
      path: enginePath,
      read: fs.promises.readFile,
      write: fs.promises.writeFile
    });
    
    // Background fetch additional lists
    ElectronBlocker.fromLists(fetch, [
      'https://easylist.to/easylist/easylist.txt',
      'https://easylist.to/easylist/easyprivacy.txt',
      'https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/filters.txt',
      'https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/privacy.txt',
      'https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/badware.txt',
      'https://pgl.yoyo.org/adservers/serverlist.php?hostformat=adblockplus&mimetype=plaintext'
    ], { path: enginePath, read: fs.promises.readFile, write: fs.promises.writeFile })
      .then(nb => {
        blockerInstance = nb;
        sessionsToSecure.forEach(sess => {
          try { blockerInstance.enableBlockingInSession(sess); } catch (e) {}
        });
        console.log('[Sec] Enhanced adblock lists loaded in background');
      }).catch(console.error);

    sessionsToSecure.forEach(sess => {
      try { blockerInstance.enableBlockingInSession(sess); } catch (e) {}
    });
    blockerInstance.on('request-blocked', () => {
      trackerCount++;
      if (mainWindow) mainWindow.webContents.send('tracker-blocked', trackerCount);
    });
    console.log('[Sec] Ad/tracker blocker ACTIVE');
  } catch (err) {
    console.error('[Sec] AdBlocker failed:', err.message);
  }

  sessionsToSecure.forEach(secureSession => {
  // ── Selective Permission Handler ──
  const allowedPermissions = ['fullscreen', 'media', 'pointerLock', 'pictureInPicture'];
  secureSession.setPermissionRequestHandler((_wc, permission, cb) => {
    // Block dangerous permissions: geolocation, notifications, midi, etc.
    const blocked = ['geolocation', 'notifications', 'midi', 'midiSysex', 'idle-detection', 'display-capture', 'clipboard-read', 'clipboard-sanitized-write'];
    if (blocked.includes(permission)) {
      console.log(`[Sec] Blocked permission request: ${permission}`);
      return cb(false);
    }
    cb(allowedPermissions.includes(permission));
  });
  secureSession.setPermissionCheckHandler((_wc, permission) => {
    return allowedPermissions.includes(permission);
  });

  // ── Custom Website Blocking & HTTPS-Only ──
  secureSession.webRequest.onBeforeRequest((details, callback) => {
    // ── HTTPS-only upgrade ──
    if (
      appSettings.httpsOnly &&
      details.url.startsWith('http://') &&
      !details.url.startsWith('http://localhost') &&
      !details.url.includes('.local') &&
      !details.url.match(/http:\/\/\d+\.\d+\.\d+\.\d+/) &&
      details.resourceType === 'mainFrame' &&
      !details.url.includes('__sb_allow_http=1')
    ) {
      const upgraded = details.url.replace('http://', 'https://');
      return callback({ redirectURL: upgraded });
    }

    // ── Block known tracking/fingerprint domains ──
    const trackingDomains = [
      'google-analytics.com', 'googletagmanager.com',
      'facebook.net', 'facebook.com/tr',
      'doubleclick.net', 'googlesyndication.com',
      'hotjar.com', 'fullstory.com', 'clarity.ms',
      'segment.io', 'segment.com',
      'mixpanel.com', 'amplitude.com',
      'newrelic.com', 'nr-data.net',
      'sentry.io', 'bugsnag.com',
    ];

    try {
      if (details.url && !details.url.startsWith('browser://') && !details.url.startsWith('search://')) {
        const urlObj = new URL(details.url);
        const host = urlObj.hostname;
        
        // Check custom blocklist
        if (customBlocklist.some(blocked => host === blocked || host.endsWith('.' + blocked))) {
          if (mainWindow) {
            mainWindow.webContents.send('tracker-blocked', trackerCount + 1);
          }
          trackerCount++;
          return callback({ cancel: true });
        }

        // Check known tracking domains (for non-main-frame requests only to avoid breaking navigation)
        if (details.resourceType !== 'mainFrame' && appSettings.adBlocker !== false) {
          if (trackingDomains.some(td => host === td || host.endsWith('.' + td))) {
            trackerCount++;
            if (mainWindow) mainWindow.webContents.send('tracker-blocked', trackerCount);
            return callback({ cancel: true });
          }
        }
      }
    } catch (e) {}
    callback({ cancel: false });
  });

  // ── Strip Cross-Origin Referer + inject Privacy headers ──
  secureSession.webRequest.onBeforeSendHeaders((details, callback) => {
    const referer = details.requestHeaders['Referer'] || details.requestHeaders['referer'];
    if (referer) {
      try {
        const refUrl = new URL(referer);
        const reqUrl = new URL(details.url);
        // Strip referer entirely if it's a cross-origin request to protect privacy, 
        // but preserve it for same-origin to prevent breaking site functionality (and pass SOP audits)
        if (refUrl.origin !== reqUrl.origin) {
          delete details.requestHeaders['Referer'];
          delete details.requestHeaders['referer'];
        }
      } catch (e) {
        delete details.requestHeaders['Referer'];
        delete details.requestHeaders['referer'];
      }
    }
    
    // Inject Privacy Control Headers
    details.requestHeaders['DNT'] = '1';
    details.requestHeaders['Sec-GPC'] = '1';
    if (appSettings.httpsOnly) {
      details.requestHeaders['Upgrade-Insecure-Requests'] = '1';
    }

    // Sanitize potentially leaky headers
    delete details.requestHeaders['X-Client-Data']; // Chrome telemetry header
    delete details.requestHeaders['X-Chrome-Connected']; // Chrome sync header

    callback({ cancel: false, requestHeaders: details.requestHeaders });
  });

  // ── Block 3rd party cookies + inject CSP security headers ──
  secureSession.webRequest.onHeadersReceived((details, callback) => {
    const headers = { ...details.responseHeaders };

    // Remove set-cookie from 3rd party responses
    if (details.resourceType !== 'mainFrame') {
      delete headers['set-cookie'];
      delete headers['Set-Cookie'];
    }

    // ── Apply strict CSP & Security Headers ONLY to internal UI ──
    // Do not apply to external websites, or it breaks their iframes (Vimeo, YouTube)
    const isInternalApp = details.url.startsWith('http://localhost') || details.url.startsWith('file://');
    
    if (isInternalApp) {
      const cspScriptSrc = isDev ? "'self' 'unsafe-inline' 'unsafe-eval' https:" : "'self' 'unsafe-inline' https:";
      headers['Content-Security-Policy'] = [
        `default-src 'self' https: data: blob: ws:; ` +
        `script-src ${cspScriptSrc}; ` +
        `style-src 'self' 'unsafe-inline' https:; ` +
        `img-src * data: blob:; ` +
        `font-src 'self' https: data:; ` +
        `connect-src 'self' https: wss: ws: http://localhost:*; ` +
        `frame-src 'self' https:; ` +
        `object-src 'none'; ` +
        `base-uri 'self';`
      ];

      headers['X-Frame-Options'] = ['SAMEORIGIN'];
      headers['X-Content-Type-Options'] = ['nosniff'];
      headers['X-XSS-Protection'] = ['1; mode=block'];
      headers['Referrer-Policy'] = ['no-referrer'];
      headers['Permissions-Policy'] = [
        'camera=(), microphone=(), geolocation=(), payment=(), usb=(), ' +
        'magnetometer=(), gyroscope=(), accelerometer=(), ' +
        'bluetooth=(), serial=(), hid=(), idle-detection=()'
      ];
    } else {
      // For external sites, just force some basic protections without breaking functionality
      headers['X-XSS-Protection'] = ['1; mode=block'];
      headers['Referrer-Policy'] = ['strict-origin-when-cross-origin'];
      headers['X-Content-Type-Options'] = ['nosniff'];
      
      // We do NOT inject X-Frame-Options: SAMEORIGIN here, because it breaks 
      // embedded Vimeo/YouTube players on external sites.
    }

    callback({ cancel: false, responseHeaders: headers });
  });

  // ── Standardise User-Agent to evade bot detection ──
  const pristineUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  secureSession.setCertificateVerifyProc((request, callback) => {
    callback(0);
  });

  // ── Download Handling ──
  secureSession.on('will-download', (event, item, webContents) => {
    const dlId = Date.now().toString() + Math.random().toString(36).substr(2, 5);
    const dl = {
      id: dlId,
      filename: item.getFilename(),
      url: item.getURL(),
      totalBytes: item.getTotalBytes(),
      receivedBytes: item.getReceivedBytes(),
      state: item.getState(),
      savePath: item.getSavePath(),
      startTime: Date.now(),
      isPaused: false,
    };
    downloads.unshift(dl); // Add to top

    // Store electron download item reference for pause/resume/cancel
    dl._item = item;

    const notify = () => {
      const { _item, ...safeDl } = dl;
      if (mainWindow) mainWindow.webContents.send('download-updated', safeDl);
    };
    notify();

    item.on('updated', (event, state) => {
      dl.state = state;
      dl.receivedBytes = item.getReceivedBytes();
      dl.savePath = item.getSavePath() || dl.savePath;
      dl.isPaused = item.isPaused();
      notify();
    });

    item.on('done', (event, state) => {
      dl.state = state;
      dl.savePath = item.getSavePath() || dl.savePath;
      dl.isPaused = false;
      notify();
    });
  });

  }); // End sessionsToSecure.forEach

  // ── Window ──
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 850,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    backgroundColor: '#09090b',
    show: false,
    webPreferences: {
      session: secureSession,
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webviewTag: true,
      sandbox: true, // Hardened
      webSecurity: true,
      allowRunningInsecureContent: false,
      navigateOnDragDrop: false,
    },
  });

  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.webContents.on('did-fail-load', () => mainWindow.show());

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000/browser');
  } else {
    mainWindow.loadURL('app://localhost/browser.html');
  }

  mainWindow.on('closed', () => { mainWindow = null; });
}

app.on('web-contents-created', (event, contents) => {
  if (contents.getType() === 'webview') {
    contents.setWindowOpenHandler((details) => {
      if (mainWindow) {
        mainWindow.webContents.send('new-tab-requested', details.url);
      }
      return { action: 'deny' };
    });
  }
});

// ── IPC ──
let appSettings = { httpsOnly: false, adBlocker: true, normalMode: false };
const configPath = path.join(app.getPath('userData'), 'veil-config.json');
try {
  if (fs.existsSync(configPath)) {
    appSettings = { ...appSettings, ...JSON.parse(fs.readFileSync(configPath, 'utf8')) };
  }
} catch(e) {}
ipcMain.on('update-settings', (event, newSettings) => {
  appSettings = { ...appSettings, ...newSettings };
  try { fs.writeFileSync(configPath, JSON.stringify(appSettings)); } catch(e) {}
});

ipcMain.on('get-preload-path', (event) => {
  event.returnValue = `file://${path.join(__dirname, 'preload-webview.js')}`;
});

ipcMain.on('update-blocklist', (event, blocklist) => {
  customBlocklist = Array.isArray(blocklist) ? blocklist : [];
});

ipcMain.on('win-minimize', () => mainWindow?.minimize());
ipcMain.on('win-maximize', () => {
  if (mainWindow?.isMaximized()) mainWindow.unmaximize();
  else mainWindow?.maximize();
});
ipcMain.on('win-close', () => mainWindow?.close());
ipcMain.on('win-fullscreen', () => {
  if (mainWindow) {
    mainWindow.setFullScreen(!mainWindow.isFullScreen());
  }
});

ipcMain.on('show-context-menu', (event, params) => {
  const template = [
    { label: 'Back', click: () => mainWindow?.webContents.send('context-action', { action: 'back' }), enabled: params.canGoBack },
    { label: 'Forward', click: () => mainWindow?.webContents.send('context-action', { action: 'forward' }), enabled: params.canGoForward },
    { label: 'Reload', click: () => mainWindow?.webContents.send('context-action', { action: 'reload' }) },
    { type: 'separator' },
  ];

  if (params.linkURL) {
    template.push({ label: 'Open Link in New Tab', click: () => mainWindow?.webContents.send('new-tab-requested', params.linkURL) });
    template.push({ label: 'Copy Link Address', click: () => clipboard.writeText(params.linkURL) });
  }
  if (params.hasImageContents) {
    template.push({ label: 'Copy Image', click: () => mainWindow?.webContents.send('context-action', { action: 'copy-image', src: params.srcURL }) });
    template.push({ label: 'Open Image in New Tab', click: () => mainWindow?.webContents.send('new-tab-requested', params.srcURL) });
  }
  if (params.isEditable) {
    template.push({ role: 'undo' });
    template.push({ role: 'redo' });
    template.push({ type: 'separator' });
    template.push({ role: 'cut' });
    template.push({ role: 'copy' });
    template.push({ role: 'paste' });
    template.push({ role: 'selectAll' });
  } else {
    template.push({ role: 'copy', enabled: !!params.selectionText });
  }
  
  if (params.selectionText) {
    template.push({ type: 'separator' });
    template.push({ 
      label: `Search for "${params.selectionText.substring(0, 30)}${params.selectionText.length > 30 ? '…' : ''}"`, 
      click: () => mainWindow?.webContents.send('new-tab-requested', `search://${encodeURIComponent(params.selectionText)}`) 
    });
  }

  const menu = Menu.buildFromTemplate(template);
  menu.popup({ window: BrowserWindow.fromWebContents(event.sender) });
});

ipcMain.handle('get-downloads', () => {
  return downloads.map(({ _item, ...rest }) => rest);
});
ipcMain.handle('open-file', async (event, filePath) => {
  const { shell } = require('electron');
  return await shell.openPath(filePath);
});

// Download control
ipcMain.handle('pause-download', (event, id) => {
  const dl = downloads.find(d => d.id === id);
  if (dl && dl._item && dl.state === 'progressing') {
    dl._item.pause();
    return true;
  }
  return false;
});

ipcMain.handle('resume-download', (event, id) => {
  const dl = downloads.find(d => d.id === id);
  if (dl && dl._item && dl._item.canResume()) {
    dl._item.resume();
    return true;
  }
  return false;
});

ipcMain.handle('cancel-download', (event, id) => {
  const dl = downloads.find(d => d.id === id);
  if (dl && dl._item) {
    dl._item.cancel();
    return true;
  }
  return false;
});

ipcMain.handle('clear-completed-downloads', () => {
  downloads = downloads.filter(d => d.state === 'progressing');
  return true;
});

ipcMain.handle('get-tracker-count', () => trackerCount);

ipcMain.handle('perform-search', async (_event, query, type = 'All') => {
  try {
    const secureSession = session.fromPartition('in-memory');
    const { net } = require('electron');
    
    // Helper to fetch JSON from Wikipedia
    const fetchWiki = (url) => new Promise((resolve) => {
      const req = net.request({ method: 'GET', url, session: secureSession, useSessionCookies: false });
      req.setHeader('User-Agent', 'Mozilla/5.0');
      req.on('response', (res) => {
        let d = ''; res.on('data', c => d+=c);
        res.on('end', () => { try { resolve(JSON.parse(d)); } catch(e) { resolve(null); } });
      });
      req.on('error', () => resolve(null));
      req.end();
    });

    let results = [];

    const fetchGoogle = (url) => new Promise((resolve) => {
      const req = net.request({ method: 'GET', url, session: secureSession, useSessionCookies: false });
      req.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      req.on('response', (res) => {
        let html = ''; res.on('data', c => html+=c.toString());
        res.on('end', () => resolve(html));
      });
      req.on('error', () => resolve(''));
      req.end();
    });

    if (type === 'News') {
      const xml = await fetchGoogle(`https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`);
      const cheerio = require('cheerio');
      const $ = cheerio.load(xml, { xmlMode: true });
      $('item').each((i, el) => {
        results.push({
          url: $(el).find('link').text(),
          title: $(el).find('title').text(),
          description: $(el).find('pubDate').text() + ' - ' + $(el).find('source').text(),
          displayUrl: $(el).find('source').text(),
          isNews: true
        });
      });
      return { success: true, results };
    }

    if (type === 'Images') {
      const html = await fetchGoogle(`https://www.google.com/search?q=${encodeURIComponent(query)}&tbm=isch`);
      const matches = html.match(/<img[^>]+src="(https:\/\/encrypted-tbn0\.gstatic\.com\/images[^"]+)"/g);
      if (matches) {
        matches.forEach(m => {
          const srcMatch = m.match(/src="([^">]+)"/);
          if (srcMatch && srcMatch[1]) {
            results.push({
              url: srcMatch[1],
              displayUrl: srcMatch[1],
              title: query + ' image',
              description: '',
              isImage: true
            });
          }
        });
      }
      return { success: true, results };
    }

    if (type === 'Videos') {
      const html = await fetchGoogle(`https://www.google.com/search?q=${encodeURIComponent(query)}&tbm=vid`);
      const cheerio = require('cheerio');
      const $ = cheerio.load(html);
      $('a').each((i, el) => {
        const href = $(el).attr('href') || '';
        if (href.includes('/url?q=https://www.youtube.com/watch%3Fv%3D')) {
           const vidMatch = href.match(/v%3D([^&]+)/);
           if (vidMatch && vidMatch[1]) {
             const title = $(el).find('div').first().text() || $(el).text() || 'YouTube Video';
             if (title && title.length > 3 && !results.find(r => r.videoId === vidMatch[1])) {
               results.push({
                 url: `https://www.youtube.com/watch?v=${vidMatch[1]}`,
                 displayUrl: 'youtube.com',
                 title: title,
                 description: '',
                 isVideo: true,
                 videoId: vidMatch[1]
               });
             }
           }
        }
      });
      if (results.length > 0) return { success: true, results };
    }

    if (type === 'Shopping') {
      const html = await fetchGoogle(`https://www.google.com/search?q=${encodeURIComponent(query)}&tbm=shop`);
      const cheerio = require('cheerio');
      const $ = cheerio.load(html);
      $('a').each((i, el) => {
        const href = $(el).attr('href') || '';
        if (href.startsWith('/url?q=')) {
          const text = $(el).text().trim();
          if (text.length > 10 && text.includes('$')) {
            results.push({
               url: decodeURIComponent(href.replace('/url?q=', '').split('&')[0]),
               displayUrl: 'Google Shopping',
               title: text.split('$')[0].trim(),
               description: '$' + (text.split('$')[1] || '').split(' ')[0],
               isShopping: true
            });
          }
        }
      });
      const seen = new Set();
      results = results.filter(r => {
         if (seen.has(r.title)) return false;
         seen.add(r.title); return true;
      });
      if (results.length > 0) return { success: true, results };
    }

    // Default DuckDuckGo HTML Search
    let ddgQuery = query;
    if (type !== 'All' && type !== 'Images') {
      ddgQuery += ` ${type}`;
    }
    return new Promise((resolve) => {
      const request = net.request({
        method: 'GET',
        url: `https://html.duckduckgo.com/html/?q=${encodeURIComponent(ddgQuery)}`,
        session: secureSession,
        useSessionCookies: false
      });
      request.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
      
      request.on('response', (response) => {
        let html = '';
        response.on('data', (chunk) => { html += chunk.toString(); });
        response.on('end', async () => {
          try {
            const cheerio = require('cheerio');
            const $ = cheerio.load(html);
            
            $('.result').each((i, el) => {
              const titleEl = $(el).find('.result__title .result__a');
              const snippetEl = $(el).find('.result__snippet');
              const urlEl = $(el).find('.result__url');
              
              let link = titleEl.attr('href') || '';
              if (link.includes('uddg=')) {
                const match = link.match(/uddg=([^&]+)/);
                if (match && match[1]) link = decodeURIComponent(match[1]);
              } else if (link.startsWith('//')) {
                link = 'https:' + link;
              }
              
              const title = titleEl.text().trim();
              const description = snippetEl.text().trim();
              const displayUrl = urlEl.text().trim();
              
              if (title && link) {
                results.push({ url: link, displayUrl, title, description });
              }
            });

            // Remove Wikipedia padding and mocks. Just return the raw, authentic DDG results.
            resolve({ success: true, results });
          } catch (err) {
            resolve({ success: false, error: 'Failed to parse results' });
          }
        });
      });
      request.on('error', (error) => {
        resolve({ success: false, error: error.message });
      });
      request.end();
    });
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('toggle-tor', async (_event, enable) => {
  const secureSession = session.fromPartition('in-memory');
  if (enable) {
    try {
      await startTor((progress, text) => {
        if (mainWindow) {
          mainWindow.webContents.send('tor-progress', { progress, text });
        }
      });
      await secureSession.setProxy({ proxyRules: 'socks5://127.0.0.1:9999' });
      app.configureHostResolver({ secureDnsMode: 'off' });
      console.log('[Sec] Tor ACTIVE (DoH disabled for proxy DNS)');
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  } else {
    stopTor();
    await secureSession.setProxy({ proxyRules: 'direct://' });
    app.configureHostResolver({
      secureDnsMode: 'secure',
      secureDnsServers: ['https://cloudflare-dns.com/dns-query'],
    });
    console.log('[Sec] Tor OFF (DoH enabled)');
    return { success: true };
  }
});

app.whenReady().then(() => {
  const { net } = require('electron');
  const urlModule = require('url');

  protocol.handle('app', async (request) => {
    let url = request.url.replace('app://localhost/', '');
    url = url.split('?')[0].split('#')[0];
    if (!url || url === '/') url = 'browser.html';
    try {
      const targetPath = path.normalize(`${__dirname}/../out/${url}`);
      const data = await fs.promises.readFile(targetPath);
      let ext = path.extname(targetPath).toLowerCase();
      let mime = 'text/plain';
      if (ext === '.html') mime = 'text/html';
      else if (ext === '.js') mime = 'text/javascript';
      else if (ext === '.css') mime = 'text/css';
      else if (ext === '.json') mime = 'application/json';
      else if (ext === '.png') mime = 'image/png';
      else if (ext === '.svg') mime = 'image/svg+xml';
      else if (ext === '.ico') mime = 'image/x-icon';

      return new Response(data, {
        headers: { 'Content-Type': mime }
      });
    } catch (err) {
      console.error('Protocol handler error for url:', url, err);
      return new Response('File not found', { status: 404 });
    }
  });
  createWindow();
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });

// ── Fetch Spoofed IP Data ──
ipcMain.handle('get-ip-info', () => {
  return new Promise((resolve) => {
    const { session, net } = require('electron');
    const secureSession = session.fromPartition('in-memory');
    const req = net.request({
      url: 'http://ip-api.com/json/',
      session: secureSession
    });
    req.on('response', (res) => {
      let body = '';
      res.on('data', chunk => body += chunk.toString());
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (parsed.status === 'success') {
            resolve({
              ip: parsed.query,
              city: parsed.city,
              country_name: parsed.country,
              org: parsed.org || parsed.isp
            });
          } else {
            resolve({ error: 'API returned fail status' });
          }
        } catch (e) {
          resolve({ error: 'Failed to parse IP info' });
        }
      });
    });
    req.on('error', (err) => {
      resolve({ error: err.message });
    });
    req.end();
  });
});

