'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronUp, ChevronDown, CaseSensitive, Search } from 'lucide-react';

interface FindBarProps { isOpen: boolean; onClose: () => void; webviewRef: any; }

export default function FindBar({ isOpen, onClose, webviewRef }: FindBarProps) {
  const [query, setQuery] = useState('');
  const [matchInfo, setMatchInfo] = useState<{ activeMatchOrdinal: number; matches: number } | null>(null);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) { inputRef.current.focus(); inputRef.current.select(); }
    if (!isOpen) {
      setQuery(''); setMatchInfo(null);
      try {
        const iframe = webviewRef?.current as HTMLIFrameElement | undefined;
        const win = iframe?.contentWindow;
        if (win) win.getSelection()?.removeAllRanges();
      } catch (_e) {}
    }
  }, [isOpen]);

  const doFind = (text: string, forward = true) => {
    if (!webviewRef?.current || !text) {
      setMatchInfo(null);
      try {
        const iframe = webviewRef?.current as HTMLIFrameElement | undefined;
        const win = iframe?.contentWindow;
        if (win) win.getSelection()?.removeAllRanges();
      } catch (_e) {}
      return;
    }
    try {
      const iframe = webviewRef.current as HTMLIFrameElement;
      const win = iframe.contentWindow;
      if (win) {
        const found = (win as any).find(text, caseSensitive, !forward, true, false, false, false);
        setMatchInfo(found ? { activeMatchOrdinal: 1, matches: 1 } : { activeMatchOrdinal: 0, matches: 0 });
      }
    } catch (_e) {
      setMatchInfo({ activeMatchOrdinal: 0, matches: 0 });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => { const val = e.target.value; setQuery(val); doFind(val, true); };
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); doFind(query, !e.shiftKey); }
    if (e.key === 'Escape') { e.preventDefault(); onClose(); }
  };
  const toggleCase = () => {
    const next = !caseSensitive; setCaseSensitive(next);
    if (query) setTimeout(() => doFind(query, true), 50);
  };

  if (!isOpen) return null;

  return (
    <div className="absolute top-4 right-4 z-50 animate-fade-in pointer-events-auto">
      <div
        className="flex items-center p-1.5 rounded-xl transition-all duration-300"
        style={{
          background: 'var(--glass-bg)',
          border: '1px solid var(--glass-border)',
          boxShadow: 'var(--shadow-glow-accent)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
        }}
      >
        <div className="flex items-center px-3 gap-2 flex-1 min-w-[200px]">
          <Search size={14} style={{ color: 'var(--text-tertiary)' }} />
          <input
            ref={inputRef} type="text" value={query} onChange={handleInputChange} onKeyDown={handleKeyDown}
            placeholder="Find in page…"
            className="w-full bg-transparent outline-none text-sm font-medium"
            style={{ color: 'var(--text-primary)' }}
          />
          {query && matchInfo && (
            <span className="text-xs whitespace-nowrap" style={{ color: matchInfo.matches === 0 ? 'var(--danger)' : 'var(--text-tertiary)' }}>
              {matchInfo.matches > 0 ? `${matchInfo.activeMatchOrdinal} / ${matchInfo.matches}` : '0 / 0'}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 pl-2" style={{ borderLeft: '1px solid var(--glass-border)' }}>
          <button
            className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors"
            style={{ background: caseSensitive ? 'var(--glass-bg-active)' : 'transparent', color: caseSensitive ? 'var(--accent)' : 'var(--text-tertiary)' }}
            onClick={toggleCase} title="Match Case"
            onMouseEnter={e => { if (!caseSensitive) e.currentTarget.style.background = 'var(--glass-bg-hover)'; }}
            onMouseLeave={e => { if (!caseSensitive) e.currentTarget.style.background = 'transparent'; }}
          >
            <CaseSensitive size={14} />
          </button>
          <button
            className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ color: 'var(--text-primary)' }} onClick={() => doFind(query, false)} disabled={!query || !matchInfo?.matches} title="Previous (Shift+Enter)"
            onMouseEnter={e => { if (!e.currentTarget.disabled) e.currentTarget.style.background = 'var(--glass-bg-hover)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
          >
            <ChevronUp size={14} />
          </button>
          <button
            className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ color: 'var(--text-primary)' }} onClick={() => doFind(query, true)} disabled={!query || !matchInfo?.matches} title="Next (Enter)"
            onMouseEnter={e => { if (!e.currentTarget.disabled) e.currentTarget.style.background = 'var(--glass-bg-hover)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
          >
            <ChevronDown size={14} />
          </button>
          <button
            className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors ml-1"
            style={{ color: 'var(--text-tertiary)', background: 'var(--danger-surface)' }} onClick={onClose} title="Close (Esc)"
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--danger)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-tertiary)'; }}
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
