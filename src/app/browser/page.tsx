'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Toaster } from 'sonner';
import { Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { listen } from '@tauri-apps/api/event';

import { useBrowserStore, NEWTAB, HISTORY, isInternal } from '@/lib/store';
import { useKeyboardShortcuts } from '@/lib/useKeyboardShortcuts';
import { safeInvoke } from '@/lib/ipcLogger';

import Toolbar from './components/Toolbar';
import TabBar from './components/TabBar';
import TabWorkspace from './components/TabWorkspace';
import Sidebar from './components/Sidebar';
import Onboarding from './components/Onboarding';
import AuroraBackground from './components/AuroraBackground';
import ErrorBoundary from '../ErrorBoundary';
import Settings from '../Settings';
import SLMPanel from '../SLMPanel';
import ZoomIndicator from '../ZoomIndicator';
import TabSearch from '../TabSearch';

export default function BrowserShell() {
  const {
    tabs, activeId, setTabs, setActiveId, isIncognito, setIsIncognito,
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



  useKeyboardShortcuts(urlInputRef, nav, goBack, goFwd, reload, wvRefs);

  useEffect(() => {
    setMounted(true);
    const incognito = typeof window !== 'undefined' && window.location.search.includes('incognito=true');
    if (incognito) {
      setIsIncognito(true);
    }
    
    try {
      const savedSettings = localStorage.getItem('veil-settings');
      if (savedSettings) {
        // Deep-migrate any remaining browser:// links in settings to veil://
        const migratedSettingsStr = savedSettings.replace(/browser:\/\//g, 'veil://');
        const parsed = JSON.parse(migratedSettingsStr);
        // Migrate: old default was darkMode:false, new default is true
        if (parsed.darkMode === undefined || parsed.darkMode === false) {
          parsed.darkMode = true;
        }
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
      if (!isIncognito) {
        localStorage.setItem('veil-settings', JSON.stringify(settings));
      }
      safeInvoke('sync_privacy_settings', { settings });
    }
  }, [settings, mounted, isIncognito]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.darkMode ? 'dark' : 'light');
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
              favicon: `https://icons.duckduckgo.com/ip3/${domain}.ico`
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
      <div className="flex flex-col w-screen h-screen overflow-hidden bg-transparent text-[var(--text-primary)]" data-incognito={isIncognito}>
        <AuroraBackground isDark={settings.darkMode} isIncognito={isIncognito} />
        
        {/* Custom Titlebar (Drag Region & Window Controls) */}
        <div data-tauri-drag-region className="h-8 flex items-center justify-between px-3 flex-shrink-0 drag-region z-50">
          
          <div className="w-[150px]" /> {/* Spacer for centering */}

          <div className="text-[11px] font-medium text-[var(--text-tertiary)] pointer-events-none select-none tracking-widest uppercase text-center flex-1 flex items-center justify-center gap-2">
            Veil Browser {isIncognito && <span className="px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-400">Incognito</span>}
          </div>
          
          {/* Window Controls (Top Right) */}
          <div className="flex items-center justify-end gap-2 no-drag w-[150px] pt-1">
            <button onClick={() => safeInvoke('minimize_window')} className="w-3.5 h-3.5 rounded-full bg-yellow-400/80 hover:bg-yellow-400 shadow-sm shadow-yellow-400/30 flex items-center justify-center transition-colors group">
              <span className="opacity-0 group-hover:opacity-100 text-yellow-900 text-[10px] leading-none font-bold">−</span>
            </button>
            <button onClick={() => safeInvoke('maximize_window')} className="w-3.5 h-3.5 rounded-full bg-green-400/80 hover:bg-green-400 shadow-sm shadow-green-400/30 flex items-center justify-center transition-colors group">
              <span className="opacity-0 group-hover:opacity-100 text-green-900 text-[10px] leading-none font-bold">+</span>
            </button>
            <button onClick={() => safeInvoke('close_window')} className="w-3.5 h-3.5 rounded-full bg-red-400/80 hover:bg-red-400 shadow-sm shadow-red-400/30 flex items-center justify-center transition-colors group">
              <span className="opacity-0 group-hover:opacity-100 text-red-900 text-[8px] leading-none font-bold">✕</span>
            </button>
          </div>
        </div>
        
        {!settings.hasCompletedSetup && <Onboarding />}

        <Toaster 
          position="bottom-right" 
          theme="dark" // We are using a dark Zen theme globally now
          toastOptions={{
            className: 'bg-[var(--bg-element)] border border-[var(--border-color)] text-[var(--text-primary)] font-medium shadow-2xl rounded-2xl p-4'
          }} 
        />
        <div className="flex-1 flex min-h-0 px-2 sm:px-3 pb-2 sm:pb-3 gap-2 sm:gap-3">
          
          {/* Sidebar (Hidden on very small screens) */}
          <div className="hidden sm:block h-full">
            <Sidebar />
          </div>

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative glass-panel ml-1 mr-2 mb-2">
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

            <div className="flex-1 relative overflow-hidden rounded-xl mx-2 mb-2">
              <TabWorkspace nav={nav} wvRefs={wvRefs} />
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
              className="fixed inset-0 z-[9999] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm"
              onClick={() => setIsSettingsOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="bg-[var(--bg-element)] border border-[var(--border-color)] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto p-4"
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
              className="fixed inset-0 z-[9999] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm"
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

