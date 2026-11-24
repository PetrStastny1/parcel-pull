# Ověření mechaniky · 24. listopadu 2026

Dočasný řešič v Pythonu prohledal stavy po vrstvách. Stav je rozmístění zbývajících krabic, hrany jsou pouze účinné aktivace magnetů. Zpracování od kraje umožňuje vstup do právě uvolněného pole. U každého stavu se sčítají všechny cesty dosažené v jeho minimální vzdálenosti od startu. Prázdný stav je výhra. Uvedená řešení jsou nejkratší a shodují se s výběrem podle pořadí akcí z briefu. Konkrétní data jsou v §5 [zadání](BRIEF.md).

| Úroveň | Minimum | Počet nejkratších řešení | Jeden nejkratší průchod |
|---|---:|---:|---|
| 1 | 2 | 1 | W1A W1A |
| 2 | 3 | 1 | W1 S1A S1A |
| 3 | 6 | 3 | E3B N3A N3A N3A E3B E3B |
| 4 | 7 | 1 | W1 S2A E1 S2A S2A E3B E3B |
| 5 | 8 | 1 | W2 N1A W2 N1A E1B E1B E1B E1B |
| 6 | 9 | 3 | E1B W3 N1 N1 E1B N3A E1B E1B E1B |
| 7 | 11 | 8 | N4 E1 S3 S3 W3 W3 N1A N1A W3 N1A W2B |
| 8 | 10 | 4 | N1 E1 S2A S2A W1 S2A S2A E3B E3B E3B |
| 9 | 11 | 1 | W3 N1A N1A N1A E1 E1 S3 S3 W3 S2B S2B |
| 10 | 12 | 3 | S4 S4 W4 W4 N1A W4 N1A N1A E2 N2B N2B W1C |
| 11 | 14 | 6 | S3 E3 E3 W4B S3 W4B N1A S3 W4B W4B N1A N1A N1A W1C |
| 12 | 15 | 1 | W2 W2 N1C N1C E1 N3A E1 E1 S4 S4 S4 W4B W4B W4B W4B |

V tabulkách níže se souřadnice čtou jako sloupec a řádek od 1. Možnosti zahrnují všechny účinné magnety, které by hráč mohl zvolit v daném stavu, vedle nezapočítaných pulzů ostatních magnetů. Celkový počet sekvencí s opakováním může být kvůli cyklům neomezený. Počítáme pouze nejkratší.

## Úroveň 1 · Doručení

| Vidí | Účinné možnosti | Volba a pozorovaný následek |
|---|---|---|
| A(2,1) v pruhu doku | W1A | W1A přitáhne A na (1,1). |
| A(1,1) na kraji | W1A | W1A doručí A, protože její symbol odpovídá doku. |

## Úroveň 2 · Odbočení

| Vidí | Účinné možnosti | Volba a pozorovaný následek |
|---|---|---|
| A(2,1) mimo cílový sloupec | W1 | W1 přesune A na (1,1) do pruhu jižního doku. |
| A(1,1) podél jediného cílového sloupce | S1A | S1A přitáhne A na (1,2). |
| A(1,2) na kraji | S1A | S1A doručí A. |

## Úroveň 3 · Otevření pruhu pro druhou krabici

| Vidí | Účinné možnosti | Volba a pozorovaný následek |
|---|---|---|
| A(2,3), B(1,3) vedle sebe | E3B, N2 | E3B přitáhne obě do A(3,3), B(2,3) a srovná A se severním dokem. N2 by A stáhl do sousedního sloupce a přidal tahy. |
| A(3,3) u cizího doku, B(2,3) za ní | N3A, N2 | N3A vytáhne A na (3,2) a otevře dráhu B. N2 by odtud stáhl B do druhého řádku a zpět ji nedostane žádný jižní magnet. V tomto stavu nastane Route blocked a Undo obnoví možnost doručení. |
| A(3,2), B(2,3) | N3A, E3B, N2 | N3A přitáhne A k vlastnímu doku na (3,1). E3B už může pohnout B, proto existují různé stejně krátké průchody. |
| A(3,1), B(2,3) | N3A, E3B, N2 | N3A doručí A. Zbývá B v dolním pruhu. |
| B(2,3) | E3B, N2 | E3B přitáhne B do (3,3). N2 by ji odvedl z řádku cílového doku. |
| B(3,3) | N3A, E3B | E3B doručí B. N3A by ji stáhl ze správného kraje. |

