import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

// Create PDF document
const doc = new PDFDocument({
  size: 'A4',
  margins: { top: 50, bottom: 50, left: 50, right: 50 },
  info: {
    Title: 'Operating Room Management System - Dokumentace',
    Author: 'v0 AI',
    Subject: 'Kompletní technická a uživatelská dokumentace',
    CreatedDate: new Date(),
  }
});

// Output path
const outputPath = path.join(process.cwd(), 'public', 'documentation.pdf');

// Ensure public directory exists
if (!fs.existsSync(path.join(process.cwd(), 'public'))) {
  fs.mkdirSync(path.join(process.cwd(), 'public'), { recursive: true });
}

// Pipe to file
const stream = fs.createWriteStream(outputPath);
doc.pipe(stream);

// Colors
const colors = {
  primary: '#3B82F6',
  secondary: '#6B7280',
  accent: '#10B981',
  danger: '#EF4444',
  warning: '#F59E0B',
  text: '#1F2937',
  muted: '#6B7280',
  heading: '#111827',
};

// Helper functions
function addTitle(text: string, size = 24) {
  doc.fontSize(size).fillColor(colors.heading).font('Helvetica-Bold').text(text, { align: 'center' });
  doc.moveDown(0.5);
}

function addHeading(text: string, level = 1) {
  const sizes = { 1: 18, 2: 14, 3: 12 };
  doc.fontSize(sizes[level as keyof typeof sizes] || 14).fillColor(colors.primary).font('Helvetica-Bold').text(text);
  doc.moveDown(0.3);
}

function addSubheading(text: string) {
  doc.fontSize(12).fillColor(colors.secondary).font('Helvetica-Bold').text(text);
  doc.moveDown(0.2);
}

function addParagraph(text: string) {
  doc.fontSize(10).fillColor(colors.text).font('Helvetica').text(text, { align: 'justify', lineGap: 2 });
  doc.moveDown(0.5);
}

function addBullet(text: string, indent = 0) {
  const x = doc.x + indent;
  doc.fontSize(10).fillColor(colors.text).font('Helvetica').text(`• ${text}`, x, doc.y, { indent: 10 });
  doc.moveDown(0.2);
}

function addNumberedItem(num: number, text: string) {
  doc.fontSize(10).fillColor(colors.text).font('Helvetica').text(`${num}. ${text}`, { indent: 15 });
  doc.moveDown(0.2);
}

function addCodeBlock(code: string) {
  doc.fontSize(9).fillColor('#374151').font('Courier').text(code, { indent: 20 });
  doc.moveDown(0.5);
}

function addTable(headers: string[], rows: string[][]) {
  const colWidth = (doc.page.width - 100) / headers.length;
  const startX = 50;
  let y = doc.y;
  
  // Headers
  doc.fontSize(9).font('Helvetica-Bold').fillColor(colors.primary);
  headers.forEach((header, i) => {
    doc.text(header, startX + i * colWidth, y, { width: colWidth - 5, align: 'left' });
  });
  y += 15;
  
  // Rows
  doc.font('Helvetica').fillColor(colors.text);
  rows.forEach(row => {
    const maxHeight = Math.max(...row.map(cell => doc.heightOfString(cell, { width: colWidth - 5 })));
    row.forEach((cell, i) => {
      doc.text(cell, startX + i * colWidth, y, { width: colWidth - 5, align: 'left' });
    });
    y += maxHeight + 5;
  });
  
  doc.y = y + 10;
}

function addSeparator() {
  doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).stroke(colors.muted);
  doc.moveDown(1);
}

function addPageBreak() {
  doc.addPage();
}

// ============================================================================
// TITULNÍ STRANA
// ============================================================================
doc.fontSize(32).fillColor(colors.primary).font('Helvetica-Bold').text('Operating Room', { align: 'center' });
doc.fontSize(32).text('Management System', { align: 'center' });
doc.moveDown(2);
doc.fontSize(16).fillColor(colors.secondary).font('Helvetica').text('Kompletní technická a uživatelská dokumentace', { align: 'center' });
doc.moveDown(4);
doc.fontSize(12).fillColor(colors.muted).text('Verze: 1.0.0', { align: 'center' });
doc.text(`Datum: ${new Date().toLocaleDateString('cs-CZ')}`, { align: 'center' });
doc.moveDown(8);
doc.fontSize(10).text('Systém pro správu operačních sálů nemocnice', { align: 'center' });
doc.text('Real-time monitoring, workflow management, statistiky a notifikace', { align: 'center' });

// ============================================================================
// OBSAH
// ============================================================================
addPageBreak();
addTitle('Obsah', 20);
doc.moveDown(1);

const tocItems = [
  { title: '1. Úvod a přehled systému', page: 3 },
  { title: '2. Architektura aplikace', page: 4 },
  { title: '3. Databázová struktura', page: 6 },
  { title: '4. Hlavní moduly', page: 9 },
  { title: '   4.1 Dashboard (Přehled sálů)', page: 9 },
  { title: '   4.2 Timeline modul', page: 11 },
  { title: '   4.3 Statistiky', page: 12 },
  { title: '   4.4 Správa personálu', page: 14 },
  { title: '   4.5 Nastavení', page: 15 },
  { title: '5. Workflow operačního sálu', page: 17 },
  { title: '6. Notifikační systém', page: 19 },
  { title: '7. Real-time synchronizace', page: 21 },
  { title: '8. Autentizace a autorizace', page: 22 },
  { title: '9. API Reference', page: 24 },
  { title: '10. Typy a rozhraní', page: 26 },
  { title: '11. Konfigurace a nasazení', page: 28 },
  { title: '12. Řešení problémů', page: 30 },
];

