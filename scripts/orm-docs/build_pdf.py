# /// script
# requires-python = ">=3.11"
# dependencies = [
#     "reportlab>=4.2.0",
#     "matplotlib>=3.9.0",
#     "networkx>=3.3",
#     "Pillow>=10.4.0",
#     "numpy>=2.0.0",
# ]
# ///
"""Generuje finální PDF dokumentaci aplikace OperatingRoom Manager.

Výstupní PDF je v dark designu sjednoceném s LoginPage:
- pozadí #020617 (slate-950)
- hlavní accent #FBBF24 (žlutá)
- typografie inspirovaná Inter / monospace pro kód
- karty s rounded corners a subtilními glassmorphism hranami

Výstup: public/orm-documentation.pdf
"""

from __future__ import annotations

import os
import sys
from pathlib import Path
from datetime import datetime

# Zajistí, aby se diagrams.py našel ve stejném adresáři jako tento skript,
# i když uv spustí skript z jiné cwd.
_SCRIPT_DIR = Path(__file__).resolve().parent
if str(_SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPT_DIR))

from reportlab.lib.colors import HexColor, Color
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm, cm
from reportlab.pdfgen import canvas
from reportlab.platypus import (
    BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer, PageBreak,
    Table, TableStyle, Image, KeepTogether, ListFlowable, ListItem,
    TableOfContents, NextPageTemplate, FrameBreak, HRFlowable,
)

from diagrams import render_all  # noqa: E402  (import po sys.path setupu)

# ============================================================================
# Design tokens — sladěno s LoginPage.tsx
# ============================================================================

BG = HexColor("#020617")
SURFACE = HexColor("#0F172A")
SURFACE_2 = HexColor("#1E293B")
BORDER = HexColor("#1E293B")
BORDER_2 = HexColor("#334155")
ACCENT = HexColor("#FBBF24")
ACCENT_DIM = HexColor("#92741A")
TEXT = HexColor("#E2E8F0")
TEXT_DIM = HexColor("#94A3B8")
TEXT_MUTED = HexColor("#64748B")
GREEN = HexColor("#10B981")
CYAN = HexColor("#06B6D4")
PURPLE = HexColor("#A855F7")
PINK = HexColor("#EC4899")
ORANGE = HexColor("#F97316")
RED = HexColor("#EF4444")
BLUE = HexColor("#3B82F6")
WHITE = HexColor("#FFFFFF")
BLACK = HexColor("#000000")

# ============================================================================
# Paragraph styles
# ============================================================================

def build_styles():
    base = getSampleStyleSheet()
    styles: dict[str, ParagraphStyle] = {}

    styles["CoverTitle"] = ParagraphStyle(
        name="CoverTitle", parent=base["Heading1"],
        fontName="Helvetica-Bold", fontSize=42, leading=46,
        textColor=WHITE, alignment=TA_LEFT, spaceAfter=6,
    )
    styles["CoverAccent"] = ParagraphStyle(
        name="CoverAccent", parent=base["Heading1"],
        fontName="Helvetica-Bold", fontSize=42, leading=46,
        textColor=ACCENT, alignment=TA_LEFT, spaceAfter=6,
    )
    styles["CoverSub"] = ParagraphStyle(
        name="CoverSub", parent=base["Normal"],
        fontName="Helvetica", fontSize=12, leading=18,
        textColor=TEXT_DIM, alignment=TA_LEFT, spaceAfter=10,
    )
    styles["CoverMeta"] = ParagraphStyle(
        name="CoverMeta", parent=base["Normal"],
        fontName="Courier", fontSize=8.5, leading=14,
        textColor=TEXT_MUTED, alignment=TA_LEFT,
    )

    styles["H1"] = ParagraphStyle(
        name="H1", parent=base["Heading1"],
        fontName="Helvetica-Bold", fontSize=22, leading=28,
        textColor=ACCENT, spaceBefore=8, spaceAfter=10,
        keepWithNext=True,
    )
    styles["H1Small"] = ParagraphStyle(
        name="H1Small", parent=base["Heading1"],
        fontName="Courier-Bold", fontSize=8, leading=12,
        textColor=ACCENT_DIM, spaceAfter=2, spaceBefore=12,
    )
    styles["H2"] = ParagraphStyle(
        name="H2", parent=base["Heading2"],
        fontName="Helvetica-Bold", fontSize=15, leading=20,
        textColor=WHITE, spaceBefore=14, spaceAfter=6,
        keepWithNext=True,
    )
    styles["H3"] = ParagraphStyle(
        name="H3", parent=base["Heading3"],
        fontName="Helvetica-Bold", fontSize=12, leading=16,
        textColor=ACCENT, spaceBefore=10, spaceAfter=4,
        keepWithNext=True,
    )
    styles["Lead"] = ParagraphStyle(
        name="Lead", parent=base["Normal"],
        fontName="Helvetica", fontSize=11, leading=16,
        textColor=TEXT, alignment=TA_JUSTIFY, spaceAfter=8,
    )
    styles["Body"] = ParagraphStyle(
        name="Body", parent=base["Normal"],
        fontName="Helvetica", fontSize=9.5, leading=14,
        textColor=TEXT, alignment=TA_JUSTIFY, spaceAfter=5,
    )
    styles["Mono"] = ParagraphStyle(
        name="Mono", parent=base["Code"],
        fontName="Courier", fontSize=8.5, leading=12,
        textColor=ACCENT, alignment=TA_LEFT, spaceAfter=4,
    )
    styles["MonoSmall"] = ParagraphStyle(
        name="MonoSmall", parent=base["Code"],
        fontName="Courier", fontSize=7.5, leading=10,
        textColor=TEXT_DIM, alignment=TA_LEFT,
    )
    styles["Caption"] = ParagraphStyle(
        name="Caption", parent=base["Normal"],
        fontName="Helvetica-Oblique", fontSize=8.5, leading=12,
        textColor=TEXT_DIM, alignment=TA_CENTER, spaceAfter=10,
    )
    styles["Bullet"] = ParagraphStyle(
        name="Bullet", parent=base["Normal"],
        fontName="Helvetica", fontSize=9.5, leading=14,
        textColor=TEXT, leftIndent=10,
    )
    styles["TOCEntry"] = ParagraphStyle(
        name="TOCEntry", parent=base["Normal"],
        fontName="Helvetica", fontSize=10, leading=18,
        textColor=TEXT,
    )
    styles["TOCAccent"] = ParagraphStyle(
        name="TOCAccent", parent=base["Normal"],
        fontName="Courier-Bold", fontSize=8, leading=18,
        textColor=ACCENT_DIM,
    )
    styles["Pill"] = ParagraphStyle(
        name="Pill", parent=base["Normal"],
        fontName="Courier-Bold", fontSize=7, leading=10,
        textColor=ACCENT, alignment=TA_LEFT,
    )

    return styles


# ============================================================================
# Page templates — dark theme s yellow accent
# ============================================================================

PAGE_W, PAGE_H = A4
MARGIN_X = 18 * mm
MARGIN_Y = 22 * mm

def draw_page_chrome(c: canvas.Canvas, doc, *, is_cover: bool = False):
    """Vykreslí dark pozadí, footer a (mimo cover) header s logem ORM."""
    # Pozadí
    c.setFillColor(BG)
    c.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)

    # Subtilní vinětace v rozích
    if not is_cover:
        c.setStrokeColor(SURFACE_2)
        c.setLineWidth(0.5)
        c.line(MARGIN_X, PAGE_H - MARGIN_Y + 8 * mm,
               PAGE_W - MARGIN_X, PAGE_H - MARGIN_Y + 8 * mm)
        c.line(MARGIN_X, MARGIN_Y - 8 * mm,
               PAGE_W - MARGIN_X, MARGIN_Y - 8 * mm)

        # Header — ORM brand
        c.setFont("Courier-Bold", 7)
        c.setFillColor(ACCENT)
        c.drawString(MARGIN_X, PAGE_H - MARGIN_Y + 11 * mm,
                     "OPERATINGROOM MANAGER")
        c.setFillColor(TEXT_MUTED)
        c.drawRightString(PAGE_W - MARGIN_X, PAGE_H - MARGIN_Y + 11 * mm,
                          "DOKUMENTACE · v1.0")

        # Footer — page number
        c.setFont("Courier-Bold", 7)
        c.setFillColor(ACCENT)
        c.drawString(MARGIN_X, MARGIN_Y - 11 * mm,
                     f"// strana {doc.page:03d}")
        c.setFillColor(TEXT_MUTED)
        c.drawRightString(PAGE_W - MARGIN_X, MARGIN_Y - 11 * mm,
                          datetime.now().strftime("%Y-%m-%d"))


def on_first_page(c, doc):
    draw_page_chrome(c, doc, is_cover=True)


def on_later_page(c, doc):
    draw_page_chrome(c, doc, is_cover=False)


# ============================================================================
# Helper builders
# ============================================================================

def kicker(text: str, styles) -> Paragraph:
    return Paragraph(f"// {text}", styles["H1Small"])


