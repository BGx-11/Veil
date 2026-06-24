'use client';

import React, { useState, useEffect } from 'react';
import { BookOpen, X, Type, Minus, Plus, Loader2 } from 'lucide-react';

interface ReaderModeProps { isOpen: boolean; onClose: () => void; webviewRef: any; }

export default function ReaderMode({ isOpen, onClose, webviewRef }: ReaderModeProps) {
  const [content, setContent] = useState<{ title: string; content: string; siteName: string; readingTime?: number; wordCount?: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [fontSize, setFontSize] = useState(18);
  const [fontFamily, setFontFamily] = useState<'serif' | 'sans-serif'>('serif');
  const [readerTheme, setReaderTheme] = useState<'dark' | 'light' | 'sepia'>('dark');

  useEffect(() => {
    if (!isOpen || !webviewRef?.current) return;
    
    const iframe = webviewRef.current as HTMLIFrameElement;
    let originalUrl = '';
    try {
      const srcUrl = new URL(iframe.src);
      if (srcUrl.pathname === '/proxy') originalUrl = srcUrl.searchParams.get('url') || '';
    } catch(e) {}
    
    if (!originalUrl) {
      setContent({ title: 'Error', content: '<p>Could not determine the original URL for Reader Mode.</p>', siteName: '' });
      return;
    }

    setLoading(true);
    fetch(`http://127.0.0.1:8181/readability?url=${encodeURIComponent(originalUrl)}`)
      .then(res => res.json())
      .then(data => { setContent(data); setLoading(false); })
      .catch(err => { setContent({ title: 'Error', content: '<p>Failed to parse article using Veil Backend.</p>', siteName: '' }); setLoading(false); });
  }, [isOpen, webviewRef?.current]);

  if (!isOpen) return null;

  const themeVars = {
    dark: { bg: 'var(--bg-base)', text: 'var(--text-primary)', textMuted: 'var(--text-secondary)', accent: 'var(--violet)' },
    light: { bg: '#fafafa', text: '#1d1d1f', textMuted: '#86868b', accent: '#0066cc' },
    sepia: { bg: '#f4ecd8', text: '#5b4636', textMuted: '#8b7355', accent: '#8b5e34' },
  };
  const t = themeVars[readerTheme];

  return (
    <div className="absolute inset-0 z-40 overflow-hidden flex flex-col transition-colors duration-300 animate-fade-in" style={{ background: t.bg, color: t.text }}>
      {/* Controls bar */}
      <div
        className="flex items-center justify-between px-6 py-3 flex-shrink-0 transition-colors duration-300"
        style={{ borderBottom: `1px solid ${readerTheme === 'dark' ? 'var(--glass-border)' : 'rgba(0,0,0,0.08)'}` }}
      >
        <div className="flex items-center gap-3">
          <BookOpen size={16} style={{ color: t.accent }} />
          <span className="font-semibold text-sm">Reader Mode</span>
          {content?.readingTime && (
            <span className="text-xs" style={{ color: t.textMuted }}>
              {content.readingTime} min read · {content.wordCount?.toLocaleString()} words
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          {/* Font size */}
          <div className="flex items-center gap-1 p-1 rounded-lg" style={{ background: readerTheme === 'dark' ? 'var(--glass-bg-active)' : 'rgba(0,0,0,0.05)' }}>
            <button onClick={() => setFontSize(Math.max(12, fontSize - 2))} className="w-6 h-6 flex items-center justify-center rounded transition-colors hover:bg-black/10 dark:hover:bg-white/10" title="Decrease font size">
              <Minus size={12} />
            </button>
            <span className="text-xs font-medium w-8 text-center">{fontSize}</span>
            <button onClick={() => setFontSize(Math.min(28, fontSize + 2))} className="w-6 h-6 flex items-center justify-center rounded transition-colors hover:bg-black/10 dark:hover:bg-white/10" title="Increase font size">
              <Plus size={12} />
            </button>
          </div>

          {/* Font family */}
          <button
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
            style={{ background: readerTheme === 'dark' ? 'var(--glass-bg-active)' : 'rgba(0,0,0,0.05)', color: fontFamily === 'serif' ? t.accent : t.text }}
            onClick={() => setFontFamily(fontFamily === 'serif' ? 'sans-serif' : 'serif')} title="Toggle font"
          >
            <Type size={14} />
          </button>

          {/* Theme */}
          <div className="flex items-center gap-1.5 p-1 rounded-lg" style={{ background: readerTheme === 'dark' ? 'var(--glass-bg-active)' : 'rgba(0,0,0,0.05)' }}>
            <button
              onClick={() => setReaderTheme('dark')} title="Dark theme"
              className="w-6 h-6 rounded-full border-2 transition-all"
              style={{ background: '#1a1a1f', borderColor: readerTheme === 'dark' ? t.accent : 'transparent' }}
            />
            <button
              onClick={() => setReaderTheme('light')} title="Light theme"
              className="w-6 h-6 rounded-full border-2 transition-all shadow-sm"
              style={{ background: '#fafafa', borderColor: readerTheme === 'light' ? t.accent : 'transparent' }}
            />
            <button
              onClick={() => setReaderTheme('sepia')} title="Sepia theme"
              className="w-6 h-6 rounded-full border-2 transition-all shadow-sm"
              style={{ background: '#f4ecd8', borderColor: readerTheme === 'sepia' ? t.accent : 'transparent' }}
            />
          </div>

          <button className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors hover:bg-red-500/10 hover:text-red-500" onClick={onClose} title="Exit Reader Mode">
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto w-full">
        <div className="max-w-3xl mx-auto px-8 py-16">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-4 py-20 animate-fade-in" style={{ color: t.textMuted }}>
              <Loader2 size={24} className="animate-spin" />
              <span className="text-sm font-medium">Extracting article…</span>
            </div>
          ) : content ? (
            <article className="animate-fade-in" style={{ fontFamily: fontFamily === 'serif' ? 'Georgia, "Times New Roman", serif' : '"Outfit", -apple-system, sans-serif' }}>
              {content.siteName && (
                <div className="text-sm font-bold tracking-wider uppercase mb-4" style={{ color: t.accent }}>{content.siteName}</div>
              )}
              <h1 className="font-bold mb-8 leading-tight" style={{ fontSize: `${fontSize + 16}px` }}>{content.title}</h1>
              <div
                className="markdown-body"
                style={{ fontSize: `${fontSize}px`, color: t.text, lineHeight: 1.6 }}
                dangerouslySetInnerHTML={{ __html: content.content }}
              />
            </article>
          ) : null}
        </div>
      </div>
    </div>
  );
}
