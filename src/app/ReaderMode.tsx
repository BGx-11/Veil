'use client';

import React, { useState, useEffect } from 'react';
import { BookOpen, X, Type, Sun, Moon, Minus, Plus } from 'lucide-react';

interface ReaderModeProps {
  isOpen: boolean;
  onClose: () => void;
  webviewRef: any;
}

const EXTRACTION_SCRIPT = `
(function() {
  // Simple article extraction — grab the main content
  const selectors = [
    'article', '[role="main"]', 'main',
    '.post-content', '.article-content', '.entry-content',
    '.post-body', '.article-body', '#article-body',
    '.story-body', '.content-body',
  ];
  
  let article = null;
  for (const sel of selectors) {
    article = document.querySelector(sel);
    if (article && article.textContent.trim().length > 200) break;
    article = null;
  }
  
  // Fallback: find the largest text block
  if (!article) {
    let best = null;
    let bestLen = 0;
    document.querySelectorAll('div, section').forEach(el => {
      const text = el.textContent || '';
      const pCount = el.querySelectorAll('p').length;
      if (pCount >= 3 && text.length > bestLen) {
        bestLen = text.length;
        best = el;
      }
    });
    article = best;
  }
  
  if (!article) {
    return JSON.stringify({ title: document.title, content: '<p>Could not extract article content from this page.</p>', siteName: '' });
  }
  
  // Clone and clean
  const clone = article.cloneNode(true);
  clone.querySelectorAll('script, style, nav, footer, aside, iframe, .ad, .ads, .social, .share, .comments, .sidebar, .related, .newsletter, form, [role="complementary"], [role="navigation"]').forEach(el => el.remove());
  
  // Get site name
  const ogSite = document.querySelector('meta[property="og:site_name"]');
  const siteName = ogSite ? ogSite.getAttribute('content') : new URL(window.location.href).hostname;
  
  // Get reading time
  const words = (clone.textContent || '').trim().split(/\\s+/).length;
  const readingTime = Math.max(1, Math.ceil(words / 200));
  
  return JSON.stringify({
    title: document.title,
    content: clone.innerHTML,
    siteName: siteName || '',
    readingTime: readingTime,
    wordCount: words,
  });
})();
`;

