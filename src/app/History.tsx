'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Clock, Search, Trash2, ChevronRight, Globe, ExternalLink } from 'lucide-react';

interface HistoryEntry {
  url: string;
  title: string;
  timestamp: number;
}

interface HistoryProps {
  history: HistoryEntry[];
  onNavigate: (url: string) => void;
  onClearHistory: (before?: number) => void;
}

export default function History({ history, onNavigate, onClearHistory }: HistoryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return history;
    const q = searchQuery.toLowerCase();
    return history.filter(
      (h) =>
        h.title.toLowerCase().includes(q) ||
        h.url.toLowerCase().includes(q)
    );
  }, [history, searchQuery]);

  const grouped = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterdayStart = todayStart - 86400000;
    const weekStart = todayStart - 6 * 86400000;

    const groups: { label: string; entries: HistoryEntry[] }[] = [
      { label: 'Today', entries: [] },
      { label: 'Yesterday', entries: [] },
      { label: 'This Week', entries: [] },
      { label: 'Earlier', entries: [] },
    ];

    for (const entry of filtered) {
      if (entry.timestamp >= todayStart) groups[0].entries.push(entry);
      else if (entry.timestamp >= yesterdayStart) groups[1].entries.push(entry);
      else if (entry.timestamp >= weekStart) groups[2].entries.push(entry);
      else groups[3].entries.push(entry);
    }

    return groups.filter((g) => g.entries.length > 0);
  }, [filtered]);

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getDomain = (url: string) => {
    try { return new URL(url).hostname; } catch { return url; }
  };

  return (
    <div className="history-page">
      <div className="history-header">
        <div className="history-title-row">
          <h1>
            <Clock size={24} color="var(--accent)" />
            Browsing History
          </h1>
          <div className="history-actions">
            {confirmClear ? (
              <div className="history-confirm-clear">
                <span>Clear all history?</span>
                <button className="history-confirm-yes" onClick={() => { onClearHistory(); setConfirmClear(false); }}>
                  Yes, Clear All
                </button>
                <button className="history-confirm-no" onClick={() => setConfirmClear(false)}>
                  Cancel
                </button>
              </div>
            ) : (
              <button
                className="history-clear-btn"
                onClick={() => setConfirmClear(true)}
                disabled={history.length === 0}
              >
                <Trash2 size={14} />
                Clear History
              </button>
            )}
          </div>
        </div>
        <div className="history-search">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search history..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="history-content">
        {history.length === 0 ? (
          <div className="history-empty">
            <Clock size={48} color="var(--text-4)" />
            <p>No browsing history yet.</p>
            <span>Your browsing history will appear here.</span>
          </div>
        ) : grouped.length === 0 ? (
          <div className="history-empty">
            <Search size={48} color="var(--text-4)" />
            <p>No results found.</p>
            <span>Try a different search term.</span>
          </div>
        ) : (
          grouped.map((group) => (
            <div key={group.label} className="history-group">
              <div className="history-group-header">
                <span>{group.label}</span>
                <span className="history-group-count">{group.entries.length}</span>
              </div>
              <div className="history-group-list">
                {group.entries.map((entry, i) => (
                  <div
                    key={`${entry.timestamp}-${i}`}
                    className="history-entry"
                    onClick={() => onNavigate(entry.url)}
                  >
                    <div className="history-entry-favicon">
                      <img
                        src={`https://www.google.com/s2/favicons?domain=${getDomain(entry.url)}&sz=32`}
                        alt=""
                        width={16}
                        height={16}
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.parentElement!.innerHTML = '<span class="history-entry-globe"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg></span>';
                        }}
                      />
                    </div>
                    <div className="history-entry-info">
                      <span className="history-entry-title">{entry.title || entry.url}</span>
                      <span className="history-entry-url">{getDomain(entry.url)}</span>
                    </div>
                    <span className="history-entry-time">{formatTime(entry.timestamp)}</span>
                    <ExternalLink size={12} className="history-entry-arrow" />
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
