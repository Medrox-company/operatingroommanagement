'use client';

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Lock, MousePointerClick, X } from 'lucide-react';

export interface TourStep {
  id: string;
  /** Název kapitoly — zobrazuje se nad titulkem a v liště dole. */
  chapter: string;
  title: string;
  /** Výklad. Pole se vykreslí jako odrážky. */
  body: React.ReactNode | string[];
  /** CSS selektor cíle. Bez něj se karta zobrazí uprostřed obrazovky. */
  target?: string;
  /** Co má uživatel udělat. Bez toho se krok posouvá tlačítkem Další. */
  action?: string;
  /** Splněno? Krok se posune sám, jakmile podmínka nastane. */
  awaits?: () => boolean;
  /** Odsazení záře od cíle. */
  padding?: number;
  /** Přednostní strana karty vůči cíli. */
  placement?: 'left' | 'right' | 'top' | 'bottom';
}

interface Rect { top: number; left: number; width: number; height: number; radius: number; }

interface GuidedTourProps {
  steps: TourStep[];
  index: number;
  onIndex: (index: number) => void;
  onClose: () => void;
}

const CARD_W = 420;
/** Odhad výšky karty, než se změří ta skutečná. */
const CARD_FALLBACK_H = 240;
const GAP = 26;
/** Místo u spodní hrany pro lištu kapitol. */
const RAIL_H = 74;

/**
 * Označí cílový prvek třídou, která na něm vykreslí žlutý prstenec a vyzvedne
 * ho nad ztmavení. Dřív se prstenec kreslil na vlastní vrstvě podle
 * `getBoundingClientRect`, jenže detail sálu si svoje ovládání pozicuje tak,
 * že vypočtené souřadnice seděly na sousední tlačítko — zář pak svítila na
 * hygienický režim, i když karta mluvila o pauze. Prstenec přímo na prvku
 * nemůže minout.
 */
function useHighlightTarget(selector: string | undefined) {
  useEffect(() => {
    if (!selector) return;
    let current: HTMLElement | null = null;
    let frame = 0;
    let stop = false;

    const tick = () => {
      if (stop) return;
      // Stejný selektor může sedět na mobilní i desktopové variantě téhož
      // ovládání; bere se ta skutečně vykreslená.
      const found = (Array.from(document.querySelectorAll(selector)) as HTMLElement[])
        .find(node => {
          const box = node.getBoundingClientRect();
          return box.width > 0 && box.height > 0;
        }) ?? null;

      if (found !== current) {
        current?.classList.remove('tut-target');
        found?.classList.add('tut-target');
        current = found;
      }
      frame = window.requestAnimationFrame(tick);
    };

    tick();
    return () => {
      stop = true;
      window.cancelAnimationFrame(frame);
      current?.classList.remove('tut-target');
    };
  }, [selector]);
}

/** Sleduje pozici cíle — používá se jen pro umístění vysvětlující karty. */
function useTargetRect(selector: string | undefined, padding: number): Rect | null {
  const [rect, setRect] = useState<Rect | null>(null);

  useLayoutEffect(() => {
    // Při změně cíle se zář okamžitě zhasne. Bez toho by při přechodu na cíl,
    // který se ještě nevykreslil, zůstala svítit na prvku z minulého kroku —
    // karta pak mluvila o jednom tlačítku a zář ukazovala na jiné.
    setRect(null);
    if (!selector) return;
    let frame = 0;
    let stop = false;

    const measure = () => {
      if (stop) return;
      // Stejný selektor může sedět na mobilní i desktopové variantě téhož
      // ovládání. Skrytá varianta má nulovou plochu, proto se bere první
      // skutečně vykreslená.
      const candidates = Array.from(document.querySelectorAll(selector)) as HTMLElement[];
      const el = candidates.find(node => {
        const box = node.getBoundingClientRect();
        return box.width > 0 && box.height > 0;
      });

      if (el) {
        const box = el.getBoundingClientRect();
        // Záře kopíruje zaoblení cíle — kruhové tlačítko zůstane kruhem,
        // karta kartou. Bez toho by se z každého většího prvku stala tobolka.
        const raw = window.getComputedStyle(el).borderTopLeftRadius || '0';
        const own = raw.includes('%')
          ? Math.min(box.width, box.height) / 2
          : parseFloat(raw) || 0;
        const radius = own > Math.min(box.width, box.height) / 2 - 1
          ? Math.min(box.width, box.height) / 2 + padding
          : own + padding;

        setRect(previous => {
          const next = {
            top: box.top - padding,
            left: box.left - padding,
            width: box.width + padding * 2,
            height: box.height + padding * 2,
            radius,
          };
          if (previous
            && Math.abs(previous.radius - next.radius) < 0.5
            && Math.abs(previous.top - next.top) < 0.5
            && Math.abs(previous.left - next.left) < 0.5
            && Math.abs(previous.width - next.width) < 0.5
            && Math.abs(previous.height - next.height) < 0.5) return previous;
          return next;
        });
      } else {
        setRect(null);
      }
      frame = window.requestAnimationFrame(measure);
    };

    measure();
    return () => { stop = true; window.cancelAnimationFrame(frame); };
  }, [selector, padding]);

  return rect;
}

