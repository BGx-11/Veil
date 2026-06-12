import React from 'react';
import { Metadata } from 'next';
import '../landing.css';

export const metadata: Metadata = {
  title: 'Privacy Policy | Veil Browser',
  description: 'The zero-telemetry, local-first privacy policy of Veil Browser.',
};

export default function PrivacyPage() {
  return (
    <div className="lp" style={{ padding: '120px 24px', background: '#fdfdfd' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '40px', fontWeight: 800, marginBottom: '24px', color: '#0f172a' }}>
          Privacy Policy
        </h1>
        <div style={{ fontSize: '15px', lineHeight: '1.8', color: '#475569' }}>
          <p style={{ marginBottom: '24px', fontWeight: 500 }}>Last Updated: June 2026</p>
          
          <p style={{ marginBottom: '24px' }}>
            At Veil Browser, privacy is not an afterthought, a toggle in a buried settings menu, or a marketing term—it is our absolute foundational principle. This Privacy Policy outlines exactly how data is (and isn't) handled when you use the Veil Browser.
          </p>

          <h2 style={{ fontSize: '24px', fontWeight: 700, marginTop: '40px', marginBottom: '16px', color: '#0f172a' }}>1. Zero Telemetry & No Data Collection</h2>
          <p style={{ marginBottom: '16px' }}>
            Veil Browser is engineered to collect absolutely <strong>zero telemetry</strong>. We do not track your clicks, we do not log your search history, we do not monitor your active tabs, and we do not send crash reports or diagnostic data back to our servers. Your browsing behavior remains entirely on your local machine.
          </p>

          <h2 style={{ fontSize: '24px', fontWeight: 700, marginTop: '40px', marginBottom: '16px', color: '#0f172a' }}>2. On-Device AI Processing</h2>
          <p style={{ marginBottom: '16px' }}>
            All Artificial Intelligence features integrated into Veil Browser (such as page summarization and reader-mode entity extraction) are processed <strong>100% locally</strong> on your hardware. 
          </p>
          <ul style={{ paddingLeft: '24px', marginBottom: '16px' }}>
            <li style={{ marginBottom: '8px' }}>We utilize WebGPU and Transformers.js to execute Local Language Models (SLMs).</li>
            <li style={{ marginBottom: '8px' }}>No text, images, or page content are ever transmitted to OpenAI, Anthropic, Google, or any external cloud API for processing.</li>
            <li style={{ marginBottom: '8px' }}>The model weights are downloaded directly from HuggingFace to your local cache upon first use.</li>
          </ul>

          <h2 style={{ fontSize: '24px', fontWeight: 700, marginTop: '40px', marginBottom: '16px', color: '#0f172a' }}>3. Network Traffic & Tor Routing</h2>
          <p style={{ marginBottom: '16px' }}>
            When the integrated Tor mode is enabled, your traffic is encrypted and routed through the decentralized Tor network.
          </p>
          <ul style={{ paddingLeft: '24px', marginBottom: '16px' }}>
            <li style={{ marginBottom: '8px' }}>We do not monitor, log, or have the capability to decrypt the traffic passing through these relays.</li>
            <li style={{ marginBottom: '8px' }}>Your ISP will only see an encrypted connection to the Tor entry node.</li>
          </ul>

          <h2 style={{ fontSize: '24px', fontWeight: 700, marginTop: '40px', marginBottom: '16px', color: '#0f172a' }}>4. Local Data Storage</h2>
          <p style={{ marginBottom: '16px' }}>
            Any data stored by the browser (such as bookmarks, downloads history, and session state) is stored locally on your hard drive inside your OS user profile folder. We do not offer a "Sync" feature, and therefore we do not possess any servers holding your personal data.
          </p>

          <h2 style={{ fontSize: '24px', fontWeight: 700, marginTop: '40px', marginBottom: '16px', color: '#0f172a' }}>5. Tracking Protection (Ghostery)</h2>
          <p style={{ marginBottom: '16px' }}>
            Veil Browser ships with a hardened tracking blocker powered by Ghostery engine rulesets. This system intercepts requests locally and drops known tracking pixels, analytics scripts, and advertising networks before they execute. No information about blocked trackers is ever uploaded.
          </p>

          <h2 style={{ fontSize: '24px', fontWeight: 700, marginTop: '40px', marginBottom: '16px', color: '#0f172a' }}>6. Open Source Transparency</h2>
          <p style={{ marginBottom: '16px' }}>
            Because Veil Browser is entirely open source, our privacy claims are mathematically and programmatically verifiable. Security researchers and users are encouraged to audit the codebase on GitHub to confirm the absence of telemetry, tracking, or data exfiltration mechanisms.
          </p>

          <div style={{ marginTop: '60px', padding: '24px 0', borderTop: '1px solid #e2e8f0' }}>
            <a href="/" className="lp-btn lp-btn--ghost" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
              Back to Home
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