export default function ReaderMode({ isOpen, onClose, webviewRef }: ReaderModeProps) {
  const [content, setContent] = useState<{ title: string; content: string; siteName: string; readingTime?: number; wordCount?: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [fontSize, setFontSize] = useState(18);
  const [fontFamily, setFontFamily] = useState<'serif' | 'sans-serif'>('serif');
  const [readerTheme, setReaderTheme] = useState<'dark' | 'light' | 'sepia'>('dark');

  useEffect(() => {
    if (!isOpen || !webviewRef?.current) return;
    setLoading(true);
    try {
      const iframe = webviewRef.current as HTMLIFrameElement;
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!doc) {
        setContent({ title: 'Error', content: '<p>Could not access page content. The page may be cross-origin protected.</p>', siteName: '' });
        setLoading(false);
        return;
      }

      // Extract article content from iframe document
      const selectors = [
        'article', '[role="main"]', 'main',
        '.post-content', '.article-content', '.entry-content',
        '.post-body', '.article-body', '#article-body',
        '.story-body', '.content-body',
      ];
      let article: Element | null = null;
      for (const sel of selectors) {
        article = doc.querySelector(sel);
        if (article && (article.textContent?.trim().length || 0) > 200) break;
        article = null;
      }
      // Fallback: find the largest text block
      if (!article) {
        let best: Element | null = null;
        let bestLen = 0;
        doc.querySelectorAll('div, section').forEach((el) => {
          const text = el.textContent || '';
          const pCount = el.querySelectorAll('p').length;
          if (pCount >= 3 && text.length > bestLen) {
            bestLen = text.length;
            best = el;
          }
        });
        article = best;
      }

      if (!article) {
        setContent({ title: doc.title, content: '<p>Could not extract article content from this page.</p>', siteName: '' });
        setLoading(false);
        return;
      }

      const clone = article.cloneNode(true) as Element;
      clone.querySelectorAll('script, style, nav, footer, aside, iframe, .ad, .ads, .social, .share, .comments, .sidebar, .related, .newsletter, form').forEach(el => el.remove());
      const ogSite = doc.querySelector('meta[property="og:site_name"]');
      const siteName = ogSite ? ogSite.getAttribute('content') || '' : '';
      const words = (clone.textContent || '').trim().split(/\s+/).length;
      const readingTime = Math.max(1, Math.ceil(words / 200));

      setContent({
        title: doc.title,
        content: clone.innerHTML,
        siteName,
        readingTime,
        wordCount: words,
      });
      setLoading(false);
    } catch (_e) {
      setContent({ title: 'Error', content: '<p>Could not access page content. The page may be cross-origin protected.</p>', siteName: '' });
      setLoading(false);
    }
  }, [isOpen, webviewRef?.current]);

  if (!isOpen) return null;

  const themeVars: Record<string, Record<string, string>> = {
    dark: { bg: '#1a1a1f', text: '#e0e0e5', textMuted: '#9e9ea6', accent: '#007aff' },
    light: { bg: '#fafafa', text: '#1d1d1f', textMuted: '#86868b', accent: '#0066cc' },
    sepia: { bg: '#f4ecd8', text: '#5b4636', textMuted: '#8b7355', accent: '#8b5e34' },
  };
  const t = themeVars[readerTheme];

  return (
    <div className="reader-overlay" style={{ background: t.bg, color: t.text }}>
      {/* Controls bar */}
      <div className="reader-controls" style={{ borderBottom: `1px solid ${readerTheme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}` }}>
        <div className="reader-controls-left">
          <BookOpen size={16} color={t.accent} />
          <span style={{ fontWeight: 600, fontSize: '13px' }}>Reader Mode</span>
          {content?.readingTime && (
            <span style={{ fontSize: '12px', color: t.textMuted }}>
              {content.readingTime} min read · {content.wordCount?.toLocaleString()} words
            </span>
          )}
        </div>
        <div className="reader-controls-right">
          {/* Font size */}
          <div className="reader-control-group">
            <button onClick={() => setFontSize(Math.max(12, fontSize - 2))} title="Decrease font size">
              <Minus size={12} />
            </button>
            <span style={{ fontSize: '12px', minWidth: '30px', textAlign: 'center' }}>{fontSize}px</span>
            <button onClick={() => setFontSize(Math.min(28, fontSize + 2))} title="Increase font size">
              <Plus size={12} />
            </button>
          </div>

          {/* Font family */}
          <button
            className={`reader-btn ${fontFamily === 'serif' ? 'active' : ''}`}
            onClick={() => setFontFamily(fontFamily === 'serif' ? 'sans-serif' : 'serif')}
            title="Toggle font"
          >
            <Type size={14} />
          </button>

          {/* Theme */}
          <div className="reader-control-group">
            <button
              className={readerTheme === 'dark' ? 'active' : ''}
              onClick={() => setReaderTheme('dark')}
              title="Dark theme"
              style={{ background: '#1a1a1f', width: 20, height: 20, borderRadius: '50%', border: readerTheme === 'dark' ? '2px solid var(--accent)' : '2px solid transparent' }}
            />
            <button
              className={readerTheme === 'light' ? 'active' : ''}
              onClick={() => setReaderTheme('light')}
              title="Light theme"
              style={{ background: '#fafafa', width: 20, height: 20, borderRadius: '50%', border: readerTheme === 'light' ? '2px solid var(--accent)' : '2px solid transparent' }}
            />
            <button
              className={readerTheme === 'sepia' ? 'active' : ''}
              onClick={() => setReaderTheme('sepia')}
              title="Sepia theme"
              style={{ background: '#f4ecd8', width: 20, height: 20, borderRadius: '50%', border: readerTheme === 'sepia' ? '2px solid var(--accent)' : '2px solid transparent' }}
            />
          </div>

          <button className="reader-close-btn" onClick={onClose} title="Exit Reader Mode">
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="reader-body">
        {loading ? (
          <div className="reader-loading">
            <div className="reader-loading-spinner" />
            <span style={{ color: t.textMuted }}>Extracting article…</span>
          </div>
        ) : content ? (
          <article className="reader-article" style={{ fontFamily: fontFamily === 'serif' ? 'Georgia, "Times New Roman", serif' : '"Outfit", -apple-system, sans-serif' }}>
            {content.siteName && (
              <div className="reader-site-name" style={{ color: t.accent }}>{content.siteName}</div>
            )}
            <h1 className="reader-title" style={{ fontSize: `${fontSize + 12}px` }}>{content.title}</h1>
            <div
              className="reader-content"
              style={{ fontSize: `${fontSize}px`, color: t.text }}
              dangerouslySetInnerHTML={{ __html: content.content }}
            />
          </article>
        ) : null}
      </div>
    </div>
  );
}
