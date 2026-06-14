'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import {
  Shield, Plus, X, ArrowLeft, ArrowRight, RotateCw, Home, Lock, Unlock, Settings as SettingsIcon, LayoutDashboard, Globe, List, Monitor, Maximize, Minus, Square, PanelLeft, EyeOff, Check, XCircle, Mic, Video, VolumeX, Eye, Search, Volume2, Languages, Bot, Download, BookOpen, Clock, Pin, Columns2, MoreVertical, Star, Sun, Moon
} from 'lucide-react';

const OnionIcon = ({ size = 24, color = "currentColor" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" />
    <path d="M12 18C15.3137 18 18 15.3137 18 12C18 8.68629 15.3137 6 12 6C8.68629 6 6 8.68629 6 12C6 15.3137 8.68629 18 12 18Z" />
    <path d="M12 14C13.1046 14 14 13.1046 14 12C14 10.8954 13.1046 10 12 10C10.8954 10 10 10.8954 10 12C10 13.1046 10.8954 14 12 14Z" />
  </svg>
);

import SearchResults from '../SearchResults';
import NewTab from '../NewTab';
import Settings from '../Settings';
import SLMPanel from '../SLMPanel';
import Downloads from '../Downloads';
import FindBar from '../FindBar';
import History from '../History';
import ReaderMode from '../ReaderMode';

/* ─── Types ─── */
interface Tab {
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

interface HistoryEntry {
  url: string;
  title: string;
  timestamp: number;
}

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'info' | 'warning';
}

const NEWTAB = 'browser://newtab';
const SETTINGS = 'browser://settings';
const HISTORY = 'browser://history';

function isInternal(url: string) {
  return url.startsWith('browser://') || url.startsWith('search://');
}
function displayUrl(url: string) {
  if (url === NEWTAB) return '';
  if (url === SETTINGS) return 'Settings';
  if (url === HISTORY) return 'History';
  if (url.startsWith('search://')) return decodeURIComponent(url.replace('search://', ''));
  return url;
}

const TabItem = React.memo(({ tab, activeId, sidebarOpen, onSelect, onClose, onPin, onDragStart, onDragOver, onDragEnd, onDrop, isDragOver }: any) => {
  const isActive = activeId === tab.id;
  return (
    <div
      className={`tab-item ${isActive ? 'active' : ''} ${tab.pinned ? 'pinned' : ''} ${isDragOver ? 'drag-over' : ''}`}
      onClick={() => onSelect(tab.id)}
      title={!sidebarOpen ? (tab.title || 'New Tab') : ''}
      draggable
      onDragStart={(e) => onDragStart(e, tab.id)}
      onDragOver={(e) => onDragOver(e, tab.id)}
      onDragEnd={onDragEnd}
      onDrop={(e) => onDrop(e, tab.id)}
      onDoubleClick={() => onPin(tab.id)}
    >
      <div className="tab-item-icon-wrap">
        {tab.favicon ? (
          <img src={tab.favicon} className="tab-favicon" alt="" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        ) : (
          <Globe className="tab-item-icon" />
        )}
      </div>
      {!tab.pinned && (
        <div className="tab-title" style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center' }}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{tab.title}</span>
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginRight: tab.pinned ? '0' : '4px' }}>
        {tab.pinned && <Pin size={10} color="var(--accent)" />}
        {tab.cameraUsing && <Video size={12} color="var(--red)" />}
        {tab.micUsing && <Mic size={12} color="var(--orange)" />}
        {tab.mediaPlaying && !tab.cameraUsing && !tab.micUsing && <Volume2 size={12} color="var(--accent)" />}
      </div>
      {tab.loading && <div className="tab-item-dot" />}
      {!tab.pinned && (
        <button className="tab-item-close" onClick={(e) => onClose(e, tab.id)}>
          <X size={11} />
        </button>
      )}
    </div>
  );
});

export default function BrowserShell() {
  const [tabs, setTabs] = useState<Tab[]>([
    { id: '1', title: 'New Tab', url: NEWTAB, history: [NEWTAB], historyIndex: 0, loading: false },
  ]);
  const [activeId, setActiveId] = useState('1');
  const [urlInput, setUrlInput] = useState('');
  const [mounted, setMounted] = useState(false);
  const [preloadPath, setPreloadPath] = useState('');
  const [trackerCount, setTrackerCount] = useState(0);
  const [ipInfo, setIpInfo] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [slmOpen, setSlmOpen] = useState(false);
  const [slmContext, setSlmContext] = useState<string>('');
  const [shieldOpen, setShieldOpen] = useState(false);
  const [translateOpen, setTranslateOpen] = useState(false);
  const [translateTarget, setTranslateTarget] = useState('en');
  const [torBootstrapping, setTorBootstrapping] = useState(false);
  const [torProgress, setTorProgress] = useState({ percent: 0, text: '' });
  const [torError, setTorError] = useState('');
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);

  // New feature states
  const [findBarOpen, setFindBarOpen] = useState(false);
  const [globalHistory, setGlobalHistory] = useState<HistoryEntry[]>([]);
  const [recentlyClosed, setRecentlyClosed] = useState<Tab[]>([]);
  const [splitTabId, setSplitTabId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [draggedTabId, setDraggedTabId] = useState<string | null>(null);
  const [dragOverTabId, setDragOverTabId] = useState<string | null>(null);

  const [sidebarWidth, setSidebarWidth] = useState(280);
  const isDraggingRef = useRef(false);

  const urlInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = () => {
      setTranslateOpen(false);
      setShieldOpen(false);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleSidebarMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    const onMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      setSidebarWidth(Math.max(150, Math.min(e.clientX, 600)));
    };
    const onMouseUp = () => {
      isDraggingRef.current = false;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const [settings, setSettings] = useState({
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
    bookmarks: [] as {url: string, title: string}[],
    blocklist: [] as string[]
  });
  
  const settingsRef = useRef(settings);
  useEffect(() => { settingsRef.current = settings; }, [settings]);

  const wvRefs = useRef<Record<string, any>>({});
  const api: any = {
    invoke,
    getPreloadPath: () => '',
    getTrackerCount: async () => 0,
    onTrackerBlocked: (_cb: any) => {},
    onNewTabRequested: (_cb: any) => {},
    onTorProgress: null,
    showContextMenu: () => {},
    getIpInfo: async () => ({ ip: '127.0.0.1', country: 'Unknown' }),
    winFullscreen: () => { try { invoke('plugin:window|set_fullscreen', { value: true }); } catch (_e) {} },
    winMinimize: () => { try { invoke('plugin:window|minimize'); } catch (_e) {} },
    winMaximize: () => { try { invoke('plugin:window|toggle_maximize'); } catch (_e) {} },
    winClose: () => { try { invoke('plugin:window|close'); } catch (_e) {} },
    toggleTor: async (v: boolean) => invoke('toggle_tor', { enable: v }),
    updateBlocklist: () => {},
    updateSettings: () => {},
  };
  const active = tabs.find((t) => t.id === activeId);

  // Toast helper
  const showToast = useCallback((message: string, type: 'success' | 'info' | 'warning' = 'info') => {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  }, []);

  /* ─── Boot ─── */
  useEffect(() => {
    setMounted(true);
    
    // Load persisted settings
    try {
      const savedSettings = localStorage.getItem('veil-settings');
      if (savedSettings) setSettings(s => ({ ...s, ...JSON.parse(savedSettings) }));
      const savedWidth = localStorage.getItem('veil-sidebarWidth');
      if (savedWidth) setSidebarWidth(Number(savedWidth));
      const savedOpen = localStorage.getItem('veil-sidebarOpen');
      if (savedOpen) setSidebarOpen(savedOpen === 'true');
      const savedHistory = localStorage.getItem('veil-history');
      if (savedHistory) setGlobalHistory(JSON.parse(savedHistory));
    } catch (e) {}

    if (api) {
      setPreloadPath(api.getPreloadPath());
      api.getTrackerCount().then((c: number) => setTrackerCount(c));
      api.onTrackerBlocked((c: number) => setTrackerCount(c));
      api.onNewTabRequested((url: string) => {
        const id = Math.random().toString(36).slice(2, 11);
        setTabs((p) => [...p, { id, title: 'Loading...', url, history: [url], historyIndex: 0, loading: true }]);
        setActiveId(id);
      });
      if (api.onTorProgress) {
        api.onTorProgress((data: any) => {
          setTorProgress({ percent: data.progress, text: data.text });
        });
      }
    }
  }, []);

  // Save persisted settings
  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem('veil-settings', JSON.stringify(settings));
    localStorage.setItem('veil-sidebarWidth', sidebarWidth.toString());
    localStorage.setItem('veil-sidebarOpen', sidebarOpen.toString());
  }, [settings, sidebarWidth, sidebarOpen, mounted]);

  // Persist history
  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem('veil-history', JSON.stringify(globalHistory.slice(0, 500)));
  }, [globalHistory, mounted]);

  /* ─── Theme ─── */
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.darkMode ? 'dark' : 'light');
  }, [settings.darkMode]);

  /* ─── URL bar sync ─── */
  useEffect(() => {
    if (active) setUrlInput(displayUrl(active.url));
  }, [activeId, active?.url]);

  /* ─── Iframe event listeners ─── */
  useEffect(() => {
    if (!mounted) return;
    tabs.forEach((tab) => {
      const iframe = wvRefs.current[tab.id] as HTMLIFrameElement | undefined;
      if (!iframe || (iframe as any)._bound) return;
      (iframe as any)._bound = true;

      iframe.addEventListener('load', () => {
        setTabs((p) => p.map((t) => (t.id === tab.id ? { ...t, loading: false, loadProgress: 100 } : t)));
        // Try to extract title from same-origin iframe
        try {
          const doc = iframe.contentDocument || iframe.contentWindow?.document;
          if (doc) {
            const title = doc.title || tab.title;
            setTabs((p) => p.map((t) => (t.id === tab.id ? { ...t, title } : t)));
            // Try to get favicon
            const linkIcon = doc.querySelector('link[rel*="icon"]') as HTMLLinkElement | null;
            if (linkIcon?.href) {
              setTabs((p) => p.map((t) => (t.id === tab.id ? { ...t, favicon: linkIcon.href } : t)));
            }
          }
        } catch (_e) {
          // Cross-origin — use domain-based favicon fallback
          try {
            const domain = new URL(tab.url).hostname;
            setTabs((p) => p.map((t) => (t.id === tab.id ? {
              ...t,
              title: t.title === 'Loading...' ? domain : t.title,
              favicon: `https://www.google.com/s2/favicons?domain=${domain}&sz=32`
            } : t)));
          } catch (_e2) {}
        }
        // Record in global history
        if (!isInternal(tab.url)) {
          setGlobalHistory(prev => {
            if (prev[0]?.url === tab.url) return prev;
            return [{ url: tab.url, title: tab.title, timestamp: Date.now() }, ...prev];
          });
        }
      });

      iframe.addEventListener('error', () => {
        setTabs((p) => p.map((t) => (t.id === tab.id ? { ...t, error: 'Failed to load page', loading: false } : t)));
      });
    });
  }, [tabs.length, mounted]);

  /* ─── Navigation ─── */
  const nav = useCallback((tabId: string, raw: string) => {
    let u = raw.trim();
    if (!u) return;
    if (!u.startsWith('http://') && !u.startsWith('https://') && !isInternal(u)) {
      if (u.includes('.') && !u.includes(' ')) u = 'https://' + u;
      else u = 'search://' + encodeURIComponent(u);
    }
    
    setTabs((p) => p.map((t) => {
      if (t.id !== tabId) return t;
      if (t.url === u) return t;
      const newHistory = t.history.slice(0, t.historyIndex + 1);
      newHistory.push(u);
      return { ...t, url: u, title: u, history: newHistory, historyIndex: newHistory.length - 1, error: undefined, redirectChain: [], readerMode: false };
    }));
  }, []);

  const fetchIpInfo = async () => {
    if (api && api.getIpInfo) {
      setIpInfo({ loading: true });
      const data = await api.getIpInfo();
      setIpInfo(data);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (active) nav(active.id, urlInput);
    urlInputRef.current?.blur();
  };

  const goBack = () => {
    if (active && active.historyIndex > 0) {
      const prevUrl = active.history[active.historyIndex - 1];
      setTabs(p => p.map(t => t.id === active.id ? { ...t, url: prevUrl, historyIndex: t.historyIndex - 1, error: undefined, readerMode: false } : t));
    }
  };
  
  const goFwd = () => {
    if (active && active.historyIndex < active.history.length - 1) {
      const nextUrl = active.history[active.historyIndex + 1];
      setTabs(p => p.map(t => t.id === active.id ? { ...t, url: nextUrl, historyIndex: t.historyIndex + 1, error: undefined, readerMode: false } : t));
    }
  };
  
  const reload = useCallback(() => {
    if (active) {
      if (isInternal(active.url)) {
         setTabs(p => p.map(t => t.id === active.id ? { ...t } : t)); // Force React re-render
      } else {
         const wv = wvRefs.current[active.id]; 
         if (wv) wv.reload(); 
      }
    }
  }, [active]);
  
  const goHome = () => { if (active) nav(active.id, NEWTAB); };

  const addTab = useCallback(() => {
    const id = Math.random().toString(36).slice(2, 11);
    setTabs((p) => [...p, { id, title: 'New Tab', url: NEWTAB, history: [NEWTAB], historyIndex: 0, loading: false }]);
    setActiveId(id);
  }, []);
  
  const closeTab = useCallback((e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setTabs(tabs => {
      if (tabs.length <= 1) return tabs;
      const closedTab = tabs.find(t => t.id === id);
      if (closedTab) {
        setRecentlyClosed(prev => [closedTab, ...prev].slice(0, 10));
      }
      const rest = tabs.filter((t) => t.id !== id);
      if (activeId === id) setActiveId(rest[rest.length - 1].id);
      return rest;
    });
    delete wvRefs.current[id];
  }, [activeId]);

  // Reopen last closed tab
  const reopenClosedTab = useCallback(() => {
    if (recentlyClosed.length === 0) return;
    const tab = recentlyClosed[0];
    setRecentlyClosed(prev => prev.slice(1));
    const newId = Math.random().toString(36).slice(2, 11);
    const restoredTab: Tab = { ...tab, id: newId, loading: false, error: undefined };
    setTabs(prev => [...prev, restoredTab]);
    setActiveId(newId);
    showToast('Tab restored', 'info');
  }, [recentlyClosed, showToast]);

  // Tab pinning
  const pinTab = useCallback((id: string) => {
    setTabs(prev => prev.map(t => t.id === id ? { ...t, pinned: !t.pinned } : t));
    const tab = tabs.find(t => t.id === id);
    showToast(tab?.pinned ? 'Tab unpinned' : 'Tab pinned', 'info');
  }, [tabs, showToast]);

  // Tab drag-and-drop
  const handleTabDragStart = useCallback((e: React.DragEvent, id: string) => {
    setDraggedTabId(id);
    e.dataTransfer.effectAllowed = 'move';
  }, []);
  const handleTabDragOver = useCallback((e: React.DragEvent, id: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverTabId(id);
  }, []);
  const handleTabDragEnd = useCallback(() => {
    setDraggedTabId(null);
    setDragOverTabId(null);
  }, []);
  const handleTabDrop = useCallback((e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedTabId || draggedTabId === targetId) {
      setDraggedTabId(null);
      setDragOverTabId(null);
      return;
    }
    setTabs(prev => {
      const newTabs = [...prev];
      const dragIdx = newTabs.findIndex(t => t.id === draggedTabId);
      const dropIdx = newTabs.findIndex(t => t.id === targetId);
      if (dragIdx === -1 || dropIdx === -1) return prev;
      const [dragged] = newTabs.splice(dragIdx, 1);
      newTabs.splice(dropIdx, 0, dragged);
      return newTabs;
    });
    setDraggedTabId(null);
    setDragOverTabId(null);
  }, [draggedTabId]);

  // Toggle reader mode
  const toggleReaderMode = useCallback(() => {
    if (!active || isInternal(active.url)) return;
    setTabs(p => p.map(t => t.id === active.id ? { ...t, readerMode: !t.readerMode } : t));
  }, [active]);

  // Toggle split view
  const toggleSplitView = useCallback(() => {
    if (splitTabId) {
      setSplitTabId(null);
    } else {
      // Find a tab that isn't the active one to split with
      const other = tabs.find(t => t.id !== activeId);
      if (other) {
        setSplitTabId(other.id);
        showToast('Split view enabled', 'info');
      } else {
        const newId = Date.now().toString();
        setTabs(p => [...p, { id: newId, url: NEWTAB, title: 'New Tab', history: [NEWTAB], historyIndex: 0, loading: false }]);
        setSplitTabId(newId);
        showToast('Split view enabled', 'info');
      }
    }
  }, [splitTabId, tabs, activeId, showToast]);

  /* ─── Keyboard Shortcuts ─── */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+T or Cmd+T — New tab
      if ((e.ctrlKey || e.metaKey) && e.key === 't' && !e.shiftKey) {
        e.preventDefault();
        addTab();
      }
      // Ctrl+W or Cmd+W — Close tab
      if ((e.ctrlKey || e.metaKey) && e.key === 'w') {
        e.preventDefault();
        if (activeId && tabs.length > 1) {
          const tab = tabs.find(t => t.id === activeId);
          if (tab?.pinned) return; // Don't close pinned tabs
          const fakeEvent = { stopPropagation: () => {} } as unknown as React.MouseEvent;
          closeTab(fakeEvent, activeId);
        }
      }
      // Ctrl+R or Cmd+R or F5 — Reload
      if (((e.ctrlKey || e.metaKey) && e.key === 'r') || e.key === 'F5') {
        e.preventDefault();
        reload();
      }
      // Ctrl+F — Find in page
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        setFindBarOpen(true);
      }
      // Escape — Close find bar, exit split view, exit reader mode
      if (e.key === 'Escape') {
        if (findBarOpen) setFindBarOpen(false);
        if (splitTabId) setSplitTabId(null);
      }
      // Ctrl+H — History
      if ((e.ctrlKey || e.metaKey) && e.key === 'h') {
        e.preventDefault();
        if (active) nav(active.id, HISTORY);
      }
      // Ctrl+L or F6 — Focus URL bar
      if (((e.ctrlKey || e.metaKey) && e.key === 'l') || e.key === 'F6') {
        e.preventDefault();
        urlInputRef.current?.focus();
        urlInputRef.current?.select();
      }
      // Ctrl+Shift+T — Reopen last closed tab
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'T') {
        e.preventDefault();
        reopenClosedTab();
      }
      // Ctrl+Tab — Next tab
      if (e.ctrlKey && e.key === 'Tab' && !e.shiftKey) {
        e.preventDefault();
        const idx = tabs.findIndex(t => t.id === activeId);
        if (idx !== -1) {
          const nextIdx = (idx + 1) % tabs.length;
          setActiveId(tabs[nextIdx].id);
        }
      }
      // Ctrl+Shift+Tab — Previous tab
      if (e.ctrlKey && e.shiftKey && e.key === 'Tab') {
        e.preventDefault();
        const idx = tabs.findIndex(t => t.id === activeId);
        if (idx !== -1) {
          const prevIdx = (idx - 1 + tabs.length) % tabs.length;
          setActiveId(tabs[prevIdx].id);
        }
      }
      // Ctrl+1-9 — Switch to tab by index
      if ((e.ctrlKey || e.metaKey) && e.key >= '1' && e.key <= '9') {
        e.preventDefault();
        const idx = parseInt(e.key) - 1;
        if (e.key === '9') {
          // Ctrl+9 always goes to last tab
          setActiveId(tabs[tabs.length - 1].id);
        } else if (idx < tabs.length) {
          setActiveId(tabs[idx].id);
        }
      }
      // Alt+Left — Back
      if (e.altKey && e.key === 'ArrowLeft') {
        e.preventDefault();
        goBack();
      }
      // Alt+Right — Forward
      if (e.altKey && e.key === 'ArrowRight') {
        e.preventDefault();
        goFwd();
      }
      // Ctrl+D — Bookmark current page
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        if (active && !isInternal(active.url)) {
          const exists = settings.bookmarks.find(b => b.url === active.url);
          if (exists) {
            setSettings(s => ({ ...s, bookmarks: s.bookmarks.filter(b => b.url !== active.url) }));
            showToast('Bookmark removed', 'info');
          } else {
            setSettings(s => ({ ...s, bookmarks: [...s.bookmarks, { url: active.url, title: active.title }] }));
            showToast('Bookmark added', 'success');
          }
        }
      }
      // Ctrl+Shift+B — Toggle sidebar
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'B') {
        e.preventDefault();
        setSidebarOpen(!sidebarOpen);
      }
      // F11 — Toggle fullscreen
      if (e.key === 'F11') {
        e.preventDefault();
        if (api && api.winFullscreen) api.winFullscreen();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeId, tabs, addTab, closeTab, reload, reopenClosedTab, findBarOpen, splitTabId, sidebarOpen, active, settings, showToast, api]);

  /* ─── Settings toggle ─── */
  const toggleSetting = async (key: string, value?: any) => {
    if (key === 'torMode') {
      if (api && !torBootstrapping) {
        const next = !settings.torMode;
        if (next) {
          setTorBootstrapping(true);
          setTorProgress({ percent: 0, text: 'Initializing Tor proxy process...' });
        }
        const res = await api.toggleTor(next);
        setTorBootstrapping(false);
        if (res.success) {
          setSettings((s) => ({ ...s, torMode: next }));
          showToast(next ? 'Tor Network connected' : 'Tor Network disconnected', next ? 'success' : 'info');
        } else {
          setTorError(res.error || 'Unknown Tor Error');
        }
      }
    } else if (key === 'blocklist') {
      setSettings((s) => ({ ...s, blocklist: value }));
      if (api && api.updateBlocklist) {
        api.updateBlocklist(value);
      }
    } else {
      setSettings((s) => {
        const nextVal = value !== undefined ? value : !(s as any)[key];
        if (api && api.updateSettings) {
          api.updateSettings({ [key]: nextVal });
        }
        return { ...s, [key]: nextVal };
      });
    }
  };

  // Clear history
  const clearHistory = useCallback(() => {
    setGlobalHistory([]);
    showToast('History cleared', 'info');
  }, [showToast]);

  /* ─── Window controls (Tauri) ─── */
  const winMin = () => { try { invoke('plugin:window|minimize'); } catch (_e) {} };
  const winMax = () => { try { invoke('plugin:window|toggle_maximize'); } catch (_e) {} };
  const winClose = () => { try { invoke('plugin:window|close'); } catch (_e) {} };

  // Sort tabs: pinned first, then unpinned
  const sortedTabs = [...tabs].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return 0;
  });

  const activeWebviewRef = useRef<any>(null);
  useEffect(() => {
    activeWebviewRef.current = active ? wvRefs.current[active.id] : null;
  }, [activeId, tabs]);

  useEffect(() => {
    if (slmOpen && active && !isInternal(active.url)) {
      const iframe = wvRefs.current[active.id] as HTMLIFrameElement | undefined;
      let text = '';
      try {
        const doc = iframe?.contentDocument || iframe?.contentWindow?.document;
        text = doc?.body?.innerText?.substring(0, 5000) || '';
      } catch (_e) { /* cross-origin */ }
      setSlmContext(`URL: ${active.url}\nTitle: ${active.title}${text ? `\nPage Content:\n${text}` : ''}`);
    } else if (active && isInternal(active.url)) {
      setSlmContext(`Internal Page: ${active.url}`);
    }
  }, [slmOpen, active]);

  return (
    <div className="shell">
      {/* ── TITLE BAR ── */}
      <div className="titlebar">
        <div className="titlebar-brand">
          <Shield />
          <span>Veil</span>
        </div>
        <div className="titlebar-controls">
          <button className="tb-btn" onClick={winMin}><Minus size={13} /></button>
          <button className="tb-btn" onClick={winMax}><Square size={11} /></button>
          <button className="tb-btn tb-close" onClick={winClose}><X size={13} /></button>
        </div>
      </div>

      {/* ── TOOLBAR ── */}
      <div className="toolbar" style={{ position: 'relative', zIndex: 100 }}>
        <div className="nav-btns">
          <button className="nav-btn" onClick={() => setSidebarOpen(!sidebarOpen)} title="Toggle Sidebar (Ctrl+Shift+B)"><PanelLeft size={15} /></button>
          <button className="nav-btn" onClick={goBack} disabled={!active || active.historyIndex <= 0} title="Back (Alt+←)"><ArrowLeft size={15} /></button>
          <button className="nav-btn" onClick={goFwd} disabled={!active || active.historyIndex >= active.history.length - 1} title="Forward (Alt+→)"><ArrowRight size={15} /></button>
          <button className={`nav-btn ${active?.loading ? 'spinning' : ''}`} onClick={reload} title="Reload (Ctrl+R)"><RotateCw size={13} /></button>
          <button className="nav-btn" onClick={goHome} title="Home"><Home size={15} /></button>
        </div>

        <form className="url-bar" onSubmit={handleSubmit} style={{ position: 'relative' }}>
          <button type="button" className="url-lock" onClick={(e) => {
            e.stopPropagation();
            setShieldOpen(!shieldOpen);
            if (!shieldOpen) fetchIpInfo();
          }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}>
            <Lock size={14} color={settings.torMode ? 'var(--green)' : 'var(--text-3)'} />
          </button>
          
          <button type="button" className="url-lock" onClick={(e) => {
            e.stopPropagation();
            setSettings(s => {
              const newVal = !s.normalMode;
              if (api && api.updateSettings) api.updateSettings({ normalMode: newVal });
              return { ...s, normalMode: newVal };
            });
            showToast(settings.normalMode ? 'Normal Mode Disabled (Privacy ON)' : 'Normal Mode Enabled', 'info');
          }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 8px', display: 'flex', alignItems: 'center', color: settings.normalMode ? 'var(--accent)' : 'var(--text-3)' }} title="Toggle Normal Mode">
            {settings.normalMode ? <Unlock size={14} /> : <Shield size={14} />}
          </button>
          
          <input ref={urlInputRef} className="url-input" type="text" placeholder="Search or enter address" value={urlInput} onChange={(e) => setUrlInput(e.target.value)} onFocus={(e) => e.target.select()} />
          
          <button 
            type="button" 
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 8px', display: 'flex', alignItems: 'center' }}
            onClick={() => {
              if (!active) return;
              const exists = settings.bookmarks.find(b => b.url === active.url);
              if (exists) {
                setSettings(s => ({ ...s, bookmarks: s.bookmarks.filter(b => b.url !== active.url) }));
                showToast('Bookmark removed', 'info');
              } else {
                setSettings(s => ({ ...s, bookmarks: [...s.bookmarks, { url: active.url, title: active.title }] }));
                showToast('Bookmark added', 'success');
              }
            }}
            title="Bookmark (Ctrl+D)"
          >
            <Star size={14} fill={active && settings.bookmarks.some(b => b.url === active.url) ? 'var(--accent)' : 'none'} color={active && settings.bookmarks.some(b => b.url === active.url) ? 'var(--accent)' : 'var(--text-3)'} />
          </button>

          {shieldOpen && (
            <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '8px', background: 'var(--glass-bg)', backdropFilter: 'blur(20px)', borderRadius: '12px', border: '1px solid var(--border)', padding: '16px', width: '280px', zIndex: 100, display: 'flex', flexDirection: 'column', gap: '12px', boxShadow: 'var(--shadow)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Shield size={20} color={settings.torMode ? "var(--green)" : "var(--accent)"} />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-1)' }}>Veil Shield</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>{settings.torMode ? 'Tor Network Active' : 'Standard Protection'}</div>
                </div>
              </div>
              <div style={{ height: '1px', background: 'var(--border)', margin: '4px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-2)' }}>Trackers Blocked</span>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--red)' }}>{trackerCount}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-2)' }}>Connection Secure</span>
                <Lock size={14} color="var(--green)" />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-2)' }}>Fingerprint Shield</span>
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--green)' }}>Active</span>
              </div>

              <div style={{ height: '1px', background: 'var(--border)', margin: '4px 0' }} />
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-1)' }}>Spoofed IP Routing</div>
              <div style={{ fontSize: '11px', color: 'var(--text-2)' }}>
                {ipInfo?.loading ? 'Tracing route through Tor network...' : ipInfo?.error ? 'Failed to resolve Tor node' : ipInfo ? (
                  <>
                    <div><strong style={{color: 'var(--text-1)'}}>IP:</strong> {ipInfo.ip}</div>
                    <div><strong style={{color: 'var(--text-1)'}}>Location:</strong> {ipInfo.city}, {ipInfo.country_name}</div>
                    <div><strong style={{color: 'var(--text-1)'}}>Node:</strong> {ipInfo.org}</div>
                  </>
                ) : 'Click to trace routing'}
              </div>

              <div style={{ height: '1px', background: 'var(--border)', margin: '4px 0' }} />
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-1)' }}>Network Hops Trace</div>
              {active?.redirectChain && active.redirectChain.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', color: 'var(--text-3)' }}>
                  {active.redirectChain.map((u, i) => (
                    <div key={i} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>↳ {u}</div>
                  ))}
                  <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--green)' }}>✓ {active.url}</div>
                </div>
              ) : (
                <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>Direct connection (0 redirects)</div>
              )}
            </div>
          )}
        </form>

        <div className="toolbar-actions" style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
          <button className={`nav-btn ${active?.readerMode ? 'active-reader' : ''}`} onClick={toggleReaderMode} disabled={!active || isInternal(active?.url || '')} title="Reader Mode">
            <BookOpen size={15} />
          </button>
          <button className="nav-btn" onClick={toggleSplitView} title={splitTabId ? 'Exit Split View' : 'Split View'}>
            <Columns2 size={15} color={splitTabId ? 'var(--accent)' : 'currentColor'} />
          </button>
          <button className={`nav-btn ${slmOpen ? 'active-slm' : ''}`} onClick={() => setSlmOpen(!slmOpen)} title="Veil AI">
            <Bot size={15} color={slmOpen ? "var(--purple)" : "currentColor"} />
          </button>
          <button className="nav-btn" onClick={() => setIsSettingsOpen(true)} title="Settings">
            <SettingsIcon size={15} />
          </button>

          {/* More Menu Toggle */}
          <button className={`nav-btn ${moreMenuOpen ? 'active' : ''}`} onClick={() => setMoreMenuOpen(!moreMenuOpen)} title="More options">
            <MoreVertical size={15} />
          </button>

          {moreMenuOpen && (
            <div style={{ position: 'absolute', top: '100%', right: '0', marginTop: '8px', background: 'var(--glass-bg)', backdropFilter: 'blur(20px)', borderRadius: '12px', border: '1px solid var(--border)', padding: '8px', width: '200px', zIndex: 100, display: 'flex', flexDirection: 'column', gap: '4px', boxShadow: 'var(--shadow)' }}>
              
              <button className="menu-btn" onClick={() => { setFindBarOpen(!findBarOpen); setMoreMenuOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', borderRadius: '8px', cursor: 'pointer', transition: 'background 0.2s', border: 'none', background: 'transparent', color: 'var(--text-1)', fontSize: '13px', textAlign: 'left', width: '100%' }}>
                <Search size={15} color="var(--text-3)" /> Find in Page
              </button>

              <button className="menu-btn" onClick={() => { setTranslateOpen(!translateOpen); setMoreMenuOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', borderRadius: '8px', cursor: 'pointer', transition: 'background 0.2s', border: 'none', background: 'transparent', color: 'var(--text-1)', fontSize: '13px', textAlign: 'left', width: '100%' }}>
                <Languages size={15} color="var(--text-3)" /> Translate
              </button>

              <button className="menu-btn" onClick={() => { nav(activeId, 'browser://downloads'); setMoreMenuOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', borderRadius: '8px', cursor: 'pointer', transition: 'background 0.2s', border: 'none', background: 'transparent', color: 'var(--text-1)', fontSize: '13px', textAlign: 'left', width: '100%' }}>
                <Download size={15} color="var(--text-3)" /> Downloads
              </button>

              <button className="menu-btn" onClick={() => { nav(activeId, HISTORY); setMoreMenuOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', borderRadius: '8px', cursor: 'pointer', transition: 'background 0.2s', border: 'none', background: 'transparent', color: 'var(--text-1)', fontSize: '13px', textAlign: 'left', width: '100%' }}>
                <Clock size={15} color="var(--text-3)" /> History
              </button>

              <div style={{ height: '1px', background: 'var(--border)', margin: '4px 0' }} />

              <button className="menu-btn" onClick={() => { toggleSetting('darkMode'); setMoreMenuOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', borderRadius: '8px', cursor: 'pointer', transition: 'background 0.2s', border: 'none', background: 'transparent', color: 'var(--text-1)', fontSize: '13px', textAlign: 'left', width: '100%' }}>
                {settings.darkMode ? <Sun size={15} color="var(--text-3)" /> : <Moon size={15} color="var(--text-3)" />} 
                {settings.darkMode ? 'Light Theme' : 'Dark Theme'}
              </button>

            </div>
          )}

          {/* Keep Translate Overlay rendering logic but hidden/shown by state */}
          {translateOpen && (
            <div style={{ position: 'absolute', top: '100%', right: '40px', marginTop: '8px', background: 'var(--glass-bg)', backdropFilter: 'blur(20px)', borderRadius: '12px', border: '1px solid var(--border)', padding: '16px', width: '220px', zIndex: 100, display: 'flex', flexDirection: 'column', gap: '12px', boxShadow: 'var(--shadow)' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-1)' }}>Translate Page</div>
              <div style={{ height: '1px', background: 'var(--border)', margin: '4px 0' }} />
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '11px', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Target Language:</label>
                <div style={{ position: 'relative' }}>
                  <select 
                    value={translateTarget} 
                    onChange={(e) => setTranslateTarget(e.target.value)}
                    style={{ 
                      appearance: 'none', width: '100%', background: 'var(--bg-deep)', 
                      border: '1px solid var(--border)', color: 'var(--text-1)', 
                      padding: '10px 14px', borderRadius: '8px', fontSize: '13px', 
                      outline: 'none', cursor: 'pointer', transition: 'all 0.2s',
                      boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)'
                    }}
                    onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
                  >
                    <option value="en">English (EN)</option>
                    <option value="es">Spanish (ES)</option>
                    <option value="fr">French (FR)</option>
                    <option value="de">German (DE)</option>
                    <option value="zh-CN">Chinese (ZH)</option>
                    <option value="ja">Japanese (JA)</option>
                    <option value="ru">Russian (RU)</option>
                    <option value="pt">Portuguese (PT)</option>
                    <option value="ar">Arabic (AR)</option>
                    <option value="hi">Hindi (HI)</option>
                    <option value="ko">Korean (KO)</option>
                    <option value="it">Italian (IT)</option>
                  </select>
                  <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-4)' }}>
                    ▼
                  </div>
                </div>
              </div>

              <button 
                onClick={() => {
                  if (active && active.url && !active.url.startsWith('browser://') && !active.url.includes('translate.google.com')) {
                    const translateUrl = `https://translate.google.com/translate?sl=auto&tl=${translateTarget}&u=${encodeURIComponent(active.url)}`;
                    nav(activeId, translateUrl);
                    const wv = wvRefs.current[activeId];
                    if (wv && (wv as any).loadURL) {
                      wv.src = translateUrl;
                    }
                  }
                  setTranslateOpen(false);
                }}
                style={{ background: 'var(--accent)', color: 'white', border: 'none', padding: '10px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', marginTop: '4px' }}
              >
                Translate Now
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Loading progress bar ── */}
      {active?.loading && (
        <div className="loading-progress-bar">
          <div className="loading-progress-fill" />
        </div>
      )}

      {/* ── BODY ── */}
      <div className="browser-body" style={{ position: 'relative', zIndex: 1 }}>
        {/* Sidebar */}
        <div 
          className={`sidebar ${sidebarOpen ? '' : 'minimized'}`}
          style={{ width: sidebarOpen ? sidebarWidth : undefined, position: 'relative' }}
          onDrop={(e) => {
            e.preventDefault();
            const url = e.dataTransfer.getData('text/plain') || e.dataTransfer.getData('text/uri-list');
            if (url) {
              const newId = Date.now().toString();
              setTabs([...tabs, { id: newId, url, title: url, loading: true, history: [url], historyIndex: 0 }]);
              setActiveId(newId);
            }
          }}
          onDragOver={(e) => e.preventDefault()}
        >
          <div className="tabs-head">
            <span className="tabs-head-label">Tabs</span>
            <button className="tabs-add" onClick={addTab}><Plus size={13} /></button>
          </div>

          <div className={`tabs-scroll ${settings.torMode ? 'tor-mode' : ''}`}>
            {sortedTabs.map((tab) => (
              <TabItem 
                key={tab.id}
                tab={tab}
                activeId={activeId}
                sidebarOpen={sidebarOpen}
                onSelect={setActiveId}
                onClose={closeTab}
                onPin={pinTab}
                onDragStart={handleTabDragStart}
                onDragOver={handleTabDragOver}
                onDragEnd={handleTabDragEnd}
                onDrop={handleTabDrop}
                isDragOver={dragOverTabId === tab.id && draggedTabId !== tab.id}
              />
            ))}
          </div>

          <div className="sidebar-bottom">
            <button className="sidebar-stat" onClick={() => setIsSettingsOpen(true)}>
              {settings.torMode ? <OnionIcon size={14} color="#7D4698" /> : <Shield size={14} />}
              <span style={{ color: settings.torMode ? '#7D4698' : 'inherit' }}>{settings.torMode ? 'Tor Network' : 'Protected'}</span>
            </button>
          </div>
          
          {sidebarOpen && (
            <div 
              className="sidebar-resizer" 
              onMouseDown={handleSidebarMouseDown}
              style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '4px', cursor: 'ew-resize', zIndex: 100 }}
            />
          )}
        </div>

        {/* Content */}
        <div className={`content ${splitTabId ? 'split-mode' : ''}`}>
          {tabs.map((tab) => {
            const isActiveOrSplit = activeId === tab.id || splitTabId === tab.id;
            return (
            <div key={tab.id} className={`tab-view ${activeId === tab.id ? 'active' : ''} ${splitTabId === tab.id ? 'active split-right' : ''}`}>
              {tab.url === NEWTAB ? (
                <NewTab onNavigate={(u) => nav(tab.id, u)} settings={settings} onToggleSetting={toggleSetting} recentHistory={globalHistory.slice(0, 6)} />
              ) : tab.url === 'browser://downloads' ? (
                <Downloads />
              ) : tab.url === HISTORY ? (
                <History history={globalHistory} onNavigate={(u) => nav(tab.id, u)} onClearHistory={clearHistory} />
              ) : tab.url.startsWith('search://') ? (
                <SearchResults query={tab.url.replace('search://', '')} onNavigate={(u) => nav(tab.id, u)} />
              ) : mounted && api ? (
                <>
                  <iframe
                    ref={(el) => { if (el) wvRefs.current[tab.id] = el; }}
                    src={`http://127.0.0.1:8181/proxy?url=${encodeURIComponent(tab.url)}`}
                    
                    
                    style={{ width: '100%', height: '100%', border: 'none', display: tab.error || tab.readerMode ? 'none' : 'flex' }}
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                  />

                  {/* Reader Mode Overlay */}
                  {tab.readerMode && (
                    <ReaderMode
                      isOpen={true}
                      onClose={() => setTabs(p => p.map(t => t.id === tab.id ? { ...t, readerMode: false } : t))}
                      webviewRef={{ current: wvRefs.current[tab.id] }}
                    />
                  )}

                  {tab.loading && !tab.error && !tab.readerMode && (
                    <div className="webview-skeleton-overlay">
                      <div className="skel-top">
                        <div className="skel-logo" />
                        <div className="skel-line w-40" />
                        <div className="skel-line w-20" />
                      </div>
                      <div className="skel-content">
                        <div className="skel-block title" />
                        <div className="skel-block text" />
                        <div className="skel-block text short" />
                        <div className="skel-img" />
                      </div>
                    </div>
                  )}
                  {tab.error && (
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', color: 'var(--text-1)', zIndex: 10 }}>
                      <div style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(20px)', border: '1px solid var(--border)', borderRadius: '24px', padding: '48px', maxWidth: '480px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '16px', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}>
                        <div style={{ background: 'rgba(230, 57, 70, 0.15)', padding: '24px', borderRadius: '50%', marginBottom: '8px' }}>
                          <Shield size={64} color="var(--red)" />
                        </div>
                        <h2 style={{ fontSize: '24px', fontWeight: 700, margin: 0 }}>
                          {tab.error.startsWith('HTTPS_UPGRADE_FAILED') ? 'This site doesn\'t support HTTPS' : tab.error.includes('SOCKS') ? 'Tor Network Offline' : tab.error.includes('Blocked') ? 'Site Blocked by Custom Rules' : 'Connection Failed'}
                        </h2>
                        <p style={{ color: 'var(--text-3)', lineHeight: 1.6, fontSize: '14px', margin: 0 }}>
                          {tab.error.startsWith('HTTPS_UPGRADE_FAILED')
                            ? 'Veil blocked the insecure version. Proceeding would expose your traffic.'
                            : tab.error.includes('SOCKS') 
                            ? 'Veil could not route your request through the Tor network. It may take a minute to bootstrap, or it might be blocked on your network.' 
                            : tab.error.includes('Blocked')
                            ? 'Veil has intercepted a connection to this domain because it matches your Custom Website Blocker rules or tracking shield.'
                            : 'Veil was unable to load this page. Please check your internet connection or try again.'}
                        </p>
                        <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px 16px', borderRadius: '8px', fontSize: '12px', color: 'var(--text-2)', fontFamily: 'monospace', width: '100%', textAlign: 'left', border: '1px solid var(--border)', marginTop: '8px', wordBreak: 'break-all' }}>
                          <strong>Diagnostic:</strong> {tab.error}
                        </div>
                        <div style={{ display: 'flex', gap: '12px', marginTop: '16px', width: '100%' }}>
                          <button onClick={goBack} style={{ flex: 1, padding: '12px', background: 'transparent', borderRadius: '8px', color: 'var(--text-1)', border: '1px solid var(--border)', cursor: 'pointer', fontWeight: 600 }}>Go Back Safely</button>
                          {tab.error.startsWith('HTTPS_UPGRADE_FAILED') ? (
                            <button onClick={() => {
                                const insecureUrl = tab.error!.replace('HTTPS_UPGRADE_FAILED:', '').replace('https://', 'http://');
                                nav(tab.id, insecureUrl + (insecureUrl.includes('?') ? '&' : '?') + '__sb_allow_http=1');
                            }} style={{ flex: 1, padding: '12px', background: 'var(--red)', borderRadius: '8px', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Proceed anyway (unsafe)</button>
                          ) : tab.error.includes('SOCKS') ? (
                            <button onClick={() => toggleSetting('torMode', false)} style={{ flex: 1, padding: '12px', background: 'var(--accent)', borderRadius: '8px', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Disable Tor</button>
                          ) : (
                            <button onClick={reload} style={{ flex: 1, padding: '12px', background: 'var(--accent)', borderRadius: '8px', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Try Again</button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : mounted ? (
                <iframe src={`http://127.0.0.1:8181/proxy?url=${encodeURIComponent(tab.url)}`} title={tab.title} style={{ width: '100%', height: '100%', border: 'none' }} />
              ) : null}
            </div>
          );
          })}

          {/* Split view divider */}
          {splitTabId && <div className="split-divider" />}
        </div>

        {/* Find Bar */}
        {findBarOpen && active && !isInternal(active.url) && (
          <FindBar
            isOpen={findBarOpen}
            onClose={() => setFindBarOpen(false)}
            webviewRef={{ current: wvRefs.current[active.id] }}
          />
        )}

        <SLMPanel isOpen={slmOpen} onClose={() => setSlmOpen(false)} currentContext={slmContext} />

        {isSettingsOpen && (
          <div className="settings-modal-overlay" onClick={() => setIsSettingsOpen(false)}>
            <div className="settings-modal-content" onClick={(e) => e.stopPropagation()}>
              <Settings settings={settings} onToggle={toggleSetting} />
            </div>
          </div>
        )}

        {torError && (
          <div className="tor-overlay">
            <div className="tor-modal">
              <Shield size={48} color="var(--red)" />
              <h2 style={{ fontSize: '20px', margin: '0', color: 'var(--text-1)' }}>Tor Connection Failed</h2>
              <p style={{ color: 'var(--text-3)', fontSize: '13px', textAlign: 'center', lineHeight: 1.5 }}>
                {torError}
              </p>
              <button onClick={() => setTorError('')} style={{ marginTop: '10px', padding: '10px 24px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>
                Dismiss
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── TOAST NOTIFICATIONS ── */}
      <div className="toast-container">
        {toasts.map(toast => (
          <div key={toast.id} className={`toast toast-${toast.type}`}>
            {toast.type === 'success' && <Shield size={14} />}
            {toast.type === 'info' && <Globe size={14} />}
            {toast.type === 'warning' && <Shield size={14} />}
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
