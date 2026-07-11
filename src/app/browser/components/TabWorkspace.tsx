import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels';
import { Shield, Moon, Zap, X } from 'lucide-react';
import { useBrowserStore, NEWTAB, HISTORY, isInternal } from '@/lib/store';
import NewTab from '../../NewTab';
import Downloads from '../../Downloads';
import History from '../../History';
import SearchResults from '../../SearchResults';
import ReaderMode from '../../ReaderMode';
import FindBar from '../../FindBar';
import Settings from '../../Settings';
import Notes from '@/app/Notes';
import Inspector from '@/app/Inspector';
import Bookmarks from '@/app/Bookmarks';
import Passwords from '@/app/Passwords';

export default function TabWorkspace({ nav, wvRefs }: any) {
  const { tabs, activeId, splitTabId, settings, updateSettings, updateTab, setTabs, findBarOpen, setFindBarOpen } = useBrowserStore();
  const [mounted, setMounted] = useState(false);
  const [discardedTabs, setDiscardedTabs] = useState<Set<string>>(new Set());
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const inactivityTimers = useRef<Record<string, NodeJS.Timeout>>({});

  const navRef = useRef(nav);
  const tabsRef = useRef(tabs);
  const activeIdRef = useRef(activeId);
  
  useEffect(() => { navRef.current = nav; }, [nav]);
  useEffect(() => { tabsRef.current = tabs; }, [tabs]);
  useEffect(() => { activeIdRef.current = activeId; }, [activeId]);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (!e.data || !e.data.type) return;
      
      let sourceTabId = activeIdRef.current;
      for (const tab of tabsRef.current) {
        const wv = wvRefs.current[tab.id];
        if (wv && wv.contentWindow === e.source) {
          sourceTabId = tab.id;
          break;
        }
      }

      if (e.data.type === 'navigate' && e.data.url) {
        navRef.current(sourceTabId, e.data.url);
      } else if (e.data.type === 'page-info' && e.data.title) {
        updateTab(sourceTabId, { title: e.data.title });
      } else if (e.data.type === 'favicon' && e.data.url) {
        updateTab(sourceTabId, { favicon: e.data.url });
      } else if (e.data.type === 'screenshot-result' && e.data.dataUrl) {
        // Flash screen effect
        const flash = document.createElement('div');
        flash.className = 'fixed inset-0 bg-white/70 z-[99999] pointer-events-none transition-opacity duration-500';
        document.body.appendChild(flash);
        requestAnimationFrame(() => {
          flash.style.opacity = '0';
          setTimeout(() => flash.remove(), 500);
        });
        
        setScreenshotPreview(e.data.dataUrl);

        fetch(e.data.dataUrl)
          .then(res => res.blob())
          .then(async (blob) => {
            try {
              await navigator.clipboard.write([
                new ClipboardItem({ 'image/png': blob })
              ]);
              useBrowserStore.getState().addToast('Screenshot copied to clipboard!', 'success');
            } catch (err) {
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `veil-screenshot-${Date.now()}.png`;
              a.click();
              URL.revokeObjectURL(url);
              useBrowserStore.getState().addToast('Screenshot saved to downloads', 'success');
            }
          })
          .catch(() => useBrowserStore.getState().addToast('Screenshot processing failed', 'warning'));
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [updateTab]);

  useEffect(() => {
    if (activeId && inactivityTimers.current[activeId]) {
      clearTimeout(inactivityTimers.current[activeId]);
      delete inactivityTimers.current[activeId];
      setDiscardedTabs(prev => { const next = new Set(prev); next.delete(activeId); return next; });
    }
    if (splitTabId && inactivityTimers.current[splitTabId]) {
      clearTimeout(inactivityTimers.current[splitTabId]);
      delete inactivityTimers.current[splitTabId];
      setDiscardedTabs(prev => { const next = new Set(prev); next.delete(splitTabId); return next; });
    }
    tabs.forEach(tab => {
      const isInactive = tab.id !== activeId && tab.id !== splitTabId;
      if (isInactive && !inactivityTimers.current[tab.id] && !discardedTabs.has(tab.id) && !isInternal(tab.url)) {
        inactivityTimers.current[tab.id] = setTimeout(() => { setDiscardedTabs(prev => new Set(prev).add(tab.id)); }, 10 * 60 * 1000);
      }
    });
    return () => {
      const currentTabIds = new Set(tabs.map(t => t.id));
      Object.keys(inactivityTimers.current).forEach(id => {
        if (!currentTabIds.has(id)) { clearTimeout(inactivityTimers.current[id]); delete inactivityTimers.current[id]; }
      });
    };
  }, [tabs, activeId, splitTabId, discardedTabs]);

  const renderTabContent = (tabId: string) => {
    const tab = tabs.find(t => t.id === tabId);
    if (!tab) return null;

    // ── Sleeping Tab ──
    if (discardedTabs.has(tab.id)) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-[var(--bg-element)] backdrop-blur-3xl">
          <div className="flex flex-col items-center text-center p-10 rounded-3xl glass-panel max-w-sm border border-[var(--border-color)]">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6 bg-[var(--surface-icon-bg)] shadow-inner">
              <Moon size={36} className="text-[var(--text-tertiary)]" />
            </div>
            <h3 className="text-xl font-medium mb-3 text-[var(--text-primary)] tracking-wide">Tab is Sleeping</h3>
            <p className="text-sm text-[var(--text-secondary)] mb-8 leading-relaxed">
              This tab was suspended to conserve memory and keep your browser fast.
            </p>
            <button
              className="px-8 py-3 rounded-full font-medium glass-btn-accent transition-all shadow-md"
              onClick={() => {
                setDiscardedTabs(prev => { const next = new Set(prev); next.delete(tab.id); return next; });
                const wv = wvRefs.current[tab.id];
                if (wv) wv.src = wv.src;
              }}
            >
              <Zap size={18} className="inline mr-2 -mt-0.5" />
              Wake Tab
            </button>
          </div>
        </div>
      );
    }

    if (tab.url === NEWTAB) return <NewTab onNavigate={(u: string) => nav(tab.id, u)} />;
    if (tab.url === 'veil://downloads') return <Downloads />;
    if (tab.url === 'veil://notes') return <Notes />;
    if (tab.url === 'veil://passwords') return <Passwords />;
    if (tab.url === 'veil://inspector') return <Inspector />;
    if (tab.url === 'veil://bookmarks') return <Bookmarks onNavigate={(u: string) => nav(tab.id, u)} />;
    if (tab.url === HISTORY) return <History onNavigate={(u: string) => nav(tab.id, u)} />;
    if (tab.url === 'veil://settings') return <div className="w-full h-full overflow-y-auto bg-[var(--bg-base)]"><Settings settings={settings} onToggle={async (k: string, v?: any) => { updateSettings({ [k]: v !== undefined ? v : !(settings as any)[k] }); }} /></div>;
    if (tab.url.startsWith('search://')) return <SearchResults query={tab.url.replace('search://', '')} onNavigate={(u: string) => nav(tab.id, u)} />;

    if (mounted) {
      return (
        <>
          {/* Progress Bar */}
          {tab.loading && !tab.error && !tab.readerMode && (
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-transparent z-50 overflow-hidden">
              <div 
                className="h-full bg-[var(--accent-primary)] transition-all duration-300 ease-out shadow-[var(--glow-primary)]" 
                style={{ width: `${tab.loadProgress || 30}%` }} 
              />
            </div>
          )}

          <div
            className="p-2 pb-3 w-full h-full"
            style={{
              display: tab.error || tab.readerMode ? 'none' : 'flex',
            }}
          >
            <div className="w-full h-full rounded-2xl overflow-hidden shadow-2xl relative" style={{ border: '1px solid var(--border-color)', background: 'white' }}>
              <iframe
                ref={(el) => { if (el) wvRefs.current[tab.id] = el; }}
                src={`http://127.0.0.1:8181/proxy?url=${encodeURIComponent(tab.url)}${useBrowserStore.getState().isIncognito ? '&incognito=true' : ''}`}
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  background: 'white',
                  zoom: (tab.zoomLevel || 100) / 100,
                }}
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                title={tab.title}
              />
            </div>
          </div>

          {tab.readerMode && <ReaderMode isOpen={true} onClose={() => updateTab(tab.id, { readerMode: false })} url={tab.url} />}

          {/* ── Error State ── */}
          {tab.error && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-[var(--bg-element)]/80 backdrop-blur-xl">
              <div className="flex flex-col items-center text-center p-10 rounded-3xl glass-panel max-w-sm border border-red-500/20 shadow-[var(--glow-danger)]">
                <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6 bg-red-500/10 text-red-500 ring-1 ring-red-500/30">
                  <Shield size={36} />
                </div>
                <h2 className="text-xl font-medium mb-3 text-[var(--text-primary)] tracking-wide">
                  {tab.error.startsWith('HTTPS_UPGRADE_FAILED') ? 'Insecure Connection' : 'Connection Failed'}
                </h2>
                <p className="text-sm text-[var(--text-secondary)] mb-8 leading-relaxed">{tab.error}</p>
                <button
                  className="px-8 py-3 rounded-full font-medium glass-btn-accent transition-all shadow-md"
                  onClick={() => {
                    const wv = wvRefs.current[tab.id];
                    if (wv) wv.src = wv.src;
                    updateTab(tab.id, { error: undefined, loading: true });
                  }}
                >
                  Try Again
                </button>
              </div>
            </div>
          )}
        </>
      );
    }
    return null;
  };

  const renderPanel = (tabId: string) => (
    <div className="relative w-full h-full overflow-hidden content-frame">
      {renderTabContent(tabId)}
      {findBarOpen && (activeId === tabId || splitTabId === tabId) && !isInternal(tabs.find(t => t.id === tabId)?.url || '') && (
        <FindBar isOpen={findBarOpen} onClose={() => setFindBarOpen(false)} webviewRef={{ current: wvRefs.current[tabId] }} />
      )}
    </div>
  );

  if (splitTabId) {
    return (
      <div className="flex w-full h-full overflow-hidden relative">
        <PanelGroup orientation="horizontal">
          <Panel minSize={20}>
            {renderPanel(activeId)}
          </Panel>
          <PanelResizeHandle className="w-1.5 mx-1 cursor-col-resize hover:bg-[var(--surface-icon-hover)] rounded-full transition-colors" />
          <Panel minSize={20}>
            {renderPanel(splitTabId)}
          </Panel>
        </PanelGroup>

        {/* Floating Web Panel */}
        <AnimatePresence>
          {useBrowserStore.getState().activeWebPanelUrl && (
            <motion.div
              initial={{ x: '100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute top-0 bottom-0 right-0 w-[400px] z-50 shadow-2xl border-l border-[var(--border-color)] bg-[var(--bg-element)] overflow-hidden flex flex-col"
            >
              <div className="h-10 flex items-center justify-between px-3 border-b border-[var(--border-color)] drag-region bg-[var(--glass-bg)]">
                <span className="font-semibold text-sm">Web Panel</span>
                <button onClick={() => useBrowserStore.getState().setActiveWebPanelUrl(null)} className="w-6 h-6 rounded flex items-center justify-center hover:bg-black/10 transition-colors no-drag">
                  <X size={14} />
                </button>
              </div>
              <iframe
                src={`http://127.0.0.1:8181/proxy?url=${encodeURIComponent(useBrowserStore.getState().activeWebPanelUrl!)}`}
                className="w-full flex-1 border-none bg-white"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full overflow-hidden content-frame">
      {tabs.map((tab) => (
        <div key={tab.id} style={{ display: activeId === tab.id ? 'block' : 'none', width: '100%', height: '100%' }}>
          {activeId === tab.id || !discardedTabs.has(tab.id) ? renderTabContent(tab.id) : null}
          {findBarOpen && activeId === tab.id && !isInternal(tab.url) && (
            <FindBar isOpen={findBarOpen} onClose={() => setFindBarOpen(false)} webviewRef={{ current: wvRefs.current[tab.id] }} />
          )}
        </div>
      ))}

      {/* Floating Web Panel */}
      <AnimatePresence>
        {useBrowserStore.getState().activeWebPanelUrl && (
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute top-0 bottom-0 right-0 w-[400px] z-50 shadow-2xl border-l border-white/20 bg-[var(--bg-element)] backdrop-blur-xl overflow-hidden flex flex-col"
          >
            <div className="h-10 flex items-center justify-between px-3 border-b border-white/10 drag-region bg-black/10">
              <span className="font-semibold text-sm text-[var(--text-primary)]">Web Panel</span>
              <button onClick={() => useBrowserStore.getState().setActiveWebPanelUrl(null)} className="w-6 h-6 rounded flex items-center justify-center hover:bg-white/20 text-[var(--text-secondary)] transition-colors no-drag">
                <X size={14} />
              </button>
            </div>
            <iframe
              src={`http://127.0.0.1:8181/proxy?url=${encodeURIComponent(useBrowserStore.getState().activeWebPanelUrl!)}`}
              className="w-full flex-1 border-none bg-white"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            />
          </motion.div>
        )}
      </AnimatePresence>
      {screenshotPreview && (
        <div className="fixed bottom-6 right-6 z-[9999] bg-[var(--bg-element)] border border-[var(--border-color)] rounded-xl shadow-2xl p-2 animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className="relative group">
            <img src={screenshotPreview} alt="Screenshot Preview" className="w-48 h-auto rounded-lg border border-[var(--border-color)] object-cover" />
            <button 
              onClick={() => setScreenshotPreview(null)}
              className="absolute top-1 right-1 w-6 h-6 bg-black/50 hover:bg-black/80 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              ✕
            </button>
            <div className="absolute bottom-1 left-1 right-1 bg-black/60 backdrop-blur-sm text-white text-[10px] py-1 px-2 rounded-md text-center opacity-0 group-hover:opacity-100 transition-opacity">
              Copied to clipboard
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
