'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  ArrowDown,
  ArrowDownLeft,
  ArrowDownRight,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowUpLeft,
  ArrowUpRight,
  Ban,
  Check,
  CircleDot,
  Eye,
  EyeOff,
  Layers3,
  Loader2,
  Palette,
  Plus,
  RotateCcw,
  Sparkle,
  Sparkles,
  Trash2,
  Waves,
  Wind,
} from 'lucide-react';
import {
  BackgroundAnimation,
  BackgroundSettings,
  fetchBackgroundSettings,
  saveBackgroundSettings,
} from '../lib/db';
import AnimatedBackground, { backgroundGradientCSS } from './AnimatedBackground';

type EditorTab = 'color' | 'animation';

const COLORS = {
  cyan: '#36D9EC',
  green: '#34D399',
  amber: '#FBBF24',
  red: '#FB7185',
  violet: '#A78BFA',
  blue: '#38BDF8',
};

const ANIMATION_OPTIONS: Array<{
  value: BackgroundAnimation;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { value: 'none', label: 'Bez pohybu', description: 'Klidné statické pozadí', icon: Ban },
  { value: 'gradient-shift', label: 'Přelévání', description: 'Plynulý posun gradientu', icon: Waves },
  { value: 'aurora', label: 'Aurora', description: 'Měkké světelné vlny', icon: Sparkles },
  { value: 'particles', label: 'Částice', description: 'Jemné světelné body', icon: Sparkle },
  { value: 'pulse', label: 'Dýchání', description: 'Pozvolný pulz intenzity', icon: Activity },
];

const GRADIENT_DIRECTIONS = [
  { value: 'to top', label: 'Nahoru', icon: ArrowUp },
  { value: 'to bottom', label: 'Dolů', icon: ArrowDown },
  { value: 'to left', label: 'Doleva', icon: ArrowLeft },
  { value: 'to right', label: 'Doprava', icon: ArrowRight },
  { value: 'to top right', label: 'Vpravo nahoru', icon: ArrowUpRight },
  { value: 'to top left', label: 'Vlevo nahoru', icon: ArrowUpLeft },
  { value: 'to bottom right', label: 'Vpravo dolů', icon: ArrowDownRight },
  { value: 'to bottom left', label: 'Vlevo dolů', icon: ArrowDownLeft },
];

const PRESET_COLORS = [
  '#071019', '#0A0A12', '#111827', '#16213E',
  '#164E63', '#0F3460', '#0EA5E9', '#06B6D4',
  '#14B8A6', '#10B981', '#8B5CF6', '#A855F7',
  '#FBBF24', '#F97316', '#EC4899', '#EF4444',
];

const AURORA_PRESETS: Array<{
  id: string;
  name: string;
  description: string;
  colors: BackgroundSettings['colors'];
}> = [
  {
    id: 'clinical-flow',
    name: 'Clinical Flow',
    description: 'Modrá · fialová · magenta',
    colors: [
      { color: '#061425', position: 0 },
      { color: '#075985', position: 38 },
      { color: '#4338CA', position: 70 },
      { color: '#9D174D', position: 100 },
    ],
  },
  {
    id: 'arctic-wave',
    name: 'Arctic Wave',
    description: 'Navy · cyan · ledová modř',
    colors: [
      { color: '#04131F', position: 0 },
      { color: '#0E7490', position: 40 },
      { color: '#2563EB', position: 72 },
      { color: '#5B21B6', position: 100 },
    ],
  },
  {
    id: 'violet-pulse',
    name: 'Violet Pulse',
    description: 'Indigo · violet · růžová',
    colors: [
      { color: '#090C24', position: 0 },
      { color: '#312E81', position: 36 },
      { color: '#7C3AED', position: 70 },
      { color: '#BE185D', position: 100 },
    ],
  },
  {
    id: 'deep-ocean',
    name: 'Deep Ocean',
    description: 'Temná modř · teal · indigo',
    colors: [
      { color: '#030B18', position: 0 },
      { color: '#0C4A6E', position: 38 },
      { color: '#0F766E', position: 68 },
      { color: '#3730A3', position: 100 },
    ],
  },
];