/** Karta se umístí tam, kde nezakryje cíl a celá se vejde do okna. */
function placeCard(rect: Rect | null, cardH: number, preferred?: TourStep['placement']) {
  if (typeof window === 'undefined') return { top: 0, left: 0 };
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  // Karta se nesmí dostat pod spodní hranu ani pod lištu kapitol.
  const minTop = GAP;
  const maxTop = Math.max(minTop, vh - cardH - GAP - RAIL_H);
  const clamp = (top: number, left: number) => ({
    top: Math.min(Math.max(minTop, top), maxTop),
    left: Math.min(Math.max(GAP, left), Math.max(GAP, vw - CARD_W - GAP)),
  });

  if (!rect) return clamp(vh / 2 - cardH / 2, vw / 2 - CARD_W / 2);

  const space = {
    right: vw - (rect.left + rect.width),
    left: rect.left,
    bottom: vh - (rect.top + rect.height) - RAIL_H,
    top: rect.top,
  };
  const order: Array<'right' | 'left' | 'bottom' | 'top'> = preferred
    ? ([preferred, 'right', 'left', 'bottom', 'top'] as const)
      .filter((value, i, all) => all.indexOf(value) === i) as never
    : (['right', 'left', 'bottom', 'top'] as const)
      .slice()
      .sort((a, b) => space[b] - space[a]);

  const side = order.find(candidate => (
    (candidate === 'right' || candidate === 'left')
      ? space[candidate] >= CARD_W + GAP
      : space[candidate] >= cardH + GAP
  )) ?? order[0];

  if (side === 'right') return clamp(rect.top + rect.height / 2 - cardH / 2, rect.left + rect.width + GAP);
  if (side === 'left') return clamp(rect.top + rect.height / 2 - cardH / 2, rect.left - CARD_W - GAP);
  if (side === 'bottom') return clamp(rect.top + rect.height + GAP, rect.left + rect.width / 2 - CARD_W / 2);
  return clamp(rect.top - cardH - GAP, rect.left + rect.width / 2 - CARD_W / 2);
}

