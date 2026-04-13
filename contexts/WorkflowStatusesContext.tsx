'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo, ReactNode } from 'react';
import { supabase } from '../lib/supabase';

export interface WorkflowStatus {
  id: string;
  name: string;
  title: string;
  description: string | null;
  order_index: number;
  sort_order: number;
  color: string;
  accent_color: string;
  is_active: boolean;
  count_in_statistics: boolean;
  include_in_statistics: boolean;
  default_duration: number;
  default_duration_minutes: number;
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
  workflowStatuses: WorkflowStatus[];
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
  // sort_order in DB starts from 0, same as currentStepIndex
  order_index: db.sort_order,
  sort_order: db.sort_order,
  color: db.accent_color,
  accent_color: db.accent_color,
  is_active: db.is_active,
  count_in_statistics: db.include_in_statistics,
  include_in_statistics: db.include_in_statistics,
  default_duration: db.default_duration_minutes,
  default_duration_minutes: db.default_duration_minutes,
  show_in_timeline: db.show_in_timeline,
  show_in_room_detail: db.show_in_room_detail,
  is_special: db.is_special,
  special_type: db.special_type,
  organizer: db.name,
  status: db.is_active ? 'Active' : 'Inactive',
});

export const WorkflowStatusesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [statuses, setStatuses] = useState<WorkflowStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Track if initial load is complete
  const [isInitialized, setIsInitialized] = useState(false);

  const fetchStatuses = useCallback(async (isInitialLoad = false) => {
    try {
      // Only show loading on initial load, not on refreshes (to prevent flickering)
      if (isInitialLoad) {
        setLoading(true);
      }
      
      const { data, error: fetchError } = await supabase
        .from('workflow_statuses')
        .select('*')
        .order('sort_order', { ascending: true });

      if (fetchError) throw fetchError;
      
      const mappedStatuses = (data || []).map(mapDBToStatus);
      
      // Only update if we have data - prevents flickering when refresh returns empty temporarily
      if (mappedStatuses.length > 0) {
        setStatuses(mappedStatuses);
      }
      setError(null);
      setIsInitialized(true);
    } catch (err) {
      console.error('[v0] Error fetching workflow statuses:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      if (isInitialLoad) {
        setLoading(false);
      }
    }
  }, []);

  const updateStatus = useCallback(async (id: string, updates: Partial<WorkflowStatus>) => {
    // IMMEDIATELY update local state for responsive UI
    // Make sure both color and accent_color are updated together
    const localUpdates = { ...updates };
    if (updates.color !== undefined) {
      localUpdates.accent_color = updates.color;
    }
    if (updates.accent_color !== undefined) {
      localUpdates.color = updates.accent_color;
    }
    setStatuses(prev => prev.map(s => s.id === id ? { ...s, ...localUpdates } : s));

    try {
      const dbUpdates: Record<string, unknown> = {};
      // Handle both color and accent_color for DB update
      if (updates.color !== undefined) dbUpdates.accent_color = updates.color;
      if (updates.accent_color !== undefined) dbUpdates.accent_color = updates.accent_color;
      if (updates.is_active !== undefined) dbUpdates.is_active = updates.is_active;
      if (updates.count_in_statistics !== undefined) dbUpdates.include_in_statistics = updates.count_in_statistics;
      if (updates.default_duration !== undefined) dbUpdates.default_duration_minutes = updates.default_duration;
      if (updates.show_in_timeline !== undefined) dbUpdates.show_in_timeline = updates.show_in_timeline;
      if (updates.show_in_room_detail !== undefined) dbUpdates.show_in_room_detail = updates.show_in_room_detail;
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.description !== undefined) dbUpdates.description = updates.description;

      const { error: updateError } = await supabase
        .from('workflow_statuses')
        .update(dbUpdates)
        .eq('id', id)
        .select();

      if (updateError) throw updateError;
    } catch (err) {
      console.error('[v0] Error updating workflow status:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      // Revert on error
      await fetchStatuses();
    }
  }, [fetchStatuses]);

  const getActiveStatuses = useCallback(() => {
    return statuses.filter(s => s.is_active).sort((a, b) => a.order_index - b.order_index);
  }, [statuses]);

  // Workflow statuses are only main ones (without special) for circular progress
  const getWorkflowStatuses = useCallback(() => {
    return statuses.filter(s => s.is_active && !s.is_special).sort((a, b) => a.order_index - b.order_index);
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
    // Initial load with loading indicator
    fetchStatuses(true);
    
    // NOTE: Realtime subscription DISABLED to prevent flickering
    // Workflow statuses only change via Settings module, not during normal operation
    // If user changes statuses in Settings, they can refresh page or the optimistic update handles it
    // This prevents unnecessary re-renders of ALL components when ANY room status changes
  }, [fetchStatuses]);

  // Memoize computed values
  const activeStatuses = useMemo(() => getActiveStatuses(), [getActiveStatuses]);
  const workflowStatuses = useMemo(() => getWorkflowStatuses(), [getWorkflowStatuses]);
  const statisticsStatuses = useMemo(() => getStatisticsStatuses(), [getStatisticsStatuses]);

  // Memoize context value to prevent unnecessary re-renders
  const value = useMemo<WorkflowStatusesContextValue>(() => ({
    statuses,
    activeStatuses,
    workflowStatuses,
    statisticsStatuses,
    loading,
    error,
    updateStatus,
    getStatusByIndex,
    getStatusColor,
    refreshStatuses: () => fetchStatuses(false), // Silent refresh without loading indicator
  }), [statuses, activeStatuses, workflowStatuses, statisticsStatuses, loading, error, updateStatus, getStatusByIndex, getStatusColor, fetchStatuses]);

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
