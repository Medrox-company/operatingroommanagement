'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Palette, Image as ImageIcon, Layers, RotateCcw, Check, Plus, Trash2, 
  ArrowUp, ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight, ArrowDownRight, 
  ArrowUpLeft, ArrowDownLeft, Upload, X, Eye, EyeOff, Sliders
} from 'lucide-react';

// Types
interface GradientStop {
  color: string;
  position: number;
}

interface BackgroundSettings {
  type: 'solid' | 'gradient';
  solidColor: string;
  gradientStops: GradientStop[];
  gradientDirection: string;
  transparency: number;
  backgroundImage: string | null;
  imageOpacity: number;
  imageBlur: number;
}

// Direction options with icons
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

// Preset colors
const PRESET_COLORS = [
  '#0A0A12', '#1a1a2e', '#16213e', '#0f3460',
  '#8B5CF6', '#A855F7', '#7C3AED', '#6366F1',
  '#0EA5E9', '#06B6D4', '#14B8A6', '#10B981',
  '#F97316', '#EAB308', '#EC4899', '#EF4444',
];

const DEFAULT_SETTINGS: BackgroundSettings = {
  type: 'gradient',
  solidColor: '#0A0A12',
  gradientStops: [
    { color: '#0A0A12', position: 0 },
    { color: '#1a1a2e', position: 50 },
    { color: '#16213e', position: 100 },
  ],
  gradientDirection: 'to bottom right',
  transparency: 100,
  backgroundImage: null,
  imageOpacity: 30,
  imageBlur: 0,
};

