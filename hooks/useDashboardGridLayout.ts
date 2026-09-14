'use client';

import { useLayoutEffect, useRef } from 'react';
import { calculateDashboardGridLayout } from '../lib/dashboard-grid-layout';

const layoutProperties = [
  '--dashboard-columns',
  '--dashboard-card-height',
  '--dashboard-grid-gap',
  '--dashboard-grid-width',
] as const;

/** Resize presentation only, without rerendering live room data on every frame. */
export function useDashboardGridLayout(count: number, enabled: boolean) {
  const gridRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const grid = gridRef.current;
    const content = grid?.parentElement;
    const module = grid?.closest<HTMLElement>('.dashboard-module');
    if (!enabled || !grid || !content || !module) return;

    const header = module.querySelector<HTMLElement>('.dashboard-page-header');
    const desktop = window.matchMedia('(min-width: 768px)');
    let frame = 0;
    let previous = '';

    const clearLayout = () => {
      layoutProperties.forEach((property) => grid.style.removeProperty(property));
      delete grid.dataset.density;
    };

    const measure = () => {
      frame = 0;
      if (!desktop.matches) {
        if (previous !== 'mobile') clearLayout();
        previous = 'mobile';
        return;
      }

      const moduleStyle = getComputedStyle(module);
      const contentStyle = getComputedStyle(content);
      // scrollTop cancels the scroll offset in DOM rectangles: resizing a
      // scrolled dashboard must not artificially increase the card height.
      const top = grid.getBoundingClientRect().top - module.getBoundingClientRect().top + module.scrollTop;
      const height = module.clientHeight - top
        - parseFloat(moduleStyle.paddingBottom) - parseFloat(contentStyle.paddingBottom);
      const layout = calculateDashboardGridLayout({ width: content.clientWidth, height, count });
      const signature = `${layout.columns}:${layout.cardHeight}:${layout.gap}:${layout.maxWidth}:${layout.density}`;
      if (signature === previous) return;
      previous = signature;
      grid.style.setProperty('--dashboard-columns', String(layout.columns));
      grid.style.setProperty('--dashboard-card-height', `${layout.cardHeight}px`);
      grid.style.setProperty('--dashboard-grid-gap', `${layout.gap}px`);
      grid.style.setProperty('--dashboard-grid-width', `${layout.maxWidth}px`);
      grid.dataset.density = layout.density;
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };

    measure();
    const observer = new ResizeObserver(schedule);
    observer.observe(module);
    observer.observe(content);
    if (header) observer.observe(header);
    window.addEventListener('resize', schedule, { passive: true });
    desktop.addEventListener('change', schedule);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', schedule);
      desktop.removeEventListener('change', schedule);
      cancelAnimationFrame(frame);
      clearLayout();
    };
  }, [count, enabled]);

  return gridRef;
}
