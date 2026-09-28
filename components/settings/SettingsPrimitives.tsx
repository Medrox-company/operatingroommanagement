'use client';

import React from 'react';
import type { LucideIcon } from 'lucide-react';
// ============================================================================
// Reusable bits
// ============================================================================

export interface FieldProps {
  label: string;
  icon: LucideIcon;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  fullWidth?: boolean;
  type?: string;
}

export const Field: React.FC<FieldProps> = ({ label, icon: Icon, placeholder, value, onChange, disabled, fullWidth, type }) => (
  <div className={fullWidth ? 'md:col-span-2' : ''}>
    <label className="mb-2 block text-[8px] font-bold uppercase tracking-[0.16em] text-white/38">{label}</label>
    <div className="relative">
      <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
      <input
        type={type ?? 'text'}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="h-10 w-full rounded-lg border border-white/[0.08] bg-white/[0.035] pl-10 pr-3 text-sm text-white outline-none transition-colors placeholder:text-white/22 focus:border-cyan-200/30 focus:bg-white/[0.05] disabled:cursor-not-allowed disabled:opacity-50"
      />
    </div>
  </div>
);

export const InfoRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="flex items-center justify-between gap-4">
    <dt className="text-[8px] font-bold uppercase tracking-[0.16em] text-white/38">{label}</dt>
    <dd className="truncate text-right text-[12px] font-semibold text-white/85">{value}</dd>
  </div>
);
