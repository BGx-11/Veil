'use client';

import React, { useState, useEffect, useRef } from 'react';
import { BookOpen, X, Type, Minus, Plus, Loader2, Play, Square } from 'lucide-react';

import { unwrapProxyUrl } from '@/lib/store';

interface ReaderModeProps { isOpen: boolean; onClose: () => void; url: string; }

export default function ReaderMode({ isOpen, onClose, url }: ReaderModeProps) {
  const [content, setContent] = useState<{ title: string; content: string; siteName: string; readingTime?: number; wordCount?: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [fontSize, setFontSize] = useState(18);
  const [fontFamily, setFontFamily] = useState<'serif' | 'sans-serif'>('serif');
  const [readerTheme, setReaderTheme] = useState<'dark' | 'light' | 'sepia'>('dark');
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const scrollMax = target.scrollHeight - target.clientHeight;
    if (scrollMax > 0) {
      setScrollProgress((target.scrollTop / scrollMax) * 100);
    } else {
      setScrollProgress(0);
    }
  };

  const toggleTTS = () => {
    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
    } else if (content?.content) {
      // Strip HTML tags for speech
      const text = content.content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.onend = () => setIsPlaying(false);
      window.speechSynthesis.speak(utterance);
      setIsPlaying(true);
    }
  };

  // Cleanup TTS on unmount or close
  useEffect(() => {
    if (!isOpen && isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
    }
  }, [isOpen, isPlaying]);

  useEffect(() => {
    if (!isOpen) return;
    const realUrl = unwrapProxyUrl(url);
    if (!realUrl) {
      setContent({ title: 'Error', content: '<p>Could not determine the original URL for Reader Mode.</p>', siteName: '' });
      return;
    }

    setLoading(true);
    fetch(`http://127.0.0.1:8181/readability?url=${encodeURIComponent(realUrl)}`)
      .then(res => res.json())
      .then(data => { setContent(data); setLoading(false); })
      .catch(err => { setContent({ title: 'Error', content: '<p>Failed to parse article using Veil Backend.</p>', siteName: '' }); setLoading(false); });
  }, [isOpen, url]);

  if (!isOpen) return null;

  const themeVars = {
    dark: { bg: 'var(--bg-base)', text: 'var(--text-primary)', textMuted: 'var(--text-secondary)', accent: 'var(--violet)' },
    light: { bg: '#fafafa', text: '#1d1d1f', textMuted: '#86868b', accent: '#0066cc' },
    sepia: { bg: '#f4ecd8', text: '#5b4636', textMuted: '#8b7355', accent: '#8b5e34' },
  };
  const t = themeVars[readerTheme];

  return (
    <div className="absolute inset-0 z-40 overflow-hidden flex flex-col transition-colors duration-300 animate-fade-in" style={{ background: t.bg, color: t.text }}>
      {/* Progress Bar */}
      <div className="w-full h-1 bg-black/5 dark:bg-white/5 flex-shrink-0">
        <div 
          className="h-full transition-all duration-150 ease-out" 
          style={{ width: `${scrollProgress}%`, background: t.accent }} 
        />
      </div>

      {/* Controls bar */}
      <div
        className="flex items-center justify-between px-6 py-3 flex-shrink-0 transition-colors duration-300 shadow-sm"
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

          <div className="w-px h-6 bg-black/10 dark:bg-white/10 mx-1" />

          {/* TTS */}
          <button
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors hover:scale-105"
            style={{ background: isPlaying ? t.accent : readerTheme === 'dark' ? 'var(--glass-bg-active)' : 'rgba(0,0,0,0.05)', color: isPlaying ? '#fff' : t.text }}
            onClick={toggleTTS} title={isPlaying ? "Stop listening" : "Listen to article"}
          >
            {isPlaying ? <Square size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
          </button>

          <button className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors hover:bg-red-500/10 hover:text-red-500 ml-2" onClick={onClose} title="Exit Reader Mode">
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto w-full scroll-smooth" onScroll={handleScroll}>
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
