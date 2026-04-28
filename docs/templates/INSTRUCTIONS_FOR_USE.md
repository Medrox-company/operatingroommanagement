# Návod k použití (Instructions for Use, IFU)

## Operating Room Management System (ORMS)

**Dokument:** IFU-001
**Verze:** 0.1 (šablona)
**Jazyk:** čeština (povinný pro ČR)
**Soulad:** MDR (EU) 2017/745, Příloha I kap. III; prováděcí nařízení (EU) 2021/2226 (e-IFU)
**Schválil:** \_\_\_

> Pro SaMD je povolena elektronická forma návodu (e-IFU) za podmínek nařízení 2021/2226. Návod musí být v každém případě dostupný v jazyce uživatele (čeština).

---

## 0. Obsah

1. Identifikace výrobku a výrobce
2. Symboly a označení
3. Zamýšlený účel
4. Indikace, kontraindikace, cílová populace, uživatelé
5. Klinický přínos
6. Bezpečnostní upozornění a varování
7. Systémové požadavky
8. Instalace a první přihlášení
9. Funkce a obsluha
10. Kybernetická bezpečnost
11. Údržba a aktualizace
12. Hlášení incidentů
13. Likvidace
14. Kontaktní údaje a podpora
15. Záruční a regulatorní informace

---

## 1. Identifikace výrobku a výrobce

| Pole | Hodnota |
|---|---|
| Obchodní název | Operating Room Management System (ORMS) |
| Verze SW | \_\_\_ |
| Basic UDI-DI | \_\_\_ |
| UDI-DI | \_\_\_ |
| Třída | \_\_\_ (např. IIa) |
| Notifikovaná osoba | \_\_\_ (číslo NB) |
| Výrobce | \_\_\_, IČ \_\_\_ |
| Adresa | \_\_\_ |
| PRRC | \_\_\_ |
| E-mail / telefon | \_\_\_ |
| Datum vydání | \_\_\_ |
| Datum revize | \_\_\_ |

## 2. Symboly a označení

Použité symboly podle ISO 15223-1:

- ⓘ Návod k použití
- 🏭 Výrobce
- ⚠ Varování
- CE (s číslem NB)
- UDI

## 3. Zamýšlený účel

ORMS je zdravotnický software určený k **monitoringu a koordinaci provozu operačních sálů**: zobrazení stavu sálů, fází operačního workflow, plánování personálu, statistik a nouzových notifikací.

ORMS **není** určen k:
- diagnóze či léčbě onemocnění,
- monitorování fyziologických vitálních funkcí,
- automatickému řízení zdravotnického zařízení,
- náhradě HIS / EHR systému.

## 4. Indikace, kontraindikace, cílová populace

- **Uživatelé:** vedoucí sestry, koordinátoři, anesteziologický a chirurgický tým, nemocniční management.
- **Prostředí:** nemocniční operační trakty, centrální monitoring, mobilní zařízení personálu v interní síti.
- **Cílová populace pacientů:** dospělí i dětští pacienti operovaní v zařízení, kde je ORMS provozován (data o pacientech zpracována jen pro účely koordinace).
- **Kontraindikace použití:**
  - jako jediný zdroj informace o vitálních funkcích,
  - jako jediný kanál pro nouzovou komunikaci (nesmí nahradit standardní nemocniční nouzové systémy),
  - bez školení uživatelů.

## 5. Klinický přínos

- Lepší přehled o stavu sálů a workflow → snížení doby obratu sálu.
- Snížení koordinačních chyb mezi týmy.
- Rychlejší předání informace o nouzové situaci.

(Konkrétní hodnoty viz `CER-001`.)

## 6. Bezpečnostní upozornění a varování

⚠ **VAROVÁNÍ**
- ORMS nenahrazuje přímou klinickou komunikaci ani standardní nemocniční nouzové systémy.
- Při výpadku sítě nebo služby přejděte na záložní postup (whiteboard / telefon).
- Údaje zobrazené v ORMS musí být před klinickým rozhodnutím ověřeny u odpovědné osoby.
- Nouzový alarm vyžaduje funkční audio na klientském zařízení – uživatel musí audio při startu směny odemknout.
- Aplikaci nepoužívejte na zařízeních se zastaralým OS / prohlížečem mimo seznam podporovaných.

⚠ **POZOR**
- Změny stavu sálu provádějte vždy aktivním potvrzením, nikoli omylem během pohybu prsty po dotykové obrazovce.
- Účty se nesmí sdílet, každý uživatel má vlastní přihlášení a roli.

