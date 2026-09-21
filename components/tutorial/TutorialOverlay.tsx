'use client';

import React, { useCallback, useMemo, useState } from 'react';
import {
  Activity, AlertTriangle, BarChart3, History,
  LineChart, Radar, Siren, SlidersHorizontal, TrendingUp,
} from 'lucide-react';
import { RoomStatus, type OperatingRoom } from '../../types';
import { TutorialProvider } from '../../contexts/TutorialContext';
import { useWorkflowStatusesContext } from '../../contexts/WorkflowStatusesContext';
import RoomDetail from '../RoomDetail';
import GuidedTour, { type TourStep } from './GuidedTour';
import './tutorial.css';

type Scene = 'stage' | 'detail' | 'timeline';
type Step = TourStep & { scene: Scene };

const CHAPTER = {
  start: 'Úvod',
  detail: 'Detail sálu',
  phases: 'Fáze výkonu',
  timeline: 'Timeline',
};

/** Vymyšlený sál. Nemá protějšek v databázi a nikam se neukládá. */
function createDemoRoom(): OperatingRoom {
  return {
    id: 'tutorial-demo-room',
    name: 'UKÁZKOVÝ SÁL',
    department: 'Nácvik obsluhy',
    status: RoomStatus.FREE,
    queueCount: 0,
    operations24h: 0,
    currentStepIndex: 0,
    staff: {
      doctor: { name: null, role: 'DOCTOR' },
      nurse: { name: null, role: 'NURSE' },
    },
    isEmergency: false,
    isLocked: false,
    isEnhancedHygiene: false,
    isPaused: false,
    patientCalledAt: null,
    patientArrivedAt: null,
    phaseStartedAt: new Date().toISOString(),
    statusHistory: [],
    completedOperations: [],
  };
}

