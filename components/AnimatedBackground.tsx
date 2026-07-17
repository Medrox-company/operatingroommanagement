'use client';

import React, { useMemo } from 'react';
import type { BackgroundSettings } from '../lib/db';

/** Sestaví CSS gradient/barvu z nastavení (sdíleno s App backgroundStyle). */
export function backgroundGradientCSS(s: BackgroundSettings): string {
  const colors = s.colors || [];
  if (s.type === 'solid' || colors.length <= 1) {
    return colors[0]?.color || '#0a0a12';
  }
  const sorted = [...colors].sort((a, b) => a.position - b.position);
  const stops = sorted.map((c) => `${c.color} ${c.position}%`).join(', ');
  if (s.type === 'radial') {
    return `radial-gradient(circle at center, ${stops})`;
  }
  return `linear-gradient(${s.direction || 'to bottom'}, ${stops})`;
}

// Deterministické rozmístění částic (stejné při každém renderu, žádný náhodný posun).
const PARTICLES = Array.from({ length: 16 }, (_, i) => {
  const r = (n: number) => (Math.sin(i * 99.13 + n * 47.7) + 1) / 2;
  return {
    left: Math.round(r(1) * 100),
    size: 3 + Math.round(r(2) * 7),
    op: 0.2 + r(3) * 0.4,
    dur: 16 + Math.round(r(4) * 18),
    delay: -Math.round(r(5) * 22),
  };
});

interface Props {
  settings: BackgroundSettings;
  className?: string;
}

/**
 * Animované pozadí aplikace — gradient/barva + volitelný lehký CSS efekt.
 * Vyplní rodičovský prvek (absolute inset-0). Respektuje prefers-reduced-motion
 * (efekty se v tom případě zastaví, viz globals.css).
 */
const AnimatedBackground: React.FC<Props> = ({ settings, className }) => {
  const anim = settings.animation ?? 'none';
  const speed = Math.min(5, Math.max(1, settings.animationSpeed ?? 3));
  const grad = useMemo(() => backgroundGradientCSS(settings), [settings]);
  const palette = (settings.colors || []).map((c) => c.color).filter(Boolean);
  const pick = (i: number) => (palette.length ? palette[i % palette.length] : '#8B5CF6');
  const auroraOffset = palette.length >= 4 ? 1 : 0;
  const auroraColors = [pick(auroraOffset), pick(auroraOffset + 1), pick(auroraOffset + 2)];

  // Vyšší rychlost = kratší doba cyklu.
  const dur = (base: number) => `${((base * 3) / speed).toFixed(1)}s`;
  const baseOpacity = (settings.opacity ?? 100) / 100;

  const gradClass = anim === 'gradient-shift' ? 'bg-anim-gradient' : anim === 'pulse' ? 'bg-anim-pulse' : '';

  const gradStyle = {
    background: grad,
    opacity: baseOpacity,
    '--bg-dur': dur(anim === 'pulse' ? 9 : 18),
  } as React.CSSProperties;

  return (
    <div className={`absolute inset-0 overflow-hidden ${className || ''}`}>
      {/* Základní barevná / gradientní vrstva */}
      <div className={`absolute inset-0 transition-all duration-500 ${gradClass}`} style={gradStyle} />

      {/* Aurora — jediná kompozitní gradientová vrstva bez blur filtru. */}
      {anim === 'aurora' && (
        <div
          className="bg-aurora-flow"
          style={{
            opacity: baseOpacity,
            background: `radial-gradient(ellipse 36% 25% at 24% 43%, ${auroraColors[0]}AA 0%, ${auroraColors[0]}38 46%, transparent 74%), radial-gradient(ellipse 42% 28% at 53% 48%, ${auroraColors[1]}A8 0%, ${auroraColors[1]}38 50%, transparent 76%), radial-gradient(ellipse 34% 28% at 77% 40%, ${auroraColors[2]}88 0%, ${auroraColors[2]}30 49%, transparent 75%)`,
            '--bg-dur': dur(22),
          } as React.CSSProperties}
        />
      )}

      {/* Plovoucí částice / bokeh */}
      {anim === 'particles' && (
        <div className="absolute inset-0 overflow-hidden">
          {PARTICLES.map((p, i) => (
            <span
              key={i}
              className="bg-particle"
              style={{
                left: `${p.left}%`,
                width: `${p.size}px`,
                height: `${p.size}px`,
                background: pick(i),
                boxShadow: `0 0 ${p.size * 2}px ${pick(i)}`,
                '--p-op': p.op,
                animation: `bg-rise ${dur(p.dur)} linear ${p.delay}s infinite`,
              } as React.CSSProperties}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default AnimatedBackground;
