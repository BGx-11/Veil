'use client';

import React, { useState, useEffect } from 'react';
import { Loader2, BookOpen, ExternalLink, Sparkles, Image as ImageIcon, ShoppingBag, Newspaper, Video, Search } from 'lucide-react';
import { getSLMPipeline, removeSLMProgressCallback } from '@/lib/slm';

interface SearchResult {
  title: string;
  description: string;
  url: string;
  displayUrl: string;
  isImage?: boolean;
  isVideo?: boolean;
  videoId?: string;
  isShopping?: boolean;
  isNews?: boolean;
}

interface KnowledgePanelData {
  title: string;
  extract: string;
  thumbnail?: { source: string };
  content_urls: { desktop: { page: string } };
}

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
    setLoading(true);
    setError(null);
    setSlmSummary(null);
    setResults([]);
    setVisibleCount(30);

    (async () => {
      try {
        if ((window as any).electronAPI) {
          const res = await (window as any).electronAPI.performSearch(query, activeTab);
          if (!alive) return;
          if (res.success) {
            setResults(res.results);
            
            // Only trigger SLM Summarization for 'All' tab
            if (activeTab === 'All') {
              setSlmGenerating(true);
              (async () => {
                try {
                  progressCb = (data: any) => {
                    if (data.status === 'downloading') {
                      if (alive) {
                        setSlmProgress(`Downloading Veil Neural Engine...`);
                        setDownloadProgress((data.loaded / data.total) * 100);
                      }
                    } else if (data.status === 'init') {
                      if (alive) {
                        setSlmProgress('Initializing AI Engine...');
                        setDownloadProgress(0);
                      }
                    } else if (data.status === 'ready') {             
                      if (alive) setSlmProgress('Summarizing results...');
                    }
                  };
                  // Pass null to use the globally selected model, or let slm.ts handle it
                  const generator = await getSLMPipeline(progressCb);
                  const contextText = res.results.slice(0, 3).map((r: any) => r.title + ': ' + r.description).join('\n');
                  const messagesArray = [
                    { role: 'system', content: 'You are Veil AI, an expert research assistant. Read the following search results and write a single, brief paragraph that directly answers the user\'s query. Do not use conversational filler, and do not include information not found in the results.' },
                    { role: 'user', content: `Query: ${query}\n\nSearch Results:\n${contextText}` }
                  ];
                  const output = await generator(messagesArray, { max_new_tokens: 100 });
                  let text = output[0].generated_text;
                  if (Array.isArray(text)) {
                    text = text[text.length - 1].content;
                  } else if (typeof text === 'string') {
                    if (text.includes('<|assistant|>\n')) text = text.split('<|assistant|>\n').pop()?.trim() || text;
                  }
                  if (alive) setSlmSummary(text);
                } catch (e: any) {
                  console.warn("Could not load AI model in SearchResults", e);
                  if (alive) {
                    setSlmProgress(`AI Error: ${e.message}`);
                    setSlmGenerating(false);
                  }
                } finally {
                  if (alive) setSlmGenerating(false);
                }
              })();
            }
          }
          else setError(res.error || 'Search failed');
          
          if (activeTab === 'All') {
            try {
              const cleanQuery = query.trim();
              let wikiRes = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(cleanQuery)}`);
              let data = await wikiRes.json();
              if (data.type === 'disambiguation' || data.title === 'Not found.') {
                const searchRes = await fetch(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(cleanQuery)}&utf8=&format=json&origin=*`);
                const searchData = await searchRes.json();
                if (searchData?.query?.search?.length > 0) {
                  const bestTitle = searchData.query.search[0].title;
                  wikiRes = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(bestTitle)}`);
                  data = await wikiRes.json();
                }
              }

              if (data.type !== 'disambiguation' && data.title !== 'Not found.' && data.extract && alive) {
                setKnowledgePanel(data);
              } else if (alive) {
                setKnowledgePanel(null);
              }
            } catch (e) {
              if (alive) setKnowledgePanel(null);
            }
          } else {
            setKnowledgePanel(null);
          }
        } else {
          setError('Search requires Veil desktop app.');
        }
      } catch (err: any) {
        if (alive) setError(err.message);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => { 
      alive = false; 
      if (progressCb) removeSLMProgressCallback(progressCb);
    };
  }, [query, activeTab]);

  const decoded = decodeURIComponent(query);

  return (
    <div className="search-page">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
        <div className="search-query-label">
          Results for <strong>{decoded}</strong> ({results.length > 0 ? `${results.length} found` : 'Searching...'})
        </div>
        
        <div className="search-tabs" style={{ display: 'flex', gap: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '6px',
                  color: isActive ? 'var(--purple)' : 'var(--text-3)',
                  borderBottom: isActive ? '2px solid var(--purple)' : '2px solid transparent',
                  paddingBottom: '8px', marginBottom: '-11px',
                  fontSize: '14px', fontWeight: isActive ? 600 : 400,
                  transition: 'color 0.2s'
                }}
              >
                <Icon size={16} /> {tab.id}
              </button>
            )
          })}
        </div>
      </div>

      <div className="search-layout">
        <div className="search-main">
          {loading && (
            <div className="search-list" style={{ opacity: 0.6 }}>
              <div style={{ marginBottom: '20px', fontSize: '14px', color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Loader2 size={16} className="spinning" /> Searching securely...
              </div>
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="search-card" style={{ pointerEvents: 'none' }}>
                  <div style={{ width: '40%', height: '12px', background: 'var(--surface-active)', borderRadius: '4px', marginBottom: '12px', animation: 'pulse 1.5s infinite' }} />
                  <div style={{ width: '80%', height: '20px', background: 'var(--surface-active)', borderRadius: '6px', marginBottom: '12px', animation: 'pulse 1.5s infinite' }} />
                  <div style={{ width: '95%', height: '14px', background: 'var(--surface-active)', borderRadius: '4px', marginBottom: '6px', animation: 'pulse 1.5s infinite' }} />
                  <div style={{ width: '70%', height: '14px', background: 'var(--surface-active)', borderRadius: '4px', animation: 'pulse 1.5s infinite' }} />
                </div>
              ))}
            </div>
          )}

          {error && !loading && (
            <div className="search-loading">
              <span style={{ color: 'var(--red)' }}>{error}</span>
            </div>
          )}

          {!loading && !error && results.length === 0 && (
            <div className="search-loading">
              <span>No results found.</span>
            </div>
          )}

          {!loading && !error && results.length > 0 && (
            <div className="search-results-container">
              <div className={['Images', 'Videos', 'Shopping'].includes(activeTab) ? "search-image-grid" : "search-list"} style={['Images', 'Videos', 'Shopping'].includes(activeTab) ? { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' } : {}}>
                {results.slice(0, visibleCount).map((r, i) => { 
                  if (r.isImage) {
                    return (
                      <div key={i} className="search-image-card" onClick={() => onNavigate(r.url)} style={{ cursor: 'pointer', borderRadius: '8px', overflow: 'hidden', background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ width: '100%', height: '150px', backgroundImage: `url(${r.displayUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                        <div style={{ padding: '8px', fontSize: '12px' }}>
                          <div style={{ color: 'var(--text-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.title}</div>
                        </div>
                      </div>
                    );
                  }

                  if (r.isVideo) {
                    return (
                      <div key={i} className="search-video-card" onClick={() => onNavigate(r.url)} style={{ cursor: 'pointer', borderRadius: '8px', overflow: 'hidden', background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ width: '100%', height: '120px', backgroundImage: `url(https://i.ytimg.com/vi/${r.videoId}/hqdefault.jpg)`, backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative' }}>
                          <div style={{ position: 'absolute', bottom: '8px', right: '8px', background: 'rgba(0,0,0,0.8)', color: '#fff', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold' }}>YouTube</div>
                        </div>
                        <div style={{ padding: '12px', fontSize: '13px' }}>
                          <div style={{ color: 'var(--text-1)', fontWeight: 600, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{r.title}</div>
                        </div>
                      </div>
                    );
                  }

                  if (r.isShopping) {
                    return (
                      <div key={i} className="search-shopping-card" onClick={() => onNavigate(r.url)} style={{ cursor: 'pointer', borderRadius: '8px', overflow: 'hidden', background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', padding: '12px', gap: '8px' }}>
                        <div style={{ color: 'var(--green)', fontWeight: 'bold', fontSize: '18px' }}>{r.description}</div>
                        <div style={{ color: 'var(--text-1)', fontSize: '13px', fontWeight: 500, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{r.title}</div>
                        <div style={{ color: 'var(--text-3)', fontSize: '11px', marginTop: 'auto' }}>{r.displayUrl}</div>
                      </div>
                    );
                  }

                  if (r.isNews) {
                    return (
                      <div key={i} className="search-news-card" onClick={() => onNavigate(r.url)} style={{ cursor: 'pointer', borderRadius: '8px', background: 'var(--surface)', border: '1px solid var(--border)', padding: '16px', marginBottom: '16px' }}>
                        <div style={{ color: 'var(--accent)', fontSize: '12px', fontWeight: 600, marginBottom: '6px', textTransform: 'uppercase' }}>{r.displayUrl}</div>
                        <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', color: 'var(--text-1)', fontWeight: 600 }}>{r.title}</h3>
                        <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-3)' }}>{r.description}</p>
                      </div>
                    );
                  }

                  let urlObj;
                  try { urlObj = new URL(r.url); } catch (e) {}
                  const domain = urlObj ? urlObj.hostname : r.url;
                  return (
                    <div key={i} className="search-card" onClick={() => onNavigate(r.url)}>
                      <div className="search-card-url">
                        <img src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`} style={{ width: 14, height: 14, borderRadius: 2 }} alt="" onError={(e) => (e.currentTarget.style.display = 'none')} />
                        {r.displayUrl || r.url}
                      </div>
                      <h3 className="search-card-title">{r.title}</h3>
                      <p className="search-card-desc">{r.description}</p>
                    </div>
                  );
                })}
              </div>
              
              {visibleCount < results.length && (
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px', paddingBottom: '20px' }}>
                  <button 
                    onClick={() => setVisibleCount(v => v + 30)}
                    style={{
                      padding: '10px 24px', background: 'var(--surface)', border: '1px solid var(--border)',
                      borderRadius: '20px', color: 'var(--text-1)', fontSize: '13px', cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-hover)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--surface)'; }}
                  >
                    Load More Results
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {(knowledgePanel || slmSummary || slmGenerating) && activeTab === 'All' ? (
          <div className="search-sidebar-panel" style={{ gap: '20px' }}>
            
            {/* Veil AI Summary Panel */}
            <div className="search-panel-card kp-card" style={{ border: '1px solid var(--purple-dim)', boxShadow: '0 8px 32px var(--purple-dim)' }}>
              <div className="kp-content" style={{ background: 'linear-gradient(to bottom, rgba(191,90,242,0.05), transparent)' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--purple)', fontSize: '16px' }}>
                  <Sparkles size={16} /> Veil AI Summary
                </h3>
                {slmGenerating && !slmSummary && (
                  <div style={{ padding: '10px 0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-3)', fontSize: '13px' }}>
                      <Loader2 size={14} className="spinning" /> {slmProgress}
                    </div>
                    {downloadProgress > 0 && (
                      <div style={{ width: '100%', height: '4px', background: 'var(--surface-hover)', borderRadius: '2px', overflow: 'hidden' }}>
                        <div style={{ width: `${downloadProgress}%`, height: '100%', background: 'var(--purple)', transition: 'width 0.2s', boxShadow: '0 0 10px var(--purple)' }} />
                      </div>
                    )}
                  </div>
                )}
                {slmSummary && (
                  <p style={{ fontSize: '13px' }}>{slmSummary}</p>
                )}
              </div>
            </div>

            {knowledgePanel && (
              <div className="search-panel-card kp-card">
                {knowledgePanel.thumbnail && (
                  <div className="kp-image" style={{ backgroundImage: `url(${knowledgePanel.thumbnail.source})` }} />
                )}
                <div className="kp-content">
                  <h3>{knowledgePanel.title}</h3>
                  <p>{knowledgePanel.extract}</p>
                  <div className="panel-divider" />
                  <button 
                    className="kp-wiki-btn" 
                    onClick={() => onNavigate(knowledgePanel.content_urls.desktop.page)}
                  >
                    <BookOpen size={14} /> Read more on Wikipedia <ExternalLink size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