tocItems.forEach(item => {
  doc.fontSize(11).fillColor(colors.text).font('Helvetica').text(item.title);
  doc.moveDown(0.3);
});

// ============================================================================
// 1. ÚVOD A PŘEHLED SYSTÉMU
// ============================================================================
addPageBreak();
addHeading('1. Úvod a přehled systému');
addSeparator();

addParagraph('Operating Room Management System (ORMS) je komplexní webová aplikace určená pro správu a monitoring operačních sálů v nemocničním prostředí. Systém poskytuje real-time přehled o stavu všech operačních sálů, workflow operací, personálu a umožňuje odesílání notifikací vedení.');

addSubheading('1.1 Hlavní funkce systému');
addBullet('Real-time monitoring stavu operačních sálů');
addBullet('8-krokový workflow operačního procesu');
addBullet('Timeline vizualizace průběhu operací');
addBullet('Statistiky a analýzy využití sálů');
addBullet('Správa personálu (lékaři, sestry, anesteziologové)');
addBullet('Emailové notifikace vedení');
addBullet('Konfigurovatelné pracovní hodiny pro každý sál');
addBullet('Podpora pro emergency a septické sály');
doc.moveDown(0.5);

addSubheading('1.2 Technologický stack');
addBullet('Frontend: React 18+ s TypeScript');
addBullet('Framework: Next.js 15 (App Router)');
addBullet('Styling: Tailwind CSS 3.4+');
addBullet('UI komponenty: shadcn/ui + Radix UI');
addBullet('Animace: Framer Motion');
addBullet('Grafy: Recharts');
addBullet('Backend: Supabase (PostgreSQL + Realtime)');
addBullet('Email: Resend API');
addBullet('Deployment: Vercel');
doc.moveDown(0.5);

addSubheading('1.3 Cílová skupina');
addParagraph('Systém je určen pro:');
addBullet('Operační sestry a instrumentářky');
addBullet('Vedení operačního traktu');
addBullet('Lékaře a anesteziology');
addBullet('Nemocniční management');

// ============================================================================
// 2. ARCHITEKTURA APLIKACE
// ============================================================================
addPageBreak();
addHeading('2. Architektura aplikace');
addSeparator();

addSubheading('2.1 Adresářová struktura');
addCodeBlock(`
/vercel/share/v0-project/
├── app/                          # Next.js App Router
│   ├── api/                      # API endpoints
│   │   ├── management-contacts/  # Správa kontaktů vedení
│   │   ├── operating-rooms/      # CRUD operačních sálů
│   │   ├── rooms/                # Načítání sálů
│   │   ├── send-notification/    # Odesílání notifikací
│   │   └── workflow-statuses/    # Správa workflow statusů
│   ├── email-preview/            # Náhled emailových šablon
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Hlavní stránka
├── components/                   # React komponenty
│   ├── AdminModule.tsx           # Administrační modul
│   ├── AnimatedCounter.tsx       # Animovaný čítač
│   ├── BackgroundManager.tsx     # Správa pozadí
│   ├── DepartmentsManager.tsx    # Správa oddělení
│   ├── EmailTemplate.tsx         # Emailová šablona
│   ├── LoginPage.tsx             # Přihlašovací stránka
│   ├── NotificationOverlay.tsx   # Overlay pro notifikace
│   ├── OperatingRoomsManager.tsx # Správa operačních sálů
│   ├── RoomCard.tsx              # Karta operačního sálu
│   ├── RoomDetail.tsx            # Detail operačního sálu
│   ├── ScheduleManager.tsx       # Správa rozvrhu
│   ├── SettingsPage.tsx          # Stránka nastavení
│   ├── Sidebar.tsx               # Boční navigace
│   ├── StaffManager.tsx          # Správa personálu
│   ├── StatisticsModule.tsx      # Modul statistik
│   ├── StatusesManager.tsx       # Správa workflow statusů
│   ├── TimelineModule.tsx        # Timeline modul
│   └── TopBar.tsx                # Horní lišta
├── contexts/                     # React kontexty
│   ├── AuthContext.tsx           # Autentizační kontext
│   └── WorkflowStatusesContext.tsx # Workflow kontext
├── hooks/                        # Custom hooks
│   ├── useEmailNotifications.ts  # Hook pro notifikace
│   ├── useEmergencyAlert.ts      # Hook pro emergency zvuk
│   ├── useRealtimeSubscription.ts # Realtime subscription
│   └── useWorkflowStatuses.ts    # Workflow statusy
├── lib/                          # Utility knihovny
│   ├── db.ts                     # Databázové operace
│   ├── email.ts                  # Email funkce
│   ├── realtime-notifications.ts # Realtime notifikace
│   └── supabase.ts               # Supabase klient
├── types.ts                      # TypeScript typy
├── constants.ts                  # Konstanty aplikace
└── App.tsx                       # Hlavní App komponenta
`);

addSubheading('2.2 Architektonické vzory');
addParagraph('Aplikace využívá následující architektonické vzory:');
addBullet('Component-Based Architecture - UI je rozděleno do znovupoužitelných komponent');
addBullet('Context API - Globální stav (autentizace, workflow) je spravován přes React Context');
addBullet('Custom Hooks - Logika je extrahována do znovupoužitelných hooks');
addBullet('Optimistic Updates - UI se aktualizuje okamžitě před potvrzením ze serveru');
addBullet('Real-time Sync - Změny jsou synchronizovány mezi klienty přes Supabase Realtime');

