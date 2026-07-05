'use client';

import React, { useState, useMemo } from 'react';
import { Bookmark, Search, Trash2, Globe, ExternalLink } from 'lucide-react';
import { useBrowserStore } from '@/lib/store';

interface BookmarksProps {
  onNavigate: (url: string) => void;
}

interface BookmarkItem {
  url: string;
  title: string;
}

export default function Bookmarks({ onNavigate }: BookmarksProps) {
  const bookmarks = (useBrowserStore(state => state.settings.bookmarks) || []) as BookmarkItem[];
  const updateSettings = useBrowserStore(state => state.updateSettings);
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return bookmarks;
    const q = searchQuery.toLowerCase();
    return bookmarks.filter((b: BookmarkItem) => 
      b.title.toLowerCase().includes(q) || 
      b.url.toLowerCase().includes(q)
    );
  }, [bookmarks, searchQuery]);

  const removeBookmark = (url: string) => {
    updateSettings({ bookmarks: bookmarks.filter((b: BookmarkItem) => b.url !== url) });
  };

  const getDomain = (url: string) => { 
    try { 
      return new URL(url).hostname; 
    } catch { 
      return url; 
    } 
  };

  return (
    <div className="w-full h-full overflow-y-auto relative" style={{ background: 'transparent' }}>
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent pointer-events-none" />
      
      <div className="max-w-3xl mx-auto px-6 py-10 relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="flex items-center gap-3 text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            <Bookmark size={22} style={{ color: 'var(--accent-primary, #6366f1)' }} />
            Bookmarks
          </h1>
        </div>

        {/* Search */}
        <div className="relative mb-8">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search size={18} style={{ color: 'var(--text-tertiary)' }} />
          </div>
          <input
            type="text"
            placeholder="Search bookmarks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 rounded-xl border outline-none transition-all"
            style={{
              background: 'var(--glass-bg)',
              borderColor: 'var(--glass-border)',
              color: 'var(--text-primary)',
            }}
          />
        </div>

        {/* List */}
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4" style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}>
              <Bookmark size={24} style={{ color: 'var(--text-tertiary)' }} />
            </div>
            <h3 className="text-lg font-medium mb-1" style={{ color: 'var(--text-primary)' }}>No bookmarks found</h3>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {searchQuery ? "Try a different search term" : "Pages you star will appear here"}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((bookmark: BookmarkItem) => (
              <div
                key={bookmark.url}
                className="group flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer hover:shadow-sm"
                style={{
                  background: 'var(--glass-bg)',
                  borderColor: 'var(--glass-border)',
                }}
                onClick={() => onNavigate(bookmark.url)}
              >
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-lg" style={{ background: 'var(--bg-base)', border: '1px solid var(--glass-border)' }}>
                    <Globe size={18} style={{ color: 'var(--text-secondary)' }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                      {bookmark.title || bookmark.url}
                    </div>
                    <div className="text-xs truncate flex items-center gap-2" style={{ color: 'var(--text-tertiary)' }}>
                      {getDomain(bookmark.url)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity pl-4">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(bookmark.url, '_blank');
                    }}
                    className="p-2 rounded-lg hover:bg-black/5 transition-colors"
                    title="Open in new window"
                  >
                    <ExternalLink size={16} style={{ color: 'var(--text-secondary)' }} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeBookmark(bookmark.url);
                    }}
                    className="p-2 rounded-lg transition-colors hover:bg-red-500/10 hover:text-red-500"
                    style={{ color: 'var(--text-secondary)' }}
                    title="Remove bookmark"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
