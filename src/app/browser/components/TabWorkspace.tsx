import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels';
import { Shield, Moon, Zap } from 'lucide-react';
import { useBrowserStore, NEWTAB, HISTORY, isInternal } from '@/lib/store';
import NewTab from '../../NewTab';
import Downloads from '../../Downloads';
import History from '../../History';
import SearchResults from '../../SearchResults';
import ReaderMode from '../../ReaderMode';
import FindBar from '../../FindBar';

export default function TabWorkspace({ nav, clearHistory, wvRefs }: any) {
  const { tabs, activeId, splitTabId, globalHistory, settings, updateSettings, updateTab, setTabs, findBarOpen, setFindBarOpen } = useBrowserStore();
  const [mounted, setMounted] = useState(false);
  const [discardedTabs, setDiscardedTabs] = useState<Set<string>>(new Set());
  const inactivityTimers = useRef<Record<string, NodeJS.Timeout>>({});

  useEffect(() => { setMounted(true); }, []);

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
              className="px-8 py-3 rounded-full font-medium text-white bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] transition-all hover:scale-105 active:scale-95 shadow-[var(--glow-primary)]"
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

    if (tab.url === NEWTAB) return <NewTab onNavigate={(u: string) => nav(tab.id, u)} settings={settings} onToggleSetting={async (k: string, v?: any) => { updateSettings({ [k]: v !== undefined ? v : !(settings as any)[k] }); }} recentHistory={globalHistory.slice(0, 6)} />;
    if (tab.url === 'browser://downloads') return <Downloads />;
    if (tab.url === HISTORY) return <History history={globalHistory} onNavigate={(u: string) => nav(tab.id, u)} onClearHistory={clearHistory} />;
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

          <iframe
            ref={(el) => { if (el) wvRefs.current[tab.id] = el; }}
            src={`http://127.0.0.1:8181/proxy?url=${encodeURIComponent(tab.url)}`}
            style={{ width: '100%', height: '100%', border: 'none', display: tab.error || tab.readerMode ? 'none' : 'flex', background: 'white' }}
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            title={tab.title}
          />

          {tab.readerMode && <ReaderMode isOpen={true} onClose={() => updateTab(tab.id, { readerMode: false })} webviewRef={{ current: wvRefs.current[tab.id] }} />}

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
                  className="px-8 py-3 rounded-full font-medium text-white bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] transition-all hover:scale-105 active:scale-95 shadow-[var(--glow-primary)]"
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
      <div className="flex w-full h-full overflow-hidden">
        <PanelGroup orientation="horizontal">
          <Panel minSize={20}>
            {renderPanel(activeId)}
          </Panel>
          <PanelResizeHandle className="w-1.5 mx-1 cursor-col-resize hover:bg-[var(--surface-icon-hover)] rounded-full transition-colors" />
          <Panel minSize={20}>
            {renderPanel(splitTabId)}
          </Panel>
        </PanelGroup>
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
    </div>
  );
}