## Úroveň 4 · Načasování společného tahu

| Vidí | Účinné možnosti | Volba a pozorovaný následek |
|---|---|---|
| A(3,1), B(1,1) | E1, W1 | W1 přitáhne A na (2,1) do cílového sloupce, B zůstane na levém kraji. E1 by posunulo B do (2,1), kam potřebuje nejprve vstoupit A. Z tohoto startu by přibyly tahy. |
| A(2,1), B(1,1) | S2A, E1 | S2A stáhne A na (2,2) a uvolní střed horního řádku pro B. |
| A(2,2), B(1,1) | S2A, E1, E2 | E1 přitáhne B do (2,1), kde ji vezme stejný magnet jako A. |
| A(2,2), B(2,1) | S2A, E1, E2, W1 | S2A posune A na (2,3), B na (2,2). Vodorovný tah by jejich společný pruh rozpojil. |
| A(2,3), B(2,2) | S2A, E3B, E2 | S2A doručí A a stáhne B na (2,3) do cílového řádku B. |
| B(2,3) | E3B | E3B přitáhne B na (3,3). |
| B(3,3) | E3B | E3B doručí B. |

## Úroveň 5 · Objížďka od doku

| Vidí | Účinné možnosti | Volba a pozorovaný následek |
|---|---|---|
| A(2,2), B(3,2) | E2, W2 | W2 přitáhne A na (1,2), B na (2,2). B se vodorovně vzdálí doku E1B, protože do horního řádku ji dostane pouze N1A. |
| A(1,2), B(2,2) | N1A, E2 | N1A přesune A na (1,1) a otevře levý kraj druhého řádku. |
| A(1,1), B(2,2) | N1A, E1B, E2, W2 | W2 navede B do sloupce A. Okamžité doručení A by stálo dodatečný tah pro B, protože by nešlo spojit doručení a přesun. |
| A(1,1), B(1,2) | N1A, E1B, E2 | N1A doručí A a současně posune B do (1,1). |
| B(1,1) | E1B | E1B přitáhne B na (2,1), na začátek volné trasy. |
| B(2,1) | E1B, W1 | E1B přitáhne B na (3,1). W1 změnu obrátí. |
| B(3,1) | E1B, W1 | E1B přitáhne B na (4,1). W1 zvětší vzdálenost k doku. |
| B(4,1) | E1B, W1 | E1B doručí B. |

Úrovně 3–5 ukazují různé typy plánování. Ve třetí je třeba zvednout A z cesty B. Ve čtvrté rozhoduje načasování zařazení B do společného sloupce. V páté vede jediná nejkratší trasa B nejprve pryč od vlastního doku a využije doručení A jako součást jejího přesunu. Hratelnost těchto rozhodnutí ještě patří do testu s lidmi.

Dočasná kontrola generátoru použila přesné seedy a filtry z §5. Každou fázi ukončila, jakmile měla počet kandidátů potřebný pro její část kampaně. Počítala pouze desky unikátní vůči prvním 12 a předchozím kandidátům ve vzorku.

| Rozsah | Seed | Unikátní kandidáti | Pokus, ve kterém se našel poslední uvedený kandidát |
|---|---:|---:|---:|
| 13–16 | 172721 | 4 | 895 |
| 17–28 | 172722 | 12 | 6528 |
| 29–40 | 172723 | 12 | 12978 |

Vzorek ověřuje, že kombinace pravidel a limitů může dát 28 dalších řešitelných desek. Finální výběr a ladění obtížnosti zůstávají součástí stavby.

## Obtížné úrovně 13–15

Pro rozšíření prototypu se vybraly desky s nejvyšším minimem z nejtěžší fáze. Při shodě rozhodlo pořadí přijetí. Ze standardních 50 000 pokusů pro seed 172723 vyšla jedna deska s minimem alespoň 20 tahů. Po pokračování téhož proudu do 250 000 pokusů prošlo všemi filtry 150 unikátních kandidátů, z nich 17 s minimem alespoň 20 tahů.

| Úroveň | Pokus | Minimum tahů | Počet nejkratších řešení |
|---|---:|---:|---:|
| 13 | 28 061 | 22 | 4 |
| 14 | 234 011 | 22 | 20 |
| 15 | 51 188 | 21 | 29 |

Výběr včetně konkrétních řešení vypíše `node tools/solver/generate-hard.ts`. Tabulky dosažitelných stavů pro hru vytváří `node tools/solver/generate.ts`.
