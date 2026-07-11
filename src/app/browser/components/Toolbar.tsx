import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PanelLeft, ArrowLeft, ArrowRight, RotateCw, Home, Lock, Unlock, Star, BookOpen, Columns2, Bot, Download, Search, Mic, ZoomIn, ZoomOut, Camera, Layers, Shield, Clock, Languages, Ghost } from 'lucide-react';
import { useBrowserStore, isInternal, unwrapProxyUrl, NEWTAB } from '@/lib/store';
import { parseNavigationInput } from '@/lib/urlParser';
import { invoke } from '@tauri-apps/api/core';

function ToolbarButton({ onClick, disabled, title, active, danger, children }: {
  onClick?: () => void; disabled?: boolean; title?: string; active?: boolean; danger?: boolean; children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`h-9 w-9 flex items-center justify-center rounded-full transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed
        ${active ? 'bg-[var(--accent-primary)] text-white shadow-md' : 'bg-transparent hover:bg-[var(--surface-icon-hover)] text-[var(--text-secondary)]'}
        ${danger && !disabled ? 'text-red-500' : ''}`}
    >
      {children}
    </button>
  );
}

// ─── Search Suggestions Hook ─────────────────────────────────────

function useSearchSuggestions(inputValue: string, isFocused: boolean) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Clear previous debounce
    if (debounceRef.current) clearTimeout(debounceRef.current);

    // Don't fetch if not focused, too short, or looks like a URL
    const trimmed = inputValue.trim();
    if (!isFocused || trimmed.length < 2 || trimmed.includes('://') || trimmed.startsWith('veil://') || trimmed.startsWith('search://')) {
      setSuggestions([]);
      return;
    }

    // Check if it looks like a URL (has a TLD-like pattern without spaces)
    if (!trimmed.includes(' ') && /^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}/.test(trimmed)) {
      setSuggestions([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      // Abort any in-flight request
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      try {
        // Use the local proxy to bypass CORS
        const res = await fetch(
          `http://127.0.0.1:8181/ac?q=${encodeURIComponent(trimmed)}`,
          { signal: controller.signal }
        );
        if (!res.ok) throw new Error('Suggestion fetch failed');
        const data = await res.json();
        // The response is either [query, [suggestions]] or [{phrase: ...}]
        let items: string[] = [];
        if (Array.isArray(data)) {
          if (data.length > 1 && Array.isArray(data[1])) {
            // OpenSearch format: [query, [suggestions]]
            items = data[1];
          } else {
            // DDG format: [{phrase: "..."}, ...]
            items = data.filter((d: any) => d?.phrase).map((d: any) => d.phrase);
          }
        }
        setSuggestions(items.slice(0, 8));
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          setSuggestions([]);
        }
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [inputValue, isFocused]);

  const clearSuggestions = useCallback(() => setSuggestions([]), []);

  return { suggestions, loading, clearSuggestions };
}

// ─── Toolbar Component ───────────────────────────────────────────

export default function Toolbar({
  urlInputRef, urlInput, setUrlInput, nav, goBack, goFwd, reload, setIsSettingsOpen
}: any) {
  const {
    tabs, activeId, sidebarOpen, setSidebarOpen,
    settings, updateSettings, splitTabId, setSplitTabId,
    slmOpen, setSlmOpen, addToast
  } = useBrowserStore();

  const [isFocused, setIsFocused] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const active = tabs.find((t: any) => t.id === activeId);

  const { suggestions, clearSuggestions } = useSearchSuggestions(urlInput, isFocused);

  useEffect(() => {
    if (active) {
      if (active.url === NEWTAB) setUrlInput('');
      else if (active.url.startsWith('search://')) setUrlInput(decodeURIComponent(active.url.replace('search://', '')));
      else setUrlInput(active.url);
    }
  }, [activeId, active?.url, setUrlInput]);

  // Reset suggestion selection when suggestions change
  useEffect(() => {
    setSelectedSuggestionIndex(-1);
  }, [suggestions]);

  const navigateToInput = (value: string) => {
    if (active) {
      const u = parseNavigationInput(value);
      if (u) nav(active.id, u);
    }
    urlInputRef.current?.blur();
    clearSuggestions();
  };

  // Compute all unified search items for dropdown and keyboard navigation
  const allItems = React.useMemo(() => {
    const lowerInput = urlInput.trim().toLowerCase();
    if (!isFocused || lowerInput.length === 0) return [];
    
    const matchingTabs = tabs.filter(t => 
      t.id !== activeId && 
      !isInternal(t.url) &&
      ((t.title || '').toLowerCase().includes(lowerInput) || t.url.toLowerCase().includes(lowerInput))
    ).slice(0, 3);

    const matchingBookmarks = settings.bookmarks.filter((b: any) => 
      (b.title || '').toLowerCase().includes(lowerInput) || b.url.toLowerCase().includes(lowerInput)
    ).slice(0, 3);



    const items: Array<{ type: string, title: string, url: string, raw?: string }> = [];
    matchingTabs.forEach(t => items.push({ type: 'tab', title: t.title || 'Tab', url: t.url }));
    matchingBookmarks.forEach(b => items.push({ type: 'bookmark', title: b.title || 'Bookmark', url: b.url }));

    suggestions.forEach(s => items.push({ type: 'suggestion', title: s, url: s, raw: s }));
    
    return items;
  }, [isFocused, urlInput, suggestions, tabs, activeId, settings.bookmarks]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedSuggestionIndex >= 0 && selectedSuggestionIndex < allItems.length) {
      const item = allItems[selectedSuggestionIndex];
      if (item.type === 'tab') {
        const targetTab = tabs.find(t => t.url === item.url);
        if (targetTab) useBrowserStore.getState().setActiveId(targetTab.id);
        urlInputRef.current?.blur();
      } else {
        navigateToInput(item.raw || item.url);
      }
    } else {
      navigateToInput(urlInput);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit(e as any);
      return;
    }

    if (allItems.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedSuggestionIndex(prev =>
        prev < allItems.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedSuggestionIndex(prev =>
        prev > 0 ? prev - 1 : allItems.length - 1
      );
    } else if (e.key === 'Escape') {
      clearSuggestions();
      setSelectedSuggestionIndex(-1);
    }
  };

  const handleBlur = () => {
    // Small delay so click on suggestion registers
    setTimeout(() => {
      setIsFocused(false);
      clearSuggestions();
    }, 150);
  };

  const toggleBookmark = () => {
    if (!active) return;
    const realUrl = unwrapProxyUrl(active.url);
    if (!realUrl) return;
    const exists = settings.bookmarks.find((b: any) => b.url === realUrl);
    if (exists) {
      updateSettings({ bookmarks: settings.bookmarks.filter((b: any) => b.url !== realUrl) });
      addToast('Bookmark removed', 'info');
    } else {
      updateSettings({ bookmarks: [...settings.bookmarks, { url: realUrl, title: active.title }] });
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
      <div className="flex items-center gap-2">
        <ToolbarButton onClick={goBack} disabled={!canGoBack} title="Back">
          <ArrowLeft size={16} />
        </ToolbarButton>
        <ToolbarButton onClick={goFwd} disabled={!canGoFwd} title="Forward">
          <ArrowRight size={16} />
        </ToolbarButton>
        <ToolbarButton onClick={reload} title="Reload">
          <RotateCw size={14} className={active?.loading ? 'animate-spin' : ''} />
        </ToolbarButton>
        <ToolbarButton onClick={() => nav(active?.id || '', NEWTAB)} title="Home">
          <Home size={14} />
        </ToolbarButton>
      </div>

      {/* Center Search Bar */}
      <div className="flex-1 relative min-w-[150px] mx-1 sm:mx-2">
        <form
          className={`flex items-center h-[38px] px-2 sm:px-3 gap-2 sm:gap-3 rounded-full transition-all duration-300 border ${isFocused ? 'bg-[var(--bg-element)]' : 'glass-input'}`}
          style={{ borderColor: isFocused ? 'var(--accent-primary)' : 'transparent', boxShadow: isFocused ? '0 0 0 2px var(--accent-glow)' : 'none' }}
          onSubmit={handleSubmit}
          onFocus={() => setIsFocused(true)}
          onBlur={handleBlur}
        >
          <button
            type="button"
            onClick={() => {
              if (settings.torMode) {
                // If in Tor Mode, clicking it could toggle normalMode or we can just leave it as an indicator
                addToast('Cannot toggle privacy modes while Tor is active', 'warning');
                return;
              }
              const newVal = !settings.normalMode;
              updateSettings({ normalMode: newVal });
              addToast(newVal ? 'Standard Mode Enabled' : 'Privacy Mode Active');
            }}
            className={`flex items-center justify-center gap-1.5 transition-all rounded-full h-7 px-2.5 flex-shrink-0 border hidden sm:flex
              ${settings.torMode 
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/20' : 
                !settings.normalMode 
                ? 'bg-fuchsia-500/10 border-fuchsia-500/20 text-fuchsia-500 hover:bg-fuchsia-500/20' : 
                'bg-transparent border-transparent text-[var(--text-tertiary)] hover:bg-[var(--surface-icon-hover)]'}`}
            title={settings.torMode ? "Tor Network Active" : (!settings.normalMode ? "Privacy Mode" : "Standard Browsing")}
          >
            {settings.torMode ? (
              <>
                <Shield size={12} className="shrink-0" />
                <span className="text-[11px] font-bold tracking-wide uppercase">Tor</span>
              </>
            ) : !settings.normalMode ? (
              <>
                <Lock size={12} className="shrink-0" />
                <span className="text-[11px] font-bold tracking-wide uppercase">Private</span>
              </>
            ) : (
              <Unlock size={12} className="shrink-0" />
            )}
          </button>

          <input
            ref={urlInputRef}
            className="flex-1 bg-transparent border-none outline-none text-[13px] sm:text-[14px] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] font-medium min-w-0"
            type="text"
            placeholder="Search or enter address"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onFocus={(e) => e.target.select()}
            onKeyDown={handleKeyDown}
            autoComplete="off"
          />

          <div className="flex items-center gap-1 sm:gap-2">
            <ToolbarButton onClick={toggleReaderMode} disabled={!active || isInternal(active?.url || '')} title="Reader Mode" active={active?.readerMode}>
              <BookOpen size={14} />
            </ToolbarButton>
            <ToolbarButton 
              onClick={() => {
                if (active && !isInternal(active.url)) {
                  useBrowserStore.getState().updateTab(active.id, { 
                    url: `https://translate.google.com/translate?sl=auto&tl=en&u=${encodeURIComponent(active.url)}` 
                  });
                }
              }} 
              disabled={!active || isInternal(active?.url || '')} 
              title="Translate Page"
            >
              <Languages size={14} />
            </ToolbarButton>
            <ToolbarButton onClick={toggleBookmark} title="Bookmark" active={isBookmarked}>
              <Star size={14} className={isBookmarked ? 'fill-current' : ''} />
            </ToolbarButton>
          </div>
        </form>

        {/* Search Suggestions Dropdown */}
        {isFocused && urlInput.trim().length > 0 && (() => {
          const lowerInput = urlInput.toLowerCase();
          
          const matchingTabs = tabs.filter(t => 
            t.id !== activeId && 
            !isInternal(t.url) &&
            ((t.title || '').toLowerCase().includes(lowerInput) || t.url.toLowerCase().includes(lowerInput))
          ).slice(0, 3);

          const matchingBookmarks = settings.bookmarks.filter((b: any) => 
            (b.title || '').toLowerCase().includes(lowerInput) || b.url.toLowerCase().includes(lowerInput)
          ).slice(0, 3);

          // Combine all items into a single flat array for keyboard navigation
          const allItems: Array<{ type: string, title: string, url: string, raw?: string }> = [];
          
          matchingTabs.forEach(t => allItems.push({ type: 'tab', title: t.title || 'Tab', url: t.url }));
          matchingBookmarks.forEach(b => allItems.push({ type: 'bookmark', title: b.title || 'Bookmark', url: b.url }));

          suggestions.forEach(s => allItems.push({ type: 'suggestion', title: s, url: s, raw: s }));

          if (allItems.length === 0) return null;

          return (
            <div
              ref={suggestionsRef}
              className="absolute left-0 right-0 top-[calc(100%+8px)] rounded-2xl overflow-hidden z-[100] shadow-2xl flex flex-col max-h-[70vh] overflow-y-auto custom-scrollbar"
              style={{
                background: 'var(--glass-bg, rgba(255,255,255,0.95))',
                border: '1px solid var(--glass-border)',
                backdropFilter: 'blur(30px)',
                WebkitBackdropFilter: 'blur(30px)',
              }}
            >
              {allItems.map((item, index) => {
                const isSelected = index === selectedSuggestionIndex;
                let Icon = Search;
                if (item.type === 'tab') Icon = Layers;
                if (item.type === 'bookmark') Icon = Star;
                if (item.type === 'history') Icon = Clock;
                
                return (
                  <button
                    key={`${item.type}-${index}`}
                    type="button"
                    className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors duration-100"
                    style={{
                      color: 'var(--text-primary)',
                      background: isSelected ? 'var(--glass-bg-hover, rgba(0,0,0,0.05))' : 'transparent',
                    }}
                    onMouseEnter={(e) => {
                      setSelectedSuggestionIndex(index);
                      e.currentTarget.style.background = 'var(--glass-bg-hover, rgba(0,0,0,0.05))';
                    }}
                    onMouseLeave={(e) => {
                      if (index !== selectedSuggestionIndex) {
                        e.currentTarget.style.background = 'transparent';
                      }
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      if (item.type === 'tab') {
                        const targetTab = tabs.find(t => t.url === item.url);
                        if (targetTab) useBrowserStore.getState().setActiveId(targetTab.id);
                        urlInputRef.current?.blur();
                      } else {
                        navigateToInput(item.raw || item.url);
                      }
                    }}
                  >
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'var(--glass-bg-active)' }}>
                      <Icon size={14} style={{ color: 'var(--text-tertiary)' }} />
                    </div>
                    <div className="flex-1 flex flex-col overflow-hidden min-w-0">
                      <span className="text-sm font-semibold truncate text-[var(--text-primary)]">{item.title}</span>
                      {item.type !== 'suggestion' && (
                        <span className="text-xs truncate opacity-60 text-[var(--text-secondary)]">{item.url}</span>
                      )}
                    </div>
                    {item.type === 'tab' && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: 'var(--accent-primary)', color: 'white', opacity: 0.9 }}>Switch to Tab</span>
                    )}
                  </button>
                );
              })}
            </div>
          );
        })()}
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-1.5">
        {/* Tor Status Indicator */}
        {settings.torMode && (
          <div 
            className={`hidden sm:flex text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full items-center gap-1.5 ${
              settings.torStatus === 'connected' ? 'bg-green-500/10 text-green-600' : 
              settings.torStatus === 'connecting' ? 'bg-yellow-500/10 text-yellow-600 animate-pulse' : 
              'bg-red-500/10 text-red-600'
            }`}
            title={`Tor Network: ${settings.torStatus || 'disconnected'}`}
          >
            <Shield size={12} />
            {settings.torStatus === 'connecting' ? 'Connecting' : (settings.torStatus === 'connected' ? 'Connected' : 'Disconnected')}
          </div>
        )}

        {/* Zoom indicator (compact, only show when not 100%) */}
        {active && (active.zoomLevel || 100) !== 100 && (
          <div className="flex items-center gap-0.5 px-1">
            <button
              onClick={() => useBrowserStore.getState().zoomOut()}
              className="w-7 h-7 flex items-center justify-center rounded-full glass-btn text-[var(--text-secondary)] transition-all"
              title="Zoom Out (Ctrl+-)"
            >
              <ZoomOut size={12} />
            </button>
            <button
              onClick={() => useBrowserStore.getState().resetZoom()}
              className="text-[11px] font-bold px-1.5 py-0.5 rounded-md transition-colors hover:bg-[var(--glass-bg-hover)] min-w-[36px] text-center"
              style={{ color: 'var(--accent-primary)' }}
              title="Reset Zoom (Ctrl+0)"
            >
              {active.zoomLevel || 100}%
            </button>
            <button
              onClick={() => useBrowserStore.getState().zoomIn()}
              className="w-7 h-7 flex items-center justify-center rounded-full glass-btn text-[var(--text-secondary)] transition-all"
              title="Zoom In (Ctrl+=)"
            >
              <ZoomIn size={12} />
            </button>
          </div>
        )}

        {/* Incognito */}
        <ToolbarButton
          onClick={() => {
            invoke('open_incognito_window').catch(console.error);
          }}
          title="New Incognito Window"
        >
          <Ghost size={14} />
        </ToolbarButton>

        {/* Screenshot */}
        <ToolbarButton
          onClick={() => {
            import('@/app/ScreenshotTool').then(mod => {
              mod.captureScreenshot(addToast);
            });
          }}
          title="Screenshot (Ctrl+Shift+S)"
        >
          <Camera size={14} />
        </ToolbarButton>

        {/* Tab Search */}
        <ToolbarButton
          onClick={() => useBrowserStore.getState().setTabSearchOpen(true)}
          title="Search Tabs (Ctrl+Shift+A)"
        >
          <Layers size={14} />
        </ToolbarButton>

        <div className="w-px h-5 mx-0.5 bg-[var(--text-tertiary)] opacity-30" />

        <ToolbarButton onClick={toggleSplitView} title={splitTabId ? 'Exit Split View' : 'Split View'} active={!!splitTabId}>
          <Columns2 size={14} />
        </ToolbarButton>
        <ToolbarButton onClick={() => setSlmOpen(!slmOpen)} title="Veil AI" active={slmOpen}>
          <Bot size={16} />
        </ToolbarButton>
        <div className="w-px h-5 mx-0.5 bg-[var(--text-tertiary)] opacity-30" />
        <ToolbarButton onClick={() => nav(active?.id || '', 'veil://downloads')} title="Downloads" active={active?.url === 'veil://downloads'}>
          <Download size={16} />
        </ToolbarButton>
      </div>
    </div>
  );
}
