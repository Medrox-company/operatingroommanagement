import type { DBOperatingRoom } from './db';
import type { AcuteCycleLink } from './acute-cycle-links';

/** The server starts a real cycle and records its acute identity in one transaction. */
export async function startAcuteRoomCycle(
  hospitalId: string,
  requestId: string,
  roomId: string,
  expectedStateRevision: number,
): Promise<{ link: AcuteCycleLink; room: DBOperatingRoom }> {
  const response = await fetch('/api/acute-requests/cycles', {
    method: 'POST', credentials: 'include', cache: 'no-store',
    headers: { 'Content-Type': 'application/json', 'X-Acute-Hospital-Id': hospitalId },
    body: JSON.stringify({ requestId, roomId, expectedStateRevision }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'Zahájení akutního cyklu nebylo potvrzeno. Obnovte sál a zkuste znovu.');
  if (result.link?.hospitalId !== hospitalId || result.link?.roomId !== roomId || result.link?.requestId !== requestId
    || result.room?.hospital_id !== hospitalId || result.room?.id !== roomId
    || !Number.isSafeInteger(result.room?.state_revision) || result.room.current_step_index < 1
    || !result.room.operation_started_at || result.room.operation_started_at !== result.link.operationStartedAt) {
    throw new Error('Server nepotvrdil správný sál a operační cyklus. Obnovte sál.');
  }
  return result;
}