## 7. Systémové požadavky

| Komponenta | Minimum |
|---|---|
| Prohlížeč | Chrome / Edge \_\_\_+, Safari \_\_\_+, Firefox \_\_\_+ |
| OS | Windows 10+, macOS 12+, iOS 15+, Android 11+ |
| Síť | stabilní připojení, latence < 200 ms k serveru |
| Audio | reproduktory pro nouzový alarm |
| Rozlišení | min. 1280×720 (mobilní layout od 360×640) |

## 8. Instalace a první přihlášení

1. Administrátor obdrží od výrobce / distributora přístupové údaje a URL.
2. Otevřete URL v podporovaném prohlížeči.
3. Přihlaste se firemními údaji (SSO / e-mail + heslo + MFA).
4. Při prvním přihlášení odemkněte audio nouzového alarmu.
5. Ověřte, že vidíte aktuální seznam sálů a zelený indikátor připojení v reálném čase.

## 9. Funkce a obsluha

(Doplnit screenshoty + popis pro každou funkci.)

- 9.1 Dashboard sálů
- 9.2 Detail sálu a fáze workflow
- 9.3 Přiřazení personálu
- 9.4 Plánování operací
- 9.5 Statistiky
- 9.6 Nouzový alarm
- 9.7 Administrace uživatelů a rolí
- 9.8 Audit log

## 10. Kybernetická bezpečnost

- Komunikace probíhá výhradně přes TLS 1.2+.
- Doporučeno provozovat v izolovaném segmentu sítě nemocnice.
- Uživatelská hesla musí splňovat minimálně \_\_\_ znaků a obsahovat \_\_\_.
- MFA je povinná pro role admin, klinický koordinátor.
- Aktualizace SW se aplikují automaticky; release notes jsou publikovány na \_\_\_.
- Hlášení bezpečnostních incidentů: `security@___`.
- Doporučená opatření IT oddělení nemocnice viz dokument `docs/templates/CYBERSECURITY_SBOM.md`.

## 11. Údržba a aktualizace

- Výrobce vydává plánované aktualizace minimálně \_\_\_× ročně.
- Mimořádné bezpečnostní aktualizace mimo plán (nasazení do \_\_\_ hodin od oznámení CVE).
- Plánované odstávky jsou oznámeny minimálně \_\_\_ dní předem.

## 12. Hlášení incidentů

- Uživatel hlásí podezření na incident:
  1. Internímu IT a vedení operačního traktu.
  2. Výrobci na `vigilance@___` (24/7).
- Výrobce hlásí závažné incidenty SÚKL ve lhůtách dle MDR čl. 87 (2 / 10 / 15 dní).
- Závažným incidentem je událost, která přímo nebo nepřímo vedla, mohla vést nebo může vést ke smrti, závažnému zhoršení zdravotního stavu nebo závažnému ohrožení veřejného zdraví.

## 13. Likvidace

ORMS je software – fyzická likvidace se netýká. Po ukončení smlouvy:
- výrobce smaže produkční data v souladu s DPA a GDPR retencí,
- na žádost zákazníka poskytne export dat (formát \_\_\_),
- zachová auditní záznamy po dobu vyžadovanou MDR a zákonem 375/2022 Sb.

## 14. Kontakt a podpora

- Helpdesk: \_\_\_ (telefon, e-mail, hodiny dostupnosti)
- Eskalace: \_\_\_
- Vigilance: `vigilance@___`
- Security: `security@___`
- DPO: `dpo@___`

## 15. Záruční a regulatorní informace

- Splňuje požadavky **Nařízení (EU) 2017/745**.
- CE značka s číslem notifikované osoby \_\_\_.
- Registrováno u **SÚKL** (RZPRO ID \_\_\_).
- EUDAMED odkaz: \_\_\_

---

### Poznámka k formě IFU

Pro veřejnou distribuci v ČR je nutné:
1. Návod publikovat v elektronické podobě (e-IFU) podle nařízení 2021/2226 a zároveň zajistit:
   - veřejně dostupnou trvalou URL,
   - možnost stáhnout PDF,
   - oznámení dostupnosti e-IFU uživateli při instalaci a v aplikaci,
   - poskytnutí papírové verze do 7 dní na vyžádání zdarma.
2. Vést **změnové řízení** každé verze IFU vázané na verzi SW.
