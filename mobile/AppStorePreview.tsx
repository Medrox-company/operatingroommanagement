import React, { useLayoutEffect } from 'react';
import {
  Activity,
  ArrowRight,
  BarChart3,
  Bell,
  CalendarDays,
  Check,
  ChevronLeft,
  Clock3,
  Home,
  Map,
  MoreHorizontal,
  Pause,
  Phone,
  Play,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Sun,
  UserRound,
  UsersRound,
} from 'lucide-react';
import './app-store-preview.css';

type PreviewScreen = 'overview' | 'detail' | 'spatial' | 'timeline' | 'statistics' | 'overview-light';

const SCREENS = new Set<PreviewScreen>([
  'overview',
  'detail',
  'spatial',
  'timeline',
  'statistics',
  'overview-light',
]);

const rooms = [
  { name: 'PCHO sál č. 2', phase: 'Chirurgický výkon', color: '#F02A70', elapsed: '01:24', end: '17:10' },
  { name: 'PCHO sál č. 1', phase: 'Příjezd na sál', color: '#5CA8FF', elapsed: '00:18', end: '16:40' },
  { name: 'PCHO sál č. 3', phase: 'Sál připraven', color: '#28D7B0', elapsed: '—', end: '—' },
  { name: 'Traumatologie 1', phase: 'Příjezd na sál', color: '#5CA8FF', elapsed: '00:42', end: '17:30' },
  { name: 'Sál č. 4', phase: 'Úklid sálu', color: '#A48BFF', elapsed: '00:12', end: '16:25' },
  { name: 'Gynekologie hlavní', phase: 'Sál připraven', color: '#28D7B0', elapsed: '—', end: '—' },
] as const;

function readScreen(): PreviewScreen {
  const value = new URLSearchParams(window.location.search).get('screen') as PreviewScreen | null;
  return value && SCREENS.has(value) ? value : 'overview';
}

function PreviewHeader({
  title,
  subtitle = 'Centrální sály · Liberec',
  back = false,
}: {
  title: string;
  subtitle?: string;
  back?: boolean;
}) {
  return (
    <header className="asp-header">
      <div className="asp-header-main">
        <div className="asp-title-wrap">
          {back && <ChevronLeft className="asp-back" aria-hidden />}
          <div>
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>
        </div>
        <div className="asp-header-actions" aria-hidden>
          <span><Sun /></span>
          <span className="asp-notification"><Bell /><i /></span>
        </div>
      </div>
    </header>
  );
}

function PreviewNav({ active }: { active: 'overview' | 'flow' | 'timeline' | 'statistics' | 'more' }) {
  const items = [
    ['overview', 'Přehled', Home, 'overview'],
    ['flow', 'Tok', Activity, 'spatial'],
    ['timeline', 'Rozpis', CalendarDays, 'timeline'],
    ['statistics', 'Statistiky', BarChart3, 'statistics'],
    ['more', 'Více', MoreHorizontal, 'detail'],
  ] as const;
  return (
    <nav className="asp-nav" aria-label="Náhled hlavní navigace">
      {items.map(([id, label, Icon, screen]) => (
        <a key={id} href={`?screen=${screen}`} aria-current={active === id ? 'page' : undefined}>
          <Icon aria-hidden />
          <span>{label}</span>
        </a>
      ))}
    </nav>
  );
}

function MetricStrip() {
  return (
    <section className="asp-metrics" aria-label="Souhrn sálů">
      <div><strong>15</strong><span>sálů</span></div>
      <div><strong>10</strong><span>aktivních</span></div>
      <div><strong>5</strong><span>připravených</span></div>
    </section>
  );
}

function RoomGrid() {
  return (
    <section className="asp-room-section">
      <header><span>Operační sály</span><strong>15</strong></header>
      <div className="asp-room-grid">
        {rooms.map((room, index) => (
          <article className="asp-room-card" key={room.name} style={{ '--room-color': room.color } as React.CSSProperties}>
            <div className="asp-room-copy">
              <h2>{room.name}</h2>
              <p><i />{room.phase}</p>
            </div>
            <div className="asp-room-times">
              <span><small>Uplynulo</small><b>{room.elapsed}</b></span>
              <span><small>Odhad konce</small><b>{room.end}</b></span>
            </div>
            <div className="asp-room-footer"><span>{index === 0 ? 'Probíhá výkon' : 'Detail sálu'}</span><ArrowRight /></div>
          </article>
        ))}
      </div>
    </section>
  );
}

