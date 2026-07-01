'use client';

import React, { useMemo, useState } from 'react';
import * as RadixDialog from '@radix-ui/react-dialog';
import {
  Activity,
  BarChart3,
  CheckCircle2,
  Clock,
  Edit3,
  Info,
  Loader2,
  Radio,
  Save,
  Search,
  ToggleLeft,
  ToggleRight,
  UserRoundCheck,
  UserRoundX,
  X,
} from 'lucide-react';
import {
  useWorkflowStatusesContext,
  type WorkflowStatus,
} from '../contexts/WorkflowStatusesContext';

interface EditingStatus {
  id: string;
  name: string;
  description: string;
  accent_color: string;
  default_duration_minutes: number;
  include_in_statistics: boolean;
  is_active: boolean;
}

type StatusFilter = 'all' | 'active' | 'inactive' | 'special';

const COLORS = {
  cyan: '#36D9EC',
  green: '#34D399',
  amber: '#FBBF24',
  red: '#FB7185',
  blue: '#38BDF8',
  violet: '#A78BFA',
};

const fieldClass =
  'h-11 w-full rounded-xl border border-white/[0.09] bg-white/[0.025] px-3.5 text-sm text-white outline-none transition-colors placeholder:text-white/20 focus:border-cyan-300/40';

const specialTypeLabel = (status: WorkflowStatus) => {
  switch (status.special_type) {
    case 'pause':
      return 'Pauza';
    case 'hygiene':
      return 'Hygiena';
    case 'patient_called':
      return 'Volání pacienta';
    case 'patient_arrived_tract':
      return 'Příjezd pacienta';
    default:
      return 'Ruční aktivace';
  }
};

const ToggleSwitch: React.FC<{
  enabled: boolean;
  label: string;
  onToggle: () => void;
  disabled?: boolean;
}> = ({ enabled, label, onToggle, disabled }) => (
  <button
    type="button"
    role="switch"
    aria-checked={enabled}
    aria-label={label}
    onClick={onToggle}
    disabled={disabled}
    className="relative h-6 w-11 rounded-full border transition-colors disabled:cursor-not-allowed disabled:opacity-40"
    style={{
      background: enabled ? `${COLORS.green}32` : 'rgba(255,255,255,0.045)',
      borderColor: enabled ? `${COLORS.green}55` : 'rgba(255,255,255,0.12)',
    }}
  >
    <span
      className="absolute top-[3px] h-4 w-4 rounded-full bg-white shadow-sm transition-[left]"
      style={{ left: enabled ? 23 : 3 }}
    />
  </button>
);

