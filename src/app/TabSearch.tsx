'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Globe, Pin, Volume2, VolumeX, Plus, Settings as SettingsIcon, Shield, Clock, Download, Sidebar, TerminalSquare } from 'lucide-react';
import { useBrowserStore, type Tab, isInternal, getInternalTitle } from '@/lib/store';

type Command = {
  id: string;
  title: string;
  subtitle: string;
  icon: any;
  action: () => void;
};

export default function TabSearch() {
  const { tabs, activeId, setActiveId, tabSearchOpen, setTabSearchOpen, tabGroups, addTab, setIsIncognito, sidebarOpen, setSidebarOpen } = useBrowserStore();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (tabSearchOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [tabSearchOpen]);

  const commands: Command[] = useMemo(() => [
    { id: 'cmd-new', title: 'New Tab', subtitle: 'Open a new blank tab', icon: Plus, action: () => addTab() },
    { id: 'cmd-new-incognito', title: 'New Incognito Tab', subtitle: 'Open a private browsing tab', icon: Shield, action: () => { setIsIncognito(true); addTab(); } },
    { id: 'cmd-settings', title: 'Settings', subtitle: 'Open browser preferences', icon: SettingsIcon, action: () => addTab('veil://settings') },
    { id: 'cmd-history', title: 'History', subtitle: 'View browsing history', icon: Clock, action: () => addTab('veil://history') },
    { id: 'cmd-downloads', title: 'Downloads', subtitle: 'View downloaded files', icon: Download, action: () => addTab('veil://downloads') },
    { id: 'cmd-sidebar', title: 'Toggle Sidebar', subtitle: 'Show or hide the sidebar', icon: Sidebar, action: () => setSidebarOpen(!sidebarOpen) }
  ], [addTab, setIsIncognito, sidebarOpen, setSidebarOpen]);

  const filteredItems = useMemo(() => {
    const q = query.toLowerCase().trim();
    
    // Filter Tabs
    const matchedTabs = tabs.filter(t =>
      t.title.toLowerCase().includes(q) ||
      t.url.toLowerCase().includes(q) ||
      (isInternal(t.url) && getInternalTitle(t.url).toLowerCase().includes(q))
    ).map(t => ({ type: 'tab' as const, item: t }));

    // Filter Commands
    const matchedCommands = commands.filter(c => 
      c.title.toLowerCase().includes(q) || c.subtitle.toLowerCase().includes(q)
    ).map(c => ({ type: 'command' as const, item: c }));

    // Web Search Command (if there's a query)
    const webSearchCommand = q ? [{
      type: 'command' as const,
      item: {
        id: 'cmd-search-web',
        title: `Search for "${query}"`,
        subtitle: 'Search the web',
        icon: Search,
        action: () => addTab(`search://${encodeURIComponent(query)}`)
      }
    }] : [];

    return [...matchedTabs, ...matchedCommands, ...webSearchCommand];
  }, [tabs, commands, query]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredItems.length]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < filteredItems.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : filteredItems.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selected = filteredItems[selectedIndex];
      if (selected) {
        executeItem(selected);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setTabSearchOpen(false);
    }
  };

  const executeItem = (wrapper: typeof filteredItems[0]) => {
    if (wrapper.type === 'tab') {
      setActiveId((wrapper.item as Tab).id);
    } else {
      (wrapper.item as Command).action();
    }
    setTabSearchOpen(false);
  };

  const getDomain = (url: string) => {
    if (isInternal(url)) return getInternalTitle(url);
    try { return new URL(url).hostname; } catch { return url; }
  };

  const getGroupForTab = (tab: Tab) => {
    if (!tab.groupId) return null;
    return tabGroups.find(g => g.id === tab.groupId);
  };

  if (!tabSearchOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[9999] flex items-start justify-center pt-[15vh]"
        style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
        onClick={() => setTabSearchOpen(false)}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="w-full max-w-xl mx-4"
          onClick={e => e.stopPropagation()}
          initial={{ opacity: 0, y: -20, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.97 }}
          transition={{ duration: 0.2 }}
        >
          {/* Search Input */}
          <div
            className="flex items-center gap-3 px-5 py-4 rounded-t-2xl border-b"
            style={{
              background: 'var(--bg-element)',
              borderColor: 'var(--glass-border)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
            }}
          >
            <TerminalSquare size={18} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search tabs, commands, or the web..."
              className="flex-1 bg-transparent border-none outline-none text-base font-medium"
              style={{ color: 'var(--text-primary)' }}
              autoComplete="off"
            />
            <span className="text-xs font-medium px-2 py-1 rounded-md" style={{ background: 'var(--glass-bg-active)', color: 'var(--text-tertiary)' }}>
              {filteredItems.length} item{filteredItems.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Results */}
          <div
            className="max-h-[60vh] overflow-y-auto rounded-b-2xl pb-2"
            style={{
              background: 'var(--bg-element)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
            }}
          >
            {filteredItems.length === 0 ? (
              <div className="p-6 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>
                No matches found for "{query}"
              </div>
            ) : (
              filteredItems.map((wrapper, index) => {
                const isSelected = index === selectedIndex;
                
                if (wrapper.type === 'tab') {
                  const tab = wrapper.item as Tab;
                  const group = getGroupForTab(tab);
                  const isActive = tab.id === activeId;
                  return (
                    <button
                      key={`tab-${tab.id}`}
                      onClick={() => executeItem(wrapper)}
                      className="w-full flex items-center gap-3 px-5 py-3 text-left transition-colors duration-75"
                      style={{
                        background: isSelected ? 'var(--glass-bg-hover)' : 'transparent',
                        borderLeft: isActive ? '3px solid var(--accent-primary)' : '3px solid transparent',
                      }}
                      onMouseEnter={() => setSelectedIndex(index)}
                    >
                      <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: 'var(--glass-bg-active)' }}>
                        {tab.favicon ? (
                          <img src={tab.favicon} className="w-4 h-4 rounded-sm" alt="" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        ) : (
                          <Globe size={14} style={{ color: 'var(--text-tertiary)' }} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                            {tab.title || 'Untitled'}
                          </span>
                          {tab.pinned && <Pin size={10} style={{ color: 'var(--text-tertiary)' }} />}
                          {tab.muted && <VolumeX size={10} style={{ color: 'var(--text-tertiary)' }} />}
                          {tab.mediaPlaying && !tab.muted && <Volume2 size={10} style={{ color: 'var(--accent-primary)' }} />}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs truncate" style={{ color: 'var(--text-tertiary)' }}>{getDomain(tab.url)}</span>
                          {group && (
                            <span
                              className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                              style={{
                                background: `var(--group-${group.color}, rgba(99,102,241,0.1))`,
                                color: `var(--group-${group.color}-text, var(--accent-primary))`,
                              }}
                            >
                              {group.name}
                            </span>
                          )}
                        </div>
                      </div>
                      {isSelected && <span className="text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ background: 'var(--glass-bg-active)', color: 'var(--text-ghost)' }}>↵</span>}
                    </button>
                  );
                } else {
                  const cmd = wrapper.item as Command;
                  const Icon = cmd.icon;
                  return (
                    <button
                      key={`cmd-${cmd.id}`}
                      onClick={() => executeItem(wrapper)}
                      className="w-full flex items-center gap-3 px-5 py-3 text-left transition-colors duration-75"
                      style={{
                        background: isSelected ? 'var(--glass-bg-hover)' : 'transparent',
                        borderLeft: '3px solid transparent',
                      }}
                      onMouseEnter={() => setSelectedIndex(index)}
                    >
                      <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: 'var(--glass-bg-active)' }}>
                        <Icon size={14} style={{ color: 'var(--text-tertiary)' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                            {cmd.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs truncate" style={{ color: 'var(--text-tertiary)' }}>{cmd.subtitle}</span>
                        </div>
                      </div>
                      {isSelected && <span className="text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ background: 'var(--glass-bg-active)', color: 'var(--text-ghost)' }}>↵</span>}
                    </button>
                  );
                }
              })
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