def divider(color=BORDER_2):
    return HRFlowable(width="100%", thickness=0.6, color=color, spaceBefore=4, spaceAfter=8)


def yellow_divider():
    return HRFlowable(width="40%", thickness=1.0, color=ACCENT,
                      spaceBefore=4, spaceAfter=8, hAlign="LEFT")


def card_table(rows, *, col_widths, header_color=ACCENT, body_color=TEXT,
               surface=SURFACE, header_bg=None, font_size=9):
    """Stylizovaná tabulka v dark themu."""
    if header_bg is None:
        header_bg = Color(header_color.red, header_color.green, header_color.blue, alpha=0.12)
    style_cmds = [
        ("BACKGROUND", (0, 0), (-1, 0), header_bg),
        ("TEXTCOLOR", (0, 0), (-1, 0), header_color),
        ("FONT", (0, 0), (-1, 0), "Courier-Bold", font_size),
        ("BACKGROUND", (0, 1), (-1, -1), surface),
        ("TEXTCOLOR", (0, 1), (-1, -1), body_color),
        ("FONT", (0, 1), (-1, -1), "Helvetica", font_size),
        ("LINEBELOW", (0, 0), (-1, 0), 0.6, ACCENT),
        ("LINEBELOW", (0, 1), (-1, -2), 0.3, BORDER),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 7),
        ("RIGHTPADDING", (0, 0), (-1, -1), 7),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [SURFACE, HexColor("#0B1424")]),
    ]
    t = Table(rows, colWidths=col_widths, repeatRows=1)
    t.setStyle(TableStyle(style_cmds))
    return t


def info_box(label: str, body: str, *, color=ACCENT, styles=None):
    """Stylizovaný info-box s barevnou levou hranou."""
    if styles is None:
        styles = build_styles()
    label_para = Paragraph(
        f'<font name="Courier-Bold" color="{color.hexval()}">{label.upper()}</font>',
        ParagraphStyle("ibLabel", fontSize=8, leading=11),
    )
    body_para = Paragraph(body, ParagraphStyle(
        "ibBody", parent=styles["Body"], fontSize=9, leading=13, textColor=TEXT,
    ))
    inner = Table([[label_para], [body_para]], colWidths=[160 * mm])
    inner.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), SURFACE),
        ("LINEBEFORE", (0, 0), (0, -1), 2.5, color),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    wrapper = Table([[inner]], colWidths=[160 * mm])
    wrapper.setStyle(TableStyle([
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]))
    return wrapper


# ============================================================================
# Sections
# ============================================================================

def section_cover(styles, story):
    # Velký prázdný spacer + obsah
    story.append(Spacer(1, 50 * mm))

    story.append(Paragraph(
        '<font name="Courier-Bold" color="#FBBF24">// DOKUMENTACE APLIKACE</font>',
        ParagraphStyle("kick", fontSize=10, leading=14, textColor=ACCENT)))
    story.append(Spacer(1, 6 * mm))

    story.append(Paragraph("OPERATINGROOM", styles["CoverTitle"]))
    story.append(Paragraph("MANAGER", styles["CoverAccent"]))

    story.append(Spacer(1, 4 * mm))
    story.append(yellow_divider())

    story.append(Paragraph(
        "Komplexní systém pro řízení provozu operačních sálů, sledování workflow operací, "
        "správu personálu a real-time monitoring pacientů. Postavený na Next.js 15, "
        "Supabase Postgres a React Server Components.",
        styles["CoverSub"]))

    story.append(Spacer(1, 14 * mm))

    meta_data = [
        ["VERZE",        "1.0.0"],
        ["FRAMEWORK",    "Next.js 15 · App Router"],
        ["DATABÁZE",     "Supabase Postgres + Realtime"],
        ["AUTH",         "Bcrypt + HttpOnly session cookie"],
        ["DESIGN",       "Dark theme · Yellow accent #FBBF24"],
        ["VYGENEROVÁNO", datetime.now().strftime("%Y-%m-%d %H:%M")],
    ]
    t = Table(meta_data, colWidths=[40 * mm, 110 * mm])
    t.setStyle(TableStyle([
        ("FONT", (0, 0), (0, -1), "Courier-Bold", 8),
        ("FONT", (1, 0), (1, -1), "Helvetica", 9.5),
        ("TEXTCOLOR", (0, 0), (0, -1), ACCENT),
        ("TEXTCOLOR", (1, 0), (1, -1), TEXT),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LINEBELOW", (0, 0), (-1, -1), 0.4, BORDER),
    ]))
    story.append(t)

    story.append(Spacer(1, 30 * mm))
    story.append(Paragraph(
        '<font name="Courier" color="#64748B">'
        '$ orm --docs --format=pdf --theme=dark --accent=yellow'
        '</font>',
        ParagraphStyle("cmd", fontSize=8, leading=12)))


def section_toc(styles, story):
    story.append(PageBreak())
    story.append(kicker("OBSAH DOKUMENTU", styles))
    story.append(Paragraph("Obsah", styles["H1"]))
    story.append(yellow_divider())
    story.append(Spacer(1, 4 * mm))

    chapters = [
        ("01", "Přehled aplikace",            "Co aplikace dělá, kdo ji používá, hlavní funkce"),
        ("02", "Architektura systému",         "Vrstvy: prezentační, stavová, API, datová"),
        ("03", "Graf závislostí",              "Vztahy mezi komponentami, hooky, API a DB"),
        ("04", "Autentizace a role",           "Bcrypt session, 6 rolí, RBAC matice modulů"),
        ("05", "Databázové schéma",            "15 tabulek, RLS politiky, klíčové sloupce"),
        ("06", "Workflow operace",             "8 hlavních stavů + 4 speciální, přechody"),
        ("07", "Moduly a obrazovky",           "Dashboard, Timeline, Statistiky, Personál, Nastavení"),
        ("08", "Reference API",                "Všechny endpointy, payload, odpovědi, chyby"),
        ("09", "React contexty a hooky",       "AuthContext, WorkflowStatuses, realtime hooks"),
        ("10", "Knihovny a util funkce",       "lib/db, lib/email, lib/auth, lib/realtime"),
        ("11", "Komponenty UI",                "RoomCard, RoomDetail, Sidebar, TopBar..."),
        ("12", "Návod pro uživatele",          "Krok-za-krokem: přihlášení, denní provoz, admin"),
        ("13", "Návod pro administrátora",     "Správa uživatelů, modulů, nastavení provozu"),
        ("14", "Realtime a notifikace",        "Supabase Realtime, e-mail alerts, emergency"),
        ("15", "Konfigurace prostředí",        "Environment variables, deployment Vercel"),
        ("16", "Bezpečnost",                   "RLS, RBAC, hashing, session, CSRF"),
        ("17", "Troubleshooting",              "Časté problémy a jejich řešení"),
        ("18", "Slovníček pojmů",              "Glosář termínů z medicínského provozu"),
    ]

    rows = []
    for num, title, desc in chapters:
        rows.append([
            Paragraph(f'<font name="Courier-Bold" color="#92741A">{num}</font>',
                      ParagraphStyle("n", fontSize=11, leading=14)),
            Paragraph(f'<font name="Helvetica-Bold" color="#E2E8F0">{title}</font><br/>'
                      f'<font name="Helvetica" color="#94A3B8" size="8">{desc}</font>',
                      ParagraphStyle("ti", fontSize=10, leading=14)),
        ])
    t = Table(rows, colWidths=[14 * mm, 156 * mm])
    t.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("LINEBELOW", (0, 0), (-1, -1), 0.3, BORDER),
    ]))
    story.append(t)


