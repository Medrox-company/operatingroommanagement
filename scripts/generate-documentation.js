import fs from 'fs';
import path from 'path';

const html = `<!DOCTYPE html>
<html lang="cs">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Operating Room Management System - Dokumentace</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            background: #fff;
        }
        .cover {
            page-break-after: always;
            text-align: center;
            padding: 100px 40px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        .cover h1 {
            font-size: 48px;
            margin-bottom: 20px;
            font-weight: bold;
        }
        .cover p {
            font-size: 18px;
            margin-bottom: 10px;
        }
        .toc {
            page-break-after: always;
            padding: 40px;
        }
        .toc h2 {
            margin-bottom: 20px;
            color: #667eea;
        }
        .toc ul {
            list-style: none;
            margin-left: 20px;
        }
        .toc ul li {
            margin-bottom: 10px;
            border-bottom: 1px dotted #ddd;
            padding-bottom: 10px;
        }
        .toc ul li a {
            text-decoration: none;
            color: #667eea;
        }
        .content {
            padding: 40px;
        }
        .section {
            page-break-after: auto;
            margin-bottom: 40px;
        }
        .section h2 {
            color: #667eea;
            font-size: 28px;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 3px solid #667eea;
        }
        .section h3 {
            color: #764ba2;
            font-size: 20px;
            margin-top: 20px;
            margin-bottom: 10px;
        }
        .section h4 {
            color: #666;
            font-size: 16px;
            margin-top: 15px;
            margin-bottom: 8px;
        }
        p {
            margin-bottom: 12px;
            text-align: justify;
        }
        .code-block {
            background: #f5f5f5;
            border-left: 4px solid #667eea;
            padding: 12px;
            margin: 12px 0;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            overflow-x: auto;
        }
        .highlight {
            background: #fffacd;
            padding: 2px 4px;
            border-radius: 3px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
            font-size: 13px;
        }
        table th {
            background: #667eea;
            color: white;
            padding: 10px;
            text-align: left;
        }
        table td {
            border: 1px solid #ddd;
            padding: 10px;
        }
        table tr:nth-child(even) {
            background: #f9f9f9;
        }
        ul, ol {
            margin-left: 30px;
            margin-bottom: 12px;
        }
        li {
            margin-bottom: 8px;
        }
        .info-box {
            background: #e3f2fd;
            border-left: 4px solid #2196f3;
            padding: 12px;
            margin: 12px 0;
            border-radius: 3px;
        }
        .warning-box {
            background: #fff3e0;
            border-left: 4px solid #ff9800;
            padding: 12px;
            margin: 12px 0;
            border-radius: 3px;
        }
        .feature-list {
            display: flex;
            flex-wrap: wrap;
            gap: 15px;
            margin: 20px 0;
        }
        .feature-item {
            flex: 1;
            min-width: 250px;
            background: #f9f9f9;
            padding: 15px;
            border-radius: 5px;
            border-left: 4px solid #667eea;
        }
        @media print {
            .section {
                page-break-inside: avoid;
            }
            body {
                margin: 0;
                padding: 0;
            }
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            font-size: 12px;
            color: #666;
            text-align: center;
        }
    </style>
</head>
<body>
    <!-- Cover Page -->
    <div class="cover">
        <h1>Operating Room Management System</h1>
        <p>Kompletní systém pro správu operačních sálů</p>
        <p style="margin-top: 40px; font-size: 14px;">Podrobná technická dokumentace</p>
        <p style="margin-top: 80px; font-size: 12px;">Verze 1.0 | Duben 2026</p>
    </div>

    <!-- Table of Contents -->
    <div class="toc">
        <h2>Obsah</h2>
        <ul>
            <li><a href="#overview">1. Přehled aplikace</a></li>
            <li><a href="#architecture">2. Architektura</a></li>
            <li><a href="#database">3. Databáze</a></li>
            <li><a href="#modules">4. Moduly aplikace</a></li>
            <li><a href="#dashboard">5. Dashboard</a></li>
            <li><a href="#rooms">6. Správa operačních sálů</a></li>
            <li><a href="#notifications">7. Notifikační systém</a></li>
            <li><a href="#statistics">8. Modul statistiky</a></li>
            <li><a href="#settings">9. Nastavení</a></li>
            <li><a href="#api">10. API Reference</a></li>
            <li><a href="#deployment">11. Nasazení a údržba</a></li>
        </ul>
    </div>

    <div class="content">
        <!-- 1. OVERVIEW -->
        <div class="section" id="overview">
            <h2>1. Přehled aplikace</h2>
            
            <h3>1.1 Úvod</h3>
            <p>Operating Room Management System je komplexní webová aplikace navržená pro efektivní správu operačních sálů v nemocnicích. Aplikace poskytuje reálný přehled o stavu operačních sálů, sleduje workflow operací a umožňuje detailní analýzu využívání operačních kapacit.</p>
            
            <h3>1.2 Hlavní vlastnosti</h3>
            <div class="feature-list">
                <div class="feature-item">
                    <strong>Real-time Dashboard</strong>
                    <p>Okamžitý přehled o stavu všech operačních sálů s barevným značením a live animacemi.</p>
                </div>
                <div class="feature-item">
                    <strong>Workflow Management</strong>
                    <p>Sledování jednotlivých fází operací (příprava, operace, ukončení) s automatickým časováním.</p>
                </div>
                <div class="feature-item">
                    <strong>Inteligentní notifikace</strong>
                    <p>Automatické upozornění na problémy (pozdní příchod personálu, nepřipravený pacient apod.).</p>
                </div>
                <div class="feature-item">
                    <strong>Pokročilé statistiky</strong>
                    <p>Detailní analýza vytížení sálů, distribuce pracovního vytížení, heatmapy a trendy.</p>
                </div>
                <div class="feature-item">
                    <strong>Plánování rozvrhu</strong>
                    <p>Definice pracovní doby pro každý sál včetně víkendů a svátků.</p>
                </div>
                <div class="feature-item">
                    <strong>Export dat</strong>
                    <p>Možnost exportu reportů a dat do různých formátů pro další analýzu.</p>
                </div>
            </div>

            <h3>1.3 Technický stack</h3>
            <ul>
                <li><strong>Frontend:</strong> React, TypeScript, Tailwind CSS, Framer Motion</li>
                <li><strong>Backend:</strong> Supabase (PostgreSQL, Real-time API)</li>
                <li><strong>Deployment:</strong> Vercel</li>
                <li><strong>Grafy a vizualizace:</strong> Recharts, Mapbox (pokud je k dispozici)</li>
                <li><strong>Notifikace:</strong> Resend (Email), Push notifikace</li>
            </ul>

            <h3>1.4 Cílová uživatelská skupina</h3>
            <ul>
                <li>Vedoucí operačního sálu</li>
                <li>Zdravotnický personál (lékaři, zdravotní sestry)</li>
                <li>Správce nemocnice</li>
                <li>Plánovací tým</li>
                <li>Analytici dat</li>
            </ul>
        </div>

        <!-- 2. ARCHITECTURE -->
        <div class="section" id="architecture">
            <h2>2. Architektura aplikace</h2>
            
            <h3>2.1 Přehled architektury</h3>
            <p>Aplikace je postavena na moderní architektuře s oddělením frontend a backend vrstvy.</p>
            
            <div class="code-block">
Frontend (React/TypeScript)
    ↓
API Layer (Supabase Real-time)
    ↓
Backend (PostgreSQL Database)
    ↓
Integrace (Email, Push notifikace)
            </div>

            <h3>2.2 Složka struktura projektu</h3>
            <table>
                <tr>
                    <th>Složka</th>
                    <th>Popis</th>
                </tr>
                <tr>
                    <td>/app</td>
                    <td>Next.js App Router - stránky a layout</td>
                </tr>
                <tr>
                    <td>/components</td>
                    <td>React komponenty (Dashboard, Modal, Card atd.)</td>
                </tr>
                <tr>
                    <td>/lib</td>
                    <td>Utility funkce (db.ts pro DB operace, helper funkce)</td>
                </tr>
                <tr>
                    <td>/types</td>
                    <td>TypeScript typy a interface</td>
                </tr>
                <tr>
                    <td>/public</td>
                    <td>Statické assety (obrázky, ikony, dokumentace)</td>
                </tr>
                <tr>
                    <td>/scripts</td>
                    <td>Skripty pro údržbu (seeding DB, migrace)</td>
                </tr>
            </table>

            <h3>2.3 Datový tok</h3>
            <p>Aplikace používá Real-time API od Supabase pro okamžitou synchronizaci dat:</p>
            <ul>
                <li>Změna stavu sálu se okamžitě zobrazí na všech klientech</li>
                <li>Historické údaje se ukládají do tabulky <span class="highlight">room_status_history</span></li>
                <li>Notifikace se odesílají automaticky na základě pravidel</li>
                <li>Statistiky se počítají z reálných dat v databázi</li>
            </ul>

            <h3>2.4 Bezpečnost</h3>
            <div class="info-box">
                <strong>Row Level Security (RLS):</strong> Supabase RLS policies zajišťují, že uživatelé vidí pouze data relevantní pro jejich roli.
            </div>
            <ul>
                <li>Autentizace přes Supabase Auth</li>
                <li>Role-based access control (RBAC)</li>
                <li>Šifrování citlivých dat v databázi</li>
                <li>API endpoints chráněny autentizací</li>
            </ul>
        </div>

        <!-- 3. DATABASE -->
        <div class="section" id="database">
            <h2>3. Databáze</h2>
            
            <h3>3.1 Tabulky a schéma</h3>
            
            <h4>operating_rooms</h4>
            <p>Hlavní tabulka obsahující informace o operačních sálech.</p>
            <table>
                <tr>
                    <th>Sloupec</th>
                    <th>Typ</th>
                    <th>Popis</th>
                </tr>
                <tr>
                    <td>id</td>
                    <td>UUID</td>
                    <td>Primární klíč</td>
                </tr>
                <tr>
                    <td>name</td>
                    <td>VARCHAR</td>
                    <td>Název sálu (např. "Sál č. 1")</td>
                </tr>
                <tr>
                    <td>status</td>
                    <td>ENUM</td>
                    <td>Aktuální stav (Libre, Preparing, Operating, Cleaning, Emergency)</td>
                </tr>
                <tr>
                    <td>department</td>
                    <td>VARCHAR</td>
                    <td>Oddělení (Chirurgie, Ortopédie, apod.)</td>
                </tr>
                <tr>
                    <td>operations24h</td>
                    <td>INTEGER</td>
                    <td>Počet operací za 24 hodin</td>
                </tr>
                <tr>
                    <td>weeklySchedule</td>
                    <td>JSONB</td>
                    <td>Pracovní doba pro každý den týdne</td>
                </tr>
                <tr>
                    <td>isEmergency</td>
                    <td>BOOLEAN</td>
                    <td>Je sál určen pro urgentní případy</td>
                </tr>
                <tr>
                    <td>currentProcedure</td>
                    <td>JSONB</td>
                    <td>Aktuální operace s detaily</td>
                </tr>
                <tr>
                    <td>status_history</td>
                    <td>JSONB</td>
                    <td>Historie posledních stavů</td>
                </tr>
            </table>

            <h4>room_status_history</h4>
            <p>Detailní história všech změn stavu operačních sálů.</p>
            <table>
                <tr>
                    <th>Sloupec</th>
                    <th>Typ</th>
                    <th>Popis</th>
                </tr>
                <tr>
                    <td>id</td>
                    <td>UUID</td>
                    <td>Primární klíč</td>
                </tr>
                <tr>
                    <td>room_id</td>
                    <td>UUID</td>
                    <td>Cizí klíč na operating_rooms</td>
                </tr>
                <tr>
                    <td>event_type</td>
                    <td>VARCHAR</td>
                    <td>Typ události (operation_start, step_change, operation_end)</td>
                </tr>
                <tr>
                    <td>step_name</td>
                    <td>VARCHAR</td>
                    <td>Název fáze (Příprava, Chirurgický výkon, apod.)</td>
                </tr>
                <tr>
                    <td>duration_seconds</td>
                    <td>INTEGER</td>
                    <td>Trvání fáze v sekundách</td>
                </tr>
                <tr>
                    <td>timestamp</td>
                    <td>TIMESTAMP</td>
                    <td>Čas události</td>
                </tr>
                <tr>
                    <td>metadata</td>
                    <td>JSONB</td>
                    <td>Dodatečné informace o události</td>
                </tr>
            </table>

            <h4>notifications_log</h4>
            <p>Historie všech odeslaných notifikací.</p>
            <table>
                <tr>
                    <th>Sloupec</th>
                    <th>Typ</th>
                    <th>Popis</th>
                </tr>
                <tr>
                    <td>id</td>
                    <td>UUID</td>
                    <td>Primární klíč</td>
                </tr>
                <tr>
                    <td>room_id</td>
                    <td>UUID</td>
                    <td>Cizí klíč na operační sál</td>
                </tr>
                <tr>
                    <td>notification_type</td>
                    <td>VARCHAR</td>
                    <td>Typ upozornění</td>
                </tr>
                <tr>
                    <td>recipient_email</td>
                    <td>VARCHAR</td>
                    <td>E-mail příjemce</td>
                </tr>
                <tr>
                    <td>status</td>
                    <td>ENUM</td>
                    <td>Stav (pending, sent, failed)</td>
                </tr>
                <tr>
                    <td>created_at</td>
                    <td>TIMESTAMP</td>
                    <td>Čas vytvoření</td>
                </tr>
            </table>

            <h4>workflow_statuses</h4>
            <p>Definice jednotlivých fází workflow operací.</p>
            <table>
                <tr>
                    <th>Sloupec</th>
                    <th>Typ</th>
                    <th>Popis</th>
                </tr>
                <tr>
                    <td>id</td>
                    <td>UUID</td>
                    <td>Primární klíč</td>
                </tr>
                <tr>
                    <td>title</td>
                    <td>VARCHAR</td>
                    <td>Název fáze</td>
                </tr>
                <tr>
                    <td>color</td>
                    <td>VARCHAR</td>
                    <td>Barva pro UI (HEX kód)</td>
                </tr>
                <tr>
                    <td>order_index</td>
                    <td>INTEGER</td>
                    <td>Pořadí fáze v procesu</td>
                </tr>
                <tr>
                    <td>include_in_statistics</td>
                    <td>BOOLEAN</td>
                    <td>Zda se počítá do statistik</td>
                </tr>
            </table>

            <h3>3.2 Vztahy mezi tabulkami</h3>
            <div class="code-block">
operating_rooms (1) ----< (many) room_status_history
operating_rooms (1) ----< (many) notifications_log
workflow_statuses (many) ---- (many) room_status_history (přes step_name)
            </div>

            <h3>3.3 Důležité dotazy</h3>
            
            <h4>Získání aktuálního stavu všech sálů</h4>
            <div class="code-block">
SELECT * FROM operating_rooms WHERE status != 'Deleted'
ORDER BY name;
            </div>

            <h4>Poslední 30 dní histórie sálu</h4>
            <div class="code-block">
SELECT * FROM room_status_history 
WHERE room_id = $1 
AND timestamp > now() - interval '30 days'
ORDER BY timestamp DESC;
            </div>

            <h4>Průměrné trvání každé fáze</h4>
            <div class="code-block">
SELECT step_name, 
       AVG(duration_seconds) as avg_duration_seconds,
       COUNT(*) as count
FROM room_status_history
WHERE event_type = 'step_change'
GROUP BY step_name;
            </div>
        </div>

        <!-- 4. MODULES -->
        <div class="section" id="modules">
            <h2>4. Moduly aplikace</h2>
            
            <h3>4.1 App.tsx (Hlavní komponenta)</h3>
            <p>Soubor App.tsx je centrální místem aplikace a orchestruje všechny moduly. Obsahuje:</p>
            <ul>
                <li>State management pro operační sály</li>
                <li>Real-time subscriby na Supabase</li>
                <li>Přepínání mezi jednotlivými moduly</li>
                <li>Autentizace a autorizaci</li>
            </ul>

            <h3>4.2 State Management</h3>
            <p>Aplikace používá React hooks pro state management:</p>
            <ul>
                <li><span class="highlight">useState</span> - lokální stav komponent</li>
                <li><span class="highlight">useContext</span> - globální stav (settings, auth)</li>
                <li><span class="highlight">useEffect</span> - side effects a data fetching</li>
                <li><span class="highlight">useCallback</span> - memoizace callbacků</li>
                <li><span class="highlight">useMemo</span> - memoizace výpočtů</li>
            </ul>

            <h3>4.3 Real-time Updates</h3>
            <p>Aplikace se přihlašuje k Real-time aktualizacím přes Supabase:</p>
            <div class="code-block">
supabase
  .channel('public:operating_rooms')
  .on('postgres_changes', 
    { event: '*', schema: 'public', table: 'operating_rooms' },
    (payload) => {
      // Aktualizace lokálního stavu
    }
  )
  .subscribe();
            </div>
        </div>

        <!-- 5. DASHBOARD -->
        <div class="section" id="dashboard">
            <h2>5. Dashboard</h2>
            
            <h3>5.1 Přehled</h3>
            <p>Dashboard je úvodní obrazovka aplikace, která poskytuje živý přehled o stavu všech operačních sálů.</p>

            <h3>5.2 Hlavní komponenty</h3>
            
            <h4>Status Bar (horní lišta)</h4>
            <ul>
                <li>Celkový počet sálů v provozu</li>
                <li>Počet operací v poslední době</li>
                <li>Upozornění na kritické stavy</li>
                <li>Navigace do jednotlivých modulů</li>
            </ul>

            <h4>Room Grid (mřížka sálů)</h4>
            <ul>
                <li>Vizuální reprezentace každého sálu</li>
                <li>Aktuální stav (barva pozadí)</li>
                <li>Informace o běžící operaci</li>
                <li>Tlačítko pro otevření detailu sálu</li>
            </ul>

            <h4>Room Detail Modal (detailní okno sálu)</h4>
            <ul>
                <li>Detailní informace o vybraném sále</li>
                <li>Timeline operací</li>
                <li>Možnost změny stavu</li>
                <li>Notifikační nastavení</li>
            </ul>

            <h3>5.3 Barevné značení stavů</h3>
            <table>
                <tr>
                    <th>Stav</th>
                    <th>Barva</th>
                    <th>Popis</th>
                </tr>
                <tr>
                    <td>Libre (Volný)</td>
                    <td>Zelená</td>
                    <td>Sál je připravený a volný</td>
                </tr>
                <tr>
                    <td>Preparing (Příprava)</td>
                    <td>Modrá</td>
                    <td>Sál se připravuje na operaci</td>
                </tr>
                <tr>
                    <td>Operating (V operaci)</td>
                    <td>Oranžová</td>
                    <td>Probíhá operace</td>
                </tr>
                <tr>
                    <td>Cleaning (Úklid)</td>
                    <td>Žlutá</td>
                    <td>Probíhá dezinfekce a úklid</td>
                </tr>
                <tr>
                    <td>Emergency (Nouzový stav)</td>
                    <td>Červená</td>
                    <td>Aktivován nouzový režim</td>
                </tr>
            </table>

            <h3>5.4 Real-time animace</h3>
            <p>Dashboard používá Framer Motion pro hladké animace a přechody:</p>
            <ul>
                <li>Animace změny barvy při změně stavu</li>
                <li>Pulzující animace pro urgentní stavy</li>
                <li>Smooth fade-in/out efekty</li>
                <li>Transition animace při otevírání modálů</li>
            </ul>

            <h3>5.5 Interakce uživatele</h3>
            <ul>
                <li><strong>Kliknutí na sál:</strong> Otevře detailní okno</li>
                <li><strong>Stav tlačítko:</strong> Umožní změnu stavu sálu</li>
                <li><strong>Notifikace ikona:</strong> Otevře seznam poslední notifikace</li>
                <li><strong>Refresh:</strong> Okamžitá synchronizace s databází</li>
            </ul>
        </div>

        <!-- 6. ROOMS MANAGEMENT -->
        <div class="section" id="rooms">
            <h2>6. Správa operačních sálů</h2>
            
            <h3>6.1 Přehled modulu</h3>
            <p>Modul Operační sály poskytuje detailní správu a konfiguraci jednotlivých operačních sálů.</p>

            <h3>6.2 Funkcionality</h3>
            
            <h4>Přidání nového sálu</h4>
            <ul>
                <li>Formulář pro zadání základních informací</li>
                <li>Volba oddělení (Chirurgie, Ortopédie, apod.)</li>
                <li>Nastavení pracovní doby</li>
                <li>Konfigurace nouzového režimu</li>
            </ul>

            <h4>Úprava sálu</h4>
            <ul>
                <li>Změna názvu a popisu</li>
                <li>Úprava pracovního rozvrhu</li>
                <li>Nastavení maximálního počtu operací</li>
                <li>Přiřazení personálu</li>
            </ul>

            <h4>Smazání sálu</h4>
            <ul>
                <li>Soft delete (označení jako smazané, uchování dat)</li>
                <li>Archivace dat do bezpečného úložiště</li>
                <li>Zachování historie pro analýzu</li>
            </ul>

            <h3>6.3 Pracovní rozvrh (Weekly Schedule)</h3>
            
            <h4>Struktura rozvrhu</h4>
            <div class="code-block">
{
  "monday": { "enabled": true, "startHour": 7, "startMinute": 0, "endHour": 16, "endMinute": 0 },
  "tuesday": { "enabled": true, "startHour": 7, "startMinute": 0, "endHour": 16, "endMinute": 0 },
  "wednesday": { "enabled": true, "startHour": 7, "startMinute": 0, "endHour": 16, "endMinute": 0 },
  "thursday": { "enabled": true, "startHour": 7, "startMinute": 0, "endHour": 16, "endMinute": 0 },
  "friday": { "enabled": true, "startHour": 7, "startMinute": 0, "endHour": 16, "endMinute": 0 },
  "saturday": { "enabled": false, "startHour": 0, "startMinute": 0, "endHour": 0, "endMinute": 0 },
  "sunday": { "enabled": false, "startHour": 0, "startMinute": 0, "endHour": 0, "endMinute": 0 }
}
            </div>

            <h4>Konfigurace rozvrhu</h4>
            <ul>
                <li>Výběr dne v týdnu</li>
                <li>Toggle aktivace/deaktivace dne</li>
                <li>Nastavení počáteční a koncové doby</li>
                <li>Možnost jednoduché kopírování rozvrhu</li>
            </ul>

            <h3>6.4 Statické údaje sálů</h3>
            <p>Každý sál má následující statické informace:</p>
            <table>
                <tr>
                    <th>Vlastnost</th>
                    <th>Typ</th>
                    <th>Popis</th>
                </tr>
                <tr>
                    <td>Jméno</td>
                    <td>String</td>
                    <td>Identifikátor sálu (např. "Sál č. 1")</td>
                </tr>
                <tr>
                    <td>Oddělení</td>
                    <td>String</td>
                    <td>Medicínské oddělení (Chirurgie, Ortopédie atd.)</td>
                </tr>
                <tr>
                    <td>Typ</td>
                    <td>String</td>
                    <td>Typ sálu (Standardní, Robotická, Kardiologická atd.)</td>
                </tr>
                <tr>
                    <td>Kapacita</td>
                    <td>Number</td>
                    <td>Maximální počet lidí</td>
                </tr>
                <tr>
                    <td>Vybavení</td>
                    <td>Array</td>
                    <td>Seznam dostupného vybavení</td>
                </tr>
                <tr>
                    <td>Nouzový sál</td>
                    <td>Boolean</td>
                    <td>Je určen pro urgentní případy</td>
                </tr>
            </table>

            <h3>6.5 Workflow jednotlivého sálu</h3>
            <p>Každá operace v sále prochází následujícímimi fázemi:</p>
            <table>
                <tr>
                    <th>Fáze</th>
                    <th>Popis</th>
                    <th>Typické trvání</th>
                </tr>
                <tr>
                    <td>Příprava sálu</td>
                    <td>Příprava sálu na operaci, kontrola vybavení</td>
                    <td>15-30 minut</td>
                </tr>
                <tr>
                    <td>Příprava pacienta</td>
                    <td>Příjezd pacienta, zdravotnické procedury</td>
                    <td>10-20 minut</td>
                </tr>
                <tr>
                    <td>Chirurgický výkon</td>
                    <td>Samotná operace</td>
                    <td>30-240 minut</td>
                </tr>
                <tr>
                    <td>Vybudení pacienta</td>
                    <td>Ukončení operace a probuzení</td>
                    <td>10-30 minut</td>
                </tr>
                <tr>
                    <td>Úklid a dezinfekce</td>
                    <td>Čištění a dezinfekce sálu</td>
                    <td>15-30 minut</td>
                </tr>
            </table>
        </div>

        <!-- 7. NOTIFICATIONS -->
        <div class="section" id="notifications">
            <h2>7. Notifikační systém</h2>
            
            <h3>7.1 Přehled</h3>
            <p>Notifikační systém umožňuje automatické upozornění na důležité události a problémy v operačních sálech.</p>

            <h3>7.2 Typy notifikací</h3>
            <table>
                <tr>
                    <th>Typ</th>
                    <th>Popis</th>
                    <th>Triggery</th>
                </tr>
                <tr>
                    <td>Pozdní příchod operatéra</td>
                    <td>Operatér se zpožďuje na začátek operace</td>
                    <td>Operace má začít za X minut, operatér není přítomen</td>
                </tr>
                <tr>
                    <td>Pozdní příchod anesteziologa</td>
                    <td>Anesteziolog není přítomen v čase</td>
                    <td>Operace má začít za X minut, anesteziolog není přítomen</td>
                </tr>
                <tr>
                    <td>Nepřipravený pacient</td>
                    <td>Pacient není připraven pro operaci</td>
                    <td>Časový limit bez potvrzení připravenosti</td>
                </tr>
                <tr>
                    <td>Pozdní příjezd z oddělení</td>
                    <td>Pacient přijíždí později než plánováno</td>
                    <td>Plánovaný čas příjezdu přešel</td>
                </tr>
                <tr>
                    <td>Jiný důvod</td>
                    <td>Vlastní notifikace od personálu</td>
                    <td>Ruční spuštění uživatelem</td>
                </tr>
            </table>

            <h3>7.3 Kanály notifikací</h3>
            <ul>
                <li><strong>Email:</strong> Odesílání přes Resend API</li>
                <li><strong>In-app:</strong> Notifikace v aplikaci (toast, modal)</li>
                <li><strong>Push notifikace:</strong> Notifikace na mobilní zařízení (pokud je implementováno)</li>
                <li><strong>SMS:</strong> Kritické upozornění (pokud je nakonfigurováno)</li>
            </ul>

            <h3>7.4 Nastavení notifikací</h3>
            <p>Uživatelé mohou konfigurovat:</p>
            <ul>
                <li>Který typ notifikací chtějí dostávat</li>
                <li>Jaké kanály pro notifikace preferují</li>
                <li>Časy, kdy nechají notifikace přijímat</li>
                <li>Příjemce notifikací (email adresy)</li>
                <li>Intenzitu alertů (pouze kritické, všechny atd.)</li>
            </ul>

            <h3>7.5 Šablony emailů</h3>
            <p>Systém používá HTML šablony emailů (Resend templates):</p>
            <ul>
                <li>Profesionální design s logy nemocnice</li>
                <li>Dynamické vkládání dat (jméno sálu, čas atd.)</li>
                <li>Responzivní design pro mobily</li>
                <li>Odkaz pro potvrzení nebo zamítnutí</li>
            </ul>

            <h3>7.6 Workflow notifikace</h3>
            <div class="code-block">
Trigger událost
    ↓
Kontrola pravidel notifikace
    ↓
Výběr příjemců
    ↓
Odesílání zpráv (Email/Push/In-app)
    ↓
Uložení do notifications_log
    ↓
Tracking doručení a čtení
            </div>
        </div>

        <!-- 8. STATISTICS MODULE -->
        <div class="section" id="statistics">
            <h2>8. Modul statistiky</h2>
            
            <h3>8.1 Přehled</h3>
            <p>Modul statistiky poskytuje detailní analýzu využívání operačních sálů a výkonu.</p>

            <h3>8.2 Časové filtry</h3>
            <p>Všechna data v modulu statistiky se počítají na základě zvoleného období:</p>
            <table>
                <tr>
                    <th>Období</th>
                    <th>Popis</th>
                    <th>Použití</th>
                </tr>
                <tr>
                    <td>Den</td>
                    <td>Poslední 24 hodin (hodinové intervaly)</td>
                    <td>Denní monitoring a operativní rozhodování</td>
                </tr>
                <tr>
                    <td>Týden</td>
                    <td>Posledních 7 dní (denní intervaly)</td>
                    <td>Týdenní trendy a plánování</td>
                </tr>
                <tr>
                    <td>Měsíc</td>
                    <td>Posledních 30 dní (denní intervaly)</td>
                    <td>Měsíční analýza a reporting</td>
                </tr>
                <tr>
                    <td>Rok</td>
                    <td>Posledních 12 měsíců (měsíční intervaly)</td>
                    <td>Dlouhodobé trendy a plánování kapacity</td>
                </tr>
            </table>

            <h3>8.3 Sekce Sály</h3>
            <p>Podrobná analýza jednotlivých operačních sálů:</p>
            <ul>
                <li><strong>Počet operací:</strong> Počet operací za zvolené období</li>
                <li><strong>Průměrné vytížení:</strong> Procento času, kdy je sál v provozu</li>
                <li><strong>Stav sálu:</strong> Aktuální operační stav</li>
                <li><strong>Trend:</strong> Vývoj vytížení v čase</li>
                <li><strong>Efficiency:</strong> Efektivita (počet operací / čas disponibility)</li>
            </ul>

            <h3>8.4 Sekce Fáze</h3>
            <p>Analýza trvání a distribuce jednotlivých fází operací:</p>
            <ul>
                <li><strong>Průměrné trvání fází:</strong> Graf zobrazující průměrné trvání každé fáze v minutách</li>
                <li><strong>Procentuální zastoupení:</strong> Jak velký podíl času zabírá každá fáze</li>
                <li><strong>Trend trvání:</strong> Zda se fáze zkracují nebo prodlužují v čase</li>
                <li><strong>Distribuce:</strong> Pie chart znázorňující časové rozpočty</li>
            </ul>

            <h3>8.5 Sekce Heatmapa</h3>
            <p>Vizualizace vytížení sálů v závislosti na čase:</p>
            <ul>
                <li><strong>Heatmapa 7×24:</strong> Každý den v týdnu × 24 hodin v intenzitě barev</li>
                <li><strong>Denní průměry:</strong> Průměrné vytížení v každý den týdne</li>
                <li><strong>Hodinové trendy:</strong> Vytížení v jednotlivých hodinách</li>
                <li><strong>Špičky a poklesy:</strong> Identifikace vrcholů a období nízkého vytížení</li>
            </ul>

            <h3>8.6 Zobrazené grafy</h3>
            
            <h4>Bar Chart - Počet operací za den</h4>
            <p>Sloupcový graf zobrazující počet operací za jednotlivé dny v týdnu.</p>

            <h4>Line Chart - Trend operací</h4>
            <p>Čárový graf vývoje počtu operací v čase.</p>

            <h4>Area Chart - Trend vytížení</h4>
            <p>Plošný graf znázorňující vytížení v průběhu času (pracovní týden vs. víkend).</p>

            <h4>Pie Chart - Distribuce fází</h4>
            <p>Koláčový graf zobrazující procentuální podíl každé fáze.</p>

            <h4>Radar Chart - Metriky sálu</h4>
            <p>Radarový graf porovnávající více metrik (využití, výkon, efektivita).</p>

            <h3>8.7 Výpočet statistik z reálných dat</h3>
            <p>Všechny statistiky se počítají z reálné databáze <span class="highlight">room_status_history</span>:</p>
            <ul>
                <li>Počet operací = počet events s typem <span class="highlight">operation_start</span></li>
                <li>Trvání fáze = suma <span class="highlight">duration_seconds</span> pro daný <span class="highlight">step_name</span></li>
                <li>Vytížení sálu = procento času, kdy je sál v provozu vs. pracovní doba</li>
                <li>Heatmapa = počty operací seskupené podle dne a hodiny</li>
            </ul>

            <h3>8.8 Pracovní doba a rozvrh</h3>
            <p>Statistiky respektují pracovní dobu definovanou pro každý sál v <span class="highlight">weeklySchedule</span>:</p>
            <ul>
                <li>Nepracovní hodiny se nezapočítávají do vytížení</li>
                <li>Heatmapa zobrazuje sepií barvu pro nepracovní doby</li>
                <li>Grafy se adaptují na skutečnou pracovní dobu</li>
            </ul>

            <h3>8.9 Export statistik</h3>
            <p>Uživatelé mohou exportovat statistiky v následujících formátech:</p>
            <ul>
                <li><strong>PDF:</strong> Profesionální report s grafy a tabulkami</li>
                <li><strong>CSV/Excel:</strong> Data pro další analýzu</li>
                <li><strong>JSON:</strong> Strukturovaná data pro API integraci</li>
            </ul>
        </div>

        <!-- 9. SETTINGS -->
        <div class="section" id="settings">
            <h2>9. Nastavení aplikace</h2>
            
            <h3>9.1 Přehled</h3>
            <p>Modul nastavení umožňuje konfiguraci systému a správu uživatelů.</p>

            <h3>9.2 Oddíly nastavení</h3>
            
            <h4>Obecné nastavení</h4>
            <ul>
                <li>Název nemocnice/zařízení</li>
                <li>Logo a branding</li>
                <li>Jazyk aplikace</li>
                <li>Časové pásmo</li>
                <li>Forma datumu a času</li>
            </ul>

            <h4>Uživatelé a práva</h4>
            <ul>
                <li>Správa uživatelů</li>
                <li>Přiřazení rolí (Admin, Manager, Staff)</li>
                <li>Nastavení přístupových práv</li>
                <li>Aktivace/deaktivace uživatelů</li>
            </ul>

            <h4>Notifikační pravidla</h4>
            <ul>
                <li>Nastavení typů notifikací</li>
                <li>Výběr kanálů doručení</li>
                <li>Nastavení příjemců</li>
                <li>Doba tichého módu (DND)</li>
            </ul>

            <h4>Integrace</h4>
            <ul>
                <li>Email provider (Resend)</li>
                <li>SMS gateway (Twilio apod.)</li>
                <li>Kalendarní systémy (Google Calendar, iCal)</li>
                <li>DICOM/HIS integrace</li>
            </ul>

            <h4>Zálohování a údržba</h4>
            <ul>
                <li>Automatické zálohování</li>
                <li>Plánované údržby</li>
                <li>Logy a audit trail</li>
                <li>GDPR compliance</li>
            </ul>

            <h3>9.3 Nastavení kontaktů (Notification Recipients)</h3>
            <p>Správa kontaktů pro notifikace:</p>
            <table>
                <tr>
                    <th>Vlastnost</th>
                    <th>Popis</th>
                </tr>
                <tr>
                    <td>Jméno</td>
                    <td>Jméno osoby</td>
                </tr>
                <tr>
                    <td>Email</td>
                    <td>E-mailová adresa</td>
                </tr>
                <tr>
                    <td>Telefon</td>
                    <td>Telefonní číslo (pro SMS)</td>
                </tr>
                <tr>
                    <td>Role</td>
                    <td>Pracovní pozice</td>
                </tr>
                <tr>
                    <td>Oddělení</td>
                    <td>Přiřazené oddělení</td>
                </tr>
                <tr>
                    <td>Aktivní</td>
                    <td>Stav příjemce (aktivní/neaktivní)</td>
                </tr>
            </table>
        </div>

        <!-- 10. API REFERENCE -->
        <div class="section" id="api">
            <h2>10. API Reference</h2>
            
            <h3>10.1 Databázové funkce (lib/db.ts)</h3>
            
            <h4>fetchRooms()</h4>
            <div class="code-block">
async function fetchRooms(): Promise&lt;OperatingRoom[]&gt;

Popis: Načte všechny operační sály z databáze
Vrací: Pole objektů OperatingRoom
            </div>

            <h4>fetchRoom(roomId)</h4>
            <div class="code-block">
async function fetchRoom(roomId: string): Promise&lt;OperatingRoom&gt;

Popis: Načte konkrétní operační sál
Parametry:
  - roomId: UUID identifikátor sálu
Vrací: Objekt OperatingRoom
            </div>

            <h4>updateRoomStatus(roomId, newStatus)</h4>
            <div class="code-block">
async function updateRoomStatus(roomId: string, newStatus: RoomStatus): Promise&lt;void&gt;

Popis: Aktualizuje stav operačního sálu
Parametry:
  - roomId: UUID identifikátor sálu
  - newStatus: Nový stav (Libre, Preparing, Operating, Cleaning, Emergency)
            </div>

            <h4>fetchStatusHistory(filters)</h4>
            <div class="code-block">
async function fetchStatusHistory(filters: {
  roomId?: string,
  fromDate?: Date,
  toDate?: Date,
  limit?: number
}): Promise&lt;StatusHistoryRow[]&gt;

Popis: Načte historii změn stavů sálů
Parametry:
  - roomId: Filtr na konkrétní sál (volitelné)
  - fromDate: Počáteční datum (volitelné)
  - toDate: Koncové datum (volitelné)
  - limit: Maximální počet záznamů (volitelné)
Vrací: Pole StatusHistoryRow objektů
            </div>

            <h4>createNotification(notification)</h4>
            <div class="code-block">
async function createNotification(notification: {
  roomId: string,
  type: string,
  recipients: string[],
  message: string
}): Promise&lt;void&gt;

Popis: Vytvoří a odešle novou notifikaci
Parametry:
  - roomId: ID sálu
  - type: Typ notifikace
  - recipients: Email adresy příjemců
  - message: Zpráva pro odesílání
            </div>

            <h3>10.2 Real-time Subscriptions</h3>
            
            <h4>Subscribe to room updates</h4>
            <div class="code-block">
supabase
  .channel('public:operating_rooms')
  .on('postgres_changes', 
    { event: '*', schema: 'public', table: 'operating_rooms' },
    (payload) => {
      // Handle updates
      console.log('Room updated:', payload);
    }
  )
  .subscribe();
            </div>

            <h4>Subscribe to status history</h4>
            <div class="code-block">
supabase
  .channel('public:room_status_history')
  .on('postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'room_status_history' },
    (payload) => {
      // Handle new history entries
      console.log('New status event:', payload.new);
    }
  )
  .subscribe();
            </div>

            <h3>10.3 TypeScript Types</h3>
            
            <h4>OperatingRoom</h4>
            <div class="code-block">
interface OperatingRoom {
  id: string;
  name: string;
  status: RoomStatus;
  department: string;
  operations24h: number;
  weeklySchedule: WeeklySchedule;
  isEmergency: boolean;
  currentProcedure?: Procedure;
  statusHistory: RoomStatusSnapshot[];
}
            </div>

            <h4>RoomStatus</h4>
            <div class="code-block">
type RoomStatus = 'Libre' | 'Preparing' | 'Operating' | 
                  'Cleaning' | 'Emergency' | 'Maintenance';
            </div>

            <h4>StatusHistoryRow</h4>
            <div class="code-block">
interface StatusHistoryRow {
  id: string;
  room_id: string;
  event_type: 'operation_start' | 'step_change' | 'operation_end';
  step_name?: string;
  duration_seconds?: number;
  timestamp: string;
  metadata?: Record&lt;string, any&gt;;
}
            </div>

            <h4>WeeklySchedule</h4>
            <div class="code-block">
interface WeeklySchedule {
  monday: DayWorkingHours;
  tuesday: DayWorkingHours;
  wednesday: DayWorkingHours;
  thursday: DayWorkingHours;
  friday: DayWorkingHours;
  saturday: DayWorkingHours;
  sunday: DayWorkingHours;
}

interface DayWorkingHours {
  enabled: boolean;
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
}
            </div>
        </div>

        <!-- 11. DEPLOYMENT -->
        <div class="section" id="deployment">
            <h2>11. Nasazení a údržba</h2>
            
            <h3>11.1 Deployment Stack</h3>
            <ul>
                <li><strong>Frontend:</strong> Vercel (Next.js)</li>
                <li><strong>Database:</strong> Supabase (PostgreSQL)</li>
                <li><strong>Email:</strong> Resend</li>
                <li><strong>Storage:</strong> Vercel Blob (pokud potřeba)</li>
            </ul>

            <h3>11.2 Environment Variables</h3>
            <table>
                <tr>
                    <th>Proměnná</th>
                    <th>Popis</th>
                    <th>Příklad</th>
                </tr>
                <tr>
                    <td>NEXT_PUBLIC_SUPABASE_URL</td>
                    <td>URL Supabase projektu</td>
                    <td>https://xxxxx.supabase.co</td>
                </tr>
                <tr>
                    <td>NEXT_PUBLIC_SUPABASE_ANON_KEY</td>
                    <td>Anonymní klíč Supabase</td>
                    <td>eyXxxx...</td>
                </tr>
                <tr>
                    <td>SUPABASE_SERVICE_ROLE_KEY</td>
                    <td>Service role klíč (pouze server)</td>
                    <td>eyXxxx...</td>
                </tr>
                <tr>
                    <td>RESEND_API_KEY</td>
                    <td>API klíč pro Resend</td>
                    <td>re_xxxxx</td>
                </tr>
                <tr>
                    <td>NEXT_PUBLIC_APP_URL</td>
                    <td>Veřejná URL aplikace</td>
                    <td>https://app.example.com</td>
                </tr>
            </table>

            <h3>11.3 Instalace a spuštění lokálně</h3>
            
            <h4>Předpoklady</h4>
            <ul>
                <li>Node.js 18+</li>
                <li>npm, yarn, pnpm nebo bun</li>
                <li>Git</li>
                <li>Supabase projekt</li>
            </ul>

            <h4>Kroky</h4>
            <div class="code-block">
# Clone repository
git clone https://github.com/...

# Nainstaluj závislosti
pnpm install

# Zkopíruj environment variables
cp .env.example .env.local

# Spusť dev server
pnpm dev

# Aplikace bude dostupná na http://localhost:3000
            </div>

            <h3>11.4 Databázová migrace</h3>
            <p>Migrace schéma databáze:</p>
            <div class="code-block">
# Vytvoř migraci
supabase migration new "migration_name"

# Edituj migrační soubor v supabase/migrations/

# Aplkuj lokálně
supabase db push

# Deploy na produkci
supabase db push --remote
            </div>

            <h3>11.5 Deployment na Vercel</h3>
            <div class="code-block">
# Login do Vercel
vercel login

# Deploy
vercel deploy

# Pro production
vercel deploy --prod
            </div>

            <h3>11.6 Monitoring a Logging</h3>
            <ul>
                <li><strong>Vercel Analytics:</strong> Performance monitoring</li>
                <li><strong>Supabase Logs:</strong> Database query logs</li>
                <li><strong>Error Tracking:</strong> Sentry nebo podobné</li>
                <li><strong>Application Logs:</strong> Server-side logging</li>
            </ul>

            <h3>11.7 Backup a Disaster Recovery</h3>
            <ul>
                <li><strong>Supabase Backups:</strong> Denní automatické zálohování</li>
                <li><strong>Point-in-time Recovery:</strong> Obnovení z libovolného bodu v čase</li>
                <li><strong>Cold Backups:</strong> Týdenní off-site zálohování</li>
                <li><strong>RTO/RPO:</strong> Cíl: RTO 1 hodina, RPO 1 hodina</li>
            </ul>

            <h3>11.8 Security Best Practices</h3>
            <ul>
                <li>Vždy používej HTTPS</li>
                <li>Povoluj CORS pouze pro známé domény</li>
                <li>Aktualizuj závislosti pravidelně</li>
                <li>Prováděj security audity</li>
                <li>Implementuj rate limiting</li>
                <li>Zašifruj citlivá data</li>
                <li>Povoluj 2FA pro adminy</li>
                <li>Audituj přístup k datům (audit logs)</li>
            </ul>

            <h3>11.9 Performance Optimization</h3>
            <ul>
                <li><strong>Code Splitting:</strong> Lazy loading komponent</li>
                <li><strong>Image Optimization:</strong> Next.js Image component</li>
                <li><strong>Database Indexing:</strong> Indexy na frequently queried fields</li>
                <li><strong>Caching:</strong> Client-side a server-side caching</li>
                <li><strong>CDN:</strong> Vercel Edge Network</li>
                <li><strong>Compression:</strong> Gzip/Brotli komprese</li>
            </ul>

            <h3>11.10 Troubleshooting</h3>
            
            <h4>Aplikace se nespouští</h4>
            <ul>
                <li>Zkontroluj environment variables</li>
                <li>Ověř připojení k Supabase</li>
                <li>Zkontroluj build logs</li>
            </ul>

            <h4>Data se neaktualizují v real-time</h4>
            <ul>
                <li>Ověř Real-time subscriptions</li>
                <li>Zkontroluj RLS policies</li>
                <li>Ověř síťové připojení</li>
            </ul>

            <h4>Notifikace se neodesílají</h4>
            <ul>
                <li>Zkontroluj RESEND_API_KEY</li>
                <li>Ověř email adresy příjemců</li>
                <li>Zkontroluj notification_log tabulku</li>
            </ul>
        </div>

        <!-- Footer -->
        <div class="footer">
            <p>Operating Room Management System - Kompletní dokumentace</p>
            <p>Verze 1.0 | Duben 2026</p>
            <p>Veškerá práva vyhrazena. Tento dokument je soukromý a důvěrný.</p>
        </div>
    </div>
</body>
</html>`;

const filePath = '/vercel/share/v0-project/public/documentation.html';

try {
  fs.writeFileSync(filePath, html);
  console.log(`✓ HTML dokumentace vygenerována: ${filePath}`);
  console.log(`✓ Soubor velikost: ${(html.length / 1024).toFixed(2)} KB`);
} catch (error) {
  console.error('Chyba při zápisu souboru:', error);
  process.exit(1);
}
