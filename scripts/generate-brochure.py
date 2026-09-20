#!/usr/bin/env python3
"""
Generátor produktového katalogu OPERATINGROOM (PDF pro zákazníky).

Obsah vychází z reálné aplikace: moduly a podmoduly jsou převzaté z tabulek
app_modules / app_submodules, ostatní popisy z komponent v repozitáři.
Spuštění:  python3 scripts/generate-brochure.py <cílový_soubor.pdf>
"""

import sys
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate, Frame, KeepTogether, NextPageTemplate, PageBreak,
    PageTemplate, Paragraph, Spacer, Table, TableStyle,
)

# ── Písmo ────────────────────────────────────────────────────────────────
FONT_DIR = '/usr/share/fonts/truetype/lato'
for name, filename in [
    ('Lato', 'Lato-Regular.ttf'),
    ('Lato-Bold', 'Lato-Bold.ttf'),
    ('Lato-Semi', 'Lato-Semibold.ttf'),
    ('Lato-Black', 'Lato-Black.ttf'),
    ('Lato-Light', 'Lato-Light.ttf'),
]:
    pdfmetrics.registerFont(TTFont(name, f'{FONT_DIR}/{filename}'))

# Bez registrace rodiny by značka <b> v odstavci nic neudělala — ReportLab by
# neměl kam Lato-Bold namapovat a text by zůstal v základním řezu.
pdfmetrics.registerFontFamily('Lato', normal='Lato', bold='Lato-Bold',
                              italic='Lato', boldItalic='Lato-Bold')
pdfmetrics.registerFontFamily('Lato-Light', normal='Lato-Light', bold='Lato-Semi',
                              italic='Lato-Light', boldItalic='Lato-Semi')

# ── Barvy aplikace ───────────────────────────────────────────────────────
NAVY = colors.HexColor('#0A1330')
NAVY_DEEP = colors.HexColor('#050D2D')
INK = colors.HexColor('#122B49')
BODY = colors.HexColor('#3B4F６8'.replace('６', '6'))
MUTED = colors.HexColor('#6C7F99')
ACCENT = colors.HexColor('#147DED')
CYAN = colors.HexColor('#00C9D6')
LINE = colors.HexColor('#DCE7F3')
SOFT = colors.HexColor('#F2F7FC')

PHASE_COLORS = ['#00D6C8', '#8B5CF6', '#B3004D', '#009E03', '#102CB7', '#FF791A', '#FBBF24']

PAGE_W, PAGE_H = A4
MARGIN = 20 * mm

# ── Styly ────────────────────────────────────────────────────────────────
S = {
    'cover_kicker': ParagraphStyle('ck', fontName='Lato-Bold', fontSize=9.5, leading=14,
                                   textColor=colors.HexColor('#7FE9F0'), spaceAfter=0),
    'cover_title': ParagraphStyle('ct', fontName='Lato-Black', fontSize=40, leading=44,
                                  textColor=colors.white),
    'cover_sub': ParagraphStyle('cs', fontName='Lato-Light', fontSize=14.5, leading=22,
                                textColor=colors.HexColor('#BFD3EA')),
    'cover_meta': ParagraphStyle('cm', fontName='Lato', fontSize=9.5, leading=15,
                                 textColor=colors.HexColor('#8FA6C4')),
    'h1': ParagraphStyle('h1', fontName='Lato-Black', fontSize=21, leading=26,
                         textColor=INK, spaceBefore=0, spaceAfter=3),
    'h1kicker': ParagraphStyle('h1k', fontName='Lato-Bold', fontSize=8.5, leading=12,
                               textColor=ACCENT, spaceAfter=2),
    'h2': ParagraphStyle('h2', fontName='Lato-Bold', fontSize=13, leading=17,
                         textColor=INK, spaceBefore=11, spaceAfter=3),
    'h3': ParagraphStyle('h3', fontName='Lato-Semi', fontSize=10.8, leading=15,
                         textColor=ACCENT, spaceBefore=8, spaceAfter=2),
    'body': ParagraphStyle('b', fontName='Lato', fontSize=9.8, leading=15,
                           textColor=BODY, alignment=TA_JUSTIFY, spaceAfter=5),
    'lead': ParagraphStyle('l', fontName='Lato-Light', fontSize=12, leading=18.5,
                           textColor=INK, spaceAfter=9),
    'bullet': ParagraphStyle('bu', fontName='Lato', fontSize=9.6, leading=14.2,
                             textColor=BODY, leftIndent=11, bulletIndent=1, spaceAfter=3.2),
    'cell': ParagraphStyle('c', fontName='Lato', fontSize=9, leading=13, textColor=BODY),
    'cellb': ParagraphStyle('cb', fontName='Lato-Semi', fontSize=9, leading=13, textColor=INK),
    'cellh': ParagraphStyle('ch', fontName='Lato-Bold', fontSize=8.2, leading=11,
                            textColor=colors.white),
    'note': ParagraphStyle('n', fontName='Lato', fontSize=8.8, leading=13.5, textColor=MUTED),
    'quote': ParagraphStyle('q', fontName='Lato-Semi', fontSize=10.5, leading=16,
                            textColor=INK, leftIndent=9),
    'foot_h': ParagraphStyle('fh', fontName='Lato-Black', fontSize=18, leading=23,
                             textColor=colors.white),
    'foot_b': ParagraphStyle('fb', fontName='Lato', fontSize=10, leading=16,
                             textColor=colors.HexColor('#C3D5EA')),
    'center': ParagraphStyle('ce', fontName='Lato', fontSize=9.5, leading=14,
                             textColor=MUTED, alignment=TA_CENTER),
}


