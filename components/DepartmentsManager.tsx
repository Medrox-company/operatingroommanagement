'use client';

import React, { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Check, CircleOff, Layers3, Loader2, Pencil, Plus, Search, Stethoscope, Trash2, X } from 'lucide-react';
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
    <div className="statistics-module min-h-full w-full pb-8 font-sans">
      <header className="mb-7">
        <ModulePageHeading icon={Stethoscope} kicker="SYSTEM CONFIGURATION" title="OPERAČNÍ" mutedTitle="OBORY" />
      </header>

      <section className="mb-4 overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.025]">
        <div className="flex flex-col gap-4 border-b border-white/[0.06] px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="grid grid-cols-2 gap-x-7 gap-y-3 sm:grid-cols-4">
            {([['Celkem', stats.total], ['Aktivní', stats.active], ['V rozpisu', stats.used], ['Neaktivní', stats.inactive]] as const).map(([label, value]) => (
              <div key={label} className="min-w-24">
                <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-white/34">{label}</p>
                <p className="mt-1 text-2xl font-light tabular-nums text-white/90">{value}</p>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="flex h-10 min-w-0 items-center gap-2 rounded-lg border border-white/[0.07] bg-black/[0.08] px-3 sm:w-64">
              <Search className="h-4 w-4 shrink-0 text-white/30" />
              <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Hledat operační obor" className="min-w-0 flex-1 rounded-sm bg-transparent text-xs text-white/80 outline-none placeholder:text-white/25 focus-visible:ring-2 focus-visible:ring-cyan-300/50" />
            </label>
            {isAdmin && (
              <button type="button" onClick={openCreate} className="flex h-10 items-center justify-center gap-2 rounded-lg bg-cyan-300 px-4 text-[10px] font-bold text-[#061724] transition-colors hover:bg-cyan-200">
                <Plus className="h-4 w-4" /> Přidat obor
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-4 py-3">
          {([['all', 'Všechny'], ['active', 'Aktivní'], ['inactive', 'Neaktivní']] as const).map(([value, label]) => (
            <button key={value} type="button" onClick={() => setFilter(value)} className={`h-8 rounded-lg px-3 text-[9px] font-bold uppercase tracking-[0.1em] transition-colors ${filter === value ? 'bg-white/[0.10] text-white' : 'text-white/38 hover:bg-white/[0.04] hover:text-white/65'}`}>{label}</button>
          ))}
          {!isAdmin && <span className="ml-auto text-[9px] font-semibold text-white/30">Pouze pro čtení</span>}
        </div>
      </section>

      {error && <div className="mb-4 rounded-xl border border-amber-300/15 bg-amber-300/[0.045] px-4 py-3 text-xs text-amber-100/85">{error}</div>}

      <section className="overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.025]">
        <div className="hidden grid-cols-[minmax(230px,1.3fr)_minmax(180px,1fr)_120px_115px_112px] gap-4 border-b border-white/[0.06] px-5 py-3 text-[9px] font-bold uppercase tracking-[0.14em] text-white/30 md:grid">
          <span>Operační obor</span><span>Popis</span><span>Použití</span><span>Stav</span><span className="text-right">Akce</span>
        </div>

        {loading && departments.length === 0 ? (
          <div className="flex min-h-72 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-cyan-300/70" /></div>
        ) : visibleDepartments.length === 0 ? (
          <div className="flex min-h-72 flex-col items-center justify-center px-6 text-center">
            <Layers3 className="h-9 w-9 text-white/20" strokeWidth={1.4} />
            <p className="mt-4 text-sm font-semibold text-white/65">{departments.length === 0 ? 'Zatím nejsou založené žádné operační obory.' : 'Žádný obor neodpovídá filtru.'}</p>
            {departments.length === 0 && isAdmin && <p className="mt-1 text-xs text-white/35">Přidejte první obor a následně jej přiřaďte v Rozpisu sálů.</p>}
          </div>
        ) : visibleDepartments.map(department => {
          const color = department.accent_color ?? COLOR_PRESETS[0];
          return (
            <article key={department.id} className={`relative grid gap-3 border-b border-white/[0.055] px-5 py-4 last:border-b-0 md:grid-cols-[minmax(230px,1.3fr)_minmax(180px,1fr)_120px_115px_112px] md:items-center md:gap-4 ${department.is_active ? 'hover:bg-white/[0.025]' : 'opacity-55 hover:opacity-75'}`}>
              <span className="absolute inset-y-3 left-0 w-px" style={{ backgroundColor: color }} />
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid h-9 min-w-9 shrink-0 place-items-center rounded-lg border px-2 text-[11px] font-black tracking-[0.04em]" style={{ borderColor: `${color}58`, backgroundColor: `${color}22`, color }}>{department.short_code}</span>
                <div className="min-w-0"><h3 className="truncate text-sm font-bold text-white/88">{department.name}</h3><p className="mt-0.5 text-[9px] uppercase tracking-[0.12em] text-white/27">Pořadí {department.sort_order + 1}</p></div>
              </div>
              <p className="min-w-0 text-xs leading-5 text-white/43 md:line-clamp-2">{department.description || 'Bez doplňujícího popisu'}</p>
              <div><p className="text-sm font-semibold tabular-nums text-white/75">{department.allocation_count}</p><p className="text-[9px] text-white/30">položek rozpisu</p></div>
              <button type="button" onClick={() => isAdmin && void toggleDepartment(department)} disabled={!isAdmin || saving} className={`inline-flex h-8 w-fit items-center gap-2 rounded-lg px-2.5 text-[9px] font-bold uppercase tracking-[0.08em] ${department.is_active ? 'bg-emerald-300/[0.08] text-emerald-200/75' : 'bg-white/[0.04] text-white/36'} disabled:cursor-default`}>
                {department.is_active ? <Check className="h-3.5 w-3.5" /> : <CircleOff className="h-3.5 w-3.5" />}{department.is_active ? 'Aktivní' : 'Neaktivní'}
              </button>
              {isAdmin && (
                <div className="flex justify-start gap-1.5 md:justify-end">
                  <button type="button" onClick={() => openEdit(department)} aria-label={`Upravit ${department.name}`} className="grid h-9 w-9 place-items-center rounded-lg border border-white/[0.065] text-white/42 transition-colors hover:bg-white/[0.06] hover:text-white/80"><Pencil className="h-3.5 w-3.5" /></button>
                  <button type="button" onClick={() => void deleteDepartment(department)} aria-label={`Smazat ${department.name}`} title={department.allocation_count > 0 ? 'Používaný obor lze pouze deaktivovat' : 'Smazat obor'} className={`grid h-9 w-9 place-items-center rounded-lg border transition-colors ${department.allocation_count > 0 ? 'cursor-not-allowed border-white/[0.04] text-white/16' : 'border-red-200/[0.08] text-red-200/40 hover:bg-red-300/[0.06] hover:text-red-200/75'}`}><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              )}
            </article>
          );
        })}
      </section>

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
