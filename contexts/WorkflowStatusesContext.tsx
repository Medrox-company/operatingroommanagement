'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { supabase } from '../lib/supabase';

export interface WorkflowStatus {
  id: string;
  name: string;
  title: string;
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
  organizer: string;
  status: string;
}

interface WorkflowStatusesContextValue {
  statuses: WorkflowStatus[];
  activeStatuses: WorkflowStatus[];
  statisticsStatuses: WorkflowStatus[];
  loading: boolean;
  error: string | null;
  updateStatus: (id: string, updates: Partial<WorkflowStatus>) => Promise<void>;
  getStatusByIndex: (index: number) => WorkflowStatus | undefined;
  getStatusColor: (index: number) => string;
  refreshStatuses: () => Promise<void>;
}

const WorkflowStatusesContext = createContext<WorkflowStatusesContextValue | undefined>(undefined);

interface WorkflowStatusDBRow {
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
}

const mapDBToStatus = (db: WorkflowStatusDBRow): WorkflowStatus => ({
  id: db.id,
  name: db.name,
  title: db.name,
  description: db.description,
  // DB sort_order starts from 1, but currentStepIndex starts from 0
  // So we subtract 1 to align them
  order_index: db.sort_order - 1,
  color: db.accent_color,
  is_active: db.is_active,
  count_in_statistics: db.include_in_statistics,
  default_duration: db.default_duration_minutes,
  show_in_timeline: db.show_in_timeline,
  show_in_room_detail: db.show_in_room_detail,
  is_special: db.is_special,
  special_type: db.special_type,
  organizer: db.name,
  status: db.is_active ? 'Aktivni' : 'Neaktivni',
});

export const WorkflowStatusesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [statuses, setStatuses] = useState<WorkflowStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      setError(err instanceof Error ? err.message : 'Neznama chyba');
    } finally {
      setLoading(false);
    }
  }, []);

  const updateStatus = async (id: string, updates: Partial<WorkflowStatus>) => {
    console.log('[v0] updateStatus called with id:', id, 'updates:', updates);
    
    try {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.color !== undefined) dbUpdates.accent_color = updates.color;
      if (updates.is_active !== undefined) dbUpdates.is_active = updates.is_active;
      if (updates.count_in_statistics !== undefined) dbUpdates.include_in_statistics = updates.count_in_statistics;
      if (updates.default_duration !== undefined) dbUpdates.default_duration_minutes = updates.default_duration;
      if (updates.show_in_timeline !== undefined) dbUpdates.show_in_timeline = updates.show_in_timeline;
      if (updates.show_in_room_detail !== undefined) dbUpdates.show_in_room_detail = updates.show_in_room_detail;
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.description !== undefined) dbUpdates.description = updates.description;

      console.log('[v0] Sending to Supabase - dbUpdates:', dbUpdates);

      const { error: updateError, data } = await supabase
        .from('workflow_statuses')
        .update(dbUpdates)
        .eq('id', id)
        .select();

      console.log('[v0] Supabase response - error:', updateError, 'data:', data);

      if (updateError) throw updateError;
      
      // Update local state
      setStatuses(prev => {
        const newStatuses = prev.map(s => s.id === id ? { ...s, ...updates } : s);
        console.log('[v0] Updated local statuses:', newStatuses.find(s => s.id === id));
        return newStatuses;
      });
    } catch (err) {
      console.error('[v0] Error updating workflow status:', err);
      setError(err instanceof Error ? err.message : 'Neznama chyba');
    }
  };

  const getActiveStatuses = useCallback(() => {
    return statuses.filter(s => s.is_active);
  }, [statuses]);

  const getStatisticsStatuses = useCallback(() => {
    return statuses.filter(s => s.is_active && s.count_in_statistics);
  }, [statuses]);

  const getStatusByIndex = useCallback((index: number) => {
    // Find status by order_index matching the step index
    // sort_order in DB starts from 0, same as currentStepIndex
    const status = statuses.find(s => s.order_index === index);
    if (!status && statuses.length > 0) {
      // Fallback: try to get by position in array
      return statuses[index];
    }
    return status;
  }, [statuses]);

  const getStatusColor = useCallback((index: number) => {
    const status = getStatusByIndex(index);
    return status?.color || '#6B7280';
  }, [getStatusByIndex]);

  useEffect(() => {
    fetchStatuses();

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

  const value: WorkflowStatusesContextValue = {
    statuses,
    activeStatuses: getActiveStatuses(),
    statisticsStatuses: getStatisticsStatuses(),
    loading,
    error,
    updateStatus,
    getStatusByIndex,
    getStatusColor,
    refreshStatuses: fetchStatuses,
  };

  return (
    <WorkflowStatusesContext.Provider value={value}>
      {children}
    </WorkflowStatusesContext.Provider>
  );
};

export const useWorkflowStatusesContext = () => {
  const context = useContext(WorkflowStatusesContext);
  if (context === undefined) {
    throw new Error('useWorkflowStatusesContext must be used within a WorkflowStatusesProvider');
  }
  return context;
};

export default WorkflowStatusesContext;
