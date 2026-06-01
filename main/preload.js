const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  toggleTor:      (enable) => ipcRenderer.invoke('toggle-tor', enable),
  getPreloadPath: ()       => ipcRenderer.sendSync('get-preload-path'),
  performSearch:  (query)  => ipcRenderer.invoke('perform-search', query),
  getTrackerCount: ()      => ipcRenderer.invoke('get-tracker-count'),
  updateBlocklist: (list)  => ipcRenderer.send('update-blocklist', list),
  updateSettings:  (s)     => ipcRenderer.send('update-settings', s),

  // Window controls
  winMinimize: () => ipcRenderer.send('win-minimize'),
  winMaximize: () => ipcRenderer.send('win-maximize'),
  winClose:    () => ipcRenderer.send('win-close'),

  // Context Menu
  showContextMenu: (params) => ipcRenderer.send('show-context-menu', params),

  // Listen for tracker blocked events
  onTrackerBlocked: (cb) => ipcRenderer.on('tracker-blocked', (_e, count) => cb(count)),

  // Downloads
  getDownloads: () => ipcRenderer.invoke('get-downloads'),
  openFile: (path) => ipcRenderer.invoke('open-file', path),
  onDownloadUpdated: (cb) => {
    ipcRenderer.removeAllListeners('download-updated');
    ipcRenderer.on('download-updated', (_e, dl) => cb(dl));
  },
  
  // Listen for new tab requests (target="_blank")
  onNewTabRequested: (cb) => {
    // Remove previous listeners to prevent duplicates
    ipcRenderer.removeAllListeners('new-tab-requested');
    ipcRenderer.on('new-tab-requested', (_e, url) => cb(url));
  },

  // Fetch Spoofed IP/Location
  getIpInfo: () => ipcRenderer.invoke('get-ip-info'),
  
  // Tor bootstrap progress
  onTorProgress: (cb) => {
    ipcRenderer.removeAllListeners('tor-progress');
    ipcRenderer.on('tor-progress', (_e, data) => cb(data));
  }
});
