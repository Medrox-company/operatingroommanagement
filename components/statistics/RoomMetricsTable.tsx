import React from 'react';
import { C } from './statistics-theme';
import styles from './room-metrics-table.module.css';

export interface RoomMetricsRow {
  id: string;
  name: string;
  statusLabel: string;
  statusColor: string;
  flags: string[];
  flagsColor: string;
  utilization: number | null;
  utilizationColor: string;
  operations: number;
  workingHours: string;
  closed: boolean;
  pausedMinutes: number;
  activeMinutes: number;
  capacityMinutes: number | null;
  overtimeMinutes: number | null;
}

/** Presentation only: metrics are supplied by the existing operational-day calculations. */
export function RoomMetricsTable({ rows }: { rows: RoomMetricsRow[] }) {
  return (
    <div className={styles.panel}>
      <div className={styles.scroll} role="region" aria-label="Provozní metriky jednotlivých sálů" tabIndex={0}>
        <table className={styles.table}>
          <caption className={styles.caption}>
            Časové metriky pro vybraný provozní den · stav sálu je aktuální.
          </caption>
          <thead>
            <tr>
              <th scope="col" className={styles.identity}>Operační sál</th>
              <th scope="col">Aktuální stav</th>
              <th scope="col">Využití kapacity</th>
              <th scope="col" className={styles.numeric}>Výkony</th>
              <th scope="col">Pracovní doba</th>
              <th scope="col" className={styles.numeric}>Pauza</th>
              <th scope="col" className={styles.numeric}>Aktivní / kapacita</th>
              <th scope="col" className={styles.numeric}>Přesah</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.id}>
                <th scope="row" className={styles.identity}>{row.name}</th>
                <td>
                  <span className={styles.status} style={{ color: row.statusColor }}>
                    <span className={styles.dot} aria-hidden="true" />
                    {row.statusLabel}
                  </span>
                  {row.flags.length > 0 && (
                    <span className={styles.flags} style={{ color: row.flagsColor }}>{row.flags.join(' · ')}</span>
                  )}
                </td>
                <td>
                  {row.utilization === null ? <span className={styles.empty}>—</span> : (
                    <span className={styles.utilization}>
                      <span className={styles.track} aria-hidden="true">
                        <span style={{ width: `${Math.max(0, Math.min(100, row.utilization))}%`, background: row.utilizationColor }} />
                      </span>
                      <span className={styles.percent} style={{ color: row.utilizationColor }}>{row.utilization}<span className={styles.unit}> %</span></span>
                    </span>
                  )}
                </td>
                <td className={`${styles.numeric} ${styles.operations}`} style={{ color: row.operations > 0 ? C.accent : C.muted }}>{row.operations}</td>
                <td className={styles.hours} style={{ color: row.closed ? C.muted : C.text }}>{row.workingHours}</td>
                <td className={styles.numeric}>
                  {row.pausedMinutes > 0 ? <span style={{ color: C.yellow }}>{row.pausedMinutes}<span className={styles.unit}> min</span></span> : <span className={styles.empty}>—</span>}
                </td>
                <td className={styles.numeric}>
                  {row.activeMinutes}<span className={styles.unit}> / </span>{row.capacityMinutes ?? '—'}<span className={styles.unit}> min</span>
                </td>
                <td className={styles.numeric}>
                  {row.overtimeMinutes !== null && row.overtimeMinutes > 0 ? (
                    <span className={styles.overtime} style={{ color: C.red }}>+{row.overtimeMinutes}<span className={styles.unit}> min</span></span>
                  ) : <span className={styles.empty}>—</span>}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={8} className={styles.emptyState}>Žádné sály k zobrazení.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
