import { useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export function useRealtimeSubscription(
  table: string,
  onUpdate: () => void,
  schema: string = 'public'
) {
  useEffect(() => {
    const subscription = supabase
      .channel(`${table}_changes`)
      .on(
        'postgres_changes',
        { event: '*', schema, table },
        (payload) => {
          console.log(`[v0] Real-time update on ${table}:`, payload);
          onUpdate();
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`[v0] Subscribed to ${table} real-time updates`);
        } else if (status === 'CLOSED') {
          console.log(`[v0] Unsubscribed from ${table}`);
        }
      });

    return () => {
      subscription.unsubscribe();
    };
  }, [table, onUpdate, schema]);
}

export function useRealtimeMultiple(
  tables: string[],
  onUpdate: () => void,
  schema: string = 'public'
) {
  const handleUpdate = useCallback(onUpdate, [onUpdate]);

  useEffect(() => {
    const subscriptions = tables.map((table) =>
      supabase
        .channel(`${table}_changes`)
        .on(
          'postgres_changes',
          { event: '*', schema, table },
          () => handleUpdate()
        )
        .subscribe()
    );

    return () => {
      subscriptions.forEach((sub) => sub.unsubscribe());
    };
  }, [tables, handleUpdate, schema]);
}
