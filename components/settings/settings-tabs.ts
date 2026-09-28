'use client';

export type TabId = 'hospital' | 'modules' | 'diagnostics' | 'database' | 'access';

/** Panel Nastavení ↔ podmodul, kterým se řídí jeho viditelnost. */
export const SETTINGS_TAB_SUBMODULE: Record<TabId, string> = {
  hospital: 'settings.hospital',
  modules: 'settings.modules',
  diagnostics: 'settings.diagnostics',
  database: 'settings.database',
  access: 'settings.access',
};
