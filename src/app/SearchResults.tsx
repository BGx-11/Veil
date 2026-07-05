'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Loader2, BookOpen, ExternalLink, Sparkles, Image as ImageIcon, ShoppingBag, Newspaper, Video, Search, AlertTriangle, RefreshCw } from 'lucide-react';
import { getSLMPipeline, removeSLMProgressCallback } from '@/lib/slm';
import { useBrowserStore } from '@/lib/store';

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

// ─── Parsing Helpers ─────────────────────────────────────────────

/**
 * Extracts the real destination URL from a DuckDuckGo redirect wrapper.
 * DDG wraps results in links like: //duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.com&rut=...
 */
function decodeDDGRedirect(rawUrl: string): string {
  if (!rawUrl) return rawUrl;
  try {
    // Handle protocol-relative URLs
    let normalized = rawUrl;
    if (normalized.startsWith('//')) normalized = 'https:' + normalized;

    // Check if this is a DDG redirect link
    if (normalized.includes('duckduckgo.com/l/?') || normalized.includes('duckduckgo.com/y.js?')) {
      const parsed = new URL(normalized);
      const realUrl = parsed.searchParams.get('uddg') || parsed.searchParams.get('u');
      if (realUrl) return realUrl;
    }

    return normalized;
  } catch {
    return rawUrl;
  }
}

/**
 * Resolves a possibly-relative URL against a base, stripping common redirect wrappers.
 */
function resolveUrl(rawUrl: string, engine: string): string {
  if (!rawUrl) return '';
  let url = rawUrl.trim();

  // Strip leading/trailing whitespace from href
  if (url.startsWith('//')) url = 'https:' + url;

  if (engine === 'duckduckgo') {
    url = decodeDDGRedirect(url);
  } else if (engine === 'google') {
    // Google wraps in /url?q=...
    if (url.startsWith('/url?') || url.includes('google.com/url?')) {
      try {
        const parsed = new URL(url, 'https://www.google.com');
        const real = parsed.searchParams.get('q') || parsed.searchParams.get('url');
        if (real) url = real;
      } catch { /* keep original */ }
    }
  }

  // Final validation
  try {
    new URL(url);
    return url;
  } catch {
    // If not a valid absolute URL, try prepending https
    if (url && !url.startsWith('http')) {
      return 'https://' + url;
    }
    return url;
  }
}

// ─── Engine-specific Parsers ─────────────────────────────────────

function parseDuckDuckGo(doc: Document): SearchResult[] {
  const results: SearchResult[] = [];

  // DDG HTML Lite uses .result containers
  const resultNodes = doc.querySelectorAll('.result');
  resultNodes.forEach((node) => {
    // The actual link is on the title anchor
    const titleAnchor = node.querySelector('.result__title a, .result__a') as HTMLAnchorElement | null;
    const snippetEl = node.querySelector('.result__snippet');

    // Also try .result__url for display text
    const displayUrlEl = node.querySelector('.result__url');

    if (titleAnchor) {
      let rawHref = titleAnchor.getAttribute('href') || '';
      const actualUrl = resolveUrl(rawHref, 'duckduckgo');

      // Skip if the URL is empty or just a DDG internal link
      if (!actualUrl || actualUrl.includes('duckduckgo.com/l/?') || actualUrl === 'https://') return;

      const title = titleAnchor.textContent?.trim() || '';
      const description = snippetEl?.textContent?.trim() || '';
      const displayUrl = displayUrlEl?.textContent?.trim() || actualUrl;

      if (title) {
        results.push({ title, description, url: actualUrl, displayUrl });
      }
    }
  });

  // Also try the non-lite DDG format (div.result__body, etc.)
  if (results.length === 0) {
    const altNodes = doc.querySelectorAll('[data-result], .nrn-react-div');
    altNodes.forEach((node) => {
      const linkEl = node.querySelector('a[href]') as HTMLAnchorElement | null;
      const titleEl = node.querySelector('h2, .result__title');
      const snippetEl = node.querySelector('.result__snippet, [data-result] span');
      if (linkEl && titleEl) {
        const actualUrl = resolveUrl(linkEl.getAttribute('href') || '', 'duckduckgo');
        if (actualUrl && !actualUrl.includes('duckduckgo.com')) {
          results.push({
            title: titleEl.textContent?.trim() || '',
            description: snippetEl?.textContent?.trim() || '',
            url: actualUrl,
            displayUrl: actualUrl,
          });
        }
      }
    });
  }

  return results;
}

