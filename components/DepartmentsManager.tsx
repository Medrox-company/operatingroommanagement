'use client';

import React, { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, Check, CircleCheck, CircleOff, Layers3, Loader2, Pencil, Plus, RefreshCw, Search, Stethoscope, Trash2, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useHospital } from '../contexts/HospitalContext';
import { useHospitalRealtime } from '../contexts/RealtimeContext';
import { useConfirm } from './ui/ConfirmDialog';
import { toast } from './ui/toast';
import ModulePageHeading from './ModulePageHeading';

interface OperatingSpecialty {
  id: string;
  name: string;
  short_code: string;
  description: string | null;
  accent_color: string | null;
  is_active: boolean;
  sort_order: number;
  allocation_count: number;
}

interface EditorState {
  id: string | null;
  name: string;
  shortCode: string;
  description: string;
  accentColor: string;
  isActive: boolean;
  sortOrder: number;
}

type Filter = 'all' | 'active' | 'inactive';

const COLOR_PRESETS = ['#22D3EE', '#38BDF8', '#818CF8', '#A78BFA', '#F472B6', '#34D399', '#FBBF24', '#FB7185'];
const EMPTY_EDITOR: EditorState = {
  id: null,
  name: '',
  shortCode: '',
  description: '',
  accentColor: COLOR_PRESETS[0],
  isActive: true,
  sortOrder: 0,
};

function apiError(payload: unknown, fallback: string) {
  if (payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string') {
    return payload.error;
  }
  return fallback;
}

