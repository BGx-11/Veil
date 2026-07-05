import { create } from 'zustand';
import { addHistoryToDb } from './historyDb';

export interface Tab {
  id: string;
  title: string;
  url: string;
  history: string[];
  historyIndex: number;
  loading: boolean;
  error?: string;
  mediaPlaying?: boolean;
  cameraUsing?: boolean;
  micUsing?: boolean;
  muted?: boolean;
  blockedTrackers?: number;
  redirectChain?: string[];
  favicon?: string;
  pinned?: boolean;
  loadProgress?: number;
  readerMode?: boolean;
  zoomLevel?: number; // percentage, default 100
  groupId?: string;
}

export interface TabGroup {
  id: string;
  name: string;
  color: string; // tailwind color name like 'red', 'blue', 'green', etc.
  collapsed?: boolean;
}

export interface HistoryEntry {
  url: string;
  title: string;
  timestamp: number;
}

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'info' | 'warning';
}

export interface DownloadItem {
  id: string;
  filename: string;
  url: string;
  totalBytes: number;
  receivedBytes: number;
  state: 'progressing' | 'completed' | 'cancelled' | 'interrupted';
  savePath: string;
  startTime?: number;
  isPaused?: boolean;
}

export interface ShortcutItem {
  id: string;
  name: string;
  url: string;
  icon: string; // Lucide icon name or URL
  color?: string; // hex color or tailwind class
}

export interface Note {
  id: string;
  title: string;
  content: string;
  updatedAt: number;
}

export interface PasswordEntry {
  id: string;
  domain: string;
  username: string;
  password: string;
  updatedAt: number;
}

export interface BrowserSettings {
  adBlocker: boolean;
  stripReferer: boolean;
  blockCookies: boolean;
  canvasNoise: boolean;
  dnsOverHttps: boolean;
  blockWebRTC: boolean;
  torMode: boolean;
  torStatus?: 'disconnected' | 'connecting' | 'connected';
  httpsOnly: boolean;
  darkMode: boolean;
  normalMode: boolean;
  slmConsent?: boolean;
  bookmarks: {url: string, title: string}[];
  blocklist: string[];
  searchEngine: 'duckduckgo' | 'google' | 'bing' | 'brave' | 'yahoo';
  sidebarApps: ShortcutItem[];
  newTabShortcuts: ShortcutItem[];
  notes: Note[];
  passwords: PasswordEntry[];
  defaultZoom: number; // default zoom percentage for new tabs
}

export const NEWTAB = 'veil://newtab';
export const SETTINGS = 'veil://settings';
export const HISTORY = 'veil://history';

export function isInternal(url: string) {
  return url.startsWith('veil://') || url.startsWith('search://');
}

export function unwrapProxyUrl(url: string): string {
  if (!url) return '';
  try {
    const u = new URL(url);
    if (u.pathname === '/proxy' && u.searchParams.has('url')) {
      return u.searchParams.get('url') || url;
    }
  } catch {}
  return url;
}

export function getInternalTitle(url: string): string {
  if (url === 'veil://settings') return 'Settings';
  if (url === 'veil://downloads') return 'Downloads';
  if (url === 'veil://notes') return 'Secure Notes';
  if (url === 'veil://passwords') return 'Password Manager';
  if (url === 'veil://inspector') return 'Site Inspector';
  if (url === 'veil://history') return 'History';
  if (url === 'veil://bookmarks') return 'Bookmarks';
  if (url === NEWTAB) return 'New Tab';
  if (url.startsWith('search://')) return 'Search: ' + decodeURIComponent(url.replace('search://', ''));
  return url;
}

interface BrowserStore {
  tabs: Tab[];
  activeId: string;
  globalHistory: HistoryEntry[];
  recentlyClosed: Tab[];
  sidebarOpen: boolean;
  sidebarWidth: number;
  splitTabId: string | null;
  findBarOpen: boolean;
  slmOpen: boolean;
  tabSearchOpen: boolean;
  fullscreen: boolean;
  tabGroups: TabGroup[];
  settings: BrowserSettings;
  toasts: Toast[];
  torLogs: string[];
  downloads: DownloadItem[];

