import type { BuildingProject } from './model.js';

export class DashboardViewer {
  constructor(host: HTMLElement, labels: HTMLElement, onSelect: (roomId: string) => void);
  setProject(project: BuildingProject, floorId: string, selectedRoomId?: string | null, roomVisuals?: Map<string, {statusColor: string | null; active: boolean}>, onProgress?: (loaded: number, total: number) => void): Promise<boolean>;
  setRoomVisuals(roomVisuals: Map<string, {statusColor: string | null; active: boolean}>, redraw?: boolean, force?: boolean): void;
  setSelectedRoom(selectedRoomId?: string | null, redraw?: boolean): void;
  fit(top?: boolean): void;
  draw(): void;
  dispose(): void;
}
