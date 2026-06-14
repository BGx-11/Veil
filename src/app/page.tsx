'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Shield, Download, Lock, Globe, Zap, Bot, EyeOff, ChevronDown, Fingerprint, Wifi, Eye, BookOpen, Columns2, Search, X, AlertTriangle, CheckCircle2, GitCommit, HelpCircle, MessageSquare, Mail } from 'lucide-react';
import './landing.css';

const GithubIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.02c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A4.8 4.8 0 0 0 8 18v4"></path>
  </svg>
);

function useInView(ref: React.RefObject<HTMLElement | null>, threshold = 0.15) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [ref, threshold]);
  return visible;
}

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [showModal, setShowModal] = useState(false);
  const [downloadState, setDownloadState] = useState<'idle' | 'downloading' | 'completed'>('idle');
  
  const heroRef = useRef<HTMLElement>(null);
  const featRef = useRef<HTMLElement>(null);
  const privRef = useRef<HTMLElement>(null);
  const featVisible = useInView(featRef);
  const privVisible = useInView(privRef);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    const onMouse = (e: MouseEvent) => setMousePos({ x: e.clientX, y: e.clientY });
    window.addEventListener('scroll', onScroll);
    window.addEventListener('mousemove', onMouse);
    
    return () => { 
      window.removeEventListener('scroll', onScroll); 
      window.removeEventListener('mousemove', onMouse); 
    };
  }, []);

  return (
    <div className={`lp ${showModal ? 'lp-modal-open' : ''}`}>
      {/* Cursor glow */}
      <div className="cursor-glow" style={{ left: mousePos.x, top: mousePos.y }} />

      {/* Nav */}
      <nav className={`lp-nav ${scrolled ? 'lp-nav--scrolled' : ''}`}>
        <div className="lp-nav__inner">
          <div className="lp-logo">
            <img src="/logo.png" alt="Veil" width={32} height={32} className="lp-logo__img" />
            <span>Veil</span>
          </div>
          <div className="lp-nav__links">
            <a href="#features">Features</a>
            <a href="#privacy">Privacy</a>
          </div>
          <button onClick={() => setShowModal(true)} className="lp-nav__cta" style={{ border: 'none', cursor: 'pointer' }}>
            <Download size={16} /> Download
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section ref={heroRef} className="lp-hero">
        <div className="lp-hero__orbs">
          <div className="orb orb--blue" />
          <div className="orb orb--purple" />
          <div className="orb orb--cyan" />
        </div>
        <div className="lp-hero__content">
          <h1 className="lp-hero__title">
            Browse the web<br /><span className="lp-hero__gradient">without a trace.</span>
          </h1>
          <p className="lp-hero__sub">
            Veil is the next-generation browser with built-in Tor, ad blocking, and on-device AI — engineered so your data never leaves your machine.
          </p>
          <div className="lp-hero__actions">
            <button onClick={() => setShowModal(true)} className="lp-btn lp-btn--primary">
              <Download size={18} /> Download for Windows
            </button>
            <a href="https://github.com/BGx-11/Veil" className="lp-btn lp-btn--ghost">
              View on GitHub
            </a>
          </div>
          <div style={{ marginTop: '16px', fontSize: '13px', color: 'var(--text-3)', opacity: 0.8, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#0078D6', marginRight: '8px' }}></span>
            Windows Only For Now
          </div>
          <div className="lp-hero__scroll">
            <ChevronDown size={20} className="bounce" />
          </div>
        </div>

        {/* Browser Mockup */}
        <div className="lp-mockup">
          <div className="lp-mockup__bar">
            <div className="lp-mockup__dots"><span /><span /><span /></div>
            <div className="lp-mockup__url"><Lock size={11} /> veil://newtab</div>
            <div className="lp-mockup__actions">
              <Shield size={12} />
            </div>
          </div>
          <div className="lp-mockup__body">
            <div className="lp-mockup__sidebar">
              <div className="mock-tab mock-tab--active" />
              <div className="mock-tab" />
              <div className="mock-tab" />
            </div>
            <div className="lp-mockup__content">
              <div className="mock-search-bar" />
              <div className="mock-grid">
                <div className="mock-card" /><div className="mock-card" />
                <div className="mock-card" /><div className="mock-card" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section ref={featRef} id="features" className={`lp-features ${featVisible ? 'visible' : ''}`}>
        <h2 className="lp-section__title">Everything you need.<br /><span className="lp-hero__gradient">Nothing you don't.</span></h2>
        <div className="lp-features__grid">
          {[
            { icon: <EyeOff size={24} />, title: 'Ghostery Blocker', desc: 'Network-level ad & tracker blocking. Stops scripts before they even load.', color: '#ef4444' },
            { icon: <Globe size={24} />, title: 'Tor Network', desc: 'One-click SOCKS5 proxy through the Tor network. Real anonymity, not theater.', color: '#a855f7' },
            { icon: <Bot size={24} />, title: 'On-Device AI', desc: 'WebGPU-accelerated LLM runs locally. Summarizes pages with zero cloud calls.', color: '#3b82f6' },
            { icon: <Fingerprint size={24} />, title: 'Anti-Fingerprint', desc: 'Canvas noise injection and WebRTC leak protection. Be invisible.', color: '#14b8a6' },
            { icon: <BookOpen size={24} />, title: 'Reader Mode', desc: 'Distraction-free reading with beautiful typography. Focus on content.', color: '#f59e0b' },
            { icon: <Columns2 size={24} />, title: 'Split View', desc: 'Side-by-side tab multitasking. Research and browse simultaneously.', color: '#06b6d4' },
            { icon: <Search size={24} />, title: 'Private Search', desc: 'DuckDuckGo integration with AI summaries. No tracking, no profiling.', color: '#8b5cf6' },
            { icon: <Zap size={24} />, title: 'Blazing Fast', desc: 'Tauri + Rust + Next.js. Ultra-lightweight native rendering.', color: '#22c55e' },
          ].map((f, i) => (
            <div key={i} className="lp-fcard" style={{ animationDelay: `${i * 0.08}s`, '--card-accent': f.color } as React.CSSProperties}>
              <div className="lp-fcard__icon" style={{ background: `${f.color}15`, color: f.color }}>{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Privacy Deep Dive */}
      <section ref={privRef} id="privacy" className={`lp-privacy ${privVisible ? 'visible' : ''}`}>
        <div className="lp-privacy__inner">
          <h2 className="lp-section__title">Your data stays <span className="lp-hero__gradient">yours.</span></h2>
          <p className="lp-privacy__text">
            Unlike Chrome, Edge, or Safari — Veil doesn't collect telemetry, sync your history to corporate servers, or sell your search queries to advertisers. Every AI inference runs on your GPU. Every search is private. Every session is ephemeral.
          </p>
          <div className="lp-privacy__features">
            <div className="lp-priv-item"><Lock size={20} /><span>End-to-end encrypted sessions</span></div>
            <div className="lp-priv-item"><Wifi size={20} /><span>Tor network routing</span></div>
            <div className="lp-priv-item"><Eye size={20} /><span>Zero telemetry collection</span></div>
            <div className="lp-priv-item"><Fingerprint size={20} /><span>Anti-fingerprinting tech</span></div>
          </div>
        </div>
      </section>

      {/* Warning Banner / Open Source Notice */}
      <section className="lp-warning-banner" style={{ background: '#fff', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', padding: '24px 0' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', maxWidth: '800px', margin: '0 auto', padding: '0 24px' }}>
          <div style={{ flexShrink: 0, width: '24px', height: '24px', color: '#0078D6', marginTop: '4px' }}>
            <AlertTriangle size={24} />
          </div>
          <div>
            <h3 style={{ fontSize: '16px', color: '#0f172a', marginBottom: '4px', fontWeight: 600 }}>Open Source Transparency Notice</h3>
            <p style={{ fontSize: '14px', color: '#475569', lineHeight: 1.5 }}>
              Veil is an open-source project released under the MIT License. It does not phone home, it does not auto-update without consent, and it is strictly driven by the community. We recommend reviewing the source code on GitHub.
            </p>
          </div>
        </div>
      </section>

      {/* Changelog */}
      <section className="lp-changelog" style={{ padding: '80px 24px', background: '#fdfdfd' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <span style={{ fontSize: '14px', fontWeight: 700, color: '#0078D6', textTransform: 'uppercase', letterSpacing: '1px' }}>Updates</span>
            <h2 style={{ fontSize: '36px', fontWeight: 800, color: '#0f172a', marginTop: '8px' }}>Release Notes</h2>
            <p style={{ color: '#64748b', fontSize: '16px', marginTop: '12px' }}>Track the evolution of the Veil Browser project.</p>
          </div>

          <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '6px' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#0078D6' }} />
              <div style={{ width: '2px', height: '180px', background: '#e2e8f0', marginTop: '8px' }} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a' }}>Version 1.0 (Current)</h3>
                <span style={{ background: '#eef2ff', color: '#0078D6', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 600 }}>Latest</span>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, color: '#475569', fontSize: '15px', lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <li style={{ display: 'flex', gap: '8px' }}><CheckCircle2 size={18} color="#10b981" style={{ flexShrink: 0, marginTop: '2px' }}/> <strong>Core:</strong> Integrated Tor SOCKS5 network routing natively without external daemons.</li>
                <li style={{ display: 'flex', gap: '8px' }}><CheckCircle2 size={18} color="#10b981" style={{ flexShrink: 0, marginTop: '2px' }}/> <strong>AI Engine:</strong> WebGPU-accelerated local summarization using Transformers.js.</li>
                <li style={{ display: 'flex', gap: '8px' }}><CheckCircle2 size={18} color="#10b981" style={{ flexShrink: 0, marginTop: '2px' }}/> <strong>Privacy:</strong> Ghostery Tracker blocker engine fully integrated into the native Rust proxy layer.</li>
                <li style={{ display: 'flex', gap: '8px' }}><CheckCircle2 size={18} color="#10b981" style={{ flexShrink: 0, marginTop: '2px' }}/> <strong>UI:</strong> Next.js 15 React architecture implemented for maximum performance.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="lp-faq" style={{ padding: '80px 24px', background: '#f8fafc' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <span style={{ fontSize: '14px', fontWeight: 700, color: '#0078D6', textTransform: 'uppercase', letterSpacing: '1px' }}>Support</span>
            <h2 style={{ fontSize: '36px', fontWeight: 800, color: '#0f172a', marginTop: '8px' }}>Troubleshooting</h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ background: '#fff', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '12px' }}>
                <HelpCircle size={20} color="#0078D6" />
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>Windows SmartScreen Warning</h3>
              </div>
              <p style={{ color: '#475569', fontSize: '15px', lineHeight: 1.6, marginBottom: '12px' }}>
                Because Veil is an independent, open-source project, the `.exe` installer is not signed with an expensive EV certificate. Windows SmartScreen may flag it as an "Unrecognized App".
              </p>
              <div style={{ background: '#f1f5f9', padding: '16px', borderRadius: '12px', fontSize: '14px', color: '#334155' }}>
                <strong>Solution:</strong> Click <strong>More info</strong> on the blue SmartScreen popup, and then click <strong>Run anyway</strong>. You can verify the integrity of the release by compiling it yourself from the GitHub repository.
              </div>
            </div>

            <div style={{ background: '#fff', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '12px' }}>
                <HelpCircle size={20} color="#0078D6" />
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>Why is Tor disabled by default?</h3>
              </div>
              <p style={{ color: '#475569', fontSize: '15px', lineHeight: 1.6 }}>
                Tor significantly reduces browsing speeds due to onion routing across global nodes. We leave Tor disabled by default for general browsing, allowing you to manually toggle it ON when you need absolute anonymity.
              </p>
            </div>
            
            <div style={{ background: '#fff', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '12px' }}>
                <HelpCircle size={20} color="#0078D6" />
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>How does Local AI work without a GPU?</h3>
              </div>
              <p style={{ color: '#475569', fontSize: '15px', lineHeight: 1.6 }}>
                Veil Browser leverages WebGPU. If a dedicated GPU is unavailable, Transformers.js will automatically fall back to WebAssembly (WASM) CPU execution. While slower, your data will still remain 100% local and secure.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="lp-cta">
        <h2>Ready to disappear?</h2>
        <p>Download Veil and take back control of your privacy.</p>
        <button onClick={() => setShowModal(true)} className="lp-btn lp-btn--primary lp-btn--lg">
          <Download size={20} /> Download Veil Browser
        </button>
      </section>

      {/* Footer */}
      <footer className="lp-footer">
        <div className="lp-footer__container">
          <div className="lp-footer__top">
            <div className="lp-footer__col lp-footer__col--brand">
              <div className="lp-logo">
                <img src="/logo.png" alt="Veil" width={20} height={20} className="lp-logo__img" />
                <span>Veil</span>
              </div>
              <p className="lp-footer__desc">
                The next-generation browser engineered for absolute privacy. No telemetry, no trackers, just pure speed and security.
              </p>
            </div>

            <div className="lp-footer__col">
              <h4>Project Links</h4>
              <a href="#features">Architecture</a>
              <a href="#privacy">Privacy Deep Dive</a>
              <a href="https://github.com/BGx-11/Veil" target="_blank" rel="noopener noreferrer">Source Code</a>
              <a href="https://github.com/BGx-11/Veil/releases" target="_blank" rel="noopener noreferrer">Release Notes</a>
            </div>

            <div className="lp-footer__col">
              <h4>Creator</h4>
              <a href="https://iambgx.in" target="_blank" rel="noopener noreferrer">Devansh Agarwal</a>
              <a href="https://github.com/BGx-11" target="_blank" rel="noopener noreferrer">GitHub Profile</a>
            </div>
          </div>
          
          <div className="lp-footer__bottom">
            <div className="lp-footer__copy">
              &copy; {new Date().getFullYear()} <a href="https://iambgx.in" target="_blank" rel="noopener noreferrer">BGx</a>. All rights reserved.
            </div>
            <div className="lp-footer__legal">
              <a href="https://github.com/BGx-11/Veil/blob/main/LICENSE" target="_blank" rel="noopener noreferrer">About License</a>
              <a href="/terms">Terms of Service</a>
              <a href="/privacy">Privacy Policy</a>
            </div>
          </div>
        </div>
      </footer>

      {/* Download Modal */}
      {showModal && (
        <div className="lp-modal-overlay" onClick={() => {
          setShowModal(false);
          setTimeout(() => setDownloadState('idle'), 300);
        }}>
          <div className="lp-modal" onClick={e => e.stopPropagation()}>
            <button className="lp-modal-close" onClick={() => {
              setShowModal(false);
              setTimeout(() => setDownloadState('idle'), 300);
            }}>
              <X size={20} />
            </button>
            <div className="lp-modal-icon"><Download size={32} /></div>
            <h3>Download Veil Browser</h3>
            <p>Get the latest release directly from our open-source repository.</p>
            
            <div className="lp-modal-actions">
              {downloadState === 'idle' && (
                <button 
                  onClick={() => {
                    setDownloadState('downloading');
                    setTimeout(() => {
                      setDownloadState('completed');
                      // Trigger actual download
                      const link = document.createElement('a');
                      link.href = 'https://github.com/BGx-11/Veil/releases/latest/download/Veil_Setup_v1.exe';
                      link.download = 'Veil_Setup_v1.exe';
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }, 1500);
                  }}
                  className="lp-btn lp-btn--primary"
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  Download Setup .exe (Windows)
                </button>
              )}
              {downloadState === 'downloading' && (
                <button 
                  className="lp-btn lp-btn--primary"
                  style={{ width: '100%', justifyContent: 'center', opacity: 0.8, cursor: 'wait' }}
                  disabled
                >
                  <div className="bounce" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Download size={18} /> Downloading...
                  </div>
                </button>
              )}
              {downloadState === 'completed' && (
                <button 
                  className="lp-btn lp-btn--primary"
                  style={{ width: '100%', justifyContent: 'center', background: '#10b981', borderColor: '#10b981' }}
                  disabled
                >
                  <CheckCircle2 size={18} /> Download Completed!
                </button>
              )}
              <div className="lp-modal-note">
                <Shield size={14} /> Open source and free forever.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
