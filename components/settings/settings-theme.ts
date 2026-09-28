'use client';

import React from 'react';
export const COLORS = {
  cyan: '#36D9EC',
  green: '#34D399',
  amber: '#FBBF24',
  red: '#FB7185',
  blue: '#38BDF8',
  violet: '#A78BFA',
};

/** Neutrální skleněné plochy sdílené s modulem Rozpis sálů. */
export const SURFACE: React.CSSProperties = {
  background: 'rgba(255,255,255,0.025)',
  border: '1px solid rgba(255,255,255,0.06)',
};

export const CARD: React.CSSProperties = {
  background: 'rgba(255,255,255,0.018)',
  border: '1px solid rgba(255,255,255,0.055)',
};

export const CARD_OFF: React.CSSProperties = {
  background: 'rgba(255,255,255,0.008)',
  border: '1px solid rgba(255,255,255,0.04)',
};

export const TILE: React.CSSProperties = {
  background: 'rgba(255,255,255,0.018)',
  border: '1px solid rgba(255,255,255,0.05)',
};

export const TILE_ACTIVE: React.CSSProperties = {
  background: 'rgba(255,255,255,0.07)',
  border: '1px solid rgba(54,217,236,0.16)',
};

export const TIER_COLOR = { superadmin: '#E0574F', admin: '#D99C35', roles: '#38BDF8' } as const;
