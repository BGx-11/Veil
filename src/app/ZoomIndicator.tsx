'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { useBrowserStore } from '@/lib/store';

export default function ZoomIndicator() {
  const { tabs, activeId, zoomIn, zoomOut, resetZoom } = useBrowserStore();
  const active = tabs.find(t => t.id === activeId);
  const zoomLevel = active?.zoomLevel || 100;
  const [visible, setVisible] = useState(false);
  const [hovered, setHovered] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const prevZoom = useRef(zoomLevel);

  useEffect(() => {
    if (zoomLevel !== prevZoom.current) {
      setVisible(true);
      prevZoom.current = zoomLevel;

      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        if (!hovered) setVisible(false);
      }, 2500);
    }
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [zoomLevel, hovered]);

  // Keep visible while hovered
  useEffect(() => {
    if (!hovered && visible) {
      timeoutRef.current = setTimeout(() => setVisible(false), 1500);
    }
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [hovered]);

  if (zoomLevel === 100 && !visible) return null;

  return (
    <AnimatePresence>
      {(visible || zoomLevel !== 100) && (
        <motion.div
          className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50"
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-full shadow-lg"
            style={{
              background: 'var(--glass-bg)',
              border: '1px solid var(--glass-border)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
            }}
          >
            <button
              onClick={() => zoomOut()}
              className="w-7 h-7 flex items-center justify-center rounded-full transition-colors hover:bg-[var(--glass-bg-hover)] text-[var(--text-secondary)]"
              title="Zoom Out (Ctrl+-)"
            >
              <ZoomOut size={14} />
            </button>

            <button
              onClick={() => resetZoom()}
              className="min-w-[52px] text-center text-sm font-bold px-2 py-1 rounded-lg transition-colors hover:bg-[var(--glass-bg-hover)]"
              style={{ color: zoomLevel === 100 ? 'var(--text-tertiary)' : 'var(--accent-primary)' }}
              title="Reset Zoom (Ctrl+0)"
            >
              {zoomLevel}%
            </button>

            <button
              onClick={() => zoomIn()}
              className="w-7 h-7 flex items-center justify-center rounded-full transition-colors hover:bg-[var(--glass-bg-hover)] text-[var(--text-secondary)]"
              title="Zoom In (Ctrl+=)"
            >
              <ZoomIn size={14} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
