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
      if (webviewRef?.current) {
        try { webviewRef.current.stopFindInPage('clearSelection'); } catch (e) {}
      }
    }
  }, [isOpen]);

  useEffect(() => {
    if (!webviewRef?.current || !isOpen) return;
    const wv = webviewRef.current;

    const handleFound = (e: any) => {
      if (e.result) {
        setMatchInfo({
          activeMatchOrdinal: e.result.activeMatchOrdinal,
          matches: e.result.matches,
        });
      }
    };

    wv.addEventListener('found-in-page', handleFound);
    return () => {
      try { wv.removeEventListener('found-in-page', handleFound); } catch (e) {}
    };
  }, [webviewRef?.current, isOpen]);

  const doFind = (text: string, forward = true) => {
    if (!webviewRef?.current || !text) {
      setMatchInfo(null);
      if (webviewRef?.current) {
        try { webviewRef.current.stopFindInPage('clearSelection'); } catch (e) {}
      }
      return;
    }
    try {
      webviewRef.current.findInPage(text, {
        forward,
        matchCase: caseSensitive,
      });
    } catch (e) {}
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