const TIMELINE_CARDS = [
  {
    id: 'osa',
    icon: LineChart,
    title: 'Osa dne po sálech',
    text: 'Každý sál má vlastní dráhu, na které jsou barevně vynesené odpracované fáze. '
      + 'Délka úseku odpovídá skutečně naměřenému času, ne plánu. Svislá linka ukazuje '
      + 'aktuální čas, takže hned vidíte, co je za vámi a co teprve přijde.',
    tip: 'Praktické čtení: mezery mezi úseky jsou prostoje. Když se opakují na stejném sále ve stejnou denní dobu, nejde o náhodu, ale o systémovou chybu v návaznosti.'
  },
  {
    id: 'prognoza',
    icon: TrendingUp,
    title: 'Prognóza kapacity',
    text: 'Z běžících výkonů spočítá vlnu vytížení do konce dne. Plná část je realita, '
      + 'navazující projekce je předpověď. Ukáže, kdy se který sál uvolní, a upozorní na '
      + 'úzká hrdla — okamžiky, kdy se v krátkém okně uvolní víc sálů naráz a nastane nápor '
      + 'na úklid a ARO.',
    tip: 'Kdy se hodí: kolem poledne, když se rozhoduje o zařazení dalšího výkonu. Prognóza odpoví, jestli se stihne do konce pracovní doby, nebo spadne do ÚPS.'
  },
  {
    id: 'simulator',
    icon: SlidersHorizontal,
    title: 'Simulátor zpoždění',
    text: 'Model „co kdyby". Posuvníkem přidáte zpoždění běžícím operacím a okamžitě vidíte '
      + 'kaskádu: které sály spadnou do přesahu, o kolik naroste přesah ARO a kdy skončí '
      + 'poslední výkon. Nic se nikam nezapisuje — je to čistě rozhodovací pomůcka.',
    tip: 'Kdy se hodí: než zavoláte na oddělení, že se výkon protáhne. Uvidíte předem, koho všeho to zasáhne, a můžete volat rovnou s návrhem řešení.'
  },
  {
    id: 'optimalizace',
    icon: Activity,
    title: 'Optimalizace fází',
    text: 'Rozpad dnešních fází po sálech a porovnání s obvyklou dobou z nastavení statusů. '
      + 'U fází, které trvaly výrazně déle, navrhne, kde lze zrychlit. Chirurgický výkon '
      + 'se záměrně nezkracuje — zrychlovat se dá jen režie kolem něj.',
    tip: 'Na co si dát pozor: nástroj měří, ne hodnotí. Delší fáze může mít dobrý důvod — bere se jako otázka k prověření, ne jako výtka.'
  },
  {
    id: 'otisk',
    icon: Radar,
    title: 'Fázový otisk',
    text: 'Radarový graf časového profilu sálu proti mediánu celého traktu. Polygon sálu, '
      + 'který je v některé ose „nafouklý", je v dané fázi pomalejší než ostatní. Sály lze '
      + 'zapínat a vypínat a porovnávat mezi sebou.',
    tip: 'Praktické čtení: srovnávejte sály se stejnou skladbou výkonů. Radar dvou různých oborů proti sobě ukáže rozdíl oborů, ne rozdíl v organizaci.'
  },
  {
    id: 'triaz',
    icon: Siren,
    title: 'Triáž pozornosti',
    text: 'Jeden panel se vším, co právě vyžaduje reakci: stav nouze, přesah za směnu, '
      + 'dlouhá pauza, dlouho volaný pacient, infekční režim, uzamčený sál. Položky jsou '
      + 'seřazené podle naléhavosti, kritické pulzují.',
    tip: 'Kdy se hodí: první pohled po příchodu na velín a pak kdykoli během dne. Nahrazuje obcházení sálů a telefonáty „jak jste na tom".'
  },
  {
    id: 'aro',
    icon: AlertTriangle,
    title: 'ARO přesah',
    text: 'Časová osa přesahů za konec směny. Pro každý sál jedna dráha, červená lišta roste '
      + 'od konce směny k odhadovanému konci výkonu. Plná část je už uplynulý přesah, '
      + 'šrafovaná očekávaný zbytek.',
    tip: 'Na co si dát pozor: přesah roste z odhadu konce výkonu. Pokud ho personál na sále neupraví, hlásí se pozdě — proto je + a − v detailu sálu důležité.'
  },
  {
    id: 'statistiky',
    icon: BarChart3,
    title: 'Statistiky dne',
    text: 'Počet operací, průměrná délka výkonu a vytíženost traktu v probíhajícím dni. '
      + 'Čísla se přepočítávají průběžně, jak personál posouvá fáze.',
    tip: 'Praktické čtení: průměrná délka výkonu se během dne mění. Ustálí se až po několika výkonech, dřív je spíš orientační.'
  },
  {
    id: 'historie',
    icon: History,
    title: 'Historie',
    text: 'Zpětný pohled na uzavřené dny se stejným rozpadem fází. Slouží k rozborům — '
      + 'proč se konkrétní den nestihl program a kde se čas ztratil.',
    tip: 'Kdy se hodí: podklad na provozní schůzi. Místo dohadů, kde se ztratil čas, ukážete konkrétní den a konkrétní fázi.'
  },
];

interface TutorialOverlayProps {
  onClose: () => void;
  /** Vstupní krok — používá se pro odkaz na konkrétní část nápovědy. */
  initialStep?: number;
}