const BackgroundManager: React.FC = () => {
  const [settings, setSettings] = useState<BackgroundSettings>(DEFAULT_SETTINGS);
  const [activeTab, setActiveTab] = useState<'color' | 'image'>('color');
  const [showPreview, setShowPreview] = useState(true);
  const [selectedStopIndex, setSelectedStopIndex] = useState(0);

  // Load settings from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('backgroundSettings');
    if (saved) {
      try {
        setSettings(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse background settings');
      }
    }
  }, []);

  // Save settings to localStorage
  const saveSettings = useCallback((newSettings: BackgroundSettings) => {
    setSettings(newSettings);
    localStorage.setItem('backgroundSettings', JSON.stringify(newSettings));
    // Dispatch custom event for app to listen
    window.dispatchEvent(new CustomEvent('backgroundSettingsChanged', { detail: newSettings }));
  }, []);

  // Generate CSS gradient
  const generateGradient = () => {
    if (settings.type === 'solid') {
      return settings.solidColor;
    }
    const stops = settings.gradientStops
      .sort((a, b) => a.position - b.position)
      .map(s => `${s.color} ${s.position}%`)
      .join(', ');
    return `linear-gradient(${settings.gradientDirection}, ${stops})`;
  };

  // Add gradient stop
  const addGradientStop = () => {
    if (settings.gradientStops.length >= 4) return;
    const newStops = [...settings.gradientStops];
    const newPosition = 50;
    newStops.push({ color: '#8B5CF6', position: newPosition });
    newStops.sort((a, b) => a.position - b.position);
    saveSettings({ ...settings, gradientStops: newStops });
  };

  // Remove gradient stop
  const removeGradientStop = (index: number) => {
    if (settings.gradientStops.length <= 1) return;
    const newStops = settings.gradientStops.filter((_, i) => i !== index);
    saveSettings({ ...settings, gradientStops: newStops });
    if (selectedStopIndex >= newStops.length) {
      setSelectedStopIndex(newStops.length - 1);
    }
  };

  // Update gradient stop
  const updateGradientStop = (index: number, updates: Partial<GradientStop>) => {
    const newStops = settings.gradientStops.map((stop, i) => 
      i === index ? { ...stop, ...updates } : stop
    );
    saveSettings({ ...settings, gradientStops: newStops });
  };

  // Handle image upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        saveSettings({ ...settings, backgroundImage: event.target?.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  // Reset to defaults
  const resetToDefaults = () => {
    saveSettings(DEFAULT_SETTINGS);
    setSelectedStopIndex(0);
  };

  return (
    <div className="w-full max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2 opacity-60">
            <Palette className="w-4 h-4 text-[#8B5CF6]" />
            <p className="text-[10px] font-black text-[#8B5CF6] tracking-[0.4em] uppercase">VISUAL SETTINGS</p>
          </div>
          <h1 className="text-4xl font-black tracking-tight uppercase">
            POZADÍ <span className="text-white/20">APLIKACE</span>
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-all text-sm"
          >
            {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            Náhled
          </button>
          <button
            onClick={resetToDefaults}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-all text-sm"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel - Controls */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tab Switcher */}
          <div 
            className="flex p-1.5 rounded-2xl"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <button
              onClick={() => setActiveTab('color')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'color' 
                  ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30' 
                  : 'text-white/40 hover:text-white/60'
              }`}
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
                <div 
                  className="p-5 rounded-2xl"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <p className="text-xs font-bold text-white/40 uppercase tracking-wider mb-4">Typ pozadí</p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => saveSettings({ ...settings, type: 'solid' })}
                      className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold transition-all ${
                        settings.type === 'solid'
                          ? 'bg-white/10 text-white border border-white/20'
                          : 'bg-white/5 text-white/40 border border-white/5 hover:border-white/10'
                      }`}
                    >
                      Jednobarevné
                    </button>
                    <button
                      onClick={() => saveSettings({ ...settings, type: 'gradient' })}
                      className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold transition-all ${
                        settings.type === 'gradient'
                          ? 'bg-white/10 text-white border border-white/20'
                          : 'bg-white/5 text-white/40 border border-white/5 hover:border-white/10'
                      }`}
                    >
                      Přechodové
                    </button>
                  </div>
                </div>

                {settings.type === 'solid' ? (
                  /* Solid Color */
                  <div 
                    className="p-5 rounded-2xl"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                  >
                    <p className="text-xs font-bold text-white/40 uppercase tracking-wider mb-4">Barva pozadí</p>
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <input
                          type="color"
                          value={settings.solidColor}
                          onChange={(e) => saveSettings({ ...settings, solidColor: e.target.value })}
                          className="w-16 h-16 rounded-xl cursor-pointer border-2 border-white/10"
                        />
                      </div>
                      <div className="grid grid-cols-8 gap-2 flex-1">
                        {PRESET_COLORS.map((color) => (
                          <button
                            key={color}
                            onClick={() => saveSettings({ ...settings, solidColor: color })}
                            className={`w-8 h-8 rounded-lg transition-all hover:scale-110 ${
                              settings.solidColor === color ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0A0A12]' : ''
                            }`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Gradient Controls */
                  <>
                    {/* Gradient Stops */}
                    <div 
                      className="p-5 rounded-2xl"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <p className="text-xs font-bold text-white/40 uppercase tracking-wider">
                          Barvy přechodu ({settings.gradientStops.length}/4)
                        </p>
                        {settings.gradientStops.length < 4 && (
                          <button
                            onClick={addGradientStop}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-violet-500/20 text-violet-300 text-xs font-semibold hover:bg-violet-500/30 transition-all"
                          >
                            <Plus className="w-3 h-3" />
                            Přidat
                          </button>
                        )}
                      </div>

                      {/* Gradient Bar Preview */}
                      <div 
                        className="h-8 rounded-xl mb-4 relative"
                        style={{ background: generateGradient() }}
                      >
                        {settings.gradientStops.map((stop, index) => (
                          <button
                            key={index}
                            onClick={() => setSelectedStopIndex(index)}
                            className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 transition-all ${
                              selectedStopIndex === index 
                                ? 'border-white scale-125 z-10' 
                                : 'border-white/50 hover:border-white'
                            }`}
                            style={{ 
                              left: `calc(${stop.position}% - 8px)`,
                              backgroundColor: stop.color,
                            }}
                          />
                        ))}
                      </div>

                      {/* Stop Controls */}
                      <div className="space-y-3">
                        {settings.gradientStops.map((stop, index) => (
                          <div 
                            key={index}
                            className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                              selectedStopIndex === index 
                                ? 'bg-white/5 border border-white/10' 
                                : 'bg-transparent border border-transparent'
                            }`}
                            onClick={() => setSelectedStopIndex(index)}
                          >
                            <input
                              type="color"
                              value={stop.color}
                              onChange={(e) => updateGradientStop(index, { color: e.target.value })}
                              className="w-10 h-10 rounded-lg cursor-pointer border border-white/10"
                            />
                            <div className="flex-1">
                              <p className="text-xs text-white/40 mb-1">Pozice: {stop.position}%</p>
                              <input
                                type="range"
                                min="0"
                                max="100"
                                value={stop.position}
                                onChange={(e) => updateGradientStop(index, { position: parseInt(e.target.value) })}
                                className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-violet-500"
                              />
                            </div>
                            {settings.gradientStops.length > 1 && (
                              <button
                                onClick={() => removeGradientStop(index)}
                                className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Gradient Direction */}
                    <div 
                      className="p-5 rounded-2xl"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                    >
                      <p className="text-xs font-bold text-white/40 uppercase tracking-wider mb-4">Směr přechodu</p>
                      <div className="grid grid-cols-4 gap-2">
                        {GRADIENT_DIRECTIONS.map((dir) => {
                          const DirIcon = dir.icon;
                          return (
                            <button
                              key={dir.value}
                              onClick={() => saveSettings({ ...settings, gradientDirection: dir.value })}
                              className={`flex flex-col items-center gap-2 py-3 px-2 rounded-xl transition-all ${
                                settings.gradientDirection === dir.value
                                  ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                                  : 'bg-white/5 text-white/40 border border-white/5 hover:border-white/10 hover:text-white/60'
                              }`}
                            >
                              <DirIcon className="w-5 h-5" />
                              <span className="text-[10px] font-medium">{dir.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}

                {/* Transparency */}
                <div 
                  className="p-5 rounded-2xl"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-xs font-bold text-white/40 uppercase tracking-wider">Průhlednost</p>
                    <span className="text-sm font-bold text-white/60">{settings.transparency}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={settings.transparency}
                    onChange={(e) => saveSettings({ ...settings, transparency: parseInt(e.target.value) })}
                    className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer accent-violet-500"
                  />
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="image"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {/* Image Upload */}
                <div 
                  className="p-5 rounded-2xl"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <p className="text-xs font-bold text-white/40 uppercase tracking-wider mb-4">Obrázek na pozadí</p>
                  
                  {settings.backgroundImage ? (
                    <div className="relative">
                      <img 
                        src={settings.backgroundImage} 
                        alt="Background" 
                        className="w-full h-48 object-cover rounded-xl"
                      />
                      <button
                        onClick={() => saveSettings({ ...settings, backgroundImage: null })}
                        className="absolute top-2 right-2 p-2 rounded-lg bg-red-500/80 text-white hover:bg-red-500 transition-all"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center h-48 rounded-xl border-2 border-dashed border-white/10 hover:border-violet-500/50 cursor-pointer transition-all group">
                      <Upload className="w-10 h-10 text-white/20 group-hover:text-violet-400 transition-colors mb-3" />
                      <p className="text-sm text-white/40 group-hover:text-white/60 transition-colors">
                        Klikněte nebo přetáhněte obrázek
                      </p>
                      <p className="text-xs text-white/20 mt-1">PNG, JPG, WEBP</p>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                {settings.backgroundImage && (
                  <>
                    {/* Image Opacity */}
                    <div 
                      className="p-5 rounded-2xl"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <p className="text-xs font-bold text-white/40 uppercase tracking-wider">Viditelnost obrázku</p>
                        <span className="text-sm font-bold text-white/60">{settings.imageOpacity}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={settings.imageOpacity}
                        onChange={(e) => saveSettings({ ...settings, imageOpacity: parseInt(e.target.value) })}
                        className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer accent-violet-500"
                      />
                    </div>

                    {/* Image Blur */}
                    <div 
                      className="p-5 rounded-2xl"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <p className="text-xs font-bold text-white/40 uppercase tracking-wider">Rozmazání obrázku</p>
                        <span className="text-sm font-bold text-white/60">{settings.imageBlur}px</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="50"
                        value={settings.imageBlur}
                        onChange={(e) => saveSettings({ ...settings, imageBlur: parseInt(e.target.value) })}
                        className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer accent-violet-500"
                      />
                    </div>
                  </>
                )}

                <div 
                  className="p-4 rounded-xl flex items-start gap-3"
                  style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)' }}
                >
                  <Layers className="w-5 h-5 text-violet-400 shrink-0 mt-0.5" />
                  <p className="text-sm text-violet-300/80">
                    Obrázek se zobrazuje pod barevným pozadím. Upravte průhlednost barev pro viditelnost obrázku.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right Panel - Preview */}
        <AnimatePresence>
          {showPreview && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="lg:col-span-1"
            >
              <div 
                className="sticky top-6 p-5 rounded-2xl"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <p className="text-xs font-bold text-white/40 uppercase tracking-wider mb-4">Náhled</p>
                
                {/* Preview Box */}
                <div 
                  className="relative h-80 rounded-xl overflow-hidden"
                  style={{ border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  {/* Background Image Layer */}
                  {settings.backgroundImage && (
                    <div 
                      className="absolute inset-0"
                      style={{
                        backgroundImage: `url(${settings.backgroundImage})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        opacity: settings.imageOpacity / 100,
                        filter: `blur(${settings.imageBlur}px)`,
                      }}
                    />
                  )}
                  
                  {/* Color Layer */}
                  <div 
                    className="absolute inset-0"
                    style={{
                      background: generateGradient(),
                      opacity: settings.transparency / 100,
                    }}
                  />

                  {/* Preview Content */}
                  <div className="relative z-10 p-4 h-full flex flex-col">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-3 h-3 rounded-full bg-red-500" />
                      <div className="w-3 h-3 rounded-full bg-yellow-500" />
                      <div className="w-3 h-3 rounded-full bg-green-500" />
                    </div>
                    <div className="flex-1 flex items-center justify-center">
                      <div 
                        className="p-4 rounded-xl text-center"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                      >
                        <p className="text-sm font-semibold text-white/60">Ukázka obsahu</p>
                        <p className="text-xs text-white/30 mt-1">Glassmorphism karta</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Apply Button */}
                <button
                  onClick={() => {
                    saveSettings(settings);
                    // Show success feedback
                  }}
                  className="w-full mt-4 py-3 rounded-xl bg-violet-500/20 text-violet-300 font-semibold border border-violet-500/30 hover:bg-violet-500/30 transition-all flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  Uložit nastavení
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default BackgroundManager;
