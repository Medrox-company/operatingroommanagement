'use client';

import React, { useMemo, useState } from 'react';
import ModulePageHeading from './ModulePageHeading';
import * as RadixDialog from '@radix-ui/react-dialog';
import {
  Activity,
  BarChart3,
  CheckCircle2,
  Edit3,
  Loader2,
  Radio,
  Save,
  Search,
  LayoutGrid,
  List,
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

/** Karta statusu ve stejném jazyce jako karty modulů v Nastavení. */
const StatusCard: React.FC<{
  status: WorkflowStatus;
  saving: boolean;
  compact?: boolean;
  onEdit: () => void;
  onToggleActive: () => void;
  onToggleStatistics: () => void;
}> = ({ status, saving, compact = false, onEdit, onToggleActive, onToggleStatistics }) => {
  const accent = status.accent_color || COLORS.cyan;
  const order = status.is_special ? 'S' : String((status.sort_order ?? 0) + 1).padStart(2, '0');

  return (
    <article
      className={`relative flex h-full flex-col overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.025] py-3.5 pl-5 pr-4 transition-colors ${status.is_active ? 'hover:bg-white/[0.04]' : 'opacity-55 hover:opacity-80'}`}
      style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.025)' }}
    >
      <span className="absolute inset-y-0 left-0 w-[3px]" style={{ backgroundColor: `${accent}88` }} />

      <div className="flex items-center gap-3.5">
        {/* Pevná velikost dlaždice — pořadí i „S“ zabírají stejné místo. */}
        <span
          className="flex h-11 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border px-1 text-[12px] font-black leading-none tracking-[0.02em]"
          style={{ borderColor: `${accent}58`, backgroundColor: `${accent}1f`, color: accent }}
        >
          <span className="truncate">{order}</span>
        </span>

        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[15px] font-bold leading-tight text-white/90">{status.name}</h3>
          <p className="mt-1 flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-white/30">
            <span
              className="inline-block h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: status.is_active ? COLORS.green : 'rgba(255,255,255,0.22)' }}
            />
            {status.is_active ? 'Aktivní' : 'Neaktivní'}
            <span className="text-white/16">·</span>
            {status.is_special ? 'Speciální' : 'Workflow'}
            <span className="text-white/16">·</span>
            {status.is_special
              ? <span className="text-white/44">tlačítkem</span>
              : <><span className="tabular-nums text-white/44">{status.default_duration_minutes || 0}</span> min</>}
          </p>
        </div>

        <div className="flex shrink-0 gap-1.5">
          <button
            type="button"
            onClick={onToggleStatistics}
            disabled={saving}
            aria-label={status.include_in_statistics ? `Vyřadit ${status.name} ze statistik` : `Zahrnout ${status.name} do statistik`}
            title={status.include_in_statistics ? 'Ve statistikách — kliknutím vyřadit' : 'Mimo statistiky — kliknutím zahrnout'}
            className={`grid h-8 w-8 place-items-center rounded-lg border transition-colors disabled:cursor-default ${status.include_in_statistics ? 'border-amber-200/[0.16] text-amber-200/70 hover:bg-amber-300/[0.08] hover:text-amber-100' : 'border-white/[0.065] text-white/28 hover:bg-white/[0.06] hover:text-white/70'}`}
          >
            <BarChart3 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onToggleActive}
            disabled={saving}
            aria-label={status.is_active ? `Deaktivovat ${status.name}` : `Aktivovat ${status.name}`}
            title={status.is_active ? 'Deaktivovat status' : 'Aktivovat status'}
            className={`grid h-8 w-8 place-items-center rounded-lg border transition-colors disabled:cursor-default ${status.is_active ? 'border-emerald-200/[0.14] text-emerald-200/70 hover:bg-emerald-300/[0.08] hover:text-emerald-200' : 'border-white/[0.065] text-white/34 hover:bg-white/[0.06] hover:text-white/75'}`}
          >
            {status.is_active ? <UserRoundCheck className="h-3.5 w-3.5" /> : <UserRoundX className="h-3.5 w-3.5" />}
          </button>
          <button
            type="button"
            onClick={onEdit}
            aria-label={`Upravit ${status.name}`}
            title="Upravit status"
            className="grid h-8 w-8 place-items-center rounded-lg border border-white/[0.065] text-white/42 transition-colors hover:bg-white/[0.06] hover:text-white/80"
          >
            <Edit3 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {!compact && (
        <p className="mt-auto min-h-[30px] pt-3 text-[11.5px] leading-[15px] text-white/42 line-clamp-2">
          {status.description || (status.is_special ? specialTypeLabel(status) : 'Bez doplňujícího popisu')}
        </p>
      )}
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
  const [statusView, setStatusView] = useState<'cards' | 'list'>('cards');

  /** Přepínač zobrazení — stejná velikost ikon jako v levém postranním menu. */
  const statusViewToggle = (
    <div className="flex items-center gap-1">
      {([
        ['cards', 'Karty', LayoutGrid],
        ['list', 'Seznam', List],
      ] as const).map(([value, label, Icon]) => (
        <button
          key={value}
          type="button"
          onClick={() => setStatusView(value)}
          aria-pressed={statusView === value}
          title={`Zobrazit jako ${label.toLocaleLowerCase('cs')}`}
          aria-label={`Zobrazit jako ${label.toLocaleLowerCase('cs')}`}
          className={`grid h-[clamp(2.5rem,7vh,4rem)] w-[clamp(2.5rem,7vh,4rem)] place-items-center rounded-[clamp(0.75rem,1.8vh,1rem)] transition-colors duration-200 ${statusView === value ? 'bg-white/[0.15] text-white' : 'text-white/40 hover:bg-white/5 hover:text-white'}`}
        >
          <Icon
            className="h-[clamp(1.1rem,2.7vh,1.5rem)] w-[clamp(1.1rem,2.7vh,1.5rem)] transition-colors duration-200"
            strokeWidth={statusView === value ? 2.5 : 2}
          />
        </button>
      ))}
    </div>
  );

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
    <div className="statistics-module min-h-full w-full pb-10 font-sans">
      <header className="mb-7">
        <ModulePageHeading
          icon={Activity}
          kicker="WORKFLOW CONTROL"
          title="SPRÁVA"
          mutedTitle="STATUSŮ"
          actions={statusViewToggle}
        />
      </header>

      {/* Stejná lišta jako v Rozpisu sálů a Operačních oborech. */}
      <section className="hide-scrollbar mb-4 overflow-x-auto rounded-xl border border-white/[0.06] bg-white/[0.025] p-3">
        <div className="flex min-w-max items-center gap-2.5">
          {([
            { label: 'Celkem statusů', value: stats.total, suffix: 'statusů', icon: Activity, color: COLORS.cyan },
            { label: 'Aktivní', value: stats.active, suffix: 'statusů', icon: UserRoundCheck, color: COLORS.green },
            { label: 'Neaktivní', value: stats.inactive, suffix: 'statusů', icon: UserRoundX, color: stats.inactive ? COLORS.amber : COLORS.green },
            { label: 'Ve statistikách', value: stats.statistics, suffix: 'statusů', icon: BarChart3, color: COLORS.blue },
            { label: 'Speciální', value: stats.special, suffix: 'tlačítek', icon: Radio, color: COLORS.violet },
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
            <h2 className="text-[11px] font-semibold leading-tight text-white/92">Workflow statusů</h2>
            <p className="mt-1 text-[8px] leading-tight text-white/38">Fáze operací</p>
          </div>

          <div className="grid shrink-0 grid-cols-4 rounded-lg border border-white/[0.055] bg-white/[0.025] p-0.5">
            {([
              ['all', 'Všechny'],
              ['active', 'Aktivní'],
              ['inactive', 'Neaktivní'],
              ['special', 'Speciální'],
            ] as const).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setFilter(id)}
                aria-pressed={filter === id}
                className={`h-8 rounded-md px-3 text-[8px] font-semibold uppercase tracking-[0.08em] ${filter === id ? 'bg-white/[0.09] text-cyan-200' : 'text-white/38 hover:text-white/70'}`}
              >
                {label}
              </button>
            ))}
          </div>

          <label className="flex h-10 w-[190px] shrink-0 items-center gap-2 rounded-lg border border-white/[0.055] bg-black/10 px-3">
            <Search className="h-4 w-4 shrink-0 text-white/30" />
            <input
              type="search"
              value={searchQuery}
              onChange={event => setSearchQuery(event.target.value)}
              placeholder="Hledat status"
              aria-label="Hledat ve statusech"
              className="min-w-0 flex-1 bg-transparent text-[11px] font-semibold text-white/88 outline-none placeholder:font-normal placeholder:text-white/28"
            />
          </label>
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
        <section className="flex min-h-[320px] flex-col items-center justify-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.025]">
          <Loader2 className="h-7 w-7 animate-spin text-cyan-300/70" />
          <p className="text-xs text-white/35">Načítám workflow statusy…</p>
        </section>
      ) : filteredStatuses.length === 0 ? (
        <section className="flex min-h-[320px] flex-col items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.025] px-6 text-center">
          <Activity className="mb-3 h-9 w-9 text-white/16" />
          <p className="text-sm font-semibold text-white/45">
            {statuses.length === 0 ? 'Zatím nejsou dostupné žádné workflow statusy' : 'Filtru neodpovídá žádný status'}
          </p>
          <p className="mt-1 text-xs text-white/25">Upravte filtr nebo hledaný výraz.</p>
        </section>
      ) : (
        <section className={`grid gap-2.5 ${statusView === 'cards' ? 'xl:grid-cols-2' : ''}`}>
          {filteredStatuses.map(status => (
            <StatusCard
              key={status.id}
              status={status}
              saving={saving}
              compact={statusView === 'list'}
              onEdit={() => handleEdit(status)}
              onToggleActive={() => void handleToggleActive(status)}
              onToggleStatistics={() => void handleToggleStatistics(status)}
            />
          ))}
        </section>
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
