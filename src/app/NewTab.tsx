'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Search, Plus, ExternalLink, Globe, Shield, Lock, Code, Sparkles, FileText, BookOpen, Star, Newspaper, ShoppingBag, Gamepad2, Music, Film, Briefcase, Heart, Network, Moon, Sun, CloudSun, Sunset } from 'lucide-react';
import AuroraBackground from '@/app/browser/components/AuroraBackground';
import { parseNavigationInput } from '@/lib/urlParser';
import { useBrowserStore } from '@/lib/store';
import { safeInvoke } from '@/lib/ipcLogger';
import { invoke } from '@tauri-apps/api/core';

interface HistoryEntry { url: string; title: string; timestamp: number; favicon?: string; }

const iconMap: Record<string, any> = {
  ExternalLink, Globe, Code, Sparkles, FileText, BookOpen,
  Star, Newspaper, ShoppingBag, Gamepad2, Music, Film, Briefcase, Heart
};

function getGreetingInfo() {
  const hour = new Date().getHours();
  if (hour < 5) return { text: 'Good Night', Icon: Moon };
  if (hour < 12) return { text: 'Good Morning', Icon: Sun };
  if (hour < 17) return { text: 'Good Afternoon', Icon: CloudSun };
  if (hour < 21) return { text: 'Good Evening', Icon: Sunset };
  return { text: 'Good Night', Icon: Moon };
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
    } catch { }
  }
  return Object.entries(domainCount)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, max)
    .map(([domain, data]) => ({
      domain,
      url: data.url,
      count: data.count,
      favicon: `https://icons.duckduckgo.com/ip3/${domain}.ico`
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
  const torStatus = settings.torStatus || 'disconnected';
  const addToast = useBrowserStore(state => state.addToast);
  const [globalHistory, setGlobalHistory] = useState<HistoryEntry[]>([]);

  const greetingInfo = useMemo(() => getGreetingInfo(), []);
  const topSites = useMemo(() => getTopSites(globalHistory), [globalHistory]);

  useEffect(() => {
    invoke('get_history', { limit: 1000, offset: 0 })
      .then(res => setGlobalHistory(res as HistoryEntry[]))
      .catch(console.error);
  }, []);

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
    <div className="w-full h-full overflow-y-auto relative flex flex-col items-center pt-8 bg-[var(--bg-primary)]">
      <div className="absolute inset-0 z-0 opacity-60">
        <AuroraBackground isDark={settings.darkMode} isIncognito={!settings.normalMode} />
      </div>
      
      <div className={`relative z-10 flex flex-col items-center w-full min-h-full px-6 pb-20 ${topSites.length === 0 ? 'justify-center flex-1' : ''}`}>
        <div className="flex items-center justify-center gap-4 text-5xl font-extrabold mb-2 tracking-tight drop-shadow-sm mt-8">
          <greetingInfo.Icon size={44} className="text-[var(--accent-primary)]" />
          <span className="text-gradient">{greetingInfo.text}</span>
        </div>
        <p className="text-base text-[var(--text-secondary)] mb-6 font-semibold tracking-wide uppercase">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>

        {/* Search Bar */}
        <form
          className={`w-full max-w-[640px] mb-6 flex items-center gap-3 px-6 py-4 rounded-full transition-all duration-300
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
        <div className="flex items-center gap-3 mb-6 max-w-[640px] w-full justify-center">
          {/* Tor Mode Toggle */}
          <div className="flex flex-col items-center gap-1 relative">
            <button
              onClick={handleTorToggle}
              className={`group flex items-center gap-2.5 px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 border ${settings.torMode
                  ? 'bg-green-500/15 border-green-500/40 text-green-400 shadow-[0_0_12px_rgba(34,197,94,0.15)]'
                  : 'glass-btn border-[var(--border-color)] text-[var(--text-secondary)] hover:border-green-400/40 hover:text-green-400'
                }`}
            >
              <Network size={16} className={settings.torMode && torStatus === 'connected' ? 'text-green-400' : 'text-[var(--text-secondary)]'} />
              Tor Mode
              {settings.torMode && torStatus === 'connected' && (
                <span className="w-2 h-2 rounded-full bg-green-500" />
              )}
              {settings.torMode && torStatus === 'connecting' && (
                <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
              )}
            </button>
            {settings.torMode && torStatus === 'connecting' && torLogs.length > 0 && (
              <span className="absolute top-[calc(100%+8px)] text-[10px] text-[var(--text-tertiary)] bg-[var(--surface-icon-bg)] border border-[var(--border-color)] px-3 py-1 rounded-full max-w-[200px] truncate shadow-sm whitespace-nowrap">
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
            className={`group flex items-center gap-2.5 px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 border ${!settings.normalMode
                ? 'bg-indigo-500/15 border-indigo-500/40 text-indigo-400 shadow-[0_0_12px_rgba(79,70,229,0.15)]'
                : 'glass-btn border-[var(--border-color)] text-[var(--text-secondary)] hover:border-indigo-400/40 hover:text-indigo-400'
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
        <div className="flex flex-wrap items-center justify-center gap-4 max-w-[800px]">
          {(settings.newTabShortcuts || []).map(shortcut => {
            const IconComponent = iconMap[shortcut.icon] || Globe;
            // Try to get a favicon URL from the shortcut URL
            let faviconUrl = '';
            try {
              const domain = new URL(shortcut.url).hostname;
              faviconUrl = `http://127.0.0.1:8181/proxy?url=${encodeURIComponent(`https://icons.duckduckgo.com/ip3/${domain}.ico`)}&raw=true`;
            } catch (e) { }

            return (
              <button
                key={shortcut.id}
                onClick={() => onNavigate(shortcut.url)}
                className="group flex flex-col items-center justify-center gap-4 cursor-pointer p-4 rounded-2xl transition-all"
              >
                <div className="w-16 h-16 flex items-center justify-center rounded-2xl glass-btn text-[var(--text-secondary)] overflow-hidden">
                  {faviconUrl ? (
                    <img src={faviconUrl} alt="" className="w-8 h-8 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  ) : (
                    <IconComponent size={28} />
                  )}
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
          <div className="w-full max-w-[640px] mb-4 mt-6 bg-[var(--surface-icon-bg)] border border-[var(--border-color)] p-6 rounded-2xl shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-[var(--accent-surface)] rounded-xl text-[var(--accent-primary)] border border-[var(--border-color)]">
                <Star size={18} />
              </div>
              <h3 className="text-base font-extrabold tracking-wider uppercase text-gradient">
                Frequently Visited
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {topSites.slice(0, 3).map(site => (
                <button
                  key={site.domain}
                  onClick={() => onNavigate(site.url)}
                  className="flex items-center gap-3 p-3 rounded-xl glass-btn transition-all group border border-transparent hover:border-[var(--border-color)] hover:shadow-md bg-[var(--bg-element)] hover:bg-[var(--surface-icon-hover)]"
                >
                  <div className="w-8 h-8 rounded-lg bg-[var(--surface-icon-bg)] border border-[var(--border-color)] flex items-center justify-center p-1.5 flex-shrink-0">
                    <img
                      src={site.favicon?.startsWith('data:') ? site.favicon : `http://127.0.0.1:8181/proxy?url=${encodeURIComponent(site.favicon || `https://icons.duckduckgo.com/ip3/${site.domain}.ico`)}&raw=true`}
                      className="w-full h-full rounded-md object-contain"
                      alt=""
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  </div>
                  <div className="flex flex-col text-left overflow-hidden">
                    <span className="text-[13px] font-semibold text-[var(--text-primary)] truncate transition-colors group-hover:text-[var(--accent-primary)]">
                      {site.domain.replace('www.', '')}
                    </span>
                    <span className="text-[11px] font-medium text-[var(--text-tertiary)] truncate group-hover:text-[var(--text-secondary)] transition-colors">
                      {site.count} visits
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {showShortcutModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-md transition-opacity">
          <div className="bg-[var(--bg-primary)] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] border border-[var(--border-color)] rounded-[24px] p-8 w-full max-w-md flex flex-col relative overflow-hidden transform transition-all">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-[var(--accent-primary)] via-purple-500 to-pink-500 opacity-90" />
            
            <h3 className="text-xl font-extrabold text-[var(--text-primary)] mb-6 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--accent-surface)] border border-[var(--border-color)] flex items-center justify-center text-[var(--accent-primary)] shadow-sm">
                <Plus size={20} />
              </div>
              Add New Shortcut
            </h3>
            
            <div className="flex flex-col gap-4 mb-8">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] pl-1">Shortcut Name</label>
                <input
                  type="text"
                  placeholder="e.g., GitHub"
                  value={newShortcutName}
                  onChange={e => setNewShortcutName(e.target.value)}
                  className="w-full bg-[var(--bg-element)] border-2 border-[var(--border-color)] hover:border-gray-400 dark:hover:border-gray-500 rounded-xl px-4 py-3.5 text-[15px] font-semibold text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none focus:border-[var(--accent-primary)] focus:bg-[var(--bg-primary)] focus:shadow-[0_0_0_4px_rgba(79,70,229,0.1)] transition-all"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] pl-1">URL Address</label>
                <input
                  type="text"
                  placeholder="e.g., https://github.com"
                  value={newShortcutUrl}
                  onChange={e => setNewShortcutUrl(e.target.value)}
                  className="w-full bg-[var(--bg-element)] border-2 border-[var(--border-color)] hover:border-gray-400 dark:hover:border-gray-500 rounded-xl px-4 py-3.5 text-[15px] font-semibold text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none focus:border-[var(--accent-primary)] focus:bg-[var(--bg-primary)] focus:shadow-[0_0_0_4px_rgba(79,70,229,0.1)] transition-all"
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
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
                    }
                  }}
                />
              </div>
            </div>
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowShortcutModal(false);
                  setNewShortcutName('');
                  setNewShortcutUrl('');
                }}
                className="px-6 py-3 rounded-xl text-sm font-extrabold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-icon-hover)] transition-all"
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
                disabled={!newShortcutName.trim() || !newShortcutUrl.trim()}
                className="px-6 py-3 rounded-xl text-sm font-extrabold text-white bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_4px_14px_0_rgba(99,102,241,0.39)] hover:shadow-[0_6px_20px_rgba(99,102,241,0.23)] hover:-translate-y-[1px] transition-all flex items-center gap-2"
              >
                <Plus size={16} />
                Save Shortcut
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
