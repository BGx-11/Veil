import React from 'react';
import { Metadata } from 'next';
import '../landing.css';

export const metadata: Metadata = {
  title: 'Terms & Conditions | Veil Browser',
  description: 'Terms and conditions for using the open-source Veil Browser.',
};

export default function TermsPage() {
  return (
    <div className="lp" style={{ padding: '120px 24px', background: '#fdfdfd' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '40px', fontWeight: 800, marginBottom: '24px', color: '#0f172a' }}>
          Terms & Conditions
        </h1>
        <div style={{ fontSize: '15px', lineHeight: '1.8', color: '#475569' }}>
          <p style={{ marginBottom: '24px', fontWeight: 500 }}>Last Updated: June 2026</p>
          
          <p style={{ marginBottom: '24px' }}>
            Welcome to Veil Browser. These Terms and Conditions outline the rules and regulations for the use of the Veil Browser open-source software project. By downloading, accessing, or using Veil Browser, you accept these terms and conditions in full. Do not continue to use Veil Browser if you do not accept all of the terms and conditions stated on this page.
          </p>

          <h2 style={{ fontSize: '24px', fontWeight: 700, marginTop: '40px', marginBottom: '16px', color: '#0f172a' }}>1. Open Source License</h2>
          <p style={{ marginBottom: '16px' }}>
            Veil Browser is provided as open-source software under the MIT License. Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software.
          </p>
          <p style={{ marginBottom: '16px' }}>
            The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
          </p>

          <h2 style={{ fontSize: '24px', fontWeight: 700, marginTop: '40px', marginBottom: '16px', color: '#0f172a' }}>2. Use of Tor Network Integration</h2>
          <p style={{ marginBottom: '16px' }}>
            Veil Browser includes an optional feature that routes your traffic through the decentralized Tor network via a SOCKS5 proxy. By enabling this feature, you acknowledge that:
          </p>
          <ul style={{ paddingLeft: '24px', marginBottom: '16px' }}>
            <li style={{ marginBottom: '8px' }}>We do not control, maintain, or operate the Tor network relays or exit nodes.</li>
            <li style={{ marginBottom: '8px' }}>You are solely responsible for compliance with the local, state, and federal laws of your jurisdiction regarding the use of privacy networks and encryption tools.</li>
            <li style={{ marginBottom: '8px' }}>Veil Browser contributors are not liable for any content accessed, transmitted, or intercepted while utilizing the Tor integration.</li>
          </ul>

          <h2 style={{ fontSize: '24px', fontWeight: 700, marginTop: '40px', marginBottom: '16px', color: '#0f172a' }}>3. Disclaimer of Warranties</h2>
          <p style={{ marginBottom: '16px', fontWeight: 600 }}>
            THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
          </p>
          <p style={{ marginBottom: '16px' }}>
            In no event shall the authors, contributors, or copyright holders be liable for any claim, damages or other liability, whether in an action of contract, tort or otherwise, arising from, out of or in connection with the software or the use or other dealings in the software.
          </p>

          <h2 style={{ fontSize: '24px', fontWeight: 700, marginTop: '40px', marginBottom: '16px', color: '#0f172a' }}>4. Indemnification</h2>
          <p style={{ marginBottom: '16px' }}>
            You agree to indemnify, defend, and hold harmless the Veil Browser project, its contributors, and affiliates from and against any and all claims, liabilities, damages, losses, costs, expenses, or fees (including reasonable attorneys' fees) that such parties may incur as a result of or arising from your (or anyone using your account/device) violation of these Terms and Conditions.
          </p>

          <h2 style={{ fontSize: '24px', fontWeight: 700, marginTop: '40px', marginBottom: '16px', color: '#0f172a' }}>5. Third-Party Integrations</h2>
          <p style={{ marginBottom: '16px' }}>
            Veil Browser integrates components such as Ghostery's tracker blocker lists and WebGPU-based Local Language Models (via Transformers.js). Your use of these components within Veil Browser is subject to the limitations of their respective open-source licenses. Veil Browser does not claim ownership over these third-party engines or models.
          </p>

          <h2 style={{ fontSize: '24px', fontWeight: 700, marginTop: '40px', marginBottom: '16px', color: '#0f172a' }}>6. Modifications to the Terms</h2>
          <p style={{ marginBottom: '16px' }}>
            We reserve the right to modify or replace these Terms at any time. Changes will be posted to the official repository. By continuing to access or use our software after those revisions become effective, you agree to be bound by the revised terms.
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
