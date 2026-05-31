'use client';

import React, { useState, useEffect } from 'react';
import { Search, Shield, Image as ImageIcon, X, Clock, LayoutGrid, Plus, Trash2 } from 'lucide-react';

const DEFAULT_SHORTCUTS = [
  { label: 'DuckDuckGo', url: 'https://duckduckgo.com', letter: 'D' },
  { label: 'Wikipedia', url: 'https://www.wikipedia.org', letter: 'W' },
  { label: 'GitHub', url: 'https://github.com', letter: 'G' },
  { label: 'Reddit', url: 'https://www.reddit.com', letter: 'R' },
];



export default function NewTab({ 
  onNavigate, 
  settings, 
  onToggleSetting 
}: { 
  onNavigate: (url: string) => void;
  settings?: any;
  onToggleSetting?: (key: string) => Promise<void>;
}) {
  const [query, setQuery] = useState('');
  const [time, setTime] = useState('');
  const [date, setDate] = useState('');
  
  // Customization State
  const [config, setConfig] = useState({
    bgUrl: '',
    showClock: true,
    showShortcuts: true,
    blurInner: true,
    shortcuts: DEFAULT_SHORTCUTS
  });
  const [showSettings, setShowSettings] = useState(false);
  
  // New Shortcut Inputs
  const [newShortcutLabel, setNewShortcutLabel] = useState('');
  const [newShortcutUrl, setNewShortcutUrl] = useState('');

  useEffect(() => {
    try {
      // Clean up old faulty storage
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
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
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

    const newShortcut = {
      label: newShortcutLabel.trim(),
      url: finalUrl,
      letter: newShortcutLabel.trim().charAt(0).toUpperCase()
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
    <div className="newtab" style={validBgUrl ? { backgroundImage: `url(${validBgUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}>
      
      {/* Animated gradient orbs */}
      {!validBgUrl && (
        <>
          <div className="newtab-orb" />
          <div className="newtab-orb" />
          <div className="newtab-orb" />
        </>
      )}

      {/* Settings Toggle */}
      <button 
        className="newtab-customize-btn" 
        onClick={() => setShowSettings(!showSettings)}
        title="Customize Homepage"
      >
        <ImageIcon size={18} />
      </button>

      {/* Advanced Settings Panel */}
      {showSettings && (
        <div className="newtab-settings" style={{ width: '340px', maxHeight: '80vh', overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
            <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-1)' }}>Customize Homepage</span>
            <button onClick={() => setShowSettings(false)} style={{ background: 'none', border: 'none', color: 'var(--text-4)', cursor: 'pointer', transition: 'color var(--transition-fast)' }} onMouseOver={(e) => e.currentTarget.style.color = 'var(--text-1)'} onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-4)'}><X size={16} /></button>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '12px', color: 'var(--text-3)', fontWeight: 600, display: 'block', marginBottom: '8px' }}>Background Image</label>

            <input 
              type="text" 
              placeholder="Or paste custom image URL..." 
              value={validBgUrl} 
              onChange={(e) => updateConfig('bgUrl', e.target.value)} 
              className="newtab-settings-input"
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer' }}>
              <input type="checkbox" checked={config.showClock} onChange={(e) => updateConfig('showClock', e.target.checked)} />
              <Clock size={14} color="var(--text-3)" /> Show Clock & Date
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer' }}>
              <input type="checkbox" checked={config.showShortcuts} onChange={(e) => updateConfig('showShortcuts', e.target.checked)} />
              <LayoutGrid size={14} color="var(--text-3)" /> Show Shortcuts
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer' }}>
              <input type="checkbox" checked={config.blurInner} onChange={(e) => updateConfig('blurInner', e.target.checked)} disabled={!validBgUrl} />
              <ImageIcon size={14} color="var(--text-3)" /> Frost Search Panel
            </label>
          </div>



          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-3)', fontWeight: 600, display: 'block', marginBottom: '8px' }}>Manage Shortcuts</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
              {config.shortcuts.map((s, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--surface)', border: '1px solid var(--border)', padding: '8px 12px', borderRadius: '8px', transition: 'all var(--transition)' }}>
                  <div style={{ fontSize: '13px', color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '240px', fontWeight: 500 }}>{s.label}</div>
                  <button onClick={() => removeShortcut(idx)} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', display: 'flex', opacity: 0.7, transition: 'opacity var(--transition)' }} onMouseOver={(e) => e.currentTarget.style.opacity = '1'} onMouseOut={(e) => e.currentTarget.style.opacity = '0.7'}><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <input type="text" placeholder="Shortcut Name (e.g. YouTube)" value={newShortcutLabel} onChange={(e) => setNewShortcutLabel(e.target.value)} className="newtab-settings-input" style={{ padding: '8px 10px', fontSize: '12px' }} />
              <div style={{ display: 'flex', gap: '6px' }}>
                <input type="text" placeholder="URL (e.g. youtube.com)" value={newShortcutUrl} onChange={(e) => setNewShortcutUrl(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addShortcut()} className="newtab-settings-input" style={{ flex: 1, padding: '8px 10px', fontSize: '12px' }} />
                <button onClick={addShortcut} style={{ background: 'var(--accent)', color: 'white', border: 'none', borderRadius: '8px', width: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Plus size={16} /></button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="newtab-inner" style={(config.bgUrl && config.blurInner) ? { background: 'rgba(0,0,0,0.5)', borderRadius: '24px', backdropFilter: 'blur(16px)' } : {}}>
        
        {config.showClock && (
          <>
            <div className="newtab-clock">{time}</div>
            <div className="newtab-date">{date}</div>
          </>
        )}

        <div className="newtab-brand" style={{ marginTop: config.showClock ? '0' : '40px' }}>
          <Shield />
          <span>SecureBrowser</span>
        </div>

        <form className="newtab-search" onSubmit={submit}>
          <Search size={18} />
          <input
            type="text"
            placeholder="Search the web or enter a URL"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
        </form>

        {settings && onToggleSetting && (
          <div style={{ marginTop: '20px', padding: '10px 16px', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(10px)', borderRadius: '12px', border: '1px solid var(--glass-border)', display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Shield size={14} color={settings.torMode ? 'var(--green)' : 'var(--text-3)'} /> Secure Tor Mode
              </span>
              <div
                className={`toggle ${settings.torMode ? 'on' : ''}`}
                onClick={async () => {
                  const el = document.getElementById('newtab-tor-loading-main');
                  if (el) el.style.display = 'block';
                  try {
                    await onToggleSetting('torMode');
                  } finally {
                    if (el) el.style.display = 'none';
                  }
                }}
              />
            </div>
            <div id="newtab-tor-loading-main" style={{ display: 'none', fontSize: '11px', color: 'var(--accent)', marginTop: '8px' }}>
              {!settings.torMode ? 'Starting Tor... This may take up to 15s.' : 'Disabling Tor...'}
            </div>
          </div>
        )}

        {config.showShortcuts && (
          <div className="newtab-shortcuts">
            {config.shortcuts.map((s, idx) => (
              <div key={idx} className="shortcut" onClick={() => onNavigate(s.url)}>
                <div className="shortcut-icon">{s.letter}</div>
                <div className="shortcut-label">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {settings?.bookmarks && settings.bookmarks.length > 0 && (
          <div style={{ marginTop: '30px', width: '100%', maxWidth: '600px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <h3 style={{ fontSize: '14px', color: 'var(--text-3)', fontWeight: 600, paddingLeft: '8px' }}>Bookmarks</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
              {settings.bookmarks.map((b: any, i: number) => (
                <div 
                  key={i} 
                  onClick={() => onNavigate(b.url)}
                  style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '16px', cursor: 'pointer', backdropFilter: 'blur(10px)', boxShadow: 'var(--shadow-sm)', transition: 'all var(--transition-spring)' }}
                  onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)'; e.currentTarget.style.background = 'var(--surface-hover)' }}
                  onMouseOut={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.background = 'var(--glass-bg)' }}
                >
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 800, color: 'var(--accent)' }}>
                    {b.title ? b.title.charAt(0).toUpperCase() : '?'}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.title || b.url}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.url}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
      </div>
    </div>
  );
}
