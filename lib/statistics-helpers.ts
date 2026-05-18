import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

/**
 * Get hourly heatmap data (rooms × hours) from real database
 * Returns utilization percentage for each room and hour
 */
export async function getHourlyHeatmapData(periodDays: number = 7) {
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - periodDays * 24 * 60 * 60 * 1000);

  // Fetch room status history
  const { data: statusHistory, error } = await supabase
    .from('room_status_history')
    .select('room_id, status, created_at, operating_rooms(name)')
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString())
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[Statistics] Error fetching heatmap data:', error);
    return [];
  }

  // Group by room and hour
  const heatmapMap = new Map<string, Map<number, number[]>>();

  statusHistory?.forEach((entry: any) => {
    const roomId = entry.room_id;
    const date = new Date(entry.created_at);
    const hour = date.getHours();
    const isOperating = entry.status === 'in_use' || entry.status === 'occupied';

    if (!heatmapMap.has(roomId)) {
      heatmapMap.set(roomId, new Map());
    }

    const roomHours = heatmapMap.get(roomId)!;
    if (!roomHours.has(hour)) {
      roomHours.set(hour, []);
    }

    roomHours.get(hour)!.push(isOperating ? 1 : 0);
  });

  // Calculate average utilization per room and hour
  const result = Array.from(heatmapMap.entries()).map(([roomId, hours]) => ({
    roomId,
    hourlyUtilization: Array.from({ length: 24 }, (_, hour) => {
      const values = hours.get(hour) || [0];
      const utilization = Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100);
      return Math.max(0, Math.min(100, utilization));
    }),
  }));

  return result;
}

/**
 * Get room utilization statistics (real database data)
 */
export async function getRoomUtilizationStats(periodDays: number = 7) {
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - periodDays * 24 * 60 * 60 * 1000);

  const { data: statusHistory, error } = await supabase
    .from('room_status_history')
    .select('room_id, status, created_at')
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString());

  if (error) {
    console.error('[Statistics] Error fetching utilization stats:', error);
    return { avgUtilization: 0, peakUtilization: 0, minUtilization: 0 };
  }

  const roomStats = new Map<string, { total: number; operating: number }>();

  statusHistory?.forEach((entry: any) => {
    const roomId = entry.room_id;
    if (!roomStats.has(roomId)) {
      roomStats.set(roomId, { total: 0, operating: 0 });
    }

    const stats = roomStats.get(roomId)!;
    stats.total += 1;
    if (entry.status === 'in_use' || entry.status === 'occupied') {
      stats.operating += 1;
    }
  });

  const utilizationPercentages = Array.from(roomStats.values()).map(
    (stats) => Math.round((stats.operating / stats.total) * 100)
  );

  return {
    avgUtilization: utilizationPercentages.length > 0
      ? Math.round(utilizationPercentages.reduce((a, b) => a + b, 0) / utilizationPercentages.length)
      : 0,
    peakUtilization: utilizationPercentages.length > 0 ? Math.max(...utilizationPercentages) : 0,
    minUtilization: utilizationPercentages.length > 0 ? Math.min(...utilizationPercentages) : 0,
  };
}

/**
 * Get bottleneck analysis - identify rooms with high utilization
 */
export async function getBottleneckAnalysis(periodDays: number = 7) {
  const stats = await getRoomUtilizationStats(periodDays);
  
  const { data: rooms, error } = await supabase
    .from('operating_rooms')
    .select('id, name')
    .order('name');

  if (error) {
    console.error('[Statistics] Error fetching bottleneck data:', error);
    return [];
  }

  // Get utilization per room
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - periodDays * 24 * 60 * 60 * 1000);

  const { data: statusHistory } = await supabase
    .from('room_status_history')
    .select('room_id, status, created_at')
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString());

  const roomUtilization = new Map<string, { total: number; operating: number }>();

  statusHistory?.forEach((entry: any) => {
    const roomId = entry.room_id;
    if (!roomUtilization.has(roomId)) {
      roomUtilization.set(roomId, { total: 0, operating: 0 });
    }

    const utilStats = roomUtilization.get(roomId)!;
    utilStats.total += 1;
    if (entry.status === 'in_use' || entry.status === 'occupied') {
      utilStats.operating += 1;
    }
  });

  return (rooms || [])
    .map((room: any) => {
      const utilStats = roomUtilization.get(room.id) || { total: 0, operating: 0 };
      const utilization = utilStats.total > 0
        ? Math.round((utilStats.operating / utilStats.total) * 100)
        : 0;

      return {
        roomId: room.id,
        roomName: room.name,
        utilization,
        isBottleneck: utilization > 80,
        isIdle: utilization < 20,
      };
    })
    .sort((a, b) => b.utilization - a.utilization);
}