def section_overview(styles, story):
    story.append(PageBreak())
    story.append(kicker("KAPITOLA 01", styles))
    story.append(Paragraph("Přehled aplikace", styles["H1"]))
    story.append(yellow_divider())

    story.append(Paragraph(
        "<b>OperatingRoom Manager</b> je integrovaný systém pro řízení provozu operačních sálů "
        "v nemocničním prostředí. Slouží jako centrální nervová soustava operačního traktu — "
        "v reálném čase eviduje stav každého sálu, fázi probíhajícího výkonu, přiřazený personál "
        "i pacienta, automaticky přechází mezi stavy workflow a vyvolává notifikace pro management "
        "při kritických událostech (zpoždění, urgence, mimo plán).",
        styles["Lead"]))

    story.append(Spacer(1, 4 * mm))
    story.append(Paragraph("Cílové skupiny uživatelů", styles["H2"]))

    users = [
        ("ARO", "Anesteziologicko-resuscitační oddělení",
         "Zahájení / ukončení anestezie, sledování vitálních hodnot pacienta", PURPLE),
        ("COS", "Centrální operační sály",
         "Správa kapacity sálů, přiřazení personálu, plánování směn", CYAN),
        ("PRIMÁŘ", "Vedoucí lékař oddělení",
         "Přehled výkonů, statistiky výkonnosti, schvalování změn", PINK),
        ("MANAGEMENT", "Provozní vedení nemocnice",
         "KPI dashboardy, finanční ukazatele, denní reporting", ACCENT),
        ("USER", "Standardní personál",
         "Read-only přístup k aktuálnímu stavu sálů a timeline", BLUE),
        ("ADMIN", "Systémový administrátor",
         "Plný přístup ke konfiguraci, uživatelům, datům", GREEN),
    ]
    rows = [["ROLE", "POPIS", "HLAVNÍ ÚKOLY"]]
    for role, label, tasks, color in users:
        rows.append([
            Paragraph(f'<font name="Courier-Bold" color="{color.hexval()}">{role}</font>',
                      ParagraphStyle("r", fontSize=9, leading=12)),
            Paragraph(label, ParagraphStyle("l", fontSize=9, leading=12, textColor=TEXT)),
            Paragraph(tasks, ParagraphStyle("t", fontSize=8.5, leading=11, textColor=TEXT_DIM)),
        ])
    story.append(card_table(rows, col_widths=[28 * mm, 50 * mm, 92 * mm]))

    story.append(Spacer(1, 6 * mm))
    story.append(Paragraph("Klíčové funkce", styles["H2"]))

    features = [
        ("Real-time stav sálů",
         "Každý sál vidí všichni uživatelé okamžitě — Supabase Realtime synchronizuje stav přes WebSocket."),
        ("Workflow operace",
         "8 sekvenčních stavů (Sál připraven → Příjezd → Anestezie → Výkon → ... → Úklid) + 4 speciální (Pauza, Hygiena, Volání pacienta, Příjezd do traktu)."),
        ("Plánování směn",
         "Týdenní rozvrh sálů, přiřazení doktor / sestra / anesteziolog na konkrétní směny."),
        ("Statistiky a KPI",
         "Vytíženost sálů, průměrné délky výkonů, zpoždění, počty operací, srovnání oddělení."),
        ("Emergency režim",
         "Audio alarm + vizuální zvýraznění při urgenci, automatický e-mail managementu."),
        ("E-mail notifikace",
         "Konfigurovatelné upozornění managementu na zpoždění, denní reporty, incidenty."),
        ("Hygienický režim",
         "Označení sálu pro zvýšený hygienický režim po septických výkonech."),
        ("Mobilní zobrazení",
         "Adaptivní UI — desktop sidebar / mobile bottom nav s rychlým logout tlačítkem."),
        ("Konfigurovatelné moduly",
         "Admin může zapínat/vypínat moduly per role + měnit accent barvy."),
        ("Customizovatelné pozadí",
         "Globální přizpůsobení vzhledu (gradient / obrázek) přes Background Manager."),
    ]
    feature_items = []
    for title, desc in features:
        feature_items.append(ListItem(
            Paragraph(f'<b><font color="#FBBF24">{title}</font></b> — '
                      f'<font color="#E2E8F0">{desc}</font>',
                      ParagraphStyle("f", fontSize=9, leading=13)),
            leftIndent=10, bulletColor=ACCENT,
        ))
    story.append(ListFlowable(feature_items, bulletType="bullet",
                              bulletColor=ACCENT, leftIndent=12))


def section_architecture(styles, story, diagram_path: Path):
    story.append(PageBreak())
    story.append(kicker("KAPITOLA 02", styles))
    story.append(Paragraph("Architektura systému", styles["H1"]))
    story.append(yellow_divider())

    story.append(Paragraph(
        "Aplikace je rozdělena do <b>4 vrstev</b> s jasnou odpovědností. "
        "Každá vrstva komunikuje pouze s následující vrstvou pod ní (shora dolů), "
        "real-time updates obráceně přes Supabase Realtime channel.",
        styles["Body"]))

    story.append(Spacer(1, 4 * mm))
    story.append(Image(str(diagram_path), width=170 * mm, height=120 * mm))
    story.append(Paragraph("Obr. 1 — Vrstvená architektura aplikace.", styles["Caption"]))

    story.append(Paragraph("Popis vrstev", styles["H2"]))

    layers = [
        ("Presentation",
         "React komponenty stylované Tailwindem v dark themu s žlutým accentem (#FBBF24). "
         "App Router rendering — page.tsx je root entry, App.tsx skládá moduly. "
         "Mobilní/desktop adaptivní layout."),
        ("State",
         "AuthContext drží přihlášeného uživatele a moduly. WorkflowStatusesContext drží "
         "definici stavů workflow z DB. Custom hooky (useRealtimeSubscription, useEmergencyAlert, "
         "useEmailNotifications) zapouzdřují side effects."),
        ("API / Services",
         "Next.js Route Handlers v app/api/* implementují endpointy. lib/db.ts je tenká vrstva "
         "nad Supabase klientem s typovou bezpečností. lib/email.ts skládá HTML šablony "
         "a odesílá přes Resend."),
        ("Data / Infrastructure",
         "Supabase Postgres s 15 tabulkami a RLS na všech. Realtime přes Postgres CDC publikuje "
         "změny v `operating_rooms` všem připojeným klientům. Hostováno na Vercelu, edge funkce "
         "pro auth check, statické assety přes CDN."),
    ]
    for title, desc in layers:
        story.append(Paragraph(title, styles["H3"]))
        story.append(Paragraph(desc, styles["Body"]))


def section_dependencies(styles, story, diagram_path: Path):
    story.append(PageBreak())
    story.append(kicker("KAPITOLA 03", styles))
    story.append(Paragraph("Graf závislostí", styles["H1"]))
    story.append(yellow_divider())

    story.append(Paragraph(
        "Diagram níže ukazuje <b>všechny komponenty, hooky, API endpointy a datové služby</b> "
        "aplikace a jejich vzájemné vztahy. Šipky reprezentují směr volání / importu — "
        "pokud A → B, znamená to, že A závisí na B.",
        styles["Body"]))

    story.append(Spacer(1, 3 * mm))
    story.append(Image(str(diagram_path), width=170 * mm, height=170 * mm))
    story.append(Paragraph("Obr. 2 — Kompletní graf závislostí. Barvy odpovídají kategorii uzlu.",
                           styles["Caption"]))

    story.append(Paragraph("Klíčové entry pointy", styles["H2"]))
    rows = [
        ["UZEL", "TYP", "POPIS"],
        ["app/page.tsx", "root", "Hlavní entry point — zabaluje AuthProvider"],
        ["AuthProvider", "context", "Bootstrap session přes /api/auth/me, drží user objekt"],
        ["App.tsx", "root", "Hlavní shell po přihlášení — sidebar + view switcher"],
        ["LoginPage", "view", "Přihlašovací obrazovka (vidíte zde její design v PDF)"],
        ["RoomDetail", "view", "Detail jednoho sálu se všemi akcemi a statushistory"],
        ["TimelineModule", "view", "Časová osa všech sálů s kapacitními omezeními"],
        ["StatisticsModule", "view", "KPI dashboardy a srovnávací grafy"],
    ]
    story.append(card_table(rows, col_widths=[44 * mm, 22 * mm, 104 * mm]))


def section_auth(styles, story, diagram_path: Path):
    story.append(PageBreak())
    story.append(kicker("KAPITOLA 04", styles))
    story.append(Paragraph("Autentizace a role", styles["H1"]))
    story.append(yellow_divider())

    story.append(Paragraph(
        "Aplikace používá <b>vlastní autentizaci nad Supabase Postgres tabulkou app_users</b> "
        "(NE Supabase Auth). Hesla jsou hashovaná bcryptem (cost factor 10), session se ukládá "
        "do <b>HttpOnly cookie</b> jako podepsaný JWT. RBAC je řešený sloupcem `role` v `app_users` "
        "a `allowed_roles` v `app_modules`.",
        styles["Body"]))

    story.append(Spacer(1, 3 * mm))
    story.append(Image(str(diagram_path), width=170 * mm, height=92 * mm))
    story.append(Paragraph("Obr. 3 — Tok autentizace a obnovení session.",
                           styles["Caption"]))

    story.append(Paragraph("Účty pro přihlášení (po seedu)", styles["H2"]))
    rows = [
        ["EMAIL",                   "JMÉNO",                "ROLE",         "HESLO"],
        ["admin@nemocnice.cz",      "Administrátor",        "admin",        "admin123"],
        ["aro@nemocnice.cz",        "ARO oddělení",         "aro",          "aro123"],
        ["cos@nemocnice.cz",        "Centrální oper. sály", "cos",          "cos123"],
        ["primar@nemocnice.cz",     "Primariát",            "primar",       "primar123"],
        ["management@nemocnice.cz", "Management",           "management",   "management123"],
        ["user@nemocnice.cz",       "Uživatel",             "user",         "user123"],
    ]
    story.append(card_table(rows, col_widths=[58 * mm, 42 * mm, 32 * mm, 38 * mm]))

    story.append(Spacer(1, 4 * mm))
    story.append(info_box(
        "BEZPEČNOST",
        "V produkci hesla okamžitě změňte. Outdated bcrypt cost factor zvyšte na 12. "
        "Session JWT je podepsaný SUPABASE_JWT_SECRET — držte tajný v env vars.",
        color=RED, styles=styles))

    story.append(Paragraph("Matice přístupů (RBAC)", styles["H2"]))
    story.append(Paragraph(
        "Tabulka <code>app_modules</code> má sloupec <code>allowed_roles TEXT[]</code>. "
        "Funkce <code>hasModuleAccess()</code> v AuthContextu vrací true, pokud:",
        styles["Body"]))
    items = [
        "uživatel má roli `admin` (zkratka — vidí vše),",
        "modul je `is_enabled = true` a uživatelská role je v `allowed_roles`.",
    ]
    story.append(ListFlowable(
        [ListItem(Paragraph(t, styles["Body"])) for t in items],
        bulletType="bullet", bulletColor=ACCENT,
    ))

    rbac = [
        ["MODUL",       "ADMIN", "ARO", "COS", "PRIMAR", "MGMT", "USER"],
        ["dashboard",   "✓",     "✓",   "✓",   "✓",      "✓",    "✓"],
        ["timeline",    "✓",     "✓",   "✓",   "✓",      "✓",    "✓"],
        ["statistics",  "✓",     "—",   "✓",   "✓",      "✓",    "✓"],
        ["staff",       "✓",     "—",   "✓",   "—",      "✓",    "✓"],
        ["alerts",      "✓",     "✓",   "✓",   "✓",      "✓",    "✓"],
        ["settings",    "✓",     "—",   "—",   "—",      "—",    "—"],
    ]
    t = card_table(rbac, col_widths=[34 * mm, 20 * mm, 20 * mm, 20 * mm, 24 * mm, 24 * mm, 22 * mm])
    story.append(t)


