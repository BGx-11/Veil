'use client';

import React, { useRef, useEffect, useCallback } from 'react';

/**
 * AuroraBackground — GPU-optimized animated background
 * Uses Canvas2D with minimal draw calls, auto-throttles on low FPS.
 * Renders soft, flowing aurora blobs + sparse particle field.
 */

interface AuroraParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  opacity: number;
  opacityDir: number;
}

export default function AuroraBackground({ isDark = true }: { isDark?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const particlesRef = useRef<AuroraParticle[]>([]);
  const timeRef = useRef(0);
  const fpsRef = useRef({ frames: 0, lastTime: 0, currentFps: 60 });
  const qualityRef = useRef(1); // 1 = full, 0.5 = reduced

  const initParticles = useCallback((w: number, h: number) => {
    const count = Math.min(Math.floor((w * h) / 45000), 35); // Scale with screen, cap at 35
    const particles: AuroraParticle[] = [];
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.15,
        vy: (Math.random() - 0.5) * 0.1,
        radius: Math.random() * 1.5 + 0.5,
        opacity: Math.random() * 0.3 + 0.05,
        opacityDir: (Math.random() - 0.5) * 0.003,
      });
    }
    particlesRef.current = particles;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let w = 0, h = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio * qualityRef.current, 1.5);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      initParticles(w, h);
    };

    resize();
    window.addEventListener('resize', resize);

    // Aurora blob definitions
    const blobs = [
      { cx: 0.25, cy: 0.15, rx: 0.4, ry: 0.3, speed: 0.0003, phase: 0,
        darkColor: [77, 141, 255], lightColor: [58, 123, 245], opacity: 0.06 },
      { cx: 0.72, cy: 0.25, rx: 0.3, ry: 0.25, speed: 0.00025, phase: 2,
        darkColor: [138, 109, 255], lightColor: [124, 92, 255], opacity: 0.045 },
      { cx: 0.5, cy: 0.82, rx: 0.35, ry: 0.22, speed: 0.00035, phase: 4,
        darkColor: [66, 232, 255], lightColor: [26, 200, 224], opacity: 0.035 },
    ];

    const draw = (timestamp: number) => {
      // FPS tracking & auto-throttle
      fpsRef.current.frames++;
      if (timestamp - fpsRef.current.lastTime >= 1000) {
        fpsRef.current.currentFps = fpsRef.current.frames;
        fpsRef.current.frames = 0;
        fpsRef.current.lastTime = timestamp;

        // Auto-reduce quality if FPS drops below 30
        if (fpsRef.current.currentFps < 30 && qualityRef.current > 0.5) {
          qualityRef.current = 0.5;
          resize();
        }
      }

      const dt = timestamp - timeRef.current;
      timeRef.current = timestamp;
      const t = timestamp * 0.001;

      ctx.clearRect(0, 0, w, h);

      // Draw aurora blobs
      for (const blob of blobs) {
        const offsetX = Math.sin(t * blob.speed * 1000 + blob.phase) * w * 0.05;
        const offsetY = Math.cos(t * blob.speed * 800 + blob.phase * 1.3) * h * 0.04;
        const cx = blob.cx * w + offsetX;
        const cy = blob.cy * h + offsetY;
        const rx = blob.rx * w;
        const ry = blob.ry * h;

        const color = isDark ? blob.darkColor : blob.lightColor;
        const opMult = isDark ? 1 : 0.5;
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(rx, ry));
        grad.addColorStop(0, `rgba(${color[0]},${color[1]},${color[2]},${blob.opacity * opMult})`);
        grad.addColorStop(0.5, `rgba(${color[0]},${color[1]},${color[2]},${blob.opacity * opMult * 0.4})`);
        grad.addColorStop(1, `rgba(${color[0]},${color[1]},${color[2]},0)`);

        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
      }

      // Draw particles
      const particles = particlesRef.current;
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.opacity += p.opacityDir;

        if (p.opacity <= 0.03 || p.opacity >= 0.35) p.opacityDir *= -1;
        if (p.x < 0) p.x = w;
        if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h;
        if (p.y > h) p.y = 0;

        const particleColor = isDark ? '180, 200, 255' : '80, 100, 160';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${particleColor},${p.opacity * (isDark ? 1 : 0.6)})`;
        ctx.fill();
      }

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [isDark, initParticles]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0 pointer-events-none"
      style={{ opacity: isDark ? 0.9 : 0.7 }}
      aria-hidden="true"
    />
  );
}
