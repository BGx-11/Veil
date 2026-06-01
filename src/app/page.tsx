'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Shield, Moon, Sun, Plus, X, ArrowLeft, ArrowRight, RotateCw, Home,
  Minus, Square, Search, Lock, Globe, Settings as SettingsIcon, PanelLeft, Star, Volume2, Languages, Bot, Video, Mic, Download
} from 'lucide-react';

const OnionIcon = ({ size = 24, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" />
    <path d="M12 18C15.3137 18 18 15.3137 18 12C18 8.68629 15.3137 6 12 6C8.68629 6 6 8.68629 6 12C6 15.3137 8.68629 18 12 18Z" />
    <path d="M12 14C13.1046 14 14 13.1046 14 12C14 10.8954 13.1046 10 12 10C10.8954 10 10 10.8954 10 12C10 13.1046 10.8954 14 12 14Z" />
  </svg>
);

import SearchResults from './SearchResults';
import NewTab from './NewTab';
import Settings from './Settings';
import SLMPanel from './SLMPanel';
import Downloads from './Downloads';

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
}

const NEWTAB = 'browser://newtab';
const SETTINGS = 'browser://settings';

function isInternal(url: string) {
  return url.startsWith('browser://') || url.startsWith('search://');
}
function displayUrl(url: string) {
  if (url === NEWTAB) return '';
  if (url === SETTINGS) return 'Settings';
  if (url.startsWith('search://')) return decodeURIComponent(url.replace('search://', ''));
  return url;
}