// ============================================================================
// 3. DATABÁZOVÁ STRUKTURA
// ============================================================================
addPageBreak();
addHeading('3. Databázová struktura');
addSeparator();

addParagraph('Systém využívá PostgreSQL databázi hostovanou na Supabase. Všechny tabulky mají aktivní Row Level Security (RLS) pro zabezpečení dat.');

addSubheading('3.1 Hlavní tabulky');
doc.moveDown(0.5);

addHeading('operating_rooms', 3);
addParagraph('Hlavní tabulka pro operační sály. Obsahuje aktuální stav, personál a workflow informace.');
addTable(
  ['Sloupec', 'Typ', 'Popis'],
  [
    ['id', 'text', 'Unikátní identifikátor sálu'],
    ['name', 'text', 'Název sálu (např. "Sál č. 1")'],
    ['department', 'text', 'Oddělení (TRA, CHIR, URO, ...)'],
    ['status', 'text', 'Aktuální stav (FREE, BUSY, CLEANING, MAINTENANCE)'],
    ['current_step_index', 'integer', 'Index aktuální fáze workflow (0-7)'],
    ['is_emergency', 'boolean', 'Zda je sál v emergency režimu'],
    ['is_locked', 'boolean', 'Zda je sál uzamčen'],
    ['is_paused', 'boolean', 'Zda je operace pozastavena'],
    ['is_septic', 'boolean', 'Zda je sál septický'],
    ['weekly_schedule', 'jsonb', 'Týdenní rozvrh pracovní doby'],
    ['operations_24h', 'integer', 'Počet operací za posledních 24h'],
    ['queue_count', 'integer', 'Počet pacientů ve frontě'],
    ['doctor_id', 'text', 'FK na tabulku staff - lékař'],
    ['nurse_id', 'text', 'FK na tabulku staff - sestra'],
    ['anesthesiologist_id', 'text', 'FK na tabulku staff - anesteziolog'],
    ['phase_started_at', 'timestamp', 'Začátek aktuální fáze'],
    ['operation_started_at', 'timestamp', 'Začátek operace'],
    ['patient_called_at', 'timestamp', 'Kdy byl pacient zavolán'],
    ['patient_arrived_at', 'timestamp', 'Kdy pacient přijel'],
    ['status_history', 'jsonb', 'Historie změn statusů'],
    ['completed_operations', 'jsonb', 'Dokončené operace'],
  ]
);

addPageBreak();
addHeading('staff', 3);
addParagraph('Tabulka pro správu personálu - lékaři, sestry, anesteziologové.');
addTable(
  ['Sloupec', 'Typ', 'Popis'],
  [
    ['id', 'text', 'Unikátní identifikátor'],
    ['name', 'text', 'Jméno pracovníka'],
    ['role', 'text', 'Role (DOCTOR, NURSE, ANESTHESIOLOGIST)'],
    ['skill_level', 'text', 'Úroveň dovedností (L3, L2, L1, A, SR, N, S)'],
    ['availability', 'integer', 'Dostupnost (0-100%)'],
    ['is_active', 'boolean', 'Zda je aktivní'],
    ['is_external', 'boolean', 'Zda je externí pracovník'],
    ['is_recommended', 'boolean', 'Zda je doporučený'],
    ['sick_leave_days', 'integer', 'Dny nemocenské'],
    ['vacation_days', 'integer', 'Dny dovolené'],
    ['notes', 'text', 'Poznámky'],
  ]
);

addHeading('room_status_history', 3);
addParagraph('Tabulka pro historii změn stavů sálů. Používá se pro statistiky a timeline.');
addTable(
  ['Sloupec', 'Typ', 'Popis'],
  [
    ['id', 'uuid', 'Unikátní identifikátor záznamu'],
    ['operating_room_id', 'text', 'FK na operating_rooms'],
    ['event_type', 'text', 'Typ události (step_change, operation_start, ...)'],
    ['step_index', 'integer', 'Index workflow kroku'],
    ['step_name', 'text', 'Název workflow kroku'],
    ['timestamp', 'timestamp', 'Čas události'],
    ['duration_seconds', 'integer', 'Trvání v sekundách'],
    ['metadata', 'jsonb', 'Dodatečná metadata'],
  ]
);

addHeading('workflow_statuses', 3);
addParagraph('Definice workflow kroků operačního procesu.');
addTable(
  ['Sloupec', 'Typ', 'Popis'],
  [
    ['id', 'text', 'Unikátní identifikátor'],
    ['name', 'text', 'Název statusu'],
    ['description', 'text', 'Popis statusu'],
    ['accent_color', 'text', 'Barva statusu (HEX)'],
    ['icon', 'text', 'Ikona statusu'],
    ['sort_order', 'integer', 'Pořadí v workflow'],
    ['default_duration_minutes', 'integer', 'Výchozí trvání v minutách'],
    ['is_active', 'boolean', 'Zda je aktivní'],
    ['is_special', 'boolean', 'Zda je speciální status'],
    ['special_type', 'text', 'Typ speciálního statusu'],
    ['show_in_timeline', 'boolean', 'Zobrazit v timeline'],
    ['include_in_statistics', 'boolean', 'Zahrnout do statistik'],
  ]
);

