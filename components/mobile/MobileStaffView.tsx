'use client';

import React, { useMemo } from 'react';
import {
  Activity,
  Heart,
  MapPin,
  Percent,
  Search,
  Stethoscope,
  UserPlus,
  Users,
  Star,
  Pencil,
  Trash2,
  Plus,
} from 'lucide-react';
import {
  MobileHeader,
  MobileCard,
  MobilePillTabs,
  MobileSectionLabel,
  MobileSearchInput,
  MobileSheet,
} from './MobileShell';

/* =============================================================================
   MobileStaffView
   Mobilní redesign modulu Personál. Sdílí state se StaffManager skrz props.
   - karta = role icon + jméno + jeden hlavní "status chip"
   - tap otevírá bottom sheet s kompletním detailem (read-only + akce)
   - Upravit v sheetu deleguje na parent (otevře stávající DetailEditModal)
   ========================================================================== */

type SkillLevel = 'L3' | 'L2' | 'L1' | 'A' | 'SR' | 'N' | 'S';

interface StaffMember {
  id: string;
  name: string;
  role: 'DOCTOR' | 'NURSE';
  skill_level?: SkillLevel;
  availability?: number;
  is_external?: boolean;
  is_recommended?: boolean;
  is_active: boolean;
  sick_leave_days?: number;
  vacation_days?: number;
  notes?: string;
}

type StaffCategory = 'doctors' | 'nurses';

const SKILL_LEVELS: Record<SkillLevel, { label: string; color: string }> = {
  L3: { label: 'L3', color: '#34d399' },
  L2: { label: 'L2', color: '#22d3ee' },
  L1: { label: 'L1', color: '#facc15' },
  A: { label: 'Abs.', color: '#fb923c' },
  SR: { label: 'SR', color: '#c084fc' },
  N: { label: 'Nov.', color: '#f87171' },
  S: { label: 'Stáž', color: '#94a3b8' },
};

/** Vybere jeden hlavní "status chip" pro kartu. */
function pickPrimaryChip(m: StaffMember): { label: string; color: string } {
  if (!m.is_active) return { label: 'Neaktivní', color: '#ef4444' };
  if (m.sick_leave_days && m.sick_leave_days > 0)
    return { label: `PN ${m.sick_leave_days} d.`, color: '#f87171' };
  if (m.vacation_days && m.vacation_days > 0)
    return { label: `Dovolená ${m.vacation_days} d.`, color: '#60a5fa' };
  if (m.availability !== undefined && m.availability < 100)
    return {
      label: `${m.availability}%`,
      color: m.availability >= 50 ? '#facc15' : '#f87171',
    };
  if (m.is_external) return { label: 'Externí', color: '#fb923c' };
  if (m.is_recommended) return { label: 'Doporučený', color: '#facc15' };
  if (m.skill_level) {
    const meta = SKILL_LEVELS[m.skill_level];
    return { label: meta.label, color: meta.color };
  }
  return { label: 'Aktivní', color: '#34d399' };
}

interface Props {
  staffAll: StaffMember[];
  filteredStaff: StaffMember[];
  activeCategory: StaffCategory;
  onCategoryChange: (c: StaffCategory) => void;
  searchQuery: string;
  onSearchChange: (v: string) => void;
  loading: boolean;
  onEditStaff: (id: string) => void;
  onDeleteStaff: (id: string) => void;
  onAddNew: () => void;
}

