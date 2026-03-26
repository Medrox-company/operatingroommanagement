import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface WorkflowStatus {
  id: string;
  name: string;
  order_index: number;
  color: string;
  is_active: boolean;
  count_in_statistics: boolean;
  default_duration: number;
  description?: string;
}

export const useWorkflowStatuses = () => {
  const [statuses, setStatuses] = useState<WorkflowStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Načtení statusů z databáze
  const fetchStatuses = async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('workflow_statuses')
        .select('*')
        .order('order_index', { ascending: true });

      if (fetchError) throw fetchError;
      setStatuses(data || []);
      setError(null);
    } catch (err) {
      console.error('[v0] Error fetching workflow statuses:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  // Aktualizace statusu
  const updateStatus = async (id: string, updates: Partial<WorkflowStatus>) => {
    try {
      const { error: updateError } = await supabase
        .from('workflow_statuses')
        .update(updates)
        .eq('id', id);

      if (updateError) throw updateError;
      
      // Aktualizace lokálního stavu
      setStatuses(statuses.map(s => s.id === id ? { ...s, ...updates } : s));
    } catch (err) {
      console.error('[v0] Error updating workflow status:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  // Získání pouze aktivních statusů
  const getActiveStatuses = () => {
    return statuses.filter(s => s.is_active);
  };

  // Získání statusů, které se počítají do statistik
  const getStatisticsStatuses = () => {
    return statuses.filter(s => s.is_active && s.count_in_statistics);
  };

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
  }, []);

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
