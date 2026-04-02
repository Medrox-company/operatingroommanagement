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

export const NOTIFICATION_MESSAGES = {
  insert: {
    operating_rooms: 'New operating room added',
    departments: 'New department added',
    staff: 'New staff member added',
    schedules: 'New schedule created',
    shift_schedules: 'New shift added',
    patients: 'New patient registered',
    procedures: 'New procedure recorded',
    equipment: 'New equipment added',
    sub_departments: 'New sub-department added',
  },
  update: {
    operating_rooms: 'Operating room updated',
    departments: 'Department updated',
    staff: 'Staff member updated',
    schedules: 'Schedule updated',
    shift_schedules: 'Shift updated',
    patients: 'Patient updated',
    procedures: 'Procedure updated',
    equipment: 'Equipment updated',
    sub_departments: 'Sub-department updated',
  },
  delete: {
    operating_rooms: 'Operating room deleted',
    departments: 'Department deleted',
    staff: 'Staff member deleted',
    schedules: 'Schedule deleted',
    shift_schedules: 'Shift deleted',
    patients: 'Patient deleted',
    procedures: 'Procedure deleted',
    equipment: 'Equipment deleted',
    sub_departments: 'Sub-department deleted',
  },
} as const;

export function getChangeMessage(type: 'insert' | 'update' | 'delete', table: string): string {
  return NOTIFICATION_MESSAGES[type][table as keyof typeof NOTIFICATION_MESSAGES['insert']] || `${table}: ${type}`;
}
