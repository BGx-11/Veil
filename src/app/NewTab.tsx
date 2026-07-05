'use client';

import React, { useState, useMemo } from 'react';
import { Search, Plus, ExternalLink, Globe, Shield, Lock, Code, Sparkles, FileText, BookOpen, Star, Newspaper, ShoppingBag, Gamepad2, Music, Film, Briefcase, Heart } from 'lucide-react';
import { parseNavigationInput } from '@/lib/urlParser';
import { useBrowserStore, type HistoryEntry } from '@/lib/store';
import { safeInvoke } from '@/lib/ipcLogger';

const iconMap: Record<string, any> = {
  ExternalLink, Globe, Code, Sparkles, FileText, BookOpen,
  Star, Newspaper, ShoppingBag, Gamepad2, Music, Film, Briefcase, Heart
};

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 5) return 'Good Night';
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  if (hour < 21) return 'Good Evening';
  return 'Good Night';
}

function getTopSites(history: HistoryEntry[], max: number = 6): { domain: string; url: string; count: number; favicon: string }[] {
  const domainCount: Record<string, { url: string; count: number }> = {};
  for (const entry of history) {
    try {
      const u = new URL(entry.url);
      const domain = u.hostname;
      if (!domain || domain === '127.0.0.1') continue;
      if (!domainCount[domain]) domainCount[domain] = { url: `https://${domain}`, count: 0 };
      domainCount[domain].count++;
    } catch {}
  }
  return Object.entries(domainCount)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, max)
    .map(([domain, data]) => ({
      domain,
      url: data.url,
      count: data.count,
      favicon: `https://www.google.com/s2/favicons?domain=${domain}&sz=64`
    }));
}

interface NewTabProps {
  onNavigate: (url: string) => void;
}

