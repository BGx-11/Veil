'use client';

import React from 'react';
import { Shield, Fingerprint, Network, Palette, ListX, Trash2, Plus } from 'lucide-react';

interface SettingsProps { settings: any; onToggle: (key: string, value?: any) => Promise<void>; }

const sections = [
  {
    title: 'Privacy & Tracking',
    icon: <Shield size={18} />,
    iconColor: 'var(--accent-primary)',
    items: [
      { key: 'normalMode', label: 'Normal Browsing Mode', desc: 'Allows persistent cookies and sessions for sites like YouTube (requires restart)' },
      { key: 'adBlocker', label: 'Ad & Tracker Blocker', desc: 'Blocks ads, trackers, and malware domains (Ghostery engine)' },
      { key: 'stripReferer', label: 'Strip Referer Headers', desc: 'Prevents sites from knowing which page you came from' },
      { key: 'blockCookies', label: 'Block 3rd-Party Cookies', desc: 'Prevents cross-site tracking via cookies' },
    ],
  },
  {
    title: 'Fingerprint Resistance',
    icon: <Fingerprint size={18} />,
    iconColor: 'var(--accent-secondary)',
    items: [
      { key: 'canvasNoise', label: 'Canvas Fingerprint Noise', desc: 'Injects random noise into canvas reads to prevent fingerprinting' },
      { key: 'blockWebRTC', label: 'Block WebRTC IP Leak', desc: 'Prevents websites from detecting your real IP via WebRTC' },
    ],
  },
  {
    title: 'Network',
    icon: <Network size={18} />,
    iconColor: 'var(--accent-success)',
    items: [
      { key: 'dnsOverHttps', label: 'DNS-over-HTTPS', desc: 'Encrypts DNS queries via Cloudflare (1.1.1.1)' },
      { key: 'torMode', label: 'Tor Routing', desc: 'Route all traffic through the Tor network (requires tor.exe in PATH)' },
      { key: 'httpsOnly', label: 'HTTPS-only mode', desc: 'Upgrade all connections to HTTPS, block sites that refuse' },
    ],
  },
  {
    title: 'Website Blocker',
    icon: <ListX size={18} />,
    iconColor: 'var(--accent-danger)',
    items: [],
    customRender: true,
  },
  {
    title: 'Appearance',
    icon: <Palette size={18} />,
    iconColor: 'var(--accent-warning)',
    items: [
      { key: 'darkMode', label: 'Dark Mode', desc: 'Switch between dark and light themes' },
    ],
  },
];

function Toggle({ on, loading, onClick }: { on: boolean; loading: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`relative w-12 h-6 rounded-full transition-all duration-300 flex-shrink-0 ${on ? 'shadow-[var(--glow-primary)]' : ''}`}
      style={{
        background: on ? 'var(--accent-primary)' : 'var(--surface-icon-bg)',
        opacity: loading ? 0.5 : 1,
        cursor: loading ? 'not-allowed' : 'pointer',
      }}
    >
      <div
        className="absolute top-[2px] w-[20px] h-[20px] rounded-full transition-all duration-300 bg-white"
        style={{
          left: on ? '26px' : '2px',
          boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
        }}
      />
    </button>
  );
}

export default function Settings({ settings, onToggle }: SettingsProps) {
  const [loadingKey, setLoadingKey] = React.useState<string | null>(null);
  const [newBlock, setNewBlock] = React.useState('');

  const addBlock = () => {
    if (newBlock.trim()) {
      const list = settings.blocklist || [];
      if (!list.includes(newBlock.trim())) onToggle('blocklist', [...list, newBlock.trim()]);
      setNewBlock('');
    }
  };

  const removeBlock = (domain: string) => {
    onToggle('blocklist', (settings.blocklist || []).filter((d: string) => d !== domain));
  };

  const handleToggle = async (key: string) => {
    if (loadingKey) return;
    setLoadingKey(key);
    try { await onToggle(key); } finally { setLoadingKey(null); }
  };

  return (
    <div className="w-full overflow-y-auto px-8 py-10">
      <h2 className="text-2xl font-bold mb-8 text-[var(--text-primary)] tracking-tight">Settings</h2>

      {sections.map((sec) => (
        <div
          key={sec.title}
          className="mb-6 rounded-3xl p-6 transition-all duration-300 bg-[var(--bg-element)]/60 backdrop-blur-xl border border-[var(--border-color)] shadow-sm"
        >
          {/* Section header */}
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[var(--surface-icon-bg)]" style={{ color: sec.iconColor }}>
              {sec.icon}
            </div>
            <span className="text-lg font-semibold text-[var(--text-primary)] tracking-wide">{sec.title}</span>
          </div>

          {sec.customRender ? (
            <div className="flex flex-col gap-4">
              <p className="text-sm text-[var(--text-secondary)]">
                Enter domains to block completely (e.g. facebook.com).
              </p>
              <div className="flex gap-3">
                <input
                  type="text" placeholder="e.g. example.com" value={newBlock}
                  onChange={e => setNewBlock(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addBlock()}
                  className="flex-1 px-4 py-3 rounded-xl text-sm bg-[var(--surface-icon-bg)] border border-[var(--border-color)] text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-primary)]/20 transition-all"
                />
                <button
                  onClick={addBlock}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] transition-all shadow-[var(--glow-primary)] hover:scale-105 active:scale-95"
                >
                  <Plus size={16} /> Add
                </button>
              </div>
              <div className="flex flex-col gap-2 mt-2">
                {(settings.blocklist || []).map((domain: string) => (
                  <div
                    key={domain}
                    className="flex items-center justify-between px-4 py-3 rounded-xl bg-[var(--surface-icon-bg)] border border-[var(--border-color)] transition-all hover:bg-[var(--surface-icon-hover)]"
                  >
                    <span className="text-sm font-medium text-[var(--text-secondary)]">{domain}</span>
                    <button onClick={() => removeBlock(domain)} className="text-[var(--accent-danger)] opacity-70 hover:opacity-100 transition-opacity p-1 hover:bg-[var(--accent-danger)]/10 rounded-md">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {sec.items.map((item) => (
                <div
                  key={item.key}
                  className="flex items-center justify-between py-4 px-4 rounded-xl transition-colors hover:bg-[var(--surface-icon-bg)]"
                >
                  <div className="flex-1 min-w-0 mr-6">
                    <div className="text-base font-medium text-[var(--text-primary)]">{item.label}</div>
                    <div className="text-sm mt-1 text-[var(--text-secondary)] leading-relaxed">{item.desc}</div>
                  </div>
                  <Toggle
                    on={!!(settings as any)[item.key]}
                    loading={loadingKey === item.key}
                    onClick={() => handleToggle(item.key)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
