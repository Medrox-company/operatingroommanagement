# Volitelný mobilní design Cliniq

V záhlaví skutečné aplikace je výběr **Design aplikace → Původní / Cliniq**. Původní vzhled je výchozí; světlý/tmavý režim je samostatná volba. Oba designy používají stejnou aplikaci, přihlášení, data, navigaci, oprávnění i klinické akce a detail. Přepnutí vzhledu neznovunačítá aplikaci ani nemaže její stav. Cliniq navíc nabízí dva sloupce a podélné boxy.

Soubor mobile-cliniq.css je omezen atributem data-app-design. Samostatný scripts/cliniq-preview je pouze izolovaná vizuální QA pomůcka se syntetickými daty; nepředstavuje funkční aplikaci ani nenahrazuje klinický detail.

Ověření: TypeScript, mobilní build a všech 7 testů společného záhlaví prošly. V prohlížeči potvrzeno zachování filtru při přepnutí designu a zapamatování volby po obnovení. Přihlášené klinické operace nebyly spouštěny.

V běžící přihlášené aplikaci na localhost:3000 byl ověřen přepínač Původní/Cliniq, přehled a otevření skutečného detailu s původní navigací a klinickými ovladači. Žádná klinická mutace nebyla spuštěna. Po QA byl vrácen původní vzhled a tmavý režim.
