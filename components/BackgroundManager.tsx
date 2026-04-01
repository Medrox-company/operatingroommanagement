'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Palette, Image as ImageIcon, RotateCcw, Plus, Trash2, 
  ArrowUp, ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight, ArrowDownRight, 
  ArrowUpLeft, ArrowDownLeft, Eye, EyeOff, Loader
} from 'lucide-react';
import { saveBackgroundSettings, fetchBackgroundSettings, BackgroundSettings } from '../lib/db';

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
  '#0A0A12', '#1a1a2e', '#16213e', '#0f3460',
  '#8B5CF6', '#A855F7', '#7C3AED', '#6366F1',
  '#0EA5E9', '#06B6D4', '#14B8A6', '#10B981',
  '#F97316', '#EAB308', '#EC4899', '#EF4444',
];

// Preset gallery images (medical/hospital themed)
const GALLERY_IMAGES = [
  {
    url: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&q=80&w=2000',
    name: 'Operační sál',
  },
  {
    url: 'https://images.unsplash.com/photo-1551190822-a9333d879b1f?auto=format&fit=crop&q=80&w=2000',
    name: 'Moderní nemocnice',
  },
  {
    url: 'https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&q=80&w=2000',
    name: 'Chirurgický tým',
  },
  {
    url: 'https://images.unsplash.com/photo-1530026405186-ed1f139313f8?auto=format&fit=crop&q=80&w=2000',
    name: 'Nemocniční chodba',
  },
  {
    url: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&q=80&w=2000',
    name: 'Zdravotní péče',
  },
  {
    url: 'https://images.unsplash.com/photo-1538108149393-fbbd81895907?auto=format&fit=crop&q=80&w=2000',
    name: 'Nemocniční pokoj',
  },
  {
    url: 'https://images.unsplash.com/photo-1504439468489-c8920d796a29?auto=format&fit=crop&q=80&w=2000',
    name: 'Lékařské vybavení',
  },
  {
    url: 'https://images.unsplash.com/photo-1631815588090-d4bfec5b1ccb?auto=format&fit=crop&q=80&w=2000',
    name: 'Abstraktní medicína',
  },
];

const DEFAULT_SETTINGS: BackgroundSettings = {
  type: 'linear',
  colors: [
    { color: '#0a0a12', position: 0 },
    { color: '#1a1a2e', position: 100 },
  ],
  direction: 'to bottom',
  opacity: 100,
  imageUrl: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&q=80&w=2000',
  imageOpacity: 15,
  imageBlur: 0,
};

