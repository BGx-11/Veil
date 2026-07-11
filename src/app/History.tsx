'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Clock, Search, Trash2, Globe, ExternalLink } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';

interface HistoryEntry { url: string; title: string; timestamp: number; favicon?: string }
interface HistoryProps { onNavigate: (url: string) => void; }

export default function History({ onNavigate }: HistoryProps) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const data = await invoke('get_history', { limit: 1000, offset: 0 });
      setHistory(data as HistoryEntry[]);
    } catch (e) {
      console.error('Failed to load history', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleClearHistory = async () => {
    try {
      await invoke('clear_history');
      setHistory([]);
      setConfirmClear(false);
    } catch (e) {
      console.error('Failed to clear history', e);
    }
  };

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return history;
    const q = searchQuery.toLowerCase();
    return history.filter(h => h.title.toLowerCase().includes(q) || h.url.toLowerCase().includes(q));
  }, [history, searchQuery]);

  const grouped = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterdayStart = todayStart - 86400000;
    const weekStart = todayStart - 6 * 86400000;
    const groups: { label: string; entries: HistoryEntry[] }[] = [
      { label: 'Today', entries: [] }, { label: 'Yesterday', entries: [] },
      { label: 'This Week', entries: [] }, { label: 'Earlier', entries: [] },
    ];
    for (const entry of filtered) {
      if (entry.timestamp >= todayStart) groups[0].entries.push(entry);
      else if (entry.timestamp >= yesterdayStart) groups[1].entries.push(entry);
      else if (entry.timestamp >= weekStart) groups[2].entries.push(entry);
      else groups[3].entries.push(entry);
    }
    return groups.filter(g => g.entries.length > 0);
  }, [filtered]);

  const formatTime = (ts: number) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const getDomain = (url: string) => { try { return new URL(url).hostname; } catch { return url; } };

  return (
    <div className="w-full h-full overflow-y-auto relative bg-[var(--bg-primary)]">
      <div className="max-w-3xl mx-auto px-6 py-10 relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="flex items-center gap-3 text-3xl font-extrabold tracking-tight drop-shadow-sm text-[var(--text-primary)]">
            <Clock size={28} className="text-[var(--accent-primary)]" />
            <span className="text-gradient">History</span>
          </h1>
          {confirmClear ? (
            <div className="flex items-center gap-3 bg-[var(--surface-icon-bg)] px-3 py-2 rounded-xl border border-[var(--border-color)]">
              <span className="text-xs font-semibold text-[var(--text-secondary)]">Clear all?</span>
              <button
                onClick={handleClearHistory}
                className="px-4 py-1.5 rounded-lg text-xs font-bold transition-all bg-red-500/10 text-red-500 hover:bg-red-500/20"
              >
                Yes, Clear
              </button>
              <button
                onClick={() => setConfirmClear(false)}
                className="px-4 py-1.5 rounded-lg text-xs font-bold transition-all glass-btn text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmClear(true)}
              disabled={history.length === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-30 bg-[var(--surface-icon-bg)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:border-red-400/40 hover:text-red-400 hover:bg-red-500/5"
            >
              <Trash2 size={16} /> Clear History
            </button>
          )}
        </div>

        {/* Search */}
        <div className="flex justify-center mb-10 w-full">
          <div className="w-full max-w-[640px] flex items-center gap-3 px-5 py-3.5 rounded-full transition-all duration-300 bg-[var(--surface-icon-bg)] border border-[var(--border-color)] shadow-sm focus-within:border-indigo-400 focus-within:shadow-[0_0_0_3px_rgba(79,70,229,0.15)]">
            <div className="flex items-center justify-center w-8 h-8 rounded-full text-[var(--text-tertiary)] focus-within:text-[var(--accent-primary)] transition-colors">
              <Search size={18} />
            </div>
            <input
              type="text" 
              placeholder="Search history…" 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent border-none outline-none text-[15px] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] font-medium"
            />
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Clock size={48} className="animate-pulse text-[var(--text-tertiary)]" />
            <p className="text-base font-medium text-[var(--text-tertiary)]">Loading history...</p>
          </div>
        ) : history.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Clock size={48} className="text-[var(--text-tertiary)] opacity-50" />
            <p className="text-base font-medium text-[var(--text-tertiary)]">No browsing history yet.</p>
          </div>
        ) : grouped.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Search size={48} className="text-[var(--text-tertiary)] opacity-50" />
            <p className="text-base font-medium text-[var(--text-tertiary)]">No results found.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            {grouped.map(group => (
              <div key={group.label} className="flex flex-col">
                <div className="flex items-center gap-3 mb-4 pl-1">
                  <span className="text-sm font-extrabold tracking-wider uppercase text-[var(--text-secondary)]">{group.label}</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-[var(--surface-icon-bg)] border border-[var(--border-color)] text-[var(--text-tertiary)]">
                    {group.entries.length}
                  </span>
                </div>
                <div className="flex flex-col bg-[var(--surface-icon-bg)] border border-[var(--border-color)] rounded-2xl overflow-hidden shadow-sm">
                  {group.entries.map((entry, i) => (
                    <button
                      key={`${entry.timestamp}-${i}`}
                      className={`flex items-center gap-4 px-5 py-3.5 cursor-pointer transition-all group hover:bg-[var(--surface-icon-hover)] ${i !== group.entries.length - 1 ? 'border-b border-[var(--border-color)]' : ''}`}
                      onClick={() => onNavigate(entry.url)}
                    >
                      <div className="w-9 h-9 rounded-xl glass-btn flex items-center justify-center p-2 flex-shrink-0 border border-[var(--border-color)] shadow-sm">
                        <img src={`https://icons.duckduckgo.com/ip3/${getDomain(entry.url)}.ico`} alt="" className="w-full h-full object-contain" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      </div>
                      <div className="flex-1 min-w-0 text-left flex flex-col justify-center">
                        <span className="text-[14px] font-semibold text-[var(--text-primary)] truncate group-hover:text-[var(--accent-primary)] transition-colors">
                          {entry.title || entry.url}
                        </span>
                        <span className="text-[12px] font-medium text-[var(--text-tertiary)] truncate mt-0.5">
                          {entry.url}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[12px] font-medium text-[var(--text-tertiary)] whitespace-nowrap">
                          {formatTime(entry.timestamp)}
                        </span>
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--text-tertiary)] opacity-0 group-hover:opacity-100 group-hover:bg-[var(--bg-element)] transition-all">
                          <ExternalLink size={14} />
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