const MobileStaffView: React.FC<Props> = ({
  staffAll,
  filteredStaff,
  activeCategory,
  onCategoryChange,
  searchQuery,
  onSearchChange,
  loading,
  onEditStaff,
  onDeleteStaff,
  onAddNew,
}) => {
  const [sheetStaffId, setSheetStaffId] = React.useState<string | null>(null);
  const sheetStaff = useMemo(
    () => (sheetStaffId ? filteredStaff.find(s => s.id === sheetStaffId) : null),
    [sheetStaffId, filteredStaff],
  );

  const counts = useMemo(
    () => ({
      doctors: staffAll.filter(s => s.role === 'DOCTOR').length,
      nurses: staffAll.filter(s => s.role === 'NURSE').length,
    }),
    [staffAll],
  );

  return (
    <div className="md:hidden w-full">
      <div className="flex flex-col gap-5">
        {/* Header */}
        <MobileHeader
          kicker="Personál"
          title="Tým a dostupnost"
          right={
            <button
              onClick={onAddNew}
              aria-label="Přidat personál"
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform active:scale-95"
              style={{
                background: 'linear-gradient(135deg, rgba(0,216,193,0.25), rgba(0,216,193,0.1))',
                border: '1px solid rgba(0,216,193,0.35)',
                color: '#00D8C1',
              }}
            >
              <Plus className="w-4.5 h-4.5" strokeWidth={2.25} />
            </button>
          }
        />

        {/* KPI */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Lékaři', value: counts.doctors, color: '#C084FC', icon: Stethoscope },
            { label: 'Sestry', value: counts.nurses, color: '#34d399', icon: Heart },
            { label: 'Celkem', value: staffAll.length, color: '#00D8C1', icon: Users },
          ].map(k => {
            const Icon = k.icon;
            return (
              <div
                key={k.label}
                className="rounded-2xl p-3 flex flex-col"
                style={{
                  background: `linear-gradient(135deg, ${k.color}14 0%, rgba(255,255,255,0.02) 100%)`,
                  border: `1px solid ${k.color}2b`,
                  backdropFilter: 'blur(12px)',
                }}
              >
                <Icon className="w-3.5 h-3.5" style={{ color: k.color }} strokeWidth={2.25} />
                <p className="text-[9px] uppercase tracking-[0.2em] text-white/50 mt-1.5 leading-none">
                  {k.label}
                </p>
                <p className="text-xl font-semibold text-white mt-1 tabular-nums">{k.value}</p>
              </div>
            );
          })}
        </div>

        {/* Search */}
        <MobileSearchInput
          value={searchQuery}
          onChange={onSearchChange}
          placeholder="Hledat jméno…"
          icon={<Search className="w-4 h-4" strokeWidth={2.25} />}
        />

        {/* Category toggle */}
        <MobilePillTabs<StaffCategory>
          tabs={[
            { id: 'doctors', label: `Lékaři · ${counts.doctors}` },
            { id: 'nurses', label: `Sestry · ${counts.nurses}` },
          ]}
          value={activeCategory}
          onChange={onCategoryChange}
        />

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 rounded-full border-2 border-white/10 border-t-white/50 animate-spin" />
          </div>
        ) : filteredStaff.length === 0 ? (
          <MobileCard>
            <div className="flex flex-col items-center justify-center gap-3 py-6">
              <Users className="w-10 h-10 text-white/20" />
              <p className="text-sm text-white/50 text-center">
                {searchQuery
                  ? `Nenalezeno pro "${searchQuery}"`
                  : 'V této kategorii zatím nikdo není.'}
              </p>
            </div>
          </MobileCard>
        ) : (
          <>
            <MobileSectionLabel>
              {activeCategory === 'doctors' ? 'Lékaři' : 'Sestry'} ({filteredStaff.length})
            </MobileSectionLabel>
            <div className="flex flex-col gap-2.5">
              {filteredStaff.map(m => {
                const chip = pickPrimaryChip(m);
                const roleColor = m.role === 'DOCTOR' ? '#C084FC' : '#34d399';
                return (
                  <MobileCard
                    key={m.id}
                    onClick={() => setSheetStaffId(m.id)}
                    className={!m.is_active ? 'opacity-60' : ''}
                  >
                    <div className="flex items-center gap-3">
                      {/* Role avatar */}
                      <div
                        className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
                        style={{
                          background: `linear-gradient(135deg, ${roleColor}22, ${roleColor}0d)`,
                          border: `1px solid ${roleColor}44`,
                        }}
                      >
                        {m.role === 'DOCTOR' ? (
                          <Stethoscope className="w-5 h-5" style={{ color: roleColor }} strokeWidth={2} />
                        ) : (
                          <Heart className="w-5 h-5" style={{ color: roleColor }} strokeWidth={2} />
                        )}
                      </div>

                      {/* Name + role */}
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/45 leading-none">
                          {m.role === 'DOCTOR' ? 'Lékař' : 'Sestra'}
                        </p>
                        <h3 className="text-base font-semibold text-white mt-1 leading-tight truncate">
                          {m.name}
                        </h3>
                      </div>

                      {/* Primary chip */}
                      <span
                        className="shrink-0 text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full"
                        style={{
                          background: `${chip.color}1f`,
                          color: chip.color,
                          border: `1px solid ${chip.color}3a`,
                        }}
                      >
                        {chip.label}
                      </span>
                    </div>
                  </MobileCard>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Detail sheet */}
      <MobileSheet
        open={!!sheetStaff}
        onClose={() => setSheetStaffId(null)}
        subtitle={sheetStaff?.role === 'DOCTOR' ? 'Lékař' : 'Sestra'}
        title={sheetStaff?.name}
      >
        {sheetStaff && (
          <div className="flex flex-col gap-5">
            {/* Attribute list */}
            <div className="grid grid-cols-2 gap-2.5">
              <AttrBox
                label="Úroveň"
                value={
                  sheetStaff.skill_level
                    ? SKILL_LEVELS[sheetStaff.skill_level].label
                    : '—'
                }
                color={
                  sheetStaff.skill_level
                    ? SKILL_LEVELS[sheetStaff.skill_level].color
                    : undefined
                }
                icon={<Star className="w-3.5 h-3.5" strokeWidth={2.25} />}
              />
              <AttrBox
                label="Dostupnost"
                value={`${sheetStaff.availability ?? 100}%`}
                color={
                  (sheetStaff.availability ?? 100) === 100
                    ? '#34d399'
                    : (sheetStaff.availability ?? 100) >= 50
                      ? '#facc15'
                      : '#f87171'
                }
                icon={<Percent className="w-3.5 h-3.5" strokeWidth={2.25} />}
              />
              <AttrBox
                label="PN"
                value={
                  sheetStaff.sick_leave_days && sheetStaff.sick_leave_days > 0
                    ? `${sheetStaff.sick_leave_days} dní`
                    : '—'
                }
                color={
                  sheetStaff.sick_leave_days && sheetStaff.sick_leave_days > 0
                    ? '#f87171'
                    : undefined
                }
                icon={<Activity className="w-3.5 h-3.5" strokeWidth={2.25} />}
              />
              <AttrBox
                label="Dovolená"
                value={
                  sheetStaff.vacation_days && sheetStaff.vacation_days > 0
                    ? `${sheetStaff.vacation_days} dní`
                    : '—'
                }
                color={
                  sheetStaff.vacation_days && sheetStaff.vacation_days > 0
                    ? '#60a5fa'
                    : undefined
                }
                icon={<UserPlus className="w-3.5 h-3.5" strokeWidth={2.25} />}
              />
            </div>

            {/* Flags row */}
            <div className="flex flex-wrap gap-2">
              <FlagPill
                active={sheetStaff.is_external}
                label="Externí"
                color="#fb923c"
                icon={<MapPin className="w-3 h-3" strokeWidth={2.5} />}
              />
              <FlagPill
                active={sheetStaff.is_recommended}
                label="Doporučený"
                color="#facc15"
                icon={<Star className="w-3 h-3" strokeWidth={2.5} />}
              />
              <FlagPill
                active={sheetStaff.is_active}
                label={sheetStaff.is_active ? 'Aktivní' : 'Neaktivní'}
                color={sheetStaff.is_active ? '#34d399' : '#f87171'}
              />
            </div>

            {/* Notes */}
            {sheetStaff.notes && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40 mb-1.5">
                  Poznámky
                </p>
                <p className="text-sm text-white/80 leading-relaxed">
                  {sheetStaff.notes}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  const id = sheetStaff.id;
                  setSheetStaffId(null);
                  onEditStaff(id);
                }}
                className="flex-1 flex items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-semibold"
                style={{
                  background: 'linear-gradient(135deg, rgba(0,216,193,0.22), rgba(0,216,193,0.08))',
                  border: '1px solid rgba(0,216,193,0.35)',
                  color: '#00D8C1',
                }}
              >
                <Pencil className="w-4 h-4" strokeWidth={2.25} />
                Upravit
              </button>
              <button
                onClick={() => {
                  const id = sheetStaff.id;
                  setSheetStaffId(null);
                  onDeleteStaff(id);
                }}
                aria-label="Smazat"
                className="w-12 rounded-2xl flex items-center justify-center"
                style={{
                  background: 'rgba(248,113,113,0.1)',
                  border: '1px solid rgba(248,113,113,0.3)',
                  color: '#f87171',
                }}
              >
                <Trash2 className="w-4 h-4" strokeWidth={2.25} />
              </button>
            </div>
          </div>
        )}
      </MobileSheet>
    </div>
  );
};

const AttrBox: React.FC<{
  label: string;
  value: string;
  color?: string;
  icon: React.ReactNode;
}> = ({ label, value, color, icon }) => (
  <div
    className="rounded-2xl p-3.5"
    style={{
      background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)',
      border: '1px solid rgba(255,255,255,0.08)',
    }}
  >
    <div className="flex items-center gap-1.5 text-white/40">
      {icon}
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] leading-none">
        {label}
      </p>
    </div>
    <p
      className="text-base font-semibold mt-2 leading-none tabular-nums"
      style={{ color: color || '#ffffff' }}
    >
      {value}
    </p>
  </div>
);

const FlagPill: React.FC<{
  active?: boolean;
  label: string;
  color: string;
  icon?: React.ReactNode;
}> = ({ active, label, color, icon }) => (
  <span
    className="text-[11px] font-semibold px-3 py-1.5 rounded-full inline-flex items-center gap-1.5"
    style={{
      background: active ? `${color}1f` : 'rgba(255,255,255,0.04)',
      border: `1px solid ${active ? `${color}44` : 'rgba(255,255,255,0.08)'}`,
      color: active ? color : 'rgba(255,255,255,0.4)',
    }}
  >
    {icon}
    {label}
  </span>
);

export default MobileStaffView;
