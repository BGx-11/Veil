'use client';

import React, { useEffect, useState } from 'react';
import { Shield, Download, Lock, Globe, Zap, Bot, EyeOff } from 'lucide-react';
import './landing.css'; // We'll create this to keep it clean

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="landing-container">
      <nav className={`landing-nav ${scrolled ? 'scrolled' : ''}`}>
        <div className="nav-content">
          <div className="logo-section">
            <Shield size={24} className="logo-icon" />
            <span className="logo-text">Veil</span>
          </div>
          <div className="nav-links">
            <a href="#features">Features</a>
            <a href="#privacy">Privacy</a>
            <a href="#ai">Veil AI</a>
          </div>
          <button className="nav-download-btn">Download Now</button>
        </div>
      </nav>

      <main>
        {/* Hero Section */}
        <section className="hero-section">
          <div className="hero-gradient-bg"></div>
          <div className="hero-content">
            <h1 className="hero-title">
              <span className="gradient-text">Unseen.</span> Unstoppable.
            </h1>
            <p className="hero-subtitle">
              The next-generation browser engineered for absolute privacy. Powered by on-device AI, built-in Tor, and an ultra-premium glassmorphism design.
            </p>
            <div className="hero-cta">
              <button className="btn-primary">
                <Download size={20} />
                Download for Windows
              </button>
              <button className="btn-secondary">
                View Source Code
              </button>
            </div>
            
            {/* Mockup Image/Graphic */}
            <div className="browser-mockup">
              <div className="mockup-header">
                <div className="mockup-dots">
                  <span></span><span></span><span></span>
                </div>
                <div className="mockup-url">
                  <Lock size={12} /> https://veilbrowser.com
                </div>
              </div>
              <div className="mockup-body">
                <div className="mockup-inner-gradient"></div>
                <h2>The Web, Reimagined.</h2>
              </div>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section id="features" className="features-section">
          <h2 className="section-title">Designed for the Future.</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon-wrapper"><EyeOff size={24} /></div>
              <h3>Ghostery Engine</h3>
              <p>Built-in ad and tracker blocking at the network level. We stop tracking scripts before they even load.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon-wrapper"><Globe size={24} /></div>
              <h3>Tor Network</h3>
              <p>One click to encrypt your traffic and bounce it through the decentralized Tor network. True anonymity.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon-wrapper"><Bot size={24} /></div>
              <h3>On-Device AI</h3>
              <p>Veil AI summarizes search results locally. Your queries never touch the cloud. 100% private intelligence.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon-wrapper"><Zap size={24} /></div>
              <h3>Lightning Fast</h3>
              <p>Built on Electron and Next.js, highly optimized with hardware acceleration and zero-copy rendering.</p>
            </div>
          </div>
        </section>

        {/* Deep Dive Section */}
        <section id="privacy" className="deep-dive-section">
          <div className="deep-dive-content">
            <h2 className="section-title">Your Data. Your Business.</h2>
            <p>Unlike other browsers, Veil doesn't collect telemetry, sync your history to the cloud, or sell your search queries. The browser operates strictly via in-memory sessions, leaving zero traces on your disk when closed.</p>
          </div>
        </section>

      </main>

      <footer className="landing-footer">
        <div className="footer-content">
          <div className="footer-brand">
            <Shield size={20} /> Veil Browser
          </div>
          <div className="footer-copyright">
            © 2026 Veil Technologies. Open Source under MIT.
          </div>
        </div>
      </footer>
    </div>
  );
}
