import React, { useLayoutEffect, useRef, useState, ReactNode } from 'react';

/* ════════════════════════════════════════════════════════════════════════
   FitGrid — rozloží N prvků tak, aby se VŽDY vešly do dostupné plochy bez
   rolování (na desktopu). Spočítá optimální počet sloupců a řádků (maximalizuje
   velikost buňky při rozumném poměru stran) a buňky roztáhne na celou výšku.
   Na mobilu (< md) se vrací k běžné mřížce s rolováním (mobileClassName).
   Děti musí být h-full, aby vyplnily buňku.
   ════════════════════════════════════════════════════════════════════════ */

interface FitGridProps {
  count: number;
  children: ReactNode;
  idealAspect?: number; // šířka/výška cílové buňky
  gap?: number;         // px mezera (desktop)
  mobileClassName?: string; // třídy mřížky pro < md (s rolováním)
}

const FitGrid: React.FC<FitGridProps> = ({ count, children, idealAspect = 1, gap = 16, mobileClassName = '' }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [grid, setGrid] = useState<{ cols: number; rows: number }>({ cols: 0, rows: 0 });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const compute = () => {
      const isDesktop = typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches;
      if (!count || !isDesktop) { setGrid({ cols: 0, rows: 0 }); return; }
      const W = el.clientWidth;
      const H = el.clientHeight;
      if (W <= 0 || H <= 0) { setGrid({ cols: 0, rows: 0 }); return; }

      let best = { cols: Math.min(count, 6), rows: Math.ceil(count / Math.min(count, 6)), score: -Infinity };
      for (let c = 1; c <= count; c++) {
        const r = Math.ceil(count / c);
        const cw = (W - (c - 1) * gap) / c;
        const ch = (H - (r - 1) * gap) / r;
        if (cw <= 60 || ch <= 60) continue;
        const aspect = cw / ch;
        const dev = Math.abs(Math.log(aspect / idealAspect));
        const score = cw * ch * Math.exp(-dev * 1.1);
        if (score > best.score) best = { cols: c, rows: r, score };
      }
      setGrid({ cols: best.cols, rows: best.rows });
    };

    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    window.addEventListener('resize', compute);
    return () => { ro.disconnect(); window.removeEventListener('resize', compute); };
  }, [count, gap, idealAspect]);

  const fit = grid.cols > 0;

  return (
    <div ref={ref} className="w-full h-full min-h-0">
      <div
        className={fit ? 'grid h-full' : `grid ${mobileClassName}`}
        style={fit ? {
          gridTemplateColumns: `repeat(${grid.cols}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${grid.rows}, minmax(0, 1fr))`,
          gap,
        } : undefined}
      >
        {children}
      </div>
    </div>
  );
};

export default FitGrid;
