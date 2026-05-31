'use client';

import React from 'react';

interface SettingsProps {
  settings: any;
  onToggle: (key: string, value?: any) => Promise<void>;
}

import { Shield, Fingerprint, Network, Palette, ListX, Trash2, Plus } from 'lucide-react';

const sections = [
  {
    title: 'Privacy & Tracking',
    icon: <Shield size={18} color="var(--accent)" />,
    items: [
      { key: 'adBlocker', label: 'Ad & Tracker Blocker', desc: 'Blocks ads, trackers, and malware domains (Ghostery engine)' },
      { key: 'stripReferer', label: 'Strip Referer Headers', desc: 'Prevents sites from knowing which page you came from' },
      { key: 'blockCookies', label: 'Block 3rd-Party Cookies', desc: 'Prevents cross-site tracking via cookies' },
    ],
  },
  {
    title: 'Fingerprint Resistance',
    icon: <Fingerprint size={18} color="var(--purple)" />,
    items: [
      { key: 'canvasNoise', label: 'Canvas Fingerprint Noise', desc: 'Injects random noise into canvas reads to prevent fingerprinting' },
      { key: 'blockWebRTC', label: 'Block WebRTC IP Leak', desc: 'Prevents websites from detecting your real IP via WebRTC' },
    ],
  },
  {
    title: 'Network',
    icon: <Network size={18} color="var(--cyan)" />,
    items: [
      { key: 'dnsOverHttps', label: 'DNS-over-HTTPS', desc: 'Encrypts DNS queries via Cloudflare (1.1.1.1)' },
      { key: 'torMode', label: 'Tor Routing', desc: 'Route all traffic through the Tor network (requires tor.exe in PATH)' },
      { key: 'httpsOnly', label: 'HTTPS-only mode', desc: 'Upgrade all connections to HTTPS, block sites that refuse' },
    ],
  },
  {
    title: 'Custom Website Blocker',
    icon: <ListX size={18} color="var(--red)" />,
    items: [],
    customRender: true,
  },
  {
    title: 'Appearance',
    icon: <Palette size={18} color="var(--orange)" />,
    items: [
      { key: 'darkMode', label: 'Dark Mode', desc: 'Switch between dark and light themes' },
    ],
  },
];

export default function Settings({ settings, onToggle }: SettingsProps) {
  const [loadingKey, setLoadingKey] = React.useState<string | null>(null);
  const [newBlock, setNewBlock] = React.useState('');

  const addBlock = () => {
    if (newBlock.trim()) {
      const list = settings.blocklist || [];
      if (!list.includes(newBlock.trim())) {
        onToggle('blocklist', [...list, newBlock.trim()]);
      }
      setNewBlock('');
    }
  };

  const removeBlock = (domain: string) => {
    const list = settings.blocklist || [];
    onToggle('blocklist', list.filter((d: string) => d !== domain));
  };

  const handleToggle = async (key: string) => {
    if (loadingKey) return;
    setLoadingKey(key);
    try {
      await onToggle(key);
    } finally {
      setLoadingKey(null);
    }
  };

  return (
    <div className="settings-page">
      <div className="settings-title">Secure Settings</div>

      {sections.map((sec) => (
        <div key={sec.title} className="settings-section" style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '24px', padding: '24px', marginBottom: '24px', boxShadow: 'var(--shadow-sm)', backdropFilter: 'blur(20px)' }}>
          <div className="settings-section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: 'none', paddingBottom: '0', marginBottom: '16px', fontSize: '13px', color: 'var(--text-1)' }}>
            <div style={{ background: 'var(--surface-active)', padding: '6px', borderRadius: '8px' }}>{sec.icon}</div>
            {sec.title}
          </div>
          
          {sec.customRender ? (
            <div className="settings-custom-blocklist" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-3)', marginBottom: '8px' }}>Enter domains to block completely (e.g. facebook.com). They will be intercepted at the network level.</div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input 
                  type="text" 
                  placeholder="e.g. example.com" 
                  value={newBlock}
                  onChange={(e) => setNewBlock(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addBlock()}
                  style={{ flex: 1, padding: '10px 14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-1)', fontSize: '13px' }}
                />
                <button onClick={addBlock} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0 16px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}><Plus size={16} /> Add</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                {(settings.blocklist || []).map((domain: string) => (
                  <div key={domain} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--surface)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-2)' }}>{domain}</span>
                    <button onClick={() => removeBlock(domain)} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', opacity: 0.8 }}><Trash2 size={16} /></button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            sec.items.map((item) => (
              <div key={item.key} className="settings-row">
                <div className="settings-row-info">
                  <div className="settings-row-label">{item.label}</div>
                  <div className="settings-row-desc">{item.desc}</div>
                </div>
                <div
                  className={`toggle ${(settings as any)[item.key] ? 'on' : ''} ${loadingKey === item.key ? 'loading' : ''}`}
                  onClick={() => handleToggle(item.key)}
                  style={{ opacity: loadingKey === item.key ? 0.5 : 1, pointerEvents: loadingKey === item.key ? 'none' : 'auto' }}
                />
                {loadingKey === item.key && (
                  <div style={{ fontSize: '11px', color: 'var(--accent)', marginLeft: '10px' }}>
                    {item.key === 'torMode' && !(settings as any)['torMode'] ? 'Starting Tor...' : 'Saving...'}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      ))}
    </div>
  );
}
