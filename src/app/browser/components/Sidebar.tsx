import React from 'react';
import { Sparkles, Diamond, MessageCircle, Phone, Heart, Clock, MoreHorizontal, User, FileText, LayoutGrid, Globe } from 'lucide-react';
import { useBrowserStore } from '@/lib/store';

const iconMap: Record<string, any> = {
  Sparkles, Diamond, MessageCircle, Phone, Heart, Clock, MoreHorizontal, User, FileText, LayoutGrid, Globe
};

export default function Sidebar() {
  const settings = useBrowserStore(state => state.settings);
  const addTab = useBrowserStore(state => state.addTab);

  return (
    <div className="w-16 h-full flex flex-col items-center py-4 flex-shrink-0 z-50">
      
      {/* Top Profile Icon */}
      <div className="flex flex-col items-center gap-4 mt-2">
        <button className="w-10 h-10 rounded-full flex items-center justify-center glass-btn text-[var(--text-secondary)]">
          <User size={20} />
        </button>
      </div>

      {/* Dynamic Apps from Settings */}
      <div className="flex flex-col items-center gap-4 mt-6">
        {(settings.sidebarApps || []).map((app) => {
          const IconComponent = iconMap[app.icon] || Globe;
          // Map tailwind color classes properly since dynamic text-${color} might get purged
          let colorClass = 'text-indigo-500';
          if (app.color?.includes('orange')) colorClass = 'text-orange-400';
          if (app.color?.includes('purple')) colorClass = 'text-purple-400';
          if (app.color?.includes('indigo')) colorClass = 'text-indigo-400';
          if (app.color?.includes('sky')) colorClass = 'text-sky-400';
          
          return (
            <div key={app.id} className="relative group flex items-center justify-center">
              <button 
                onClick={() => {
                  if (app.url === 'veil://slm') {
                    useBrowserStore.getState().setSlmOpen(true);
                  } else {
                    addTab(app.url);
                  }
                }}
                className={`w-10 h-10 rounded-xl flex items-center justify-center glass-btn ${colorClass} transition-all hover:scale-110`}
              >
                <IconComponent size={20} />
              </button>
              
              {/* Tooltip */}
              <div className="absolute left-14 opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 translate-x-[-10px] group-hover:translate-x-0 z-[100]">
                <div className="px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap shadow-lg"
                     style={{ background: 'var(--glass-bg-heavy)', border: '1px solid var(--glass-border)' }}>
                  {app.name}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Middle Spacer */}
      <div className="flex-1" />

      {/* Bottom Icons (Tools / Utility) */}
      <div className="flex flex-col items-center gap-4 mb-2">
        <button 
          onClick={() => addTab('veil://bookmarks')}
          title="Bookmarks"
          className="w-10 h-10 rounded-full flex items-center justify-center glass-btn text-[var(--text-secondary)]"
        >
          <Heart size={20} />
        </button>
        <button 
          onClick={() => addTab('veil://history')}
          title="History"
          className="w-10 h-10 rounded-full flex items-center justify-center glass-btn text-[var(--text-secondary)]"
        >
          <Clock size={20} />
        </button>
        <button 
          onClick={() => {
            const url = 'veil://settings';
            addTab(url); 
          }}
          title="Settings"
          className="w-10 h-10 rounded-full flex items-center justify-center glass-btn text-[var(--text-secondary)]"
        >
          <MoreHorizontal size={20} />
        </button>
      </div>

    </div>
  );
}
