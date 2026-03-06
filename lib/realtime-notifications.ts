// Real-time notification utilities for database changes
export interface RealtimeNotification {
  id: string;
  type: 'insert' | 'update' | 'delete';
  table: string;
  timestamp: Date;
  message: string;
}

let notificationListeners: ((notification: RealtimeNotification) => void)[] = [];

export function subscribeToNotifications(callback: (notification: RealtimeNotification) => void) {
  notificationListeners.push(callback);
  return () => {
    notificationListeners = notificationListeners.filter(listener => listener !== callback);
  };
}

export function notifyChange(type: 'insert' | 'update' | 'delete', table: string, data?: any) {
  const notification: RealtimeNotification = {
    id: `${table}-${Date.now()}`,
    type,
    table,
    timestamp: new Date(),
    message: `${table}: ${type} operation completed`,
  };

  notificationListeners.forEach(listener => {
    try {
      listener(notification);
    } catch (error) {
      console.error('Error in notification listener:', error);
    }
  });
}

export const CZECH_MESSAGES = {
  insert: {
    operating_rooms: 'Nový operační sál byl přidán',
    departments: 'Nové oddělení bylo přidáno',
    staff: 'Nový pracovník byl přidán',
    schedules: 'Nový plán byl vytvořen',
    shift_schedules: 'Nová směna byla přidána',
    patients: 'Nový pacient byl zaregistrován',
    procedures: 'Nový postup byl zaznamenán',
    equipment: 'Nové zařízení bylo přidáno',
    sub_departments: 'Nové pododdělení bylo přidáno',
  },
  update: {
    operating_rooms: 'Operační sál byl aktualizován',
    departments: 'Oddělení bylo aktualizováno',
    staff: 'Pracovník byl aktualizován',
    schedules: 'Plán byl aktualizován',
    shift_schedules: 'Směna byla aktualizována',
    patients: 'Pacient byl aktualizován',
    procedures: 'Postup byl aktualizován',
    equipment: 'Zařízení bylo aktualizováno',
    sub_departments: 'Pododdělení bylo aktualizováno',
  },
  delete: {
    operating_rooms: 'Operační sál byl smazán',
    departments: 'Oddělení bylo smazáno',
    staff: 'Pracovník byl smazán',
    schedules: 'Plán byl smazán',
    shift_schedules: 'Směna byla smazána',
    patients: 'Pacient byl smazán',
    procedures: 'Postup byl smazán',
    equipment: 'Zařízení bylo smazáno',
    sub_departments: 'Pododdělení bylo smazáno',
  },
} as const;

export function getChangeMessage(type: 'insert' | 'update' | 'delete', table: string): string {
  return CZECH_MESSAGES[type][table as keyof typeof CZECH_MESSAGES['insert']] || `${table}: ${type}`;
}