def section_db(styles, story, diagram_path: Path):
    story.append(PageBreak())
    story.append(kicker("KAPITOLA 05", styles))
    story.append(Paragraph("Databázové schéma", styles["H1"]))
    story.append(yellow_divider())

    story.append(Paragraph(
        "Databáze běží na <b>Supabase Postgres</b> s 15 tabulkami. "
        "Všechny tabulky mají zapnuté <b>Row Level Security (RLS)</b> "
        "se 4 policiemi (SELECT, INSERT, UPDATE, DELETE) na tabulku.",
        styles["Body"]))

    story.append(Spacer(1, 3 * mm))
    story.append(Image(str(diagram_path), width=170 * mm, height=135 * mm))
    story.append(Paragraph(
        "Obr. 4 — DB schéma. Žluté tabulky jsou kmenové (master), modré jsou pohybové.",
        styles["Caption"]))

    story.append(Paragraph("Master tabulky (kmenová data)", styles["H2"]))

    tables = [
        ("app_users",          "Uživatelé aplikace, role, bcrypt heslo, is_active"),
        ("app_modules",        "Moduly aplikace, accent barvy, RBAC allowed_roles"),
        ("app_settings",       "Singleton — globální nastavení (název zařízení, pozadí)"),
        ("departments",        "Oddělení (Trauma, Chir, Neuro...) s accent barvami"),
        ("sub_departments",    "Pododdělení (HPB, Cévní, Dětské, Mammo...)"),
        ("operating_rooms",    "Operační sály — name, status, currentStepIndex, weeklySchedule"),
        ("staff",              "Personál — role, skill_level, availability, vacation_days"),
        ("workflow_statuses",  "Definice fází workflow — name, color, icon, duration"),
        ("management_contacts", "Kontakty managementu pro e-mail notifikace"),
        ("equipment",          "Vybavení sálů — type, last_maintenance"),
    ]
    rows = [["TABULKA", "POPIS"]]
    for name, desc in tables:
        rows.append([
            Paragraph(f'<font name="Courier-Bold" color="#FBBF24">{name}</font>',
                      ParagraphStyle("n", fontSize=8.5)),
            Paragraph(desc, ParagraphStyle("d", fontSize=9, leading=12, textColor=TEXT)),
        ])
    story.append(card_table(rows, col_widths=[58 * mm, 112 * mm]))

    story.append(Spacer(1, 4 * mm))
    story.append(Paragraph("Pohybové tabulky", styles["H2"]))
    moves = [
        ("schedules",            "Plán operací (datum, čas, pacient, sál, priorita)"),
        ("shift_schedules",     "Směny personálu (datum, sál, staff, start/end time)"),
        ("room_status_history",  "Audit log přechodů workflow (timestamp, duration_seconds, metadata)"),
        ("notifications_log",   "Historie odeslaných notifikací (room, type, recipient_count)"),
    ]
    rows = [["TABULKA", "POPIS"]]
    for name, desc in moves:
        rows.append([
            Paragraph(f'<font name="Courier-Bold" color="#06B6D4">{name}</font>',
                      ParagraphStyle("n", fontSize=8.5)),
            Paragraph(desc, ParagraphStyle("d", fontSize=9, leading=12, textColor=TEXT)),
        ])
    story.append(card_table(rows, col_widths=[58 * mm, 112 * mm], header_color=CYAN))


def section_workflow(styles, story, diagram_path: Path):
    story.append(PageBreak())
    story.append(kicker("KAPITOLA 06", styles))
    story.append(Paragraph("Workflow operace", styles["H1"]))
    story.append(yellow_divider())

    story.append(Paragraph(
        "Každý operační sál prochází <b>8 sekvenčními stavy</b> (Sál připraven → ... → Úklid sálu) "
        "a může mít navíc nastaveno až 4 paralelní speciální stavy aktivované tlačítky "
        "(Pauza, Hygienický režim, Volání pacienta, Příjezd do traktu).",
        styles["Body"]))

    story.append(Spacer(1, 3 * mm))
    story.append(Image(str(diagram_path), width=170 * mm, height=80 * mm))
    story.append(Paragraph(
        "Obr. 5 — Sekvence 8 stavů + 4 speciální stavy spuštěné tlačítky.",
        styles["Caption"]))

    story.append(Paragraph("Detail jednotlivých stavů", styles["H2"]))

    rows = [["#", "STAV", "ORGANIZÁTOR", "VÝCHOZÍ DOBA"]]
    workflow = [
        ("0", "Sál připraven",        "Vedoucí sestra",  "—"),
        ("1", "Příjezd na sál",       "Příjmový tým",    "5 min"),
        ("2", "Začátek anestezie",    "Anesteziolog",    "20 min"),
        ("3", "Chirurgický výkon",    "Chirurg",         "60 min*"),
        ("4", "Ukončení výkonu",      "Chirurg",         "10 min"),
        ("5", "Ukončení anestezie",   "Anesteziolog",    "15 min"),
        ("6", "Odjezd ze sálu",       "Příjmový tým",    "10 min"),
        ("7", "Úklid sálu",           "Sanitární tým",   "15 min"),
    ]
    for n, label, org, dur in workflow:
        rows.append([
            Paragraph(f'<font name="Courier-Bold" color="#FBBF24">{n}</font>',
                      ParagraphStyle("n", fontSize=10)),
            Paragraph(label, ParagraphStyle("l", fontSize=9, leading=12, textColor=TEXT)),
            Paragraph(org, ParagraphStyle("o", fontSize=8.5, leading=12, textColor=TEXT_DIM)),
            Paragraph(dur, ParagraphStyle("d", fontSize=8.5, leading=12, textColor=ACCENT)),
        ])
    story.append(card_table(rows, col_widths=[14 * mm, 56 * mm, 56 * mm, 44 * mm]))
    story.append(Paragraph("* Doba výkonu je přepsána délkou konkrétní procedury z plánu.",
                           styles["Caption"]))

    story.append(Paragraph("Speciální stavy (paralelní)", styles["H2"]))
    rows = [["STAV", "TYP", "POPIS"]]
    special = [
        ("Pauza",                          "pause",                "Dočasné pozastavení operace bez ukončení workflow."),
        ("Hygienický režim",               "hygiene",              "Zvýšený hygienický režim po septickém výkonu."),
        ("Volání pacienta",                "patient_called",       "Pacient byl volán z lůžkové části — eviduje se timestamp."),
        ("Příjezd do operačního traktu",   "patient_arrived_tract", "Pacient dorazil na operační trakt — předposlední krok před vstupem na sál."),
    ]
    for name, t, desc in special:
        rows.append([
            Paragraph(f'<font name="Courier-Bold" color="#FBBF24">{name}</font>',
                      ParagraphStyle("n", fontSize=8.5)),
            Paragraph(t, ParagraphStyle("t", fontSize=8.5, leading=12,
                                        textColor=CYAN, fontName="Courier")),
            Paragraph(desc, ParagraphStyle("d", fontSize=8.5, leading=12, textColor=TEXT)),
        ])
    story.append(card_table(rows, col_widths=[44 * mm, 36 * mm, 90 * mm]))


