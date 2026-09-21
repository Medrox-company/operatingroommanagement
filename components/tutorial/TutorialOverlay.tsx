'use client';

import React, { useCallback, useMemo, useState } from 'react';
import {
  Activity, AlertTriangle, BarChart3, History,
  LineChart, Radar, Siren, SlidersHorizontal, TrendingUp,
} from 'lucide-react';
import { RoomStatus, type OperatingRoom } from '../../types';
import { TutorialProvider } from '../../contexts/TutorialContext';
import { useWorkflowStatusesContext } from '../../contexts/WorkflowStatusesContext';
import RoomCard from '../RoomCard';
import RoomDetail from '../RoomDetail';
import TimelineModule from '../TimelineModule';
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

/**
 * Kapitola Timeline běží nad SKUTEČNÝM modulem časové osy, ne nad náhradou.
 * Modul je jen zobrazovací (dostane sály a volitelné obnovení), takže se z něj
 * nedá nic zapsat — do nápovědy se pouští s ukázkovými sály.
 */
const TIMELINE_STEPS: Array<{
  id: string;
  target?: string;
  title: string;
  body: string | string[];
  action?: string;
  awaits?: 'tools-open' | 'tools-closed';
  padding?: number;
}> = [
  {
    id: 'canvas',
    target: '[data-tour="tl-canvas"]',
    title: 'Osa dne po sálech',
    body: [
      'Každý sál má vlastní dráhu, na které jsou barevně vynesené odpracované fáze.',
      'Délka úseku odpovídá skutečně naměřenému času, ne plánu — vzniká z fází, které personál posouvá na sálech.',
      'Mezery mezi úseky jsou prostoje. Když se opakují na stejném sále ve stejnou denní dobu, nejde o náhodu.',
    ],
    padding: 4,
  },
  {
    id: 'minimap',
    target: '[data-tour="tl-minimap"]',
    title: 'Minimapa dne',
    body: 'Zmenšený náhled celého dne nad osou. Slouží k rychlému přesunu — klepnutím nebo tažením '
      + 'se osa posune na zvolenou hodinu, aniž byste museli rolovat.',
    padding: 4,
  },
  {
    id: 'refresh',
    target: '[data-tour="tl-refresh"]',
    title: 'Živá data',
    body: 'Zelená tečka a čas ukazují, že data tečou průběžně. Osa se překresluje sama, jak personál '
      + 'posouvá fáze; tlačítko slouží jen k vynucenému obnovení.',
  },
  {
    id: 'history',
    target: '[data-tour="tl-history"]',
    title: 'Historie',
    body: 'Listování po dnech dozadu. Hodí se jako podklad na provozní schůzi — místo dohadů, kde se '
      + 'ztratil čas, ukážete konkrétní den a konkrétní fázi.',
  },
  {
    id: 'summary',
    target: '[data-tour="tl-summary"]',
    title: 'Živý provoz / denní souhrn',
    body: 'Přepínač mezi průběžným děním a souhrnem celého dne. Souhrn používá stejnou osu a zachovává '
      + 'pořadí sálů, takže se pohled nemění pod rukama.',
  },
  {
    id: 'density',
    target: '[data-tour="tl-density"]',
    title: 'Hustota řádků',
    body: 'Auto → Kompakt → Komfort. Na velkém velínském panelu se hodí Komfort, při dvaceti sálech '
      + 'naopak Kompakt, aby se všechny vešly bez rolování.',
  },
  {
    id: 'attention',
    target: '[data-tour="tl-attention"]',
    title: 'Triáž pozornosti',
    body: 'Jeden panel se vším, co právě vyžaduje reakci: stav nouze, přesah za směnu, dlouhá pauza, '
      + 'dlouho volaný pacient, infekční režim, uzamčený sál. Číslo na ikoně říká, kolik položek čeká. '
      + 'Tohle je první pohled po příchodu na velín.',
  },
  {
    id: 'tools-open',
    target: '[data-tour="tl-tools"]',
    title: 'Pokročilé nástroje',
    body: 'Pod tímto tlačítkem je pět analytických nástrojů. Všechny počítají z týchž dat jako osa — '
      + 'nic se nezadává ručně.',
    action: 'Otevřete nabídku Nástroje.',
    awaits: 'tools-open',
  },
  {
    id: 'tool-simulator',
    target: '[data-tour="tl-tool-simulator"]',
    title: 'Simulátor zpoždění',
    body: 'Model „co kdyby". Posuvníkem přidáte zpoždění běžícím operacím a okamžitě vidíte kaskádu: '
      + 'které sály spadnou do přesahu, o kolik naroste přesah ARO a kdy skončí poslední výkon. '
      + 'Hodí se dřív, než zavoláte na oddělení — voláte rovnou s návrhem řešení.',
    padding: 4,
  },
  {
    id: 'tool-forecast',
    target: '[data-tour="tl-tool-forecast"]',
    title: 'Prognóza kapacity',
    body: 'Z běžících výkonů spočítá vlnu vytížení do konce dne a předpoví, kdy se který sál uvolní. '
      + 'Upozorní na úzká hrdla — okamžiky, kdy se naráz uvolní víc sálů a nastane nápor na úklid a ARO. '
      + 'Odpoví na otázku, jestli se další výkon stihne do konce pracovní doby.',
    padding: 4,
  },
  {
    id: 'tool-optimizer',
    target: '[data-tour="tl-tool-optimizer"]',
    title: 'Optimalizace fází',
    body: 'Rozpad dnešních fází po sálech a porovnání s obvyklou dobou z nastavení statusů. U fází, '
      + 'které trvaly výrazně déle, navrhne, kde lze zrychlit — chirurgický výkon se záměrně nezkracuje. '
      + 'Nástroj měří, nehodnotí: delší fáze je otázka k prověření, ne výtka.',
    padding: 4,
  },
  {
    id: 'tool-fingerprint',
    target: '[data-tour="tl-tool-fingerprint"]',
    title: 'Fázový otisk',
    body: 'Radarový graf časového profilu sálu proti mediánu celého traktu. Sál „nafouklý" v některé ose '
      + 'je v dané fázi pomalejší než ostatní. Srovnávejte sály s podobnou skladbou výkonů, jinak uvidíte '
      + 'rozdíl oborů, ne rozdíl v organizaci.',
    padding: 4,
  },
  {
    id: 'tool-stats',
    target: '[data-tour="tl-tool-stats"]',
    title: 'Statistiky dne',
    body: 'Počet operací, průměrná délka výkonu a vytíženost traktu v probíhajícím dni. Průměr se během '
      + 'dne mění a ustálí se až po několika výkonech — dřív je spíš orientační.',
    padding: 4,
  },
  {
    id: 'tools-close',
    title: 'Zavření nabídky',
    body: 'Nabídku zavřete klepnutím mimo ni. Každý nástroj se otevírá jako samostatný panel nad osou '
      + 'a zavírá se křížkem.',
    action: 'Zavřete nabídku nástrojů.',
    awaits: 'tools-closed',
  },
  {
    id: 'legend',
    target: '[data-tour="tl-legend"]',
    title: 'Legenda',
    body: 'Vysvětlivky barev na ose: aktuální čas, pauza, sál vyžadující pozornost a nouzový stav. '
      + 'Barvy jednotlivých fází se řídí nastavením statusů, takže si je nemocnice určuje sama.',
  },
];