addPageBreak();
addHeading('management_contacts', 3);
addParagraph('Kontakty na vedení pro notifikace.');
addTable(
  ['Sloupec', 'Typ', 'Popis'],
  [
    ['id', 'text', 'Unikátní identifikátor'],
    ['name', 'text', 'Jméno kontaktu'],
    ['position', 'text', 'Pozice'],
    ['email', 'text', 'Emailová adresa'],
    ['phone', 'text', 'Telefonní číslo'],
    ['is_active', 'boolean', 'Zda je aktivní'],
    ['notify_late_surgeon', 'boolean', 'Notifikovat při pozdním příchodu operatéra'],
    ['notify_late_anesthesiologist', 'boolean', 'Notifikovat při pozdním příchodu ARO'],
    ['notify_patient_not_ready', 'boolean', 'Notifikovat při nepřipraveném pacientovi'],
    ['notify_late_arrival', 'boolean', 'Notifikovat při pozdním příjezdu z oddělení'],
    ['notify_emergencies', 'boolean', 'Notifikovat při emergency'],
    ['notify_other', 'boolean', 'Notifikovat při jiném důvodu'],
    ['sort_order', 'integer', 'Pořadí v seznamu'],
  ]
);

addHeading('notifications_log', 3);
addParagraph('Log odeslaných notifikací.');
addTable(
  ['Sloupec', 'Typ', 'Popis'],
  [
    ['id', 'uuid', 'Unikátní identifikátor'],
    ['room_id', 'text', 'ID sálu'],
    ['room_name', 'text', 'Název sálu'],
    ['notification_type', 'text', 'Typ notifikace'],
    ['custom_reason', 'text', 'Vlastní důvod (pro typ "other")'],
    ['recipient_count', 'integer', 'Počet příjemců'],
    ['created_at', 'timestamp', 'Čas odeslání'],
  ]
);

addHeading('departments', 3);
addParagraph('Oddělení nemocnice.');
addTable(
  ['Sloupec', 'Typ', 'Popis'],
  [
    ['id', 'text', 'Unikátní identifikátor'],
    ['name', 'text', 'Název oddělení'],
    ['description', 'text', 'Popis oddělení'],
    ['accent_color', 'text', 'Barva oddělení'],
    ['is_active', 'boolean', 'Zda je aktivní'],
  ]
);

// ============================================================================
// 4. HLAVNÍ MODULY
// ============================================================================
addPageBreak();
addHeading('4. Hlavní moduly');
addSeparator();

addHeading('4.1 Dashboard (Přehled sálů)', 2);
addParagraph('Dashboard je hlavní obrazovka aplikace zobrazující přehled všech operačních sálů v reálném čase.');

addSubheading('Funkce:');
addBullet('Grid zobrazení všech operačních sálů');
addBullet('Real-time aktualizace stavu sálů');
addBullet('Barevné kódování podle aktuální fáze workflow');
addBullet('Indikátory emergency, septic a locked stavů');
addBullet('Animované čítače operací');
addBullet('Quick info o personálu a pacientovi');

addSubheading('RoomCard komponenta:');
addParagraph('Každý sál je zobrazen jako karta (RoomCard) obsahující:');
addBullet('Název sálu a oddělení');
addBullet('Aktuální stav workflow s barevným indikátorem');
addBullet('Progress bar operace');
addBullet('Jména přiřazeného personálu');
addBullet('Počet operací za 24h');
addBullet('Status ikony (emergency, septic, locked, hygiene)');

addSubheading('RoomDetail komponenta:');
addParagraph('Po kliknutí na kartu sálu se otevře detailní zobrazení:');
addBullet('Velký progress indikátor aktuální fáze');
addBullet('Timeline všech fází workflow s časovými razítky');
addBullet('Ovládací prvky pro změnu fáze (vpřed/vzad)');
addBullet('Tlačítka pro speciální akce (volání pacienta, příjezd na trakt)');
addBullet('Možnost přepnutí personálu');
addBullet('Nastavení odhadovaného času ukončení');
addBullet('Tlačítko pro odeslání notifikace vedení');
addBullet('Historie změn stavů');

addPageBreak();
addHeading('4.2 Timeline modul', 2);
addParagraph('Timeline modul poskytuje vizualizaci průběhu operací v čase pro všechny sály.');

addSubheading('Funkce:');
addBullet('Horizontální timeline s časovou osou (7:00 - 19:00)');
addBullet('Zobrazení všech sálů s jejich operacemi');
addBullet('Barevné bloky pro jednotlivé fáze operací');
addBullet('Drag & drop není podporován (read-only)');
addBullet('Automatické načítání dat z room_status_history');
addBullet('Přepínání mezi dny');

addSubheading('Vizuální prvky:');
addBullet('Řádky reprezentující jednotlivé sály');
addBullet('Barevné bloky pro každou fázi workflow');
addBullet('Tooltip s detaily při hover');
addBullet('Indikátor aktuálního času');
addBullet('Legenda workflow fází');

addPageBreak();
addHeading('4.3 Statistiky', 2);
addParagraph('Modul statistik poskytuje detailní analýzy využití operačních sálů na základě reálných dat z databáze.');

addSubheading('Sekce modulu:');

addHeading('Přehled', 3);
addBullet('Celkový počet operací');
addBullet('Průměrné využití sálů');
addBullet('Počet sálů podle stavu');
addBullet('Trend operací (graf)');
addBullet('Graf využití v čase');

addHeading('Sály', 3);
addBullet('Detailní statistiky pro každý sál');
addBullet('Distribuce workflow fází');
addBullet('Stacked bar chart využití');
addBullet('Radar chart výkonnosti');
addBullet('Click pro detail jednotlivého sálu');

addHeading('Fáze', 3);
addBullet('Průměrné trvání každé workflow fáze');
addBullet('Procentuální zastoupení fází');
addBullet('Bar chart trvání fází');
addBullet('Line chart kumulativního trvání');
addBullet('Stacked area chart distribuce');