const auroraPreviewBackground = (colors: BackgroundSettings['colors']) => {
  const [base, first, second, third] = colors.map(item => item.color);
  return `radial-gradient(ellipse 55% 70% at 18% 45%, ${first}CC, transparent 72%), radial-gradient(ellipse 55% 75% at 55% 50%, ${second}B8, transparent 74%), radial-gradient(ellipse 48% 70% at 88% 42%, ${third}9E, transparent 74%), ${base}`;
};

const DEFAULT_SETTINGS: BackgroundSettings = {
  type: 'linear',
  colors: [
    { color: '#0a0a12', position: 0 },
    { color: '#1a1a2e', position: 100 },
  ],
  direction: 'to bottom',
  opacity: 100,
  imageUrl: '',
  imageOpacity: 0,
  imageBlur: 0,
  animation: 'none',
  animationSpeed: 3,
};

const panelStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.022)',
  border: '1px solid rgba(125,165,185,0.15)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.028)',
};

const SectionPanel: React.FC<{
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, description, action, children }) => (
  <section className="rounded-[22px] p-4 sm:p-5" style={panelStyle}>
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h2 className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/50">{title}</h2>
        {description && <p className="mt-1 text-[11px] leading-relaxed text-white/28">{description}</p>}
      </div>
      {action}
    </div>
    {children}
  </section>
);

const RangeControl: React.FC<{
  label: string;
  valueLabel: string;
  min: number;
  max: number;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  step?: number;
  color?: string;
}> = ({ label, valueLabel, min, max, value, onChange, disabled, step = 1, color = COLORS.cyan }) => (
  <div>
    <div className="mb-2.5 flex items-center justify-between gap-3">
      <span className="text-[10px] font-semibold text-white/48">{label}</span>
      <span
        className="rounded-lg border px-2 py-1 text-[10px] font-bold tabular-nums"
        style={{ color, borderColor: `${color}25`, background: `${color}0C` }}
      >
        {valueLabel}
      </span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      disabled={disabled}
      onChange={event => onChange(Number(event.target.value))}
      className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/[0.08] accent-cyan-400 disabled:cursor-not-allowed"
    />
  </div>
);

