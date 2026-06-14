'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronUp, ChevronDown, CaseSensitive } from 'lucide-react';

interface FindBarProps {
  isOpen: boolean;
  onClose: () => void;
  webviewRef: any;
}

export default function FindBar({ isOpen, onClose, webviewRef }: FindBarProps) {
  const [query, setQuery] = useState('');
  const [matchInfo, setMatchInfo] = useState<{ activeMatchOrdinal: number; matches: number } | null>(null);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
    if (!isOpen) {
      setQuery('');
      setMatchInfo(null);
      // Clear selection in iframe
      try {
        const iframe = webviewRef?.current as HTMLIFrameElement | undefined;
        const win = iframe?.contentWindow;
        if (win) win.getSelection()?.removeAllRanges();
      } catch (_e) { /* cross-origin */ }
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
      // Cross-origin — can't search
      setMatchInfo({ activeMatchOrdinal: 0, matches: 0 });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    doFind(val, true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      doFind(query, !e.shiftKey);
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  const toggleCase = () => {
    const next = !caseSensitive;
    setCaseSensitive(next);
    if (query) {
      setTimeout(() => doFind(query, true), 50);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="find-bar">
      <div className="find-bar-inner">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Find in page…"
          className="find-bar-input"
        />
        {query && matchInfo && (
          <span className="find-bar-count">
            {matchInfo.matches > 0
              ? `${matchInfo.activeMatchOrdinal} of ${matchInfo.matches}`
              : 'No matches'}
          </span>
        )}
        <div className="find-bar-actions">
          <button
            className={`find-bar-btn ${caseSensitive ? 'active' : ''}`}
            onClick={toggleCase}
            title="Match Case"
          >
            <CaseSensitive size={14} />
          </button>
          <button
            className="find-bar-btn"
            onClick={() => doFind(query, false)}
            disabled={!query || !matchInfo?.matches}
            title="Previous (Shift+Enter)"
          >
            <ChevronUp size={14} />
          </button>
          <button
            className="find-bar-btn"
            onClick={() => doFind(query, true)}
            disabled={!query || !matchInfo?.matches}
            title="Next (Enter)"
          >
            <ChevronDown size={14} />
          </button>
          <button className="find-bar-btn find-bar-close" onClick={onClose} title="Close (Esc)">
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
