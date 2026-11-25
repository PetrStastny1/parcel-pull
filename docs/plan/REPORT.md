# Předání plné verze Parcel Pull

Kampaň má 40 desek. Prvních 12 je v původním pořadí a tři dřívější těžké desky mají nové pozice 40, 39 a 38. Hra zachovává jejich platné výsledky a rozehranou desku při převodu uloženého postupu. Hra má lokální režim i samostatná sestavení pro CrazyGames, CrazyGames Basic Launch a Poki.

Výhra, závěrečný souhrn, statistiky, výběr úrovní, nastavení a pauza mají křížek s plochou 44 × 44 px a tlačítko Menu. Escape a klepnutí mimo okno používají stejný bezpečný návrat jako křížek. Z Menu lze pokračovat na stejné rozehrané desce včetně historie Undo.

## Akceptační kritéria briefu

| Bod §15 | Ověření | Výsledek |
|---|---|---|
| 1. Pravidla, tahy, Undo a Restart | Unit testy pravidel, historie a skóre | Splněno |
| 2. 40 desek a reprodukovatelnost | Ověření fází a filtrů, nezávislý BFS 69 193 řešitelných stavů. Dva nezávislé výstupy generátoru mají shodný SHA-256 `748a495e2bccea5a5c5e1f2401e139aa2c6cfd6c3515176e94f6a26fb139e86e`. | Splněno |
| 3–4. Vstupy, rozměry, zablokování a uložení | Playwright s klávesnicí, myší, dotykem, dvěma minimálními velikostmi a obnovením úrovně 3 včetně Undo | Splněno |
| 5. Reklamy a nápověda | Řízený Platform v Playwrightu, testy mapování SDK a samostatné spuštění sestavení CrazyGames, Basic Launch i Poki s náhradou pouze vzdáleného SDK | Splněno v řízeném prostředí |
| 6. Stavy a výkon | Kampaň 40/40 a 120/120 hvězd, skrytá karta, nedostupný zápis a produkční měření | Splněno |
| 7–9. Jazyk, nastavení a přístupné popisky | Samostatné relace EN/CZ a nepodporovaný jazyk, překlady včetně nápovědy, chyby reklamy, načítání a blokace | Splněno |
| 10. Zavření dialogů a Menu | Pět nových scénářů a samostatná vizuální kontrola. Ověřen posuv, návrat fokusu, blokované úložiště a zavření výhry bez reklamy. | Splněno |

## Kontroly celku

- Herní kód `4581713` vychází z `main` `d3d1b5a`. Prošly lint, typecheck, build a 28 jednotkových testů.
- Všech 34 scénářů Playwright prošlo jedním souběžným spuštěním se šesti workery. V místním sandboxu má každý test vlastní jednoprocesové Chromium. Negativní kontrola potvrdila odmítnutí obsazeného portu. Opravený test aktivního času v nezávislém zatěžovacím běhu prošel 12×.
- Produkční lokální build při 5 Mb/s, RTT 100 ms a 4× zpomalení CPU načetl 209814 B po gzip a první ovladatelný stav za 1058 ms. Během deseti tahů mělo 100/100 intervalů nejvýše 17 ms. Žádný dlouhý úkol přes 50 ms.
- Nezávislý reviewer uzavřel rozdíly mezi specifikací a kódem. Nezávislé QA ověřilo přenos skutečného uložení vytvořeného ve starém statickém buildu, 34 paralelních scénářů a cílené scénáře na finálním kandidátovi. Bez otevřeného blockeru či majoru.
- Vizuální kontrola ověřila lokalizované dialogy na desktopu, v tmavém režimu a při 320 × 480 a 568 × 320. Křížek a Menu zůstaly v obraze i při posuvu 40 položek.

## Stav oblastí

- Úrovně `96d701a`. Samostatné review a QA potvrdily kompletní kampaň, přemapování, filtry a vzdálenosti.
- Adaptéry `66eb031`. Nezávislých 15 scénářů Chromia ověřilo výběr SDK, fallback, Basic Launch, měření, ztlumení a reklamní výsledky.
- Herní tok `d86e967`. Nezávislé review a QA ověřily nápovědy, reklamy, události, migraci, aktivní čas, ztlumení a obnovu.
- Dialogy `ba8ef8e`. Nové chování a akceptace §15.10 jsou v briefu. Výukové zvýraznění a dosvit doku byly ověřeny na prvním doručení.

## Uložení a závislosti

Hra ukládá pokrok do prohlížeče. Převod vychází z identity desky, zachová platné výsledky a jednu rozehranou desku. Zásobu nápověd inicializuje jednou z existujících výher. Nové závislosti nepřibyly.

## Neověřené body

Živá reklama a portálové přijetí čekají na soukromé CrazyGames Preview a Poki Inspector. Prohlížečové ověření proběhlo v desktopovém Chromiu včetně emulovaného mobilu. Druhý názor Claude Code se nepodařilo spustit, protože v prostředí chybí příkaz `claude`. Přesný příkaz pro opakování je `~/.agents/skills/handoff/scripts/claude-review.sh d3d1b5a`.

## Rozhodnutí bez Petra

Zachování identity přesunutých desek, souvislé odemykání, výjimečná obnova jednoho přemapovaného pokusu, portálové ztlumení, procenta skutečně dokončených úrovní a bezpečné zavírání dialogů jsou popsány v záznamu rozhodnutí. Plná herní verze má samostatná portálová sestavení a výchozí lokální variantu. Schválení před zveřejněním se týká cílových portálů a konečné revize. [Záznam rozhodnutí](../decisions/LOG.md) · [Portálová sestavení](PORTALS.md)
