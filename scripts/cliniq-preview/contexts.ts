// Isolated visual fixture: these adapters are resolved only by vite.config.ts here.
export const statuses = [
  { name: 'Sál připraven', color: '#16754E' },
  { name: 'Příprava pacienta', color: '#2467A6' },
  { name: 'Operační výkon', color: '#B64450' },
  { name: 'Ukončení výkonu', color: '#7250A8' },
  { name: 'Úklid a dezinfekce', color: '#946118' },
  { name: 'Mimo provoz', color: '#5D6B7E' },
];
export const useHospital = () => ({ activeHospital: { hospital_short_name: 'Centrální sály · ukázková data' } });
export const useWorkflowStatusesContext = () => ({ workflowStatuses: statuses });
export const useAuth = () => ({ hasModuleAccess: () => true, isSuperAdmin: false, logout: async () => {} });