export default function NewTab({ onNavigate }: NewTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [showShortcutModal, setShowShortcutModal] = useState(false);
  const [newShortcutName, setNewShortcutName] = useState('');
  const [newShortcutUrl, setNewShortcutUrl] = useState('');
  
  const settings = useBrowserStore(state => state.settings);
  const updateSettings = useBrowserStore(state => state.updateSettings);
  const torLogs = useBrowserStore(state => state.torLogs);
  const globalHistory = useBrowserStore(state => state.globalHistory);
  const torStatus = settings.torStatus || 'disconnected';
  const addToast = useBrowserStore(state => state.addToast);

  const greeting = useMemo(() => getGreeting(), []);
  const topSites = useMemo(() => getTopSites(globalHistory), [globalHistory]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    // But parseNavigationInput handles the actual string parsing.
    const url = parseNavigationInput(searchQuery);
    onNavigate(url);
  };

  const getSearchPlaceholder = () => {
    switch (settings.searchEngine) {
      case 'yahoo': return 'Search with Yahoo';
      case 'duckduckgo': return 'Search with DuckDuckGo';
      case 'google': return 'Search with Google';
      case 'bing': return 'Search with Bing';
      case 'brave': return 'Search with Brave';
      default: return 'Search the web';
    }
  };

  const handleTorToggle = async () => {
    const newVal = !settings.torMode;
    try {
      await safeInvoke('toggle_tor', { enable: newVal });
      updateSettings({ torMode: newVal });
      addToast(newVal ? 'Tor Network connected' : 'Tor Network disconnected', newVal ? 'success' : 'info');
    } catch (e) {
      console.error(e);
      addToast('Failed to toggle Tor mode', 'warning');
    }
  };

  return (
    <div className="w-full h-full overflow-y-auto bg-transparent relative flex flex-col items-center pt-24">

      <div className="text-4xl font-bold mb-2 text-gradient tracking-tight drop-shadow-sm">
        {greeting}
      </div>
      <p className="text-sm text-[var(--text-tertiary)] mb-8 font-medium">
        {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
      </p>

      {/* Search Bar */}
      <form
        className={`w-full max-w-[640px] mb-8 flex items-center gap-3 px-6 py-4 rounded-full transition-all duration-300
          ${isFocused ? 'glass-input border-indigo-400 shadow-[0_0_0_3px_rgba(79,70,229,0.15)]' : 'glass-panel'}`}
        onSubmit={handleSearch}
      >
        <div className="flex items-center justify-center w-10 h-10 rounded-full glass-panel shadow-inner text-[var(--accent-primary)]">
          <Search size={18} />
        </div>

        <input
          type="text"
          placeholder={getSearchPlaceholder()}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className="flex-1 bg-transparent border-none outline-none text-[16px] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] font-medium"
        />
      </form>

      {/* Quick Mode Toggles */}
      <div className="flex items-center gap-3 mb-10 max-w-[640px] w-full justify-center">
        {/* Tor Mode Toggle */}
        <div className="flex flex-col items-center gap-1 relative">
          <button
            onClick={handleTorToggle}
            className={`group flex items-center gap-2.5 px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 border ${
              settings.torMode
                ? 'bg-green-500/15 border-green-500/40 text-green-600 shadow-[0_0_12px_rgba(34,197,94,0.15)]'
                : 'glass-btn border-[var(--glass-border,rgba(0,0,0,0.08))] text-[var(--text-secondary)] hover:border-green-400/40 hover:text-green-600'
            }`}
          >
            <span className="text-base">🧅</span>
            Tor Mode
            {settings.torMode && torStatus === 'connected' && (
              <span className="w-2 h-2 rounded-full bg-green-500" />
            )}
            {settings.torMode && torStatus === 'connecting' && (
              <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
            )}
          </button>
          {settings.torMode && torStatus === 'connecting' && torLogs.length > 0 && (
            <span className="absolute -bottom-5 text-[9px] text-[var(--accent)] font-mono max-w-[140px] truncate">
              {torLogs[torLogs.length - 1]}
            </span>
          )}
        </div>

        {/* Privacy Mode Toggle */}
        <button
          onClick={() => {
            const newVal = !settings.normalMode;
            updateSettings({ normalMode: newVal });
            addToast(newVal ? 'Normal Mode Enabled' : 'Privacy Mode Active', 'info');
          }}
          className={`group flex items-center gap-2.5 px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 border ${
            !settings.normalMode
              ? 'bg-indigo-500/15 border-indigo-500/40 text-indigo-600 shadow-[0_0_12px_rgba(79,70,229,0.15)]'
              : 'glass-btn border-[var(--glass-border,rgba(0,0,0,0.08))] text-[var(--text-secondary)] hover:border-indigo-400/40 hover:text-indigo-600'
          }`}
        >
          {settings.normalMode ? <Globe size={15} /> : <Shield size={15} />}
          {settings.normalMode ? 'Normal Mode' : 'Privacy Mode'}
          {!settings.normalMode && (
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
          )}
        </button>
      </div>

      {/* Dynamic Shortcuts Grid */}
      <div className="flex flex-wrap items-center justify-center gap-6 max-w-[800px]">
        {(settings.newTabShortcuts || []).map(shortcut => {
          const IconComponent = iconMap[shortcut.icon] || Globe;
          return (
            <button
              key={shortcut.id}
              onClick={() => onNavigate(shortcut.url)}
              className="group flex flex-col items-center justify-center gap-4 cursor-pointer p-4 rounded-2xl transition-all"
            >
              <div className="w-16 h-16 flex items-center justify-center rounded-2xl glass-btn text-slate-600">
                <IconComponent size={28} />
              </div>
              <div className="text-[13px] font-medium text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">
                {shortcut.name}
              </div>
            </button>
          )
        })}

        {/* Add Shortcut Button */}
        <button 
          onClick={() => setShowShortcutModal(true)}
          className="group flex flex-col items-center justify-center gap-4 cursor-pointer p-4 rounded-2xl transition-all"
        >
          <div className="w-16 h-16 flex items-center justify-center rounded-2xl glass-btn text-[var(--text-tertiary)] group-hover:text-[var(--accent-primary)] transition-colors">
            <Plus size={28} />
          </div>
          <div className="text-[13px] font-medium text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">
            Add shortcut
          </div>
        </button>
      </div>

      {/* Top Visited Sites */}
      {topSites.length > 0 && (
        <div className="w-full max-w-[640px] mb-6 mt-8">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-[var(--text-tertiary)] mb-3 px-1 text-center sm:text-left">Frequently Visited</h3>
          <div className="flex flex-wrap justify-center sm:justify-start gap-3">
            {topSites.map(site => (
              <button
                key={site.domain}
                onClick={() => onNavigate(site.url)}
                className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl glass-btn transition-all hover:shadow-md group"
              >
                <img 
                  src={site.favicon} 
                  className="w-5 h-5 rounded-sm" 
                  alt=""
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
                <span className="text-sm font-medium text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">
                  {site.domain.replace('www.', '')}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {showShortcutModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
          <div className="glass-panel-heavy p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold text-[var(--text-primary)] mb-4">Add Shortcut</h3>
            <div className="flex flex-col gap-3">
              <input
                type="text"
                placeholder="Name (e.g., GitHub)"
                value={newShortcutName}
                onChange={e => setNewShortcutName(e.target.value)}
                className="w-full bg-white/60 border border-[var(--glass-border-strong)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none focus:border-[var(--accent-primary)] focus:bg-white transition-all shadow-sm"
              />
              <input
                type="text"
                placeholder="URL (e.g., https://github.com)"
                value={newShortcutUrl}
                onChange={e => setNewShortcutUrl(e.target.value)}
                className="w-full bg-white/60 border border-[var(--glass-border-strong)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none focus:border-[var(--accent-primary)] focus:bg-white transition-all shadow-sm"
              />
              <div className="flex gap-2 justify-end mt-2">
                <button
                  onClick={() => {
                    setShowShortcutModal(false);
                    setNewShortcutName('');
                    setNewShortcutUrl('');
                  }}
                  className="px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (!newShortcutName.trim() || !newShortcutUrl.trim()) return;
                    const newShortcut = {
                      id: Date.now().toString(),
                      name: newShortcutName.trim(),
                      url: parseNavigationInput(newShortcutUrl.trim()),
                      icon: 'Globe'
                    };
                    updateSettings({ 
                      newTabShortcuts: [...(settings.newTabShortcuts || []), newShortcut] 
                    });
                    addToast('Shortcut added', 'success');
                    setShowShortcutModal(false);
                    setNewShortcutName('');
                    setNewShortcutUrl('');
                  }}
                  className="px-4 py-2 text-sm font-medium bg-[var(--violet)] text-white rounded-lg hover:bg-opacity-90 transition-colors"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
