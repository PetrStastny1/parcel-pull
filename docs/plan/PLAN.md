# Cíl

Dokončit statickou hru Parcel Pull z commitu d3d1b5a na větvi main. Nasazovaná GitHub Pages varianta poběží lokálně bez SDK. Samostatné buildy cílí na podporované režimy CrazyGames a Poki.

# Akceptační kritéria celku

- [ ] Jediné běžné spuštění Playwrightu projde s více workery a izolovaným webovým serverem.
- [ ] Manifest má 40 jedinečných desek, původních 12 zůstává ve stejném pořadí. Nových 28 dodrží podmínky §5 a dosavadní tři těžké desky se přesunou do odpovídající fáze.
- [ ] Deterministický generátor doloží opakovaný shodný výsledek. Řešič ověří všechny limity a tabulku vzdáleností.
- [ ] Uživatelský průchod, ovládání, fokus, 44px cíle, blokace, Undo, Restart, hvězdy a uložení splní §15 body 1–4.
- [ ] Nápověda, reklamy a lifecycle splní §12 a §15 bod 5, včetně neúspěchů, skryté karty a Basic Launch.
- [ ] Měření má interní události z §13, portálovou integraci a kontrolovatelný lokální adaptér.
- [ ] Volba jazyka, změna v pauze a lokalizované a přístupné stavy projdou §15 body 7–9.
- [ ] Průchod všech 40 bez SDK a výkonnostní měření z §14 projdou na produkčním buildu. Skutečné přijetí na portálech patří ke schválení.

# Společný základ

Nejdřív stabilizovat Playwright na původních 16 scénářích. Zachovat Vite, DOM, CSS, lokální ukládání i GitHub Pages. Kontrakty mezi oblastmi jsou v docs/plan/API.md. Databáze a přihlášení se hry netýkají.

# Oblasti

## levels

- Odpovědnost: deterministická kampaň, pořadí obtížných desek, řešič, tabulky a validační testy.
- Hranice: src/levels/, src/game/logic/, tools/solver/, docs/game/PROTOTYPE.md, e2e/campaign.spec.ts, e2e/prototype.spec.ts.
- Závisí na: kontraktu Level, stávající interakci s DOM.
- Akceptační kritéria: 40 desek a §5, determinismus, tři známé desky přemapované; ověření všech minima a nejkratších řešení a veřejný průchod 40 desek.
- Balíčky: generátor a kurátorský výběr; manifest, ověření řešiče a kampaň E2E.

## adapters

- Odpovědnost: implementace lokálního, CrazyGames a Poki adaptéru, reklamy, SDK lifecycle, mapování herních událostí na portály a dokumentace buildů.
- Hranice: src/platform/, docs/plan/PORTALS.md.
- Závisí na: kontraktu Platform.
- Akceptační kritéria: pouze vybraný portál se načítá; lokální běh bez sítě; CrazyGames Basic Launch nevolá reklamu; ukončení reklamy rozlišuje potvrzení, zrušení, chybu a nedostupnost; ověřené adaptéry vůči verzím API v dokumentaci.
- Balíčky: výběr adaptéru a načtení SDK; reklamní kontrakty, lifecycle a měření s unit testy.

## gameplay

- Odpovědnost: stavový tok hry s nápovědou, reklamou, lifecycle a měřením, lokální migrace, UI, texty, scénáře §12 a §15.
- Hranice: src/main.ts, src/ui/, src/game/storage.ts, src/game/render/, src/game/audio.ts, src/i18n/, src/styles/, e2e/gameplay.spec.ts, e2e/localization.spec.ts.
- Závisí na: kontraktech Platform a Level.
- Akceptační kritéria: rezervy nápověd a všechna omezení, odměna až po úspěchu, stavy z §10, §12 a měření §13, zachovaný dřívější pokrok.
- Balíčky: stav hry a uložení; UI, lifecycle a řízené reklamní scénáře.

# Vlny

1. Úrovně, adaptéry a integrace hry souběžně proti schváleným kontraktům.
2. Integrace, regresní ověření, měření na statickém buildu a nezávislé kontroly.
