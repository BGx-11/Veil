'use client';

import React, { useState, useEffect } from 'react';
import { Loader2, BookOpen, ExternalLink } from 'lucide-react';

interface SearchResult {
  title: string;
  description: string;
  url: string;
  displayUrl: string;
}

interface KnowledgePanelData {
  title: string;
  extract: string;
  thumbnail?: { source: string };
  content_urls: { desktop: { page: string } };
}

export default function SearchResults({ query, onNavigate }: { query: string; onNavigate: (url: string) => void }) {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [knowledgePanel, setKnowledgePanel] = useState<KnowledgePanelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        if ((window as any).electronAPI) {
          const res = await (window as any).electronAPI.performSearch(query);
          if (!alive) return;
          if (res.success) setResults(res.results);
          else setError(res.error || 'Search failed');
          
          // Try to fetch knowledge panel data from Wikipedia
          try {
            const cleanQuery = query.trim();
            let wikiRes = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(cleanQuery)}`);
            let data = await wikiRes.json();
            
            // If disambiguation or not found, try a fuzzy search
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
          setError('Search requires SecureBrowser desktop app.');
        }
      } catch (err: any) {
        if (alive) setError(err.message);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => { alive = false; };
  }, [query]);

  const decoded = decodeURIComponent(query);

  return (
    <div className="search-page">
      <div className="search-query-label">
        Results for <strong>{decoded}</strong>
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
            <div className="search-list">
              {results.map((r, i) => (
                <div key={i} className="search-card" onClick={() => onNavigate(r.url)}>
                  <div className="search-card-url">{r.displayUrl || r.url}</div>
                  <div className="search-card-title">{r.title}</div>
                  {r.description && <div className="search-card-desc">{r.description}</div>}
                </div>
              ))}
            </div>
          )}
        </div>

        {knowledgePanel ? (
          <div className="search-sidebar-panel">
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
          </div>
        ) : null}
      </div>
    </div>
  );
}
