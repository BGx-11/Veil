'use client';

import React, { useState } from 'react';
import { Shield, Lock, Unlock, Clock, Globe, X, Star, History, Download, Settings as SettingsIcon, Search } from 'lucide-react';
import ClockWidget from './browser/components/ClockWidget';
import { parseNavigationInput } from '@/lib/urlParser';

interface NewTabProps {
  onNavigate: (url: string) => void;
  settings: any;
  onToggleSetting: (key: string, val?: any) => Promise<void>;
  recentHistory: { url: string; title: string; timestamp: number }[];
}

function ShortcutCard({ bookmark, onNavigate, onRemove }: { bookmark: any; onNavigate: (url: string) => void; onRemove: () => void }) {
  let domain = '';
  try { domain = new URL(bookmark.url).hostname; } catch { domain = bookmark.url; }
  const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;

  return (
    <div
      className="group relative flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer bg-[var(--bg-base)] border border-[var(--border-color)] hover:bg-[var(--bg-element-hover)] transition-colors"
      onClick={() => onNavigate(bookmark.url)}
    >
      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-[var(--surface-icon-bg)]">
        <img src={faviconUrl} className="w-4 h-4" alt="" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate text-[var(--text-primary)]">
          {bookmark.title || domain}
        </div>
        <div className="text-xs truncate text-[var(--text-tertiary)]">
          {domain}
        </div>
      </div>
      <button
        className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-md opacity-0 group-hover:opacity-100 text-[var(--text-tertiary)] hover:bg-[var(--surface-icon-hover)] hover:text-[var(--text-primary)] transition-all"
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
      >
        <X size={12} />
      </button>
    </div>
  );
}

function HistoryItem({ entry, onNavigate }: { entry: any; onNavigate: (url: string) => void }) {
  let domain = '';
  try { domain = new URL(entry.url).hostname; } catch { domain = entry.url; }
  const time = new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div
      className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors text-[var(--text-secondary)] hover:bg-[var(--bg-element-hover)] hover:text-[var(--text-primary)]"
      onClick={() => onNavigate(entry.url)}
    >
      <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 bg-[var(--surface-icon-bg)]">
        <Globe size={12} className="opacity-70" />
      </div>
      <span className="text-sm truncate flex-1 font-medium">{entry.title || domain}</span>
      <span className="text-xs flex-shrink-0 text-[var(--text-tertiary)]">{time}</span>
    </div>
  );
}

// Quick action orbs for common browser actions
function QuickAction({ icon: Icon, label, onClick }: { icon: any; label: string; onClick: () => void }) {
  return (
    <button
      className="flex flex-col items-center gap-2 group"
      onClick={onClick}
    >
      <div className="w-12 h-12 rounded-full flex items-center justify-center bg-[var(--bg-base)] border border-[var(--border-color)] text-[var(--text-secondary)] group-hover:bg-[var(--bg-element-hover)] group-hover:text-[var(--text-primary)] transition-colors">
        <Icon size={18} />
      </div>
      <span className="text-xs font-medium text-[var(--text-secondary)]">
        {label}
      </span>
    </button>
  );
}

export default function NewTab({ onNavigate, settings, onToggleSetting, recentHistory }: NewTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    const url = parseNavigationInput(searchQuery);
    onNavigate(url);
  };

  const removeBookmark = (url: string) => {
    onToggleSetting('bookmarks', settings.bookmarks.filter((b: any) => b.url !== url));
  };

  return (
    <div className="w-full h-full overflow-y-auto bg-[var(--bg-element)] text-[var(--text-primary)] relative">
      <div className="flex flex-col items-center justify-center min-h-full px-6 py-12 mx-auto max-w-3xl">
        
        {/* Hero: Clock */}
        <div className="mb-8">
          <ClockWidget />
        </div>

        {/* Search Bar */}
        <form
          className={`w-full max-w-xl mb-10 flex items-center gap-3 px-5 py-3.5 rounded-2xl border transition-all
            ${isFocused 
              ? 'bg-[var(--bg-element)] border-[var(--accent-primary)] ring-4 ring-[var(--accent-primary)]/10' 
              : 'bg-[var(--bg-base)] border-[var(--border-color)] hover:bg-[var(--bg-element-hover)]'}`}
          onSubmit={handleSearch}
        >
          <Search size={18} className={isFocused ? 'text-[var(--accent-primary)]' : 'text-[var(--text-tertiary)]'} />
          <input
            type="text"
            placeholder="Search the web or enter a URL"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className="flex-1 bg-transparent border-none outline-none text-base text-[var(--text-primary)] placeholder-[var(--text-tertiary)] font-medium"
          />
          <button
            type="button"
            onClick={() => onToggleSetting('normalMode')}
            className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors
              ${settings.normalMode 
                ? 'text-[var(--text-tertiary)] hover:bg-[var(--surface-icon-hover)] hover:text-[var(--text-primary)]' 
                : 'text-[var(--accent-primary)] bg-[var(--accent-primary)]/10 hover:bg-[var(--accent-primary)]/20'}`}
            title={settings.normalMode ? 'Standard Browsing' : 'Privacy Mode Active'}
          >
            {settings.normalMode ? <Unlock size={16} /> : <Lock size={16} />}
          </button>
        </form>

        {/* Quick Actions */}
        <div className="flex items-center gap-8 mb-12">
          <QuickAction icon={History} label="History" onClick={() => onNavigate('browser://history')} />
          <QuickAction icon={Download} label="Downloads" onClick={() => onNavigate('browser://downloads')} />
          <QuickAction icon={SettingsIcon} label="Settings" onClick={() => {}} />
          <QuickAction icon={Shield} label="Privacy" onClick={() => onToggleSetting('normalMode')} />
        </div>

        {/* Content Grid */}
        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Bookmarks */}
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold text-[var(--text-secondary)] px-1">Bookmarks</h3>
            {settings.bookmarks?.length > 0 ? (
              <div className="grid grid-cols-1 gap-2">
                {settings.bookmarks.map((bm: any, i: number) => (
                  <ShortcutCard key={bm.url + i} bookmark={bm} onNavigate={onNavigate} onRemove={() => removeBookmark(bm.url)} />
                ))}
              </div>
            ) : (
              <div className="flex-1 rounded-xl flex flex-col items-center justify-center p-8 text-center border border-dashed border-[var(--border-color)] bg-[var(--bg-base)]">
                <Star size={24} className="text-[var(--text-tertiary)] mb-3 opacity-50" />
                <span className="text-sm font-medium text-[var(--text-tertiary)]">No bookmarks yet</span>
              </div>
            )}
          </div>

          {/* Recent History */}
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold text-[var(--text-secondary)] px-1">Recent Activity</h3>
            {recentHistory.length > 0 ? (
              <div className="flex flex-col gap-1 p-2 rounded-xl bg-[var(--bg-base)] border border-[var(--border-color)]">
                {recentHistory.map((entry, i) => (
                  <HistoryItem key={entry.timestamp + '-' + i} entry={entry} onNavigate={onNavigate} />
                ))}
              </div>
            ) : (
              <div className="flex-1 rounded-xl flex flex-col items-center justify-center p-8 text-center border border-dashed border-[var(--border-color)] bg-[var(--bg-base)]">
                <Clock size={24} className="text-[var(--text-tertiary)] mb-3 opacity-50" />
                <span className="text-sm font-medium text-[var(--text-tertiary)]">No recent activity</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