const StatusCard: React.FC<{
  status: WorkflowStatus;
  saving: boolean;
  onEdit: () => void;
  onToggleActive: () => void;
  onToggleStatistics: () => void;
}> = ({ status, saving, onEdit, onToggleActive, onToggleStatistics }) => {
  const accent = status.accent_color || COLORS.cyan;
  const order = status.is_special ? 'S' : String((status.sort_order ?? 0) + 1).padStart(2, '0');

  return (
    <article
      className="relative min-h-[198px] overflow-hidden rounded-[22px] p-3 font-sans"
      style={{
        background: status.is_active
          ? `linear-gradient(125deg, ${accent}0A, rgba(255,255,255,0.018) 52%, rgba(167,139,250,0.012))`
          : 'rgba(255,255,255,0.016)',
        border: `1px solid ${status.is_active ? 'rgba(125,165,185,0.16)' : 'rgba(255,255,255,0.07)'}`,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.025)',
      }}
    >
      <div
        aria-hidden
        className="absolute inset-x-10 top-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }}
      />

      <div className="grid h-full grid-cols-[118px_minmax(0,1fr)] gap-3 sm:grid-cols-[142px_minmax(0,1fr)]">
        <div
          className="flex min-w-0 flex-col justify-between overflow-hidden rounded-2xl px-3 py-3"
          style={{
            background: status.is_active
              ? `linear-gradient(145deg, ${accent}2E, ${accent}12)`
              : 'linear-gradient(145deg, rgba(148,163,184,0.11), rgba(148,163,184,0.04))',
            border: `1px solid ${status.is_active ? `${accent}52` : 'rgba(148,163,184,0.15)'}`,
          }}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[8px] font-bold uppercase tracking-[0.12em] text-white/35">
              {status.is_special ? 'Speciální' : 'Workflow'}
            </span>
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ background: status.is_active ? COLORS.green : 'rgba(255,255,255,0.22)' }}
            />
          </div>

          <div className="my-2">
            <div
              className="flex h-10 min-w-10 items-center justify-center rounded-xl px-2 text-xs font-bold"
              style={{ color: accent, background: `${accent}16`, border: `1px solid ${accent}25` }}
            >
              {order}
            </div>
            <h3 className="mt-2 line-clamp-2 text-sm font-bold leading-tight text-white">{status.name}</h3>
            <p className="mt-1.5 text-[9px] font-semibold" style={{ color: accent }}>
              {status.is_special ? specialTypeLabel(status) : `${status.default_duration_minutes || 0} minut`}
            </p>
          </div>

          <span className={`text-[9px] font-semibold ${status.is_active ? 'text-emerald-300/75' : 'text-white/28'}`}>
            {status.is_active ? 'Aktivní' : 'Neaktivní'}
          </span>
        </div>

        <div className="flex min-w-0 flex-col gap-2 py-0.5">
          <div className="flex min-w-0 flex-1 items-center gap-2.5 rounded-2xl border border-cyan-300/10 bg-cyan-300/[0.035] px-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-300/[0.09] text-cyan-300">
              {status.is_special ? <Radio className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
            </span>
            <div className="min-w-0">
              <p className="text-[9px] font-medium text-white/32">
                {status.is_special ? 'Způsob spuštění' : 'Výchozí trvání'}
              </p>
              <p className="truncate text-xs font-semibold text-white/72">
                {status.is_special ? 'Tlačítkem v detailu sálu' : `${status.default_duration_minutes || 0} minut`}
              </p>
            </div>
          </div>

          <div className="flex min-w-0 flex-1 items-center gap-2.5 rounded-2xl border border-violet-300/10 bg-violet-300/[0.03] px-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-300/[0.08] text-violet-300">
              <Info className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0">
              <p className="text-[9px] font-medium text-white/32">Popis statusu</p>
              <p className="line-clamp-2 text-xs font-semibold leading-snug text-white/72">
                {status.description || (status.is_special ? specialTypeLabel(status) : 'Bez doplňujícího popisu')}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 px-1 pt-0.5">
            <button
              type="button"
              onClick={onToggleStatistics}
              disabled={saving}
              className={`flex h-7 items-center gap-1.5 rounded-lg border px-2.5 text-[8px] font-bold uppercase tracking-[0.08em] transition-colors disabled:opacity-40 ${
                status.include_in_statistics
                  ? 'border-amber-300/20 bg-amber-300/[0.06] text-amber-200/75 hover:text-amber-100'
                  : 'border-white/[0.08] bg-white/[0.025] text-white/32 hover:text-white'
              }`}
            >
              <BarChart3 className="h-3 w-3" />
              {status.include_in_statistics ? 'Ve statistikách' : 'Mimo statistiky'}
            </button>

            <div className="flex items-center gap-2">
              <ToggleSwitch
                enabled={status.is_active}
                label={`${status.is_active ? 'Deaktivovat' : 'Aktivovat'} status ${status.name}`}
                onToggle={onToggleActive}
                disabled={saving}
              />
              <button
                type="button"
                onClick={onEdit}
                className="flex h-7 items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.025] px-2.5 text-[9px] font-bold uppercase tracking-[0.1em] text-white/48 transition-colors hover:border-cyan-300/25 hover:text-cyan-200"
              >
                <Edit3 className="h-3 w-3" />
                Upravit
              </button>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
};