export default function GuidedTour({ steps, index, onIndex, onClose }: GuidedTourProps) {
  const step = steps[index];
  const rect = useTargetRect(step?.target, step?.padding ?? 10);
  useHighlightTarget(step?.target);
  // Karta se měří, ne odhaduje — text má proměnlivou délku a při odhadu
  // vyšší karta přetekla přes spodní hranu obrazovky.
  const cardRef = useRef<HTMLDivElement>(null);
  const furthestRef = useRef(0);
  const [cardH, setCardH] = useState(CARD_FALLBACK_H);

  useLayoutEffect(() => {
    const el = cardRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const update = () => setCardH(el.getBoundingClientRect().height || CARD_FALLBACK_H);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [index]);
  const isLast = index === steps.length - 1;

  // Čekání na akci: krok se posune sám, ale jen když podmínka v okamžiku
  // vstupu do kroku ještě neplatila. Jinak by se přeskočil hned po zobrazení.
  const [armed, setArmed] = useState(false);
  const [satisfied, setSatisfied] = useState(false);

  useEffect(() => {
    setSatisfied(false);
    setArmed(step?.awaits ? !step.awaits() : false);
  }, [step]);

  useEffect(() => {
    if (!step?.awaits || !armed || satisfied) return;
    const timer = window.setInterval(() => {
      if (step.awaits?.()) setSatisfied(true);
    }, 120);
    return () => window.clearInterval(timer);
  }, [step, armed, satisfied]);

  // Klávesnice i lišta kapitol musí znát, jestli krok čeká na akci. Ref proto,
  // že efekt s posluchačem kláves se kvůli tomu nemá znovu navazovat.
  const blockedRef = useRef(false);

  const goNext = useCallback(() => {
    if (isLast) onClose();
    else onIndex(index + 1);
  }, [index, isLast, onClose, onIndex]);

  useEffect(() => {
    if (!satisfied) return;
    const timer = window.setTimeout(goNext, 780);
    return () => window.clearTimeout(timer);
  }, [satisfied, goNext]);

  // Cíl, který v daném rozložení neexistuje (prvek schovaný na úzké obrazovce,
  // vypnutý modul), se přeskočí — místo karty uprostřed prázdné obrazovky.
  useEffect(() => {
    if (!step?.target || rect) return;
    const timer = window.setTimeout(() => {
      const visible = Array.from(document.querySelectorAll(step.target as string))
        .some(node => {
          const box = (node as HTMLElement).getBoundingClientRect();
          return box.width > 0 && box.height > 0;
        });
      if (!visible) goNext();
    }, 1400);
    return () => window.clearTimeout(timer);
  }, [step, rect, goNext]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { onClose(); return; }
      if (event.key === 'ArrowRight') { event.preventDefault(); if (!blockedRef.current) goNext(); }
      if (event.key === 'ArrowLeft' && index > 0) { event.preventDefault(); onIndex(index - 1); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [goNext, index, onClose, onIndex]);

  if (!step) return null;

  const waiting = Boolean(step.awaits) && armed && !satisfied;
  blockedRef.current = waiting;
  // Cíl přes celou obrazovku (otevřený adresář personálu, panel notifikací)
  // se nezvýrazňuje — ztmavení by ho překrylo a rámeček by lemoval celé okno.
  // Zůstane jen vysvětlující karta a panel je plně čitelný.
  const fullScreenTarget = Boolean(rect)
    && rect.width >= window.innerWidth * 0.92
    && rect.height >= window.innerHeight * 0.92;
  const spot = fullScreenTarget ? null : rect;
  const position = placeCard(spot, cardH, step.placement);
  const chapters = steps.reduce<string[]>((list, item) => (
    list.includes(item.chapter) ? list : [...list, item.chapter]
  ), []);
  // Nejdál dosažený krok — dopředu se v liště kapitol skákat nedá.
  const reached = Math.max(index, furthestRef.current);
  furthestRef.current = reached;

  return (
    <div className="tut-root" role="region" aria-label="Interaktivní nápověda">
      {!fullScreenTarget && <div className="tut-veil" />}

      <button type="button" className="tut-close" onClick={onClose}>
        <X aria-hidden /> Ukončit nápovědu
      </button>

      <div
        ref={cardRef}
        className={spot ? 'tut-card' : 'tut-card tut-card--corner'}
        style={spot ? { top: position.top, left: position.left } : undefined}
        role="dialog"
        aria-live="polite"
        aria-label={step.title}
      >
        <div className="tut-card-top">
          <span className="tut-chapter"><i aria-hidden />{step.chapter}</span>
          <span className="tut-count">{index + 1} / {steps.length}</span>
        </div>

        <h3>{step.title}</h3>

        {Array.isArray(step.body)
          ? <ul className="tut-list">{step.body.map((line, i) => <li key={i}>{line}</li>)}</ul>
          : <p>{step.body}</p>}

        {step.action && (
          <div className={satisfied ? 'tut-do tut-done' : 'tut-do'}>
            {satisfied ? <Check aria-hidden /> : <MousePointerClick aria-hidden />}
            <span>{satisfied ? 'Hotovo — pokračujeme dál.' : step.action}</span>
          </div>
        )}

        <div className="tut-actions">
          <button
            type="button"
            className="tut-btn tut-btn--ghost"
            onClick={() => onIndex(index - 1)}
            disabled={index === 0}
          >
            <ArrowLeft aria-hidden /> Zpět
          </button>
          <span className="tut-spacer" />
          {/* Krok s úkolem se nedá obejít — nápověda se posune, až ho uživatel
              opravdu provede. Tlačítko proto zůstává zamčené. */}
          <button
            type="button"
            className="tut-btn tut-btn--primary"
            onClick={goNext}
            disabled={waiting}
            title={waiting ? 'Nejdřív proveďte úkol z nápovědy' : undefined}
          >
            {waiting ? 'Čekám na vás' : isLast ? 'Dokončit' : 'Další'}
            {waiting ? <Lock aria-hidden /> : isLast ? <Check aria-hidden /> : <ArrowRight aria-hidden />}
          </button>
        </div>
      </div>

      <nav className="tut-rail" aria-label="Kapitoly nápovědy">
        {chapters.map(chapter => {
          const first = steps.findIndex(item => item.chapter === chapter);
          const unlocked = first <= reached;
          return (
            <button
              key={chapter}
              type="button"
              data-active={chapter === step.chapter ? 'true' : undefined}
              data-locked={unlocked ? undefined : 'true'}
              disabled={!unlocked}
              title={unlocked ? undefined : 'Kapitola se odemkne, až sem nápověda dojde'}
              onClick={() => onIndex(first)}
            >
              {chapter}
            </button>
          );
        })}
        <span className="tut-rail-progress">{index + 1}/{steps.length}</span>
      </nav>
    </div>
  );
}