const DepartmentsManager: React.FC = () => {
  const { activeHospitalId } = useHospital();
  const { isAdmin } = useAuth();
  const confirm = useConfirm();
  const [departments, setDepartments] = useState<OperatingSpecialty[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [editor, setEditor] = useState<EditorState | null>(null);

  const loadDepartments = useCallback(async (signal?: AbortSignal) => {
    if (!activeHospitalId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/operating-specialties', {
        credentials: 'include',
        cache: 'no-store',
        signal,
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(apiError(payload, 'Operační obory se nepodařilo načíst.'));
      setDepartments(Array.isArray(payload.departments) ? payload.departments : []);
    } catch (loadError) {
      if (loadError instanceof DOMException && loadError.name === 'AbortError') return;
      setError(loadError instanceof Error ? loadError.message : 'Operační obory se nepodařilo načíst.');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [activeHospitalId]);

  useEffect(() => {
    const controller = new AbortController();
    void loadDepartments(controller.signal);
    return () => controller.abort();
  }, [loadDepartments]);

  useHospitalRealtime('departments', () => {
    void loadDepartments();
  });

  const stats = useMemo(() => ({
    total: departments.length,
    active: departments.filter(item => item.is_active).length,
    used: departments.filter(item => item.allocation_count > 0).length,
    inactive: departments.filter(item => !item.is_active).length,
  }), [departments]);

  const visibleDepartments = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('cs');
    return departments.filter(department => {
      if (filter === 'active' && !department.is_active) return false;
      if (filter === 'inactive' && department.is_active) return false;
      if (!normalizedQuery) return true;
      return `${department.name} ${department.short_code} ${department.description ?? ''}`.toLocaleLowerCase('cs').includes(normalizedQuery);
    });
  }, [departments, filter, query]);

  const notifyChanged = () => window.dispatchEvent(new Event('operatingSpecialtiesChanged'));

  const openCreate = () => setEditor({ ...EMPTY_EDITOR, sortOrder: departments.length });

  const openEdit = (department: OperatingSpecialty) => {
    setEditor({
      id: department.id,
      name: department.name,
      shortCode: department.short_code,
      description: department.description ?? '',
      accentColor: department.accent_color ?? COLOR_PRESETS[0],
      isActive: department.is_active,
      sortOrder: department.sort_order,
    });
  };

  const saveDepartment = async (event: FormEvent) => {
    event.preventDefault();
    if (!editor || saving) return;
    setSaving(true);
    try {
      const response = await fetch('/api/operating-specialties', {
        method: editor.id ? 'PUT' : 'POST',
        credentials: 'include',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editor.id,
          name: editor.name,
          shortCode: editor.shortCode,
          description: editor.description,
          accentColor: editor.accentColor,
          isActive: editor.isActive,
          sortOrder: editor.sortOrder,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(apiError(payload, 'Operační obor se nepodařilo uložit.'));
      const wasEdit = Boolean(editor.id);
      setEditor(null);
      await loadDepartments();
      notifyChanged();
      toast.success(wasEdit ? 'Operační obor byl upraven' : 'Operační obor byl přidán');
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : 'Operační obor se nepodařilo uložit.');
    } finally {
      setSaving(false);
    }
  };

  const toggleDepartment = async (department: OperatingSpecialty) => {
    if (saving) return;
    setSaving(true);
    try {
      const response = await fetch('/api/operating-specialties', {
        method: 'PUT',
        credentials: 'include',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: department.id,
          name: department.name,
          shortCode: department.short_code,
          description: department.description ?? '',
          accentColor: department.accent_color ?? COLOR_PRESETS[0],
          isActive: !department.is_active,
          sortOrder: department.sort_order,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(apiError(payload, 'Stav operačního oboru se nepodařilo změnit.'));
      await loadDepartments();
      notifyChanged();
      toast.success(department.is_active ? 'Operační obor byl deaktivován' : 'Operační obor byl aktivován');
    } catch (toggleError) {
      toast.error(toggleError instanceof Error ? toggleError.message : 'Stav operačního oboru se nepodařilo změnit.');
    } finally {
      setSaving(false);
    }
  };

  const deleteDepartment = async (department: OperatingSpecialty) => {
    if (department.allocation_count > 0) {
      toast.error('Používaný operační obor nelze smazat. Deaktivujte jej.');
      return;
    }
    const accepted = await confirm({
      title: `Smazat obor ${department.name}?`,
      description: 'Smazat lze pouze obor, který nebyl použit v rozpisu. Tuto akci nelze vrátit zpět.',
      confirmLabel: 'Smazat obor',
      danger: true,
    });
    if (!accepted) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/operating-specialties?id=${encodeURIComponent(department.id)}`, {
        method: 'DELETE',
        credentials: 'include',
        cache: 'no-store',
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(apiError(payload, 'Operační obor se nepodařilo smazat.'));
      await loadDepartments();
      notifyChanged();
      toast.success('Operační obor byl smazán');
    } catch (deleteError) {
      toast.error(deleteError instanceof Error ? deleteError.message : 'Operační obor se nepodařilo smazat.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="statistics-module min-h-full w-full pb-10 font-sans">
      <header className="mb-7">
        <ModulePageHeading icon={Stethoscope} kicker="SYSTEM CONFIGURATION" title="OPERAČNÍ" mutedTitle="OBORY" />
      </header>

      {/* Jedna vodorovná lišta ve stejné skladbě i velikostech jako v modulu
          Rozpis sálů: dlaždice čísel · dělítko · popisek · přepínač · akce. */}
      <section className="hide-scrollbar mb-4 overflow-x-auto rounded-xl border border-white/[0.06] bg-white/[0.025] p-3">
        <div className="flex min-w-max items-center gap-2.5">
          {([
            { label: 'Celkem oborů', value: stats.total, suffix: 'oborů', icon: Layers3, color: '#38BDF8' },
            { label: 'Aktivní', value: stats.active, suffix: 'oborů', icon: CircleCheck, color: '#34D399' },
            { label: 'V rozpisu', value: stats.used, suffix: 'oborů', icon: CalendarDays, color: '#A78BFA' },
            { label: 'Neaktivní', value: stats.inactive, suffix: 'oborů', icon: CircleOff, color: '#FBBF24' },
          ] as const).map(({ label, value, suffix, icon: Icon, color }) => (
            <div key={label} className="relative flex h-[68px] w-[112px] shrink-0 items-center overflow-hidden rounded-lg border border-white/[0.05] bg-black/10 px-3 py-2.5 2xl:w-[128px]">
              <div className="flex w-full items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-[8px] font-semibold uppercase tracking-[0.08em] text-white/38" title={label}>{label}</p>
                  <div className="mt-1.5 flex items-baseline gap-1">
                    <span className="text-[22px] font-light leading-none tabular-nums text-white/95">{value}</span>
                    <span className="text-[8px] font-medium text-white/28">{suffix}</span>
                  </div>
                </div>
                <Icon className="h-4 w-4 shrink-0" style={{ color }} strokeWidth={1.5} />
              </div>
            </div>
          ))}

          <div className="ml-1 h-10 w-px shrink-0 bg-white/[0.07]" aria-hidden="true" />

          <div className="w-[104px] shrink-0">
            <h2 className="text-[11px] font-semibold leading-tight text-white/92">Katalog oborů</h2>
            <p className="mt-1 text-[8px] leading-tight text-white/38">Zdroj pro rozpis</p>
          </div>

          <div className="grid shrink-0 grid-cols-3 rounded-lg border border-white/[0.055] bg-white/[0.025] p-0.5">
            {([['all', 'Všechny'], ['active', 'Aktivní'], ['inactive', 'Neaktivní']] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                aria-pressed={filter === value}
                className={`h-8 rounded-md px-3 text-[8px] font-semibold uppercase tracking-[0.08em] ${filter === value ? 'bg-white/[0.09] text-cyan-200' : 'text-white/38 hover:text-white/70'}`}
              >
                {label}
              </button>
            ))}
          </div>

          <label className="flex h-10 w-[190px] shrink-0 items-center gap-2 rounded-lg border border-white/[0.055] bg-black/10 px-3">
            <Search className="h-4 w-4 shrink-0 text-white/30" />
            <input
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="Hledat obor"
              aria-label="Hledat operační obor"
              className="min-w-0 flex-1 bg-transparent text-[11px] font-semibold text-white/88 outline-none placeholder:font-normal placeholder:text-white/28"
            />
          </label>

          {isAdmin ? (
            <button type="button" onClick={openCreate} className="flex h-10 shrink-0 items-center gap-2 rounded-lg border border-cyan-200/[0.20] bg-cyan-300/[0.10] px-4 text-[9px] font-semibold uppercase tracking-[0.08em] text-cyan-100 hover:bg-cyan-300/[0.16]">
              <Plus className="h-4 w-4" /> Přidat obor
            </button>
          ) : (
            <span className="h-10 shrink-0 rounded-lg border border-white/[0.06] bg-white/[0.025] px-4 text-[9px] font-semibold uppercase leading-10 tracking-[0.08em] text-white/38">Pouze pro čtení</span>
          )}

          <button type="button" onClick={() => void loadDepartments()} disabled={loading} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.025] text-white/42 hover:text-white disabled:opacity-40" aria-label="Obnovit obory">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </section>

      {error && <div className="mb-4 rounded-xl border border-amber-300/15 bg-amber-300/[0.045] p-3.5 text-xs text-amber-100/85">{error}</div>}

      {/* Místo široké pětisloupcové tabulky, kde se každý obor táhl přes celou
          šířku obrazovky, jsou obory ve dvou sloupcích kompaktních karet.
          Každá karta drží jméno, popis, použití i akce pohromadě. */}
      {loading && departments.length === 0 ? (
        <section className="flex min-h-[320px] items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.025]">
          <Loader2 className="h-6 w-6 animate-spin text-cyan-300/70" />
        </section>
      ) : visibleDepartments.length === 0 ? (
        <section className="flex min-h-[320px] flex-col items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.025] px-6 text-center">
          <Layers3 className="h-9 w-9 text-white/20" strokeWidth={1.4} />
          <p className="mt-4 text-sm font-semibold text-white/65">{departments.length === 0 ? 'Zatím nejsou založené žádné operační obory.' : 'Žádný obor neodpovídá filtru.'}</p>
          {departments.length === 0 && isAdmin && <p className="mt-1 text-xs text-white/35">Přidejte první obor a následně jej přiřaďte v Rozpisu sálů.</p>}
        </section>
      ) : (
        <section className="grid gap-2.5 xl:grid-cols-2">
          {visibleDepartments.map(department => {
            const color = department.accent_color ?? COLOR_PRESETS[0];
            return (
              <article
                key={department.id}
                className={`relative flex h-full flex-col overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.025] pl-5 pr-4 py-3.5 transition-colors ${department.is_active ? 'hover:bg-white/[0.04]' : 'opacity-55 hover:opacity-80'}`}
                style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.025)' }}
              >
                <span className="absolute inset-y-0 left-0 w-[3px]" style={{ backgroundColor: `${color}88` }} />

                <div className="flex items-center gap-3.5">
                  {/* Pevná velikost dlaždice se zkratkou — 3písmenná i delší
                      zkratka zabírá stejné místo, takže sloupec drží linku. */}
                  <span
                    className="flex h-11 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border px-1 text-[12px] font-black leading-none tracking-[0.02em]"
                    style={{ borderColor: `${color}58`, backgroundColor: `${color}1f`, color }}
                  >
                    <span className="truncate">{department.short_code}</span>
                  </span>

                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-[15px] font-bold leading-tight text-white/90">{department.name}</h3>
                    <p className="mt-1 flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-white/30">
                      <span
                        className="inline-block h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: department.is_active ? '#34D399' : 'rgba(255,255,255,0.22)' }}
                      />
                      {department.is_active ? 'Aktivní' : 'Neaktivní'}
                      <span className="text-white/16">·</span>
                      pořadí {department.sort_order + 1}
                      <span className="text-white/16">·</span>
                      <span className="tabular-nums text-white/44">{department.allocation_count}</span> v rozpisu
                    </p>
                  </div>

                  {isAdmin && (
                    <div className="flex shrink-0 gap-1.5">
                      <button
                        type="button"
                        onClick={() => void toggleDepartment(department)}
                        disabled={saving}
                        aria-label={department.is_active ? `Deaktivovat ${department.name}` : `Aktivovat ${department.name}`}
                        title={department.is_active ? 'Deaktivovat obor' : 'Aktivovat obor'}
                        className={`grid h-8 w-8 place-items-center rounded-lg border transition-colors disabled:cursor-default ${department.is_active ? 'border-emerald-200/[0.14] text-emerald-200/70 hover:bg-emerald-300/[0.08] hover:text-emerald-200' : 'border-white/[0.065] text-white/34 hover:bg-white/[0.06] hover:text-white/75'}`}
                      >
                        {department.is_active ? <Check className="h-3.5 w-3.5" /> : <CircleOff className="h-3.5 w-3.5" />}
                      </button>
                      <button type="button" onClick={() => openEdit(department)} aria-label={`Upravit ${department.name}`} className="grid h-8 w-8 place-items-center rounded-lg border border-white/[0.065] text-white/42 transition-colors hover:bg-white/[0.06] hover:text-white/80"><Pencil className="h-3.5 w-3.5" /></button>
                      <button type="button" onClick={() => void deleteDepartment(department)} aria-label={`Smazat ${department.name}`} title={department.allocation_count > 0 ? 'Používaný obor lze pouze deaktivovat' : 'Smazat obor'} className={`grid h-8 w-8 place-items-center rounded-lg border transition-colors ${department.allocation_count > 0 ? 'cursor-not-allowed border-white/[0.04] text-white/16' : 'border-red-200/[0.08] text-red-200/40 hover:bg-red-300/[0.06] hover:text-red-200/75'}`}><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  )}
                </div>

                <p className="mt-auto pt-3 min-h-[30px] text-[11.5px] leading-[15px] text-white/42 line-clamp-2">
                  {department.description || 'Bez doplňujícího popisu'}
                </p>
              </article>
            );
          })}
        </section>
      )}

      {editor && (
        <div className="fixed inset-0 z-[120] grid place-items-center bg-[#030611]/80 p-4 backdrop-blur-md" onMouseDown={event => { if (event.target === event.currentTarget && !saving) setEditor(null); }}>
          <form onSubmit={saveDepartment} role="dialog" aria-modal="true" aria-labelledby="specialty-editor-title" className="w-full max-w-xl overflow-hidden rounded-xl border border-white/[0.09] bg-[linear-gradient(145deg,rgba(25,37,68,0.98),rgba(7,12,26,0.99))] shadow-[0_30px_90px_rgba(0,0,0,0.55)]">
            <div className="flex items-start justify-between border-b border-white/[0.07] px-5 py-4 sm:px-6">
              <div><p className="text-[9px] font-bold uppercase tracking-[0.18em] text-cyan-200/58">Operační program</p><h2 id="specialty-editor-title" className="mt-1.5 text-xl font-bold text-white/92">{editor.id ? 'Upravit operační obor' : 'Nový operační obor'}</h2></div>
              <button type="button" onClick={() => setEditor(null)} disabled={saving} aria-label="Zavřít" className="grid h-9 w-9 place-items-center rounded-lg border border-white/[0.07] text-white/42 hover:bg-white/[0.05] hover:text-white/75"><X className="h-4 w-4" /></button>
            </div>

            <div className="space-y-5 px-5 py-5 sm:px-6">
              <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_148px]">
                <label className="block"><span className="mb-2 block text-[9px] font-bold uppercase tracking-[0.14em] text-white/35">Název oboru</span><input required minLength={2} maxLength={100} value={editor.name} onChange={event => setEditor(current => current ? { ...current, name: event.target.value } : current)} placeholder="Např. Traumatologie" className="h-11 w-full rounded-lg border border-white/[0.08] bg-white/[0.035] px-3.5 text-sm text-white/90 outline-none transition-colors placeholder:text-white/22 focus:border-cyan-200/30 focus:bg-white/[0.05] focus-visible:ring-2 focus-visible:ring-cyan-300/50" /></label>
                <label className="block"><span className="mb-2 block text-[9px] font-bold uppercase tracking-[0.14em] text-white/35">Zkratka oboru</span><input required minLength={2} maxLength={10} value={editor.shortCode} onChange={event => setEditor(current => current ? { ...current, shortCode: event.target.value.replace(/\./g, '').toLocaleUpperCase('cs') } : current)} placeholder="TRA" className="h-11 w-full rounded-lg border border-white/[0.08] bg-white/[0.035] px-3.5 text-sm font-black uppercase tracking-[0.08em] text-white/90 outline-none transition-colors placeholder:text-white/22 focus:border-cyan-200/30 focus:bg-white/[0.05] focus-visible:ring-2 focus-visible:ring-cyan-300/50" /><span className="mt-1.5 block text-[8px] text-white/28">2–10 znaků, bez teček</span></label>
              </div>
              <label className="block"><span className="mb-2 block text-[9px] font-bold uppercase tracking-[0.14em] text-white/35">Krátký popis</span><textarea maxLength={240} rows={3} value={editor.description} onChange={event => setEditor(current => current ? { ...current, description: event.target.value } : current)} placeholder="Volitelný popis pro administrátory" className="w-full resize-none rounded-lg border border-white/[0.08] bg-white/[0.035] px-3.5 py-3 text-sm leading-5 text-white/85 outline-none placeholder:text-white/22 focus:border-cyan-200/30 focus:bg-white/[0.05] focus-visible:ring-2 focus-visible:ring-cyan-300/50" /><span className="mt-1 block text-right text-[9px] tabular-nums text-white/25">{editor.description.length} / 240</span></label>
              <fieldset>
                <legend className="mb-2 text-[9px] font-bold uppercase tracking-[0.14em] text-white/35">Barva v rozpisu</legend>
                <div className="flex flex-wrap items-center gap-2">
                  {COLOR_PRESETS.map(color => <button key={color} type="button" onClick={() => setEditor(current => current ? { ...current, accentColor: color } : current)} aria-label={`Vybrat barvu ${color}`} className="grid h-9 w-9 place-items-center rounded-lg border transition-[filter] hover:brightness-125" style={{ backgroundColor: `${color}24`, borderColor: editor.accentColor === color ? `${color}B8` : `${color}48` }}>{editor.accentColor === color && <Check className="h-4 w-4" style={{ color }} />}</button>)}
                  <label className="ml-1 flex h-9 items-center gap-2 rounded-lg border border-white/[0.07] px-2.5 text-[9px] font-semibold text-white/38">Vlastní<input type="color" value={editor.accentColor} onChange={event => setEditor(current => current ? { ...current, accentColor: event.target.value.toUpperCase() } : current)} className="h-5 w-7 cursor-pointer border-0 bg-transparent p-0" /></label>
                </div>
              </fieldset>
              <label className="flex cursor-pointer items-center justify-between rounded-lg border border-white/[0.065] bg-white/[0.025] px-3.5 py-3">
                <span><span className="block text-xs font-semibold text-white/72">Aktivní pro nové rozpisy</span><span className="mt-0.5 block text-[9px] text-white/32">Deaktivace zachová všechna historická přiřazení.</span></span>
                <input type="checkbox" checked={editor.isActive} onChange={event => setEditor(current => current ? { ...current, isActive: event.target.checked } : current)} className="h-4 w-4 accent-cyan-300" />
              </label>
            </div>

            <div className="flex justify-end gap-2 border-t border-white/[0.07] px-5 py-4 sm:px-6">
              <button type="button" onClick={() => setEditor(null)} disabled={saving} className="h-10 rounded-lg border border-white/[0.07] px-4 text-[10px] font-semibold text-white/48 hover:bg-white/[0.04] hover:text-white/72">Zrušit</button>
              <button type="submit" disabled={saving || editor.name.trim().length < 2 || editor.shortCode.trim().length < 2} className="flex h-10 min-w-32 items-center justify-center gap-2 rounded-lg bg-cyan-300 px-5 text-[10px] font-bold text-[#061724] hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-40">{saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}{editor.id ? 'Uložit změny' : 'Vytvořit obor'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default DepartmentsManager;
