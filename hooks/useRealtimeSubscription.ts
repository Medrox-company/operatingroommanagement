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
        () => onUpdate()
      )
      .subscribe();

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
