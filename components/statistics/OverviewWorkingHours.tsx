import React from 'react';
import { C } from './statistics-theme';
import styles from './overview-working-hours.module.css';

export type OverviewWorkingHoursRow = {
  id: string;
  name: string;
  department: string;
  statusColor: string;
  statusLabel: string;
  enabled: boolean;
  workingHours: string;
  workingMinutes: number;
  operations: number;
  utilization: number | null;
  queue: number;
};

/** Presentation only: schedule, counts and utilization come from the existing Overview. */
export function OverviewWorkingHours({ rows }: { rows: OverviewWorkingHoursRow[] }) {
  return <div className={styles.panel}>
    <div className={styles.scroll} role="region" aria-label="Pracovní doby operačních sálů" tabIndex={0}>
      <table className={styles.table}>
        <caption className={styles.srOnly}>Přehled pracovních dob sálů (dnešní den)</caption>
        <colgroup>
          <col className={styles.identityColumn} />
          <col className={styles.hoursColumn} />
          <col className={styles.metricColumn} />
          <col className={styles.metricColumn} />
          <col className={styles.metricColumn} />
        </colgroup>
        <thead><tr>
          <th scope="col">Operační sál</th>
          <th scope="col">Pracovní doba</th>
          <th scope="col">Operace</th>
          <th scope="col">Využití</th>
          <th scope="col">Fronta</th>
        </tr></thead>
        <tbody>
          {rows.map(row => <tr key={row.id}>
            <th scope="row" className={styles.identity}>
              <div className={styles.nameLine}>
                <span className={styles.statusDot} style={{ background: row.statusColor }} aria-hidden="true" />
                <span className={styles.name}>{row.name}</span>
              </div>
              <span className={styles.srOnly}>{row.statusLabel}</span>
              {row.department && <span className={styles.department}>{row.department}</span>}
            </th>
            <td>
              <div className={styles.hours} style={{ color: row.enabled ? C.text : C.muted }}>{row.workingHours}</div>
              {row.enabled && <div className={styles.duration}>{Math.floor(row.workingMinutes / 60)} h {row.workingMinutes % 60} min</div>}
            </td>
            <td><span className={styles.value} style={{ color: C.accent }}>{row.operations}</span></td>
            <td><span className={styles.value} style={{ color: row.utilization == null ? C.muted : row.utilization >= 80 ? C.green : row.utilization >= 50 ? C.yellow : C.orange }}>
              {row.utilization == null ? '—' : `${row.utilization}%`}
            </span></td>
            <td><span className={styles.value} style={{ color: row.queue > 0 ? C.yellow : C.green }}>{row.queue}</span></td>
          </tr>)}
          {rows.length === 0 && <tr><td colSpan={5} className={styles.empty}>Nejsou dostupné žádné operační sály.</td></tr>}
        </tbody>
      </table>
    </div>
  </div>;
}
