'use client';

import React, { useState, useEffect } from 'react';
import { useBrowserStore, isInternal, unwrapProxyUrl } from '@/lib/store';
import { Code, Shield, Image as ImageIcon, Link as LinkIcon, FileJson, Loader2, AlertTriangle, CheckCircle, Search, Server, Cpu, Globe, MapPin } from 'lucide-react';
import { parseNavigationInput } from '@/lib/urlParser';

interface InspectStats {
  title: string;
  description: string;
  https: boolean;
  linksCount: number;
  scriptsCount: number;
  imagesCount: number;
  metaTags: { name: string; content: string }[];
  headers: { name: string; value: string }[];
  ip?: string;
  isp?: string;
  location?: string;
  server?: string;
  generator?: string;
  wordCount?: number;
  readingTime?: number;
  openGraph?: Record<string, string>;
}

export default function Inspector() {
  const { tabs } = useBrowserStore();
  
  // Find a target URL to inspect (prefer the first non-internal tab)
  const candidateUrl = tabs.find(t => !isInternal(t.url))?.url || '';
  
  const [url, setUrl] = useState(candidateUrl);
  const [inputUrl, setInputUrl] = useState(candidateUrl);
  const [stats, setStats] = useState<InspectStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!url) return;
    let alive = true;
    setLoading(true);
    setError('');

    (async () => {
      try {
        const u = parseNavigationInput(unwrapProxyUrl(url));
        if (isInternal(u)) {
          throw new Error('Cannot inspect internal browser pages or search views.');
        }
        const domain = new URL(u).hostname;
        
        // 1. Fetch from proxy with raw=true so we get unmodified HTML
        const proxyUrl = `http://127.0.0.1:8181/proxy?url=${encodeURIComponent(u)}&raw=true`;
        const res = await fetch(proxyUrl);
        if (!alive) return;
        
        if (!res.ok) {
          if (res.status === 502) {
             throw new Error('Connection failed (502 Bad Gateway). Ensure the site is reachable, and if Tor Mode is on, wait for it to fully connect.');
          }
          throw new Error(`Proxy returned status: ${res.status}`);
        }
        
        const serverHeader = res.headers.get('server') || res.headers.get('x-powered-by') || 'Unknown';
        
        const html = await res.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        const title = doc.title || 'No title found';
        const description = doc.querySelector('meta[name="description"]')?.getAttribute('content') || '';
        const generator = doc.querySelector('meta[name="generator"]')?.getAttribute('content') || 'Custom Built';
        const metaTags = Array.from(doc.querySelectorAll('meta'))
          .map(m => ({ name: m.getAttribute('name') || m.getAttribute('property') || '', content: m.getAttribute('content') || '' }))
          .filter(m => m.name && m.content);

        const openGraph: Record<string, string> = {};
        metaTags.forEach(m => {
          if (m.name.startsWith('og:')) {
            let content = m.content;
            if (m.name === 'og:image' && content.startsWith('/')) {
              try {
                content = new URL(content, u).toString();
              } catch (e) {}
            }
            openGraph[m.name.replace('og:', '')] = content;
          }
        });

        // Calculate text metrics
        const bodyText = doc.body?.textContent || '';
        const words = bodyText.trim().split(/\s+/).filter(w => w.length > 0);
        const wordCount = words.length;
        const readingTime = Math.ceil(wordCount / 200); // 200 WPM

        let ip = 'Unknown';
        let isp = 'Unknown';
        let location = 'Unknown';

        // 2. Fetch DNS Info (Google DoH)
        try {
          const dnsRes = await fetch(`https://dns.google/resolve?name=${domain}`);
          const dnsData = await dnsRes.json();
          const answer = dnsData.Answer?.find((a: any) => a.type === 1); // A record
          if (answer) {
            ip = answer.data;
            // 3. Fetch IP Info (proxied to avoid mixed-content blocking)
            const proxyUrl = `http://127.0.0.1:8181/proxy?url=${encodeURIComponent(`http://ip-api.com/json/${ip}`)}&raw=true`;
            const ipRes = await fetch(proxyUrl);
            if (ipRes.ok) {
              const ipData = await ipRes.json();
              if (ipData.status === 'success') {
                isp = ipData.isp || ipData.org || 'Unknown';
                location = `${ipData.city || ''}, ${ipData.country || ''}`.trim().replace(/^,|,$/g, '');
              }
            }
          }
        } catch (e) {
          console.error("Failed to fetch DNS/IP info", e);
        }

        const newStats: InspectStats = {
          title,
          description,
          https: u.startsWith('https://'),
          linksCount: doc.querySelectorAll('a').length,
          scriptsCount: doc.querySelectorAll('script').length,
          imagesCount: doc.querySelectorAll('img').length,
          metaTags,
          headers: [],
          ip,
          isp,
          location,
          server: serverHeader,
          generator,
          wordCount,
          readingTime,
          openGraph
        };

        if (alive) setStats(newStats);
      } catch (err: any) {
        if (alive) setError(err.message || 'Failed to inspect URL. Make sure it is valid and accessible.');
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => { alive = false; };
  }, [url]);

  const handleInspect = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputUrl) setUrl(inputUrl);
  };

  return (
    <div className="flex flex-col w-full h-full overflow-y-auto bg-transparent text-[var(--text-primary)]">
      <div className="w-full max-w-5xl mx-auto p-6 md:p-10 flex flex-col gap-8">
        
        {/* Header */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-indigo-500/20 text-indigo-500 border border-indigo-500/30">
              <Code size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Site Inspector</h1>
              <p className="text-[var(--text-secondary)] text-sm">Analyze page structure, SEO, and security metrics.</p>
            </div>
          </div>

          <form onSubmit={handleInspect} className="flex gap-2">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
              <input 
                type="text" 
                value={inputUrl}
                onChange={e => setInputUrl(e.target.value)}
                placeholder="Enter URL to inspect..."
                className="w-full pl-11 pr-4 py-3 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] focus:bg-[var(--glass-bg-active)] focus:border-indigo-400 focus:outline-none transition-all shadow-sm"
              />
            </div>
            <button type="submit" className="px-6 py-3 rounded-xl bg-indigo-500 text-white font-medium hover:bg-indigo-600 transition-colors shadow-md shadow-indigo-500/20">
              Inspect
            </button>
          </form>
        </div>

        {/* Content */}
        {loading && (
          <div className="flex flex-col items-center justify-center p-20 gap-4 text-[var(--text-tertiary)]">
            <Loader2 size={32} className="animate-spin text-indigo-500" />
            <p>Analyzing {url}...</p>
          </div>
        )}

        {error && !loading && (
          <div className="p-6 rounded-xl bg-red-500/10 border border-red-500/20 flex flex-col items-center justify-center gap-2 text-red-500">
            <AlertTriangle size={32} />
            <p className="font-medium">{error}</p>
          </div>
        )}

        {!loading && !error && stats && (
          <div className="flex flex-col gap-6 animate-fade-in">
            {/* Overview Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-5 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] flex flex-col gap-2">
                <div className="flex items-center gap-2 text-[var(--text-secondary)] text-sm font-medium">
                  <Shield size={16} className={stats.https ? "text-green-500" : "text-yellow-500"} />
                  Security
                </div>
                <div className="text-xl font-bold flex items-center gap-2">
                  {stats.https ? 'HTTPS Secure' : 'Insecure HTTP'}
                  {stats.https ? <CheckCircle size={16} className="text-green-500" /> : <AlertTriangle size={16} className="text-yellow-500" />}
                </div>
              </div>

              <div className="p-5 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] flex flex-col gap-2">
                <div className="flex items-center gap-2 text-[var(--text-secondary)] text-sm font-medium">
                  <LinkIcon size={16} className="text-blue-500" />
                  Total Links
                </div>
                <div className="text-2xl font-bold">{stats.linksCount}</div>
              </div>

              <div className="p-5 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] flex flex-col gap-2">
                <div className="flex items-center gap-2 text-[var(--text-secondary)] text-sm font-medium">
                  <FileJson size={16} className="text-orange-500" />
                  Scripts
                </div>
                <div className="text-2xl font-bold">{stats.scriptsCount}</div>
              </div>

              <div className="p-5 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] flex flex-col gap-2">
                <div className="flex items-center gap-2 text-[var(--text-secondary)] text-sm font-medium">
                  <ImageIcon size={16} className="text-pink-500" />
                  Images
                </div>
                <div className="text-2xl font-bold">{stats.imagesCount}</div>
              </div>
            </div>

            {/* Hosting & Infrastructure */}
            <div className="rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] overflow-hidden">
              <div className="p-4 border-b border-[var(--glass-border)] bg-[var(--glass-bg-active)] font-semibold flex items-center gap-2">
                <Server size={16} className="text-indigo-500" />
                Hosting & Infrastructure
              </div>
              <div className="p-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                  <div className="flex items-center gap-1.5 text-xs text-[var(--text-tertiary)] uppercase tracking-wider font-semibold mb-1">
                    <Globe size={12} /> Server IP
                  </div>
                  <div className="text-sm font-medium">{stats.ip || 'Unknown'}</div>
                </div>
                <div>
                  <div className="flex items-center gap-1.5 text-xs text-[var(--text-tertiary)] uppercase tracking-wider font-semibold mb-1">
                    <Server size={12} /> Hosting Provider
                  </div>
                  <div className="text-sm font-medium">{stats.isp || 'Unknown'}</div>
                </div>
                <div>
                  <div className="flex items-center gap-1.5 text-xs text-[var(--text-tertiary)] uppercase tracking-wider font-semibold mb-1">
                    <MapPin size={12} /> Location
                  </div>
                  <div className="text-sm font-medium">{stats.location || 'Unknown'}</div>
                </div>
                <div>
                  <div className="flex items-center gap-1.5 text-xs text-[var(--text-tertiary)] uppercase tracking-wider font-semibold mb-1">
                    <Cpu size={12} /> Tech Stack
                  </div>
                  <div className="text-sm font-medium flex flex-col gap-0.5">
                    {stats.server !== 'Unknown' && <span>{stats.server}</span>}
                    {stats.generator !== 'Custom Built' && <span className="text-[var(--text-secondary)]">{stats.generator}</span>}
                    {stats.server === 'Unknown' && stats.generator === 'Custom Built' && <span>Unknown / Custom</span>}
                  </div>
                </div>
              </div>
            </div>

            {/* SEO Details */}
            <div className="rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] overflow-hidden">
              <div className="p-4 border-b border-[var(--glass-border)] bg-[var(--glass-bg-active)] font-semibold flex items-center gap-2">
                <Search size={16} className="text-indigo-500" />
                SEO & Meta Details
              </div>
              <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-4">
                  <div>
                    <div className="text-xs text-[var(--text-tertiary)] uppercase tracking-wider font-semibold mb-1">Page Title</div>
                    <div className="text-lg font-medium">{stats.title}</div>
                  </div>
                  <div>
                    <div className="text-xs text-[var(--text-tertiary)] uppercase tracking-wider font-semibold mb-1">Description</div>
                    <div className="text-sm leading-relaxed">{stats.description || 'No description provided.'}</div>
                  </div>
                </div>
                
                <div className="flex flex-col gap-4">
                  <div className="flex gap-8">
                    <div>
                      <div className="text-xs text-[var(--text-tertiary)] uppercase tracking-wider font-semibold mb-1">Word Count</div>
                      <div className="text-lg font-medium">{stats.wordCount?.toLocaleString() || 0} words</div>
                    </div>
                    <div>
                      <div className="text-xs text-[var(--text-tertiary)] uppercase tracking-wider font-semibold mb-1">Reading Time</div>
                      <div className="text-lg font-medium">~{stats.readingTime || 1} min</div>
                    </div>
                  </div>
                  
                  {stats.openGraph && Object.keys(stats.openGraph).length > 0 && (
                    <div>
                      <div className="text-xs text-[var(--text-tertiary)] uppercase tracking-wider font-semibold mb-1">OpenGraph Image</div>
                      {stats.openGraph['image'] ? (
                         <div className="mt-1 relative w-full max-w-[200px] rounded-lg overflow-hidden border border-[var(--glass-border)]">
                            <img src={stats.openGraph['image']} alt="OG Image" className="w-full h-auto object-cover" />
                         </div>
                      ) : (
                         <div className="text-sm text-[var(--text-secondary)]">None</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Meta Tags Table */}
            {stats.metaTags.length > 0 && (
              <div className="rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] overflow-hidden">
                <div className="p-4 border-b border-[var(--glass-border)] bg-[var(--glass-bg-active)] font-semibold flex items-center gap-2">
                  <Code size={16} className="text-indigo-500" />
                  All Meta Tags
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-[var(--glass-border)] text-[var(--text-tertiary)]">
                        <th className="p-3 font-medium">Name / Property</th>
                        <th className="p-3 font-medium">Content</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--glass-border)]">
                      {stats.metaTags.map((tag, i) => (
                        <tr key={i} className="hover:bg-[var(--glass-bg-hover)] transition-colors">
                          <td className="p-3 font-medium text-[var(--text-secondary)] w-1/3 break-all">{tag.name}</td>
                          <td className="p-3 text-[var(--text-secondary)] break-all">{tag.content}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
}
