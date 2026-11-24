# Kontrakty mezi oblastmi

## Úrovně

`src/levels/index.ts` exportuje `levels: readonly Level[]` v pořadí kampaně a `legacyLevelIds: Readonly<Record<number, number>>` s původními čísly 13–15 a novými čísly stejných desek. Prvních 12 má stejné ID i data. Rozhraní `Level` z `src/game/logic/game.ts` zachová `minimum` a `winning`, přidá `distances: Readonly<Partial<Record<string, number>>>` mapovanou přes `positionKey`. Nápověda projde `level.magnets` a vybere první účinný tah, který sníží vzdálenost o 1.

## Portály

Normativní typy v `src/platform/contract.ts`. `src/platform/index.ts` exportuje asynchronní `createPlatform(): Promise<Platform>`. Bez Vite konfigurace je režim lokální. `VITE_PLATFORM=crazygames` nebo `poki` volí produkční adaptér; `VITE_CRAZYGAMES_LAUNCH=basic` zakáže oba typy reklam. Při chybě inicializace se hra rozběhne lokálně. Podpora žádosti není dostupnost konkrétního videa.

Hra volá loading a gameplay metody ve správném okamžiku, páruje start/stop a blokuje vstupy během vlastního reklamního stavu. Adaptér normalizuje odpovědi a nevytváří žádné vlastní herní přechody. `record` dostává hotovou interní událost, portál ji přeloží jen na podporovaná měření.

V dev režimu může Playwright přes `window.__parcelTestPlatform` dodat řízený adaptér před otevřením stránky; produkční build tuto cestu nepoužívá. Testy řeší dynamickou viditelnost přes skutečnou událost DOM a přehrání přes řízené reklamní Promise.

## Uložení

Verzovaný záznam v localStorage. Nové rozhraní uloží číselnou zásobu nápověd. První dokončení každé třetí odlišné desky přidá jednotku do zásoby s kapacitou tři. Limit použití a limit reklamního požadavku jsou v paměti relace na úroveň. Zachování starších úrovní a migrace přemapovaných desek budou přesně určeny rozhodnutím arbitra.

Převod v1 ponechá výsledky 1–12 a remapuje výsledky 13–15 podle identity desky. Zachová nejlepší tahy a hvězdy. Dříve dohranou přesunutou desku lze opakovat, aniž by to odemklo nehrané sousední desky. Continue obnoví validní jedinou uloženou rozehranou desku i po přesunu mimo běžně odemčenou část; výběr jiné desky tento pokus nahradí. Hranice kampaně je první chybějící výhra v souvislé posloupnosti. Následující deska po výhře nebo celý souhrn se nabídnou jen při běžném postupu. Převod jednou přizná počáteční zásobu `min(3, floor(počet skutečných výher / 3))`; čistá hra má nulu.

CrazyGames může přes volitelnou `watchMuted` předat počáteční hodnotu portálového ztlumení a jeho změny. Hlasitost je zapnutá jen pokud to současně dovolí hráčova volba, portál, viditelnost karty a stav reklamy. Volba portálu lokální nastavení nepřepisuje.
