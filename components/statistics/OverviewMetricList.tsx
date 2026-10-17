import React from 'react';
import type { BarItem } from './AppCharts';
import { C } from './statistics-theme';
import styles from './overview-metric-list.module.css';

/** Overview-only presentation; ranking, scope and values remain supplied by the caller. */
export function OverviewMetricList({ title, items, ranked = false, emptyText }: {
  title: string;
  items: BarItem[];
  ranked?: boolean;
  emptyText: string;
}) {
  const maximum = Math.max(1, ...items.map(item => item.value));
  const List = ranked ? 'ol' : 'ul';
  return <section className={styles.panel} aria-label={title}>
    <h3 className={styles.heading}>{title}</h3>
    {items.length === 0 ? <p className={styles.empty}>{emptyText}</p> : <List className={styles.list}>
      {items.map((item, index) => <li key={`${item.label}-${index}`} className={styles.row}>
        <div className={styles.identity}>
          {ranked && <span className={styles.rank} aria-label={`Pořadí ${index + 1}`}>{index + 1}</span>}
          <div className={styles.name}>
            <span className={styles.label}>{item.label}</span>
            {item.sub && <span className={styles.sub}>{item.sub}</span>}
            <progress className={styles.progress} max={maximum} value={Math.max(0, item.value)} aria-hidden="true"
              style={{ '--overview-bar-color': item.color || C.accent } as React.CSSProperties} />
          </div>
        </div>
        <span className={styles.value} style={{ color: item.color || C.accent }}>{item.display ?? item.value.toLocaleString('cs-CZ')}</span>
      </li>)}
    </List>}
  </section>;
}
