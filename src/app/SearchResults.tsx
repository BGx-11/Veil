'use client';

import React, { useState, useEffect } from 'react';
import { Loader2, BookOpen, ExternalLink, Sparkles, Image as ImageIcon, ShoppingBag, Newspaper, Video, Search } from 'lucide-react';
import { getSLMPipeline, removeSLMProgressCallback } from '@/lib/slm';

interface SearchResult { title: string; description: string; url: string; displayUrl: string; isImage?: boolean; isVideo?: boolean; videoId?: string; isShopping?: boolean; isNews?: boolean; }
interface KnowledgePanelData { title: string; extract: string; thumbnail?: { source: string }; content_urls: { desktop: { page: string } }; }

const TABS = [
  { id: 'All', icon: Search },
  { id: 'Images', icon: ImageIcon },
  { id: 'Shopping', icon: ShoppingBag },
  { id: 'News', icon: Newspaper },
  { id: 'Videos', icon: Video },
];

export default function SearchResults({ query, onNavigate }: { query: string; onNavigate: (url: string) => void }) {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [knowledgePanel, setKnowledgePanel] = useState<KnowledgePanelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [slmSummary, setSlmSummary] = useState<string | null>(null);
  const [slmGenerating, setSlmGenerating] = useState(false);
  const [slmProgress, setSlmProgress] = useState('Analyzing results...');
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [activeTab, setActiveTab] = useState('All');
  const [visibleCount, setVisibleCount] = useState(30);

  useEffect(() => {
    let alive = true;
    let progressCb: any = null;
    setLoading(true); setError(null); setSlmSummary(null); setResults([]); setVisibleCount(30);

    (async () => {
      try {
        // Fetch search results via Yahoo
        const searchUrl = `http://127.0.0.1:8181/proxy?url=${encodeURIComponent(`https://search.yahoo.com/search?p=${encodeURIComponent(decodeURIComponent(query))}`)}`;
        const response = await fetch(searchUrl);
        if (!alive) return;
        const html = await response.text();
        
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const resultNodes = doc.querySelectorAll('.algo-sr');
        const parsed: SearchResult[] = [];
        resultNodes.forEach((node) => {
          const linkEl = node.querySelector('h3.title a') as HTMLAnchorElement | null;
          const snippetEl = node.querySelector('.compText') || node.querySelector('.fc-falcon');
          if (linkEl) {
            let actualUrl = linkEl.getAttribute('href') || '';
            try {
              // Yahoo might use redirect URLs, but typically href is direct or contains the actual RU param
              const u = new URL(actualUrl, 'https://search.yahoo.com');
              if (actualUrl.includes('/RU=')) {
                const ruPart = actualUrl.split('/RU=')[1]?.split('/')[0];
                if (ruPart) actualUrl = decodeURIComponent(ruPart);
              }
            } catch (_e) {}
            parsed.push({ title: linkEl.textContent || '', description: snippetEl?.textContent || '', url: actualUrl, displayUrl: actualUrl });
          }
        });

        if (parsed.length > 0) {
          setResults(parsed);
          if (activeTab === 'All') {
            setSlmGenerating(true);
            (async () => {
              try {
                progressCb = (data: any) => {
                  if (data.status === 'downloading' && alive) {
                    setSlmProgress(`Downloading Veil Neural Engine...`);
                    setDownloadProgress((data.loaded / data.total) * 100);
                  } else if (data.status === 'init' && alive) {
                    setSlmProgress('Initializing AI Engine...');
                    setDownloadProgress(0);
                  } else if (data.status === 'ready' && alive) {             
                    setSlmProgress('Summarizing results...');
                  }
                };
                const generator = await getSLMPipeline(progressCb);
                const contextText = parsed.slice(0, 3).map((r: any) => r.title + ': ' + r.description).join('\n');
                const messagesArray = [
                  { role: 'system', content: 'You are Veil AI. Read the following search results and write a single, brief paragraph that directly answers the user\'s query. Be direct and concise.' },
                  { role: 'user', content: `Query: ${query}\n\nResults:\n${contextText}` }
                ];
                const output = await generator(messagesArray, { max_new_tokens: 100 });
                let text = output[0].generated_text;
                if (Array.isArray(text)) text = text[text.length - 1].content;
                else if (typeof text === 'string' && text.includes('<|assistant|>\n')) text = text.split('<|assistant|>\n').pop()?.trim() || text;
                if (alive) setSlmSummary(text);
              } catch (e: any) {
                if (alive) { setSlmProgress(`AI Error: ${e.message}`); setSlmGenerating(false); }
              } finally {
                if (alive) setSlmGenerating(false);
              }
            })();
          }
        } else {
          setError('No results found');
        }
        
        if (activeTab === 'All') {
          try {
            const cleanQuery = decodeURIComponent(query).trim();
            let wikiRes = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(cleanQuery)}`);
            let data = await wikiRes.json();
            if (data.type === 'disambiguation' || data.title === 'Not found.') {
              const searchRes = await fetch(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(cleanQuery)}&utf8=&format=json&origin=*`);
              const searchData = await searchRes.json();
              if (searchData?.query?.search?.length > 0) {
                wikiRes = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(searchData.query.search[0].title)}`);
                data = await wikiRes.json();
              }
            }
            if (data.type !== 'disambiguation' && data.title !== 'Not found.' && data.extract && alive) setKnowledgePanel(data);
            else if (alive) setKnowledgePanel(null);
          } catch (e) {
            if (alive) setKnowledgePanel(null);
          }
        } else {
          setKnowledgePanel(null);
        }
      } catch (err: any) {
        if (alive) setError(err.message);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => { alive = false; if (progressCb) removeSLMProgressCallback(progressCb); };
  }, [query, activeTab]);

  const decoded = decodeURIComponent(query);
  const getDomain = (url: string) => { try { return new URL(url).hostname; } catch { return url; } };

  return (
    <div className="w-full h-full overflow-y-auto" style={{ background: 'transparent' }}>
      <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col gap-6">
        
        {/* Header & Tabs */}
        <div className="flex flex-col gap-4">
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Results for <span style={{ color: 'var(--accent)' }}>{decoded}</span>
          </h1>
          <div className="flex gap-2 border-b" style={{ borderColor: 'var(--glass-border)' }}>
            {TABS.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition-colors relative"
                  style={{ color: isActive ? 'var(--accent)' : 'var(--text-tertiary)' }}
                >
                  <Icon size={16} /> {tab.id}
                  {isActive && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t-full" style={{ background: 'var(--accent)', boxShadow: 'var(--shadow-glow-accent)' }} />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex gap-8 items-start">
          {/* Main Results */}
          <div className="flex-1 flex flex-col gap-4 min-w-0">
            {loading && (
              <div className="flex flex-col gap-4 animate-fade-in">
                <div className="flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--text-tertiary)' }}>
                  <Loader2 size={16} className="animate-spin" /> Searching securely...
                </div>
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="p-4 rounded-xl" style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}>
                    <div className="w-1/3 h-3 rounded-full mb-3 animate-pulse" style={{ background: 'var(--glass-bg-active)' }} />
                    <div className="w-3/4 h-5 rounded-full mb-3 animate-pulse" style={{ background: 'var(--glass-bg-active)' }} />
                    <div className="w-full h-3 rounded-full mb-2 animate-pulse" style={{ background: 'var(--glass-bg-active)' }} />
                    <div className="w-2/3 h-3 rounded-full animate-pulse" style={{ background: 'var(--glass-bg-active)' }} />
                  </div>
                ))}
              </div>
            )}

            {error && !loading && (
              <div className="p-6 rounded-xl text-center font-medium" style={{ background: 'var(--danger-surface)', color: 'var(--danger)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                {error}
              </div>
            )}

            {!loading && !error && results.length === 0 && (
              <div className="p-6 rounded-xl text-center font-medium" style={{ background: 'var(--glass-bg)', color: 'var(--text-tertiary)' }}>
                No results found.
              </div>
            )}

            {!loading && !error && results.length > 0 && (
              <div className={`grid ${['Images', 'Videos', 'Shopping'].includes(activeTab) ? 'grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4' : 'flex flex-col gap-4'}`}>
                {results.slice(0, visibleCount).map((r, i) => {
                  if (r.isImage || r.isVideo || r.isShopping || r.isNews) return null; // Simplified for MVP rewrite, duckduckgo html doesn't give these cleanly anyway

                  const domain = getDomain(r.url);
                  return (
                    <div
                      key={i}
                      className="group flex flex-col p-4 rounded-xl cursor-pointer transition-all duration-200"
                      style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}
                      onClick={() => onNavigate(r.url)}
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--glass-bg-hover)'; e.currentTarget.style.borderColor = 'var(--glass-border-hover)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'var(--glass-bg)'; e.currentTarget.style.borderColor = 'var(--glass-border)'; }}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <img src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`} className="w-4 h-4 rounded-sm" alt="" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        <span className="text-xs font-medium truncate" style={{ color: 'var(--text-tertiary)' }}>{r.displayUrl || r.url}</span>
                      </div>
                      <h3 className="text-base font-semibold mb-1.5 group-hover:underline decoration-2 underline-offset-2" style={{ color: 'var(--accent)', textDecorationColor: 'var(--accent-glow)' }}>
                        {r.title}
                      </h3>
                      <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{r.description}</p>
                    </div>
                  );
                })}
              </div>
            )}

            {!loading && !error && visibleCount < results.length && (
              <div className="flex justify-center mt-4 pb-8">
                <button
                  onClick={() => setVisibleCount(v => v + 30)}
                  className="px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-200"
                  style={{ background: 'var(--glass-bg-active)', color: 'var(--text-primary)', border: '1px solid var(--glass-border)' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--glass-bg-hover)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'var(--glass-bg-active)'; }}
                >
                  Load More Results
                </button>
              </div>
            )}
          </div>

          {/* Sidebar Panels (AI & Wiki) */}
          {(knowledgePanel || slmSummary || slmGenerating) && activeTab === 'All' && (
            <div className="hidden lg:flex flex-col gap-4 w-[340px] flex-shrink-0">
              {/* Veil AI Summary */}
              <div className="rounded-xl overflow-hidden" style={{ background: 'var(--glass-bg)', border: '1px solid var(--violet-glow)', boxShadow: 'var(--shadow-glow-violet)' }}>
                <div className="px-4 py-3 border-b flex items-center gap-2" style={{ borderColor: 'var(--glass-border)', background: 'var(--violet-glow)' }}>
                  <Sparkles size={16} style={{ color: 'var(--violet)' }} />
                  <h3 className="text-sm font-bold tracking-wide" style={{ color: 'var(--violet)' }}>Veil AI</h3>
                </div>
                <div className="p-4">
                  {slmGenerating && !slmSummary && (
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-2 text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>
                        <Loader2 size={14} className="animate-spin" /> {slmProgress}
                      </div>
                      {downloadProgress > 0 && (
                        <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: 'var(--glass-bg-active)' }}>
                          <div className="h-full rounded-full transition-all duration-300" style={{ width: `${downloadProgress}%`, background: 'var(--violet)' }} />
                        </div>
                      )}
                    </div>
                  )}
                  {slmSummary && (
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>{slmSummary}</p>
                  )}
                </div>
              </div>

              {/* Wikipedia Panel */}
              {knowledgePanel && (
                <div className="rounded-xl overflow-hidden" style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}>
                  {knowledgePanel.thumbnail && (
                    <div className="w-full h-32 bg-cover bg-center" style={{ backgroundImage: `url(${knowledgePanel.thumbnail.source})` }} />
                  )}
                  <div className="p-4 flex flex-col gap-3">
                    <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{knowledgePanel.title}</h3>
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{knowledgePanel.extract}</p>
                    <div className="h-px w-full" style={{ background: 'var(--glass-border)' }} />
                    <button
                      className="flex items-center gap-2 text-xs font-semibold w-max transition-colors"
                      style={{ color: 'var(--text-tertiary)' }}
                      onClick={() => onNavigate(knowledgePanel.content_urls.desktop.page)}
                      onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)'; }}
                      onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-tertiary)'; }}
                    >
                      <BookOpen size={14} /> Wikipedia <ExternalLink size={12} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