function OverviewScreen() {
  return (
    <>
      <PreviewHeader title="Přehled sálů" />
      <main className="asp-content asp-overview">
        <div className="asp-overview-top">
          <MetricStrip />
          <div className="asp-date"><CalendarDays /><span>Úterý<strong>15. 9. 2026</strong></span></div>
        </div>
        <div className="asp-segments"><span className="is-active">Všechny</span><span>Aktivní</span><span>Připravené</span></div>
        <RoomGrid />
      </main>
      <PreviewNav active="overview" />
    </>
  );
}

const phases = ['Sál připraven', 'Příjezd na sál', 'Chirurgický výkon', 'Ukončení výkonu', 'Odjezd ze sálu', 'Úklid sálu'];

function DetailScreen() {
  return (
    <>
      <PreviewHeader title="PCHO sál č. 2" subtitle="Centrální sály · Liberec" back />
      <main className="asp-content asp-detail">
        <section className="asp-phase-card">
          <header><span>Aktuální fáze</span><b><i />3/6</b></header>
          <div className="asp-phase-title"><div><h2>Chirurgický výkon</h2><p>Uplynulo <strong>01:24</strong></p></div><button type="button" aria-label="Přejít na další fázi"><Play /></button></div>
          <div className="asp-phase-rail">
            {phases.map((phase, index) => <div key={phase} className={index < 2 ? 'is-done' : index === 2 ? 'is-current' : ''}><i>{index < 2 && <Check />}</i><span>{phase}</span></div>)}
          </div>
        </section>

        <section className="asp-detail-metrics">
          <article><Clock3 /><span>Uplynulý čas</span><strong>01:24</strong><small>Od 15:21</small></article>
          <article><Clock3 /><span>Odhad konce</span><strong>17:10</strong><small>Dle plánu</small></article>
        </section>

        <section className="asp-personnel">
          <header><h2>Personál</h2><strong>2 / 2</strong></header>
          <div><Stethoscope /><span><b>ARO lékař</b><small>Ukázkový lékař A</small></span><Check /></div>
          <div><UserRound /><span><b>ARO sestra</b><small>Ukázková sestra A</small></span><Check /></div>
        </section>

        <section className="asp-actions" aria-label="Rychlé akce">
          <button type="button"><Pause /><span>Pauza</span></button>
          <button type="button"><ShieldCheck /><span>Hygiena</span></button>
          <button type="button"><Phone /><span>Volat</span></button>
          <button type="button"><UsersRound /><span>Příjezd</span></button>
        </section>

        <button className="asp-primary" type="button"><span>Další fáze</span><small>Ukončení výkonu</small><ArrowRight /></button>
      </main>
      <PreviewNav active="more" />
    </>
  );
}

function SpatialScreen() {
  return (
    <>
      <PreviewHeader title="Operační blok" />
      <main className="asp-content asp-spatial">
        <div className="asp-view-tabs"><span>Karty</span><span className="is-active">3D pohled</span><span>Půdorys</span></div>
        <section className="asp-spatial-stage" aria-label="3D náhled operačního bloku">
          <div className="asp-building" aria-hidden>
            {rooms.map((room, index) => <div key={room.name} className={index === 0 ? 'is-selected' : ''}><span>{index < 3 ? `PCHO ${index + 1}` : `Sál ${index + 1}`}</span><i className="asp-table" /><i className="asp-lamp" /></div>)}
          </div>
          <div className="asp-orbit-hint"><Map />3D dispozice</div>
        </section>
        <section className="asp-selected-room">
          <header><div><span>Vybraný sál</span><h2>PCHO sál č. 2</h2></div><i /></header>
          <p>Chirurgický výkon</p>
          <div><span><small>Uplynulý čas</small><b>01:24</b></span><span><small>Odhad konce</small><b>17:10</b></span></div>
          <button type="button">Otevřít detail sálu <ArrowRight /></button>
        </section>
      </main>
      <PreviewNav active="flow" />
    </>
  );
}

const timelineRooms = [
  { name: 'PCHO sál č. 1', phase: 'Příjezd na sál', color: '#5CA8FF', bars: [[4, 23], [31, 29]] },
  { name: 'PCHO sál č. 2', phase: 'Chirurgický výkon', color: '#F02A70', bars: [[8, 18], [30, 43]] },
  { name: 'PCHO sál č. 3', phase: 'Sál připraven', color: '#28D7B0', bars: [[2, 28], [42, 18]] },
  { name: 'Traumatologie 1', phase: 'Úklid sálu', color: '#A48BFF', bars: [[17, 33], [61, 22]] },
] as const;