def bullets(items):
    return [Paragraph(text, S['bullet'], bulletText='—') for text in items]


def feature_table(rows, widths, header=None):
    data = []
    if header:
        data.append([Paragraph(h, S['cellh']) for h in header])
    for row in rows:
        data.append([Paragraph(row[0], S['cellb'])] + [Paragraph(c, S['cell']) for c in row[1:]])
    table = Table(data, colWidths=widths, repeatRows=1 if header else 0)
    style = [
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('LINEBELOW', (0, 0), (-1, -2), 0.4, LINE),
    ]
    if header:
        style += [
            ('BACKGROUND', (0, 0), (-1, 0), INK),
            ('TOPPADDING', (0, 0), (-1, 0), 7),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 7),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, SOFT]),
        ]
    table.setStyle(TableStyle(style))
    return table


# ── Stránkové šablony ────────────────────────────────────────────────────
def draw_cover(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(NAVY_DEEP)
    canvas.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    # Jemné světlo v pravém horním rohu jako v aplikaci.
    for i in range(46, 0, -1):
        alpha = 0.019
        canvas.setFillColorRGB(0.08, 0.20, 0.45, alpha=alpha)
        canvas.circle(PAGE_W * 0.86, PAGE_H * 0.80, i * 4.6, fill=1, stroke=0)
    # Pruh barev statusů podél spodní hrany.
    seg = PAGE_W / len(PHASE_COLORS)
    for i, hexcolor in enumerate(PHASE_COLORS):
        canvas.setFillColor(colors.HexColor(hexcolor))
        canvas.rect(i * seg, 0, seg, 7 * mm, fill=1, stroke=0)
    canvas.restoreState()


def draw_page(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(colors.white)
    canvas.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    # Hlavička
    canvas.setFillColor(INK)
    canvas.setFont('Lato-Bold', 7.6)
    canvas.drawString(MARGIN, PAGE_H - 13 * mm, 'OPERATINGROOM')
    canvas.setFillColor(MUTED)
    canvas.setFont('Lato', 7.6)
    canvas.drawString(MARGIN + 31 * mm, PAGE_H - 13 * mm, 'Systém pro řízení operačních sálů')
    canvas.setStrokeColor(LINE)
    canvas.setLineWidth(0.5)
    canvas.line(MARGIN, PAGE_H - 15.5 * mm, PAGE_W - MARGIN, PAGE_H - 15.5 * mm)
    # Patička
    canvas.line(MARGIN, 15 * mm, PAGE_W - MARGIN, 15 * mm)
    canvas.setFillColor(MUTED)
    canvas.setFont('Lato', 7.6)
    canvas.drawString(MARGIN, 11 * mm, 'MEDROX Czech Republic and Canada')
    canvas.setFont('Lato-Bold', 7.6)
    canvas.setFillColor(ACCENT)
    canvas.drawRightString(PAGE_W - MARGIN, 11 * mm, str(canvas.getPageNumber() - 1))
    canvas.restoreState()


def draw_closing(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(NAVY)
    canvas.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    seg = PAGE_W / len(PHASE_COLORS)
    for i, hexcolor in enumerate(PHASE_COLORS):
        canvas.setFillColor(colors.HexColor(hexcolor))
        canvas.rect(i * seg, PAGE_H - 7 * mm, seg, 7 * mm, fill=1, stroke=0)
    canvas.restoreState()


def build(path):
    doc = BaseDocTemplate(
        path, pagesize=A4,
        leftMargin=MARGIN, rightMargin=MARGIN,
        topMargin=MARGIN, bottomMargin=MARGIN,
        title='OPERATINGROOM — přehled funkcí',
        author='MEDROX Czech Republic and Canada',
        subject='Systém pro řízení provozu operačních sálů',
    )
    frame_cover = Frame(MARGIN, 28 * mm, PAGE_W - 2 * MARGIN, PAGE_H - 70 * mm, id='cover')
    frame_page = Frame(MARGIN, 19 * mm, PAGE_W - 2 * MARGIN, PAGE_H - 39 * mm, id='page')
    frame_close = Frame(MARGIN, 30 * mm, PAGE_W - 2 * MARGIN, PAGE_H - 70 * mm, id='close')
    doc.addPageTemplates([
        PageTemplate(id='cover', frames=[frame_cover], onPage=draw_cover),
        PageTemplate(id='page', frames=[frame_page], onPage=draw_page),
        PageTemplate(id='close', frames=[frame_close], onPage=draw_closing),
    ])
    doc.build(story())


def section(kicker, title):
    return [Paragraph(kicker.upper(), S['h1kicker']), Paragraph(title, S['h1']),
            Spacer(1, 3), accent_rule(), Spacer(1, 9)]


def accent_rule():
    rule = Table([['']], colWidths=[26 * mm], rowHeights=[2.4])
    rule.setStyle(TableStyle([('BACKGROUND', (0, 0), (-1, -1), ACCENT)]))
    return rule


def story():
    s = []
    W = PAGE_W - 2 * MARGIN

    # ══ TITULNÍ STRANA ═════════════════════════════════════════════════
    s.append(Spacer(1, 42 * mm))
    s.append(Paragraph('SYSTÉM PRO ŘÍZENÍ OPERAČNÍCH SÁLŮ', S['cover_kicker']))
    s.append(Spacer(1, 10))
    s.append(Paragraph('OPERATINGROOM', S['cover_title']))
    s.append(Spacer(1, 14))
    s.append(Paragraph(
        'Živý přehled o dění na operačním traktu, provozní analytika<br/>'
        'a plánování — na velíně, na sále i v telefonu.', S['cover_sub']))
    s.append(Spacer(1, 30 * mm))
    s.append(Paragraph(
        'Přehled funkcí produktu<br/>'
        'MEDROX Czech Republic and Canada<br/>'
        'operatingroom.eu', S['cover_meta']))

    # ══ ÚVOD ═══════════════════════════════════════════════════════════
    s.append(NextPageTemplate('page'))
    s.append(PageBreak())
    s += section('Úvod', 'Co systém řeší')
    s.append(Paragraph(
        'Operační trakt je nejdražší provoz v nemocnici a zároveň ten, o kterém má vedení '
        'nejméně přesných dat. Informace o tom, kde právě je pacient, jestli se sál stihne '
        'uvolnit a proč se dnes začalo pozdě, kolují po telefonu a v hlavách lidí.',
        S['lead']))
    s.append(Paragraph(
        'OPERATINGROOM tyto informace sbírá tam, kde vznikají — přímo na sále, jedním '
        'klepnutím při přechodu do další fáze výkonu. Z týchž dat pak staví živý přehled '
        'pro velín, prognózy pro plánování a podklady pro vedení. Personál nic nevykazuje '
        'navíc; zaznamenává jen to, co stejně dělá.', S['body']))

    s.append(Paragraph('Komu je systém určen', S['h2']))
    s.append(feature_table([
        ['Perioperační sestry a personál sálů',
         'Přehled vlastního sálu, posun fáze jedním dotykem, přivolání pacienta, hlášení mimořádností.'],
        ['Vedoucí operačních sálů a koordinátoři',
         'Velínský přehled všech sálů, triáž pozornosti, prognóza uvolnění kapacit, rozpis oborů.'],
        ['Anesteziologie / ARO',
         'Přehled o přesazích za konec směny a o nárazu více sálů naráz.'],
        ['Primáři a vedení oddělení',
         'Vytížení sálů, délky fází, dokončené výkony, doporučení k provozu.'],
        ['Management a ekonomika',
         'Náklady na hodinu provozu, přehled mimořádných událostí a jejich dopadů.'],
        ['Správci IT',
         'Role a oprávnění, zapínání modulů, zálohy, registrovaná zařízení, diagnostika.'],
    ], [58 * mm, W - 58 * mm]))

    s.append(Paragraph('Přínosy v kostce', S['h2']))
    s += bullets([
        '<b>Jeden zdroj pravdy.</b> Všichni vidí stejný stav sálu v tentýž okamžik — změna se '
        'promítne na ostatní zařízení okamžitě, bez obnovování stránky.',
        '<b>Data bez papírování.</b> Statistiky vznikají jako vedlejší produkt běžné práce, '
        'nikoli z dodatečného vyplňování formulářů.',
        '<b>Prevence místo hašení.</b> Systém upozorní na přesahy, úzká hrdla a mimořádnosti '
        'dřív, než se projeví ve skluzu celého programu.',
        '<b>Nasazení bez instalace.</b> Web, instalovatelná aplikace (PWA) i nativní aplikace '
        'pro iOS a Android — všechny nad stejnými daty.',
        '<b>Provoz více zařízení.</b> Jedna instalace zvládne několik nemocnic či pracovišť '
        'oddělenými daty a vlastní konfigurací.',
    ])

    # ══ MODULY PŘEHLED ═════════════════════════════════════════════════
    s.append(PageBreak())
    s += section('Struktura', 'Přehled modulů')
    s.append(Paragraph(
        'Aplikace je rozdělená do modulů; každý z nich lze pro dané zařízení zapnout, vypnout '
        'a zpřístupnit jen vybraným rolím. Uživatel v menu vidí pouze to, na co má právo.',
        S['body']))
    s.append(Spacer(1, 4))
    s.append(feature_table([
        ['Přehled sálů', 'Živé karty všech sálů, 3D dispozice traktu, rychlé akce.',
         'Primář · Vedoucí · Správce · Management · ARO'],
        ['Časová osa', 'Průběh dne po sálech a sada prediktivních a analytických nástrojů.',
         'Vedoucí · Management · Primář · ARO'],
        ['Tok pacienta', 'Živý průchod pacientů traktem a zastoupení fází ve dni.',
         'Správce · ARO · Vedoucí · Management · Primář'],
        ['Statistiky', 'Vytížení, fáze, finance, notifikace a zařízení.',
         'Management · Primář · Správce'],
        ['Personál', 'Adresář, dostupnost, absence a obsazení sálů.',
         'Management · Správce · Primář'],
        ['Upozornění', 'Hlášení mimořádných událostí a jejich doručování.',
         'ARO · Vedoucí · Správce · Management · Primář'],
        ['Nastavení', 'Konfigurace celého systému v šestnácti oblastech.', 'Správce'],
        ['Správa zařízení', 'Registrovaná zařízení s nainstalovanou aplikací.', 'Správce'],
    ], [30 * mm, 76 * mm, W - 106 * mm], header=['Modul', 'Obsah', 'Výchozí přístup']))
    s.append(Spacer(1, 6))
    s.append(Paragraph(
        'Uvedené role jsou výchozí nastavení; přiřazení modulů i jejich částí rolím se spravuje '
        'v aplikaci a lze je kdykoli změnit.', S['note']))

    # ══ PŘEHLED SÁLŮ ═══════════════════════════════════════════════════
    s.append(PageBreak())
    s += section('Modul 1', 'Přehled sálů')
    s.append(Paragraph(
        'Vstupní obrazovka a nejpoužívanější část systému. Každý sál má vlastní kartu, která '
        'na dálku sděluje svůj stav barvou aktuální fáze.', S['body']))

    s.append(Paragraph('Karta sálu', S['h3']))
    s += bullets([
        'Název sálu, aktuální fáze, uplynulý čas a odhadovaný konec výkonu.',
        'Barevné odlišení podle aktuálního statusu — stav celého traktu je čitelný jedním pohledem.',
        'Příznaky provozu: stav nouze, uzamčený sál, zvýšený hygienický režim, přivolaný '
        'a přítomný pacient.',
        'Souhrn nad kartami: počet sálů celkem, aktivních a připravených; filtr na všechny, '
        'aktivní a připravené sály.',
    ])

    s.append(Paragraph('3D dispozice traktu', S['h3']))
    s += bullets([
        'Prostorový model operačního traktu, ve kterém se sály barví podle aktuálního stavu '
        'stejně jako karty.',
        'Půdorysný i prostorový pohled, výběrem sálu se otevře jeho detail.',
        'Vlastní editor dispozice — půdorys si zařízení sestaví samo a propojí místnosti '
        's evidovanými sály.',
    ])

    s.append(Paragraph('Detail sálu', S['h3']))
    s.append(Paragraph(
        'Pracovní obrazovka pro personál na sále. Postup výkonem je jediný dotek: klepnutím '
        'na box aktuální fáze se potvrdí přechod do další.', S['body']))
    s += bullets([
        'Posun po fázích operačního cyklu s potvrzovacím krokem a s upozorněním, když je '
        'fáze podezřele krátká.',
        'Uplynulý čas fáze, odhad konce výkonu a možnost odhad upravit.',
        'Přiřazení personálu k sálu z personálního adresáře.',
        'Přivolání pacienta a potvrzení jeho příjezdu.',
        'Vyhlášení stavu nouze, uzamčení sálu, zvýšený hygienický režim, označení '
        'infekčního pacienta.',
        'Odeslání zprávy pro sál a hlášení mimořádné události s uvedením důvodu.',
    ])

    # ══ ČASOVÁ OSA ═════════════════════════════════════════════════════
    s.append(PageBreak())
    s += section('Modul 2', 'Časová osa')
    s.append(Paragraph(
        'Průběh celého dne na jedné obrazovce: každý sál má vlastní dráhu, na které jsou '
        'barevně vynesené odpracované fáze. Nad touto osou stojí sada nástrojů, které z týchž '
        'dat počítají, co bude dál.', S['body']))

    s.append(feature_table([
        ['Prognóza kapacity',
         'Z běžících výkonů spočítá vlnu vytížení do konce dne, předpoví, kdy se který sál '
         'uvolní, a upozorní na úzká hrdla — okamžiky, kdy se naráz uvolní víc sálů a nastane '
         'nápor na úklid a ARO.'],
        ['Simulátor zpoždění',
         'Model „co kdyby“. Posuvníkem se přidá zpoždění běžícím operacím a systém okamžitě '
         'ukáže kaskádu: které sály spadnou do přesahu, o kolik naroste přesah ARO a kdy '
         'skončí poslední výkon.'],
        ['Optimalizace fází',
         'Rozpad dnešních fází po sálech a porovnání s obvyklou dobou. U fází, které trvaly '
         'výrazně déle, navrhne, kde lze zrychlit — chirurgický výkon se záměrně nezkracuje.'],
        ['Fázový otisk',
         'Radarový graf časového profilu sálu proti mediánu celého traktu. Na první pohled '
         'ukáže, ve které fázi je konkrétní sál pomalejší než ostatní.'],
        ['Triáž pozornosti',
         'Jeden panel se vším, co právě vyžaduje reakci — nouze, přesah, dlouhá pauza, dlouho '
         'volaný pacient, infekční režim, zámek — seřazené podle naléhavosti.'],
        ['ARO přesah',
         'Časová osa přesahů za konec směny: pro každý sál lišta od konce směny k odhadovanému '
         'konci výkonu, s rozlišením už uplynulého a očekávaného zbytku.'],
        ['Statistiky dne',
         'Počet operací, průměrná délka výkonu a vytíženost traktu v probíhajícím dni.'],
        ['Historie',
         'Zpětný pohled na uzavřené dny se stejným rozpadem fází.'],
    ], [38 * mm, W - 38 * mm]))

    # ══ TOK PACIENTA + STATISTIKY ══════════════════════════════════════
    s.append(PageBreak())
    s += section('Modul 3', 'Tok pacienta')
    s.append(Paragraph(
        'Živý pohled na průchod pacientů operačním traktem. Sály stojí vedle sebe jako sloupce, '
        've kterých je vidět aktuální fáze i historie statusů ve zvoleném dni.', S['body']))
    s += bullets([
        'Zastoupení jednotlivých statusů v rámci dne a doba strávená v každém z nich.',
        'Vytížení konkrétního sálu s hodnocením od nízkého po vysoké a s posouzením režie.',
        'Volba dne a skrývání sálů, které koordinátora právě nezajímají.',
    ])

    s.append(Spacer(1, 6))
    s += section('Modul 4', 'Statistiky')
    s.append(Paragraph(
        'Analytická nadstavba nad reálně zaznamenanými daty. Období se volí po dnech, týdnech, '
        'měsících i rocích.', S['body']))
    s.append(feature_table([
        ['Přehled', 'Dokončené výkony podle dne, průměrné vytížení, průměrný počet výkonů podle '
                    'dne v týdnu a provozní doporučení pro vybraný den.'],
        ['Sály', 'Provozní metriky jednotlivých sálů: vytížení, fronta, průměrný čas, podíl '
                 'cyklu, provozní příznaky a aktuální stav.'],
        ['Fáze', 'Délka, podíl na cyklu a počet sálů v každé fázi, nejdelší a nejrychlejší fáze, '
                 'podrobná evidence a srovnání s evropskou referenční praxí.'],
        ['Finance', 'Náklady provozu podle hodinových sazeb sálů — hodiny provozu, sazba, '
                    'medián a celkové náklady.'],
        ['Sazby', 'Správa hodinových sazeb jednotlivých operačních sálů.'],
        ['Notifikace', 'Evidence odeslaných hlášení, nouzových událostí, jejich důvodů, dopadů '
                       'a měřených intervalů.'],
        ['Zařízení', 'Registrovaná zařízení, platformy, prohlížeče, instalace PWA a poslední '
                     'aktivita.'],
    ], [30 * mm, W - 30 * mm], header=['Sekce', 'Obsah']))

    # ══ PERSONÁL ═══════════════════════════════════════════════════════
    s.append(PageBreak())
    s += section('Modul 5', 'Personál')
    s.append(Paragraph('Personální adresář', S['h3']))
    s += bullets([
        'Evidence lékařů a sester se zařazením, rolí a úrovní dovedností.',
        'Stav dostupnosti: standardní, dovolená, pracovní neschopnost, zaměstnanec mimo organizaci.',
        'Evidence absencí ve dnech a poznámky k pracovníkovi.',
        'Přednostní řazení vybraných pracovníků při obsazování sálu.',
    ])
    s.append(Paragraph('Přehled personálu — nástěnka směny', S['h3']))
    s += bullets([
        'Odpovídá na otázku „kdo právě pracuje a kdo je volný“ napříč celým traktem.',
        'Obsazení sálů podle skutečného přiřazení v databázi, ne podle plánu.',
        'Klepnutím na volné místo se otevře výběr pracovníka a personál se rovnou přiřadí.',
        'Neobsazená místa na běžících sálech jsou vypíchnutá jako mezery ve směně.',
    ])
    s.append(Paragraph('Rozpis směn', S['h3']))
    s.append(Paragraph(
        'Plánování služeb personálu s návazností na obsazení jednotlivých sálů.', S['body']))

    s.append(Spacer(1, 6))
    s += section('Modul 6', 'Upozornění a notifikace')
    s.append(Paragraph(
        'Mimořádné události se hlásí přímo z detailu sálu jedním výběrem. Systém je rozešle '
        'nastaveným příjemcům a zároveň založí do evidence, ze které pak čerpají statistiky.',
        S['body']))
    s.append(feature_table([
        ['Typy hlášení', 'Pozdní příchod chirurga · Pozdní příchod anesteziologa · Pozdní '
                         'příjezd · Nepřipravený pacient · Stav nouze · Jiný důvod s vlastním popisem'],
        ['Kanály', 'E-mail s formátovanou zprávou, SMS a push notifikace'],
        ['Správa cest', 'Vlastní notifikační cesty s názvem, popisem, typem kanálu a příjemcem'],
        ['Evidence', 'Log všech odeslaných zpráv s časem, důvodem, dopadem a vazbou na sál'],
        ['Zobrazení v aplikaci', 'Překryvné upozornění na všech zařízeních a zvonek s indikací '
                                 'nepřečtených zpráv'],
    ], [36 * mm, W - 36 * mm]))

    # ══ NASTAVENÍ ══════════════════════════════════════════════════════
    s.append(PageBreak())
    s += section('Modul 7', 'Nastavení systému')
    s.append(Paragraph(
        'Kompletní konfigurace bez zásahu dodavatele. Šestnáct oblastí, z nichž každou lze '
        'samostatně zpřístupnit jen vybraným rolím.', S['body']))
    s.append(feature_table([
        ['Zdravotnické zařízení', 'Údaje o nemocnici, její identita a základní nastavení provozu.'],
        ['Správa modulů', 'Zapínání modulů a podmodulů a přidělení rolím.'],
        ['Operační sály', 'Zakládání sálů, oddělení, provozní doba po dnech, přestávky, '
                          'provozní režim a pořadí zobrazení.'],
        ['Operační obory', 'Číselník oborů používaných v rozpisu sálů, včetně zkratek a barev.'],
        ['Rozpis sálů', 'Přiřazení oborů sálům v dopoledních a odpoledních blocích, týdenní '
                        'i měsíční plán, platnost přiřazení a stav provozu sálu.'],
        ['Statusy', 'Konfigurace fází operačního cyklu — název, barva, ikona, obvyklá délka, '
                    'pořadí, zapnutí a zahrnutí do statistik.'],
        ['Personál', 'Správa zaměstnanců a jejich přiřazení k sálům.'],
        ['Přehled personálu', 'Nastavení nástěnky dostupnosti personálu.'],
        ['Kalendář', 'Roční kalendář provozu s barevným značením, svátky, poznámkami '
                     'a vlastní legendou.'],
        ['Notifikace', 'Notifikační cesty, kanály a příjemci.'],
        ['Statistiky', 'Metriky systému a nastavení výpočtů, včetně hodinových sazeb.'],
        ['Management', 'Adresář kontaktů na vedení pro eskalace.'],
        ['Správa zařízení', 'Přehled registrovaných zařízení a jejich správa.'],
        ['Rychlost a připojení', 'Diagnostika odezvy aplikace i databáze, stabilita měření '
                                 'a doporučení.'],
        ['Administrace databáze', 'Export celé databáze, obnova ze zálohy a kompletní reset dat.'],
        ['Přihlášení a přístup', 'Účet, změna hesla, odhlášení a přehled vlastních oprávnění.'],
    ], [42 * mm, W - 42 * mm], header=['Oblast', 'Obsah']))

    # ══ PLATFORMY A PROVOZ ═════════════════════════════════════════════
    s.append(PageBreak())
    s += section('Nasazení', 'Platformy a provoz')

    s.append(Paragraph('Na čem systém běží', S['h2']))
    s.append(feature_table([
        ['Webová aplikace', 'Prohlížeč na velíně, v kanceláři i na dotykovém panelu u sálu. '
                            'Bez instalace.'],
        ['Instalovatelná aplikace (PWA)', 'Uloží se na plochu zařízení a chová se jako '
                                          'samostatná aplikace — Android, iOS i macOS.'],
        ['iOS a Android', 'Nativní aplikace s vlastním mobilním rozhraním: přehled sálů, '
                          'detail sálu, časová osa, tok pacienta a statistiky.'],
    ], [48 * mm, W - 48 * mm]))

    s.append(Paragraph('Mobilní rozhraní', S['h2']))
    s.append(Paragraph(
        'Mobilní část není zmenšená verze webu, ale samostatně navržené rozhraní pro práci '
        'jednou rukou v rukavici.', S['body']))
    s += bullets([
        'Přehled sálů ve dvou sloupcích s barevným pruhem aktuálního statusu.',
        'Posun do další fáze klepnutím kamkoli do boxu aktuální fáze.',
        'Nabídka stavu nouze a uzamčení sálu po delším podržení karty.',
        'Světlý i tmavý motiv; barva písma se dopočítává z jasu podkladu, aby text zůstal '
        'čitelný u libovolné barvy statusu.',
        'Ověřená čitelnost i na malých displejích — názvy sálů se nelámou uprostřed slova '
        'a nic nepřetéká přes okraj karty.',
    ])

    s.append(Paragraph('Aktuálnost dat', S['h2']))
    s += bullets([
        'Změna stavu se promítne na ostatní zařízení okamžitě, bez obnovování stránky.',
        'Souběžné zápisy z více zařízení řeší systém tak, aby se stav sálu nevracel zpět.',
        'Posun fáze se projeví v rozhraní ihned a na pozadí se potvrzuje proti databázi.',
    ])

    s.append(Paragraph('Role a oprávnění', S['h2']))
    s.append(feature_table([
        ['Superadministrátor', 'Bez omezení, včetně správy oprávnění ostatních rolí a přístupu '
                               'ke všem zařízením.'],
        ['Administrátor', 'Správa vlastního zdravotnického zařízení a jeho konfigurace.'],
        ['Primář', 'Přehled provozu, statistiky a personál.'],
        ['Vedoucí operačních sálů', 'Řízení denního provozu, časová osa, tok pacienta.'],
        ['ARO / anesteziologie', 'Přehled sálů, přesahy, upozornění.'],
        ['Management', 'Statistiky, ekonomika provozu a personální přehled.'],
    ], [48 * mm, W - 48 * mm]))
    s.append(Spacer(1, 5))
    s.append(Paragraph(
        'Oprávnění se neověřuje jen skrytím položky v menu — každý chráněný požadavek se '
        'kontroluje znovu na serveru proti záznamům v databázi.', S['note']))

    # ══ TECHNOLOGIE ════════════════════════════════════════════════════
    s.append(PageBreak())
    s += section('Technologie', 'Architektura a bezpečnost')

    s.append(Paragraph('Provoz více zařízení', S['h2']))
    s.append(Paragraph(
        'Jedna instalace obslouží několik nemocnic nebo pracovišť. Data každého zařízení jsou '
        'oddělená, konfigurace je vlastní a uživatelé mají členství vázané ke konkrétnímu '
        'zařízení. Přihlašovací obrazovka nabídne jen ta zařízení, ke kterým má uživatel '
        'přístup.', S['body']))

    s.append(Paragraph('Bezpečnost', S['h2']))
    s += bullets([
        'Přihlášení jménem a heslem, volitelně účtem Google s řízeným seznamem povolených adres.',
        'Hesla se ověřují na straně databáze, nikoli v aplikaci.',
        'Serverové ověřování oprávnění u každého chráněného požadavku.',
        'Ochrana proti odesílání požadavků z cizích stránek a omezení četnosti pokusů.',
        'Oddělení dat jednotlivých zařízení na úrovni databáze.',
        'Evidence zařízení, ze kterých se do aplikace přistupuje.',
    ])

    s.append(Paragraph('Zálohy a přenos dat', S['h2']))
    s += bullets([
        'Export kompletní databáze zařízení do souboru.',
        'Obnova dat ze zálohy nahráním souboru.',
        'Kompletní reset dat pro čisté nasazení nebo školicí prostředí.',
    ])

    s.append(Paragraph('Použité technologie', S['h2']))
    s.append(feature_table([
        ['Aplikace', 'Next.js 16, React 19, TypeScript, Tailwind CSS'],
        ['Data', 'PostgreSQL (Supabase) s oddělením dat po zařízeních a průběžnou synchronizací'],
        ['Mobilní aplikace', 'Capacitor — iOS a Android nad stejnou kódovou základnou'],
        ['Vizualizace', 'Recharts pro grafy, Three.js pro prostorový model traktu'],
        ['E-mail', 'Odesílání přes Resend se šablonou v korporátní úpravě'],
        ['Provoz', 'Nasazení na Vercel s vlastní doménou a šifrovaným spojením'],
    ], [38 * mm, W - 38 * mm]))

    # ══ ZÁVĚR ══════════════════════════════════════════════════════════
    s.append(NextPageTemplate('close'))
    s.append(PageBreak())
    s.append(Spacer(1, 34 * mm))
    s.append(Paragraph('Zajímá vás nasazení<br/>na vašem pracovišti?', S['foot_h']))
    s.append(Spacer(1, 16))
    s.append(Paragraph(
        'Rádi vám systém ukážeme na vašich sálech a projdeme s vámi, jak by u vás vypadal '
        'rozpis, workflow statusů a přístupová práva. Nasazení nevyžaduje zásah do stávající '
        'nemocniční infrastruktury.', S['foot_b']))
    s.append(Spacer(1, 26))
    s.append(Paragraph(
        '<b>MEDROX Czech Republic and Canada</b><br/>'
        'operatingroom.eu', S['foot_b']))
    s.append(Spacer(1, 40))
    s.append(Paragraph(
        'Dokument popisuje funkce systému OPERATINGROOM k datu vydání. '
        'Rozsah funkcí se může u konkrétního nasazení lišit podle zapnutých modulů '
        'a přidělených oprávnění.',
        ParagraphStyle('dis', fontName='Lato', fontSize=8, leading=12.5,
                       textColor=colors.HexColor('#7D94B4'))))
    return s


if __name__ == '__main__':
    target = sys.argv[1] if len(sys.argv) > 1 else 'OPERATINGROOM-prehled-funkci.pdf'
    build(target)
    print(f'Hotovo: {target}')
