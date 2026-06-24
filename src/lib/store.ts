import { create } from 'zustand';

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
  blockedTrackers?: number;
  redirectChain?: string[];
  favicon?: string;
  pinned?: boolean;
  loadProgress?: number;
  readerMode?: boolean;
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

export interface BrowserSettings {
  adBlocker: boolean;
  stripReferer: boolean;
  blockCookies: boolean;
  canvasNoise: boolean;
  dnsOverHttps: boolean;
  blockWebRTC: boolean;
  torMode: boolean;
  httpsOnly: boolean;
  darkMode: boolean;
  normalMode: boolean;
  bookmarks: {url: string, title: string}[];
  blocklist: string[];
}

export const NEWTAB = 'browser://newtab';
export const SETTINGS = 'browser://settings';
export const HISTORY = 'browser://history';

export function isInternal(url: string) {
  return url.startsWith('browser://') || url.startsWith('search://');
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
  settings: BrowserSettings;
  toasts: Toast[];
  torLogs: string[];

  // Actions
  setTabs: (tabs: Tab[] | ((prev: Tab[]) => Tab[])) => void;
  setActiveId: (id: string) => void;
  addTab: () => void;
  closeTab: (id: string) => void;
  updateTab: (id: string, updates: Partial<Tab>) => void;
  reopenClosedTab: () => void;
  setSidebarOpen: (open: boolean) => void;
  setSidebarWidth: (width: number) => void;
  setSplitTabId: (id: string | null) => void;
  setFindBarOpen: (open: boolean) => void;
  setSlmOpen: (open: boolean) => void;
  updateSettings: (updates: Partial<BrowserSettings>) => void;
  addToast: (message: string, type?: 'success' | 'info' | 'warning') => void;
  removeToast: (id: string) => void;
  setGlobalHistory: (history: HistoryEntry[] | ((prev: HistoryEntry[]) => HistoryEntry[])) => void;
  addHistoryEntry: (entry: HistoryEntry) => void;
  addTorLog: (log: string) => void;
}

export const useBrowserStore = create<BrowserStore>((set, get) => ({
  tabs: [{ id: '1', title: 'New Tab', url: NEWTAB, history: [NEWTAB], historyIndex: 0, loading: false }],
  activeId: '1',
  globalHistory: [],
  recentlyClosed: [],
  sidebarOpen: true,
  sidebarWidth: 280,
  splitTabId: null,
  findBarOpen: false,
  slmOpen: false,
  settings: {
    adBlocker: true,
    stripReferer: true,
    blockCookies: true,
    canvasNoise: true,
    dnsOverHttps: true,
    blockWebRTC: true,
    torMode: false,
    httpsOnly: false,
    darkMode: true,
    normalMode: false,
    bookmarks: [],
    blocklist: []
  },
  toasts: [],
  torLogs: [],

  setTabs: (tabsOrFn) => set((state) => ({ 
    tabs: typeof tabsOrFn === 'function' ? tabsOrFn(state.tabs) : tabsOrFn 
  })),

  setActiveId: (id) => set({ activeId: id }),

  addTab: () => {
    const id = Math.random().toString(36).slice(2, 11);
    set((state) => ({
      tabs: [...state.tabs, { id, title: 'New Tab', url: NEWTAB, history: [NEWTAB], historyIndex: 0, loading: false }],
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
      const activeId = state.activeId === id ? rest[rest.length - 1].id : state.activeId;
      
      return { tabs: rest, recentlyClosed, activeId };
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
      return { globalHistory: [entry, ...state.globalHistory] };
    });
  },

  addTorLog: (log) => {
    set((state) => ({ torLogs: [...state.torLogs, log].slice(-20) }));
  }
}));
