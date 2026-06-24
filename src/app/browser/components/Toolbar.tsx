import React, { useState, useEffect } from 'react';
import { PanelLeft, ArrowLeft, ArrowRight, RotateCw, Home, Lock, Unlock, Star, BookOpen, Columns2, Bot, Settings as SettingsIcon, Search, Mic } from 'lucide-react';
import { useBrowserStore, isInternal, NEWTAB } from '@/lib/store';
import { parseNavigationInput } from '@/lib/urlParser';

function ToolbarButton({ onClick, disabled, title, active, danger, children }: {
  onClick?: () => void; disabled?: boolean; title?: string; active?: boolean; danger?: boolean; children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`h-9 w-9 flex items-center justify-center rounded-full transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed
        ${active ? 'bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] shadow-sm' : 'text-[var(--text-secondary)]'}
        ${!disabled && !active ? 'hover:bg-[var(--surface-icon-hover)] hover:text-[var(--text-primary)] hover:scale-105 active:scale-95' : ''}
        ${danger && !disabled ? 'hover:bg-red-500/10 hover:text-red-500' : ''}`}
    >
      {children}
    </button>
  );
}

export default function Toolbar({
  urlInputRef, urlInput, setUrlInput, nav, goBack, goFwd, reload, setIsSettingsOpen
}: any) {
  const {
    tabs, activeId, sidebarOpen, setSidebarOpen,
    settings, updateSettings, splitTabId, setSplitTabId,
    slmOpen, setSlmOpen, addToast
  } = useBrowserStore();

  const [isFocused, setIsFocused] = useState(false);
  const active = tabs.find((t: any) => t.id === activeId);

  useEffect(() => {
    if (active) {
      if (active.url === NEWTAB) setUrlInput('');
      else if (active.url.startsWith('search://')) setUrlInput(decodeURIComponent(active.url.replace('search://', '')));
      else if (!active.url.startsWith('browser://')) setUrlInput(active.url);
    }
  }, [activeId, active?.url, setUrlInput]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (active) {
      const u = parseNavigationInput(urlInput);
      nav(active.id, u);
    }
    urlInputRef.current?.blur();
  };

  const toggleBookmark = () => {
    if (!active) return;
    const exists = settings.bookmarks.find((b: any) => b.url === active.url);
    if (exists) {
      updateSettings({ bookmarks: settings.bookmarks.filter((b: any) => b.url !== active.url) });
      addToast('Bookmark removed', 'info');
    } else {
      updateSettings({ bookmarks: [...settings.bookmarks, { url: active.url, title: active.title }] });
      addToast('Bookmark added', 'success');
    }
  };

  const toggleReaderMode = () => {
    if (!active || isInternal(active.url)) return;
    useBrowserStore.getState().updateTab(active.id, { readerMode: !active.readerMode });
  };

  const toggleSplitView = () => {
    if (splitTabId) {
      setSplitTabId(null);
    } else {
      const other = tabs.find((t: any) => t.id !== activeId);
      if (other) {
        setSplitTabId(other.id);
        addToast('Split view enabled', 'info');
      } else {
        const newId = Date.now().toString();
        useBrowserStore.getState().setTabs((p: any) => [...p, { id: newId, title: 'New Tab', url: NEWTAB, history: [NEWTAB], historyIndex: 0, loading: false }]);
        setSplitTabId(newId);
        addToast('Split view enabled', 'info');
      }
    }
  };

  const isBookmarked = active && settings.bookmarks.some((b: any) => b.url === active.url);
  const canGoBack = active && active.historyIndex > 0;
  const canGoFwd = active && active.historyIndex < active.history.length - 1;

  return (
    <div className="flex items-center px-4 pb-3 pt-2 gap-3 select-none bg-transparent">
      
      {/* Left Navigation Controls */}
      <div className="flex items-center gap-1">
        <ToolbarButton onClick={goBack} disabled={!canGoBack} title="Back">
          <ArrowLeft size={18} />
        </ToolbarButton>
        <ToolbarButton onClick={goFwd} disabled={!canGoFwd} title="Forward">
          <ArrowRight size={18} />
        </ToolbarButton>
        <ToolbarButton onClick={reload} title="Reload">
          <RotateCw size={16} className={active?.loading ? 'animate-spin' : ''} />
        </ToolbarButton>
      </div>

      {/* Center Search Bar */}
      <form
        className={`flex-1 flex items-center h-11 px-3 gap-3 rounded-full border transition-all duration-300 shadow-sm backdrop-blur-md
          ${isFocused 
            ? 'border-[var(--accent-primary)] ring-4 ring-[var(--accent-primary)]/15 bg-[var(--bg-element)]' 
            : 'border-[var(--border-color)] bg-[var(--glass-bg)] hover:border-[var(--text-tertiary)] hover:shadow-md'
          }`}
        onSubmit={handleSubmit}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
      >
        <button
          type="button"
          onClick={() => {
            const newVal = !settings.normalMode;
            updateSettings({ normalMode: newVal });
            addToast(newVal ? 'Normal Mode Enabled' : 'Privacy Mode Active', 'info');
          }}
          className={`flex items-center justify-center transition-colors rounded-full w-8 h-8 flex-shrink-0
            ${settings.torMode ? 'text-[var(--accent-success)] bg-[var(--accent-success)]/10 hover:bg-[var(--accent-success)]/20' : 
              settings.normalMode ? 'text-[var(--text-tertiary)] hover:bg-[var(--surface-icon-hover)]' : 
              'text-[var(--accent-primary)] bg-[var(--accent-primary)]/10 hover:bg-[var(--accent-primary)]/20'}`}
          title={settings.normalMode ? "Standard Browsing" : "Privacy Mode"}
        >
          {settings.normalMode ? <Unlock size={14} /> : <Lock size={14} />}
        </button>

        <input
          ref={urlInputRef}
          className="flex-1 bg-transparent border-none outline-none text-[14px] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] font-medium"
          type="text"
          placeholder="Search or enter address"
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          onFocus={(e) => e.target.select()}
        />

        <div className="flex items-center gap-1">
          <ToolbarButton onClick={toggleReaderMode} disabled={!active || isInternal(active?.url || '')} title="Reader Mode" active={active?.readerMode}>
            <BookOpen size={16} />
          </ToolbarButton>
          <ToolbarButton onClick={toggleBookmark} title="Bookmark" active={isBookmarked}>
            <Star size={16} className={isBookmarked ? 'fill-current' : ''} />
          </ToolbarButton>
        </div>
      </form>

      {/* Right Controls */}
      <div className="flex items-center gap-1">
        <ToolbarButton onClick={toggleSplitView} title={splitTabId ? 'Exit Split View' : 'Split View'} active={!!splitTabId}>
          <Columns2 size={16} />
        </ToolbarButton>
        <ToolbarButton onClick={() => setSlmOpen(!slmOpen)} title="Veil AI" active={slmOpen}>
          <Bot size={18} />
        </ToolbarButton>
        <div className="w-px h-5 mx-1 bg-[var(--border-color)]" />
        <ToolbarButton onClick={() => setIsSettingsOpen(true)} title="Settings">
          <SettingsIcon size={18} />
        </ToolbarButton>
      </div>
    </div>
  );
}