  // Actions
  setTabs: (tabs: Tab[] | ((prev: Tab[]) => Tab[])) => void;
  setActiveId: (id: string) => void;
  addTab: (url?: string) => void;
  closeTab: (id: string) => void;
  updateTab: (id: string, updates: Partial<Tab>) => void;
  reopenClosedTab: () => void;
  setSidebarOpen: (open: boolean) => void;
  setSidebarWidth: (width: number) => void;
  setSplitTabId: (id: string | null) => void;
  setFindBarOpen: (open: boolean) => void;
  setSlmOpen: (open: boolean) => void;
  setTabSearchOpen: (open: boolean) => void;
  setFullscreen: (fs: boolean) => void;
  updateSettings: (updates: Partial<BrowserSettings>) => void;
  addToast: (message: string, type?: 'success' | 'info' | 'warning') => void;
  removeToast: (id: string) => void;
  setGlobalHistory: (history: HistoryEntry[] | ((prev: HistoryEntry[]) => HistoryEntry[])) => void;
  addHistoryEntry: (entry: HistoryEntry) => void;
  addTorLog: (log: string) => void;

  // Zoom
  zoomIn: (tabId?: string) => void;
  zoomOut: (tabId?: string) => void;
  resetZoom: (tabId?: string) => void;

  // Tab Groups
  addTabGroup: (name: string, color: string) => void;
  removeTabGroup: (id: string) => void;
  toggleGroupCollapse: (id: string) => void;
  moveTabToGroup: (tabId: string, groupId: string | undefined) => void;

  // Downloads
  addOrUpdateDownload: (dl: DownloadItem) => void;
  removeDownload: (id: string) => void;
  clearCompletedDownloads: () => void;
}

