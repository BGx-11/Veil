'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Toaster } from 'sonner';
import { Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { listen } from '@tauri-apps/api/event';

import { useBrowserStore, NEWTAB, HISTORY, isInternal } from '@/lib/store';
import { useKeyboardShortcuts } from '@/lib/useKeyboardShortcuts';
import { loadRecentHistory } from '@/lib/historyDb';
import { safeInvoke } from '@/lib/ipcLogger';

import Toolbar from './components/Toolbar';
import TabBar from './components/TabBar';
import TabWorkspace from './components/TabWorkspace';
import Sidebar from './components/Sidebar';
import ErrorBoundary from '../ErrorBoundary';
import Settings from '../Settings';
import SLMPanel from '../SLMPanel';
import ZoomIndicator from '../ZoomIndicator';
import TabSearch from '../TabSearch';

export default function BrowserShell() {
  const {
    tabs, activeId, setTabs, setActiveId, setGlobalHistory,
    settings, updateSettings, slmOpen, setSlmOpen, toasts, addToast
  } = useBrowserStore();

  const [mounted, setMounted] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [slmContext, setSlmContext] = useState('');
  const [torError, setTorError] = useState('');

  const urlInputRef = useRef<HTMLInputElement>(null);
  const wvRefs = useRef<Record<string, HTMLIFrameElement>>({});

  const nav = (tabId: string, url: string) => {
    setTabs(prev => prev.map(t => {
      if (t.id !== tabId) return t;
      if (t.url === url) return t;
      const newHistory = t.history.slice(0, t.historyIndex + 1);
      newHistory.push(url);
      
      // Also add to global history
      if (!isInternal(url)) {
        setTimeout(() => {
          useBrowserStore.getState().addHistoryEntry({ url, title: url, timestamp: Date.now() });
        }, 0);
      }
      
      return { ...t, url, title: url, history: newHistory, historyIndex: newHistory.length - 1, error: undefined, redirectChain: [], readerMode: false };
    }));
  };

  const goBack = () => {
    const active = tabs.find(t => t.id === activeId);
    if (active && active.historyIndex > 0) {
      const prevUrl = active.history[active.historyIndex - 1];
      setTabs(p => p.map(t => t.id === activeId ? { ...t, url: prevUrl, historyIndex: t.historyIndex - 1, error: undefined, readerMode: false } : t));
    }
  };

  const goFwd = () => {
    const active = tabs.find(t => t.id === activeId);
    if (active && active.historyIndex < active.history.length - 1) {
      const nextUrl = active.history[active.historyIndex + 1];
      setTabs(p => p.map(t => t.id === activeId ? { ...t, url: nextUrl, historyIndex: t.historyIndex + 1, error: undefined, readerMode: false } : t));
    }
  };

  const reload = () => {
    const active = tabs.find(t => t.id === activeId);
    if (active) {
      if (isInternal(active.url)) {
        setTabs(p => p.map(t => t.id === activeId ? { ...t } : t));
      } else {
        const wv = wvRefs.current[activeId];
        if (wv) wv.src = wv.src;
      }
    }
  };

  const clearHistory = async () => { setGlobalHistory([]); };

  useKeyboardShortcuts(urlInputRef, nav, goBack, goFwd, reload, wvRefs);

  useEffect(() => {
    setMounted(true);
    loadRecentHistory(500).then(h => setGlobalHistory(h));
    try {
      const savedSettings = localStorage.getItem('veil-settings');
      if (savedSettings) {
        // Deep-migrate any remaining browser:// links in settings to veil://
        const migratedSettingsStr = savedSettings.replace(/browser:\/\//g, 'veil://');
        const parsed = JSON.parse(migratedSettingsStr);
        updateSettings(parsed);
      }
    } catch (e) {}

    let unsubResize: Promise<() => void> | undefined;
    let unsubTorLog: Promise<() => void> | undefined;
    let unsubDownloadStart: Promise<() => void> | undefined;
    let unsubDownloadProgress: Promise<() => void> | undefined;
    try {
      if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
        unsubResize = listen('window-resized', () => {});
        unsubTorLog = listen('tor-log', (event: any) => {
          const log = event.payload as string;
          useBrowserStore.getState().addTorLog(log);
          const currentStatus = useBrowserStore.getState().settings.torStatus;
          if (log.includes('Bootstrapped 100%')) {
             useBrowserStore.getState().updateSettings({ torStatus: 'connected' });
             useBrowserStore.getState().addToast('Tor Network connected securely', 'success');
          } else if (log.includes('Tor disconnected')) {
             useBrowserStore.getState().updateSettings({ torStatus: 'disconnected' });
          } else if (currentStatus !== 'connected') {
             useBrowserStore.getState().updateSettings({ torStatus: 'connecting' });
          }
        });
        unsubDownloadStart = listen('download-started', (event: any) => {
          const { id, filename, url, total_bytes } = event.payload;
          useBrowserStore.getState().addOrUpdateDownload({
            id, filename, url, totalBytes: total_bytes, receivedBytes: 0, state: 'progressing', savePath: '', startTime: Date.now()
          });
          useBrowserStore.getState().addToast(`Started downloading ${filename}`, 'info');
        });
        unsubDownloadProgress = listen('download-progress', (event: any) => {
          const { id, received_bytes, state, save_path } = event.payload;
          useBrowserStore.getState().addOrUpdateDownload({
            id, receivedBytes: received_bytes, state, savePath: save_path
          } as any);
          if (state === 'completed') {
            useBrowserStore.getState().addToast(`Download complete`, 'success');
          }
        });
      }
    } catch (e) {
      console.warn('Tauri API not available (likely running in standard browser)');
    }

    return () => {
      if (unsubResize) unsubResize.then(f => f && f());
      if (unsubTorLog) unsubTorLog.then(f => f && f());
      if (unsubDownloadStart) unsubDownloadStart.then(f => f && f());
      if (unsubDownloadProgress) unsubDownloadProgress.then(f => f && f());
    };
  }, []);

  useEffect(() => {
    if (mounted) {
      localStorage.setItem('veil-settings', JSON.stringify(settings));
      safeInvoke('sync_privacy_settings', { settings });
    }
  }, [settings, mounted]);

  useEffect(() => {
    // Data theme is always light per user preference (no dark mode needed)
    document.documentElement.setAttribute('data-theme', 'light');
  }, [settings.darkMode]);

  useEffect(() => {
    if (!mounted) return;
    tabs.forEach((tab) => {
      const iframe = wvRefs.current[tab.id];
      if (!iframe || (iframe as any)._bound) return;
      (iframe as any)._bound = true;
      iframe.addEventListener('load', () => {
        useBrowserStore.getState().updateTab(tab.id, { loading: false, loadProgress: 100 });
        try {
          const doc = iframe.contentDocument || iframe.contentWindow?.document;
          if (doc) {
            const title = doc.title || tab.title;
            let favicon = '';
            const linkIcon = doc.querySelector('link[rel*="icon"]') as HTMLLinkElement | null;
            if (linkIcon?.href) favicon = linkIcon.href;
            useBrowserStore.getState().updateTab(tab.id, { title, favicon: favicon || undefined });
          }
        } catch (_e) {
          try {
            const domain = new URL(tab.url).hostname;
            useBrowserStore.getState().updateTab(tab.id, {
              title: tab.title === 'Loading...' ? domain : tab.title,
              favicon: `https://www.google.com/s2/favicons?domain=${domain}&sz=32`
            });
          } catch (_e2) {}
        }
      });
      iframe.addEventListener('error', () => {
        useBrowserStore.getState().updateTab(tab.id, { error: 'Failed to load page', loading: false });
      });
    });
  }, [tabs.length, mounted]);

  useEffect(() => {
    const active = tabs.find(t => t.id === activeId);
    if (slmOpen && active && !isInternal(active.url)) {
      const iframe = wvRefs.current[active.id];
      let text = '';
      try {
        const doc = iframe?.contentDocument || iframe?.contentWindow?.document;
        text = doc?.body?.innerText?.substring(0, 5000) || '';
      } catch (_e) {}
      setSlmContext(`URL: ${active.url}\nTitle: ${active.title}${text ? `\nPage Content:\n${text}` : ''}`);
    } else if (active && isInternal(active.url)) {
      setSlmContext(`Internal Page: ${active.url}`);
    }
  }, [slmOpen, activeId, tabs]);

  const toggleSetting = async (key: string, value?: any) => {
    const newVal = value !== undefined ? value : !(settings as any)[key];
    if (key === 'torMode') {
      updateSettings({ torStatus: newVal ? 'connecting' : 'disconnected' });
      const res: any = await safeInvoke('toggle_tor', { enable: newVal });
      if (res && typeof res === 'string') {
        updateSettings({ torMode: newVal });
        if (!newVal) {
          updateSettings({ torStatus: 'disconnected' });
          addToast('Tor Network disconnected', 'info');
        } else {
          addToast('Connecting to Tor Network...', 'info');
        }
      } else {
        updateSettings({ torMode: false, torStatus: 'disconnected' });
        setTorError(typeof res === 'object' && res?.error ? res.error : 'Unknown Tor Error');
      }
    } else {
      updateSettings({ [key]: newVal });
    }
  };

  if (!mounted) return null;

  return (
    <ErrorBoundary>
      <div className="flex flex-col w-screen h-screen overflow-hidden bg-transparent text-[var(--text-primary)]">
        
        {/* Custom Titlebar (Drag Region & Window Controls) */}
        <div data-tauri-drag-region className="h-8 flex items-center justify-between px-3 flex-shrink-0 drag-region z-50">
          <div className="w-[52px]" /> {/* Spacer for centering */}
          
          <div className="text-[11px] font-medium text-[var(--text-tertiary)] pointer-events-none select-none tracking-widest uppercase">
            Veil Browser
          </div>
          
          {/* Windows style Window Controls (Right side) */}
          <div className="flex items-center gap-2 no-drag">
            <button onClick={() => safeInvoke('minimize_window')} className="w-3 h-3 rounded-full bg-yellow-400 hover:bg-yellow-500 shadow-sm shadow-yellow-400/50 flex items-center justify-center transition-colors group">
              <span className="opacity-0 group-hover:opacity-100 text-[8px] text-yellow-900 leading-none">−</span>
            </button>
            <button onClick={() => safeInvoke('maximize_window')} className="w-3 h-3 rounded-full bg-green-400 hover:bg-green-500 shadow-sm shadow-green-400/50 flex items-center justify-center transition-colors group">
              <span className="opacity-0 group-hover:opacity-100 text-[8px] text-green-900 leading-none">+</span>
            </button>
            <button onClick={() => safeInvoke('close_window')} className="w-3 h-3 rounded-full bg-red-400 hover:bg-red-500 shadow-sm shadow-red-400/50 flex items-center justify-center transition-colors group">
              <span className="opacity-0 group-hover:opacity-100 text-[8px] text-red-900 leading-none">✕</span>
            </button>
          </div>
        </div>

        <Toaster position="bottom-right" richColors />

        {/* Main Interface Layout */}
        <div className="flex-1 flex min-h-0 px-2 sm:px-3 pb-2 sm:pb-3 gap-2 sm:gap-3">
          
          {/* Sidebar (Hidden on very small screens) */}
          <div className="hidden sm:block">
            <Sidebar />
          </div>

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col min-w-0 glass-panel overflow-hidden p-1 sm:p-2">
            <TabBar />
            <Toolbar
              urlInputRef={urlInputRef}
              urlInput={urlInput}
              setUrlInput={setUrlInput}
              nav={nav}
              goBack={goBack}
              goFwd={goFwd}
              reload={reload}
              setIsSettingsOpen={setIsSettingsOpen}
            />

            <div className="flex-1 relative glass-panel overflow-hidden rounded-xl mt-2 border border-[var(--glass-border)]">
              <TabWorkspace nav={nav} clearHistory={clearHistory} wvRefs={wvRefs} />
              <ZoomIndicator />
              <SLMPanel isOpen={slmOpen} onClose={() => setSlmOpen(false)} currentContext={slmContext} />
            </div>
          </div>

        </div>

        {/* Tab Search Overlay */}
        <TabSearch />

        {/* Settings Modal */}
        <AnimatePresence>
          {isSettingsOpen && (
            <motion.div
              className="fixed inset-0 z-[9999] flex items-center justify-center p-6 bg-white/30 backdrop-blur-sm"
              onClick={() => setIsSettingsOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="glass-panel-heavy w-full max-w-2xl max-h-[85vh] overflow-y-auto p-4"
                onClick={e => e.stopPropagation()}
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
              >
                <Settings settings={settings} onToggle={toggleSetting} />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tor Error Modal */}
        <AnimatePresence>
          {torError && (
            <motion.div
              className="fixed inset-0 z-[9999] flex items-center justify-center p-6 bg-white/30 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="glass-panel-heavy p-8 max-w-md text-center flex flex-col items-center gap-4"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
              >
                <div className="w-16 h-16 rounded-full flex items-center justify-center glass-panel text-red-500">
                  <Shield size={32} />
                </div>
                <h2 className="text-xl font-semibold">Tor Connection Failed</h2>
                <p className="text-sm text-[var(--text-secondary)]">{torError}</p>
                <button
                  onClick={() => setTorError('')}
                  className="px-6 py-2.5 glass-btn-accent rounded-full font-medium mt-2 shadow-sm"
                >
                  Dismiss
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ErrorBoundary>
  );
}

