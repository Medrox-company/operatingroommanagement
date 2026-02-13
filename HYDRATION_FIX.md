# Oprava hydration mismatch u Preloader / LoadingCircularGraphic

Chyba vzniká, když **server** vykreslí HTML s jedněmi hodnotami (např. z `Math.random()` nebo z rozměrů kontejneru) a **klient** při hydrataci spočítá jiné hodnoty → React hlásí nesoulad u **řádku 222** (`{/* Floating particles */}` v `LoadingCircularGraphic`).

## Řešení: vykreslovat částice až na klientu

Soubor **`components/Preloader.tsx`** je v **jiném projektu** (Next.js s `app/layout.tsx`). V tomto workspace (Software) není – úpravy proveď v tom Next.js projektu.

### 1. Přidej stav „mounted“

Na začátek komponenty, která vykresluje `LoadingCircularGraphic` (nebo přímo uvnitř `LoadingCircularGraphic`), přidej:

```tsx
const [mounted, setMounted] = useState(false);
useEffect(() => {
  setMounted(true);
}, []);
```

### 2. Částice vykresli až když `mounted === true`

Kde teď máš něco jako:

```tsx
{particles.map((particle, i) => (
  <div key={`particle-${i}`} ...
```

změň na:

```tsx
{mounted && particles.map((particle, i) => (
  <div key={`particle-${i}`} ...
```

Tím pádem:
- **Server** vykreslí bez částic (nebo s prázdným polem).
- **Klient** při prvním vykreslení taky bez částic → hydratace sedí.
- V `useEffect` se nastaví `mounted = true` → překreslení → částice se vykreslí jen na klientu a už nedochází k porovnávání s serverem.

### 3. Alternativa: deterministické částice

Pokud chceš mít částice hned od prvního vykreslení (včetně serveru), **nepoužívej** `Math.random()` pro pozice, velikosti ani délky animací. Místo toho použij předem vygenerované hodnoty ze **seed** (např. knihovna `seedrandom`) nebo pevné pole konstant, stejné pro server i klient.

---

**Shrnutí:** Přidej `const [mounted, setMounted] = useState(false)` a `useEffect(() => setMounted(true), [])` do `LoadingCircularGraphic` a před `particles.map` napiš `{mounted && particles.map(...)}`. Otevři v Cursoru ten projekt, kde máš `Preloader.tsx`, a úpravy proveď tam.