export default function TutorialOverlay({ onClose, initialStep = 0 }: TutorialOverlayProps) {
  const { workflowStatuses } = useWorkflowStatusesContext();
  const statuses = workflowStatuses || [];

  const [room, setRoom] = useState<OperatingRoom>(createDemoRoom);
  const [detailOpen, setDetailOpen] = useState(initialStep > 1);
  const [index, setIndex] = useState(initialStep);

  const patch = useCallback((changes: Partial<OperatingRoom>) => {
    setRoom(previous => ({ ...previous, ...changes }));
  }, []);

  // ── Obsluha ukázkového sálu — všechno jen v paměti ──────────────────
  const handleStepChange = useCallback((stepIndex: number, color?: string) => {
    setRoom(previous => ({
      ...previous,
      currentStepIndex: stepIndex,
      phaseStartedAt: new Date().toISOString(),
      statusHistory: [
        ...(previous.statusHistory ?? []),
        { stepIndex, startedAt: new Date().toISOString(), color, stepName: statuses[stepIndex]?.name },
      ],
      operationStartedAt: stepIndex === 1 ? new Date().toISOString() : previous.operationStartedAt,
    }));
  }, [statuses]);

  const handleStaffChange = useCallback((role: 'doctor' | 'nurse' | 'anesthesiologist', staffId: string, staffName: string) => {
    setRoom(previous => ({
      ...previous,
      staff: {
        ...previous.staff,
        [role]: {
          id: staffId || undefined,
          name: staffName || null,
          role: role === 'nurse' ? 'NURSE' : role === 'doctor' ? 'DOCTOR' : 'ANESTHESIOLOGIST',
        },
      },
    }));
  }, []);

  const confirmationOpen = () => typeof document !== 'undefined'
    && Boolean(document.querySelector('[data-tour="confirm-ok"]'));
  const notificationsOpen = () => typeof document !== 'undefined'
    && Boolean(document.querySelector('[data-tour="notification-panel"]'));

  // ── Scénář ──────────────────────────────────────────────────────────
  const steps = useMemo<Step[]>(() => {
    const list: Step[] = [];

    list.push({
      id: 'intro',
      scene: 'stage',
      chapter: CHAPTER.start,
      title: 'Interaktivní nápověda',
      body: 'Projdeme spolu celý provoz jednoho výkonu — od otevření sálu přes přihlášení '
        + 'personálu až po poslední fázi cyklu. Ovládáte to vy, žlutá záře vždy ukáže, kam '
        + 'klepnout. Pracujeme na vymyšleném sále, takže se nic nezapíše do databáze.',
    });

    list.push({
      id: 'open-detail',
      scene: 'stage',
      chapter: CHAPTER.start,
      target: '[data-tour="demo-card"]',
      title: 'Otevření detailu sálu',
      body: 'V přehledu sálů zastupuje každý sál jedna karta. Klepnutí na ni otevře detail — '
        + 'pracovní obrazovku, ze které personál sál celou dobu ovládá.',
      action: 'Klepněte na kartu ukázkového sálu.',
      awaits: () => detailOpen,
      demo: () => setDetailOpen(true),
      padding: 6,
    });

    list.push({
      id: 'orientation',
      scene: 'detail',
      chapter: CHAPTER.detail,
      target: '[data-tour="phase"]',
      title: 'Střed obrazovky: aktuální fáze',
      body: [
        'Velký kruh uprostřed je aktuální fáze sálu a zároveň tlačítko pro přechod do další.',
        'Vlevo je dokončená fáze, vpravo ta následující — obsluha vidí kontext bez hledání.',
        'Barva celé obrazovky se řídí barvou fáze z nastavení statusů, takže je stav čitelný i z dálky.',
      ],
      padding: 14,
    });

    list.push({
      id: 'staff-doctor',
      scene: 'detail',
      chapter: CHAPTER.detail,
      target: '[data-tour="staff-doctor"]',
      title: 'Přihlášení lékaře',
      body: 'Personál se k sálu přihlašuje přímo tady. Klepnutím se otevře adresář, ve kterém '
        + 'je vidět dostupnost i to, jestli už někdo slouží na jiném sále. Přihlášený lékař '
        + 'se pak propisuje do přehledu personálu i do statistik.',
      action: 'Klepněte na dlaždici Lékař a vyberte anesteziologa.',
      awaits: () => Boolean(room.staff.doctor?.name),
      demo: () => handleStaffChange('doctor', 'tutorial-doctor', 'MUDr. Nováková'),
    });

    list.push({
      id: 'staff-nurse',
      scene: 'detail',
      chapter: CHAPTER.detail,
      target: '[data-tour="staff-nurse"]',
      title: 'Přihlášení sestry',
      body: 'Totéž pro sestru. Dvojice lékař + sestra tvoří obsazení sálu; dokud některá '
        + 'role chybí, hlásí přehled personálu sál jako neobsazený.',
      action: 'Klepněte na dlaždici Sestra a vyberte pracovnici.',
      awaits: () => Boolean(room.staff.nurse?.name),
      demo: () => handleStaffChange('nurse', 'tutorial-nurse', 'Bc. Horáková'),
    });

    list.push({
      id: 'notify-open',
      scene: 'detail',
      chapter: CHAPTER.detail,
      target: '[data-tour="notifications"]',
      title: 'Notifikace — hlášení mimořádností',
      body: 'Zdržení se hlásí jedním klepnutím. Zpráva odejde nastaveným příjemcům a zároveň '
        + 'se založí do evidence, ze které pak čerpají statistiky a přehled dopadů.',
      action: 'Otevřete panel notifikací.',
      awaits: notificationsOpen,
    });

    list.push({
      id: 'notify-types',
      scene: 'detail',
      chapter: CHAPTER.detail,
      target: '[data-tour="notification-panel"]',
      title: 'Typy hlášení',
      body: [
        'Pozdní příchod chirurga a pozdní příchod anesteziologa.',
        'Nepřipravený pacient a pozdní příjezd z oddělení.',
        'Jiný důvod s vlastním popisem, když nic z nabídky nesedí.',
        'V nápovědě se zpráva nikam neodešle — můžete si klidně kteroukoli vyzkoušet.',
      ],
      padding: 0,
    });

    list.push({
      id: 'notify-close',
      scene: 'detail',
      chapter: CHAPTER.detail,
      title: 'Zavření panelu',
      body: 'Panel zavřete klepnutím mimo něj nebo křížkem. Vracíme se na sál.',
      action: 'Zavřete panel notifikací.',
      awaits: () => !notificationsOpen(),
    });

    list.push({
      id: 'call',
      scene: 'detail',
      chapter: CHAPTER.detail,
      target: '[data-tour="patient-call"]',
      title: 'Volání pacienta',
      body: 'Tlačítkem Volat sál požádá oddělení o pacienta. Od té chvíle běží na tlačítku '
        + 'stopky — je vidět, jak dlouho se na pacienta čeká, a ten čas se dá později doložit.',
      action: 'Klepněte na Volat.',
      awaits: () => Boolean(room.patientCalledAt),
      demo: () => patch({ patientCalledAt: new Date().toISOString() }),
    });

    list.push({
      id: 'arrived',
      scene: 'detail',
      chapter: CHAPTER.detail,
      target: '[data-tour="patient-arrived"]',
      title: 'Příjezd pacienta do traktu',
      body: 'Po dorazu pacienta se potvrdí příjezd. Systém si uloží dobu čekání od zavolání — '
        + 'z těchto intervalů se ve statistikách skládá obrázek o prostojích mezi výkony.',
      action: 'Potvrďte příjezd pacienta.',
      awaits: () => Boolean(room.patientArrivedAt),
      demo: () => patch({ patientArrivedAt: new Date().toISOString() }),
    });

    list.push({
      id: 'hygiene-on',
      scene: 'detail',
      chapter: CHAPTER.detail,
      target: '[data-tour="hygiene"]',
      title: 'Zvýšený hygienický režim',
      body: 'Režim pro infekčního pacienta. Po zapnutí se v hlavičce objeví výstražná karta '
        + '„Infekční pacient", aby si režimu všiml každý, kdo na sál vstoupí — a značka '
        + 'zůstává i na časové ose, takže je po výkonu dohledatelná.',
      action: 'Zapněte hygienický režim.',
      awaits: () => Boolean(room.isEnhancedHygiene),
      demo: () => patch({ isEnhancedHygiene: true, enhancedHygieneAt: new Date().toISOString() }),
    });

    list.push({
      id: 'hygiene-off',
      scene: 'detail',
      chapter: CHAPTER.detail,
      target: '[data-tour="hygiene"]',
      title: 'Vypnutí režimu',
      body: 'Stejným tlačítkem se režim vypíná. Doba, po kterou byl zapnutý, zůstává v evidenci.',
      action: 'Vypněte hygienický režim.',
      awaits: () => !room.isEnhancedHygiene,
      demo: () => patch({ isEnhancedHygiene: false }),
    });

    list.push({
      id: 'pause-on',
      scene: 'detail',
      chapter: CHAPTER.detail,
      target: '[data-tour="pause"]',
      title: 'Pauza',
      body: 'Pauza pozastaví měření fáze — používá se, když se výkon přeruší a čas by jinak '
        + 'zkresloval statistiku. Na tlačítku běží vlastní stopky délky pauzy.',
      action: 'Zapněte pauzu.',
      awaits: () => Boolean(room.isPaused),
      demo: () => patch({ isPaused: true, pausedAt: new Date().toISOString() }),
    });

    list.push({
      id: 'pause-off',
      scene: 'detail',
      chapter: CHAPTER.detail,
      target: '[data-tour="pause"]',
      title: 'Pokračování',
      body: 'Tlačítko se změní na Pokračovat. Po ukončení pauzy měření fáze běží dál a úsek '
        + 'pauzy zůstane vyznačený na časové ose.',
      action: 'Ukončete pauzu.',
      awaits: () => !room.isPaused,
      demo: () => patch({ isPaused: false, pausedAt: null }),
    });

    // ── Průchod všemi zapnutými statusy ───────────────────────────────
    const surgeryIndex = statuses.findIndex(status => (status.name || '')
      .toLocaleLowerCase('cs-CZ').includes('chirurg'));

    statuses.forEach((status, i) => {
      if (i === statuses.length - 1) return;
      const next = statuses[i + 1];

      list.push({
        id: `phase-${i}`,
        scene: 'detail',
        chapter: CHAPTER.phases,
        target: '[data-tour="phase"]',
        title: `${status.name} → ${next.name}`,
        body: `Sál je ve fázi „${status.name}". Klepnutím na kruh se ohlásí přechod do fáze `
          + `„${next.name}". Čas strávený v končící fázi se uloží — proto stačí klepnout `
          + 'v okamžiku, kdy se to na sále opravdu stane.',
        action: 'Klepněte na kruh aktuální fáze.',
        awaits: confirmationOpen,
        padding: 14,
      });

      list.push({
        id: `confirm-${i}`,
        scene: 'detail',
        chapter: CHAPTER.phases,
        target: '[data-tour="confirm-ok"]',
        title: 'Potvrzení přechodu',
        body: 'Mezikrok je pojistka proti omylu. Pokud je fáze podezřele krátká — kratší než '
          + 'pět minut a kratší než její obvyklá délka — objeví se navíc upozornění. '
          + 'Zrušením se nic nestane, sál zůstane v původní fázi.',
        action: 'Potvrďte přechod zeleným tlačítkem.',
        awaits: () => room.currentStepIndex === i + 1,
        padding: 12,
      });

      if (i === (surgeryIndex >= 0 ? surgeryIndex : 1)) {
        list.push({
          id: 'end-time',
          scene: 'detail',
          chapter: CHAPTER.phases,
          target: '[data-tour="time-plus"]',
          title: 'Odhad konce výkonu: + a −',
          body: [
            'Tlačítka pod kruhem posouvají předpokládaný konec výkonu po patnácti minutách.',
            'Odhad je to, z čeho počítá prognóza kapacity i upozornění na přesah — proto se '
              + 'vyplatí ho upravit hned, jak je jasné, že se výkon protáhne.',
            'Když odhad překročí konec pracovní doby sálu, systém výkon označí jako přesah '
              + 'do ÚPS a sál se objeví v přehledu ARO přesahů.',
          ],
          action: 'Zkuste odhad prodloužit tlačítkem +.',
          padding: 10,
        });
      }
    });

    list.push({
      id: 'cycle',
      scene: 'detail',
      chapter: CHAPTER.phases,
      target: '[data-tour="cycle"]',
      title: 'Průběh cyklu',
      body: 'Pruh u spodní hrany ukazuje celý cyklus — každý úsek je jedna zapnutá fáze. '
        + 'Aktivní úsek svítí barvou fáze, takže obsluha na jeden pohled vidí, kde v cyklu je. '
        + 'Skladbu i barvy fází si nemocnice nastavuje sama v Nastavení → Statusy.',
      padding: 10,
    });

    // ── Timeline ──────────────────────────────────────────────────────
    list.push({
      id: 'tl-intro',
      scene: 'timeline',
      chapter: CHAPTER.timeline,
      title: 'Modul Timeline',
      body: 'Zatímco detail sálu slouží obsluze, Timeline je pohled koordinátora: co se dnes '
        + 'stalo, co právě běží a co z toho plyne pro zbytek dne. Projdeme si postupně všechny '
        + 'jeho části.',
    });

    TIMELINE_CARDS.forEach(card => {
      list.push({
        id: `tl-${card.id}`,
        scene: 'timeline',
        chapter: CHAPTER.timeline,
        target: `#tut-tl-${card.id}`,
        title: card.title,
        body: card.tip,
        padding: 8,
      });
    });

    list.push({
      id: 'outro',
      scene: 'timeline',
      chapter: CHAPTER.timeline,
      title: 'To je pro dnešek vše',
      body: 'Prošli jsme obsluhu sálu i čtení časové osy. Nápovědu můžete kdykoli spustit '
        + 'znovu otazníkem vedle nadpisu Operační sály. Nic z toho, co jste právě udělali, '
        + 'se nezapsalo do databáze.',
    });

    return list;
  }, [detailOpen, handleStaffChange, patch, room, statuses]);

  const step = steps[Math.min(index, steps.length - 1)];
  const scene = step?.scene ?? 'stage';

  // Kapitola Timeline posouvá na svou kartu, aby na ni byla vidět záře.
  React.useEffect(() => {
    if (scene !== 'timeline' || !step?.target) return;
    const element = document.querySelector(step.target);
    element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [scene, step]);

  return (
    <TutorialProvider value={{ isTutorial: true }}>
      {scene === 'stage' && (
        <div className="tut-stage">
          <button type="button" className="tut-demo-card" data-tour="demo-card" onClick={() => setDetailOpen(true)}>
            <p className="tut-demo-kicker">Přehled sálů · ukázka</p>
            <p className="tut-demo-name">{room.name}</p>
            <p className="tut-demo-phase" style={{ color: statuses[0]?.accent_color || '#22D3EE' }}>
              <i style={{ background: statuses[0]?.accent_color || '#22D3EE' }} aria-hidden />
              {statuses[0]?.name || 'Sál připraven'}
            </p>
            <div className="tut-demo-grid">
              <div><span>Uplynulo</span><strong>—</strong></div>
              <div><span>Odhad konce</span><strong>—</strong></div>
            </div>
          </button>
        </div>
      )}

      {scene === 'detail' && detailOpen && (
        <RoomDetail
          room={room}
          allRooms={[room]}
          onClose={onClose}
          onStepChange={handleStepChange}
          onEndTimeChange={time => patch({ estimatedEndTime: time ? time.toISOString() : undefined })}
          onEnhancedHygieneToggle={enabled => patch({
            isEnhancedHygiene: enabled,
            enhancedHygieneAt: enabled ? new Date().toISOString() : null,
          })}
          onPauseChange={(paused, pausedAt) => patch({ isPaused: paused, pausedAt })}
          onStaffChange={handleStaffChange}
          onPatientStatusChange={(calledAt, arrivedAt) => patch({ patientCalledAt: calledAt, patientArrivedAt: arrivedAt })}
        />
      )}

      {scene === 'timeline' && (
        <div className="tut-timeline">
          <div className="tut-timeline-head">
            <p className="kicker">Modul</p>
            <h2>Timeline</h2>
            <p className="lead">
              Průběh celého dne na jedné obrazovce a nad ním nástroje, které z týchž dat
              počítají, co bude dál. Nic z toho se nezadává ručně — všechno vzniká z fází,
              které personál posouvá na sálech.
            </p>
          </div>
          <div className="tut-tl-grid">
            {TIMELINE_CARDS.map(card => {
              const Icon = card.icon;
              return (
                <article key={card.id} id={`tut-tl-${card.id}`} className="tut-tl-card">
                  <span className="tut-tl-icon" aria-hidden><Icon /></span>
                  <h3>{card.title}</h3>
                  <p>{card.text}</p>
                </article>
              );
            })}
          </div>
        </div>
      )}

      <GuidedTour steps={steps} index={index} onIndex={setIndex} onClose={onClose} />
    </TutorialProvider>
  );
}