function parseGoogle(doc: Document): SearchResult[] {
  const results: SearchResult[] = [];

  // Primary selector
  const resultNodes = doc.querySelectorAll('div.g, div.MjjYud div.g');
  resultNodes.forEach((node) => {
    const linkEl = node.querySelector('a[href^="http"], a[href^="/url"]') as HTMLAnchorElement | null;
    const titleEl = node.querySelector('h3');
    // Google uses various classes for snippets
    const snippetEl = node.querySelector(
      'div[data-sncf], div.VwiC3b, span.aCOpRe, div[style="-webkit-line-clamp:2"], div.IsZvec'
    );

    if (linkEl && titleEl) {
      const actualUrl = resolveUrl(linkEl.getAttribute('href') || '', 'google');
      if (actualUrl) {
        results.push({
          title: titleEl.textContent?.trim() || '',
          description: snippetEl?.textContent?.trim() || '',
          url: actualUrl,
          displayUrl: actualUrl,
        });
      }
    }
  });

  // Fallback: broader selector
  if (results.length === 0) {
    const altNodes = doc.querySelectorAll('div[data-sokoban-container], div.g');
    altNodes.forEach((node) => {
      const linkEl = node.querySelector('a') as HTMLAnchorElement | null;
      const titleEl = node.querySelector('h3, [role="heading"]');
      if (linkEl && titleEl) {
        const actualUrl = resolveUrl(linkEl.getAttribute('href') || '', 'google');
        if (actualUrl && !actualUrl.includes('google.com/search')) {
          results.push({
            title: titleEl.textContent?.trim() || '',
            description: '',
            url: actualUrl,
            displayUrl: actualUrl,
          });
        }
      }
    });
  }

  return results;
}

function parseBrave(doc: Document): SearchResult[] {
  const results: SearchResult[] = [];

  // Brave uses .snippet elements
  const selectors = [
    '.snippet[data-type="web"]',
    '.snippet',
    'div.fdb',
    'div[data-pos]',
  ];

  for (const selector of selectors) {
    const nodes = doc.querySelectorAll(selector);
    nodes.forEach((node) => {
      const linkEl = node.querySelector('a[href^="http"]') as HTMLAnchorElement | null;
      const titleEl = node.querySelector(
        '.title, .snippet-title, .heading, h2, h3'
      );
      const snippetEl = node.querySelector(
        '.snippet-description, .snippet-content, .description, p'
      );

      if (linkEl && titleEl) {
        const actualUrl = linkEl.getAttribute('href') || '';
        if (actualUrl && !actualUrl.includes('search.brave.com')) {
          results.push({
            title: titleEl.textContent?.trim() || '',
            description: snippetEl?.textContent?.trim() || '',
            url: actualUrl,
            displayUrl: actualUrl,
          });
        }
      }
    });
    if (results.length > 0) break;
  }

  return results;
}

function parseBing(doc: Document): SearchResult[] {
  const results: SearchResult[] = [];

  const resultNodes = doc.querySelectorAll('.b_algo, li.b_algo');
  resultNodes.forEach((node) => {
    const linkEl = node.querySelector('h2 a, h2 > a') as HTMLAnchorElement | null;
    const snippetEl = node.querySelector('.b_caption p, .b_algoSlug, .b_paractl, .b_dList');

    if (linkEl) {
      let actualUrl = linkEl.getAttribute('href') || '';
      if (actualUrl.startsWith('//')) actualUrl = 'https:' + actualUrl;

      if (actualUrl) {
        results.push({
          title: linkEl.textContent?.trim() || '',
          description: snippetEl?.textContent?.trim() || '',
          url: actualUrl,
          displayUrl: actualUrl,
        });
      }
    }
  });

  return results;
}

function parseYahoo(doc: Document): SearchResult[] {
  const results: SearchResult[] = [];

  const resultNodes = doc.querySelectorAll('.compTitle, .algo');
  resultNodes.forEach((node) => {
    const linkEl = (node.querySelector('a') || (node.tagName.toLowerCase() === 'a' ? node : null)) as HTMLAnchorElement | null;
    const titleEl = node.querySelector('h3, .title');
    let snippetEl = node.querySelector('.compText, p');
    
    if (!snippetEl && node.nextElementSibling && (node.nextElementSibling.classList.contains('compText') || node.nextElementSibling.querySelector('.compText'))) {
      snippetEl = node.nextElementSibling;
    }

    if (linkEl && titleEl) {
      let actualUrl = linkEl.getAttribute('href') || '';
      if (actualUrl.includes('/RU=')) {
        try {
          const match = actualUrl.match(/\/RU=([^\/]+)/);
          if (match) actualUrl = decodeURIComponent(match[1]);
        } catch {}
      }

      if (actualUrl && actualUrl.startsWith('http') && !actualUrl.includes('search.yahoo.com')) {
        results.push({
          title: titleEl.textContent?.trim() || '',
          description: snippetEl?.textContent?.trim() || '',
          url: actualUrl,
          displayUrl: actualUrl,
        });
      }
    }
  });

  return results;
}

