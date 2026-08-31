# Design QA — potvrzení změny fáze

## Výsledek

**PASSED**

## Porovnání

- Reference: `design-qa-reference.png` (normalizována na 1920 × 1192 px)
- Implementace: `design-qa-implementation.png` (1920 × 1192 px)
- Stav: běžné potvrzení přechodu na „Úklid sálu“ bez upozornění na krátký interval

## Ověřené body

- Rozvržení odpovídá referenci: centrované záhlaví a dvojice velkých kruhových akcí.
- Zachováno téměř černé pozadí se statickou červenou, oranžovou a zelenou světelnou atmosférou.
- Obě akce mají výrazný barevný prstenec, jemný vnější obrys, ikonu a popisek uvnitř kruhu.
- Dialog má správnou sémantiku (`role="dialog"`, `aria-modal`, označený nadpis).
- Obě tlačítka mají čitelné přístupné názvy a jsou aktivní.
- V dialogu neběží žádná CSS animace.
- Vrstva pozadí nepoužívá `backdrop-filter` ani dynamické rozmazávání.
- V konzoli prohlížeče nejsou chyby.
- Produkční sestavení Next.js prošlo bez chyby.

## Záměrné rozdíly

- Náhledová trasa izoluje samotný dialog; levé menu z reference zůstává v reálném detailu sálu pod overlayem.
- Barevné plochy jsou vytvořené statickými CSS přechody, aby byl zachován vzhled bez runtime animací.

---

# Design QA — responzivní detail sálu

## Ověřené rozměry

- 2138 × 1042 px: mezera mezi ovládáním času a rezervovaným prostorem časové osy 95 px.
- 1280 × 720 px: mezera 28 px.
- 1024 × 768 px: mezera 78 px.

## Kontroly

- Kružnice `+` a `−` se na obrazovkách s menší výškou proporcionálně zmenšují.
- Při výšce do 760 px se ovládání posune o 8 px výše.
- Hlavní kruhová grafika, boční ovládání a spodní časová osa nemění svou strukturu.
- Ve všech ověřených rozměrech je překrytí nulové.
- Konzole náhledu neobsahuje chyby ani varování.
- Produkční sestavení prošlo bez chyby.

final result: passed
