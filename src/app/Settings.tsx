'use client';

import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Shield, Fingerprint, Network, LayoutGrid, Search, Trash2, Plus, GripVertical, Globe, Settings2, DownloadCloud, UploadCloud, Info } from 'lucide-react';
import { BrowserSettings, ShortcutItem, useBrowserStore } from '@/lib/store';

interface SettingsProps { settings: BrowserSettings; onToggle: (key: string, value?: any) => Promise<void>; }

const DEFAULT_LUCIDE_ICONS = ['Globe', 'Search', 'Mail', 'MessageCircle', 'Phone', 'Camera', 'Video', 'Music', 'Image', 'FileText', 'Folder', 'Box', 'LayoutGrid', 'List', 'Github', 'Twitter', 'Facebook', 'Youtube', 'Linkedin', 'Instagram', 'Figma', 'Framer', 'Slack', 'Trello', 'Heart', 'Star', 'Bookmark', 'Check', 'AlertCircle', 'Info', 'HelpCircle', 'Settings', 'User', 'Users', 'Home', 'Map', 'Navigation', 'Compass', 'Clock', 'Calendar', 'Watch', 'Bell', 'Volume2', 'Mic', 'Headphones', 'Battery', 'Wifi', 'Bluetooth', 'Cast', 'Monitor', 'Smartphone', 'Tablet', 'Laptop', 'Cpu', 'Database', 'Server', 'Cloud', 'Lock', 'Unlock', 'Key', 'Shield', 'Power', 'Sun', 'Moon', 'CloudRain', 'Wind', 'Thermometer', 'Droplet', 'Activity', 'TrendingUp', 'TrendingDown', 'BarChart', 'PieChart', 'Briefcase', 'ShoppingCart', 'CreditCard', 'Gift', 'Tag', 'PenTool', 'Edit', 'Scissors', 'Copy', 'Clipboard', 'Archive', 'Trash', 'Send', 'Paperclip', 'Link', 'Share', 'Download', 'Upload', 'Maximize', 'Minimize', 'ZoomIn', 'ZoomOut', 'RefreshCw', 'RotateCcw', 'RotateCw', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ChevronUp', 'ChevronDown', 'ChevronLeft', 'ChevronRight', 'Menu', 'MoreHorizontal', 'MoreVertical', 'Grid', 'List', 'Maximize2', 'Minimize2', 'Move', 'Crosshair', 'Target', 'Filter', 'Sliders', 'ToggleLeft', 'ToggleRight', 'Command', 'Hash', 'AtSign', 'Percent', 'DollarSign', 'Code', 'Terminal', 'Cpu', 'Cpu', 'Database', 'Server', 'HardDrive', 'Disc', 'Save', 'Camera', 'Video', 'Film', 'Monitor', 'Smartphone', 'Tablet', 'Laptop', 'Watch', 'Battery', 'BatteryCharging', 'Wifi', 'WifiOff', 'Bluetooth', 'Cast', 'Speaker', 'Headphones', 'Mic', 'MicOff', 'VolumeX', 'Volume1', 'Volume2', 'Bell', 'BellOff', 'Clock', 'AlarmClock', 'Calendar', 'Map', 'MapPin', 'Navigation', 'Compass', 'Crosshair', 'Thermometer', 'Droplet', 'Wind', 'Cloud', 'CloudRain', 'CloudSnow', 'CloudLightning', 'CloudDrizzle', 'Sun', 'Moon', 'Sunrise', 'Sunset', 'Umbrella', 'Activity', 'Heart', 'Star', 'Bookmark', 'Tag', 'Gift', 'ShoppingCart', 'CreditCard', 'Briefcase', 'Package', 'Inbox', 'Archive', 'Trash', 'Trash2', 'File', 'FileText', 'FilePlus', 'FileMinus', 'Folder', 'FolderPlus', 'FolderMinus', 'Image', 'Music', 'Video', 'Film', 'Camera', 'Link', 'Link2', 'Paperclip', 'Scissors', 'Copy', 'Clipboard', 'Edit', 'Edit2', 'Edit3', 'PenTool', 'Feather', 'Type', 'Bold', 'Italic', 'Underline', 'StrikeThrough', 'AlignLeft', 'AlignCenter', 'AlignRight', 'AlignJustify', 'List', 'CheckSquare', 'Square', 'Circle', 'Triangle', 'Hexagon', 'Octagon', 'Check', 'CheckCircle', 'X', 'XCircle', 'Plus', 'PlusCircle', 'PlusSquare', 'Minus', 'MinusCircle', 'MinusSquare', 'Info', 'HelpCircle', 'AlertCircle', 'AlertTriangle', 'User', 'UserPlus', 'UserMinus', 'UserCheck', 'UserX', 'Users', 'Smile', 'Frown', 'Meh', 'Eye', 'EyeOff', 'Lock', 'Unlock', 'Key', 'Shield', 'ShieldOff', 'Power', 'LogOut', 'LogIn', 'Settings', 'Sliders', 'Tool', 'Wrench', 'Hammer', 'Menu', 'MoreHorizontal', 'MoreVertical', 'Grid', 'Maximize', 'Minimize', 'Maximize2', 'Minimize2', 'Move', 'ZoomIn', 'ZoomOut', 'Search', 'Hash', 'AtSign', 'Percent', 'DollarSign', 'Command', 'Terminal', 'Code', 'GitBranch', 'GitCommit', 'GitMerge', 'GitPullRequest', 'Github', 'Gitlab', 'Trello', 'Figma', 'Framer', 'Codesandbox', 'Codepen', 'Slack', 'Twitch', 'Twitter', 'Facebook', 'Instagram', 'Linkedin', 'Youtube', 'Dribbble', 'Chrome', 'Firefox', 'Compass', 'Map', 'Navigation', 'Home', 'Globe', 'Mail', 'MessageCircle', 'MessageSquare', 'Phone', 'PhoneCall', 'PhoneForwarded', 'PhoneIncoming', 'PhoneMissed', 'PhoneOff', 'PhoneOutgoing', 'Printer', 'Cast', 'Airplay', 'Wifi', 'WifiOff', 'Bluetooth', 'Battery', 'BatteryCharging', 'Watch', 'Tablet', 'Smartphone', 'Monitor', 'Laptop', 'Cpu', 'Database', 'HardDrive', 'Server', 'Save', 'Disc', 'Camera', 'Video', 'Film', 'Music', 'Image', 'Mic', 'MicOff', 'VolumeX', 'Volume1', 'Volume2', 'Headphones', 'Speaker', 'Bell', 'BellOff', 'Calendar', 'Clock', 'AlarmClock', 'Cloud', 'CloudDrizzle', 'CloudLightning', 'CloudRain', 'CloudSnow', 'Moon', 'Sun', 'Sunrise', 'Sunset', 'Thermometer', 'Umbrella', 'Wind', 'Droplet', 'Activity', 'Heart', 'Star', 'Bookmark', 'Tag', 'Gift', 'ShoppingCart', 'CreditCard', 'Briefcase', 'Package', 'Inbox', 'Archive', 'Trash', 'Trash2', 'File', 'FileText', 'FilePlus', 'FileMinus', 'Folder', 'FolderPlus', 'FolderMinus', 'Link', 'Link2', 'Paperclip', 'Scissors', 'Copy', 'Clipboard', 'Edit', 'Edit2', 'Edit3', 'PenTool', 'Feather', 'Type', 'Bold', 'Italic', 'Underline', 'StrikeThrough', 'AlignLeft', 'AlignCenter', 'AlignRight', 'AlignJustify', 'List', 'CheckSquare', 'Square', 'Circle', 'Triangle', 'Hexagon', 'Octagon', 'Check', 'CheckCircle', 'X', 'XCircle', 'Plus', 'PlusCircle', 'PlusSquare', 'Minus', 'MinusCircle', 'MinusSquare', 'Info', 'HelpCircle', 'AlertCircle', 'AlertTriangle', 'User', 'UserPlus', 'UserMinus', 'UserCheck', 'UserX', 'Users', 'Smile', 'Frown', 'Meh', 'Eye', 'EyeOff', 'Lock', 'Unlock', 'Key', 'Shield', 'ShieldOff', 'Power', 'LogOut', 'LogIn', 'Settings', 'Sliders', 'Tool', 'Wrench', 'Hammer', 'Menu', 'MoreHorizontal', 'MoreVertical', 'Grid', 'Maximize', 'Minimize', 'Maximize2', 'Minimize2', 'Move', 'ZoomIn', 'ZoomOut', 'Search', 'Hash', 'AtSign', 'Percent', 'DollarSign', 'Command', 'Terminal', 'Code', 'GitBranch', 'GitCommit', 'GitMerge', 'GitPullRequest', 'Github', 'Gitlab', 'Trello', 'Figma', 'Framer', 'Codesandbox', 'Codepen', 'Slack', 'Twitch', 'Twitter', 'Facebook', 'Instagram', 'Linkedin', 'Youtube', 'Dribbble', 'Chrome', 'Firefox', 'Compass', 'Map', 'Navigation', 'Home', 'Globe', 'Mail', 'MessageCircle', 'MessageSquare', 'Phone', 'PhoneCall', 'PhoneForwarded', 'PhoneIncoming', 'PhoneMissed', 'PhoneOff', 'PhoneOutgoing', 'Printer', 'Cast', 'Airplay'].slice(0, 50); // Just a subset for simplicity


function Toggle({ on, loading, onClick }: { on: boolean; loading: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`relative w-11 h-6 rounded-full transition-all duration-300 flex-shrink-0 ${on ? 'bg-[var(--accent-primary)] shadow-inner' : 'bg-[var(--surface-icon-bg)] shadow-inner border border-[var(--border-color)]'}`}
      style={{ opacity: loading ? 0.5 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
    >
      <div
        className="absolute top-[3px] w-[18px] h-[18px] rounded-full bg-white shadow-sm transition-all duration-300"
        style={{ left: on ? '23px' : '3px' }}
      />
    </button>
  );
}

export default function Settings({ settings, onToggle }: SettingsProps) {
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const torLogs = useBrowserStore(s => s.torLogs);
  const torStatus = settings.torStatus || 'disconnected';

  const [newShortcut, setNewShortcut] = useState<ShortcutItem>({ id: '', name: '', url: '', icon: 'Globe', color: 'slate-800' });
  const [shortcutModalType, setShortcutModalType] = useState<'sidebarApps' | 'newTabShortcuts' | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ title: string, message: string, onConfirm: () => void } | null>(null);

  const handleToggle = async (key: string, val?: any) => {
    if (loadingKey) return;
    setLoadingKey(key);
    try { await onToggle(key, val); } finally { setLoadingKey(null); }
  };

  const addShortcut = (type: 'sidebarApps' | 'newTabShortcuts') => {
    if (!newShortcut.name || !newShortcut.url) return;
    const item = { ...newShortcut, id: Math.random().toString(36).substring(7) };
    onToggle(type, [...settings[type], item]);
    setNewShortcut({ id: '', name: '', url: '', icon: 'Globe', color: 'slate-800' });
  };

  const removeShortcut = (type: 'sidebarApps' | 'newTabShortcuts', id: string) => {
    onToggle(type, settings[type].filter(i => i.id !== id));
  };

  const handleClearHistory = () => {
    setConfirmModal({
      title: 'Clear History',
      message: 'Are you sure you want to clear your browsing history? This action cannot be undone.',
      onConfirm: () => {
        invoke('clear_history').catch(console.error);
        useBrowserStore.getState().addToast('Browsing history cleared', 'success');
      }
    });
  };

  const handleExportSettings = () => {
    const jsonStr = JSON.stringify(settings, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute('href', url);
    downloadAnchorNode.setAttribute('download', 'veil_settings.json');
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    useBrowserStore.getState().addToast('Settings exported to downloads', 'success');
  };

  const handleImportSettings = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        useBrowserStore.getState().updateSettings(imported);
        useBrowserStore.getState().addToast('Settings imported successfully', 'success');
      } catch (err) {
        useBrowserStore.getState().addToast('Failed to import settings', 'warning');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-8 space-y-12 pb-20">
      <div className="mb-8">
        <h1 className="text-3xl font-light tracking-tight text-[var(--text-primary)] mb-2" style={{ textShadow: '1px 1px 2px var(--neu-light)' }}>Browser Settings</h1>
        <p className="text-[var(--text-secondary)]">Customize your browsing experience and privacy controls.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* PRIVACY & TRACKING */}
        <section className="glass-panel p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-[var(--accent-surface)] rounded-xl text-[var(--accent-primary)] border border-[var(--border-color)]"><Shield size={20} /></div>
            <h2 className="text-lg font-medium text-[var(--text-primary)]">Privacy & Tracking</h2>
          </div>
          <div className="space-y-6">
            {[
              { key: 'adBlocker', label: 'Ad & Tracker Blocker', desc: 'Blocks ads, trackers, and malware domains.' },
              { key: 'stripReferer', label: 'Strip Referer Headers', desc: 'Prevents sites from knowing your origin page.' },
              { key: 'blockCookies', label: 'Block 3rd-Party Cookies', desc: 'Prevents cross-site tracking via cookies.' }
            ].map(item => (
              <div key={item.key} className="flex items-center justify-between">
                <div className="pr-4">
                  <div className="font-medium text-[var(--text-primary)] text-sm">{item.label}</div>
                  <div className="text-xs text-[var(--text-secondary)] mt-1">{item.desc}</div>
                </div>
                <Toggle on={!!(settings as any)[item.key]} loading={loadingKey === item.key} onClick={() => handleToggle(item.key)} />
              </div>
            ))}
          </div>
        </section>

        {/* NETWORK & FINGERPRINTING */}
        <section className="glass-panel p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-[var(--accent-surface)] rounded-xl text-[var(--accent-primary)] border border-[var(--border-color)]"><Network size={20} /></div>
            <h2 className="text-lg font-medium text-[var(--text-primary)]">Network Security</h2>
          </div>
          <div className="space-y-6">
            {/* Tor Mode - Featured Toggle */}
            <div className="flex items-center justify-between p-4 rounded-xl border" style={{ background: settings.torMode ? 'rgba(34, 197, 94, 0.08)' : 'rgba(0,0,0,0.02)', borderColor: settings.torMode ? 'rgba(34, 197, 94, 0.3)' : 'var(--glass-border, rgba(0,0,0,0.06))' }}>
              <div className="pr-4">
                <div className="font-medium text-[var(--text-primary)] text-sm flex items-center gap-2">
                  🧅 Tor Network Mode
                  {settings.torMode && torStatus === 'connected' && <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-green-500/20 text-green-600">Connected</span>}
                  {settings.torMode && torStatus === 'connecting' && <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-600 animate-pulse">Connecting</span>}
                </div>
                <div className="text-xs text-[var(--text-secondary)] mt-1">Route all traffic through the Tor network for maximum anonymity. Slower but untraceable.</div>
                {settings.torMode && torStatus === 'connecting' && torLogs.length > 0 && (
                  <div className="text-[10px] text-[var(--accent)] mt-2 font-mono whitespace-nowrap overflow-hidden text-ellipsis">
                    {torLogs[torLogs.length - 1]}
                  </div>
                )}
              </div>
              <Toggle on={!!settings.torMode} loading={loadingKey === 'torMode'} onClick={() => handleToggle('torMode')} />
            </div>

            {[
              { key: 'dnsOverHttps', label: 'DNS-over-HTTPS', desc: 'Encrypts DNS queries via Cloudflare (1.1.1.1)' },
              { key: 'httpsOnly', label: 'HTTPS-only mode', desc: 'Upgrade all connections to HTTPS.' },
              { key: 'blockWebRTC', label: 'Block WebRTC IP Leak', desc: 'Prevents websites from detecting your real IP.' },
              { key: 'canvasNoise', label: 'Canvas Fingerprint Noise', desc: 'Injects random noise into canvas reads.' }
            ].map(item => (
              <div key={item.key} className="flex items-center justify-between">
                <div className="pr-4">
                  <div className="font-medium text-[var(--text-primary)] text-sm">{item.label}</div>
                  <div className="text-xs text-[var(--text-secondary)] mt-1">{item.desc}</div>
                </div>
                <Toggle on={!!(settings as any)[item.key]} loading={loadingKey === item.key} onClick={() => handleToggle(item.key)} />
              </div>
            ))}
          </div>
        </section>

        {/* CUSTOMIZATION */}
        <section className="glass-panel p-6 md:col-span-2">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 bg-[var(--accent-surface)] rounded-xl text-[var(--accent-primary)] border border-[var(--border-color)]"><LayoutGrid size={20} /></div>
            <h2 className="text-lg font-medium text-[var(--text-primary)]">UI Customization</h2>
          </div>

          <div className="space-y-10">
            {/* Appearance */}
            <div className="mb-10">
              <h3 className="text-sm font-semibold text-[var(--text-secondary)] mb-4 uppercase tracking-wider">Appearance</h3>
              <div className="flex items-center justify-between p-5 rounded-2xl border border-[var(--border-color)] bg-[var(--surface-icon-bg)] shadow-sm">
                <div className="pr-4">
                  <div className="font-semibold text-[var(--text-primary)] text-base">Dark Mode</div>
                  <div className="text-sm text-[var(--text-secondary)] mt-1">Toggle between light and dark themes.</div>
                </div>
                <Toggle on={!!settings.darkMode} loading={loadingKey === 'darkMode'} onClick={() => handleToggle('darkMode')} />
              </div>
            </div>

            {/* Search Engine */}
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-secondary)] mb-4 uppercase tracking-wider">Default Search Engine</h3>
              <div className="flex flex-wrap gap-4">
                {['yahoo', 'duckduckgo', 'google', 'bing', 'brave'].map(engine => (
                  <button
                    key={engine}
                    onClick={() => handleToggle('searchEngine', engine)}
                    className={`px-6 py-3 rounded-xl text-sm font-medium capitalize transition-all ${settings.searchEngine === engine ? 'glass-btn-accent shadow-md' : 'glass-btn text-[var(--text-primary)]'}`}
                  >
                    {engine}
                  </button>
                ))}
              </div>
            </div>

            {/* Default Zoom */}
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-secondary)] mb-4 uppercase tracking-wider">Default Zoom Level</h3>
              <div className="flex flex-wrap gap-4">
                {[80, 90, 100, 110, 125, 150].map(zoom => (
                  <button
                    key={zoom}
                    onClick={() => handleToggle('defaultZoom', zoom)}
                    className={`px-6 py-3 rounded-xl text-sm font-medium transition-all ${settings.defaultZoom === zoom || (!settings.defaultZoom && zoom === 100) ? 'glass-btn-accent shadow-md' : 'glass-btn text-[var(--text-primary)]'}`}
                  >
                    {zoom}%
                  </button>
                ))}
              </div>
            </div>

            {/* New Tab Shortcuts Management */}
            <div className="flex flex-col gap-8 w-full max-w-4xl">
              <div className="glass-panel rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-[var(--text-secondary)] mb-5 uppercase tracking-wider pl-2">New Tab Speed Dials</h3>
                <div className="space-y-4 mb-6">
                  {settings.newTabShortcuts.map(app => (
                    <div key={app.id} className="flex items-center justify-between glass-panel p-3">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[var(--surface-icon-bg)] shadow-sm text-[var(--text-secondary)]"><Globe size={18}/></div>
                        <div>
                          <div className="text-sm font-medium text-[var(--text-primary)]">{app.name}</div>
                          <div className="text-xs text-[var(--text-secondary)] truncate max-w-[150px] mt-1">{app.url}</div>
                        </div>
                      </div>
                      <button onClick={() => removeShortcut('newTabShortcuts', app.id)} className="text-red-400 hover:text-red-500 p-2 glass-btn rounded-full mr-1"><Trash2 size={16}/></button>
                    </div>
                  ))}
                </div>
                <button onClick={() => setShortcutModalType('newTabShortcuts')} className="w-full py-4 rounded-xl glass-btn text-[var(--text-secondary)] font-medium flex items-center justify-center gap-2 hover:bg-[var(--surface-icon-hover)]">
                  <Plus size={18}/> Add Speed Dial
                </button>
              </div>
            </div>

          </div>
        </section>

        {/* ADVANCED & DATA */}
        <section className="glass-panel p-6 md:col-span-2">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-[var(--accent-surface)] rounded-xl text-[var(--accent-primary)] border border-[var(--border-color)]"><Settings2 size={20} /></div>
            <h2 className="text-lg font-medium text-[var(--text-primary)]">Advanced & Data</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-[var(--text-secondary)] mb-2 uppercase tracking-wider">Browsing Data</h3>
                <p className="text-xs text-[var(--text-tertiary)] mb-4">Clear your local browsing history and cache.</p>
                <button 
                  onClick={handleClearHistory}
                  className="px-6 py-3 rounded-xl text-sm font-medium bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all flex items-center gap-2"
                >
                  <Trash2 size={16} /> Clear Browsing History
                </button>
              </div>
              
              <div>
                <h3 className="text-sm font-semibold text-[var(--text-secondary)] mb-2 uppercase tracking-wider">Sync & Backup</h3>
                <p className="text-xs text-[var(--text-tertiary)] mb-4">Export or import your settings, bookmarks, and shortcuts.</p>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={handleExportSettings}
                    className="px-6 py-3 rounded-xl text-sm font-medium glass-btn text-[var(--text-primary)] transition-all flex items-center gap-2"
                  >
                    <DownloadCloud size={16} /> Export
                  </button>
                  <label className="px-6 py-3 rounded-xl text-sm font-medium glass-btn text-[var(--text-primary)] transition-all flex items-center gap-2 cursor-pointer">
                    <UploadCloud size={16} /> Import
                    <input type="file" accept=".json" className="hidden" onChange={handleImportSettings} />
                  </label>
                </div>
              </div>
            </div>

            <div className="glass-panel rounded-2xl p-6 flex flex-col justify-center items-center text-center">
              <div className="w-16 h-16 rounded-full glass-btn text-[var(--accent-primary)] flex items-center justify-center mb-4">
                <Info size={32} />
              </div>
              <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1">Veil Browser</h3>
              <p className="text-sm text-[var(--text-secondary)] mb-4">Version 0.1.0 (Beta)</p>
              <p className="text-xs text-[var(--text-tertiary)] max-w-[200px] leading-relaxed">
                An open-source, privacy-first browser engineered for speed and security.
              </p>
            </div>
          </div>
        </section>

      </div>
      
      {/* Shortcut Modal */}
      {shortcutModalType && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
          <div className="glass-panel-heavy p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold text-[var(--text-primary)] mb-4 tracking-tight">
              {shortcutModalType === 'sidebarApps' ? 'Add Sidebar App' : 'Add Speed Dial'}
            </h3>
            <div className="flex flex-col gap-3">
              <input
                type="text"
                placeholder="Name (e.g., GitHub)"
                value={newShortcut.name}
                onChange={e => setNewShortcut({ ...newShortcut, name: e.target.value })}
                className="w-full glass-input border border-[var(--border-color)] rounded-xl px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none focus:border-[var(--accent-primary)] focus:bg-[var(--bg-element)] transition-all"
                autoFocus
              />
              <input
                type="url"
                placeholder="URL (https://...)"
                value={newShortcut.url}
                onChange={e => setNewShortcut({ ...newShortcut, url: e.target.value })}
                className="w-full glass-input border border-[var(--border-color)] rounded-xl px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none focus:border-[var(--accent-primary)] focus:bg-[var(--bg-element)] transition-all"
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    addShortcut(shortcutModalType);
                    setShortcutModalType(null);
                  }
                }}
              />
              <div className="flex justify-end gap-2 mt-2">
                <button 
                  onClick={() => {
                    setShortcutModalType(null);
                    setNewShortcut({ id: '', name: '', url: '', icon: 'Globe', color: 'slate-800' });
                  }} 
                  className="px-4 py-2 rounded-xl text-sm font-medium glass-btn text-[var(--text-secondary)] hover:bg-[var(--surface-icon-hover)] transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    addShortcut(shortcutModalType);
                    setShortcutModalType(null);
                  }}
                  className="px-4 py-2 rounded-xl text-sm font-medium glass-btn-accent shadow-md transition-all"
                >
                  Add Shortcut
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
          <div className="glass-panel-heavy p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2 tracking-tight">
              {confirmModal.title}
            </h3>
            <p className="text-sm text-[var(--text-secondary)] mb-6">
              {confirmModal.message}
            </p>
            <div className="flex justify-end gap-2 mt-2">
              <button 
                onClick={() => setConfirmModal(null)} 
                className="px-4 py-2 rounded-xl text-sm font-medium glass-btn text-[var(--text-secondary)] hover:bg-[var(--surface-icon-hover)] transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  confirmModal.onConfirm();
                  setConfirmModal(null);
                }}
                className="px-4 py-2 rounded-xl text-sm font-medium glass-btn-accent shadow-md transition-all text-red-50"
                style={{ background: 'var(--danger)' }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