// ─── Main Component ──────────────────────────────────────────────

export default function SearchResults({ query, onNavigate }: { query: string; onNavigate: (url: string) => void }) {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [knowledgePanel, setKnowledgePanel] = useState<KnowledgePanelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const [slmSummary, setSlmSummary] = useState<string | null>(null);
  const [slmGenerating, setSlmGenerating] = useState(false);
  const [slmProgress, setSlmProgress] = useState('Analyzing results...');
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [activeTab, setActiveTab] = useState('All');
  const [visibleCount, setVisibleCount] = useState(30);
  const [usedEngine, setUsedEngine] = useState<string | null>(null);
  const [usedFallback, setUsedFallback] = useState(false);

  // Cache results so tab switching doesn't re-fetch
  const cachedResults = useRef<SearchResult[]>([]);

  const buildSearchUrl = useCallback((engine: string, q: string) => {
    switch (engine) {
      case 'yahoo':
        return `https://search.yahoo.com/search?p=${encodeURIComponent(q)}`;
      case 'duckduckgo':
        return `https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`;
      case 'google':
        return `https://www.google.com/search?q=${encodeURIComponent(q)}`;
      case 'brave':
        return `https://search.brave.com/search?q=${encodeURIComponent(q)}`;
      default: // bing
        return `https://www.bing.com/search?q=${encodeURIComponent(q)}`;
    }
  }, []);

  const parseResults = useCallback((doc: Document, engine: string): SearchResult[] => {
    switch (engine) {
      case 'yahoo':      return parseYahoo(doc);
      case 'duckduckgo': return parseDuckDuckGo(doc);
      case 'google':     return parseGoogle(doc);
      case 'brave':      return parseBrave(doc);
      default:           return parseBing(doc);
    }
  }, []);

  const fetchAndParse = useCallback(async (engine: string, q: string): Promise<{ results: SearchResult[]; isCaptcha: boolean }> => {
    const targetUrl = buildSearchUrl(engine, q);
    const searchUrl = `http://127.0.0.1:8181/proxy?url=${encodeURIComponent(targetUrl)}`;

    const response = await fetch(searchUrl);
    const html = await response.text();

    // Detect CAPTCHA / bot-block pages
    const isCaptcha =
      html.includes('anomaly-modal') ||
      html.includes('unusual traffic') ||
      html.includes('are not a robot') ||
      html.includes('captcha') ||
      html.includes('blocked') ||
      (html.includes('challenge') && html.includes('confirm') && html.includes('human'));

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const parsed = parseResults(doc, engine);

    return { results: parsed, isCaptcha };
  }, [buildSearchUrl, parseResults]);

  // ── Main search effect ──
  useEffect(() => {
    let alive = true;
    let progressCb: any = null;
    setLoading(true);
    setError(null);
    setErrorDetail(null);
    setSlmSummary(null);
    setResults([]);
    setVisibleCount(30);
    setUsedFallback(false);
    cachedResults.current = [];

    (async () => {
      try {
        const engine = useBrowserStore.getState().settings.searchEngine;
        const cleanQuery = decodeURIComponent(query);

        let parsed: SearchResult[] = [];
        let finalEngine = engine;
        let wasCaptcha = false;

        // ── Try the primary search engine ──
        try {
          const result = await fetchAndParse(engine, cleanQuery);
          parsed = result.results;
          wasCaptcha = result.isCaptcha;
        } catch (err: any) {
          console.warn(`Primary engine ${engine} failed:`, err.message);
        }

        // ── Fallback to Yahoo if primary returned nothing ──
        if (parsed.length === 0 && engine !== 'yahoo') {
          console.log(`Primary engine "${engine}" returned 0 results${wasCaptcha ? ' (CAPTCHA detected)' : ''}, falling back to Yahoo...`);
          try {
            const fallbackResult = await fetchAndParse('yahoo', cleanQuery);
            if (fallbackResult.results.length > 0) {
              parsed = fallbackResult.results;
              finalEngine = 'yahoo';
              if (alive) setUsedFallback(true);
            }
          } catch (err: any) {
            console.warn('Yahoo fallback also failed:', err.message);
          }
        }

        // ── Second fallback to Bing if Yahoo failed ──
        if (parsed.length === 0 && engine !== 'bing') {
          try {
            const fallbackResult = await fetchAndParse('bing', cleanQuery);
            if (fallbackResult.results.length > 0) {
              parsed = fallbackResult.results;
              finalEngine = 'bing';
              if (alive) setUsedFallback(true);
            }
          } catch { /* all fallbacks exhausted */ }
        }

        if (!alive) return;
        setUsedEngine(finalEngine);

        if (parsed.length > 0) {
          // Deduplicate by URL
          const seen = new Set<string>();
          const deduped = parsed.filter(r => {
            const key = r.url.replace(/\/$/, '').toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });

          setResults(deduped);
          cachedResults.current = deduped;

          // ── SLM AI Summary ──
          if (useBrowserStore.getState().settings.slmConsent) {
            setSlmGenerating(true);
          (async () => {
            try {
              progressCb = (data: any) => {
                if (data.status === 'downloading' && alive) {
                  setSlmProgress('Downloading Veil Neural Engine...');
                  setDownloadProgress((data.loaded / data.total) * 100);
                } else if (data.status === 'init' && alive) {
                  setSlmProgress('Initializing AI Engine...');
                  setDownloadProgress(0);
                } else if (data.status === 'ready' && alive) {
                  setSlmProgress('Summarizing results...');
                }
              };
              const generator = await getSLMPipeline(progressCb);
              const contextText = deduped.slice(0, 3).map((r) => r.title + ': ' + r.description).join('\n');
              const messagesArray = [
                { role: 'system', content: 'You are Veil AI, a highly intelligent browser assistant. Your task is to read the provided search results and synthesize a precise, exceptionally well-reasoned, and accurate summary paragraph that directly answers the user\'s query. Ensure it is factually correct and concise.' },
                { role: 'user', content: `Query: ${cleanQuery}\n\nResults:\n${contextText}` }
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
          } else {
            setSlmGenerating(false);
          }
        } else {
          if (wasCaptcha) {
            setError('Search engine returned a CAPTCHA challenge');
            setErrorDetail(`${engine} detected automated access. Try switching to a different search engine in Settings, or try again later.`);
          } else {
            setError('No results found');
            setErrorDetail('Try rephrasing your search query or using a different search engine.');
          }
        }

        // ── Wikipedia Knowledge Panel ──
        try {
          const cleanQ = decodeURIComponent(query).trim();
          let wikiRes = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(cleanQ)}`);
          let data = await wikiRes.json();
          if (data.type === 'disambiguation' || data.title === 'Not found.') {
            const searchRes = await fetch(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(cleanQ)}&utf8=&format=json&origin=*`);
            const searchData = await searchRes.json();
            if (searchData?.query?.search?.length > 0) {
              wikiRes = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(searchData.query.search[0].title)}`);
              data = await wikiRes.json();
            }
          }
          if (data.type !== 'disambiguation' && data.title !== 'Not found.' && data.extract && alive) setKnowledgePanel(data);
          else if (alive) setKnowledgePanel(null);
        } catch {
          if (alive) setKnowledgePanel(null);
        }
      } catch (err: any) {
        if (alive) {
          setError(err.message);
          setErrorDetail('The local proxy server may not be running. Make sure the Veil Browser backend is active.');
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => { alive = false; if (progressCb) removeSLMProgressCallback(progressCb); };
  }, [query, fetchAndParse]);

  const decoded = decodeURIComponent(query);
  const getDomain = (url: string) => { try { return new URL(url).hostname; } catch { return url; } };

  const handleRetry = () => {
    // Force re-fetch by toggling a key. We just re-set the query which triggers the effect.
    setResults([]);
    setError(null);
    setErrorDetail(null);
    setLoading(true);
    // The effect depends on [query], so we need to trigger it differently.
    // We'll use a direct approach: re-run the fetch manually.
    window.location.hash = '#retry-' + Date.now();
    window.location.hash = '';
  };

  return (
    <div className="w-full h-full overflow-y-auto" style={{ background: 'transparent' }}>
      <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col gap-6">

        {/* Header & Tabs */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
              Results for <span style={{ color: 'var(--accent)' }}>{decoded}</span>
            </h1>
            {usedFallback && usedEngine && (
              <span
                className="text-xs font-medium px-2.5 py-1 rounded-full"
                style={{ background: 'var(--warning-surface, rgba(245, 158, 11, 0.1))', color: 'var(--warning, #f59e0b)', border: '1px solid rgba(245, 158, 11, 0.2)' }}
              >
                via {usedEngine}
              </span>
            )}
          </div>
          <div className="flex gap-2 border-b" style={{ borderColor: 'var(--glass-border)' }}>
            {TABS.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id} onClick={() => { setActiveTab(tab.id); setVisibleCount(30); }}
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
              <div className="p-6 rounded-xl text-center" style={{ background: 'var(--danger-surface, rgba(239, 68, 68, 0.05))', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <AlertTriangle size={18} style={{ color: 'var(--danger, #ef4444)' }} />
                  <span className="font-semibold" style={{ color: 'var(--danger, #ef4444)' }}>{error}</span>
                </div>
                {errorDetail && (
                  <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>{errorDetail}</p>
                )}
                <button
                  onClick={handleRetry}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all"
                  style={{ background: 'var(--glass-bg-active)', color: 'var(--text-primary)', border: '1px solid var(--glass-border)' }}
                >
                  <RefreshCw size={14} /> Try Again
                </button>
              </div>
            )}

            {!loading && !error && results.length === 0 && (
              <div className="p-6 rounded-xl text-center font-medium" style={{ background: 'var(--glass-bg)', color: 'var(--text-tertiary)' }}>
                No results found.
              </div>
            )}

            {!loading && !error && results.length > 0 && (() => {
              // Simple URL-based heuristic filtering
              const filteredResults = results.filter(r => {
                if (activeTab === 'All') return true;
                const url = r.url.toLowerCase();
                if (activeTab === 'Images') return /\.(jpg|jpeg|png|gif|webp|svg)$/.test(url);
                if (activeTab === 'Videos') return /youtube\.com|vimeo\.com|dailymotion\.com|tiktok\.com|twitch\.tv|\.(mp4|webm|mkv)$/.test(url);
                if (activeTab === 'News') return /news|nytimes|cnn|bbc|theguardian|reuters|apnews|bloomberg|wsj/.test(url);
                if (activeTab === 'Shopping') return /amazon|ebay|walmart|target|etsy|aliexpress|bestbuy/.test(url);
                return true;
              });

              if (filteredResults.length === 0) {
                return (
                  <div className="p-6 rounded-xl text-center font-medium" style={{ background: 'var(--glass-bg)', color: 'var(--text-tertiary)' }}>
                    No {activeTab.toLowerCase()} results found.
                  </div>
                );
              }

              return (
                <div className={`grid ${['Images', 'Videos', 'Shopping'].includes(activeTab) ? 'grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4' : 'flex flex-col gap-4'}`}>
                  {filteredResults.slice(0, visibleCount).map((r, i) => {
                    const domain = getDomain(r.url);
                    return (
                      <div
                        key={`${r.url}-${i}`}
                        className="group flex flex-col p-4 rounded-xl cursor-pointer transition-all duration-200"
                        style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}
                        onClick={(e) => {
                          if (e.ctrlKey || e.metaKey) {
                            useBrowserStore.getState().addTab(r.url);
                          } else {
                            onNavigate(r.url);
                          }
                        }}
                        onAuxClick={(e) => {
                          if (e.button === 1) { // Middle click
                            useBrowserStore.getState().addTab(r.url);
                          }
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--glass-bg-hover)'; e.currentTarget.style.borderColor = 'var(--glass-border-hover)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'var(--glass-bg)'; e.currentTarget.style.borderColor = 'var(--glass-border)'; }}
                      >
                      <div className="flex items-center gap-2 mb-2">
                        <img src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`} className="w-4 h-4 rounded-sm" alt="" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        <span className="text-xs font-medium truncate" style={{ color: 'var(--text-tertiary)' }}>{domain}</span>
                      </div>
                      <h3 className="text-base font-semibold mb-1.5 group-hover:underline decoration-2 underline-offset-2" style={{ color: 'var(--accent)', textDecorationColor: 'var(--accent-glow)' }}>
                        {r.title}
                      </h3>
                        {r.description && (
                          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{r.description}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}

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