def section_modules(styles, story):
    story.append(PageBreak())
    story.append(kicker("KAPITOLA 07", styles))
    story.append(Paragraph("Moduly a obrazovky", styles["H1"]))
    story.append(yellow_divider())

    story.append(Paragraph(
        "Aplikace je rozdělena do <b>6 hlavních modulů</b> dostupných v levém sidebaru "
        "(desktop) nebo spodním navigačním pásu (mobile). Každý modul lze admin zapnout / "
        "vypnout na úrovni rolí.",
        styles["Body"]))

    modules = [
        ("Dashboard", LayoutGrid_icon := "■",
         "Přehled všech sálů jako karty — barva = stav, miniaturní progress bar workflow, "
         "počet operací 24h, indikátor septického / urgenčního režimu. Klik otevře RoomDetail."),
        ("Timeline", "▦",
         "Horizontální časová osa — řádek = sál, sloupce = hodiny dne. Plánované operace "
         "zobrazeny jako bloky s barvou oddělení. Lze přepínat den / týden."),
        ("Statistiky", "▌",
         "KPI dashboardy — vytíženost sálů, průměrné délky výkonů, srovnání oddělení, "
         "trendy zpoždění, počet urgencí. Filtrování podle data, oddělení, sálu."),
        ("Personál", "◉",
         "Správa lékařů, sester, anesteziologů. Karty zaměstnanců s úrovní dovedností (L1-L3, "
         "A, SR, N, S), dostupností, dovolenými, nemocnostmi. Filter podle role / oddělení."),
        ("Upozornění", "▲",
         "Centrum notifikací — historie odeslaných e-mailů, stávající alerty (zpoždění, "
         "emergency), realtime banner pro nové události."),
        ("Nastavení", "❖",
         "Admin centrum — operační sály, oddělení, statusy workflow, management kontakty, "
         "rozvrh směn, pozadí aplikace, systémová nastavení, e-mailové notifikace."),
    ]
    for name, icon, desc in modules:
        story.append(Paragraph(f"{name}", styles["H3"]))
        story.append(Paragraph(desc, styles["Body"]))
        story.append(Spacer(1, 1 * mm))


def section_api(styles, story):
    story.append(PageBreak())
    story.append(kicker("KAPITOLA 08", styles))
    story.append(Paragraph("Reference API", styles["H1"]))
    story.append(yellow_divider())

    story.append(Paragraph(
        "Všechny API endpointy jsou implementovány jako <b>Next.js Route Handlers</b> "
        "v adresáři <code>app/api/*/route.ts</code>. Endpointy chráněné autentizací "
        "ověřují session přes <code>lib/auth/server.ts</code>.",
        styles["Body"]))

    endpoints = [
        ("AUTH", "POST", "/api/auth/login",
         "Body: { email, password } · Response: { user } + Set-Cookie", BLUE),
        ("AUTH", "POST", "/api/auth/logout",
         "Vymaže session cookie · Response: { ok: true }", BLUE),
        ("AUTH", "GET",  "/api/auth/me",
         "Vrátí aktuálního uživatele z cookie · Response: { user } | 401", BLUE),
        ("ROOMS", "GET", "/api/rooms",
         "Načte všechny operační sály včetně jejich aktuálního stavu", CYAN),
        ("ROOMS", "PATCH", "/api/operating-rooms/reorder",
         "Body: [{ id, sort_order }] — uloží nové pořadí sálů (admin only)", CYAN),
        ("ADMIN", "GET",  "/api/admin/facility",
         "Vrátí konfiguraci zařízení (název, adresa, kontakt)", ACCENT),
        ("ADMIN", "PATCH", "/api/admin/facility",
         "Aktualizuje konfiguraci zařízení (admin only)", ACCENT),
        ("ADMIN", "POST", "/api/admin/export-data",
         "Vyexportuje všechna data do JSON souboru (admin only)", ACCENT),
        ("ADMIN", "POST", "/api/admin/import-data",
         "Importuje data z JSON (admin only) — DESTRUKTIVNÍ", RED),
        ("ADMIN", "POST", "/api/admin/reset-data",
         "Vyčistí pohybová data (admin only) — DESTRUKTIVNÍ", RED),
        ("CONTACTS", "GET",   "/api/management-contacts",
         "Načte kontakty managementu pro notifikace", PURPLE),
        ("CONTACTS", "POST",  "/api/management-contacts",
         "Vytvoří nový kontakt managementu", PURPLE),
        ("CONTACTS", "PATCH", "/api/management-contacts",
         "Aktualizuje stávající kontakt", PURPLE),
        ("CONTACTS", "DELETE", "/api/management-contacts",
         "Smaže kontakt", PURPLE),
        ("WORKFLOW", "GET",   "/api/workflow-statuses",
         "Načte definici stavů workflow z DB", PINK),
        ("WORKFLOW", "POST",  "/api/workflow-statuses",
         "Vytvoří nový custom stav workflow (admin only)", PINK),
        ("WORKFLOW", "PATCH", "/api/workflow-statuses",
         "Aktualizuje stav workflow (admin only)", PINK),
        ("NOTIFY", "POST", "/api/send-notification",
         "Body: { roomId, type, customReason } — odešle e-mail managementu", GREEN),
    ]

    rows = [["MODUL", "METODA", "ENDPOINT", "POPIS"]]
    for mod, method, ep, desc, color in endpoints:
        rows.append([
            Paragraph(f'<font name="Courier-Bold" color="{color.hexval()}">{mod}</font>',
                      ParagraphStyle("m", fontSize=7.5, leading=10)),
            Paragraph(f'<font name="Courier-Bold" color="#FBBF24">{method}</font>',
                      ParagraphStyle("v", fontSize=7.5, leading=10)),
            Paragraph(f'<font name="Courier" color="#E2E8F0">{ep}</font>',
                      ParagraphStyle("e", fontSize=7.5, leading=10)),
            Paragraph(desc, ParagraphStyle("d", fontSize=7.5, leading=10, textColor=TEXT_DIM)),
        ])
    story.append(card_table(rows, col_widths=[20 * mm, 16 * mm, 60 * mm, 78 * mm], font_size=8))


def section_contexts(styles, story):
    story.append(PageBreak())
    story.append(kicker("KAPITOLA 09", styles))
    story.append(Paragraph("React contexty a hooky", styles["H1"]))
    story.append(yellow_divider())

    story.append(Paragraph("AuthContext", styles["H2"]))
    story.append(Paragraph(
        "Globální stav přihlášení. Bootstrapping provádí GET /api/auth/me — pokud cookie obsahuje "
        "platný JWT, server vrátí user objekt a kontext nastaví <code>isAuthenticated = true</code>. "
        "Login a logout jsou async funkce volající příslušné endpointy a aktualizující stav.",
        styles["Body"]))
    story.append(info_box(
        "API",
        "<b>useAuth()</b> vrací: user, isLoading, isAuthenticated, isAdmin, modules, "
        "login(), logout(), refreshModules(), toggleModule(), toggleModuleRole(), hasModuleAccess()",
        color=ACCENT, styles=styles))

    story.append(Paragraph("WorkflowStatusesContext", styles["H2"]))
    story.append(Paragraph(
        "Drží definici workflow stavů z DB tabulky <code>workflow_statuses</code>. "
        "Cachuje je v paměti a refreshuje na demand, takže komponenty (RoomDetail, RoomCard) "
        "nemusí každá dělat vlastní fetch.",
        styles["Body"]))

    story.append(Paragraph("Custom hooky", styles["H2"]))
    hooks = [
        ("useRealtimeSubscription",
         "Připojí se k Supabase Realtime channelu na konkrétní tabulku a předá callback "
         "při INSERT / UPDATE / DELETE. Automatický cleanup při unmount."),
        ("useEmergencyAlert",
         "Detekuje urgence v poli rooms — zapne audio alarm (Web Audio API) a vizuální "
         "puls. Při unmount uvolní AudioContext."),
        ("useEmailNotifications",
         "Sleduje stavy sálů a po překročení prahových časů (zpoždění > X minut) volá "
         "/api/send-notification. Debounce per sál, aby se neposlalo opakovaně."),
        ("useWorkflowStatuses",
         "Tenký wrapper nad WorkflowStatusesContext s memoizovanými helpery "
         "(getStatusByIndex, getNextStatus, isSpecialStatus)."),
    ]
    rows = [["HOOK", "POPIS"]]
    for name, desc in hooks:
        rows.append([
            Paragraph(f'<font name="Courier-Bold" color="#EC4899">{name}</font>',
                      ParagraphStyle("n", fontSize=8.5)),
            Paragraph(desc, ParagraphStyle("d", fontSize=8.5, leading=12, textColor=TEXT)),
        ])
    story.append(card_table(rows, col_widths=[58 * mm, 112 * mm], header_color=PINK))


