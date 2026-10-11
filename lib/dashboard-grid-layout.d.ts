export interface DashboardGridLayoutInput {
  width?: number;
  height?: number;
  count?: number;
  /** Shared minimum height for additional clinical evidence across the grid. */
  minCardHeight?: number;
}

export interface DashboardGridLayout {
  columns: number;
  rows: number;
  gap: number;
  cardHeight: number;
  maxWidth: number;
  density: 'compact' | 'comfortable';
}

export function calculateDashboardGridLayout(input?: DashboardGridLayoutInput): DashboardGridLayout;