const BackgroundManager: React.FC = () => {
  const [settings, setSettings] = useState<BackgroundSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'color' | 'image'>('color');
  const [showPreview, setShowPreview] = useState(true);
  const [selectedColorIndex, setSelectedColorIndex] = useState(0);
  const [hasChanges, setHasChanges] = useState(false);

  // Load settings from database
  useEffect(() => {
    let mounted = true;
    const loadSettings = async () => {
      try {
        const dbSettings = await fetchBackgroundSettings();
        if (mounted && dbSettings) {
          setSettings(dbSettings);
        }
      } catch (error) {
        console.error('Failed to load background settings:', error);
      }
      if (mounted) {
        setLoading(false);
      }
    };
    loadSettings();
    return () => { mounted = false; };
  }, []);

  const markChanged = () => setHasChanges(true);

  const applyChanges = useCallback(async () => {
    setSaving(true);
    await saveBackgroundSettings(settings);
    window.dispatchEvent(new CustomEvent('backgroundSettingsChanged', { detail: settings }));
    setHasChanges(false);
    setSaving(false);
  }, [settings]);

  const addColor = () => {
    if (settings.colors.length >= 4) return;
    const newColors = [...settings.colors];
    newColors.push({ color: '#8B5CF6', position: 50 });
    newColors.sort((a, b) => a.position - b.position);
    setSettings({ ...settings, colors: newColors });
    markChanged();
  };

  const removeColor = (index: number) => {
    if (settings.colors.length <= 1) return;
    const newColors = settings.colors.filter((_, i) => i !== index);
    setSettings({ ...settings, colors: newColors });
    markChanged();
    if (selectedColorIndex >= newColors.length) {
      setSelectedColorIndex(newColors.length - 1);
    }
  };

  const updateColor = (index: number, updates: Partial<{ color: string; position: number }>) => {
    const newColors = settings.colors.map((c, i) => 
      i === index ? { ...c, ...updates } : c
    );
    setSettings({ ...settings, colors: newColors });
    markChanged();
  };

  const updateSettings = (updates: Partial<BackgroundSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
    markChanged();
  };

  const resetToDefaults = async () => {
    setSettings(DEFAULT_SETTINGS);
    setSaving(true);
    await saveBackgroundSettings(DEFAULT_SETTINGS);
    window.dispatchEvent(new CustomEvent('backgroundSettingsChanged', { detail: DEFAULT_SETTINGS }));
    setHasChanges(false);
    setSaving(false);
    setSelectedColorIndex(0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 rounded-full border-2 border-white/10 border-t-violet-400 animate-spin" />
      </div>
    );
  }

  const getGradientCSS = () => {
    const colors = settings.colors || [];
    if (settings.type === 'solid' || colors.length <= 1) {
      return colors[0]?.color || '#0a0a12';
    }
    const sortedColors = [...colors].sort((a, b) => a.position - b.position);
    const colorStops = sortedColors.map(c => `${c.color} ${c.position}%`).join(', ');
    
    if (settings.type === 'radial') {
      return `radial-gradient(circle at center, ${colorStops})`;
    }
    return `linear-gradient(${settings.direction || 'to bottom'}, ${colorStops})`;
  };

  return (
    <div className="w-full max-w-6xl mx-auto">
      {/* Header */}
      <header className="mb-8">
        <div className="flex items-center justify-between">
          <div className="mb-4">
            <h1 className="text-7xl font-black tracking-tighter uppercase leading-none">
              NASTAVENÍ <span className="text-white/20">POZADÍ</span>
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-all text-sm"
              disabled={saving}
            >
              {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              Náhled
            </button>
            <button
              onClick={resetToDefaults}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-all text-sm"
              disabled={saving}
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </button>
            <button
              onClick={applyChanges}
              disabled={saving || !hasChanges}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                hasChanges
                  ? 'bg-violet-500 text-white hover:bg-violet-400 shadow-lg shadow-violet-500/25'
                  : 'bg-white/5 text-white/30 border border-white/10 cursor-not-allowed'
              }`}
            >
              {saving ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Ukládám...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Aplikovat změny
                </>
              )}
            </button>
          </div>
        </div>
        <p className="text-white/40 text-sm max-w-xl">
          Nastavte barevné pozadí, přechody a obrázky. Změny se uloží pro všechny uživatele.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tab Switcher */}
          <div className="flex p-1.5 rounded-2xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <button
              onClick={() => setActiveTab('color')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'color' 
                  ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30' 
                  : 'text-white/40 hover:text-white/60'
              }`}
              disabled={saving}
            >
              <Palette className="w-4 h-4" />
              Barvy
            </button>
            <button
              onClick={() => setActiveTab('image')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'image' 
                  ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30' 
                  : 'text-white/40 hover:text-white/60'
              }`}
              disabled={saving}
            >
              <ImageIcon className="w-4 h-4" />
              Obrázek
            </button>
          </div>

          <AnimatePresence mode="wait">
            {activeTab === 'color' ? (
              <motion.div
                key="color"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {/* Type Selector */}
                <div className="p-5 rounded-2xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <p className="text-xs font-bold text-white/40 uppercase tracking-wider mb-4">Typ pozadí</p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => updateSettings({ type: 'solid' })}
                      className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold transition-all ${
                        settings.type === 'solid'
                          ? 'bg-white/10 text-white border border-white/20'
                          : 'bg-white/5 text-white/40 border border-white/5 hover:border-white/10'
                      }`}
                      disabled={saving}
                    >
                      Jednobarevné
                    </button>
                    <button
                      onClick={() => updateSettings({ type: 'linear' })}
                      className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold transition-all ${
                        settings.type === 'linear'
                          ? 'bg-white/10 text-white border border-white/20'
                          : 'bg-white/5 text-white/40 border border-white/5 hover:border-white/10'
                      }`}
                      disabled={saving}
                    >
                      Lineární
                    </button>
                    <button
                      onClick={() => updateSettings({ type: 'radial' })}
                      className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold transition-all ${
                        settings.type === 'radial'
                          ? 'bg-white/10 text-white border border-white/20'
                          : 'bg-white/5 text-white/40 border border-white/5 hover:border-white/10'
                      }`}
                      disabled={saving}
                    >
                      Radiální
                    </button>
                  </div>
                </div>

                {settings.type === 'solid' ? (
                  <div className="p-5 rounded-2xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <p className="text-xs font-bold text-white/40 uppercase tracking-wider mb-4">Barva pozadí</p>
                    <div className="flex items-center gap-4">
                      <input
                        type="color"
                        value={settings.colors[0]?.color || '#0A0A12'}
                        onChange={(e) => {
                          const newColors = [...settings.colors];
                          newColors[0] = { ...newColors[0], color: e.target.value };
                          setSettings({ ...settings, colors: newColors });
                          markChanged();
                        }}
                        className="w-16 h-16 rounded-xl cursor-pointer border-2 border-white/10"
                        disabled={saving}
                      />
                      <div className="grid grid-cols-8 gap-2 flex-1">
                        {PRESET_COLORS.map((color) => (
                          <button
                            key={color}
                            onClick={() => {
                              const newColors = [...settings.colors];
                              newColors[0] = { ...newColors[0], color };
                              setSettings({ ...settings, colors: newColors });
                              markChanged();
                            }}
                            className={`w-8 h-8 rounded-lg transition-all hover:scale-110 ${
                              settings.colors[0]?.color === color ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0A0A12]' : ''
                            }`}
                            style={{ backgroundColor: color }}
                            disabled={saving}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Gradient Colors */}
                    <div className="p-5 rounded-2xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div className="flex items-center justify-between mb-4">
                        <p className="text-xs font-bold text-white/40 uppercase tracking-wider">
                          Barvy přechodu ({settings.colors.length}/4)
                        </p>
                        {settings.colors.length < 4 && (
                          <button
                            onClick={addColor}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-violet-500/20 text-violet-300 text-xs font-semibold hover:bg-violet-500/30 transition-all"
                            disabled={saving}
                          >
                            <Plus className="w-3 h-3" />
                            Přidat
                          </button>
                        )}
                      </div>

                      {/* Gradient Preview */}
                      <div 
                        className="h-8 rounded-xl mb-4 relative"
                        style={{ background: getGradientCSS() }}
                      >
                        {settings.colors.map((c, i) => (
                          <button
                            key={i}
                            onClick={() => setSelectedColorIndex(i)}
                            className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 transition-all ${
                              selectedColorIndex === i ? 'border-white scale-125 z-10' : 'border-white/50 hover:border-white'
                            }`}
                            style={{ left: `calc(${c.position}% - 8px)`, backgroundColor: c.color }}
                            disabled={saving}
                          />
                        ))}
                      </div>

                      {/* Color Controls */}
                      <div className="space-y-3">
                        {settings.colors.map((c, i) => (
                          <div 
                            key={i}
                            className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                              selectedColorIndex === i ? 'bg-white/5 border border-white/10' : 'bg-transparent border border-transparent'
                            }`}
                            onClick={() => setSelectedColorIndex(i)}
                          >
                            <input
                              type="color"
                              value={c.color}
                              onChange={(e) => updateColor(i, { color: e.target.value })}
                              className="w-10 h-10 rounded-lg cursor-pointer border border-white/10"
                              disabled={saving}
                            />
                            <div className="flex-1">
                              <p className="text-xs text-white/40 mb-1">Pozice: {c.position}%</p>
                              <input
                                type="range"
                                min="0"
                                max="100"
                                value={c.position}
                                onChange={(e) => updateColor(i, { position: parseInt(e.target.value) })}
                                className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-violet-500"
                                disabled={saving}
                              />
                            </div>
                            {settings.colors.length > 1 && (
                              <button
                                onClick={() => removeColor(i)}
                                className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all"
                                disabled={saving}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Direction - only for linear gradient */}
                    {settings.type === 'linear' && (
                      <div className="p-5 rounded-2xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <p className="text-xs font-bold text-white/40 uppercase tracking-wider mb-4">Směr přechodu</p>
                        <div className="grid grid-cols-4 gap-2">
                          {GRADIENT_DIRECTIONS.map((dir) => {
                            const DirIcon = dir.icon;
                            return (
                              <button
                                key={dir.value}
                                onClick={() => updateSettings({ direction: dir.value })}
                                className={`flex flex-col items-center gap-2 py-3 px-2 rounded-xl transition-all ${
                                  settings.direction === dir.value
                                    ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                                    : 'bg-white/5 text-white/40 border border-white/5 hover:border-white/10 hover:text-white/60'
                                }`}
                                disabled={saving}
                              >
                                <DirIcon className="w-5 h-5" />
                                <span className="text-[10px] font-medium">{dir.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Opacity */}
                    <div className="p-5 rounded-2xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div className="flex items-center justify-between mb-4">
                        <p className="text-xs font-bold text-white/40 uppercase tracking-wider">Průhlednost</p>
                        <span className="text-sm font-bold text-white/60">{settings.opacity}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={settings.opacity}
                        onChange={(e) => updateSettings({ opacity: parseInt(e.target.value) })}
                        className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer accent-violet-500"
                        disabled={saving}
                      />
                    </div>
                  </>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="image"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {/* Image Gallery */}
                <div className="p-5 rounded-2xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <p className="text-xs font-bold text-white/40 uppercase tracking-wider mb-4">Galerie obrázků</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {GALLERY_IMAGES.map((image, index) => (
                      <button
                        key={index}
                        onClick={() => updateSettings({ imageUrl: image.url })}
                        disabled={saving}
                        className={`relative aspect-video rounded-xl overflow-hidden border-2 transition-all hover:scale-105 ${
                          settings.imageUrl === image.url 
                            ? 'border-violet-500 ring-2 ring-violet-500/30' 
                            : 'border-white/10 hover:border-white/30'
                        }`}
                      >
                        <img 
                          src={image.url} 
                          alt={image.name}
                          className="w-full h-full object-cover grayscale opacity-70 hover:opacity-100 transition-opacity"
                        />
                        {settings.imageUrl === image.url && (
                          <div className="absolute inset-0 bg-violet-500/20 flex items-center justify-center">
                            <div className="w-6 h-6 rounded-full bg-violet-500 flex items-center justify-center">
                              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          </div>
                        )}
                        <div className="absolute bottom-0 left-0 right-0 p-1.5 bg-gradient-to-t from-black/80 to-transparent">
                          <p className="text-[9px] text-white/80 truncate font-medium">{image.name}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Image URL */}
                <div className="p-5 rounded-2xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <p className="text-xs font-bold text-white/40 uppercase tracking-wider mb-4">Vlastní URL obrázku</p>
                  <input
                    type="url"
                    value={settings.imageUrl}
                    onChange={(e) => updateSettings({ imageUrl: e.target.value })}
                    placeholder="https://..."
                    className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/20 focus:outline-none focus:border-violet-500/50"
                    disabled={saving}
                  />
                  <p className="text-[10px] text-white/30 mt-2">Zadejte vlastní URL nebo vyberte z galerie výše</p>
                </div>

                {/* Image Opacity */}
                <div className="p-5 rounded-2xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-xs font-bold text-white/40 uppercase tracking-wider">Průhlednost obrázku</p>
                    <span className="text-sm font-bold text-white/60">{settings.imageOpacity}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={settings.imageOpacity}
                    onChange={(e) => updateSettings({ imageOpacity: parseInt(e.target.value) })}
                    className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer accent-violet-500"
                    disabled={saving}
                  />
                </div>

                {/* Image Blur */}
                <div className="p-5 rounded-2xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-xs font-bold text-white/40 uppercase tracking-wider">Rozmazání obrázku</p>
                    <span className="text-sm font-bold text-white/60">{settings.imageBlur}px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="20"
                    value={settings.imageBlur}
                    onChange={(e) => updateSettings({ imageBlur: parseInt(e.target.value) })}
                    className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer accent-violet-500"
                    disabled={saving}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Preview */}
        {showPreview && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="hidden lg:flex flex-col sticky top-20 h-fit"
          >
            <div className="relative rounded-2xl overflow-hidden border border-white/10" style={{ aspectRatio: '9/12' }}>
              {/* Background Image */}
              {settings.imageUrl && (
                <img
                  src={settings.imageUrl}
                  alt="Preview"
                  className="absolute inset-0 w-full h-full object-cover grayscale"
                  style={{
                    opacity: settings.imageOpacity / 100,
                    filter: settings.imageBlur > 0 ? `blur(${settings.imageBlur}px)` : undefined,
                  }}
                />
              )}

              {/* Color/Gradient Overlay */}
              <div
                className="absolute inset-0"
                style={{
                  background: getGradientCSS(),
                  opacity: settings.opacity / 100,
                }}
              />

              {/* Vignette */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_transparent_20%,_rgba(0,0,0,0.6)_100%)]" />

              {/* Card Preview */}
              <div className="absolute inset-0 flex items-end p-6">
                <motion.div
                  className="w-full p-4 rounded-xl"
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    backdropFilter: 'blur(40px)',
                  }}
                >
                  <p className="text-xs text-white/40 uppercase tracking-widest mb-1">Náhled</p>
                  <p className="text-sm font-bold text-white">Barva a obrázek</p>
                </motion.div>
              </div>
            </div>
            <p className="text-xs text-white/30 mt-3 text-center">Živý náhled změn</p>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default BackgroundManager;