const BackgroundManager: React.FC = () => {
  const [settings, setSettings] = useState<BackgroundSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<EditorTab>('color');
  const [showPreview, setShowPreview] = useState(true);
  const [selectedColorIndex, setSelectedColorIndex] = useState(0);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadSettings = async () => {
      try {
        const storedSettings = await fetchBackgroundSettings();
        if (mounted && storedSettings) {
          setSettings({ ...storedSettings, imageUrl: '', imageOpacity: 0, imageBlur: 0 });
        }
      } catch (error) {
        console.error('[BackgroundManager] Failed to load settings:', error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void loadSettings();
    return () => {
      mounted = false;
    };
  }, []);

  const updateSettings = (updates: Partial<BackgroundSettings>) => {
    setSettings(current => ({ ...current, ...updates }));
    setHasChanges(true);
  };

  const updateColor = (index: number, updates: Partial<{ color: string; position: number }>) => {
    setSettings(current => ({
      ...current,
      colors: current.colors.map((color, colorIndex) => colorIndex === index ? { ...color, ...updates } : color),
    }));
    setHasChanges(true);
  };

  const addColor = () => {
    if (settings.colors.length >= 4) return;
    const nextColors = [...settings.colors, { color: COLORS.violet, position: 50 }]
      .sort((a, b) => a.position - b.position);
    setSettings(current => ({ ...current, colors: nextColors }));
    setSelectedColorIndex(nextColors.findIndex(color => color.color === COLORS.violet && color.position === 50));
    setHasChanges(true);
  };

  const removeColor = (index: number) => {
    if (settings.colors.length <= 1) return;
    const nextColors = settings.colors.filter((_, colorIndex) => colorIndex !== index);
    setSettings(current => ({ ...current, colors: nextColors }));
    setSelectedColorIndex(current => Math.min(current, nextColors.length - 1));
    setHasChanges(true);
  };

  const applyAuroraPreset = (preset: (typeof AURORA_PRESETS)[number]) => {
    updateSettings({
      type: 'linear',
      colors: preset.colors.map(color => ({ ...color })),
      direction: 'to bottom right',
      opacity: 88,
      imageUrl: '',
      imageOpacity: 0,
      imageBlur: 0,
      animation: 'aurora',
      animationSpeed: 1,
    });
    setSelectedColorIndex(0);
  };

  const dispatchSettings = (nextSettings: BackgroundSettings) => {
    window.dispatchEvent(new CustomEvent('backgroundSettingsChanged', { detail: nextSettings }));
  };

  const applyChanges = useCallback(async () => {
    setSaving(true);
    try {
      await saveBackgroundSettings(settings);
      dispatchSettings(settings);
      setHasChanges(false);
    } catch (error) {
      console.error('[BackgroundManager] Failed to save settings:', error);
    } finally {
      setSaving(false);
    }
  }, [settings]);

  const resetToDefaults = async () => {
    setSettings(DEFAULT_SETTINGS);
    setSelectedColorIndex(0);
    setSaving(true);
    try {
      await saveBackgroundSettings(DEFAULT_SETTINGS);
      dispatchSettings(DEFAULT_SETTINGS);
      setHasChanges(false);
    } catch (error) {
      console.error('[BackgroundManager] Failed to reset settings:', error);
      setHasChanges(true);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 font-sans">
        <Loader2 className="h-7 w-7 animate-spin text-cyan-300/70" />
        <p className="text-xs text-white/35">Načítám nastavení vzhledu…</p>
      </div>
    );
  }

  const gradient = backgroundGradientCSS(settings);
  const animationLabel = ANIMATION_OPTIONS.find(option => option.value === (settings.animation || 'none'))?.label || 'Bez pohybu';
  const speedLabels = ['Velmi pomalu', 'Pomalu', 'Normální', 'Rychle', 'Velmi rychle'];

  return (
    <div className="mx-auto w-full max-w-[2400px] pb-8 font-sans">
      <header className="mb-7 space-y-3">
        <div className="flex items-center gap-3">
          <Palette className="h-4 w-4 text-[#FBBF24]" />
          <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-[#FBBF24]">APPEARANCE CONTROL</p>
        </div>
        <h1 className="text-[clamp(2.25rem,7vw,4.5rem)] font-bold uppercase leading-none tracking-tight">
          Nastavení <span className="text-white/20">POZADÍ</span>
        </h1>
        <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
          <p className="text-sm font-medium text-white/40">
            Vizuální vrstva aplikace, barevná atmosféra a intenzita efektů
          </p>
          <div
            className="inline-flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.16em]"
            style={{ color: hasChanges ? COLORS.amber : COLORS.green }}
          >
            <span className="h-2 w-2 rounded-full" style={{ background: hasChanges ? COLORS.amber : COLORS.green }} />
            {hasChanges ? 'NEULOŽENÉ ZMĚNY' : 'VZHLED JE AKTUÁLNÍ'}
          </div>
        </div>
      </header>

      <section
        className="relative mb-4 overflow-hidden rounded-[26px] p-2.5"
        style={{
          background: 'rgba(255,255,255,0.024)',
          border: '1px solid rgba(125,165,185,0.18)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.035)',
        }}
      >
        <div
          aria-hidden
          className="absolute inset-x-24 top-0 h-px"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(54,217,236,0.45), transparent)' }}
        />
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-3">
          {[
            {
              label: 'Barevná vrstva',
              value: settings.type === 'solid' ? 'Jednobarevná' : settings.type === 'radial' ? 'Radiální' : 'Lineární',
              detail: `${settings.colors.length} ${settings.colors.length === 1 ? 'barva' : settings.colors.length < 5 ? 'barvy' : 'barev'}`,
              color: COLORS.cyan,
              icon: Palette,
            },
            {
              label: 'Pohyb pozadí',
              value: animationLabel,
              detail: settings.animation === 'none' || !settings.animation ? 'Statický režim' : speedLabels[(settings.animationSpeed || 3) - 1],
              color: COLORS.violet,
              icon: Sparkles,
            },
            {
              label: 'Barevná intenzita',
              value: `${settings.opacity}%`,
              detail: 'Lehká CSS vrstva',
              color: COLORS.amber,
              icon: Layers3,
            },
          ].map(({ label, value, detail, color, icon: Icon }) => (
            <div
              key={label}
              className="flex min-h-[76px] items-center gap-3 rounded-2xl px-3.5 py-3"
              style={{ background: `${color}08`, border: `1px solid ${color}17` }}
            >
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                style={{ color, background: `${color}12`, border: `1px solid ${color}20` }}
              >
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-[8px] font-bold uppercase tracking-[0.14em] text-white/32">{label}</p>
                <p className="mt-1 truncate text-sm font-bold" style={{ color }}>{value}</p>
                <p className="mt-0.5 text-[9px] text-white/25">{detail}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section
        className="mb-5 flex flex-col gap-2 rounded-[22px] p-2 xl:flex-row xl:items-center"
        style={{ background: 'rgba(255,255,255,0.018)', border: '1px solid rgba(125,165,185,0.14)' }}
      >
        <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto hide-scrollbar">
          {([
            ['color', 'Barvy a gradient', Palette],
            ['animation', 'Pohyb a efekty', Sparkles],
          ] as const).map(([id, label, Icon]) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                disabled={saving}
                className="flex h-9 items-center gap-2 whitespace-nowrap rounded-xl px-3 text-xs font-semibold transition-colors disabled:opacity-40"
                style={active
                  ? { background: 'rgba(54,217,236,0.12)', color: COLORS.cyan, border: '1px solid rgba(54,217,236,0.22)' }
                  : { color: 'rgba(255,255,255,0.42)', border: '1px solid transparent' }}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            );
          })}
        </div>

        <div className="hidden h-7 w-px bg-white/[0.07] xl:block" />

        <div className="grid grid-cols-3 gap-1.5 sm:flex">
          <button
            type="button"
            onClick={() => setShowPreview(current => !current)}
            disabled={saving}
            className="flex h-9 items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.025] px-3 text-xs font-semibold text-white/48 transition-colors hover:text-white disabled:opacity-40"
          >
            {showPreview ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">{showPreview ? 'Skrýt náhled' : 'Zobrazit náhled'}</span>
            <span className="sm:hidden">Náhled</span>
          </button>
          <button
            type="button"
            onClick={() => void resetToDefaults()}
            disabled={saving}
            className="flex h-9 items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.025] px-3 text-xs font-semibold text-white/48 transition-colors hover:text-white disabled:opacity-40"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </button>
          <button
            type="button"
            onClick={() => void applyChanges()}
            disabled={saving || !hasChanges}
            className="flex h-9 items-center justify-center gap-2 rounded-xl bg-amber-300 px-4 text-xs font-bold text-[#071019] transition-colors hover:bg-amber-200 disabled:cursor-not-allowed disabled:bg-white/[0.05] disabled:text-white/25"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            {saving ? 'Ukládám' : 'Použít'}
          </button>
        </div>
      </section>

      <div className={`grid grid-cols-1 gap-4 ${showPreview ? 'xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.75fr)]' : ''}`}>
        <div className="min-w-0 space-y-4">
          {activeTab === 'color' && (
            <>
              <SectionPanel title="Typ barevné vrstvy" description="Zvolte základní způsob skládání barev pozadí.">
                <div className="grid grid-cols-3 gap-2">
                  {([
                    ['solid', 'Jedna barva', CircleDot],
                    ['linear', 'Lineární', ArrowDownRight],
                    ['radial', 'Radiální', Activity],
                  ] as const).map(([type, label, Icon]) => {
                    const active = settings.type === type;
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => updateSettings({ type })}
                        disabled={saving}
                        className="flex min-h-12 items-center justify-center gap-2 rounded-xl border px-2 text-xs font-semibold transition-colors disabled:opacity-40"
                        style={{
                          color: active ? COLORS.cyan : 'rgba(255,255,255,0.38)',
                          background: active ? `${COLORS.cyan}0E` : 'rgba(255,255,255,0.018)',
                          borderColor: active ? `${COLORS.cyan}30` : 'rgba(255,255,255,0.065)',
                        }}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {label}
                      </button>
                    );
                  })}
                </div>
              </SectionPanel>

              <SectionPanel
                title={settings.type === 'solid' ? 'Barva pozadí' : 'Barevná kompozice'}
                description={settings.type === 'solid' ? 'Vyberte hlavní tón celé aplikace.' : 'Upravte barevné body a jejich pozici v přechodu.'}
                action={settings.type !== 'solid' && settings.colors.length < 4 ? (
                  <button
                    type="button"
                    onClick={addColor}
                    disabled={saving}
                    className="flex h-8 items-center gap-1.5 rounded-lg border border-cyan-300/20 bg-cyan-300/[0.07] px-2.5 text-[10px] font-bold text-cyan-200 disabled:opacity-40"
                  >
                    <Plus className="h-3 w-3" />
                    Přidat barvu
                  </button>
                ) : undefined}
              >
                <div className="relative mb-4 h-20 overflow-visible rounded-2xl border border-white/[0.08]" style={{ background: gradient }}>
                  {settings.type !== 'solid' && settings.colors.map((color, index) => (
                    <button
                      key={`${color.color}-${index}`}
                      type="button"
                      aria-label={`Vybrat barvu ${index + 1}`}
                      onClick={() => setSelectedColorIndex(index)}
                      disabled={saving}
                      className="absolute bottom-2 h-5 w-5 -translate-x-1/2 rounded-full border-[3px] transition-[border-color]"
                      style={{
                        left: `${color.position}%`,
                        background: color.color,
                        borderColor: selectedColorIndex === index ? '#FFFFFF' : 'rgba(255,255,255,0.38)',
                        boxShadow: '0 5px 14px rgba(0,0,0,0.4)',
                      }}
                    />
                  ))}
                  <div className="absolute left-3 top-3 rounded-lg border border-white/10 bg-black/20 px-2 py-1 text-[8px] font-bold uppercase tracking-[0.16em] text-white/48">
                    Barevná mapa
                  </div>
                </div>

                <div className="grid grid-cols-8 gap-2 sm:grid-cols-16">
                  {PRESET_COLORS.map(color => {
                    const targetIndex = settings.type === 'solid' ? 0 : selectedColorIndex;
                    const selected = settings.colors[targetIndex]?.color.toLowerCase() === color.toLowerCase();
                    return (
                      <button
                        key={color}
                        type="button"
                        aria-label={`Nastavit barvu ${color}`}
                        onClick={() => updateColor(targetIndex, { color })}
                        disabled={saving}
                        className="aspect-square min-h-7 rounded-lg border transition-colors disabled:opacity-40"
                        style={{
                          background: color,
                          borderColor: selected ? '#FFFFFF' : 'rgba(255,255,255,0.1)',
                          boxShadow: selected ? `0 0 0 2px #071019, 0 0 0 3px ${COLORS.cyan}` : undefined,
                        }}
                      />
                    );
                  })}
                </div>

                <div className="mt-4 space-y-2">
                  {(settings.type === 'solid' ? settings.colors.slice(0, 1) : settings.colors).map((color, index) => (
                    <div
                      key={`${index}-${color.color}`}
                      className="grid grid-cols-[42px_minmax(0,1fr)_36px] items-center gap-3 rounded-xl border px-3 py-2.5"
                      style={{
                        background: selectedColorIndex === index || settings.type === 'solid' ? `${COLORS.cyan}07` : 'rgba(255,255,255,0.012)',
                        borderColor: selectedColorIndex === index || settings.type === 'solid' ? `${COLORS.cyan}1D` : 'rgba(255,255,255,0.05)',
                      }}
                      onClick={() => setSelectedColorIndex(index)}
                    >
                      <label className="relative h-9 w-9 cursor-pointer overflow-hidden rounded-lg border border-white/10" style={{ background: color.color }}>
                        <input
                          type="color"
                          value={color.color}
                          onChange={event => updateColor(index, { color: event.target.value })}
                          disabled={saving}
                          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                        />
                      </label>
                      <div className="min-w-0">
                        <div className="mb-1.5 flex items-center justify-between text-[9px]">
                          <span className="font-semibold text-white/42">Barva {index + 1}</span>
                          <span className="font-mono text-white/30">{color.color.toUpperCase()}</span>
                        </div>
                        {settings.type !== 'solid' && (
                          <input
                            type="range"
                            min={0}
                            max={100}
                            value={color.position}
                            onChange={event => updateColor(index, { position: Number(event.target.value) })}
                            disabled={saving}
                            className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/[0.08] accent-cyan-400"
                          />
                        )}
                      </div>
                      {settings.type !== 'solid' && settings.colors.length > 1 ? (
                        <button
                          type="button"
                          aria-label={`Odstranit barvu ${index + 1}`}
                          onClick={event => {
                            event.stopPropagation();
                            removeColor(index);
                          }}
                          disabled={saving}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-rose-300/15 bg-rose-300/[0.05] text-rose-300/65 transition-colors hover:text-rose-200 disabled:opacity-40"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      ) : (
                        <span className="text-right text-[9px] tabular-nums text-white/28">
                          {settings.type === 'solid' ? '100%' : `${color.position}%`}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </SectionPanel>

              {settings.type === 'linear' && (
                <SectionPanel title="Směr přechodu" description="Natočení gradientu mění vedení světla napříč aplikací.">
                  <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
                    {GRADIENT_DIRECTIONS.map(direction => {
                      const DirectionIcon = direction.icon;
                      const active = settings.direction === direction.value;
                      return (
                        <button
                          key={direction.value}
                          type="button"
                          title={direction.label}
                          aria-label={direction.label}
                          onClick={() => updateSettings({ direction: direction.value })}
                          disabled={saving}
                          className="flex aspect-square items-center justify-center rounded-xl border transition-colors disabled:opacity-40"
                          style={{
                            color: active ? COLORS.cyan : 'rgba(255,255,255,0.34)',
                            background: active ? `${COLORS.cyan}0E` : 'rgba(255,255,255,0.018)',
                            borderColor: active ? `${COLORS.cyan}30` : 'rgba(255,255,255,0.06)',
                          }}
                        >
                          <DirectionIcon className="h-4 w-4" />
                        </button>
                      );
                    })}
                  </div>
                </SectionPanel>
              )}

              <SectionPanel title="Intenzita barev" description="Řídí sílu barevné vrstvy nad základním pozadím.">
                <RangeControl
                  label="Krytí gradientu"
                  valueLabel={`${settings.opacity}%`}
                  min={0}
                  max={100}
                  value={settings.opacity}
                  onChange={opacity => updateSettings({ opacity })}
                  disabled={saving}
                />
              </SectionPanel>
            </>
          )}

          {activeTab === 'animation' && (
            <>
              <SectionPanel title="Aurora předvolby" description="Lehké barevné kompozice bez obrázků a náročného rozostření.">
                <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                  {AURORA_PRESETS.map(preset => {
                    const active = settings.animation === 'aurora'
                      && settings.colors.map(color => color.color).join('|') === preset.colors.map(color => color.color).join('|');

                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => applyAuroraPreset(preset)}
                        disabled={saving}
                        className="group overflow-hidden rounded-2xl border text-left transition-colors disabled:opacity-40"
                        style={{ borderColor: active ? `${COLORS.cyan}70` : 'rgba(255,255,255,0.07)', background: active ? `${COLORS.cyan}0A` : 'rgba(255,255,255,0.015)' }}
                      >
                        <span className="relative block h-20" style={{ background: auroraPreviewBackground(preset.colors) }}>
                          {active && (
                            <span className="absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-cyan-200 text-[#061425]">
                              <Check className="h-3 w-3" strokeWidth={3} />
                            </span>
                          )}
                        </span>
                        <span className="block px-3 py-2.5">
                          <span className="block text-[11px] font-bold text-white/75 group-hover:text-white">{preset.name}</span>
                          <span className="mt-0.5 block text-[8px] text-white/28">{preset.description}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </SectionPanel>

              <SectionPanel title="Pohyb pozadí" description="Efekt se aplikuje pouze na atmosférickou vrstvu, obsah zůstává stabilní.">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {ANIMATION_OPTIONS.map(option => {
                    const OptionIcon = option.icon;
                    const active = (settings.animation || 'none') === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => updateSettings({ animation: option.value })}
                        disabled={saving}
                        className="relative flex min-h-[92px] flex-col items-start rounded-2xl border p-3 text-left transition-colors disabled:opacity-40"
                        style={{
                          background: active ? `${COLORS.violet}0D` : 'rgba(255,255,255,0.018)',
                          borderColor: active ? `${COLORS.violet}35` : 'rgba(255,255,255,0.065)',
                        }}
                      >
                        <span
                          className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg"
                          style={{ color: active ? COLORS.violet : 'rgba(255,255,255,0.38)', background: active ? `${COLORS.violet}16` : 'rgba(255,255,255,0.035)' }}
                        >
                          <OptionIcon className="h-3.5 w-3.5" />
                        </span>
                        <p className={`text-xs font-bold ${active ? 'text-white' : 'text-white/55'}`}>{option.label}</p>
                        <p className="mt-0.5 text-[9px] leading-tight text-white/27">{option.description}</p>
                        {active && <span className="absolute right-3 top-3 h-1.5 w-1.5 rounded-full bg-violet-300" />}
                      </button>
                    );
                  })}
                </div>
              </SectionPanel>

              <SectionPanel title="Tempo efektu" description="Nižší rychlost je vhodnější pro dlouhodobý klinický provoz.">
                <div className={(settings.animation || 'none') === 'none' ? 'pointer-events-none opacity-35' : ''}>
                  <RangeControl
                    label="Rychlost animace"
                    valueLabel={speedLabels[(settings.animationSpeed || 3) - 1]}
                    min={1}
                    max={5}
                    value={settings.animationSpeed || 3}
                    onChange={animationSpeed => updateSettings({ animationSpeed })}
                    disabled={saving || (settings.animation || 'none') === 'none'}
                    color={COLORS.violet}
                  />
                </div>
              </SectionPanel>

              <div className="flex items-start gap-3 rounded-[18px] border border-cyan-300/15 bg-cyan-300/[0.04] p-4">
                <Wind className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300/75" />
                <p className="text-[11px] leading-relaxed text-white/42">
                  Efekty používají pouze lehké CSS animace a respektují systémovou volbu omezení pohybu.
                  Pro nepřetržitý provoz doporučujeme pomalé tempo nebo statický režim.
                </p>
              </div>
            </>
          )}
        </div>

        {showPreview && (
          <aside className="min-w-0 xl:sticky xl:top-6 xl:self-start">
            <div className="overflow-hidden rounded-[26px] p-2.5" style={panelStyle}>
              <div className="mb-2 flex items-center justify-between px-1.5 py-1">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/48">Živý náhled aplikace</p>
                  <p className="mt-0.5 text-[9px] text-white/25">Kompozice pozadí pod skutečným UI</p>
                </div>
                <div className="flex items-center gap-1.5 text-[8px] font-bold uppercase tracking-[0.12em] text-emerald-300/70">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                  Live
                </div>
              </div>

              <div className="relative h-[440px] overflow-hidden rounded-[20px] border border-white/[0.08] sm:h-[520px]">
                <AnimatedBackground settings={settings} />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_55%_20%,transparent_0%,rgba(0,0,0,0.52)_100%)]" />

                <div className="absolute inset-0 flex">
                  <div className="flex w-12 flex-col items-center border-r border-white/[0.07] bg-black/15 py-4 backdrop-blur-md">
                    <span className="mb-7 flex h-6 w-6 items-center justify-center rounded-lg border border-amber-300/20 bg-amber-300/[0.08]">
                      <Activity className="h-3 w-3 text-amber-300" />
                    </span>
                    <div className="space-y-3">
                      {[COLORS.cyan, '#64748B', '#475569', '#334155'].map((color, index) => (
                        <span
                          key={`${color}-${index}`}
                          className="block h-5 w-5 rounded-md border"
                          style={{ borderColor: `${color}35`, background: `${color}14` }}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="flex-1 p-4">
                    <div className="mb-5">
                      <p className="text-[6px] font-bold uppercase tracking-[0.24em] text-amber-300/70">Operační velín</p>
                      <h3 className="mt-1 text-xl font-bold uppercase leading-none tracking-tight text-white">
                        Operační <span className="text-white/20">sály</span>
                      </h3>
                    </div>

                    <div className="mb-3 grid grid-cols-3 gap-1.5">
                      {[
                        ['Aktivní', '7', COLORS.cyan],
                        ['Připraveno', '4', COLORS.green],
                        ['Pokrytí', '96%', COLORS.amber],
                      ].map(([label, value, color]) => (
                        <div key={label} className="rounded-xl border border-white/[0.08] bg-white/[0.035] p-2 backdrop-blur-xl">
                          <p className="text-[5px] font-bold uppercase tracking-[0.12em] text-white/32">{label}</p>
                          <p className="mt-1 text-sm font-bold" style={{ color }}>{value}</p>
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {[1, 2, 3, 4, 5, 6].map((room, index) => (
                        <div
                          key={room}
                          className="relative h-[91px] overflow-hidden rounded-xl border border-white/[0.09] bg-black/15 p-2.5 backdrop-blur-xl"
                        >
                          <div
                            className="absolute inset-x-3 top-0 h-px"
                            style={{ background: `linear-gradient(90deg, transparent, ${index % 3 === 0 ? COLORS.green : COLORS.cyan}, transparent)` }}
                          />
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="text-[5px] font-bold uppercase tracking-[0.18em] text-white/28">Chirurgie</p>
                              <p className="mt-1 text-[9px] font-bold text-white">Sál č. {room}</p>
                            </div>
                            <span className="h-1.5 w-1.5 rounded-full" style={{ background: index % 3 === 0 ? COLORS.green : COLORS.cyan }} />
                          </div>
                          <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/[0.06]">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${35 + index * 9}%`, background: index % 3 === 0 ? COLORS.green : COLORS.cyan }}
                            />
                          </div>
                          <div className="mt-2 flex items-center justify-between text-[5px] uppercase tracking-[0.1em] text-white/28">
                            <span>{index % 3 === 0 ? 'Připraveno' : 'Výkon probíhá'}</span>
                            <span>{index + 1}/8</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-2 flex items-center justify-between px-1.5 py-1 text-[9px] text-white/28">
                <span>{settings.type === 'solid' ? 'Jedna barva' : settings.type === 'radial' ? 'Radiální gradient' : 'Lineární gradient'}</span>
                <span className="font-mono uppercase">{animationLabel}</span>
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
};

export default BackgroundManager;
