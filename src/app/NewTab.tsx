'use client';

import React, { useState, useEffect } from 'react';
import { Search, Shield, Image as ImageIcon, X, Clock, LayoutGrid, Plus, Trash2, ArrowRight } from 'lucide-react';

const OnionIcon = ({ size = 24, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" />
    <path d="M12 18C15.3137 18 18 15.3137 18 12C18 8.68629 15.3137 6 12 6C8.68629 6 6 8.68629 6 12C6 15.3137 8.68629 18 12 18Z" />
    <path d="M12 14C13.1046 14 14 13.1046 14 12C14 10.8954 13.1046 10 12 10C10.8954 10 10 10.8954 10 12C10 13.1046 10.8954 14 12 14Z" />
  </svg>
);

const DEFAULT_SHORTCUTS = [
  { label: 'DuckDuckGo', url: 'https://duckduckgo.com', letter: 'D', color: '#DE5833' },
  { label: 'Wikipedia', url: 'https://www.wikipedia.org', letter: 'W', color: '#000000' },
  { label: 'GitHub', url: 'https://github.com', letter: 'G', color: '#2b3137' },
  { label: 'Reddit', url: 'https://www.reddit.com', letter: 'R', color: '#FF4500' },
];

export default function NewTab({ 
  onNavigate, 
  settings, 
  onToggleSetting,
  recentHistory
}: { 
  onNavigate: (url: string) => void;
  settings?: any;
  onToggleSetting?: (key: string) => Promise<void>;
  recentHistory?: {url: string, title: string, timestamp: number}[];
}) {
  const [query, setQuery] = useState('');
  const [time, setTime] = useState('');
  const [date, setDate] = useState('');
  const [greeting, setGreeting] = useState('');
  
  // Customization State
  const [config, setConfig] = useState({
    bgUrl: '',
    showClock: true,
    showShortcuts: true,
    showRecent: true,
    blurInner: true,
    shortcuts: DEFAULT_SHORTCUTS
  });
  const [showSettings, setShowSettings] = useState(false);
  
  // New Shortcut Inputs
  const [newShortcutLabel, setNewShortcutLabel] = useState('');
  const [newShortcutUrl, setNewShortcutUrl] = useState('');

  useEffect(() => {
    try {
      localStorage.removeItem('newtab-bg');
      const saved = localStorage.getItem('newtab-config');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (!parsed.bgUrl || parsed.bgUrl === 'undefined' || parsed.bgUrl === 'null') {
          parsed.bgUrl = '';
        }
        if (!parsed.shortcuts) parsed.shortcuts = DEFAULT_SHORTCUTS;
        setConfig((prev) => ({ ...prev, ...parsed }));
      }
    } catch (e) {}

    const tick = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      setDate(now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' }));
      // Set greeting based on time
      const hour = now.getHours();
      setGreeting(hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening');
    };
    tick();
    const id = setInterval(tick, 1000);
    
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.nt-settings-panel') && !target.closest('.nt-settings-btn')) {
        setShowSettings(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      clearInterval(id);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const updateConfig = (key: string, value: any) => {
    const newConfig = { ...config, [key]: value };
    setConfig(newConfig);
    localStorage.setItem('newtab-config', JSON.stringify(newConfig));
  };

  const addShortcut = () => {
    if (!newShortcutLabel.trim() || !newShortcutUrl.trim()) return;
    
    let finalUrl = newShortcutUrl.trim();
    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      finalUrl = 'https://' + finalUrl;
    }

    const colors = ['#007aff', '#34c759', '#ff9f0a', '#ff453a', '#bf5af2', '#64d2ff'];
    const newShortcut = {
      label: newShortcutLabel.trim(),
      url: finalUrl,
      letter: newShortcutLabel.trim().charAt(0).toUpperCase(),
      color: colors[Math.floor(Math.random() * colors.length)]
    };

    updateConfig('shortcuts', [...config.shortcuts, newShortcut]);
    setNewShortcutLabel('');
    setNewShortcutUrl('');
  };

  const removeShortcut = (index: number) => {
    const updated = [...config.shortcuts];
    updated.splice(index, 1);
    updateConfig('shortcuts', updated);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    if (q.includes('.') && !q.includes(' ')) {
      onNavigate(q.startsWith('http') ? q : 'https://' + q);
    } else {
      onNavigate('search://' + encodeURIComponent(q));
    }
  };

  const validBgUrl = (!config.bgUrl || config.bgUrl === 'undefined' || config.bgUrl === 'null') ? '' : config.bgUrl;

  return (
    <div className="newtab-v2" style={validBgUrl ? { backgroundImage: `url(${validBgUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}>
      
      {/* Animated gradient orbs background */}
      {!validBgUrl && (
        <div className="nt-bg-container">
          <div className="nt-orb nt-orb-1" />
          <div className="nt-orb nt-orb-2" />
          <div className="nt-orb nt-orb-3" />
        </div>
      )}

      {/* Top Right Controls */}
      <div style={{ position: 'absolute', top: 24, right: 24, zIndex: 20, display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Tor Toggle */}
        {settings && onToggleSetting && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div id="nt-tor-loading" style={{ opacity: 0, fontSize: '11px', color: 'var(--text-3)', fontWeight: 500, transition: 'opacity 0.2s', whiteSpace: 'nowrap' }}>
              {!settings.torMode ? 'Connecting...' : 'Disconnecting...'}
            </div>
            <div className="nt-tor-toggle">
              <span className="nt-tor-label" style={{ color: settings.torMode ? '#bf5af2' : 'var(--text-3)' }}>
                <OnionIcon size={14} color={settings.torMode ? '#bf5af2' : 'var(--text-3)'} /> 
                {settings.torMode ? 'Tor Active' : 'Tor Off'}
              </span>
              <div
                className={`nt-tor-switch ${settings.torMode ? 'on' : ''}`}
                onClick={async () => {
                  const el = document.getElementById('nt-tor-loading');
                  if (el) el.style.opacity = '1';
                  try {
                    await onToggleSetting('torMode');
                  } finally {
                    if (el) el.style.opacity = '0';
                  }
                }}
              >
                <div className="nt-tor-knob" />
              </div>
            </div>
          </div>
        )}

        {/* Settings Toggle */}
        <button 
          className="nt-settings-btn" 
          style={{ position: 'static' }}
          onClick={() => setShowSettings(!showSettings)}
          title="Customize Homepage"
        >
          <ImageIcon size={16} />
        </button>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="nt-settings-panel">
          <div className="nt-settings-header">
            <span>Customize</span>
            <button onClick={() => setShowSettings(false)}><X size={16} /></button>
          </div>

          <div className="nt-settings-group">
            <label>Background Image URL</label>
            <input 
              type="text" 
              placeholder="Paste image URL..." 
              value={validBgUrl} 
              onChange={(e) => updateConfig('bgUrl', e.target.value)} 
            />
          </div>

          <div className="nt-settings-toggles">
            <label>
              <input type="checkbox" checked={config.showClock} onChange={(e) => updateConfig('showClock', e.target.checked)} />
              <Clock size={14} /> Show Clock & Date
            </label>
            <label>
              <input type="checkbox" checked={config.showShortcuts} onChange={(e) => updateConfig('showShortcuts', e.target.checked)} />
              <LayoutGrid size={14} /> Show Shortcuts
            </label>
            <label>
              <input type="checkbox" checked={config.showRecent} onChange={(e) => updateConfig('showRecent', e.target.checked)} />
              <Clock size={14} /> Show Recent Sites
            </label>
            <label style={{ opacity: validBgUrl ? 1 : 0.5 }}>
              <input type="checkbox" checked={config.blurInner} onChange={(e) => updateConfig('blurInner', e.target.checked)} disabled={!validBgUrl} />
              <ImageIcon size={14} /> Frost Background
            </label>
          </div>

          <div className="nt-settings-group" style={{ marginTop: '20px' }}>
            <label>Shortcuts</label>
            <div className="nt-shortcuts-list">
              {config.shortcuts.map((s, idx) => (
                <div key={idx} className="nt-shortcut-item">
                  <span>{s.label}</span>
                  <button onClick={() => removeShortcut(idx)}><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
            
            <div className="nt-shortcut-add">
              <input type="text" placeholder="Name" value={newShortcutLabel} onChange={(e) => setNewShortcutLabel(e.target.value)} />
              <div style={{ display: 'flex', gap: '6px' }}>
                <input type="text" placeholder="URL" value={newShortcutUrl} onChange={(e) => setNewShortcutUrl(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addShortcut()} style={{ flex: 1 }} />
                <button onClick={addShortcut}><Plus size={14} /></button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className={`nt-main-content ${(config.bgUrl && config.blurInner) ? 'frosted' : ''}`}>
        
        {config.showClock && (
          <div className="nt-time-container">
            <h1 className="nt-clock">{time}</h1>
            <p className="nt-date">{greeting} · {date}</p>
          </div>
        )}

        <div className="nt-brand">
          <span>VEIL</span>
        </div>

        <form className="nt-search-box" onSubmit={submit}>
          <Search size={20} className="nt-search-icon" />
          <input
            type="text"
            placeholder="Search the web or enter URL..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          <button type="submit" className="nt-search-submit"><ArrowRight size={18} /></button>
        </form>

        {config.showShortcuts && (
          <div className="nt-shortcuts-grid">
            {config.shortcuts.map((s: any, idx: number) => {
              let domain = s.url;
              try { domain = new URL(s.url).hostname; } catch {}
              return (
                <div key={idx} className="nt-tile" onClick={() => onNavigate(s.url)}>
                  <div className="nt-tile-icon" style={{ background: 'var(--surface-hover)', position: 'relative' }}>
                    <div className="nt-tile-letter" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '20px', color: s.color || 'var(--text-1)' }}>
                      {s.letter || s.label.charAt(0).toUpperCase()}
                    </div>
                    <img src={`https://icon.horse/icon/${domain}`} alt="" style={{ width: 32, height: 32, borderRadius: 8, position: 'relative', zIndex: 1, objectFit: 'contain' }} onError={(e) => { e.currentTarget.style.opacity = '0'; }} />
                  </div>
                  <span className="nt-tile-label">{s.label}</span>
                </div>
              );
            })}
          </div>
        )}

        {settings?.bookmarks && settings.bookmarks.length > 0 && (
          <div className="nt-bookmarks-section">
            <h3>Bookmarks</h3>
            <div className="nt-bookmarks-grid">
              {settings.bookmarks.map((b: any, i: number) => {
                let domain = b.url;
                try { domain = new URL(b.url).hostname; } catch {}
                return (
                  <div key={i} className="nt-bookmark-card" onClick={() => onNavigate(b.url)}>
                    <div className="nt-bookmark-icon" style={{ position: 'relative' }}>
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '12px' }}>
                        {b.title ? b.title.charAt(0).toUpperCase() : domain.charAt(0).toUpperCase()}
                      </div>
                      <img src={`https://icon.horse/icon/${domain}`} alt="" style={{ width: 20, height: 20, position: 'relative', zIndex: 1 }} onError={(e) => { e.currentTarget.style.opacity = '0'; }} />
                    </div>
                    <div className="nt-bookmark-info">
                      <span className="nt-bookmark-title">{b.title || b.url}</span>
                      <span className="nt-bookmark-url">{domain}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Recently Visited */}
        {config.showRecent !== false && recentHistory && recentHistory.length > 0 && (
          <div className="nt-bookmarks-section">
            <h3>Recently Visited</h3>
            <div className="nt-bookmarks-grid">
              {recentHistory
                .filter((h, i, arr) => arr.findIndex(x => x.url === h.url) === i)
                .slice(0, 4)
                .map((h, i) => {
                  let domain = h.url;
                  try { domain = new URL(h.url).hostname; } catch {}
                  return (
                    <div key={i} className="nt-bookmark-card" onClick={() => onNavigate(h.url)}>
                      <div className="nt-bookmark-icon" style={{ position: 'relative' }}>
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '12px' }}>
                          {(h.title || domain).charAt(0).toUpperCase()}
                        </div>
                        <img src={`https://icon.horse/icon/${domain}`} alt="" style={{ width: 20, height: 20, position: 'relative', zIndex: 1 }} onError={(e) => { e.currentTarget.style.opacity = '0'; }} />
                      </div>
                      <div className="nt-bookmark-info">
                        <span className="nt-bookmark-title">{h.title || domain}</span>
                        <span className="nt-bookmark-url">{domain}</span>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
        
      </div>
    </div>
  );
}
