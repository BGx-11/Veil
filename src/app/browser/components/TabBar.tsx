import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Globe, X, Pin, Video, Mic, Volume2, VolumeX, Copy } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { useBrowserStore, type Tab } from '@/lib/store';

function ContextMenuItem({ onClick, danger, children }: { onClick: () => void; danger?: boolean; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left
        ${danger ? 'text-[var(--accent-danger)] hover:bg-[var(--accent-danger)] hover:bg-opacity-10' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-element-hover)]'}`}
    >
      {children}
    </button>
  );
}

export default function TabBar() {
  const {
    tabs, activeId, setActiveId, addTab, closeTab, updateTab, setTabs
  } = useBrowserStore();

  const [contextMenuTabId, setContextMenuTabId] = useState<string | null>(null);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });
  const [hoveredTabId, setHoveredTabId] = useState<string | null>(null);
  const [os, setOs] = useState<string>('windows');
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    if (userAgent.includes('mac')) setOs('macos');
    else setOs('windows');
  }, []);

  const isMac = os === 'macos' || os === 'darwin';

  const pinnedTabs = tabs.filter(t => t.pinned);
  const regularTabs = tabs.filter(t => !t.pinned);
  const sortedTabs = [...pinnedTabs, ...regularTabs];

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;
    if (sourceIndex === destinationIndex) return;
    const newTabs = Array.from(sortedTabs);
    const [reorderedItem] = newTabs.splice(sourceIndex, 1);
    newTabs.splice(destinationIndex, 0, reorderedItem);
    setTabs(newTabs);
  };

  const handleContextMenu = (e: React.MouseEvent, tabId: string) => {
    e.preventDefault();
    setContextMenuTabId(tabId);
    setContextMenuPos({ x: e.clientX, y: e.clientY });
  };

  const closeContextMenu = () => setContextMenuTabId(null);

  const duplicateTab = (tabId: string) => {
    const tab = tabs.find(t => t.id === tabId);
    if (!tab) return;
    const newId = Math.random().toString(36).slice(2, 11);
    const newTab = { ...tab, id: newId, pinned: false, history: [...tab.history] };
    setTabs([...tabs, newTab]);
    setActiveId(newId);
    closeContextMenu();
  };

  const togglePin = (tabId: string) => {
    const tab = tabs.find(t => t.id === tabId);
    if (!tab) return;
    updateTab(tabId, { pinned: !tab.pinned });
    closeContextMenu();
  };

  const toggleMute = (tabId: string) => {
    closeContextMenu();
  };

  const closeOtherTabs = (tabId: string) => {
    const toKeep = tabs.filter(t => t.id === tabId || t.pinned);
    setTabs(toKeep);
    if (!toKeep.find(t => t.id === activeId)) setActiveId(tabId);
    closeContextMenu();
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (scrollContainerRef.current) {
      if (e.deltaY !== 0) {
        scrollContainerRef.current.scrollLeft += e.deltaY;
      }
    }
  };

  return (
    <>
      <div
        className="flex items-end h-[44px] flex-shrink-0 z-20 bg-[var(--bg-panel)] backdrop-blur-xl border-b border-[var(--border-color)] overflow-hidden w-full select-none transition-colors"
        data-tauri-drag-region
      >
        {isMac && <div className="w-[80px] h-full flex-shrink-0" data-tauri-drag-region />}
        {/* ── Tab List ── */}
        <div 
          className="flex-1 overflow-x-auto overflow-y-hidden flex items-end h-full scrollbar-hide tab-fade-mask pl-3 pr-2 pt-1.5" 
          data-tauri-drag-region
          onWheel={handleWheel}
        >
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="tabs-list" direction="horizontal">
              {(provided) => (
                <div
                  className="flex gap-[2px] h-full items-end min-w-0"
                  {...provided.droppableProps}
                  ref={(el) => {
                    provided.innerRef(el);
                    // @ts-ignore
                    scrollContainerRef.current = el?.parentElement;
                  }}
                >
                  {sortedTabs.map((tab, index) => {
                    const isActive = activeId === tab.id;
                    const isHovered = hoveredTabId === tab.id;
                    
                    return (
                      <Draggable key={tab.id} draggableId={tab.id} index={index}>
                        {(provided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`group relative flex items-center gap-2 cursor-pointer text-[13px] font-medium transition-all duration-300 h-[36px] rounded-t-lg
                              ${isActive 
                                ? 'bg-[var(--bg-element)] text-[var(--text-primary)] active-tab-glow min-w-[140px] max-w-[260px] flex-shrink-0 z-10 shadow-sm' 
                                : 'bg-[var(--surface-icon-bg)] text-[var(--text-secondary)] hover:bg-[var(--surface-icon-hover)] min-w-[38px] max-w-[220px] flex-1 shrink opacity-80 hover:opacity-100 z-0'
                              }
                              ${tab.pinned ? 'w-[42px] min-w-[42px] justify-center px-0 flex-none' : 'px-3'}
                            `}
                            onClick={() => setActiveId(tab.id)}
                            onContextMenu={(e) => handleContextMenu(e, tab.id)}
                            onDoubleClick={() => togglePin(tab.id)}
                            onMouseEnter={() => setHoveredTabId(tab.id)}
                            onMouseLeave={() => setHoveredTabId(null)}
                            title={tab.title || 'New Tab'}
                          >
                            {/* Favicon */}
                            <div className="flex-shrink-0 flex items-center justify-center w-4 h-4">
                              {tab.loading ? (
                                <div className="w-3.5 h-3.5 border-2 border-[var(--border-color)] border-t-[var(--accent-primary)] rounded-full animate-spin flex-shrink-0" />
                              ) : tab.favicon ? (
                                <img
                                  src={tab.favicon}
                                  className="w-4 h-4 rounded-sm"
                                  alt=""
                                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                />
                              ) : (
                                <Globe size={14} className="opacity-60" />
                              )}
                            </div>

                            {/* Title */}
                            {!tab.pinned && (
                              <div className={`flex-1 truncate select-none transition-opacity duration-300 ${!isActive && sortedTabs.length > 8 ? 'opacity-0 md:opacity-100' : 'opacity-100'}`}>
                                {tab.title}
                              </div>
                            )}

                            {/* Status indicators */}
                            <div className={`flex items-center gap-1 flex-shrink-0 ${tab.pinned ? 'absolute top-1 right-1' : ''}`}>
                              {tab.pinned && <Pin size={8} className="text-[var(--text-tertiary)]" />}
                              {tab.cameraUsing && <Video size={10} className="text-[var(--accent-danger)]" />}
                              {tab.micUsing && <Mic size={10} className="text-[var(--accent-warning)]" />}
                              {tab.mediaPlaying && !tab.cameraUsing && !tab.micUsing && <Volume2 size={10} className="text-[var(--text-tertiary)]" />}
                            </div>

                            {/* Close button */}
                            {!tab.pinned && (
                              <button
                                className={`absolute right-1.5 opacity-0 group-hover:opacity-100 h-5 w-5 flex items-center justify-center rounded-md transition-all
                                  hover:bg-[var(--surface-disabled-bg)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)]`}
                                onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }}
                              >
                                <X size={12} />
                              </button>
                            )}
                            
                            {/* Mask overlay for smooth fade when text is very long and active */}
                            {isActive && !tab.pinned && <div className="absolute right-7 top-0 bottom-0 w-4 bg-gradient-to-r from-transparent to-[var(--bg-element)] pointer-events-none group-hover:opacity-0 transition-opacity" />}

                            {/* Spacer to push close button to right when content is short */}
                            {!tab.pinned && <div className="w-2 group-hover:w-5 transition-all flex-shrink-0" />}
                          </div>
                        )}
                      </Draggable>
                    );
                  })}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
          <button
            onClick={addTab}
            title="New Tab (Ctrl+T)"
            className="w-8 h-8 ml-2 mb-1 flex-shrink-0 flex items-center justify-center rounded-full hover:bg-[var(--surface-icon-hover)] text-[var(--text-secondary)] transition-colors no-drag backdrop-blur-md"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>

      {/* Context Menu */}
      <AnimatePresence>
        {contextMenuTabId && (
          <>
            <div className="fixed inset-0 z-[9998]" onClick={closeContextMenu} onContextMenu={(e) => { e.preventDefault(); closeContextMenu(); }} />
            <motion.div
              className="fixed z-[9999] glass-panel p-1.5 min-w-[200px]"
              style={{ left: contextMenuPos.x, top: contextMenuPos.y }}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
            >
              <ContextMenuItem onClick={() => duplicateTab(contextMenuTabId)}>
                <Copy size={14} /> Duplicate Tab
              </ContextMenuItem>
              <ContextMenuItem onClick={() => togglePin(contextMenuTabId)}>
                <Pin size={14} /> {tabs.find(t => t.id === contextMenuTabId)?.pinned ? 'Unpin Tab' : 'Pin Tab'}
              </ContextMenuItem>
              <ContextMenuItem onClick={() => toggleMute(contextMenuTabId)}>
                <VolumeX size={14} /> Mute Site
              </ContextMenuItem>
              <div className="h-px my-1 mx-2 bg-[var(--border-color)]" />
              <ContextMenuItem onClick={() => closeOtherTabs(contextMenuTabId)} danger>
                <X size={14} /> Close Other Tabs
              </ContextMenuItem>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