export const useBrowserStore = create<BrowserStore>((set, get) => ({
  tabs: [{ id: '1', title: 'New Tab', url: NEWTAB, history: [NEWTAB], historyIndex: 0, loading: false, zoomLevel: 100 }],
  activeId: '1',
  globalHistory: [],
  recentlyClosed: [],
  sidebarOpen: true,
  sidebarWidth: 280,
  splitTabId: null,
  findBarOpen: false,
  slmOpen: false,
  tabSearchOpen: false,
  fullscreen: false,
  tabGroups: [],
  settings: {
    adBlocker: true,
    stripReferer: true,
    blockCookies: true,
    canvasNoise: true,
    dnsOverHttps: true,
    blockWebRTC: true,
    torMode: false,
    torStatus: 'disconnected',
    httpsOnly: false,
    darkMode: false,
    normalMode: false,
    slmConsent: false,
    bookmarks: [],
    blocklist: [],
    searchEngine: 'yahoo',
    defaultZoom: 100,
    sidebarApps: [
      { id: '1', name: 'Veil AI', url: 'veil://slm', icon: 'Sparkles', color: 'orange-400' },
      { id: '2', name: 'Passwords', url: 'veil://passwords', icon: 'Key', color: 'indigo-500' },
      { id: '3', name: 'Inspector', url: 'veil://inspector', icon: 'Code', color: 'indigo-400' },
      { id: '4', name: 'Notes', url: 'veil://notes', icon: 'FileText', color: 'purple-400' }
    ],
    newTabShortcuts: [
      { id: '1', name: 'GitHub', url: 'https://github.com', icon: 'Github', color: 'slate-800' },
      { id: '2', name: 'X', url: 'https://x.com', icon: 'Twitter', color: 'sky-500' }
    ],
    notes: [],
    passwords: []
  },
  toasts: [],
  torLogs: [],
  downloads: [],

  setTabs: (tabsOrFn) => set((state) => ({ 
    tabs: typeof tabsOrFn === 'function' ? tabsOrFn(state.tabs) : tabsOrFn 
  })),

  setActiveId: (id) => set((state) => {
    if (state.splitTabId === id) {
      return { activeId: id, splitTabId: state.activeId };
    }
    return { activeId: id };
  }),

  addTab: (url?: string) => {
    const id = Math.random().toString(36).slice(2, 11);
    const targetUrl = typeof url === 'string' ? url : NEWTAB;
    const title = getInternalTitle(targetUrl);
    const defaultZoom = get().settings.defaultZoom || 100;
    set((state) => ({
      tabs: [...state.tabs, { id, title, url: targetUrl, history: [targetUrl], historyIndex: 0, loading: false, zoomLevel: defaultZoom }],
      activeId: id
    }));
  },

  closeTab: (id) => {
    set((state) => {
      if (state.tabs.length <= 1) return state; // Don't close last tab
      const closedTab = state.tabs.find(t => t.id === id);
      const recentlyClosed = closedTab 
        ? [closedTab, ...state.recentlyClosed].slice(0, 10) 
        : state.recentlyClosed;
      
      const rest = state.tabs.filter((t) => t.id !== id);
      const newActiveId = state.activeId === id ? rest[rest.length - 1].id : state.activeId;
      const newSplitTabId = state.splitTabId === id ? null : state.splitTabId;
      
      return { tabs: rest, recentlyClosed, activeId: newActiveId, splitTabId: newSplitTabId };
    });
  },

  updateTab: (id, updates) => {
    set((state) => ({
      tabs: state.tabs.map((t) => (t.id === id ? { ...t, ...updates } : t))
    }));
  },

  reopenClosedTab: () => {
    set((state) => {
      if (state.recentlyClosed.length === 0) return state;
      const tab = state.recentlyClosed[0];
      const recentlyClosed = state.recentlyClosed.slice(1);
      const newId = Math.random().toString(36).slice(2, 11);
      const restoredTab: Tab = { ...tab, id: newId, loading: false, error: undefined };
      
      return {
        tabs: [...state.tabs, restoredTab],
        activeId: newId,
        recentlyClosed
      };
    });
    get().addToast('Tab restored', 'info');
  },

  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setSidebarWidth: (width) => set({ sidebarWidth: width }),
  setSplitTabId: (id) => set({ splitTabId: id }),
  setFindBarOpen: (open) => set({ findBarOpen: open }),
  setSlmOpen: (open) => set({ slmOpen: open }),
  setTabSearchOpen: (open) => set({ tabSearchOpen: open }),
  setFullscreen: (fs) => set({ fullscreen: fs }),
  
  updateSettings: (updates) => set((state) => ({
    settings: { ...state.settings, ...updates }
  })),

  addToast: (message, type = 'info') => {
    const id = Math.random().toString(36).slice(2);
    set((state) => ({ toasts: [...state.toasts, { id, message, type }] }));
    setTimeout(() => {
      get().removeToast(id);
    }, 3000);
  },

  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id)
    }));
  },

  setGlobalHistory: (historyOrFn) => set((state) => ({
    globalHistory: typeof historyOrFn === 'function' ? historyOrFn(state.globalHistory) : historyOrFn
  })),

  addHistoryEntry: (entry) => {
    set((state) => {
      if (state.globalHistory[0]?.url === entry.url) return state;
      addHistoryToDb(entry);
      return { globalHistory: [entry, ...state.globalHistory] };
    });
  },

  addTorLog: (log) => {
    set((state) => ({ torLogs: [...state.torLogs, log].slice(-20) }));
  },

  // Zoom
  zoomIn: (tabId?: string) => {
    const id = tabId || get().activeId;
    set((state) => ({
      tabs: state.tabs.map(t => t.id === id ? { ...t, zoomLevel: Math.min(300, (t.zoomLevel || 100) + 10) } : t)
    }));
  },
  zoomOut: (tabId?: string) => {
    const id = tabId || get().activeId;
    set((state) => ({
      tabs: state.tabs.map(t => t.id === id ? { ...t, zoomLevel: Math.max(30, (t.zoomLevel || 100) - 10) } : t)
    }));
  },
  resetZoom: (tabId?: string) => {
    const id = tabId || get().activeId;
    const defaultZoom = get().settings.defaultZoom || 100;
    set((state) => ({
      tabs: state.tabs.map(t => t.id === id ? { ...t, zoomLevel: defaultZoom } : t)
    }));
  },

  // Tab Groups
  addTabGroup: (name, color) => {
    const id = Math.random().toString(36).slice(2, 11);
    set((state) => ({ tabGroups: [...state.tabGroups, { id, name, color }] }));
  },
  removeTabGroup: (id) => {
    set((state) => ({
      tabGroups: state.tabGroups.filter(g => g.id !== id),
      tabs: state.tabs.map(t => t.groupId === id ? { ...t, groupId: undefined } : t)
    }));
  },
  toggleGroupCollapse: (id) => {
    set((state) => ({
      tabGroups: state.tabGroups.map(g => g.id === id ? { ...g, collapsed: !g.collapsed } : g)
    }));
  },
  moveTabToGroup: (tabId, groupId) => {
    set((state) => ({
      tabs: state.tabs.map(t => t.id === tabId ? { ...t, groupId } : t)
    }));
  },

  addOrUpdateDownload: (dl) => {
    set((state) => {
      const existing = state.downloads.find(d => d.id === dl.id);
      if (existing) {
        return { downloads: state.downloads.map(d => d.id === dl.id ? { ...d, ...dl } : d) };
      }
      return { downloads: [dl, ...state.downloads] };
    });
  },

  removeDownload: (id) => {
    set((state) => ({ downloads: state.downloads.filter(d => d.id !== id) }));
  },

  clearCompletedDownloads: () => {
    set((state) => ({ downloads: state.downloads.filter(d => d.state === 'progressing') }));
  }
}));