addHeading('Heatmapa', 3);
addBullet('Heatmapa využití: den v týdnu × hodina');
addBullet('Barevné kódování intenzity využití');
addBullet('Průměrné hodinové vytížení');
addBullet('Porovnání pracovních dní vs víkend');
addBullet('Respektuje nastavené pracovní hodiny sálů');

addSubheading('Časové filtry:');
addBullet('Den - data za aktuální den');
addBullet('Týden - data za posledních 7 dní');
addBullet('Měsíc - data za posledních 30 dní');
addBullet('Rok - data za posledních 365 dní');

addParagraph('Všechny statistiky jsou počítány z reálných dat v tabulce room_status_history. Při změně časového filtru se data automaticky přenačítají z databáze.');

addPageBreak();
addHeading('4.4 Správa personálu', 2);
addParagraph('Modul pro správu personálu operačních sálů.');

addSubheading('Kategorie personálu:');
addBullet('Lékaři (DOCTOR) - chirurgové a specialisté');
addBullet('Sestry (NURSE) - operační a instrumentářky');
addBullet('Anesteziologové (ANESTHESIOLOGIST) - ARO specialisté');

addSubheading('Správa personálu:');
addBullet('Přidání nového člena personálu');
addBullet('Editace údajů (jméno, role, úroveň dovedností)');
addBullet('Nastavení dostupnosti (0-100%)');
addBullet('Označení jako externí pracovník');
addBullet('Doporučení pro určité typy operací');
addBullet('Evidence nemocenské a dovolené');
addBullet('Poznámky');
addBullet('Aktivace/deaktivace pracovníka');

addSubheading('Úrovně dovedností:');
addTable(
  ['Kód', 'Popis'],
  [
    ['L3', 'Level 3 - Nejvyšší úroveň'],
    ['L2', 'Level 2 - Střední úroveň'],
    ['L1', 'Level 1 - Základní úroveň'],
    ['A', 'Atestace'],
    ['SR', 'Senior rezident'],
    ['N', 'Nováček'],
    ['S', 'Student'],
  ]
);

addPageBreak();
addHeading('4.5 Nastavení', 2);
addParagraph('Centrální modul pro konfiguraci systému.');

addSubheading('Sekce nastavení:');

addHeading('Operační sály', 3);
addBullet('Přidání/editace/smazání operačních sálů');
addBullet('Nastavení názvu a oddělení');
addBullet('Konfigurace týdenního rozvrhu pracovní doby');
addBullet('Nastavení pro každý den: začátek, konec, aktivní/neaktivní');
addBullet('Drag & drop pro změnu pořadí sálů');
addBullet('Označení jako septický sál');

addHeading('Workflow statusy', 3);
addBullet('Přehled všech workflow kroků');
addBullet('Editace názvů a popisů');
addBullet('Změna barev a ikon');
addBullet('Nastavení výchozího trvání');
addBullet('Zobrazení v timeline a statistikách');

addHeading('Oddělení', 3);
addBullet('Správa oddělení nemocnice');
addBullet('Přidání pododdělení');
addBullet('Nastavení barev');
addBullet('Aktivace/deaktivace');

addHeading('Kontakty vedení', 3);
addBullet('Seznam kontaktů pro notifikace');
addBullet('Nastavení typů notifikací pro každý kontakt');
addBullet('Email a telefon');
addBullet('Drag & drop pro prioritu');

addHeading('Pozadí aplikace', 3);
addBullet('Nastavení typu pozadí (solid, linear, radial)');
addBullet('Výběr barev a gradientů');
addBullet('Nastavení obrázku pozadí');
addBullet('Průhlednost a rozmazání');

addHeading('Administrace', 3);
addBullet('Správa uživatelů (pouze admin)');
addBullet('Správa modulů aplikace');
addBullet('Aktivace/deaktivace modulů pro běžné uživatele');

// ============================================================================
// 5. WORKFLOW OPERAČNÍHO SÁLU
// ============================================================================
addPageBreak();
addHeading('5. Workflow operačního sálu');
addSeparator();

addParagraph('Operační workflow je 8-krokový proces sledující průběh operace od přípravy sálu až po úklid.');

addSubheading('5.1 Workflow kroky');

addTable(
  ['Index', 'Název', 'Organizer', 'Barva', 'Typická délka'],
  [
    ['0', 'Sál připraven', 'Vedoucí sestra', 'Šedá (#6B7280)', '—'],
    ['1', 'Příjezd na sál', 'Příjmový tým', 'Fialová (#8B5CF6)', '5 min'],
    ['2', 'Začátek anestezie', 'Anesteziolog', 'Růžová (#EC4899)', '20 min'],
    ['3', 'Chirurgický výkon', 'Chirurg', 'Červená (#EF4444)', '60+ min'],
    ['4', 'Ukončení výkonu', 'Chirurg', 'Oranžová (#F59E0B)', '10 min'],
    ['5', 'Ukončení anestezie', 'Anesteziolog', 'Purpurová (#A855F7)', '15 min'],
    ['6', 'Odjezd ze sálu', 'Příjmový tým', 'Zelená (#10B981)', '10 min'],
    ['7', 'Úklid sálu', 'Sanitární tým', 'Oranžová (#F97316)', '15 min'],
  ]
);