def section_lib(styles, story):
    story.append(PageBreak())
    story.append(kicker("KAPITOLA 10", styles))
    story.append(Paragraph("Knihovny a util funkce", styles["H1"]))
    story.append(yellow_divider())

    libs = [
        ("lib/supabase.ts",
         "Klient pro browser-side Supabase (anon key). Re-exportuje "
         "isSupabaseConfigured pro graceful degradation v dev."),
        ("lib/supabase-server.ts",
         "Server-side Supabase klient s service role key — pro RLS-bypass v API routes."),
        ("lib/db.ts",
         "Hlavní data layer — fetchOperatingRooms, transformRoom, transformStaff. "
         "Jediné místo, kde se Supabase row mapuje na typy z types.ts."),
        ("lib/auth/session.ts",
         "createSession, verifySession — JWT helpers (sign + verify) přes SUPABASE_JWT_SECRET. "
         "Cookie nastavena s HttpOnly, Secure, SameSite=Lax."),
        ("lib/auth/server.ts",
         "getServerSession() pro API routes — z cookie ověří JWT a vrátí user objekt."),
        ("lib/auth/rate-limit.ts",
         "In-memory rate limit (5 pokusů / 15 min) na /api/auth/login podle IP."),
        ("lib/email.ts",
         "HTML šablony notifikací (zpoždění, urgence, denní report) + odesílač přes Resend."),
        ("lib/realtime-notifications.ts",
         "Helpers pro broadcast notifikací přes Supabase Realtime — emergency banner."),
    ]
    rows = [["MODUL", "POPIS"]]
    for name, desc in libs:
        rows.append([
            Paragraph(f'<font name="Courier-Bold" color="#F97316">{name}</font>',
                      ParagraphStyle("n", fontSize=8.5)),
            Paragraph(desc, ParagraphStyle("d", fontSize=8.5, leading=12, textColor=TEXT)),
        ])
    story.append(card_table(rows, col_widths=[58 * mm, 112 * mm], header_color=ORANGE))


def section_components(styles, story):
    story.append(PageBreak())
    story.append(kicker("KAPITOLA 11", styles))
    story.append(Paragraph("Komponenty UI", styles["H1"]))
    story.append(yellow_divider())

    components = [
        ("LoginPage",            "Přihlašovací obrazovka — žlutý accent, glassmorph karty, hero titul OPERATINGROOM MANAGER"),
        ("Sidebar",              "Levý navigační panel (desktop) — moduly, hover states, active highlight"),
        ("TopBar",               "Horní lišta — emergency banner, user menu, logout, breadcrumbs"),
        ("MobileNav",            "Spodní nav lišta (mobile) — 5 ikon + tlačítko Odhlásit"),
        ("MobileShell",          "Adaptivní wrapper pro mobile views — drawer, bottom sheets"),
        ("RoomCard",             "Karta sálu — barva = stav, mini timeline, info pacient + lékař"),
        ("RoomDetail",           "Plná obrazovka detailu sálu — workflow akce, history, edit pacienta"),
        ("TimelineModule",       "Časová osa všech sálů s plánovanými operacemi"),
        ("StatisticsModule",     "KPI dashboardy a grafy (recharts)"),
        ("StaffManager",         "Správa personálu — karty, filtry, přidání / editace"),
        ("StaffPickerModal",     "Modální dialog pro výběr personálu při přiřazení k operaci"),
        ("OperatingRoomsManager", "Admin: CRUD pro sály, drag-and-drop reorder, weeklySchedule"),
        ("DepartmentsManager",   "Admin: CRUD pro oddělení a pododdělení"),
        ("StatusesManager",      "Admin: CRUD pro stavy workflow, drag reorder"),
        ("ManagementManager",    "Admin: kontakty managementu pro notifikace"),
        ("NotificationsManager", "Admin: konfigurace e-mailových notifikací (kdy posílat, komu)"),
        ("BackgroundManager",    "Admin: globální vzhled — gradient / obrázek / opacity"),
        ("SystemSettingsModule", "Admin: údaje zařízení (název, adresa, IČO, kontakt)"),
        ("ShiftScheduleManager", "Admin: rozvrh směn personálu na sály"),
        ("SettingsPage",         "Hub pro admin moduly — sekundární navigace"),
        ("NotificationOverlay",  "Globální emergency banner — animovaný puls, audio alarm"),
        ("StepConfirmationOverlay", "Modální potvrzení změny stavu workflow (přechod na další fázi)"),
        ("ErrorBoundary",        "Zachytávač runtime chyb — fallback UI místo bílé obrazovky"),
        ("PlaceholderView",      "Generický prázdný stav pro moduly bez dat"),
        ("AnimatedCounter",      "Plynule animovaný číselný counter (statistiky)"),
        ("EmailTemplate",        "Server-only HTML šablony e-mailů"),
        ("ScheduleManager",      "Plánovač operací (datum, čas, sál, pacient, procedura)"),
        ("MobileStaffView",      "Mobilní view personálu — kompaktní karty"),
        ("MobileTimelineView",   "Mobilní view timeline — vertikální orientace"),
    ]
    rows = [["KOMPONENTA", "POPIS"]]
    for name, desc in components:
        rows.append([
            Paragraph(f'<font name="Courier-Bold" color="#06B6D4">{name}</font>',
                      ParagraphStyle("n", fontSize=8)),
            Paragraph(desc, ParagraphStyle("d", fontSize=8, leading=11, textColor=TEXT)),
        ])
    story.append(card_table(rows, col_widths=[58 * mm, 112 * mm], header_color=CYAN, font_size=8))


def section_user_guide(styles, story):
    story.append(PageBreak())
    story.append(kicker("KAPITOLA 12", styles))
    story.append(Paragraph("Návod pro uživatele", styles["H1"]))
    story.append(yellow_divider())

    story.append(Paragraph("Přihlášení do aplikace", styles["H2"]))
    steps = [
        "Otevřete URL aplikace v prohlížeči (Chrome / Edge / Safari).",
        "Klikněte na tlačítko <b>Přihlášení do systému</b>.",
        "Zadejte e-mail a heslo, který Vám předal administrátor.",
        "Stiskněte <b>Přihlásit se</b> — pokud jsou údaje správné, jste přesměrováni do dashboardu.",
        "Pro rychlý přístup můžete použít demo tlačítka (admin, ARO, COS, ...) — předvyplní formulář.",
    ]
    items = [ListItem(Paragraph(s, styles["Body"])) for s in steps]
    story.append(ListFlowable(items, bulletType="1", bulletColor=ACCENT))

    story.append(Paragraph("Hlavní pohled — Dashboard", styles["H2"]))
    story.append(Paragraph(
        "Po přihlášení uvidíte mřížku karet, kde každá karta představuje jeden sál. "
        "<b>Barva karty</b> indikuje stav: zelená = volný, žlutá = připravený, červená = obsazený, "
        "modrá = úklid, fialová = septický režim. Číslo v rohu = počet operací 24 h. "
        "Tečka v rohu = urgence.",
        styles["Body"]))
    story.append(Paragraph("Klikem na kartu se otevře <b>RoomDetail</b> s plnou interakcí.",
                           styles["Body"]))

    story.append(Paragraph("Práce se sálem (RoomDetail)", styles["H2"]))
    story.append(Paragraph(
        "V detailu sálu můžete (podle role):",
        styles["Body"]))
    actions = [
        "Přejít na další fázi workflow (tlačítko <b>Další stav</b>) — vyžaduje potvrzení v overlay.",
        "Aktivovat speciální stav: <b>Pauza</b>, <b>Hygienický režim</b>, <b>Volání pacienta</b>, <b>Příjezd do traktu</b>.",
        "Označit sál jako <b>septický</b> — automaticky se aktivuje hygienický režim po dokončení.",
        "Vyhlásit <b>Emergency</b> — globální audio alarm + e-mail managementu.",
        "Zamknout sál (admin only) — neumožní změny do odemčení.",
        "Editovat aktuálního pacienta a proceduru.",
        "Prohlížet historii změn stavů (audit log s timestamps a délkami).",
    ]
    items = [ListItem(Paragraph(a, styles["Body"]), bulletColor=ACCENT) for a in actions]
    story.append(ListFlowable(items, bulletType="bullet", bulletColor=ACCENT))

    story.append(Paragraph("Timeline modul", styles["H2"]))
    story.append(Paragraph(
        "Časová osa zobrazuje plánované operace všech sálů na daný den. Bloky mají barvu oddělení. "
        "Lze přepínat datum vlevo nahoře, klik na blok zobrazí detail operace.",
        styles["Body"]))

    story.append(Paragraph("Emergency režim", styles["H2"]))
    story.append(info_box(
        "EMERGENCY",
        "Při vyhlášení urgence se zapne audio alarm (3× pípnutí) a po celé aplikaci se objeví "
        "červený pulzující banner. Alarm trvá, dokud někdo s rolí ARO / COS / Management urgenci "
        "nepotvrdí v RoomDetail. Souběžně se odešle e-mail všem kontaktům s "
        "<code>notify_emergencies = true</code>.",
        color=RED, styles=styles))


