import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Diamond, MessageCircle, Phone, Heart, Clock, MoreHorizontal, User, FileText, LayoutGrid, Globe, Plus, X, Volume2, VolumeX, Video, Mic, Settings, Briefcase, Bookmark, ChevronDown, Check, Layers, Code } from 'lucide-react';
import { useBrowserStore, type Tab } from '@/lib/store';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

const iconMap: Record<string, any> = {
  Sparkles, Diamond, MessageCircle, Phone, Heart, Clock, MoreHorizontal, User, FileText, LayoutGrid, Globe, Settings, Briefcase, Bookmark, Code
};

export default function Sidebar() {
  const {
    tabs, activeId, setActiveId, addTab, closeTab, setTabs, splitTabId,
    settings, activeWorkspaceId, workspaces, setActiveWorkspaceId
  } = useBrowserStore();

  const [hoveredTabId, setHoveredTabId] = useState<string | null>(null);
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const hoverTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    if (workspaceMenuOpen) {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
      setIsHovered(true);
    }
  }, [workspaceMenuOpen]);

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    if (workspaceMenuOpen) return;
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(false);
    }, 150);
  };

  const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId) || workspaces[0];
  
  const workspaceTabs = tabs.filter(t => t.workspaceId === activeWorkspaceId);
  const pinnedTabs = workspaceTabs.filter(t => t.pinned);
  const regularTabs = workspaceTabs.filter(t => !t.pinned);
  const sortedTabs = [...pinnedTabs, ...regularTabs];

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;
    if (sourceIndex === destinationIndex) return;

    const newSorted = Array.from(sortedTabs);
    const [reorderedItem] = newSorted.splice(sourceIndex, 1);
    newSorted.splice(destinationIndex, 0, reorderedItem);

    const otherTabs = tabs.filter(t => t.workspaceId !== activeWorkspaceId || t.id === splitTabId);
    setTabs([...otherTabs, ...newSorted]);
  };

  const WorkspaceIcon = iconMap[activeWorkspace?.icon] || User;
  const sidebarWidth = isHovered ? 260 : 64;

  return (
    <motion.div 
      initial={false}
      animate={{ width: sidebarWidth }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="h-full flex flex-col flex-shrink-0 z-[100] relative"
      style={{ 
        background: 'transparent',
        borderRight: '1px solid var(--border-color)'
      }}
    >
      {/* Top Apps Grid */}
      <div className="px-3 pt-4 pb-2">
        <div className={`grid gap-2 ${isHovered ? 'grid-cols-3' : 'grid-cols-1'}`}>
          <button onClick={() => addTab('veil://bookmarks')} title="Bookmarks" className="aspect-square w-full rounded-2xl flex items-center justify-center bg-[var(--surface-icon-bg)] hover:bg-orange-500/10 text-[var(--text-secondary)] transition-all duration-300 hover:text-orange-400 group">
            <Bookmark size={18} className="group-hover:scale-110 transition-transform" />
          </button>
          <button onClick={() => addTab('veil://history')} title="History" className="aspect-square w-full rounded-2xl flex items-center justify-center bg-[var(--surface-icon-bg)] hover:bg-emerald-500/10 text-[var(--text-secondary)] transition-all duration-300 hover:text-emerald-400 group" style={{ display: isHovered ? 'flex' : 'none' }}>
            <Clock size={18} className="group-hover:scale-110 transition-transform" />
          </button>
          <button onClick={() => addTab('veil://downloads')} title="Downloads" className="aspect-square w-full rounded-2xl flex items-center justify-center bg-[var(--surface-icon-bg)] hover:bg-pink-500/10 text-[var(--text-secondary)] transition-all duration-300 hover:text-pink-400 group" style={{ display: isHovered ? 'flex' : 'none' }}>
            <Heart size={18} className="group-hover:scale-110 transition-transform" />
          </button>
          <button onClick={() => addTab('veil://settings')} title="Settings" className="aspect-square w-full rounded-2xl flex items-center justify-center bg-[var(--surface-icon-bg)] hover:bg-slate-500/10 text-[var(--text-secondary)] transition-all duration-300 hover:text-slate-300 group" style={{ display: isHovered ? 'flex' : 'none' }}>
            <Settings size={18} className="group-hover:scale-110 transition-transform" />
          </button>
          <button onClick={() => addTab('veil://passwords')} title="Passwords" className="aspect-square w-full rounded-2xl flex items-center justify-center bg-[var(--surface-icon-bg)] hover:bg-indigo-500/10 text-[var(--text-secondary)] transition-all duration-300 hover:text-indigo-400 group" style={{ display: isHovered ? 'flex' : 'none' }}>
            <Globe size={18} className="group-hover:scale-110 transition-transform" />
          </button>
          <button onClick={() => addTab('veil://inspector')} title="Site Inspector" className="aspect-square w-full rounded-2xl flex items-center justify-center bg-[var(--surface-icon-bg)] hover:bg-blue-500/10 text-[var(--text-secondary)] transition-all duration-300 hover:text-blue-400 group" style={{ display: isHovered ? 'flex' : 'none' }}>
            <Code size={18} className="group-hover:scale-110 transition-transform" />
          </button>
        </div>
      </div>

      <div className="w-full h-px bg-[var(--border-color)] my-2 opacity-50" />

      {/* Workspace Selector inside Tabs list */}
      <div className="px-3 pb-2 pt-1 flex justify-center drag-region relative z-[100]">
        <button 
          className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-[var(--surface-icon-bg)] transition-colors no-drag overflow-hidden"
          onClick={() => setWorkspaceMenuOpen(!workspaceMenuOpen)}
        >
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-primary)] flex-shrink-0">
            <WorkspaceIcon size={18} />
          </div>
          
          <AnimatePresence>
            {isHovered && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="flex-1 flex items-center justify-between min-w-0"
              >
                <span className="font-bold text-[13px] tracking-wide truncate text-[var(--text-primary)]">{activeWorkspace?.name}</span>
                <ChevronDown size={14} className="text-[var(--text-tertiary)] flex-shrink-0 mr-1" />
              </motion.div>
            )}
          </AnimatePresence>
        </button>

        <AnimatePresence>
          {workspaceMenuOpen && (
            <>
              <div className="fixed inset-0 z-40 no-drag" onClick={() => setWorkspaceMenuOpen(false)} />
              <motion.div 
                initial={{ opacity: 0, y: -5, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -5, scale: 0.95 }}
                transition={{ type: "spring", duration: 0.3 }}
                className="absolute top-full mt-1 left-3 right-3 p-2 z-[9999] rounded-2xl shadow-2xl no-drag bg-[var(--bg-primary)] border border-[var(--border-color)]"
              >
                <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] px-3 py-2 mb-1">Workspaces</div>
                {workspaces.map(ws => {
                  const Icon = iconMap[ws.icon] || User;
                  const isCurrent = ws.id === activeWorkspaceId;
                  return (
                    <button
                      key={ws.id}
                      onClick={() => {
                        setActiveWorkspaceId(ws.id);
                        setWorkspaceMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all text-left group
                        ${isCurrent ? 'bg-[var(--surface-icon-bg)] shadow-sm' : 'hover:bg-[var(--surface-icon-hover)]'}`}
                      style={{ color: isCurrent ? 'var(--text-primary)' : 'var(--text-secondary)' }}
                    >
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110">
                        <Icon size={16} />
                      </div>
                      <span className="flex-1">{ws.name}</span>
                      {isCurrent && <Check size={16} className="text-[var(--accent-primary)]" />}
                    </button>
                  );
                })}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      {/* Tabs List */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-1 scrollbar-hide">
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="vertical-tabs-list" direction="vertical">
            {(provided) => (
              <div {...provided.droppableProps} ref={provided.innerRef} className="flex flex-col gap-1 min-h-[50px]">
                {sortedTabs.map((tab, index) => {
                  const isActive = activeId === tab.id;
                  const isSplit = splitTabId === tab.id;
                  const isHoveredTab = hoveredTabId === tab.id;
                  return (
                    <Draggable key={tab.id} draggableId={tab.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={`group relative flex items-center cursor-pointer font-medium transition-all duration-300 h-10 rounded-xl px-2 overflow-hidden
                            ${isActive 
                              ? 'glass-panel text-[var(--text-primary)] font-semibold border-none' 
                              : isSplit
                              ? 'bg-indigo-500/10 text-[var(--text-primary)] ring-1 ring-indigo-500/20'
                              : 'text-[var(--text-secondary)] hover:bg-[var(--surface-icon-hover)] hover:text-[var(--text-primary)]'
                            }
                            ${snapshot.isDragging ? 'shadow-2xl scale-105 z-50 ring-2 ring-[var(--accent-primary)] bg-[var(--bg-element)]' : ''}
                          `}
                          onClick={() => setActiveId(tab.id)}
                          onMouseEnter={() => setHoveredTabId(tab.id)}
                          onMouseLeave={() => setHoveredTabId(null)}
                          title={tab.title}
                        >
                          {isActive && (
                            <motion.div 
                              layoutId="activeTabIndicator"
                              className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[var(--accent-primary)] rounded-r-full shadow-[0_0_8px_var(--accent-primary)]" 
                              transition={{ type: "spring", stiffness: 400, damping: 30 }}
                            />
                          )}
                          <div className={`flex-shrink-0 flex items-center justify-center w-6 h-6 transition-transform duration-300 ${isHoveredTab && !isActive ? 'scale-110' : ''}`}>
                            {tab.loading ? (
                              <div className="w-4 h-4 border-2 border-[var(--text-tertiary)] border-t-transparent rounded-full animate-spin" />
                            ) : tab.favicon ? (
                              <img src={tab.favicon} className="w-4 h-4 rounded-md shadow-sm" alt="" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                            ) : (
                              <Globe size={16} className="opacity-70" />
                            )}
                          </div>

                          <AnimatePresence>
                            {isHovered && (
                              <motion.div 
                                initial={{ opacity: 0, width: 0 }}
                                animate={{ opacity: 1, width: 'auto' }}
                                exit={{ opacity: 0, width: 0 }}
                                className="flex-1 flex items-center justify-between ml-3 min-w-0 overflow-hidden"
                              >
                                <div className="flex-1 flex items-center gap-1.5 truncate">
                                  {tab.pinned && <div className="w-1.5 h-1.5 rounded-full bg-[var(--text-secondary)] flex-shrink-0" />}
                                  <span className="truncate text-[13px]">{tab.title}</span>
                                  {isSplit && <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-indigo-500/20 text-indigo-400 flex-shrink-0">Split</span>}
                                </div>

                                <div className="flex items-center gap-1 flex-shrink-0 px-1 rounded-full">
                                  {tab.mediaPlaying && !tab.muted && <Volume2 size={12} className="text-[var(--text-tertiary)] animate-pulse" />}
                                  {tab.muted && <VolumeX size={12} className="text-red-400" />}
                                </div>

                                <button
                                  className={`flex-shrink-0 h-6 w-6 ml-1 flex items-center justify-center rounded-lg transition-all duration-200
                                    ${isHoveredTab || isActive ? 'opacity-100 scale-100' : 'opacity-0 scale-75'} 
                                    hover:bg-[var(--danger-surface)] text-[var(--text-tertiary)] hover:text-red-500`}
                                  onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }}
                                >
                                  <X size={14} />
                                </button>
                              </motion.div>
                            )}
                          </AnimatePresence>
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
      </div>

      <div className="px-3 pb-4 pt-1 flex justify-center">
        <button 
          onClick={() => addTab()}
          className="w-full h-10 flex items-center justify-center gap-3 rounded-xl text-[var(--text-secondary)] transition-all hover:bg-[var(--surface-icon-bg)] hover:text-[var(--text-primary)] no-drag font-medium"
          title="New Tab (Ctrl+T)"
        >
          <Plus size={16} />
          {isHovered && <span className="text-[13px] tracking-wide">New Tab</span>}
        </button>
      </div>

    </motion.div>
  );
}
