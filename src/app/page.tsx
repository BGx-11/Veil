'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Shield, Download, Lock, Globe, Zap, Bot, EyeOff, ChevronDown, Fingerprint, Wifi, Eye, BookOpen, Columns2, Search, X, AlertTriangle, CheckCircle2, GitCommit, HelpCircle, MessageSquare, Mail, User, LayoutGrid, Heart, Clock, MoreHorizontal } from 'lucide-react';
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
          <div className="lp-mockup__window">
            <div className="lp-mockup__sidebar">
              <div className="mock-sidebar-top">
                <div className="mock-window-controls">
                  <span className="dot dot-close" />
                  <span className="dot dot-min" />
                  <span className="dot dot-max" />
                </div>
                <div className="mock-sidebar-user"><User size={16} /></div>
                <div className="mock-sidebar-apps">
                  <div className="mock-app text-indigo-600"><Globe size={18} /></div>
                  <div className="mock-app text-purple-600"><Bot size={18} /></div>
                  <div className="mock-app text-teal-600"><LayoutGrid size={18} /></div>
                </div>
              </div>
              <div className="mock-sidebar-bottom">
                <Heart size={16} className="text-[var(--text-tertiary)]" />
                <Clock size={16} className="text-[var(--text-tertiary)]" />
                <MoreHorizontal size={16} className="text-[var(--text-tertiary)]" />
              </div>
            </div>
            
            <div className="lp-mockup__main">
              <div className="lp-mockup__toolbar">
                 <div className="mock-toolbar-nav">
                   <div className="mock-nav-btn"><ChevronDown size={16} style={{transform: 'rotate(90deg)'}} /></div>
                   <div className="mock-nav-btn"><ChevronDown size={16} style={{transform: 'rotate(-90deg)'}} /></div>
                   <div className="mock-nav-btn"><Search size={14} /></div>
                 </div>
                 <div className="mock-toolbar-address">
                   <div className="mock-address-inner">
                     <Shield size={14} className="text-emerald-400" />
                     <Lock size={12} className="text-[var(--text-tertiary)]" />
                     <span className="text-[var(--text-secondary)]">https://</span><span className="text-[var(--text-primary)]">veil.browser</span>
                   </div>
                 </div>
                 <div className="mock-toolbar-actions">
                   <div className="mock-tor-badge">
                     <span className="mock-tor-dot"></span>
                     Connected
                   </div>
                 </div>
              </div>
              
              <div className="lp-mockup__tabs">
                <div className="mock-tab mock-tab--active">
                  <Globe size={12} className="text-indigo-400"/> <span>Veil Search</span>
                </div>
                <div className="mock-tab">
                  <Shield size={12} className="text-emerald-600"/> <span>Privacy Report</span>
                </div>
                <div className="mock-tab-new">
                   +
                </div>
              </div>

              <div className="lp-mockup__content">
                 <div className="mock-webpage">
                   <div className="mock-hero">
                     <div className="mock-hero-title">Private Search</div>
                     <div className="mock-search-box">
                       <Search size={18} className="text-[var(--text-tertiary)]" />
                       <span>Search without being tracked...</span>
                     </div>
                   </div>
                   <div className="mock-cards">
                     <div className="mock-card"></div>
                     <div className="mock-card"></div>
                     <div className="mock-card"></div>
                   </div>
                 </div>
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
      <section className="lp-warning-banner">
        <div className="lp-warning-banner__inner">
          <div className="lp-warning-banner__icon">
            <AlertTriangle size={24} />
          </div>
          <div className="lp-warning-banner__content">
            <h3>Open Source Transparency Notice</h3>
            <p>
              Veil is an open-source project released under the MIT License. It does not phone home, it does not auto-update without consent, and it is strictly driven by the community. We recommend reviewing the source code on GitHub.
            </p>
          </div>
        </div>
      </section>

      {/* Changelog */}
      <section className="lp-changelog">
        <div className="lp-changelog__inner">
          <div className="lp-section-header">
            <span className="lp-section-tag">Updates</span>
            <h2>Release Notes</h2>
            <p>Track the evolution of the Veil Browser project.</p>
          </div>

          <div className="lp-changelog__timeline">
            <div className="lp-changelog__line-container">
              <div className="lp-changelog__dot" />
              <div className="lp-changelog__line" />
            </div>
            <div className="lp-changelog__content">
              <div className="lp-changelog__version">
                <h3>Version 1.1 (Pre-Release)</h3>
                <span className="lp-changelog__badge">Latest</span>
              </div>
              <ul className="lp-changelog__list">
                <li><CheckCircle2 size={18} className="lp-changelog__check"/> <span><strong>Tor Network:</strong> Added Tor Progress UI and connection status feedback in the toolbar.</span></li>
                <li><CheckCircle2 size={18} className="lp-changelog__check"/> <span><strong>Privacy Controls:</strong> Implemented Export/Import configuration tools to backup and restore settings.</span></li>
                <li><CheckCircle2 size={18} className="lp-changelog__check"/> <span><strong>Proxy Layer:</strong> Enhanced CORS header filtering and proxy robustness for iframe rendering.</span></li>
                <li><CheckCircle2 size={18} className="lp-changelog__check"/> <span><strong>UI & Design:</strong> Overhauled the landing page with an accurate light-themed browser mockup.</span></li>
                <li><CheckCircle2 size={18} className="lp-changelog__check"/> <span><strong>Stability:</strong> Fixed IPC communication errors regarding privacy settings and stabilized history persistence.</span></li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="lp-faq">
        <div className="lp-faq__inner">
          <div className="lp-section-header">
            <span className="lp-section-tag">Support</span>
            <h2>Troubleshooting</h2>
          </div>

          <div className="lp-faq__list">
            <div className="lp-faq-card">
              <div className="lp-faq-card__header">
                <HelpCircle size={20} color="#0078D6" />
                <h3>Windows SmartScreen Warning</h3>
              </div>
              <p>
                Because Veil is an independent, open-source project, the `.exe` installer is not signed with an expensive EV certificate. Windows SmartScreen may flag it as an "Unrecognized App".
              </p>
              <div className="lp-faq-card__solution">
                <strong>Solution:</strong> Click <strong>More info</strong> on the blue SmartScreen popup, and then click <strong>Run anyway</strong>. You can verify the integrity of the release by compiling it yourself from the GitHub repository.
              </div>
            </div>

            <div className="lp-faq-card">
              <div className="lp-faq-card__header">
                <HelpCircle size={20} color="#0078D6" />
                <h3>Why is Tor disabled by default?</h3>
              </div>
              <p>
                Tor significantly reduces browsing speeds due to onion routing across global nodes. We leave Tor disabled by default for general browsing, allowing you to manually toggle it ON when you need absolute anonymity.
              </p>
            </div>
            
            <div className="lp-faq-card">
              <div className="lp-faq-card__header">
                <HelpCircle size={20} color="#0078D6" />
                <h3>How does Local AI work without a GPU?</h3>
              </div>
              <p>
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
                      link.href = 'https://github.com/BGx-11/Veil/releases/download/v1.1/Veil_1.1.0_x64_en-US.msi';
                      link.download = 'Veil_1.1.0_x64_en-US.msi';
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