/**
 * Get staff utilization from database
 */
export async function getStaffUtilization(periodDays: number = 7) {
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - periodDays * 24 * 60 * 60 * 1000);

  const { data: shifts, error } = await supabase
    .from('shift_schedules')
    .select('staff_id, start_time, end_time, staff(name, department)')
    .gte('start_time', startDate.toISOString())
    .lte('end_time', endDate.toISOString());

  if (error) {
    console.error('[Statistics] Error fetching staff utilization:', error);
    return { avgUtilization: 0, totalStaff: 0, activeStaff: 0 };
  }

  const staffWorkingHours = new Map<string, number>();
  const now = new Date();
  const totalPeriodHours = periodDays * 24;

  shifts?.forEach((shift: any) => {
    const staffId = shift.staff_id;
    const startTime = new Date(shift.start_time);
    const endTime = new Date(shift.end_time);

    // Only count shifts within our period
    if (startTime < endDate && endTime > startDate) {
      const adjustedStart = Math.max(startTime.getTime(), startDate.getTime());
      const adjustedEnd = Math.min(endTime.getTime(), endDate.getTime());
      const hours = (adjustedEnd - adjustedStart) / (1000 * 60 * 60);

      staffWorkingHours.set(staffId, (staffWorkingHours.get(staffId) || 0) + hours);
    }
  });

  const utilizationPercentages = Array.from(staffWorkingHours.values()).map(
    (hours) => Math.round((hours / totalPeriodHours) * 100)
  );

  return {
    avgUtilization: utilizationPercentages.length > 0
      ? Math.round(utilizationPercentages.reduce((a, b) => a + b, 0) / utilizationPercentages.length)
      : 0,
    totalStaff: staffWorkingHours.size,
    activeStaff: Array.from(staffWorkingHours.values()).filter(h => h > 0).length,
  };
}

/**
 * Get financial metrics from database
 */
export async function getFinancialMetrics(periodDays: number = 7) {
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - periodDays * 24 * 60 * 60 * 1000);

  // Get equipment usage/costs
  const { data: statusHistory, error } = await supabase
    .from('room_status_history')
    .select('room_id, status, created_at')
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString());

  if (error) {
    console.error('[Statistics] Error fetching financial metrics:', error);
    return { totalCosts: 0, costPerRoom: 0, roi: 0 };
  }

  // Calculate based on room utilization
  const operatingHours = statusHistory?.filter(
    (h: any) => h.status === 'in_use' || h.status === 'occupied'
  ).length || 0;

  // Estimate costs: ~$500 per operating hour in modern OR
  const costPerHour = 500;
  const totalCosts = operatingHours * costPerHour;

  const { data: rooms } = await supabase.from('operating_rooms').select('id');
  const roomCount = rooms?.length || 1;

  return {
    totalCosts: Math.round(totalCosts),
    costPerRoom: Math.round(totalCosts / roomCount),
    operatingHours,
  };
}

/**
 * Get notifications from database (real alerts)
 */
export async function getNotifications(limit: number = 50, periodDays: number = 7) {
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - periodDays * 24 * 60 * 60 * 1000);

  const { data: notifications, error } = await supabase
    .from('notifications_log')
    .select('id, type, severity, message, created_at, room_id, operating_rooms(name)')
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString())
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[Statistics] Error fetching notifications:', error);
    return [];
  }

  return notifications || [];
}

/**
 * Get phase/stage efficiency metrics
 */
export async function getPhaseEfficiency(periodDays: number = 7) {
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - periodDays * 24 * 60 * 60 * 1000);

  const { data: procedures, error } = await supabase
    .from('operating_procedures')
    .select('id, status, started_at, completed_at')
    .gte('started_at', startDate.toISOString())
    .lte('completed_at', endDate.toISOString());

  if (error) {
    console.error('[Statistics] Error fetching phase efficiency:', error);
    return [];
  }

  const phaseStats: Record<string, { count: number; totalTime: number }> = {};

  procedures?.forEach((proc: any) => {
    const phase = proc.status || 'unknown';
    if (!phaseStats[phase]) {
      phaseStats[phase] = { count: 0, totalTime: 0 };
    }

    if (proc.started_at && proc.completed_at) {
      const duration = new Date(proc.completed_at).getTime() - new Date(proc.started_at).getTime();
      phaseStats[phase].totalTime += duration;
    }
    phaseStats[phase].count += 1;
  });

  return Object.entries(phaseStats).map(([phase, stats]) => ({
    phase,
    procedures: stats.count,
    avgDurationMinutes: stats.count > 0 ? Math.round(stats.totalTime / stats.count / (1000 * 60)) : 0,
  }));
}
