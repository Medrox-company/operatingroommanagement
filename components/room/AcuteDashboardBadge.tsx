import React from 'react';
import { acuteDashboardDescription, type AcuteDashboardRoomSummary } from '../../lib/acute-dashboard';
import { URGENCY_LABELS } from '../acute/display';
import { C } from '../timeline/constants';
import styles from './acute-dashboard-badge.module.css';

interface AcuteDashboardBadgeProps {
  summary?: AcuteDashboardRoomSummary;
  mobile?: boolean;
}

export default function AcuteDashboardBadge({ summary, mobile = false }: AcuteDashboardBadgeProps) {
  const request = summary?.activeCycle ?? summary?.pendingRequests[0];
  if (!summary || !request) return null;
  const running = Boolean(summary.activeCycle);
  const pendingCount = summary.pendingRequests.length;
  const firstPending = summary.pendingRequests[0];
  const color = request.urgency === 'emergent' ? C.red : request.urgency === 'urgent' ? C.green : C.blue;
  const description = acuteDashboardDescription(summary);
  return (
    <span
      className={`${styles.badge}${mobile ? ` ${styles.mobile}` : ''}`}
      style={{ '--acute-dashboard-color': color } as React.CSSProperties}
      data-acute-dashboard-badge=""
      data-urgency={request.urgency}
      data-cycle-active={running || undefined}
      aria-label={description}
      title={description}
    >
      <span className={styles.heading}>
        <i className={styles.dot} aria-hidden="true" />
        <span>{running ? 'Akutní · probíhá' : `${URGENCY_LABELS[request.urgency]} · akutní požadavek`}</span>
        {pendingCount > (running ? 0 : 1) && <span className={styles.count}>{running ? `+${pendingCount}` : `+${pendingCount - 1}`}</span>}
      </span>
      <span className={styles.detail}>
        <span className={styles.procedure}>{request.procedureName}</span>
        <span className={styles.rank}>
          {running ? URGENCY_LABELS[request.urgency] : firstPending?.queuePosition != null ? `Pořadí ${firstPending.queuePosition}` : 'Pořadí —'}
        </span>
      </span>
    </span>
  );
}
