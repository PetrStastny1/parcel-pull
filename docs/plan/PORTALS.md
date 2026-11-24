# Cílová sestavení Parcel Pull

Každý příkaz vytvoří samostatný statický adresář. Lokální build pro GitHub Pages má základní cestu `/parcel-pull/`; oba portály mají relativní cesty a očekávají `index.html` v kořeni balíčku.

| Cíl | Příkaz | Výstup |
|---|---|---|
| GitHub Pages a režim bez SDK | `npm run build` | `dist/` |
| CrazyGames Basic Launch | `VITE_PLATFORM=crazygames VITE_CRAZYGAMES_LAUNCH=basic npm run build -- --outDir dist/crazygames-basic` | `dist/crazygames-basic/` |
| CrazyGames s reklamami | `VITE_PLATFORM=crazygames VITE_CRAZYGAMES_LAUNCH=full npm run build -- --outDir dist/crazygames-full` | `dist/crazygames-full/` |
| Poki | `VITE_PLATFORM=poki npm run build -- --outDir dist/poki` | `dist/poki/` |

Při sestavení všech variant spusť nejprve lokální build, který vyčistí svůj výstupní adresář.

Lokální build nenačítá žádné portálové SDK a hraje se bez sítě po načtení vlastních souborů. Portálový build vloží do stránky jediný oficiální SDK skript a před aktivací příslušného adaptéru počká na `init()`. Při nedostupném skriptu, chybějícím SDK, zamítnuté inicializaci, vypnutém prostředí CrazyGames nebo vyčerpání 1,8 sekundy na celý start se použije lokální adaptér. [CrazyGames HTML5 v3](https://docs.crazygames.com/sdk/intro/) · [Poki HTML5](https://developers.poki.com/guide/sdk-html5)

## Reklamy, lifecycle a měření

- CrazyGames Basic Launch hlásí oba druhy reklam jako nepodporované. Hra proto nenabízí video a přechází mezi deskami přímo. Basic Launch dál předává loading, gameplay, změny portálového ztlumení a celočíselný postup. [CrazyGames Basic Launch a technické požadavky](https://docs.crazygames.com/requirements/technical/)
- CrazyGames s reklamami předává `midgame` a `rewarded` přes SDK. Procento kampaně vychází z počtu skutečně dokončených desek a adaptér jej zaokrouhlí dolů na celé číslo. Měření zobrazení reklam zajišťuje SDK. [CrazyGames video reklamy](https://docs.crazygames.com/sdk/video-ads/) · [CrazyGames herní API](https://docs.crazygames.com/sdk/game/)
- Poki předává loading a gameplay a měří vstup, výhru, blokaci a odchod pro ID úrovně a použití nápovědy podle jejího zdroje. Zablokování má vlastní akci, protože hráč může v témže pokusu vrátit tah a vyhrát. Zobrazení a výsledky reklam měří přímo Poki. [Poki SDK události](https://developers.poki.com/guide/sdk-overview) · [Poki Game Events](https://developers.poki.com/guide/game-events)

## Ověření před portálovým odevzdáním

V neveřejném CrazyGames Preview ověř start, Basic Launch bez žádostí, přechod po výhře a odměnu nápovědy. V Poki Inspector ověř loading, sled událostí při tahu, pauze a reklamě a vyzkoušej dokončenou i přerušenou odměnu. Lokální režim ověř s blokovanými SDK požadavky a v konfiguraci bez portálu. Lokální vývojový build dovoluje Playwrightu vložit řízený adaptér přes `window.__parcelTestPlatform`. Produkční build tuto volbu ignoruje. [CrazyGames SDK testovací prostředí](https://docs.crazygames.com/sdk/intro/) · [Poki Inspector](https://inspector.poki.dev/)

Přijetí hry ani skutečné reklamy na portálech nebyly ověřeny. Pokrok se podle briefu ukládá v prohlížeči. Účtové nebo cloudové ukládání je mimo rozsah. Při případném portálovém odevzdání posuď, zda se na hru vztahují příslušné požadavky CrazyGames Full Launch. [CrazyGames technické požadavky](https://docs.crazygames.com/requirements/technical/)
