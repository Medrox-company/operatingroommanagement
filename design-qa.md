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
