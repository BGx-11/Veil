const { app, BrowserWindow, session, ipcMain, Menu, clipboard } = require('electron');
const path = require('path');
const { ElectronBlocker } = require('@ghostery/adblocker-electron');
const fetch = require('cross-fetch');
const fs = require('fs');
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

let mainWindow;
let blockerInstance = null;
let trackerCount = 0;
let customBlocklist = [];
const isDev = !app.isPackaged;

async function createWindow() {

  // ── In-memory session (NOTHING persists to disk, but caches in RAM for speed) ──
  const secureSession = session.fromPartition('in-memory');

  // ── Ghostery Ad/Tracker Blocker ──
  try {
    const enginePath = path.join(app.getPath('userData'), 'engine.bin');
    blockerInstance = await ElectronBlocker.fromPrebuiltAdsAndTracking(fetch, {
      path: enginePath,
      read: fs.promises.readFile,
      write: fs.promises.writeFile
    });
    blockerInstance.enableBlockingInSession(secureSession);
    // Count blocked requests
    blockerInstance.on('request-blocked', () => {
      trackerCount++;
      if (mainWindow) mainWindow.webContents.send('tracker-blocked', trackerCount);
    });
    console.log('[Sec] Ad/tracker blocker ACTIVE');
  } catch (err) {
    console.error('[Sec] AdBlocker failed:', err.message);
  }

  // ── Selective Permission Handler ──
  const allowedPermissions = ['fullscreen', 'media', 'pointerLock', 'pictureInPicture'];
  secureSession.setPermissionRequestHandler((_wc, permission, cb) => {
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

    try {
      if (details.url && !details.url.startsWith('browser://') && !details.url.startsWith('search://')) {
        const urlObj = new URL(details.url);
        const host = urlObj.hostname;
        if (customBlocklist.some(blocked => host === blocked || host.endsWith('.' + blocked))) {
          // Send event to UI that a request was blocked
          if (mainWindow) {
            mainWindow.webContents.send('tracker-blocked', trackerCount + 1); // visually increment
          }
          trackerCount++;
          return callback({ cancel: true });
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

    // REMOVED: X-Forwarded-For and Client-IP headers.
    // Injecting random IP headers triggers strict bot-protection on YouTube and Cloudflare!

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
        'magnetometer=(), gyroscope=(), accelerometer=()'
      ];
    } else {
      // For external sites, just force some basic protections without breaking functionality
      headers['X-XSS-Protection'] = ['1; mode=block'];
      headers['Referrer-Policy'] = ['strict-origin-when-cross-origin'];
      
      // We do NOT inject X-Frame-Options: SAMEORIGIN here, because it breaks 
      // embedded Vimeo/YouTube players on external sites.
    }

    callback({ cancel: false, responseHeaders: headers });
  });

  // ── Standardise User-Agent to evade bot detection ──
  const pristineUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  secureSession.setUserAgent(pristineUA);
  app.userAgentFallback = pristineUA;

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
      sandbox: false,
    },
  });

  mainWindow.once('ready-to-show', () => mainWindow.show());

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../out/index.html'));
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
let appSettings = { httpsOnly: false };
ipcMain.on('update-settings', (event, newSettings) => {
  appSettings = { ...appSettings, ...newSettings };
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

ipcMain.on('show-context-menu', (event, params) => {
  const template = [
    { label: 'Back', click: () => mainWindow?.webContents.send('context-action', { action: 'back' }), enabled: params.canGoBack },
    { label: 'Forward', click: () => mainWindow?.webContents.send('context-action', { action: 'forward' }), enabled: params.canGoForward },
    { label: 'Reload', click: () => mainWindow?.webContents.send('context-action', { action: 'reload' }) },
    { type: 'separator' },
  ];

  if (params.linkURL) {
    template.push({ label: 'Copy Link Address', click: () => clipboard.writeText(params.linkURL) });
  }
  if (params.hasImageContents) {
    template.push({ label: 'Copy Image', click: () => mainWindow?.webContents.send('context-action', { action: 'copy-image', x: params.x, y: params.y }) });
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

  const menu = Menu.buildFromTemplate(template);
  menu.popup({ window: BrowserWindow.fromWebContents(event.sender) });
});

ipcMain.handle('get-tracker-count', () => trackerCount);

ipcMain.handle('perform-search', async (_event, query) => {
  try {
    const secureSession = session.fromPartition('in-memory');
    const { net } = require('electron');
    return new Promise((resolve) => {
      const request = net.request({
        method: 'GET',
        url: `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
        session: secureSession,
        useSessionCookies: false
      });
      request.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      request.setHeader('Accept', 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8');
      request.setHeader('Accept-Language', 'en-US,en;q=0.5');

      request.on('response', (response) => {
        let html = '';
        response.on('data', (chunk) => { html += chunk.toString(); });
        response.on('end', () => {
          try {
            const cheerio = require('cheerio');
            const $ = cheerio.load(html);
            const results = [];
            
            $('.result').each((i, el) => {
              if (results.length >= 10) return false;
              
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

app.whenReady().then(createWindow);
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