const TabItem = React.memo(({ tab, activeId, sidebarOpen, onSelect, onClose }: any) => {
  const isActive = activeId === tab.id;
  return (
    <div
      className={`tab-item ${isActive ? 'active' : ''}`}
      onClick={() => onSelect(tab.id)}
      title={!sidebarOpen ? (tab.title || 'New Tab') : ''}
    >
      <Globe className="tab-item-icon" />
      <div className="tab-title" style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center' }}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{tab.title}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginRight: '4px' }}>
        {tab.cameraUsing && <Video size={12} color="var(--red)" />}
        {tab.micUsing && <Mic size={12} color="var(--orange)" />}
        {tab.mediaPlaying && !tab.cameraUsing && !tab.micUsing && <Volume2 size={12} color="var(--accent)" />}
      </div>
      {tab.loading && <div className="tab-item-dot" />}
      <button className="tab-item-close" onClick={(e) => onClose(e, tab.id)}>
        <X size={11} />
      </button>
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
  const [shieldOpen, setShieldOpen] = useState(false);
  const [translateOpen, setTranslateOpen] = useState(false);
  const [translateTarget, setTranslateTarget] = useState('en');
  const [torBootstrapping, setTorBootstrapping] = useState(false);
  const [torProgress, setTorProgress] = useState({ percent: 0, text: '' });
  const [torError, setTorError] = useState('');

  const [sidebarWidth, setSidebarWidth] = useState(280);
  const isDraggingRef = useRef(false);

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
    bookmarks: [] as {url: string, title: string}[],
    blocklist: [] as string[]
  });
  
  const settingsRef = useRef(settings);
  useEffect(() => { settingsRef.current = settings; }, [settings]);

  const wvRefs = useRef<Record<string, any>>({});
  const api = typeof window !== 'undefined' ? (window as any).electronAPI : null;
  const active = tabs.find((t) => t.id === activeId);

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

  /* ─── Tor Progress Listener ─── */
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.darkMode ? 'dark' : 'light');
  }, [settings.darkMode]);

  /* ─── URL bar sync ─── */
  useEffect(() => {
    if (active) setUrlInput(displayUrl(active.url));
  }, [activeId, active?.url]);

  /* ─── Webview event listeners ─── */
  useEffect(() => {
    if (!mounted) return;
    tabs.forEach((tab) => {
      const wv = wvRefs.current[tab.id];
      if (!wv || wv._bound) return;
      wv._bound = true;

      wv.addEventListener('page-title-updated', (e: any) => {
        setTabs((p) => p.map((t) => (t.id === tab.id ? { ...t, title: e.title } : t)));
      });
      wv.addEventListener('did-navigate', (e: any) => {
        if (!isInternal(e.url)) {
          setTabs((p) => p.map((t) => {
            if (t.id !== tab.id) return t;
            if (t.url === e.url) return { ...t, loading: false }; // Skip if URL is identical (e.g. reload)
            const newHistory = t.history.slice(0, t.historyIndex + 1);
            newHistory.push(e.url);
            return { ...t, url: e.url, history: newHistory, historyIndex: newHistory.length - 1, loading: false };
          }));
        }
      });
      wv.addEventListener('did-navigate-in-page', (e: any) => {
        if (!isInternal(e.url)) {
          setTabs((p) => p.map((t) => {
            if (t.id !== tab.id) return t;
            if (t.url === e.url) return t;
            const newHistory = t.history.slice(0, t.historyIndex + 1);
            newHistory.push(e.url);
            return { ...t, url: e.url, history: newHistory, historyIndex: newHistory.length - 1, error: undefined };
          }));
        }
      });
      wv.addEventListener('did-fail-load', (e: any) => {
        if (e.isMainFrame) {
          if (settingsRef.current.httpsOnly && e.validatedURL && e.validatedURL.startsWith('https://') && e.errorCode !== -3) {
            setTabs((p) => p.map((t) => (t.id === tab.id ? { ...t, error: `HTTPS_UPGRADE_FAILED:${e.validatedURL}`, loading: false } : t)));
            return;
          }
          const errMsg = e.errorCode === -3 
            ? 'Request Blocked: This page was stopped by the built-in privacy shield.' 
            : `Failed to load: ${e.errorDescription} (${e.errorCode})`;
          setTabs((p) => p.map((t) => (t.id === tab.id ? { ...t, error: errMsg, loading: false } : t)));
        }
      });
      wv.addEventListener('did-start-loading', () => {
        setTabs((p) => p.map((t) => (t.id === tab.id ? { ...t, loading: true } : t)));
      });
      wv.addEventListener('did-stop-loading', () => {
        setTabs((p) => p.map((t) => (t.id === tab.id ? { ...t, loading: false } : t)));
      });
      wv.addEventListener('media-started-playing', () => {
        setTabs((p) => p.map((t) => (t.id === tab.id ? { ...t, mediaPlaying: true } : t)));
      });
      wv.addEventListener('media-paused', () => {
        setTabs((p) => p.map((t) => (t.id === tab.id ? { ...t, mediaPlaying: false } : t)));
      });
      wv.addEventListener('ipc-message', (e: any) => {
        if (e.channel === 'media-devices-active') {
          const { video, audio } = e.args[0];
          setTabs((p) => p.map((t) => (t.id === tab.id ? { ...t, cameraUsing: video, micUsing: audio } : t)));
        }
      });
      wv.addEventListener('did-redirect-navigation', (e: any) => {
        setTabs((p) => p.map((t) => {
          if (t.id === tab.id) {
            const chain = t.redirectChain ? [...t.redirectChain] : [];
            chain.push(e.url);
            return { ...t, redirectChain: chain };
          }
          return t;
        }));
      });
      wv.addEventListener('context-menu', (e: any) => {
        if (api && api.showContextMenu) {
          api.showContextMenu(e.params);
        }
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
      return { ...t, url: u, title: u, history: newHistory, historyIndex: newHistory.length - 1, error: undefined, redirectChain: [] };
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
  };

  const goBack = () => {
    if (active && active.historyIndex > 0) {
      const prevUrl = active.history[active.historyIndex - 1];
      setTabs(p => p.map(t => t.id === active.id ? { ...t, url: prevUrl, historyIndex: t.historyIndex - 1, error: undefined } : t));
    }
  };
  
  const goFwd = () => {
    if (active && active.historyIndex < active.history.length - 1) {
      const nextUrl = active.history[active.historyIndex + 1];
      setTabs(p => p.map(t => t.id === active.id ? { ...t, url: nextUrl, historyIndex: t.historyIndex + 1, error: undefined } : t));
    }
  };
  
  const reload = () => {
    if (active) {
      if (isInternal(active.url)) {
         setTabs(p => p.map(t => t.id === active.id ? { ...t } : t)); // Force React re-render
      } else {
         const wv = wvRefs.current[active.id]; 
         if (wv) wv.reload(); 
      }
    }
  };
  
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
      const rest = tabs.filter((t) => t.id !== id);
      if (activeId === id) setActiveId(rest[rest.length - 1].id);
      return rest;
    });
    delete wvRefs.current[id];
  }, [activeId]);

  /* ─── Keyboard Shortcuts ─── */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+T or Cmd+T
      if ((e.ctrlKey || e.metaKey) && e.key === 't') {
        e.preventDefault();
        addTab();
      }
      // Ctrl+W or Cmd+W
      if ((e.ctrlKey || e.metaKey) && e.key === 'w') {
        e.preventDefault();
        if (activeId && tabs.length > 1) {
          const fakeEvent = { stopPropagation: () => {} } as unknown as React.MouseEvent;
          closeTab(fakeEvent, activeId);
        }
      }
      // Ctrl+R or Cmd+R or F5
      if (((e.ctrlKey || e.metaKey) && e.key === 'r') || e.key === 'F5') {
        e.preventDefault();
        reload();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeId, tabs, addTab, closeTab, reload]);

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

  /* ─── Window controls ─── */
  const winMin = () => api?.winMinimize();
  const winMax = () => api?.winMaximize();
  const winClose = () => api?.winClose();

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
          <button className="nav-btn" onClick={() => setSidebarOpen(!sidebarOpen)} title="Toggle Sidebar"><PanelLeft size={15} /></button>
          <button className="nav-btn" onClick={goBack} disabled={!active || active.historyIndex <= 0}><ArrowLeft size={15} /></button>
          <button className="nav-btn" onClick={goFwd} disabled={!active || active.historyIndex >= active.history.length - 1}><ArrowRight size={15} /></button>
          <button className={`nav-btn ${active?.loading ? 'spinning' : ''}`} onClick={reload}><RotateCw size={13} /></button>
          <button className="nav-btn" onClick={goHome}><Home size={15} /></button>
        </div>

        <form className="url-bar" onSubmit={handleSubmit} style={{ position: 'relative' }}>
          <button type="button" className="url-lock" onClick={(e) => {
            e.stopPropagation();
            setShieldOpen(!shieldOpen);
            if (!shieldOpen) fetchIpInfo();
          }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}>
            <Lock size={14} color={settings.torMode ? 'var(--green)' : 'var(--text-3)'} />
          </button>
          
          <input className="url-input" type="text" placeholder="Search or enter address" value={urlInput} onChange={(e) => setUrlInput(e.target.value)} onFocus={(e) => e.target.select()} />
          
          <button 
            type="button" 
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 8px', display: 'flex', alignItems: 'center' }}
            onClick={() => {
              if (!active) return;
              const exists = settings.bookmarks.find(b => b.url === active.url);
              if (exists) {
                setSettings(s => ({ ...s, bookmarks: s.bookmarks.filter(b => b.url !== active.url) }));
              } else {
                setSettings(s => ({ ...s, bookmarks: [...s.bookmarks, { url: active.url, title: active.title }] }));
              }
            }}
          >
            <Star size={14} fill={active && settings.bookmarks.some(b => b.url === active.url) ? 'var(--accent)' : 'none'} color={active && settings.bookmarks.some(b => b.url === active.url) ? 'var(--accent)' : 'var(--text-3)'} />
          </button>

          {shieldOpen && (
            <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '8px', background: 'rgba(20, 20, 20, 0.85)', backdropFilter: 'blur(20px)', borderRadius: '12px', border: '1px solid var(--border)', padding: '16px', width: '280px', zIndex: 100, display: 'flex', flexDirection: 'column', gap: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
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
          <button 
            className={`nav-btn ${translateOpen ? 'active' : ''}`}
            onClick={() => setTranslateOpen(!translateOpen)} 
            title="Translate Page"
          >
            <Languages size={15} />
          </button>
          
          {translateOpen && (
            <div style={{ position: 'absolute', top: '100%', right: '40px', marginTop: '8px', background: 'rgba(20, 20, 20, 0.85)', backdropFilter: 'blur(20px)', borderRadius: '12px', border: '1px solid var(--border)', padding: '16px', width: '220px', zIndex: 100, display: 'flex', flexDirection: 'column', gap: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
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
                    setTabs(tabs.map(t => t.id === activeId ? { ...t, url: translateUrl, redirectChain: [] } : t));
                    setUrlInput(translateUrl);
                  }
                  setTranslateOpen(false);
                }}
                style={{ background: 'var(--accent)', color: 'white', border: 'none', padding: '10px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', marginTop: '4px' }}
              >
                Translate Now
              </button>
            </div>
          )}

          <button className={`nav-btn ${slmOpen ? 'active-slm' : ''}`} onClick={() => setSlmOpen(!slmOpen)} title="Veil AI">
            <Bot size={15} color={slmOpen ? "var(--purple)" : "currentColor"} />
          </button>
          <button className="nav-btn" onClick={() => nav(activeId, 'browser://downloads')} title="Downloads"><Download size={15} /></button>
          <button className="nav-btn" onClick={() => setIsSettingsOpen(true)} title="Settings"><SettingsIcon size={15} /></button>
          <button className="nav-btn" onClick={() => toggleSetting('darkMode')} title="Theme">
            {settings.darkMode ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        </div>
      </div>

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
            {tabs.map((tab) => (
              <TabItem 
                key={tab.id}
                tab={tab}
                activeId={activeId}
                sidebarOpen={sidebarOpen}
                onSelect={setActiveId}
                onClose={closeTab}
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
        <div className="content">
          {tabs.map((tab) => (
            <div key={tab.id} className={`tab-view ${activeId === tab.id ? 'active' : ''}`}>
              {tab.url === NEWTAB ? (
                <NewTab onNavigate={(u) => nav(tab.id, u)} settings={settings} onToggleSetting={toggleSetting} />
              ) : tab.url === 'browser://downloads' ? (
                <Downloads />
              ) : tab.url.startsWith('search://') ? (
                <SearchResults query={tab.url.replace('search://', '')} onNavigate={(u) => nav(tab.id, u)} />
              ) : mounted && api ? (
                <>
                  <webview
                    ref={(el) => { if (el) wvRefs.current[tab.id] = el; }}
                    src={tab.url}
                    preload={preloadPath}
                    partition="in-memory"
                    style={{ width: '100%', height: '100%', border: 'none', display: tab.error ? 'none' : 'flex' }}
                    allowpopups={"true" as any}
                  />
                  {tab.loading && !tab.error && (
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
                <iframe src={tab.url} title={tab.title} style={{ width: '100%', height: '100%', border: 'none' }} />
              ) : null}
            </div>
          ))}
        </div>

        <SLMPanel isOpen={slmOpen} onClose={() => setSlmOpen(false)} />

        {isSettingsOpen && (
          <div className="settings-modal-overlay" onClick={() => setIsSettingsOpen(false)}>
            <div className="settings-modal-content" onClick={(e) => e.stopPropagation()}>
              <Settings settings={settings} onToggle={toggleSetting} />
            </div>
          </div>
        )}

        {/* ── Tor Overlays Removed (Now handled inline in NewTab) ── */}
        
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
    </div>
  );
}
