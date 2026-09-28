'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Settings as SettingsIcon, Shield, ShieldCheck, Layers, Crown, AlertTriangle, Check, X, Loader2, Lock, UserCog, Info, LayoutGrid, Activity, Stethoscope, Briefcase, ClipboardList, SlidersHorizontal, Smartphone, ChevronDown } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { UserRole, AppModule, AppSubmodule } from '../../contexts/AuthContext';
import { COLORS, SURFACE, CARD, TILE, TILE_ACTIVE, TIER_COLOR } from './settings-theme';
import { DevicesSettingsPanel } from './DevicesSettingsPanel';
import { SETTINGS_TAB_SUBMODULE } from './settings-tabs';

// ============================================================================
// Panel: Modules (per-role access matrix)
// ============================================================================

export interface ModulesPanelProps {
  isAdmin: boolean;
  /** Přepínat přístup rolí k modulům smí výhradně superadministrátor. */
  canManageRoles: boolean;
  modules: AppModule[];
  submodules: AppSubmodule[];
  onToggleModule: (moduleId: string, enabled: boolean) => Promise<boolean>;
  onToggleRole: (moduleId: string, role: UserRole, enabled: boolean) => Promise<boolean>;
  onToggleSubmodule: (submoduleId: string, enabled: boolean) => Promise<boolean>;
  onToggleSubmoduleRole: (submoduleId: string, role: UserRole, enabled: boolean) => Promise<boolean>;
}

/**
 * Role, kterým se přístup k modulům nastavuje. Superadministrátor ani
 * administrátor tu nejsou — mají přístup ke všemu z principu a nedá se jim
 * odebrat, jinak by si mohli zamknout cestu zpět do nastavení.
 */
export type RoleDef = { id: UserRole; label: string; icon: LucideIcon; color: string };

/** Administrátorská úroveň — stojí zvlášť nad provozními rolemi. */
export const ADMIN_ROLE: RoleDef = { id: 'admin', label: 'Administrátor', icon: ShieldCheck, color: '#D99C35' };

/** Provozní role — vykreslují se ve dvojicích pod administrátorem. */
export const OPERATIONAL_ROLES: RoleDef[] = [
  { id: 'aro',        label: 'ARO',        icon: Activity,      color: '#EF4444' },
  { id: 'cos',        label: 'COS',        icon: Stethoscope,   color: '#06B6D4' },
  { id: 'management', label: 'Management', icon: Briefcase,     color: '#F59E0B' },
  { id: 'primar',     label: 'Primariát',  icon: ClipboardList, color: '#A855F7' },
];

/** Všechny nastavitelné role dohromady (pro počítadla). */
export const ROLE_DEFS: RoleDef[] = [ADMIN_ROLE, ...OPERATIONAL_ROLES];

/**
 * Úrovně přístupu vysvětlené v záhlaví panelu. Slouží k tomu, aby bylo na první
 * pohled zřejmé, že superadministrátor stojí nad administrátorem a že provozní
 * role se nastavují níže v matici.
 */
export const MODULE_ICON_MAP: Record<string, LucideIcon> = {
  LayoutGrid,
  Calendar: SlidersHorizontal, // fallback
  BarChart3: SlidersHorizontal,
  Users: UserCog,
  Bell: AlertTriangle,
  Settings: SettingsIcon,
  Shield,
};

