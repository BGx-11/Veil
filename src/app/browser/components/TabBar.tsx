import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Globe, X, Pin, Video, Mic, Volume2, VolumeX, Copy, Columns2, FolderPlus, Palette } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { useBrowserStore, type Tab, type TabGroup } from '@/lib/store';

const GROUP_COLORS = [
  { name: 'Red', value: 'red', bg: 'rgba(239,68,68,0.15)', text: '#ef4444', border: 'rgba(239,68,68,0.3)' },
  { name: 'Orange', value: 'orange', bg: 'rgba(249,115,22,0.15)', text: '#f97316', border: 'rgba(249,115,22,0.3)' },
  { name: 'Yellow', value: 'yellow', bg: 'rgba(234,179,8,0.15)', text: '#ca8a04', border: 'rgba(234,179,8,0.3)' },
  { name: 'Green', value: 'green', bg: 'rgba(34,197,94,0.15)', text: '#16a34a', border: 'rgba(34,197,94,0.3)' },
  { name: 'Blue', value: 'blue', bg: 'rgba(59,130,246,0.15)', text: '#3b82f6', border: 'rgba(59,130,246,0.3)' },
  { name: 'Purple', value: 'purple', bg: 'rgba(168,85,247,0.15)', text: '#a855f7', border: 'rgba(168,85,247,0.3)' },
  { name: 'Pink', value: 'pink', bg: 'rgba(236,72,153,0.15)', text: '#ec4899', border: 'rgba(236,72,153,0.3)' },
  { name: 'Teal', value: 'teal', bg: 'rgba(20,184,166,0.15)', text: '#14b8a6', border: 'rgba(20,184,166,0.3)' },
];