def section_admin_guide(styles, story):
    story.append(PageBreak())
    story.append(kicker("KAPITOLA 13", styles))
    story.append(Paragraph("Návod pro administrátora", styles["H1"]))
    story.append(yellow_divider())

    story.append(Paragraph(
        "Modul <b>Nastavení</b> je dostupný pouze pro roli <code>admin</code>. "
        "Obsahuje 8 podsekcí:", styles["Body"]))

    sections = [
        ("Operační sály", "Přidat / upravit / smazat sál. Drag-and-drop pro pořadí. "
         "Týdenní rozvrh (pondělí–neděle, start/end, pauza)."),
        ("Oddělení", "CRUD pro oddělení a jejich pododdělení. Accent barva."),
        ("Stavy workflow", "Přidat / upravit / smazat stav. Drag-and-drop. "
         "Speciální typ (pause, hygiene...). Show in timeline / room detail / statistiky."),
        ("Personál", "Spravujte zaměstnance, jejich role, dovednosti, dovolené."),
        ("Management kontakty", "Přidávejte e-maily lidí, kterým se mají posílat notifikace. "
         "Granularita: emergencies, late_arrival, daily_reports, ..."),
        ("Notifikace", "Konfigurace prahových časů zpoždění a typů událostí, které spouštějí e-mail."),
        ("Pozadí", "Vyberte typ pozadí (gradient / obrázek), barvy, opacity, blur."),
        ("Systém", "Údaje zařízení (název, adresa, IČO, kontakt) — zobrazují se v záhlaví reportů."),
    ]
    for name, desc in sections:
        story.append(Paragraph(name, styles["H3"]))
        story.append(Paragraph(desc, styles["Body"]))

    story.append(Paragraph("Export / Import / Reset", styles["H2"]))
    story.append(info_box(
        "DESTRUKTIVNÍ OPERACE",
        "Reset i Import data jsou nevratné. Vždy nejdřív vytvořte <b>Export</b> jako zálohu. "
        "Doporučujeme zálohu měsíčně + před každou import operací.",
        color=RED, styles=styles))


def section_realtime(styles, story):
    story.append(PageBreak())
    story.append(kicker("KAPITOLA 14", styles))
    story.append(Paragraph("Realtime a notifikace", styles["H1"]))
    story.append(yellow_divider())

    story.append(Paragraph("Supabase Realtime", styles["H2"]))
    story.append(Paragraph(
        "Aplikace je připojena k <b>postgres_changes</b> kanálu Supabase Realtime. "
        "Každá změna na <code>operating_rooms</code> (UPDATE step, status, patient) "
        "se okamžitě projeví u všech připojených klientů přes WebSocket — nepotřebujete refreshovat.",
        styles["Body"]))

    story.append(Paragraph("Hook useRealtimeSubscription", styles["H2"]))
    story.append(Paragraph(
        "<font name=\"Courier\" size=\"8\">"
        "useRealtimeSubscription({ table: 'operating_rooms', event: '*', filter: '...' }, callback)"
        "</font><br/>"
        "Automaticky cleanup při unmount, odpojí kanál a uvolní subscription.",
        styles["Body"]))

    story.append(Paragraph("E-mail notifikace", styles["H2"]))
    story.append(Paragraph(
        "Implementace: useEmailNotifications hook sleduje stavy a porovnává s konfigurovanými "
        "prahy. Při překročení volá POST /api/send-notification, který:",
        styles["Body"]))
    items = [
        "vytvoří HTML e-mail z šablony v <code>lib/email.ts</code>,",
        "odešle přes Resend API (vyžaduje RESEND_API_KEY env var),",
        "zaloguje záznam do <code>notifications_log</code> (pro audit).",
    ]
    story.append(ListFlowable(
        [ListItem(Paragraph(t, styles["Body"]), bulletColor=ACCENT) for t in items],
        bulletType="bullet", bulletColor=ACCENT,
    ))

    story.append(Paragraph("Typy notifikací", styles["H2"]))
    types = [
        ("late_arrival",        "Pacient nepřijel na sál do prahového času"),
        ("late_surgeon",        "Operatér nepřišel do prahového času od příjezdu pacienta"),
        ("late_anesthesiologist", "Anesteziolog nepřišel do prahového času"),
        ("emergency",           "Vyhlášena urgence na sále"),
        ("patient_not_ready",   "Pacient není připraven (např. nedostatek dokumentace)"),
        ("daily_report",        "Denní report (zasílá se v určený čas)"),
        ("statistics",          "Týdenní / měsíční statistiky výkonnosti"),
    ]
    rows = [["TYP", "POPIS"]]
    for t, d in types:
        rows.append([
            Paragraph(f'<font name="Courier-Bold" color="#10B981">{t}</font>',
                      ParagraphStyle("t", fontSize=8.5)),
            Paragraph(d, ParagraphStyle("d", fontSize=8.5, leading=12, textColor=TEXT)),
        ])
    story.append(card_table(rows, col_widths=[60 * mm, 110 * mm], header_color=GREEN))


def section_env(styles, story):
    story.append(PageBreak())
    story.append(kicker("KAPITOLA 15", styles))
    story.append(Paragraph("Konfigurace prostředí", styles["H1"]))
    story.append(yellow_divider())

    story.append(Paragraph("Environment variables", styles["H2"]))
    rows = [["NÁZEV", "POVINNÉ", "POPIS"]]
    envs = [
        ("NEXT_PUBLIC_SUPABASE_URL",      "ANO", "URL Supabase projektu (browser-side)"),
        ("NEXT_PUBLIC_SUPABASE_ANON_KEY", "ANO", "Anon key Supabase (browser-side, RLS-respecting)"),
        ("SUPABASE_URL",                  "ANO", "URL Supabase (server-side)"),
        ("SUPABASE_ANON_KEY",             "ANO", "Anon key (server-side fallback)"),
        ("SUPABASE_SERVICE_ROLE_KEY",     "ANO", "Service role key — bypassuje RLS, použít jen v API routes"),
        ("SUPABASE_JWT_SECRET",           "ANO", "Tajný klíč pro podpis vlastního session JWT"),
        ("POSTGRES_URL",                  "—",   "Pooled connection string (volitelně pro direct SQL)"),
        ("POSTGRES_URL_NON_POOLING",      "—",   "Non-pooled connection (pro migrace)"),
        ("RESEND_API_KEY",                "—",   "API klíč Resendu pro odesílání e-mailů"),
        ("AI_GATEWAY_API_KEY",            "—",   "Pro AI features (Vercel AI Gateway)"),
    ]
    for name, req, desc in envs:
        rows.append([
            Paragraph(f'<font name="Courier-Bold" color="#FBBF24">{name}</font>',
                      ParagraphStyle("n", fontSize=7.5)),
            Paragraph(req, ParagraphStyle("r", fontSize=8, textColor=ACCENT, alignment=TA_CENTER)),
            Paragraph(desc, ParagraphStyle("d", fontSize=8, leading=11, textColor=TEXT)),
        ])
    story.append(card_table(rows, col_widths=[64 * mm, 22 * mm, 84 * mm]))

    story.append(Paragraph("Deployment Vercel", styles["H2"]))
    items = [
        "Připojte GitHub repo k Vercel projektu.",
        "Nastavte env vars v Settings → Environment Variables (Production + Preview).",
        "Aktivujte Supabase integraci (auto-injectne všechny SUPABASE_* vars).",
        "Deploy: každý push do main = produkční deploy, ostatní větve = preview.",
        "Vercel automaticky používá Edge runtime pro auth check (rychlý cookie verify).",
    ]
    story.append(ListFlowable(
        [ListItem(Paragraph(t, styles["Body"]), bulletColor=ACCENT) for t in items],
        bulletType="1", bulletColor=ACCENT,
    ))


def section_security(styles, story):
    story.append(PageBreak())
    story.append(kicker("KAPITOLA 16", styles))
    story.append(Paragraph("Bezpečnost", styles["H1"]))
    story.append(yellow_divider())

    story.append(Paragraph("Vrstvy bezpečnosti", styles["H2"]))
    layers = [
        ("Hashing hesel",    "bcrypt cost factor 10, hash uložen v app_users.password_hash. "
                             "Nikdy plaintext password v logech ani DB."),
        ("Session JWT",      "Podepsaný HS256 přes SUPABASE_JWT_SECRET. Cookie HttpOnly + Secure + SameSite=Lax."),
        ("Rate limit",       "5 pokusů přihlášení / 15 min na IP, in-memory (per-instance)."),
        ("RLS Postgres",     "Všech 15 tabulek má RLS zapnuté. 4 policies (SELECT/INSERT/UPDATE/DELETE)."),
        ("RBAC",             "Role v app_users.role + allowed_roles v app_modules. Funkce hasModuleAccess()."),
        ("CSRF protection",  "SameSite=Lax na session cookie + manuální origin check v API routes."),
        ("XSS protection",   "React escapuje content automaticky, žádný dangerouslySetInnerHTML."),
        ("Audit log",        "room_status_history zaznamenává všechny změny workflow s timestampy."),
    ]
    rows = [["VRSTVA", "IMPLEMENTACE"]]
    for name, desc in layers:
        rows.append([
            Paragraph(f'<font name="Courier-Bold" color="#FBBF24">{name}</font>',
                      ParagraphStyle("n", fontSize=8.5)),
            Paragraph(desc, ParagraphStyle("d", fontSize=8.5, leading=12, textColor=TEXT)),
        ])
    story.append(card_table(rows, col_widths=[42 * mm, 128 * mm]))

    story.append(Paragraph("Doporučení pro produkci", styles["H2"]))
    recs = [
        "Změňte všechna výchozí hesla (admin123, aro123, ...).",
        "Zvyšte bcrypt cost factor na 12 v lib/auth/session.ts.",
        "Nastavte přísnou CSP hlavičku v next.config.ts.",
        "Zapněte HSTS hlavičku (Strict-Transport-Security).",
        "Pravidelně rotujte SUPABASE_SERVICE_ROLE_KEY a JWT_SECRET.",
        "Monitorujte rate limit v lib/auth/rate-limit.ts — zvažte distribuovaný (Upstash Redis).",
        "Nastavte alerty na neúspěšné přihlášení (Supabase logs).",
    ]
    story.append(ListFlowable(
        [ListItem(Paragraph(t, styles["Body"]), bulletColor=ACCENT) for t in recs],
        bulletType="bullet", bulletColor=ACCENT,
    ))