const StatusesManager: React.FC = () => {
  const { statuses, loading, updateStatus } = useWorkflowStatusesContext();
  const [editingData, setEditingData] = useState<EditingStatus | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const sortedStatuses = useMemo(
    () => [...statuses].sort((a, b) => {
      if (a.is_special !== b.is_special) return a.is_special ? 1 : -1;
      return (a.sort_order ?? 0) - (b.sort_order ?? 0);
    }),
    [statuses],
  );

  const stats = useMemo(() => {
    const active = statuses.filter(status => status.is_active);
    return {
      total: statuses.length,
      active: active.length,
      inactive: statuses.length - active.length,
      statistics: statuses.filter(status => status.include_in_statistics).length,
      special: statuses.filter(status => status.is_special).length,
    };
  }, [statuses]);

  const filteredStatuses = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase('cs');
    return sortedStatuses.filter(status => {
      const matchesFilter =
        filter === 'all'
        || (filter === 'active' && status.is_active)
        || (filter === 'inactive' && !status.is_active)
        || (filter === 'special' && status.is_special);
      const haystack = [
        status.name,
        status.description,
        status.special_type,
        status.is_special ? 'speciální tlačítko' : 'workflow',
      ].filter(Boolean).join(' ').toLocaleLowerCase('cs');
      return matchesFilter && (!query || haystack.includes(query));
    });
  }, [filter, searchQuery, sortedStatuses]);

  const handleEdit = (status: WorkflowStatus) => {
    setEditingData({
      id: status.id,
      name: status.name,
      description: status.description || '',
      accent_color: status.accent_color,
      default_duration_minutes: status.default_duration_minutes || 0,
      include_in_statistics: status.include_in_statistics ?? true,
      is_active: status.is_active,
    });
    setError(null);
  };

  const handleCancel = () => {
    setEditingData(null);
    setError(null);
  };

  const handleSave = async () => {
    if (!editingData) return;

    setSaving(true);
    setError(null);
    const draft = editingData;

    try {
      setEditingData(null);
      await updateStatus(draft.id, {
        name: draft.name,
        description: draft.description,
        color: draft.accent_color,
        default_duration: draft.default_duration_minutes,
        count_in_statistics: draft.include_in_statistics,
        is_active: draft.is_active,
      });
    } catch (saveError) {
      setError('Nepodařilo se uložit změny statusu.');
      console.error('Error saving status:', saveError);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (status: WorkflowStatus) => {
    try {
      await updateStatus(status.id, { is_active: !status.is_active });
    } catch (toggleError) {
      console.error('Error toggling status:', toggleError);
    }
  };

  const handleToggleStatistics = async (status: WorkflowStatus) => {
    try {
      await updateStatus(status.id, { count_in_statistics: !status.include_in_statistics });
    } catch (toggleError) {
      console.error('Error toggling statistics:', toggleError);
    }
  };

  const editingStatus = editingData
    ? statuses.find(status => status.id === editingData.id)
    : null;

  return (
    <div className="min-h-full w-full pb-8 font-sans">
      <header className="mb-7 space-y-3">
        <div className="flex items-center gap-3">
          <Activity className="h-4 w-4 text-[#FBBF24]" />
          <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-[#FBBF24]">WORKFLOW CONTROL</p>
        </div>
        <h1 className="text-[clamp(2.25rem,7vw,4.5rem)] font-bold uppercase leading-none tracking-tight">
          Správa <span className="text-white/20">STATUSŮ</span>
        </h1>
        <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
          <p className="text-sm font-medium text-white/40">
            Fáze operačního workflow, barevné značení a pravidla statistik
          </p>
          <div className="inline-flex items-center gap-2 text-[9px] font-bold tracking-[0.16em] text-emerald-300/75">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            WORKFLOW KONFIGURACE AKTIVNÍ
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
        <div className="grid grid-cols-2 gap-1.5 md:grid-cols-5">
          {[
            { label: 'Celkem statusů', value: stats.total, suffix: 'statusů', color: COLORS.cyan, icon: Activity },
            { label: 'Aktivní', value: stats.active, suffix: 'statusů', color: COLORS.green, icon: UserRoundCheck },
            { label: 'Neaktivní', value: stats.inactive, suffix: 'statusů', color: stats.inactive ? COLORS.amber : COLORS.green, icon: UserRoundX },
            { label: 'Ve statistikách', value: stats.statistics, suffix: 'statusů', color: COLORS.blue, icon: BarChart3 },
            { label: 'Speciální', value: stats.special, suffix: 'tlačítek', color: COLORS.violet, icon: Radio },
          ].map(({ label, value, suffix, color, icon: Icon }, index) => (
            <div
              key={label}
              className={`relative flex min-h-[78px] flex-col justify-between rounded-2xl px-3.5 py-3 ${index === 4 ? 'col-span-2 md:col-span-1' : ''}`}
              style={{ background: `${color}08`, border: `1px solid ${color}17` }}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-[8px] font-bold uppercase tracking-[0.16em] text-white/38">{label}</p>
                <Icon className="h-3.5 w-3.5" style={{ color }} />
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-2xl font-semibold tabular-nums tracking-tight" style={{ color }}>{value}</span>
                <span className="text-[9px] text-white/25">{suffix}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section
        className="mb-5 flex flex-col gap-2 rounded-[22px] p-2 xl:flex-row xl:items-center"
        style={{ background: 'rgba(255,255,255,0.018)', border: '1px solid rgba(125,165,185,0.14)' }}
      >
        <div className="flex items-center gap-1 overflow-x-auto hide-scrollbar">
          {([
            ['all', 'Všechny statusy', Activity, stats.total],
            ['active', 'Aktivní', UserRoundCheck, stats.active],
            ['inactive', 'Neaktivní', UserRoundX, stats.inactive],
            ['special', 'Speciální', Radio, stats.special],
          ] as const).map(([id, label, Icon, count]) => {
            const active = filter === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setFilter(id)}
                className="flex h-9 items-center gap-2 whitespace-nowrap rounded-xl px-3 text-xs font-semibold transition-colors"
                style={active
                  ? { background: 'rgba(54,217,236,0.12)', color: COLORS.cyan, border: '1px solid rgba(54,217,236,0.22)' }
                  : { color: 'rgba(255,255,255,0.42)', border: '1px solid transparent' }}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
                <span className="text-[9px] tabular-nums opacity-60">{count}</span>
              </button>
            );
          })}
        </div>

        <div className="hidden h-7 w-px bg-white/[0.07] xl:block" />

        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/28" />
          <input
            type="search"
            aria-label="Hledat ve statusech"
            placeholder="Hledat název, popis nebo typ statusu…"
            value={searchQuery}
            onChange={event => setSearchQuery(event.target.value)}
            className="h-9 w-full rounded-xl border border-white/[0.07] bg-black/10 pl-9 pr-3 text-xs text-white outline-none transition-colors placeholder:text-white/25 focus:border-cyan-300/30"
          />
        </div>
      </section>

      {error && (
        <div className="mb-4 flex items-center gap-3 rounded-2xl border border-red-300/20 bg-red-300/[0.06] p-3 text-red-200">
          <X className="h-4 w-4 shrink-0" />
          <p className="text-xs font-medium">{error}</p>
          <button type="button" onClick={() => setError(null)} className="ml-auto text-red-200/60 hover:text-red-100">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center gap-3 py-20">
          <Loader2 className="h-7 w-7 animate-spin text-cyan-300/70" />
          <p className="text-xs text-white/35">Načítám workflow statusy…</p>
        </div>
      ) : filteredStatuses.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center rounded-[22px] py-16 text-center"
          style={{ background: 'rgba(255,255,255,0.018)', border: '1px solid rgba(125,165,185,0.12)' }}
        >
          <Activity className="mb-3 h-9 w-9 text-white/16" />
          <p className="text-sm font-semibold text-white/45">
            {statuses.length === 0 ? 'Zatím nejsou dostupné žádné workflow statusy' : 'Filtru neodpovídá žádný status'}
          </p>
          <p className="mt-1 text-xs text-white/25">Upravte filtr nebo hledaný výraz.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          {filteredStatuses.map(status => (
            <StatusCard
              key={status.id}
              status={status}
              saving={saving}
              onEdit={() => handleEdit(status)}
              onToggleActive={() => void handleToggleActive(status)}
              onToggleStatistics={() => void handleToggleStatistics(status)}
            />
          ))}
        </div>
      )}

      <RadixDialog.Root open={!!editingData} onOpenChange={open => { if (!open) handleCancel(); }}>
        <RadixDialog.Portal>
          <RadixDialog.Overlay className="fixed inset-0 z-[200] bg-[#02060a]/88 backdrop-blur-md" />
          <RadixDialog.Content
            className="fixed left-1/2 top-1/2 z-[201] max-h-[92vh] w-[calc(100vw-1.5rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[26px] p-4 font-sans outline-none sm:p-6"
            style={{
              background: 'linear-gradient(145deg, rgba(8,20,30,0.985), rgba(5,12,20,0.985))',
              border: '1px solid rgba(125,165,185,0.22)',
              boxShadow: '0 30px 90px rgba(0,0,0,0.62), inset 0 1px 0 rgba(255,255,255,0.04)',
            }}
          >
            {editingData && (
              <>
                <div className="mb-5 flex items-start justify-between gap-4 border-b border-white/[0.07] pb-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                      style={{
                        color: editingData.accent_color,
                        background: `${editingData.accent_color}14`,
                        border: `1px solid ${editingData.accent_color}25`,
                      }}
                    >
                      <Edit3 className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[9px] font-bold uppercase tracking-[0.22em]" style={{ color: editingData.accent_color }}>
                        {editingStatus?.is_special ? 'Speciální status' : 'Workflow status'}
                      </p>
                      <RadixDialog.Title className="mt-1 truncate text-lg font-bold text-white">
                        {editingData.name}
                      </RadixDialog.Title>
                      <RadixDialog.Description className="sr-only">
                        Upravit název, barvu, dobu trvání a nastavení statusu.
                      </RadixDialog.Description>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleCancel}
                    aria-label="Zavřít"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-white/40 transition-colors hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-white/38">Název</span>
                    <input
                      type="text"
                      value={editingData.name}
                      onChange={event => setEditingData({ ...editingData, name: event.target.value })}
                      className={`${fieldClass} mt-1.5`}
                    />
                  </label>

                  <label className="block">
                    <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-white/38">Barva</span>
                    <div className="mt-1.5 flex gap-2">
                      <input
                        type="color"
                        value={editingData.accent_color}
                        onChange={event => setEditingData({ ...editingData, accent_color: event.target.value })}
                        aria-label="Barva statusu"
                        className="h-11 w-12 shrink-0 cursor-pointer rounded-xl border border-white/[0.09] bg-white/[0.025] p-1"
                      />
                      <input
                        type="text"
                        value={editingData.accent_color}
                        onChange={event => setEditingData({ ...editingData, accent_color: event.target.value })}
                        className={`${fieldClass} font-mono`}
                      />
                    </div>
                  </label>
                </div>

                {!editingStatus?.is_special && (
                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-white/38">Výchozí trvání (min)</span>
                      <input
                        type="number"
                        min="0"
                        value={editingData.default_duration_minutes}
                        onChange={event => setEditingData({
                          ...editingData,
                          default_duration_minutes: parseInt(event.target.value, 10) || 0,
                        })}
                        className={`${fieldClass} mt-1.5`}
                      />
                    </label>
                    <label className="block">
                      <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-white/38">Popis</span>
                      <input
                        type="text"
                        value={editingData.description}
                        onChange={event => setEditingData({ ...editingData, description: event.target.value })}
                        placeholder="Volitelný popis…"
                        className={`${fieldClass} mt-1.5`}
                      />
                    </label>
                  </div>
                )}

                <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setEditingData({ ...editingData, is_active: !editingData.is_active })}
                    className="flex items-center justify-between rounded-2xl border border-white/[0.08] bg-white/[0.025] px-3.5 py-3 text-left"
                  >
                    <span>
                      <span className="block text-xs font-semibold text-white/72">Aktivní status</span>
                      <span className="mt-0.5 block text-[9px] text-white/30">Dostupný v operačním workflow</span>
                    </span>
                    {editingData.is_active
                      ? <ToggleRight className="h-5 w-5 text-emerald-300" />
                      : <ToggleLeft className="h-5 w-5 text-white/28" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingData({
                      ...editingData,
                      include_in_statistics: !editingData.include_in_statistics,
                    })}
                    className="flex items-center justify-between rounded-2xl border border-white/[0.08] bg-white/[0.025] px-3.5 py-3 text-left"
                  >
                    <span>
                      <span className="block text-xs font-semibold text-white/72">Započítat do statistik</span>
                      <span className="mt-0.5 block text-[9px] text-white/30">Zahrnout do analytických přehledů</span>
                    </span>
                    {editingData.include_in_statistics
                      ? <CheckCircle2 className="h-5 w-5 text-amber-300" />
                      : <BarChart3 className="h-5 w-5 text-white/28" />}
                  </button>
                </div>

                <div className="mt-5 flex gap-2 border-t border-white/[0.07] pt-4">
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving || !editingData.name.trim()}
                    className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-amber-300 px-4 text-xs font-bold text-[#071019] transition-colors hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Uložit status
                  </button>
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="flex h-11 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.025] px-4 text-xs font-semibold text-white/50"
                  >
                    Zrušit
                  </button>
                </div>
              </>
            )}
          </RadixDialog.Content>
        </RadixDialog.Portal>
      </RadixDialog.Root>
    </div>
  );
};

export default StatusesManager;