addSubheading('5.2 Speciální statusy');
addParagraph('Kromě hlavního workflow existují speciální statusy aktivované tlačítky:');
addBullet('Volání pacienta - pacient byl zavolán z oddělení');
addBullet('Příjezd do traktu - pacient přijel do operačního traktu');
addBullet('Pauza - operace je dočasně pozastavena');
addBullet('Hygienický režim - zvýšený hygienický režim');

addSubheading('5.3 Přechody mezi stavy');
addParagraph('Workflow podporuje:');
addBullet('Sekvenční postup vpřed (krok +1)');
addBullet('Návrat zpět (krok -1) s potvrzením');
addBullet('Reset do výchozího stavu (index 0)');
addBullet('Automatické logování do room_status_history');
addBullet('Počítání dokončených operací');

addSubheading('5.4 Ukládání historie');
addParagraph('Při každé změně workflow kroku se:');
addNumberedItem(1, 'Aktualizuje current_step_index v operating_rooms');
addNumberedItem(2, 'Nastaví phase_started_at na aktuální čas');
addNumberedItem(3, 'Přidá záznam do status_history (JSONB pole)');
addNumberedItem(4, 'Vytvoří záznam v room_status_history tabulce');
addNumberedItem(5, 'Při dokončení operace se přidá do completed_operations');

// ============================================================================
// 6. NOTIFIKAČNÍ SYSTÉM
// ============================================================================
addPageBreak();
addHeading('6. Notifikační systém');
addSeparator();

addParagraph('Systém umožňuje odesílání emailových notifikací vedení při různých událostech.');

addSubheading('6.1 Typy notifikací');

addTable(
  ['Typ', 'ID', 'Barva', 'Popis'],
  [
    ['Pozdní příchod operatéra', 'notify_late_surgeon', 'Červená', 'Chirurg není přítomen včas'],
    ['Pozdní příchod ARO', 'notify_late_anesthesiologist', 'Oranžová', 'Anesteziolog není přítomen včas'],
    ['Nepřipravený pacient', 'notify_patient_not_ready', 'Žlutá', 'Pacient není připraven k operaci'],
    ['Pozdní příjezd z oddělení', 'notify_late_arrival', 'Modrá', 'Pacient nepřijel včas z oddělení'],
    ['Jiný důvod', 'notify_other', 'Purpurová', 'Vlastní důvod s textem'],
  ]
);

addSubheading('6.2 Proces odeslání notifikace');
addNumberedItem(1, 'Uživatel klikne na "Upozornit vedení" v detailu sálu');
addNumberedItem(2, 'Otevře se NotificationOverlay s výběrem typu');
addNumberedItem(3, 'Uživatel vybere typ notifikace (nebo zadá vlastní důvod)');
addNumberedItem(4, 'Systém načte kontakty s příslušným oprávněním');
addNumberedItem(5, 'Email je odeslán přes Resend API');
addNumberedItem(6, 'Záznam je uložen do notifications_log');

addSubheading('6.3 Emailová šablona');
addParagraph('Emaily jsou odesílány s HTML šablonou (EmailTemplate.tsx) obsahující:');
addBullet('Logo/hlavičku');
addBullet('Název sálu a čas');
addBullet('Typ problému s barevným indikátorem');
addBullet('Detaily (vlastní důvod, pokud zadán)');
addBullet('Aktuální stav sálu a personál');
addBullet('Patička s informacemi o systému');

addSubheading('6.4 API endpoint');
addCodeBlock(`
POST /api/send-notification
Content-Type: application/json

{
  "roomId": "1",
  "roomName": "Sál č. 1",
  "notificationType": "notify_late_surgeon",
  "customReason": "Volitelný vlastní důvod"
}

Response:
{
  "success": true,
  "recipientCount": 3
}
`);

// ============================================================================
// 7. REAL-TIME SYNCHRONIZACE
// ============================================================================
addPageBreak();
addHeading('7. Real-time synchronizace');
addSeparator();

addParagraph('Systém využívá Supabase Realtime pro synchronizaci dat mezi klienty v reálném čase.');

addSubheading('7.1 Architektura');
addBullet('PostgreSQL tabulky s REPLICA IDENTITY FULL');
addBullet('Supabase Realtime channels pro postgres_changes');
addBullet('Granulární UPDATE handling pro jednotlivé sály');
addBullet('Full refresh pro INSERT/DELETE operace');

addSubheading('7.2 Optimistické aktualizace');
addParagraph('Pro plynulý UX systém používá optimistické aktualizace:');
addNumberedItem(1, 'Uživatel provede akci (změna workflow)');
addNumberedItem(2, 'UI se okamžitě aktualizuje (optimistic)');
addNumberedItem(3, 'Požadavek je odeslán na server');
addNumberedItem(4, 'Server potvrdí změnu');
addNumberedItem(5, 'Realtime event je ignorován (debounce 2s)');

addSubheading('7.3 Debouncing');
addParagraph('Pro prevenci flickeringu při rychlých změnách:');
addBullet('recentLocalUpdates Map sleduje lokální změny');
addBullet('Realtime eventy v rámci 2s od lokální změny jsou ignorovány');
addBullet('Cleanup interval každých 10s maže staré záznamy');

addSubheading('7.4 Subscription kód');
addCodeBlock(`
// lib/db.ts
export function subscribeToOperatingRooms(
  onFullRefresh: () => void,
  onRoomUpdate?: (roomId: string, changes: Partial<DBOperatingRoom>) => void
): (() => void) | null {
  const channel = supabase
    .channel('operating_rooms_realtime')
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'operating_rooms' },
      (payload) => {
        if (payload.eventType === 'UPDATE' && onRoomUpdate) {
          onRoomUpdate(payload.new.id, payload.new);
        } else {
          onFullRefresh();
        }
      }
    )
    .subscribe();
  
  return () => channel.unsubscribe();
}
`);