export const ModulesPanel: React.FC<ModulesPanelProps> = ({ isAdmin, canManageRoles, modules, submodules, onToggleModule, onToggleRole, onToggleSubmodule, onToggleSubmoduleRole }) => {
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [expandedModule, setExpandedModule] = useState<string | null>(null);

  if (!isAdmin) {
    return (
      <div className="flex items-center gap-2 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-sm">
        <Lock className="w-5 h-5" />
        <span>Správa modulů je dostupná pouze pro administrátora.</span>
      </div>
    );
  }

  const sortedModules = [...modules].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

  const handleGlobalToggle = async (moduleId: string, currentEnabled: boolean) => {
    if (!canManageRoles) return;
    const key = `g:${moduleId}`;
    setPendingKey(key);
    await onToggleModule(moduleId, !currentEnabled);
    setPendingKey(null);
  };

  const handleSubmoduleToggle = async (submoduleId: string, currentEnabled: boolean) => {
    if (!canManageRoles || submoduleId === SETTINGS_TAB_SUBMODULE.modules) return;
    const key = `sub-enabled:${submoduleId}`;
    setPendingKey(key);
    await onToggleSubmodule(submoduleId, !currentEnabled);
    setPendingKey(null);
  };

  const handleRoleToggle = async (moduleId: string, role: UserRole, currentEnabled: boolean) => {
    if (!canManageRoles) return; // měnit smí jen superadministrátor
    const key = `${moduleId}:${role}`;
    setPendingKey(key);
    await onToggleRole(moduleId, role, !currentEnabled);
    setPendingKey(null);
  };

  /** Jedna přepínatelná dlaždice role u modulu. */
  const renderRoleTile = (mod: AppModule, role: RoleDef) => {
    const RoleIcon = role.icon;
    const allowed = !!mod.allowed_roles?.includes(role.id);
    const pending = pendingKey === `${mod.id}:${role.id}`;
    const disabled = !mod.is_enabled || !canManageRoles;

    return (
      <button
        key={role.id}
        type="button"
        onClick={() => handleRoleToggle(mod.id, role.id, allowed)}
        disabled={disabled || pending}
        aria-pressed={allowed}
        title={
          disabled
            ? (!canManageRoles ? 'Měnit smí pouze superadministrátor' : 'Modul je vypnutý')
            : allowed ? `Odebrat přístup roli ${role.label}` : `Povolit přístup roli ${role.label}`
        }
        className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-[11px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-45"
        style={allowed ? { ...TILE_ACTIVE, color: '#FFFFFF' } : { ...TILE, color: 'rgba(255,255,255,0.42)' }}
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/[0.06]">
          <RoleIcon className="h-3.5 w-3.5" style={{ color: allowed ? role.color : 'rgba(255,255,255,0.22)' }} />
        </span>
        <span className="min-w-0 flex-1 truncate text-left">{role.label}</span>
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-white/[0.05]">
          {pending ? (
            <Loader2 className="h-3 w-3 animate-spin text-white/60" />
          ) : allowed ? (
            <Check className="h-3 w-3 text-emerald-400" />
          ) : (
            <X className="h-3 w-3 text-white/25" />
          )}
        </span>
      </button>
    );
  };

  const handleSubmoduleRoleToggle = async (submoduleId: string, role: UserRole, currentEnabled: boolean) => {
    if (!canManageRoles) return;
    const key = `sub:${submoduleId}:${role}`;
    setPendingKey(key);
    await onToggleSubmoduleRole(submoduleId, role, !currentEnabled);
    setPendingKey(null);
  };

  /** Dlaždice role u podmodulu — stejná logika, jen menší měřítko. */
  const renderSubmoduleRoleTile = (mod: AppModule, sub: AppSubmodule, role: RoleDef) => {
    const RoleIcon = role.icon;
    const allowed = !!sub.allowed_roles?.includes(role.id);
    const pending = pendingKey === `sub:${sub.id}:${role.id}`;

    return (
      <button
        key={role.id}
        type="button"
        onClick={() => handleSubmoduleRoleToggle(sub.id, role.id, allowed)}
        disabled={!canManageRoles || !mod.is_enabled || !sub.is_enabled || pending}
        aria-pressed={allowed}
        className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-[10px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-45"
        style={allowed ? { ...TILE_ACTIVE, color: '#FFFFFF' } : { ...TILE, color: 'rgba(255,255,255,0.38)' }}
      >
        <RoleIcon
          className="h-3.5 w-3.5 shrink-0"
          style={{ color: allowed ? role.color : 'rgba(255,255,255,0.2)' }}
        />
        <span className="flex-1 truncate text-left">{role.label}</span>
        {pending ? (
          <Loader2 className="h-3 w-3 shrink-0 animate-spin text-white/60" />
        ) : allowed ? (
          <Check className="h-3 w-3 shrink-0 text-emerald-400" />
        ) : (
          <X className="h-3 w-3 shrink-0 text-white/20" />
        )}
      </button>
    );
  };

  return (
    <div className="space-y-4">
      {/* ── Záhlaví: kdo jsem + hierarchie + čísla ─────────────────────────
          Materiál (rádius, nádech okraje, vnitřní světlo) odpovídá ostatním
          sekcím Nastavení, aby panel nevypadal jako cizí prvek. */}
      <section className="relative overflow-hidden rounded-xl p-5" style={SURFACE}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[8px] font-bold uppercase tracking-[0.22em] text-white/38">Oprávnění</p>
            <h2 className="mt-1.5 text-lg font-semibold tracking-tight text-white">Správa modulů a rolí</h2>
            <p className="mt-1 text-[12px] text-white/38">
              {canManageRoles
                ? 'Nastavte, které role uvidí jednotlivé moduly a podmoduly. Změny se ukládají okamžitě.'
                : 'Přehled oprávnění vašeho zařízení. Změny provádí superadministrátor.'}
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-xl px-4 py-2.5" style={TILE}>
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/[0.05]">
              {canManageRoles
                ? <Crown className="h-[18px] w-[18px]" style={{ color: TIER_COLOR.superadmin }} />
                : <ShieldCheck className="h-[18px] w-[18px]" style={{ color: TIER_COLOR.admin }} />}
            </span>
            <div className="leading-tight">
              <p className="text-[8px] font-bold uppercase tracking-[0.18em] text-white/38">Přihlášen jako</p>
              <p className="mt-0.5 text-[13px] font-semibold text-white">
                {canManageRoles ? 'Superadministrátor' : 'Administrátor'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Moduly ──────────────────────────────────────────────────────── */}
      <div className="grid gap-3.5 md:grid-cols-2 2xl:grid-cols-3">
        {sortedModules.map((mod) => {
          const accent = mod.accent_color || '#64748B';
          const isSettingsModule = mod.id === 'settings';
          const globalPending = pendingKey === `g:${mod.id}`;
          const moduleSubmodules = submodules
            .filter(sub => sub.module_id === mod.id)
            .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

          return (
            <article
              key={mod.id}
              className={`relative flex flex-col overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.025] py-3.5 pl-5 pr-4 font-sans transition-colors ${mod.is_enabled ? 'hover:bg-white/[0.04]' : 'opacity-55 hover:opacity-80'}`}
              style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.025)' }}
            >
              <span className="absolute inset-y-0 left-0 w-[3px]" style={{ backgroundColor: `${accent}88` }} />

              {/* Hlavička karty — dlaždice modulu, název, stav a přepínač. */}
              <div className="flex items-center gap-3.5">
                <span
                  className="flex h-11 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border px-1 text-[11px] font-black uppercase leading-none"
                  style={{ borderColor: `${accent}58`, backgroundColor: `${accent}1f`, color: accent }}
                >
                  <span className="truncate">{mod.name.slice(0, 3)}</span>
                </span>

                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-[15px] font-bold leading-tight text-white/90">{mod.name}</h3>
                  <p className="mt-1 flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-white/30">
                    <span
                      className="inline-block h-1.5 w-1.5 rounded-full"
                      style={{ background: mod.is_enabled ? COLORS.green : 'rgba(255,255,255,0.22)' }}
                    />
                    {mod.is_enabled ? 'Zapnuto' : 'Vypnuto'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleGlobalToggle(mod.id, mod.is_enabled)}
                  disabled={!canManageRoles || globalPending}
                  aria-label={`Globální přepínač modulu ${mod.name}`}
                  title={canManageRoles ? `${mod.is_enabled ? 'Vypnout' : 'Zapnout'} modul ${mod.name}` : 'Měnit smí pouze superadministrátor'}
                  className={`relative h-5 w-10 shrink-0 rounded-full transition-colors ${
                    mod.is_enabled ? 'bg-emerald-500' : 'bg-white/12'
                  } disabled:cursor-not-allowed disabled:opacity-45`}
                >
                  <motion.div
                    animate={{ x: mod.is_enabled ? 21 : 2 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    className="absolute top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-white shadow"
                  >
                    {globalPending && <Loader2 className="h-2.5 w-2.5 animate-spin text-emerald-500" />}
                  </motion.div>
                </button>
              </div>

              <p className="mt-3 min-h-[30px] text-[11.5px] leading-[15px] text-white/42 line-clamp-2">
                {mod.description || 'Bez doplňujícího popisu'}
              </p>

              <div className="mt-3 border-t border-white/[0.055] pt-2.5">
                <div className="flex min-w-0 flex-col gap-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-white/35">
                      Přístup rolí
                    </span>
                    <span className="rounded-md bg-white/[0.06] px-1.5 py-0.5 text-[9px] font-bold tabular-nums text-white/50">
                      {ROLE_DEFS.filter(r => mod.allowed_roles?.includes(r.id)).length}/{ROLE_DEFS.length}
                    </span>
                  </div>

                  {/* Superadmin — jediná role, které přístup odebrat nejde */}
                  <div
                    className="flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-[11px] font-semibold text-white/85"
                    style={TILE}
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/[0.06]">
                      <Crown className="h-3.5 w-3.5" style={{ color: TIER_COLOR.superadmin }} />
                    </span>
                    <span className="min-w-0 flex-1 truncate">Superadministrátor</span>
                    <Lock className="h-3.5 w-3.5 shrink-0 text-white/25" />
                  </div>

                  {renderRoleTile(mod, ADMIN_ROLE)}

                  <div className="grid grid-cols-2 gap-1.5">
                    {OPERATIONAL_ROLES.map(role => renderRoleTile(mod, role))}
                  </div>

                  {!canManageRoles && (
                    <span className="inline-flex items-center gap-1.5 text-[9px] font-semibold text-amber-300/60">
                      <Lock className="h-2.5 w-2.5" />
                      Přepínat smí pouze superadministrátor
                    </span>
                  )}
                </div>
              </div>

              {/* Poznámky a podmoduly přes celou šířku karty */}
              <div className="mt-3">
                {isSettingsModule && (
                  <p className="mt-3 flex items-center gap-1.5 rounded-lg border border-white/8 bg-white/[0.02] px-2.5 py-2 text-[11px] text-white/35">
                    <Info className="h-3 w-3 shrink-0" />
                    Odebráním administrátora ztratí přístup ke správě systému.
                  </p>
                )}
                {!mod.is_enabled && (
                  <p className="mt-3 flex items-center gap-1.5 rounded-lg border border-amber-500/20 bg-amber-500/[0.07] px-2.5 py-2 text-[11px] text-amber-300/80">
                    <AlertTriangle className="h-3 w-3 shrink-0" />
                    Modul je vypnutý — role nelze nastavovat.
                  </p>
                )}

                {/* ── Podmoduly ───────────────────────────────────────────
                    Části uvnitř modulu s vlastním oprávněním. Rozbalují se,
                    aby karta zůstala přehledná i u modulů bez podmodulů. */}
                {moduleSubmodules.length > 0 && (
                  <div className="mt-4 border-t border-[rgba(125,165,185,0.12)] pt-3">
                    <button
                      type="button"
                      onClick={() => setExpandedModule(expandedModule === `sub:${mod.id}` ? null : `sub:${mod.id}`)}
                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-[11px] font-semibold text-white/70 transition-colors hover:text-white" style={TILE}
                    >
                      <Layers className="h-4 w-4 shrink-0 text-white/40" />
                      <span className="flex-1 text-left">Podmoduly</span>
                      <span className="rounded-md bg-white/[0.06] px-1.5 py-0.5 text-[10px] tabular-nums text-white/55">
                        {moduleSubmodules.length}
                      </span>
                      <ChevronDown
                        className={`h-4 w-4 shrink-0 text-white/40 transition-transform ${
                          expandedModule === `sub:${mod.id}` ? 'rotate-180' : ''
                        }`}
                      />
                    </button>

                    {expandedModule === `sub:${mod.id}` && (
                      <div className="mt-2 space-y-2">
                        {moduleSubmodules.map(sub => {
                          const superadminOnly = sub.id === SETTINGS_TAB_SUBMODULE.hospital;
                          const controlPlane = sub.id === SETTINGS_TAB_SUBMODULE.modules;
                          const enabledPending = pendingKey === `sub-enabled:${sub.id}`;
                          return (
                            <div key={sub.id} className="rounded-lg p-2.5" style={TILE}>
                              <div className="mb-2 flex items-center gap-2">
                                <span
                                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                                  style={{ background: sub.is_enabled ? COLORS.green : 'rgba(255,255,255,0.22)' }}
                                />
                                <p className="min-w-0 flex-1 truncate text-[11px] font-bold text-white/80">{sub.name}</p>
                                <button
                                  type="button"
                                  onClick={() => handleSubmoduleToggle(sub.id, sub.is_enabled)}
                                  disabled={!canManageRoles || !mod.is_enabled || controlPlane || enabledPending}
                                  aria-label={`${sub.is_enabled ? 'Vypnout' : 'Zapnout'} podmodul ${sub.name}`}
                                  title={controlPlane ? 'Řídicí podmodul musí zůstat aktivní' : canManageRoles ? `${sub.is_enabled ? 'Vypnout' : 'Zapnout'} podmodul` : 'Měnit smí pouze superadministrátor'}
                                  className={`relative h-4 w-8 shrink-0 rounded-full transition-colors ${sub.is_enabled ? 'bg-emerald-500' : 'bg-white/12'} disabled:cursor-not-allowed disabled:opacity-45`}
                                >
                                  <motion.span
                                    animate={{ x: sub.is_enabled ? 17 : 2 }}
                                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                    className="absolute top-0.5 flex h-3 w-3 items-center justify-center rounded-full bg-white shadow"
                                  >
                                    {enabledPending && <Loader2 className="h-2 w-2 animate-spin text-emerald-500" />}
                                  </motion.span>
                                </button>
                                <span className="shrink-0 rounded-md bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-white/50">
                                  {superadminOnly ? 'Pouze superadmin' : `${ROLE_DEFS.filter(r => sub.allowed_roles?.includes(r.id)).length}/${ROLE_DEFS.length}`}
                                </span>
                              </div>
                              {superadminOnly ? (
                                <div className="flex items-center gap-2 rounded-lg border border-rose-300/[0.12] bg-rose-300/[0.04] px-2.5 py-2 text-[10px] font-semibold text-white/52">
                                  <Crown className="h-3.5 w-3.5 shrink-0" style={{ color: TIER_COLOR.superadmin }} />
                                  Globální konfigurace bez možnosti přidělení jiné roli
                                </div>
                              ) : (
                                <>
                                  <div className="mb-1.5">{renderSubmoduleRoleTile(mod, sub, ADMIN_ROLE)}</div>
                                  <div className="grid grid-cols-2 gap-1.5">
                                    {OPERATIONAL_ROLES.map(role => renderSubmoduleRoleTile(mod, sub, role))}
                                  </div>
                                </>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Devices module - expandable management section */}
                {mod.id === 'devices' && mod.is_enabled && (
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <button
                      onClick={() => setExpandedModule(expandedModule === 'devices' ? null : 'devices')}
                      className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.025] px-4 text-[9px] font-semibold uppercase tracking-[0.08em] text-white/52 transition-colors hover:text-white"
                    >
                      <Smartphone className="w-4 h-4" />
                      {expandedModule === 'devices' ? 'Skrýt správu zařízení' : 'Spravovat zařízení'}
                      <ChevronDown className={`w-4 h-4 transition-transform ${expandedModule === 'devices' ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {expandedModule === 'devices' && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="mt-4"
                      >
                        <DevicesSettingsPanel />
                      </motion.div>
                    )}
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>

      <div className="flex items-start gap-2.5 rounded-xl p-3.5 text-[11.5px] leading-relaxed text-white/38" style={CARD}>
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-white/35" />
        <span>
          Změny se ukládají okamžitě. Superadministrátor má trvalý přístup a jako jediný může měnit dostupnost modulů,
          podmodulů i oprávnění rolí. Vypnutá část zmizí všem ostatním rolím bez ohledu na jejich přiřazení.
        </span>
      </div>
    </div>
  );
};
