import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowLeft, ArrowRight, Hospital, LayoutGrid, Rows3 } from 'lucide-react';
import MobileRoomOverview from '../../components/mobile/MobileRoomOverview';
import { MobileThemeToggle } from '../../components/mobile/MobileShell';
import { RoomStatus, type OperatingRoom } from '../../types';
import { mobileRoomPhase, mobileElapsed, mobileEndTime } from '../../lib/mobile-room-display';
import { statuses } from './contexts';
import '../../app/globals.css';
import '../../components/mobile/mobile-room-detail.css';
import './preview.css';
const names = ['TRAUMATOLOGIE - 1','PCHO SÁL Č. 2','TRAUMATOLOGIE - 3','SÁL Č.4','SÁL Č. 5','DaVinci','SÁL Č.7','GYNEKOLOGIE HLAVNÍ','GYNEKOLOGIE ZÁKROKOVÝ','NEUROCHIRURGIE 1','ORTOPEDIE','COS NO SÁL Č.3','ORL-ÚČOCH-OČNÍ','ANGIOGRAFIE','EXTERNÍ ANESTEZIE'];
const initial = names.map((name, i): OperatingRoom => ({ id: `preview-${i}`, name, department: 'Centrální sály', status: RoomStatus.BUSY, queueCount: 0, operations24h: 0, staff: { doctor: { name: null, role: 'DOCTOR' }, nurse: { name: null, role: 'NURSE' } }, currentStepIndex: [2,2,1,0,4,3,0,1,0,2,2,0,4,5,0][i], operationStartedAt: new Date(Date.now() - (90-i*3)*60000).toISOString(), estimatedEndTime: new Date(Date.now()+(80+i*5)*60000).toISOString() }));
function Phone() {
 const [rooms,setRooms]=useState(initial),[selected,setSelected]=useState<string|null>(null);
 const room=rooms.find(r=>r.id===selected),phase=room?mobileRoomPhase(room,statuses):null;
 const change=(id:string,key:'isEmergency'|'isLocked')=>setRooms(list=>list.map(r=>r.id===id?{...r,[key]:!r[key]}:r));
 return <><div className="fixture-note">DESIGNOVÝ NÁHLED · UKÁZKOVÁ DATA</div>{room&&phase?<div className="fixture-detail">
   <header><button aria-label="Zpět na přehled" onClick={()=>setSelected(null)}><ArrowLeft size={19}/></button><span>Detail sálu · ukázka</span><MobileThemeToggle/></header>
   <h1>{room.name}</h1><p>Centrální sály</p>
   <section className="fixture-phase" style={{'--phase':phase.color} as React.CSSProperties}><span>AKTUÁLNÍ FÁZE</span><div className="fixture-ring" style={{borderColor:phase.color}}><Hospital size={28}/><h2>{phase.title}</h2><strong>{mobileElapsed(room.operationStartedAt,Date.now())}</strong></div><p>Fáze {room.currentStepIndex+1} z {statuses.length}</p></section>
   <div className="fixture-times"><span>Od začátku<strong>{mobileElapsed(room.operationStartedAt,Date.now())}</strong></span><span>Předpokládaný konec<strong>{mobileEndTime(room.estimatedEndTime)}</strong></span></div>
   <button className="fixture-next" onClick={()=>setRooms(list=>list.map(r=>r.id===room.id?{...r,currentStepIndex:(r.currentStepIndex+1)%statuses.length}:r))}>Vyzkoušet další fázi <ArrowRight size={18}/></button>
   <p className="fixture-disclaimer">Lokální ukázka. Žádné údaje se neposílají do nemocničního systému. Skutečný detail aplikace zachovává dosavadní klinické ovládání.</p>
 </div>:<main className="dashboard-module statistics-module"><MobileRoomOverview rooms={rooms} roomsLoaded onSelectRoom={setSelected} onEmergency={id=>change(id,'isEmergency')} onLock={id=>change(id,'isLocked')}/></main>}</>;
}
function Presentation(){return <main className="presentation"><header><span className="presentation-brand"><Hospital size={24}/>operatingroom<span>management</span></span><span>DESIGN STUDY / 01</span></header><section className="presentation-body"><div className="presentation-copy"><span className="eyebrow">KLIDNÝ PŘEHLED. JASNÉ INFORMACE.</span><h1>Každý sál.<br/>V jednom pohledu.</h1><p>Jemné barvy aktuální fáze, celé názvy a oba časy pohromadě. Vizuální styl Cliniq, přenesený do mobilního přehledu Operatingroom Management.</p><div className="presentation-features"><span><LayoutGrid/>Dva sály vedle sebe</span><span><Rows3/>Podélné boxy</span></div><p className="presentation-hint">Náhled je interaktivní: přepněte rozložení, vyberte filtr nebo otevřete sál. Podržení karty zobrazí rychlé akce.</p></div><div className="phone-frame"><iframe title="Mobilní Operatingroom Management" src="/?phone=1"/></div></section></main>}
createRoot(document.getElementById('root')!).render(new URLSearchParams(location.search).has('phone')?<Phone/>:<Presentation/>);
