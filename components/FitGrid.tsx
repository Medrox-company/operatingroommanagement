import React, { useLayoutEffect, useRef, useState, ReactNode } from 'react';

/* ════════════════════════════════════════════════════════════════════════
   FitGrid — na dostatečně velké obrazovce rozloží N prvků tak, aby se VEŠLY
   bez rolování (spočítá optimální sloupce/řádky a roztáhne buňky na výšku).

   Pokud by ale buňky byly příliš nízké (typicky tablet s menší výškou), kde by
   se obsah karet překrýval, přepne se na BĚŽNOU mřížku s rolováním a pevnou
   výškou karet (fallbackRowH) — to řeší rozbité zobrazení na tabletu/mobilu.
   Děti musí být h-full, aby vyplnily buňku.
   ════════════════════════════════════════════════════════════════════════ */

interface FitGridProps {
  count: number;
  children: ReactNode;
  idealAspect?: number;     // šířka/výška cílové buňky
  gap?: number;             // px mezera (desktop fit)
  mobileClassName?: string; // třídy mřížky pro fallback (rolování)
  minCellH?: number;        // pod tuto výšku buňky se fit NEPOUŽIJE → rolování
  fallbackRowH?: number;    // pevná výška karty v režimu rolování
}

const FitGrid: React.FC<FitGridProps> = ({
  count,
  children,
  idealAspect = 1,
  gap = 16,
  mobileClassName = '',
  minCellH = 240,
  fallbackRowH = 330,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [grid, setGrid] = useState<{ cols: number; rows: number }>({ cols: 0, rows: 0 });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const compute = () => {
      const isDesktop = typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches;
      if (!count || !isDesktop) { setGrid((p) => (p.cols === 0 ? p : { cols: 0, rows: 0 })); return; }
      const W = el.clientWidth;
      const H = el.clientHeight;
      if (W <= 0 || H <= 0) return;

      let best = { cols: 0, rows: 0, score: -Infinity, cellH: 0 };
      for (let c = 1; c <= count; c++) {
        const r = Math.ceil(count / c);
        const cw = (W - (c - 1) * gap) / c;
        const ch = (H - (r - 1) * gap) / r;
        if (cw <= 60 || ch <= 60) continue;
        const aspect = cw / ch;
        const dev = Math.abs(Math.log(aspect / idealAspect));
        const score = cw * ch * Math.exp(-dev * 1.1);
        if (score > best.score) best = { cols: c, rows: r, score, cellH: ch };
      }

      // Buňky by byly moc nízké (tablet) → fit nepoužij, přepni na rolování
      if (best.cols === 0 || best.cellH < minCellH) {
        setGrid((p) => (p.cols === 0 ? p : { cols: 0, rows: 0 }));
        return;
      }
      setGrid((p) => (p.cols === best.cols && p.rows === best.rows ? p : { cols: best.cols, rows: best.rows }));
    };

    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    window.addEventListener('resize', compute);
    return () => { ro.disconnect(); window.removeEventListener('resize', compute); };
  }, [count, gap, idealAspect, minCellH]);

  const fit = grid.cols > 0;

  return (
    <div ref={ref} className={`w-full h-full min-h-0 ${fit ? 'overflow-hidden' : 'overflow-y-auto hide-scrollbar'}`}>
      <div
        className={fit ? 'grid h-full' : `grid ${mobileClassName}`}
        style={fit ? {
          gridTemplateColumns: `repeat(${grid.cols}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${grid.rows}, minmax(0, 1fr))`,
          gap,
        } : {
          gridAutoRows: `${fallbackRowH}px`,
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default FitGrid;
