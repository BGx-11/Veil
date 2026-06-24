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
import ErrorBoundary from '../ErrorBoundary';
import Settings from '../Settings';
import SLMPanel from '../SLMPanel';

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

  useKeyboardShortcuts(urlInputRef, nav, goBack, goFwd, reload);

  useEffect(() => {
    setMounted(true);
    loadRecentHistory(500).then(h => setGlobalHistory(h));
    try {
      const savedSettings = localStorage.getItem('veil-settings');
      if (savedSettings) updateSettings(JSON.parse(savedSettings));
    } catch (e) {}

    let unsubResize: Promise<() => void> | undefined;
    let unsubTorLog: Promise<() => void> | undefined;
    try {
      unsubResize = listen('window-resized', () => {});
      unsubTorLog = listen('tor-log', (event: any) => {
        useBrowserStore.getState().addTorLog(event.payload);
      });
    } catch (e) {
      console.warn('Tauri API not available (likely running in standard browser)');
    }

    return () => {
      if (unsubResize) unsubResize.then(f => f && f());
      if (unsubTorLog) unsubTorLog.then(f => f && f());
    };
  }, []);

  useEffect(() => {
    if (mounted) localStorage.setItem('veil-settings', JSON.stringify(settings));
  }, [settings, mounted]);

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
      const res: any = await safeInvoke('toggle_tor', { enable: newVal });
      if (res && typeof res === 'string') {
        updateSettings({ torMode: newVal });
        addToast(newVal ? 'Tor Network connected' : 'Tor Network disconnected', newVal ? 'success' : 'info');
      } else {
        setTorError(typeof res === 'object' && res?.error ? res.error : 'Unknown Tor Error');
      }
    } else {
      updateSettings({ [key]: newVal });
    }
  };

  if (!mounted) return null;

  return (
    <ErrorBoundary>
      <div className="flex w-screen h-screen overflow-hidden bg-[var(--bg-page)] text-[var(--text-primary)]">
        <Toaster theme={settings.darkMode ? 'dark' : 'light'} position="bottom-right" richColors />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
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

          <div className="flex-1 relative p-2 md:p-3">
            <TabWorkspace nav={nav} clearHistory={clearHistory} wvRefs={wvRefs} />
            <SLMPanel isOpen={slmOpen} onClose={() => setSlmOpen(false)} currentContext={slmContext} />
          </div>
        </div>

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
                className="glass-panel w-full max-w-2xl max-h-[85vh] overflow-y-auto"
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
                className="glass-panel p-8 max-w-md text-center flex flex-col items-center gap-4"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
              >
                <div className="w-16 h-16 rounded-full flex items-center justify-center bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                  <Shield size={32} />
                </div>
                <h2 className="text-xl font-semibold">Tor Connection Failed</h2>
                <p className="text-sm text-[var(--text-secondary)]">{torError}</p>
                <button
                  onClick={() => setTorError('')}
                  className="px-6 py-2.5 rounded-full font-medium bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-primary-hover)] transition-colors mt-2"
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

