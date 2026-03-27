import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

// Interface matching database schema
export interface WorkflowStatusDB {
  id: string;
  name: string;
  description: string | null;
  sort_order: number;
  accent_color: string;
  icon: string | null;
  is_active: boolean;
  include_in_statistics: boolean;
  show_in_timeline: boolean;
  show_in_room_detail: boolean;
  default_duration_minutes: number;
  is_special: boolean;
  special_type: string | null;
  created_at: string;
  updated_at: string;
}

// Mapped interface for component use
export interface WorkflowStatus {
  id: string;
  name: string;
  description: string | null;
  order_index: number;
  color: string;
  is_active: boolean;
  count_in_statistics: boolean;
  default_duration: number;
  show_in_timeline: boolean;
  show_in_room_detail: boolean;
  is_special: boolean;
  special_type: string | null;
}

// Map database record to component interface
const mapDBToStatus = (db: WorkflowStatusDB): WorkflowStatus => ({
  id: db.id,
  name: db.name,
  description: db.description,
  order_index: db.sort_order,
  color: db.accent_color,
  is_active: db.is_active,
  count_in_statistics: db.include_in_statistics,
  default_duration: db.default_duration_minutes,
  show_in_timeline: db.show_in_timeline,
  show_in_room_detail: db.show_in_room_detail,
  is_special: db.is_special,
  special_type: db.special_type,
});

// Map component updates to database columns
const mapStatusToDB = (updates: Partial<WorkflowStatus>): Partial<WorkflowStatusDB> => {
  const dbUpdates: Partial<WorkflowStatusDB> = {};
  if (updates.color !== undefined) dbUpdates.accent_color = updates.color;
  if (updates.is_active !== undefined) dbUpdates.is_active = updates.is_active;
  if (updates.count_in_statistics !== undefined) dbUpdates.include_in_statistics = updates.count_in_statistics;
  if (updates.default_duration !== undefined) dbUpdates.default_duration_minutes = updates.default_duration;
  if (updates.show_in_timeline !== undefined) dbUpdates.show_in_timeline = updates.show_in_timeline;
  if (updates.show_in_room_detail !== undefined) dbUpdates.show_in_room_detail = updates.show_in_room_detail;
  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.description !== undefined) dbUpdates.description = updates.description;
  return dbUpdates;
};

export const useWorkflowStatuses = () => {
  const [statuses, setStatuses] = useState<WorkflowStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Načtení statusů z databáze
  const fetchStatuses = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('workflow_statuses')
        .select('*')
        .order('sort_order', { ascending: true });

      if (fetchError) throw fetchError;
      
      const mappedStatuses = (data || []).map(mapDBToStatus);
      setStatuses(mappedStatuses);
      setError(null);
    } catch (err) {
      console.error('[v0] Error fetching workflow statuses:', err);
      setError(err instanceof Error ? err.message : 'Neznámá chyba');
    } finally {
      setLoading(false);
    }
  }, []);

  // Aktualizace statusu
  const updateStatus = async (id: string, updates: Partial<WorkflowStatus>) => {
    try {
      const dbUpdates = mapStatusToDB(updates);
      
      const { error: updateError } = await supabase
        .from('workflow_statuses')
        .update(dbUpdates)
        .eq('id', id);

      if (updateError) throw updateError;
      
      // Aktualizace lokálního stavu
      setStatuses(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
    } catch (err) {
      console.error('[v0] Error updating workflow status:', err);
      setError(err instanceof Error ? err.message : 'Neznámá chyba');
    }
  };

  // Získání pouze aktivních statusů
  const getActiveStatuses = useCallback(() => {
    return statuses.filter(s => s.is_active);
  }, [statuses]);

  // Získání statusů, které se počítají do statistik
  const getStatisticsStatuses = useCallback(() => {
    return statuses.filter(s => s.is_active && s.count_in_statistics);
  }, [statuses]);

  useEffect(() => {
    fetchStatuses();

    // Subscribe na realtime změny
    const subscription = supabase
      .channel('workflow_statuses_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'workflow_statuses' },
        () => {
          fetchStatuses();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchStatuses]);

  return {
    statuses,
    activeStatuses: getActiveStatuses(),
    statisticsStatuses: getStatisticsStatuses(),
    loading,
    error,
    updateStatus,
    fetchStatuses
  };
};