// ============================================================================
// 8. AUTENTIZACE A AUTORIZACE
// ============================================================================
addPageBreak();
addHeading('8. Autentizace a autorizace');
addSeparator();

addSubheading('8.1 Autentizační systém');
addParagraph('Systém používá vlastní autentizaci s bcrypt hashováním hesel a session management.');

addSubheading('8.2 Tabulka app_users');
addTable(
  ['Sloupec', 'Typ', 'Popis'],
  [
    ['id', 'uuid', 'Unikátní identifikátor'],
    ['email', 'text', 'Emailová adresa (přihlašovací jméno)'],
    ['password_hash', 'text', 'Bcrypt hash hesla'],
    ['name', 'text', 'Jméno uživatele'],
    ['role', 'text', 'Role (admin/user)'],
    ['is_active', 'boolean', 'Zda je účet aktivní'],
  ]
);

addSubheading('8.3 Role uživatelů');
addHeading('Admin', 3);
addBullet('Plný přístup ke všem modulům');
addBullet('Správa uživatelů');
addBullet('Správa modulů aplikace');
addBullet('Konfigurace workflow');
addBullet('Nastavení pozadí a vzhledu');

addHeading('User', 3);
addBullet('Přístup k povoleným modulům');
addBullet('Dashboard a detail sálů');
addBullet('Změna workflow stavů');
addBullet('Odesílání notifikací');
addBullet('Omezený přístup do nastavení');

addSubheading('8.4 AuthContext');
addParagraph('React Context pro správu autentizace poskytuje:');
addBullet('isAuthenticated - stav přihlášení');
addBullet('isAdmin - zda je uživatel admin');
addBullet('user - data uživatele');
addBullet('modules - povolené moduly');
addBullet('login(email, password) - přihlášení');
addBullet('logout() - odhlášení');

addSubheading('8.5 Row Level Security');
addParagraph('Všechny tabulky mají RLS politiky:');
addBullet('SELECT - čtení povoleno pro autentizované');
addBullet('INSERT - vytváření povoleno');
addBullet('UPDATE - aktualizace povolena');
addBullet('DELETE - mazání povoleno');

// ============================================================================
// 9. API REFERENCE
// ============================================================================
addPageBreak();
addHeading('9. API Reference');
addSeparator();

addSubheading('9.1 GET /api/rooms');
addParagraph('Načte všechny operační sály s personálem.');
addCodeBlock(`
Response 200:
[
  {
    "id": "1",
    "name": "Sál č. 1",
    "department": "TRA",
    "status": "BUSY",
    "currentStepIndex": 3,
    "staff": {
      "doctor": { "name": "MUDr. Novák", "role": "DOCTOR" },
      "nurse": { "name": "Bc. Nová", "role": "NURSE" },
      "anesthesiologist": { "name": "MUDr. Černý", "role": "ANESTHESIOLOGIST" }
    },
    ...
  }
]
`);

addSubheading('9.2 POST /api/operating-rooms/reorder');
addParagraph('Změní pořadí operačních sálů.');
addCodeBlock(`
Request:
{
  "roomIds": ["1", "3", "2", "4"]
}

Response 200:
{
  "success": true
}
`);

addSubheading('9.3 GET /api/workflow-statuses');
addParagraph('Načte workflow statusy.');
addCodeBlock(`
Response 200:
[
  {
    "id": "status-1",
    "name": "Sál připraven",
    "accent_color": "#6B7280",
    "sort_order": 0,
    "is_active": true
  },
  ...
]
`);

addSubheading('9.4 POST /api/send-notification');
addParagraph('Odešle notifikaci vedení.');
addCodeBlock(`
Request:
{
  "roomId": "1",
  "roomName": "Sál č. 1",
  "notificationType": "notify_late_surgeon",
  "customReason": null
}

Response 200:
{
  "success": true,
  "recipientCount": 3
}
`);

addSubheading('9.5 GET/POST/PUT/DELETE /api/management-contacts');
addParagraph('CRUD operace pro kontakty vedení.');

// ============================================================================
// 10. TYPY A ROZHRANÍ
// ============================================================================
addPageBreak();
addHeading('10. Typy a rozhraní');
addSeparator();

addSubheading('10.1 RoomStatus (enum)');
addCodeBlock(`
enum RoomStatus {
  FREE = 'FREE',
  BUSY = 'BUSY',
  CLEANING = 'CLEANING',
  MAINTENANCE = 'MAINTENANCE'
}
`);

addSubheading('10.2 OperatingRoom');
addCodeBlock(`
interface OperatingRoom {
  id: string;
  name: string;
  department: string;
  status: RoomStatus;
  queueCount: number;
  operations24h: number;
  currentStepIndex: number;
  staff: {
    doctor: Staff;
    nurse: Staff;
    anesthesiologist?: Staff;
  };
  isSeptic?: boolean;
  isEmergency?: boolean;
  isLocked?: boolean;
  isPaused?: boolean;
  weeklySchedule?: WeeklySchedule;
  patientCalledAt?: string | null;
  patientArrivedAt?: string | null;
  phaseStartedAt?: string | null;
  operationStartedAt?: string | null;
  statusHistory?: Array<{
    stepIndex: number;
    startedAt: string;
    color?: string;
    stepName?: string;
  }>;
  completedOperations?: Array<CompletedOperation>;
  estimatedEndTime?: string;
  currentPatient?: Patient;
  currentProcedure?: Procedure;
}
`);

