import type { OperatingRoom } from '../types';

export type RoomCompletedOperation = NonNullable<OperatingRoom['completedOperations']>[number];

/**
 * Sloučí archiv výkonů uložený u sálu (`completed_operations`) s výkony
 * odvozenými z logu událostí (`room_status_history`).
 *
 * Proč obojí: JSON archiv u sálu zapisuje klient, a to jen když sám provede
 * přechod do „Sál připraven". Výkony ukončené odjinud (jiný tablet, databázový
 * trigger, API) v něm chybí — dashboard pak ukazoval méně cyklů, než kolik jich
 * ve skutečnosti proběhlo. Log událostí je naopak úplný, ale u starších záznamů
 * nemusí existovat. Sjednocením dostaneme skutečný počet.
 *
 * Párování má toleranci 2 minuty, protože klient a trigger zapisují čas každý
 * ve svém okamžiku a stejný výkon by se jinak započítal dvakrát.
 */
export function mergeCompletedOperations(
  persisted: RoomCompletedOperation[],
  eventOperations: RoomCompletedOperation[],
): RoomCompletedOperation[] {
  if (eventOperations.length === 0) return persisted;
  const merged = [...persisted];

  for (const eventOperation of eventOperations) {
    const eventStart = new Date(eventOperation.startedAt).getTime();
    const eventEnd = new Date(eventOperation.endedAt).getTime();
    const matchingIndex = merged.findIndex((operation) => (
      Math.abs(new Date(operation.startedAt).getTime() - eventStart) <= 120_000
      && Math.abs(new Date(operation.endedAt).getTime() - eventEnd) <= 120_000
    ));

    if (matchingIndex === -1) {
      merged.push(eventOperation);
      continue;
    }

    const persistedOperation = merged[matchingIndex];
    const eventHistoryIsRicher = eventOperation.statusHistory.length >= persistedOperation.statusHistory.length;
    merged[matchingIndex] = {
      ...persistedOperation,
      statusHistory: eventHistoryIsRicher
        ? eventOperation.statusHistory
        : persistedOperation.statusHistory,
    };
  }

  return merged.sort(
    (a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime(),
  );
}