function getGroupStyle(color: string) {
  return GROUP_COLORS.find(c => c.value === color) || GROUP_COLORS[4];
}

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
    tabs, activeId, setActiveId, addTab, closeTab, updateTab, setTabs, splitTabId,
    tabGroups, addTabGroup, moveTabToGroup, removeTabGroup, toggleGroupCollapse, addToast
  } = useBrowserStore();

  const [contextMenuTabId, setContextMenuTabId] = useState<string | null>(null);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });
  const [hoveredTabId, setHoveredTabId] = useState<string | null>(null);
  const [os, setOs] = useState<string>('windows');
  const [showGroupMenu, setShowGroupMenu] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupColor, setNewGroupColor] = useState('blue');
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    if (userAgent.includes('mac')) setOs('macos');
    else setOs('windows');
  }, []);

  const isMac = os === 'macos' || os === 'darwin';

  const pinnedTabs = tabs.filter(t => t.pinned && t.id !== splitTabId);
  const regularTabs = tabs.filter(t => !t.pinned && t.id !== splitTabId);
  const sortedTabs = [...pinnedTabs, ...regularTabs];

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;
    if (sourceIndex === destinationIndex) return;
    const newSorted = Array.from(sortedTabs);
    const [reorderedItem] = newSorted.splice(sourceIndex, 1);
    newSorted.splice(destinationIndex, 0, reorderedItem);
    // Re-insert the split tab (if any) that was filtered out of sortedTabs
    const splitTab = splitTabId ? tabs.find(t => t.id === splitTabId) : null;
    if (splitTab && !newSorted.find(t => t.id === splitTab.id)) {
      setTabs([...newSorted, splitTab]);
    } else {
      setTabs(newSorted);
    }
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
    const tab = tabs.find(t => t.id === tabId);
    if (!tab) return;
    updateTab(tabId, { muted: !tab.muted });
    addToast(tab.muted ? 'Site unmuted' : 'Site muted', 'info');
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

  const createGroup = () => {
    if (!newGroupName.trim()) return;
    addTabGroup(newGroupName.trim(), newGroupColor);
    if (contextMenuTabId) {
      // Find the newly created group
      setTimeout(() => {
        const groups = useBrowserStore.getState().tabGroups;
        const newest = groups[groups.length - 1];
        if (newest) moveTabToGroup(contextMenuTabId, newest.id);
      }, 0);
    }
    setNewGroupName('');
    setShowGroupMenu(false);
    closeContextMenu();
  };

  return (
    <>
      <div
        className="flex items-end h-[44px] flex-shrink-0 z-20 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 backdrop-blur-md border-b border-indigo-200/40 overflow-hidden w-full select-none transition-colors rounded-t-xl"
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
                  className="flex gap-[2px] h-[36px] min-w-0"
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
                            className={`group relative flex items-center gap-2 cursor-pointer text-[13px] font-medium transition-all duration-300 h-[36px] rounded-t-xl
                              ${isActive 
                                ? `bg-[var(--bg-element)] border border-[var(--border-color)] border-b-0 shadow-[0_-4px_16px_rgba(0,0,0,0.15)] text-[var(--text-primary)] min-w-[140px] ${splitTabId ? 'max-w-[360px]' : 'max-w-[260px]'} flex-shrink-0 z-10 font-semibold` 
                                : 'glass-btn border-b-0 rounded-b-none text-[var(--text-secondary)] hover:bg-[var(--surface-icon-hover)] min-w-[38px] max-w-[220px] flex-1 shrink opacity-80 hover:opacity-100 z-0'
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
                            {/* Group color indicator */}
                            {tab.groupId && (() => {
                              const group = tabGroups.find(g => g.id === tab.groupId);
                              if (!group) return null;
                              const style = getGroupStyle(group.color);
                              return <div className="absolute top-0 left-0 right-0 h-[2px] rounded-t-xl" style={{ background: style.text }} />;
                            })()}
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
                              <div className={`flex-1 flex items-center gap-1.5 truncate select-none transition-opacity duration-300 ${!isActive && sortedTabs.length > 8 ? 'opacity-0 md:opacity-100' : 'opacity-100'}`}>
                                {tab.mediaPlaying && !tab.muted && <Volume2 size={10} className="text-[var(--text-tertiary)] flex-shrink-0" />}
                                {tab.muted && <VolumeX size={10} className="text-red-400 flex-shrink-0" />}
                                {tab.cameraUsing && <Video size={10} className="text-[var(--accent-danger)] flex-shrink-0" />}
                                {tab.micUsing && <Mic size={10} className="text-[var(--accent-warning)] flex-shrink-0" />}
                                <span className="truncate">{tab.title}</span>

                                {isActive && splitTabId && (
                                   <>
                                     <div className="w-px h-3 bg-[var(--text-tertiary)] opacity-30 mx-0.5 flex-shrink-0" />
                                     <div 
                                       className="flex items-center gap-1 text-[var(--accent-primary)] hover:text-indigo-800 transition-colors cursor-pointer truncate max-w-[120px] bg-indigo-500/10 px-1.5 py-0.5 rounded-md"
                                       onClick={(e) => { e.stopPropagation(); setActiveId(splitTabId); }}
                                       title="Click to swap focus"
                                     >
                                       <Columns2 size={10} className="flex-shrink-0" />
                                       <span className="truncate text-xs font-semibold">{tabs.find(t => t.id === splitTabId)?.title}</span>
                                       <button 
                                         onClick={(e) => { e.stopPropagation(); closeTab(splitTabId); }}
                                         className="hover:bg-indigo-500/20 rounded p-0.5 ml-0.5 transition-colors"
                                         title="Close Split Pane"
                                       >
                                         <X size={10} />
                                       </button>
                                     </div>
                                   </>
                                )}
                              </div>
                            )}

                            {/* Status indicators (For pinned tabs) */}
                            {tab.pinned && (
                              <div className="absolute top-1 right-1 flex items-center gap-1">
                                {tab.cameraUsing && <Video size={10} className="text-[var(--accent-danger)]" />}
                                {tab.micUsing && <Mic size={10} className="text-[var(--accent-warning)]" />}
                                {tab.mediaPlaying && !tab.cameraUsing && !tab.micUsing && <Volume2 size={10} className="text-[var(--text-tertiary)]" />}
                              </div>
                            )}

                            {/* Close button */}
                            {!tab.pinned && (
                              <button
                                className={`absolute right-1.5 opacity-0 group-hover:opacity-100 h-6 w-6 flex items-center justify-center rounded-md transition-all
                                  hover:bg-[var(--surface-disabled-bg)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)]`}
                                onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }}
                              >
                                <X size={14} />
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
            onClick={() => addTab()}
            title="New Tab (Ctrl+T)"
            className="w-8 h-8 ml-2 mb-1 flex-shrink-0 flex items-center justify-center rounded-full glass-btn text-[var(--text-secondary)] transition-colors no-drag"
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
              className="fixed z-[9999] glass-panel-heavy p-1.5 min-w-[200px]"
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
                {tabs.find(t => t.id === contextMenuTabId)?.muted 
                  ? <><Volume2 size={14} /> Unmute Site</> 
                  : <><VolumeX size={14} /> Mute Site</>}
              </ContextMenuItem>
              <div className="h-px my-1 mx-2 bg-[var(--border-color)]" />
              
              {/* Tab Group Options */}
              <div className="relative">
                <button
                  onClick={() => setShowGroupMenu(!showGroupMenu)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left text-[var(--text-secondary)] hover:bg-[var(--bg-element-hover)]"
                >
                  <Palette size={14} /> Move to Group
                </button>
                
                {showGroupMenu && (
                  <div className="ml-2 mt-1 p-2 rounded-xl" style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}>
                    {tabGroups.map(group => {
                      const style = getGroupStyle(group.color);
                      return (
                        <button
                          key={group.id}
                          onClick={() => { moveTabToGroup(contextMenuTabId, group.id); setShowGroupMenu(false); closeContextMenu(); }}
                          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-[var(--glass-bg-hover)]"
                        >
                          <div className="w-2.5 h-2.5 rounded-full" style={{ background: style.text }} />
                          {group.name}
                        </button>
                      );
                    })}
                    {tabs.find(t => t.id === contextMenuTabId)?.groupId && (
                      <button
                        onClick={() => { moveTabToGroup(contextMenuTabId, undefined); setShowGroupMenu(false); closeContextMenu(); }}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-[var(--glass-bg-hover)] text-[var(--text-tertiary)]"
                      >
                        Remove from group
                      </button>
                    )}
                    <div className="h-px my-1 bg-[var(--border-color)]" />
                    <div className="flex items-center gap-1.5 px-1 py-1">
                      <input
                        type="text"
                        value={newGroupName}
                        onChange={e => setNewGroupName(e.target.value)}
                        placeholder="New group..."
                        className="flex-1 bg-transparent border-none outline-none text-xs px-1.5 py-1 rounded" 
                        style={{ color: 'var(--text-primary)', background: 'var(--glass-bg-active)' }}
                        onKeyDown={e => { if (e.key === 'Enter') createGroup(); }}
                      />
                      <div className="flex gap-0.5">
                        {GROUP_COLORS.slice(0, 4).map(c => (
                          <button
                            key={c.value}
                            onClick={() => setNewGroupColor(c.value)}
                            className="w-3.5 h-3.5 rounded-full transition-transform"
                            style={{ background: c.text, border: newGroupColor === c.value ? '2px solid var(--text-primary)' : '2px solid transparent' }}
                          />
                        ))}
                      </div>
                      <button
                        onClick={createGroup}
                        disabled={!newGroupName.trim()}
                        className="text-xs font-medium px-1.5 py-0.5 rounded transition-colors disabled:opacity-30"
                        style={{ color: 'var(--accent-primary)' }}
                      >
                        +
                      </button>
                    </div>
                  </div>
                )}
              </div>
              
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
