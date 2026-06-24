'use client';

import React, { useState, useMemo } from 'react';
import { Clock, Search, Trash2, Globe, ExternalLink } from 'lucide-react';

interface HistoryEntry { url: string; title: string; timestamp: number; }
interface HistoryProps { history: HistoryEntry[]; onNavigate: (url: string) => void; onClearHistory: (before?: number) => void; }

export default function History({ history, onNavigate, onClearHistory }: HistoryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);

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
    <div className="w-full h-full overflow-y-auto" style={{ background: 'transparent' }}>
      <div className="max-w-3xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="flex items-center gap-3 text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            <Clock size={22} style={{ color: 'var(--accent)' }} />
            History
          </h1>
          {confirmClear ? (
            <div className="flex items-center gap-2">
              <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Clear all?</span>
              <button
                onClick={() => { onClearHistory(); setConfirmClear(false); }}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                style={{ background: 'var(--danger-surface)', color: 'var(--danger)' }}
              >Yes, Clear</button>
              <button
                onClick={() => setConfirmClear(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                style={{ background: 'var(--glass-bg)', color: 'var(--text-tertiary)' }}
              >Cancel</button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmClear(true)}
              disabled={history.length === 0}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-30"
              style={{ background: 'var(--glass-bg)', color: 'var(--text-tertiary)', border: '1px solid var(--glass-border)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--danger-surface)'; e.currentTarget.style.color = 'var(--danger)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--glass-bg)'; e.currentTarget.style.color = 'var(--text-tertiary)'; }}
            >
              <Trash2 size={13} /> Clear
            </button>
          )}
        </div>

        {/* Search */}
        <div
          className="flex items-center gap-3 px-4 py-2.5 rounded-xl mb-8 transition-all duration-200"
          style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}
        >
          <Search size={15} style={{ color: 'var(--text-ghost)' }} />
          <input
            type="text" placeholder="Search history…" value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none text-sm"
            style={{ color: 'var(--text-primary)' }}
          />
        </div>

        {/* Content */}
        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Clock size={40} style={{ color: 'var(--text-ghost)' }} />
            <p className="text-sm font-medium" style={{ color: 'var(--text-tertiary)' }}>No browsing history yet.</p>
          </div>
        ) : grouped.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Search size={40} style={{ color: 'var(--text-ghost)' }} />
            <p className="text-sm font-medium" style={{ color: 'var(--text-tertiary)' }}>No results found.</p>
          </div>
        ) : (
          grouped.map(group => (
            <div key={group.label} className="mb-6">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xs font-bold tracking-[0.15em] uppercase" style={{ color: 'var(--text-ghost)' }}>{group.label}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: 'var(--glass-bg-active)', color: 'var(--text-tertiary)' }}>{group.entries.length}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                {group.entries.map((entry, i) => (
                  <div
                    key={`${entry.timestamp}-${i}`}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-all duration-150"
                    onClick={() => onNavigate(entry.url)}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--glass-bg-hover)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <div className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0" style={{ opacity: 0.5 }}>
                      <img src={`https://www.google.com/s2/favicons?domain=${getDomain(entry.url)}&sz=32`} alt="" className="w-3.5 h-3.5" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm truncate block" style={{ color: 'var(--text-secondary)' }}>{entry.title || entry.url}</span>
                    </div>
                    <span className="text-[11px] flex-shrink-0" style={{ color: 'var(--text-ghost)' }}>{formatTime(entry.timestamp)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