addSubheading('10.3 Staff');
addCodeBlock(`
interface Staff {
  id?: string;
  name: string | null;
  role: 'DOCTOR' | 'NURSE' | 'ANESTHESIOLOGIST';
  skill_level?: 'L3' | 'L2' | 'L1' | 'A' | 'SR' | 'N' | 'S';
  availability?: number;
  is_external?: boolean;
  is_recommended?: boolean;
  is_active?: boolean;
  sick_leave_days?: number;
  vacation_days?: number;
  notes?: string;
}
`);

addSubheading('10.4 WeeklySchedule');
addCodeBlock(`
interface DayWorkingHours {
  enabled: boolean;
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
}

interface WeeklySchedule {
  monday: DayWorkingHours;
  tuesday: DayWorkingHours;
  wednesday: DayWorkingHours;
  thursday: DayWorkingHours;
  friday: DayWorkingHours;
  saturday: DayWorkingHours;
  sunday: DayWorkingHours;
}
`);

// ============================================================================
// 11. KONFIGURACE A NASAZENÍ
// ============================================================================
addPageBreak();
addHeading('11. Konfigurace a nasazení');
addSeparator();

addSubheading('11.1 Environment Variables');
addTable(
  ['Proměnná', 'Popis', 'Povinná'],
  [
    ['NEXT_PUBLIC_SUPABASE_URL', 'URL Supabase projektu', 'Ano'],
    ['NEXT_PUBLIC_SUPABASE_ANON_KEY', 'Anon klíč Supabase', 'Ano'],
    ['SUPABASE_SERVICE_ROLE_KEY', 'Service role klíč', 'Ano'],
    ['RESEND_API_KEY', 'API klíč pro Resend', 'Ano'],
    ['EMAIL_FROM', 'Odesílající email', 'Ne'],
    ['POSTGRES_URL', 'PostgreSQL connection string', 'Auto'],
  ]
);

addSubheading('11.2 Instalace');
addCodeBlock(`
# Klonování repozitáře
git clone https://github.com/your-org/operating-room-management.git
cd operating-room-management

# Instalace závislostí
npm install
# nebo
pnpm install

# Nastavení environment variables
cp .env.example .env.local
# Upravte .env.local s vašimi hodnotami

# Spuštění development serveru
npm run dev
`);

addSubheading('11.3 Nasazení na Vercel');
addNumberedItem(1, 'Připojte GitHub repozitář k Vercel');
addNumberedItem(2, 'Nastavte environment variables v Vercel dashboard');
addNumberedItem(3, 'Přidejte Supabase integraci');
addNumberedItem(4, 'Deploy automaticky při push do main');

addSubheading('11.4 Databázové migrace');
addParagraph('Pro inicializaci databáze spusťte SQL skripty z /scripts složky:');
addBullet('001-create-tables.sql - Vytvoření tabulek');
addBullet('002-enable-rls.sql - Aktivace Row Level Security');
addBullet('003-seed-data.sql - Výchozí data');

// ============================================================================
// 12. ŘEŠENÍ PROBLÉMŮ
// ============================================================================
addPageBreak();
addHeading('12. Řešení problémů');
addSeparator();

addSubheading('12.1 Časté problémy');

addHeading('Data se nenačítají', 3);
addBullet('Zkontrolujte Supabase connection string');
addBullet('Ověřte RLS politiky v Supabase');
addBullet('Zkontrolujte network tab v DevTools');

addHeading('Real-time nefunguje', 3);
addBullet('Ověřte, že je Realtime povoleno na tabulce');
addBullet('Zkontrolujte WebSocket připojení');
addBullet('Restartujte Supabase Realtime v dashboard');

addHeading('Emaily se neodesílají', 3);
addBullet('Ověřte RESEND_API_KEY');
addBullet('Zkontrolujte, že doména je ověřena v Resend');
addBullet('Prohlédněte si logy v /api/send-notification');

addHeading('Statistiky jsou prázdné', 3);
addBullet('Ověřte, že room_status_history obsahuje data');
addBullet('Zkontrolujte zvolené časové období');
addBullet('Proveďte několik workflow změn pro generování dat');

addSubheading('12.2 Debug logování');
addParagraph('Pro ladění přidejte console.log s prefixem [v0]:');
addCodeBlock(`console.log("[v0] Debug message:", variable);`);

addSubheading('12.3 Kontakt podpory');
addParagraph('Pro technickou podporu kontaktujte:');
addBullet('Email: support@example.com');
addBullet('Vercel Help: vercel.com/help');

// ============================================================================
// ZÁVĚR
// ============================================================================
addPageBreak();
addTitle('Závěr', 20);
doc.moveDown(1);

addParagraph('Operating Room Management System je komplexní řešení pro správu operačních sálů v nemocničním prostředí. Systém poskytuje real-time monitoring, workflow management, statistiky a notifikace.');

addParagraph('Tato dokumentace pokrývá všechny aspekty systému od architektury po nasazení. Pro další informace nebo podporu se obraťte na vývojový tým.');

doc.moveDown(2);
doc.fontSize(10).fillColor(colors.muted).font('Helvetica').text('© 2024 Operating Room Management System', { align: 'center' });
doc.text('Generováno automaticky pomocí v0 AI', { align: 'center' });

// Finalize PDF
doc.end();

stream.on('finish', () => {
  console.log(`PDF dokumentace byla vygenerována: ${outputPath}`);
});

stream.on('error', (err) => {
  console.error('Chyba při generování PDF:', err);
});
