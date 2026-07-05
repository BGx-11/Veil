import { useEffect } from 'react';
import { useBrowserStore, HISTORY, NEWTAB } from './store';
import { safeInvoke } from './ipcLogger';

export function useKeyboardShortcuts(
  urlInputRef: React.RefObject<HTMLInputElement | null>,
  nav: (tabId: string, url: string) => void,
  goBack: () => void,
  goFwd: () => void,
  reload: () => void,
  wvRefs?: React.MutableRefObject<Record<string, HTMLIFrameElement>>
) {
  const {
    tabs,
    activeId,
    addTab,
    closeTab,
    reopenClosedTab,
    setFindBarOpen,
    sidebarOpen,
    setSidebarOpen,
    splitTabId,
    setSplitTabId,
    settings,
    updateSettings,
    addToast,
    zoomIn,
    zoomOut,
    resetZoom,
    setTabSearchOpen,
    fullscreen,
    setFullscreen
  } = useBrowserStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const active = tabs.find(t => t.id === activeId);
      
      // Ctrl+T or Cmd+T — New tab
      if ((e.ctrlKey || e.metaKey) && e.key === 't' && !e.shiftKey) {
        e.preventDefault();
        addTab();
      }
      
      // Ctrl+W or Cmd+W — Close tab
      if ((e.ctrlKey || e.metaKey) && e.key === 'w') {
        e.preventDefault();
        if (activeId && tabs.length > 1) {
          const tab = tabs.find(t => t.id === activeId);
          if (tab?.pinned) return;
          closeTab(activeId);
        }
      }
      
      // Ctrl+R or Cmd+R or F5 — Reload
      if (((e.ctrlKey || e.metaKey) && e.key === 'r') || e.key === 'F5') {
        e.preventDefault();
        reload();
      }
      
      // Ctrl+F — Find in page
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        setFindBarOpen(true);
      }
      
      // Escape
      if (e.key === 'Escape') {
        setFindBarOpen(false);
        setTabSearchOpen(false);
        if (splitTabId) setSplitTabId(null);
        if (fullscreen) {
          setFullscreen(false);
          safeInvoke('plugin:window|set_fullscreen', { value: false });
        }
      }
      
      // Ctrl+H — History
      if ((e.ctrlKey || e.metaKey) && e.key === 'h') {
        e.preventDefault();
        if (active) nav(active.id, HISTORY);
      }
      
      // Ctrl+L or F6 — Focus URL bar
      if (((e.ctrlKey || e.metaKey) && e.key === 'l') || e.key === 'F6') {
        e.preventDefault();
        urlInputRef.current?.focus();
        urlInputRef.current?.select();
      }
      
      // Ctrl+Shift+T — Reopen closed tab
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 't' || e.key === 'T')) {
        e.preventDefault();
        reopenClosedTab();
      }
      
      // Ctrl+Tab — Next tab
      if (e.ctrlKey && e.key === 'Tab' && !e.shiftKey) {
        e.preventDefault();
        const idx = tabs.findIndex(t => t.id === activeId);
        if (idx !== -1) {
          const nextIdx = (idx + 1) % tabs.length;
          useBrowserStore.getState().setActiveId(tabs[nextIdx].id);
        }
      }
      
      // Ctrl+Shift+Tab — Previous tab
      if (e.ctrlKey && e.shiftKey && e.key === 'Tab') {
        e.preventDefault();
        const idx = tabs.findIndex(t => t.id === activeId);
        if (idx !== -1) {
          const prevIdx = (idx - 1 + tabs.length) % tabs.length;
          useBrowserStore.getState().setActiveId(tabs[prevIdx].id);
        }
      }
      
      // Ctrl+1-9 — Switch tab by index
      if ((e.ctrlKey || e.metaKey) && e.key >= '1' && e.key <= '9') {
        e.preventDefault();
        const idx = parseInt(e.key) - 1;
        if (e.key === '9') {
          useBrowserStore.getState().setActiveId(tabs[tabs.length - 1].id);
        } else if (idx < tabs.length) {
          useBrowserStore.getState().setActiveId(tabs[idx].id);
        }
      }
      
      // Alt+Left — Back
      if (e.altKey && e.key === 'ArrowLeft') {
        e.preventDefault();
        goBack();
      }
      
      // Alt+Right — Forward
      if (e.altKey && e.key === 'ArrowRight') {
        e.preventDefault();
        goFwd();
      }
      
      // Ctrl+D — Bookmark
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        if (active && !active.url.startsWith('veil://') && !active.url.startsWith('search://')) {
          const exists = settings.bookmarks.find(b => b.url === active.url);
          if (exists) {
            updateSettings({ bookmarks: settings.bookmarks.filter(b => b.url !== active.url) });
            addToast('Bookmark removed', 'info');
          } else {
            updateSettings({ bookmarks: [...settings.bookmarks, { url: active.url, title: active.title }] });
            addToast('Bookmark added', 'success');
          }
        }
      }
      
      // Ctrl+Shift+B — Toggle sidebar
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'b' || e.key === 'B')) {
        e.preventDefault();
        setSidebarOpen(!sidebarOpen);
      }

      // ── Zoom Controls ──
      
      // Ctrl+= or Ctrl++ — Zoom In
      if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        zoomIn();
      }
      
      // Ctrl+- — Zoom Out
      if ((e.ctrlKey || e.metaKey) && e.key === '-') {
        e.preventDefault();
        zoomOut();
      }
      
      // Ctrl+0 — Reset Zoom
      if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        e.preventDefault();
        resetZoom();
      }

      // ── Tab Search ──
      
      // Ctrl+Shift+A — Tab Search
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        setTabSearchOpen(true);
      }

      // ── Screenshot ──
      
      // Ctrl+Shift+S — Screenshot
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        if (wvRefs) {
          import('@/app/ScreenshotTool').then(mod => {
            mod.captureScreenshot(addToast, wvRefs);
          });
        }
      }

      // ── Print ──
      
      // Ctrl+P — Print
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        try {
          const iframe = wvRefs?.current[activeId];
          if (iframe?.contentWindow) {
            iframe.contentWindow.print();
          } else {
            window.print();
          }
        } catch {
          window.print();
        }
      }
      
      // F11 — Toggle fullscreen
      if (e.key === 'F11') {
        e.preventDefault();
        const newFs = !fullscreen;
        setFullscreen(newFs);
        safeInvoke('plugin:window|set_fullscreen', { value: newFs });
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    activeId, tabs, addTab, closeTab, reopenClosedTab, 
    setFindBarOpen, splitTabId, setSplitTabId, nav, 
    goBack, goFwd, reload, urlInputRef, settings, 
    updateSettings, addToast, sidebarOpen, setSidebarOpen,
    zoomIn, zoomOut, resetZoom, setTabSearchOpen, fullscreen, setFullscreen, wvRefs
  ]);
}