def section_troubleshooting(styles, story):
    story.append(PageBreak())
    story.append(kicker("KAPITOLA 17", styles))
    story.append(Paragraph("Troubleshooting", styles["H1"]))
    story.append(yellow_divider())

    issues = [
        ("Nelze se přihlásit",
         "1. Zkontrolujte e-mail a heslo (case-sensitive). 2. Po 5 pokusech IP zablokována 15 min — počkejte. "
         "3. V dev konzoli síťová záložka — odpověď z /api/auth/login. "
         "4. Admin: ověřte v DB <code>SELECT email, is_active FROM app_users WHERE email = '...'</code>"),
        ("Stav sálu se neaktualizuje",
         "1. Zkontrolujte WebSocket spojení v dev tools (Network → WS). "
         "2. Realtime musí být enabled v Supabase Dashboard → Database → Replication. "
         "3. Při ztrátě connection refreshujte stránku — auto-reconnect by měl fungovat."),
        ("Pořadí sálů se po refreshi nepamatuje",
         "Bug opraven v lib/db.ts — fetch nyní řadí podle sort_order. Pokud problém přetrvává, "
         "zkontrolujte, že migrace přidala sloupec do operating_rooms (SHOULD exist)."),
        ("E-mail notifikace se neposílají",
         "1. RESEND_API_KEY v env vars. 2. Sender doména musí být verified v Resendu. "
         "3. Audit v notifications_log — pokud chybí záznam, neproběhl trigger; pokud je, ale e-mail nepřišel, "
         "problém na straně Resendu. 4. SPF/DKIM nastavení."),
        ("Audio alarm nehraje",
         "Browser blokuje autoplay bez user interakce. Po prvním kliknutí kdekoliv v aplikaci "
         "AudioContext získá oprávnění a alarm bude fungovat. (Hook useEmergencyAlert resumuje context po user gesture.)"),
        ("Změny v admin nastaveních se neprojevují",
         "Některé moduly cachují fetch (např. WorkflowStatuses). Zkuste hard refresh (Ctrl+F5). "
         "Pokud trvá, zkontrolujte síťovou záložku — odpověď z /api endpointu."),
        ("Build padá na TypeScript chybách",
         "Po pull request: spusťte `pnpm i` (nové dependencies). Zkontrolujte tsconfig.json a "
         "<code>next-env.d.ts</code>. Často chybí typy z lucide-react — re-instalace pomáhá."),
    ]
    for title, desc in issues:
        story.append(Paragraph(title, styles["H3"]))
        story.append(Paragraph(desc, styles["Body"]))


def section_glossary(styles, story):
    story.append(PageBreak())
    story.append(kicker("KAPITOLA 18", styles))
    story.append(Paragraph("Slovníček pojmů", styles["H1"]))
    story.append(yellow_divider())

    terms = [
        ("ARO",  "Anesteziologicko-resuscitační oddělení."),
        ("COS",  "Centrální operační sály — útvar ř��dící provoz operačních traktů."),
        ("RBAC", "Role-Based Access Control — přístupy řízené rolemi."),
        ("RLS",  "Row Level Security — Postgres mechanismus pro kontrolu řádkového přístupu."),
        ("CDC",  "Change Data Capture — Supabase Realtime emituje změny v DB jako události."),
        ("JWT",  "JSON Web Token — kompaktní podepsaný token pro auth session."),
        ("Bcrypt", "Pomalá hashovací funkce odolná proti brute-force útokům."),
        ("RSC",   "React Server Components — komponenty renderované na serveru, nesou nulový JS bundle."),
        ("HMR",   "Hot Module Replacement — náhrada modulu bez plného refreshu (dev mode)."),
        ("Septický režim", "Operace s rizikem infekce — vyžaduje speciální hygienu po výkonu."),
        ("Hygienický režim", "Zvýšený standard úklidu mezi výkony, aktivuje se po septických operacích."),
        ("Workflow status", "Stav fáze operace — Sál připraven / Příjezd / Anestezie / ..."),
        ("Special status",  "Stav aktivovaný tlačítkem (Pauza, Hygiena, Volání pacienta, ...)."),
        ("Demo účet",       "Prefilovaný formulář se skutečnými údaji uloženými v app_users — není mock."),
    ]
    rows = [["POJEM", "VYSVĚTLENÍ"]]
    for term, expl in terms:
        rows.append([
            Paragraph(f'<font name="Courier-Bold" color="#FBBF24">{term}</font>',
                      ParagraphStyle("t", fontSize=8.5)),
            Paragraph(expl, ParagraphStyle("e", fontSize=8.5, leading=12, textColor=TEXT)),
        ])
    story.append(card_table(rows, col_widths=[36 * mm, 134 * mm]))


def section_back_cover(styles, story):
    story.append(PageBreak())
    story.append(Spacer(1, 60 * mm))
    story.append(Paragraph(
        '<font name="Courier-Bold" color="#FBBF24">// FIN</font>',
        ParagraphStyle("k", fontSize=10)))
    story.append(Spacer(1, 6 * mm))
    story.append(Paragraph("OPERATINGROOM", styles["CoverTitle"]))
    story.append(Paragraph("MANAGER", styles["CoverAccent"]))
    story.append(Spacer(1, 8 * mm))
    story.append(yellow_divider())
    story.append(Paragraph(
        "Konec dokumentace. Pro další podporu kontaktujte systémového administrátora "
        "nebo otevřete issue v projektovém repozitáři.",
        styles["CoverSub"]))

    story.append(Spacer(1, 20 * mm))
    story.append(Paragraph(
        '<font name="Courier" color="#64748B">'
        f'Generated: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}<br/>'
        'Theme: dark · Accent: #FBBF24 · Font: Helvetica + Courier<br/>'
        'Output: public/orm-documentation.pdf'
        '</font>',
        ParagraphStyle("meta", fontSize=8.5, leading=14)))


# ============================================================================
# Build
# ============================================================================

def build(out_pdf: Path, diagram_dir: Path):
    diagram_dir.mkdir(parents=True, exist_ok=True)
    diagrams = render_all(diagram_dir)

    out_pdf.parent.mkdir(parents=True, exist_ok=True)

    # Frame pro běžné stránky
    frame_content = Frame(
        MARGIN_X, MARGIN_Y,
        PAGE_W - 2 * MARGIN_X, PAGE_H - 2 * MARGIN_Y,
        leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0,
        showBoundary=0,
    )
    cover_template = PageTemplate(
        id="cover", frames=[frame_content], onPage=on_first_page,
    )
    main_template = PageTemplate(
        id="main", frames=[frame_content], onPage=on_later_page,
    )

    doc = BaseDocTemplate(
        str(out_pdf), pagesize=A4,
        leftMargin=MARGIN_X, rightMargin=MARGIN_X,
        topMargin=MARGIN_Y, bottomMargin=MARGIN_Y,
        title="OperatingRoom Manager — Dokumentace",
        author="ORM Docs Generator",
        subject="Kompletní dokumentace aplikace",
    )
    doc.addPageTemplates([cover_template, main_template])

    styles = build_styles()
    story = []

    # Cover (PageTemplate id=cover)
    section_cover(styles, story)
    story.append(NextPageTemplate("main"))

    section_toc(styles, story)
    section_overview(styles, story)
    section_architecture(styles, story, diagrams["architecture"])
    section_dependencies(styles, story, diagrams["dependencies"])
    section_auth(styles, story, diagrams["auth_flow"])
    section_db(styles, story, diagrams["db_schema"])
    section_workflow(styles, story, diagrams["workflow"])
    section_modules(styles, story)
    section_api(styles, story)
    section_contexts(styles, story)
    section_lib(styles, story)
    section_components(styles, story)
    section_user_guide(styles, story)
    section_admin_guide(styles, story)
    section_realtime(styles, story)
    section_env(styles, story)
    section_security(styles, story)
    section_troubleshooting(styles, story)
    section_glossary(styles, story)
    section_back_cover(styles, story)

    print(f"[v0] Building PDF → {out_pdf}")
    doc.build(story)
    size_kb = out_pdf.stat().st_size / 1024
    print(f"[v0] OK · {size_kb:.1f} kB · {doc.page} stran")


if __name__ == "__main__":
    project_root = Path(__file__).resolve().parents[2]
    out = project_root / "public" / "orm-documentation.pdf"
    diag_dir = Path(os.environ.get("ORM_DIAGRAM_DIR", "/tmp/orm-diagrams"))
    build(out, diag_dir)
    print(f"[v0] Done · {out}")