/**
 * Ukázkové sály pro kapitolu Timeline. Aby osa nebyla prázdná, dostane každý sál
 * odpracovanou historii fází od rána do teď. Jde o vymyšlená data — do databáze
 * se nezapisují a s reálnými sály nemají společné id.
 */
function createTimelineRooms(statuses: ReadonlyArray<{ id: string; name?: string; accent_color?: string }>): OperatingRoom[] {
  if (statuses.length === 0) return [];
  const now = Date.now();
  const startOfWork = new Date();
  startOfWork.setHours(7, 30, 0, 0);

  const plan = [
    { name: 'SÁL Č. 1', department: 'Ortopedie', minutes: [35, 20, 95, 15, 10, 20], step: 2 },
    { name: 'SÁL Č. 2', department: 'Chirurgie', minutes: [20, 15, 70, 12, 8, 18], step: 4, emergency: false },
    { name: 'TRAUMATOLOGIE - 1', department: 'Traumatologie', minutes: [45, 25, 120], step: 2, emergency: true },
    { name: 'ZÁKROKOVÝ SÁLEK', department: 'Jednodenní chirurgie', minutes: [25, 18, 40, 10], step: 3 },
  ];

  return plan.map((item, roomIndex) => {
    let cursor = startOfWork.getTime() + roomIndex * 6 * 60_000;
    const statusHistory = item.minutes.map((minutes, i) => {
      const index = Math.min(i, statuses.length - 1);
      const startedAt = new Date(cursor).toISOString();
      cursor += minutes * 60_000;
      return {
        stepIndex: index,
        startedAt,
        color: statuses[index]?.accent_color,
        stepName: statuses[index]?.name,
      };
    });
    const step = Math.min(item.step, statuses.length - 1);

    return {
      id: `tutorial-timeline-${roomIndex}`,
      name: item.name,
      department: item.department,
      status: RoomStatus.BUSY,
      queueCount: 0,
      operations24h: 1,
      currentStepIndex: step,
      staff: {
        doctor: { name: 'MUDr. Nováková', role: 'DOCTOR' as const },
        nurse: { name: 'Bc. Horáková', role: 'NURSE' as const },
      },
      isEmergency: Boolean(item.emergency),
      isLocked: false,
      isEnhancedHygiene: false,
      isPaused: false,
      phaseStartedAt: statusHistory[statusHistory.length - 1]?.startedAt,
      operationStartedAt: statusHistory[1]?.startedAt ?? statusHistory[0]?.startedAt,
      estimatedEndTime: new Date(now + (40 + roomIndex * 25) * 60_000).toISOString(),
      statusHistory,
      completedOperations: [],
    } satisfies OperatingRoom;
  });
}

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

  const demoTimelineRooms = useMemo(() => createTimelineRooms(statuses), [statuses]);

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
  const toolsMenuOpen = () => typeof document !== 'undefined'
    && Boolean(document.querySelector('[data-tour="tl-tool-simulator"]'));
  const staffPickerOpen = () => typeof document !== 'undefined'
    && Boolean(document.querySelector('[data-tour="staff-picker"]'));

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
      // Karta má dekorativní obrys přesahující vlastní box — zář ho musí obejmout.
      padding: 30,
    });

    list.push({
      id: 'orientation',
      scene: 'detail',
      chapter: CHAPTER.detail,
      target: '[data-tour="phase"]',
      title: 'Střed obrazovky: aktuální fáze',
      body: [
        'Velký kruh uprostřed ukazuje aktuální fázi sálu a uplynulý čas v ní.',
        'Vlevo je dokončená fáze, vpravo ta následující — obsluha vidí kontext bez hledání.',
        'Barva celé obrazovky se řídí barvou fáze z nastavení statusů, takže je stav čitelný i z dálky.',
        'Přechod do další fáze si vyzkoušíme za chvíli v kapitole Fáze výkonu.',
      ],
      padding: 14,
    });

    list.push({
      id: 'staff-doctor',
      scene: 'detail',
      chapter: CHAPTER.detail,
      target: '[data-tour="staff-doctor"]',
      title: 'Přihlášení lékaře',
      body: 'Personál se k sálu přihlašuje přímo tady. Klepnutím se otevře personální adresář.',
      action: 'Klepněte na dlaždici Lékař.',
      awaits: staffPickerOpen,
    });

    list.push({
      id: 'staff-doctor-pick',
      scene: 'detail',
      chapter: CHAPTER.detail,
      target: '[data-tour="staff-picker"]',
      title: 'Výběr z adresáře',
      body: [
        'U každého jména je vidět dostupnost i to, jestli pracovník už slouží na jiném sále.',
        'Seznam jde filtrovat hledáním; přednostně se nabízejí doporučení pracovníci.',
        'Přihlášený lékař se propíše do přehledu personálu i do statistik.',
      ],
      action: 'Vyberte ze seznamu anesteziologa.',
      awaits: () => Boolean(room.staff.doctor?.name),
      padding: 0,
    });

    list.push({
      id: 'staff-nurse',
      scene: 'detail',
      chapter: CHAPTER.detail,
      target: '[data-tour="staff-nurse"]',
      title: 'Přihlášení sestry',
      body: 'Totéž pro sestru. Dvojice lékař + sestra tvoří obsazení sálu; dokud některá '
        + 'role chybí, hlásí přehled personálu sál jako neobsazený.',
      action: 'Klepněte na dlaždici Sestra.',
      awaits: staffPickerOpen,
    });

    list.push({
      id: 'staff-nurse-pick',
      scene: 'detail',
      chapter: CHAPTER.detail,
      target: '[data-tour="staff-picker"]',
      title: 'Výběr sestry',
      body: 'Stejný adresář, jen filtrovaný na sestry. Výběrem se sál obsadí a v hlavičce '
        + 'detailu se objeví jméno.',
      action: 'Vyberte ze seznamu sestru.',
      awaits: () => Boolean(room.staff.nurse?.name),
      padding: 0,
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

    TIMELINE_STEPS.forEach(item => {
      list.push({
        id: `tl-${item.id}`,
        scene: 'timeline',
        chapter: CHAPTER.timeline,
        target: item.target,
        title: item.title,
        body: item.body,
        action: item.action,
        awaits: item.awaits === 'tools-open'
          ? toolsMenuOpen
          : item.awaits === 'tools-closed'
            ? () => !toolsMenuOpen()
            : undefined,
        padding: item.padding ?? 8,
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

  // Potvrzení přechodu otevřené mimo svůj krok (uživatel klepl na kruh dřív,
  // než na něj přišla řada) se zruší. Jinak zůstane viset přes obrazovku,
  // překryje cíl dalšího kroku a záře pak svítí na prázdné místo.
  React.useEffect(() => {
    if (!step || step.id.startsWith('confirm-')) return;
    const timer = window.setTimeout(() => {
      const cancel = document.querySelector('[data-tour="confirm-cancel"]') as HTMLElement | null;
      cancel?.click();
    }, 120);
    return () => window.clearTimeout(timer);
  }, [step]);

  // Když cíl kroku není vidět, osa se na něj posune.
  React.useEffect(() => {
    if (!step?.target) return;
    const element = document.querySelector(step.target);
    if (!element) return;
    const box = element.getBoundingClientRect();
    const visible = box.top >= 0 && box.bottom <= window.innerHeight;
    if (!visible) element.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [step]);

  return (
    <TutorialProvider value={{ isTutorial: true }}>
      {scene === 'stage' && (
        <div className="tut-stage">
          {/* Skutečná karta sálu z dashboardu, ne její napodobenina — uživatel
              má poznat přesně ten prvek, na který bude klikat v ostrém provozu. */}
          <div className="tut-stage-card" data-tour="demo-card" onClick={() => setDetailOpen(true)}>
            <RoomCard room={room} onClick={() => setDetailOpen(true)} />
          </div>
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
        <div className="tut-timeline-stage">
          <TimelineModule rooms={demoTimelineRooms} />
        </div>
      )}

      <GuidedTour steps={steps} index={index} onIndex={setIndex} onClose={onClose} />
    </TutorialProvider>
  );
}