function TimelineScreen() {
  return (
    <>
      <PreviewHeader title="Rozpis" />
      <main className="asp-content asp-timeline">
        <section className="asp-timeline-kpis">
          <span><b>15</b>Sálů</span><span><b>10</b>Aktivních</span><span><b>5</b>Připravených</span><span><b>38</b>Výkonů</span>
        </section>
        <div className="asp-timeline-controls"><div className="asp-segments"><span>2 hodiny</span><span className="is-active">4 hodiny</span><span>Celý den</span></div><button type="button">Teď</button></div>
        <section className="asp-schedule">
          <header><div><h2>Časová osa</h2><p>15. září 2026</p></div><span><i /> Živě&nbsp; 16:45</span></header>
          <div className="asp-ruler"><span>14:00</span><span>15:00</span><span>16:00</span><span>17:00</span><span>18:00</span></div>
          <div className="asp-schedule-rows">
            {timelineRooms.map(room => <article key={room.name} style={{ '--timeline-color': room.color } as React.CSSProperties}>
              <div><h3>{room.name}</h3><p><i />{room.phase}</p></div>
              <div className="asp-track">{room.bars.map(([left, width], index) => <i key={index} style={{ left: `${left}%`, width: `${width}%` }} />)}<b /></div>
            </article>)}
          </div>
          <footer><span><i />Průběh</span><span><i />Odhad</span><span><i />Aktuální čas</span></footer>
        </section>
      </main>
      <PreviewNav active="timeline" />
    </>
  );
}

function StatisticsScreen() {
  const bars = [58, 76, 44, 88, 68, 92, 73];
  return (
    <>
      <PreviewHeader title="Statistiky" subtitle="Provozní přehled · Posledních 24 hodin" />
      <main className="asp-content asp-statistics">
        <div className="asp-stat-tabs"><span className="is-active">Přehled</span><span>Finance</span><span>Sály</span><span>Fáze</span></div>
        <section className="asp-stat-kpis">
          <article><span>Využití sálů</span><strong>78<small>%</small></strong><p><i />+6 % oproti včerejšku</p></article>
          <article><span>Dnešní výkony</span><strong>38<small>/ 52</small></strong><p><i />14 ještě v programu</p></article>
          <article><span>Průměrný obrat</span><strong>21<small> min</small></strong><p><i />v cílovém rozmezí</p></article>
        </section>
        <section className="asp-stat-main">
          <article className="asp-utilization">
            <div className="asp-stat-card-heading"><div><span>Vytížení</span><h2>Provoz operačních sálů</h2></div><b>15 sálů</b></div>
            <div className="asp-chart">
              {bars.map((height, index) => <span key={index}><i style={{ height: `${height}%` }} /><small>{['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'][index]}</small></span>)}
            </div>
          </article>
          <article className="asp-donut-card">
            <header><span>Aktuální stav</span><h2>Rozložení sálů</h2></header>
            <div className="asp-donut"><strong>15<small>sálů</small></strong></div>
            <ul><li><i />Aktivní <b>10</b></li><li><i />Připravené <b>4</b></li><li><i />Omezení <b>1</b></li></ul>
          </article>
        </section>
        <section className="asp-insight"><Sparkles /><div><strong>Plynulý provoz bez kritických omezení</strong><p>Všechna pracoviště jsou v cílovém provozním rozmezí.</p></div></section>
      </main>
      <PreviewNav active="statistics" />
    </>
  );
}

export default function AppStorePreview() {
  const screen = readScreen();
  const light = screen === 'overview-light' || new URLSearchParams(window.location.search).get('theme') === 'light';

  useLayoutEffect(() => {
    const html = document.documentElement;
    html.classList.add('app-store-preview');
    html.classList.toggle('m-dark', !light);
    document.body.dataset.appStorePreview = screen;
    return () => {
      html.classList.remove('app-store-preview');
      delete document.body.dataset.appStorePreview;
    };
  }, [light, screen]);

  return (
    <div className="asp-preview-root" data-screen={screen} data-theme={light ? 'light' : 'dark'}>
      <div className="asp-canvas">
        {(screen === 'overview' || screen === 'overview-light') && <OverviewScreen />}
        {screen === 'detail' && <DetailScreen />}
        {screen === 'spatial' && <SpatialScreen />}
        {screen === 'timeline' && <TimelineScreen />}
        {screen === 'statistics' && <StatisticsScreen />}
      </div>
    </div>
  );
}
