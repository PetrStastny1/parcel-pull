# Parcel Pull

## Zadání od Petra

> Navrhni logickou hru pro herní portály. Jen navrhni.

## 1. Shrnutí

Klepni na okrajový magnet, posuň všechny krabice v jeho pruhu o jedno pole a doruč každou do doku se stejným symbolem.

Jádro je pořadí tahů na sdílených trasách. Když krabice opustí desku, uvolní místo za sebou a dok funguje dál jako magnet. Ze snímku nebo animace má být poznat, že jeden magnet táhne dvě krabice a že jiný magnet přesměruje jednu z nich na křížení. Nejbližší hry používají okrajové magnety pro vedení robota bludištěm nebo dávají robotům schopnosti po dosažení doků. Identitu Parcel Pull tvoří pevné okrajové ovladače, jednotný krok o jedno pole a doručení, které uvolní desku. [Průzkum konkurence](RESEARCH.md)

Pro příležitostné hráče hlavolamů, sezení 2–10 minut, jednotlivé desky přibližně 10–90 sekund. Statická hra HTML5 pro CrazyGames nebo Poki, myš, dotyk i klávesnice, anglické a české UI, telefon i počítač, na výšku i na šířku.

## 2. Herní smyčky

- Klepnutí vybere magnet. Během 160 ms se zvýrazní jeho pruh a krabice udělají společný krok. Doručení dostane vlastní zvuk a dok potvrdí splnění.
- Deska začíná s viditelnými krabicemi i všemi ovladači. Hráč hledá pořadí tahů v omezeném počtu tahů podle §3 a může se kdykoli vrátit o krok nebo restartovat. Po doručení poslední krabice se nabídne pokračování.
- První verze má 40 pevných úrovní. Hráč se vrací pro další desku nebo pro 3 hvězdy na rozehrané či již vyřešené desce.

## 3. Pravidla

Mřížka má 3–5 sloupců a 2–4 řádky. Pole je volné, obsazené jednou krabicí nebo zdí. Každý symbol `A`, `B`, `C` v jedné úrovni má právě 1 krabici a 1 odpovídající dok. Na některých pozicích vně hran stojí okrajové magnety. Dok je magnet se symbolem. Neutrální magnet má šipku a žádnou cílovou krabici. Magnet může být aktivován libovolně opakovaně.

1. Vyber jeden magnet. Jeho pruh je právě řádek nebo sloupec, který se s ním stýká.
2. Projdi pole pruhu od pole u magnetu k protějšímu okraji. Každou krabici zpracuj jednou. Krabice nejblíž okraji v jeho prvním poli může opustit desku jedině tehdy, když má magnet stejný symbol. Krabice na dalších polích se posune o právě 1 pole k magnetu, pokud je cílové pole v okamžiku vyhodnocení volné.
3. Pozdější krabice může vstoupit do pole, které právě uvolnila dřívější krabice. Změny se vykreslí společně. Krabice, která se teprve posunula na kraj, potřebuje k doručení další tah.
4. Jakmile na desce žádná krabice nezbývá, vyhodnoť výhru. Za úspěšný tah, který změní alespoň jednu pozici nebo doručí zásilku, přičti 1 bez ohledu na počet přesunutých krabic.
5. Mezi tahy má hráč neomezené `Undo` a `Restart`. Undo obnoví předchozí pozice i počet tahů. Restart vrátí vstupní stav a vynuluje tahy i historii. Spotřebovaná nápověda se počítá dál podle §12.
6. Úroveň nemá čas ani životy, ale má limit tahů podle bodu 7. Ověř dosažitelnost výhry po každém úspěšném tahu. Jestliže z nového stavu výhra dosažitelná není, zobraz stav `Route blocked` s akcemi `Undo`, `Restart` a `Levels`. Undo obnoví poslední řešitelný stav. V tomto stavu je `Hint` nedostupná.
7. Každá úroveň má limit tahů `minimum + rezerva`, kde `minimum` je nejmenší počet tahů z §5. Rezerva je 4 pro úrovně 1–5, 3 pro 6–20, 2 pro 21–30 a 1 pro 31–40. Zbývající tahy jsou limit, případně zvýšený o 5 z odměňované reklamy podle §12, minus počet tahů. Undo vrátí 1 tah, Restart vrátí plný limit a zahájí nový pokus. Pokud účinný tah vyčerpá limit a nevede k výhře, zobraz stav `Out of moves` / `Došly tahy`. Další tah v tomto stavu nelze provést. Pořadí vyhodnocení po tahu je výhra, zablokovaná trasa, došlé tahy.

| Situace | Výsledek |
|---|---|
| Sousední krabice v řadě, před první volno | Všechny navazující krabice se pohnou o 1 pole. |
| Zeď v pruhu | Krabice přes zeď nepřejde. Každý další úsek pruhu se dál vyhodnotí podle volnosti polí. |
| Jiná krabice v krajním poli doku | Zůstane na desce. Krabice, které za ní nemají volné pole, stojí. |
| Odpovídající krabice v krajním poli | Opustí desku a sousední krabice může ihned obsadit uvolněné pole. |
| Neutrální nebo splněný magnet | Dál posouvá pruh o 1 pole, na kraji z něj žádná další krabice nevypadne. |
| Prázdný pruh nebo všechny krabice blokované | Pulz 100 ms, bez započtení tahu a bez zápisu do historie. |
| Reálný dotyk začne na tlačítku a skončí mimo něj | Žádný tah. |
| Poslední zásilka doručena | Výhra má přednost před kontrolou zaseknutí i limitem tahů. Postup se uloží před zobrazením výsledku. |
| Tah vyčerpá limit a zablokuje trasu | Zobrazí se `Route blocked`, protože další tahy z tohoto stavu k výhře nevedou. |

## 4. Ovládání

Myš a dotyk aktivují magnet kliknutím či klepnutím. Pevná šipka každého ovladače ukazuje směr přitažení, symbol na doku značí přijímanou krabici. Poloha kurzoru ani délka stisku směr nemění. Tab prochází ovladače po obvodu od severní hrany zleva ve směru hodinových ručiček, pak ovládací panel. Enter a mezerník aktivují zaměřené tlačítko. `Z` vrací tah, `R` restartuje a Escape otevře pauzu během hry nebo zavře dialog podle §10. U nápovědy odpovídá pokračování, u zablokované trasy, došlých tahů a čekání na reklamu nemá žádný účinek. Klávesové zkratky platí jen v zaměřené hře, bez opakování při držení klávesy. Fokus má viditelný rámeček.

Dotykové cíle jsou minimálně 44 × 44 CSS px. Během pohybu (160 ms) nebo bezvýsledného pulzu (100 ms) se další vstup k tahu, Undo a Restart zahodí. Po animaci přijme další samostatnou aktivaci i na stejném magnetu. Zrušení dotyku, gesto mimo ovladač a dotek mřížky nemění stav. Dialog, reklama a skrytá karta blokují vstupy do plochy.

## 5. Úrovně a obtížnost

Následující schéma určuje bajtově čitelné zápisy. `grid` čteme shora dolů a zleva doprava, `.` je volno a `#` je zeď. `docks` lze řadit libovolně. Řešič řadí akce podle stran `N,E,S,W`, pak podle stoupajícího indexu. `N` a `S` používají sloupce zleva od 1, `E` a `W` řádky shora od 1. Chybějící symbol je neutrální magnet.

```json
{
  "type": "object",
  "additionalProperties": false,
  "required": ["grid", "docks"],
  "properties": {
    "grid": {
      "type": "array", "minItems": 2, "maxItems": 4,
      "items": {"type": "string", "pattern": "^[.#ABC]{3,5}$"}
    },
    "docks": {
      "type": "array", "minItems": 1, "maxItems": 10, "uniqueItems": true,
      "items": {"type": "string", "pattern": "^[NESW][1-5][ABC]?$"}
    }
  }
}
```

Doplňková validace vyžaduje stejně dlouhé řádky, nejvýše 1 magnet na daném okraji pole, platné indexy a ke každému použitému symbolu právě 1 krabici a 1 dok. Alespoň 1 krabice. Pozice magnetu může sousedit i se zdí, pokud lze jeho pruh použít. ID je pozice od 1 v manifestu. Minima se dopočítají řešičem při sestavení.

### Prvních 12 úrovní

```json
[
  {"grid": [".A.", "..."], "docks": ["W1A"]},
  {"grid": [".A.", "..."], "docks": ["W1", "S1A"]},
  {"grid": ["...", "...", "BA."], "docks": ["N3A", "E3B", "N2", "E1"]},
  {"grid": ["B.A", "...", "..."], "docks": ["S2A", "E3B", "E1", "E2", "W1"]},
  {"grid": ["....", ".AB.", "...."], "docks": ["N1A", "E1B", "E2", "W1", "W2"]},
  {"grid": ["A...", ".#..", ".B.."], "docks": ["N3A", "E1B", "W3", "N2", "N1"]},
  {"grid": [".A..", ".#..", "....", "...B"], "docks": ["N1A", "W2B", "N4", "E1", "W3", "S3"]},
  {"grid": ["..B#", "A...", "....", "...."], "docks": ["S2A", "E3B", "N1", "E1", "W1", "E4", "W2"]},
  {"grid": ["....", ".#..", ".A.#", "B..."], "docks": ["N1A", "S2B", "E1", "S3", "S1", "E2", "W3"]},
  {"grid": ["A.#.", "...B", ".#..", "..C."], "docks": ["N1A", "N2B", "W1C", "S4", "W4", "E4", "E2"]},
  {"grid": [".#C#.", ".....", "B.A..", "....."], "docks": ["N1A", "W4B", "W1C", "W3", "E3", "S4", "E1", "S3"]},
  {"grid": [".A...", "..C..", "B.#.#", "....."], "docks": ["N3A", "W4B", "N1C", "W2", "E1", "S4", "N2", "S3"]}
]
```

Úroveň 1 učí dvojkrok doručení. Úroveň 2 přidá neutrální magnet a první odbočení. Úroveň 3 přidá druhý symbol a ukáže emergentní společný pohyb dvou krabic i blokování cizího doku. Úrovně 4–5 kombinují křížení a protilehlé magnety. Úroveň 6 přidá zeď. Úrovně 7–9 procvičují pořadí a obcházení překážek. Úroveň 10 přidá třetí symbol. Od úrovně 11 rostou kombinace dosavadních prvků.

| Úrovně | Formát | Minimum tahů od startu | Počet stejně krátkých řešení |
|---|---|---:|---:|
| 1–2 | Výukové, 1 krabice | 2–3 | 1 |
| 3–5 | 2 krabice, bez zdí | 6–8 | 1–5 |
| 6–9 | 2 krabice, 1–2 zdi | 9–11 | 1–8 |
| 10–16 | 3 krabice, 1–2 zdi | 12–16 | 1–16 |
| 17–28 | 3 krabice, 1–3 zdi | 14–19 | 1–24 |
| 29–40 | 3 krabice, 1–3 zdi | 17–24 | 1–32 |

Úrovně 13–40 vzniknou před sestavením a vybrané desky se uloží do manifestu. Generátor začíná samostatně pro fáze 13–16, 17–28 a 29–40 s 32bitovým bezznaménkovým stavem 172721, 172722 a 172723. Při losování provede xorshift32 postupně XOR s posunem vlevo o 13, logickým posunem vpravo o 17 a posunem vlevo o 5. Po každé operaci zachová dolních 32 bitů a pro výběr z rozsahu 0 až `n - 1` vrátí nový stav modulo `n`.

1. V každém pokusu ve fázi 13–16 losuje šířku jako `4 + draw(2)`, v dalších je šířka 5. Výška je vždy 4. Pak losuje počet magnetů `6 + draw(4)` a počet zdí `1 + draw(2)` pro 13–16 nebo `1 + draw(3)` pro ostatní.
2. Sestaví seznam všech pozic magnetů v pořadí stran `N,E,S,W` a rostoucích indexů a seznam polí po řádcích. Samostatně zamíchá nejdříve pozice magnetů, pak pole. Pro oba seznamy použije Fisher–Yates od posledního indexu `i` do 1 a prohodí pozice `i` a `draw(i + 1)`. Z prvního seznamu vezme vylosovaný počet magnetů, první tři přiřadí postupně `A,B,C` a ostatní jsou neutrální. Z druhého seznamu umístí na první tři pozice `A,B,C` a na následující vylosovaný počet zdí.
3. Kandidáta přijme včetně hraničních hodnot tabulky a při alespoň 2 účinných magnetech na startu. Posun alespoň 2 krabic, které obě zůstanou na desce, musí nastat v prvním nejkratším řešení podle pořadí řešiče. Kandidáta s hromadně odstraněnými zdmi přepočítá a vyřadí původní desku, pokud odstranění nezměnilo minimum ani počet nejkratších řešení. Vyřadí duplicity vůči prvním 12 úrovním i přijatým kandidátům napříč fázemi. Ekvivalentní jsou desky, které se i s magnety shodují při otočení, zrcadlení nebo soustavném přejmenování symbolů.
4. Fáze končí po přijetí 100 kandidátů nebo po 50 000 pokusech. Kurátor z nich ručním průchodem vybere postupně 4, 12 a 12 desek, obrátí pozornost na pestrost tras a uloží konkrétní manifest. Pokud je vhodných kandidátů málo, doplní fázi ručně vytvořenými deskami se stejným rozměrem a validačními pravidly. Do hry se ukládá manifest, výběr kurátora ovlivní pouze jeho obsah. Závěrečná fáze navíc zachovává tři původní těžké desky prototypu. Dvě pocházejí z pokračování téhož losovacího proudu za hranicí 50 000 pokusů. Všechny tři splní věcné filtry závěrečné fáze i společnou deduplikaci.

Validátor hledá stavový graf do šířky. Hrana je pouze účinná aktivace magnetu. Počítá nejkratší sledy akcí, včetně odlišných akcí vedoucích do stejného stavu. Cykly a Undo se do počtu neberou. Klient pro každou úroveň při sestavení dostane kompaktní tabulku zbývající vzdálenosti od výhry pro dosažitelné řešitelné stavy. Klíčem jsou sloty `A,B,C` s indexem pole od nuly nebo zvláštní hodnotou pro nepřítomný symbol. Hra používá tabulku pro vyhodnocení zaseknutí a pro volbu prvního tahu, který zkracuje vzdálenost o 1.

[Průchod prototypem a výstup řešiče](PROTOTYPE.md)

## 6. Učení hry

1. Po zahájení úrovně 1 pulzuje západní dok, pruh a šipka k doku. Po prvním tahu se pulz přesune na mezeru mezi krabicí a dokem. Druhý tah spustí animaci doručení.
2. Úroveň 2 po 1500 ms bez vstupu na 600 ms zvýrazní západní neutrální magnet. Po přesunu označí jižní dok. Výukové zvýraznění lze ignorovat, ovládání zůstává stejné.
3. Úroveň 3 před prvním vstupem spojí symboly krabic a jejich doky krátkým pulzem. První účinný tah ukáže celý pruh i pohyb obou krabic, pokud jsou v něm. Při cizím doku se při pokusu zobrazí 100ms obrys nesouladu na krabici i doku. Další krok si volí hráč.

## 7. Skóre a odměny

Nechť `p` je nejmenší počet účinných tahů z počátečního stavu. Limit tahů z §3 je vždy vyšší než `p`, takže 3 hvězdy zůstávají dosažitelné. Za výhru s nejvýše `p` tahy jsou 3 hvězdy, s nejvýše `p + 2` tahy 2 hvězdy, jinak 1 hvězda. Undo snižuje počet tahů na obnovenou hodnotu. Nápověda hvězdy nemění. Lepší počet hvězd a nižší počet tahů se uchovají při opakování. Souvislá řada výher odemkne první další nevyhranou úroveň. Mimořádně dostupná přemapovaná deska sama neodemkne sousední zamčenou desku. Hvězdy slouží k vlastnímu zlepšování. Za každé 3 různé dohrané úrovně přibyde 1 bezplatné použití `Hint` do zásoby s kapacitou 3.

## 8. Pocit ze hry

| Událost | Animace | Zvuk | Vibrace |
|---|---|---|---|
| Účinný tah | Pulz celého pruhu a současný posun 160 ms ease-out | Krátké mechanické cvaknutí | Žádná |
| Doručení | Pohyb do doku do konce 160 ms a dosvit doku dalších 120 ms | Tón o kvintu výš než cvaknutí | Žádná |
| Blokovaný tah | Obrys pruhu 100 ms ease-out | Tlumené klepnutí | Žádná |
| Undo | Inverzní přesun 120 ms ease-out | Jemné cvaknutí s klesající výškou | Žádná |
| Výhra | Hvězdy a výsledek po posledním doručení za 240 ms ease-out | 3tónový motiv | Žádná |

S nastavením omezeného pohybu se změny zobrazí ihned, zvýraznění zůstane statické nejvýše 120 ms. Žádné blikání v rychlých sekvencích.

## 9. Vizuální styl

Světle šedá plocha `#F2F5F8`, bílý panel `#FFFFFF`, tmavý text `#172434`, stěna `#48596B` s diagonálním vzorem. Zásilky mají akcenty `#1367A5` kruh, `#805111` trojúhelník a `#623F8C` čtverec. Bílé symboly a tmavé popisky mají kontrast alespoň 4,5:1 proti příslušné ploše. Obrys fokusu a aktivní šipky mají alespoň 3:1. Každý symbol je čitelný i v odstínech šedi. Systémové bezpatkové písmo, pozadí a krabice z jednoduchých geometrických tvarů.

Minimum herní plochy je 320 × 480 CSS px na výšku a 568 × 320 na šířku při 100% zvětšení. Mřížka včetně obou stran s magnety je nejvýše 7 × 6 buněk po 44 px při minimální velikosti. V portrétu ovládací lišta pod mřížkou, v krajině vpravo. Dialogy mají vlastní svislý posuv podle potřeby.

```text
  Level 04                     Pause
         [↓]  .
   [→]   [B] [ ] [A]   [←]
         [ ] [ ] [ ]   [←]
         [ ] [ ] [ ]   [◭←]
             [↑○]
  Undo  Restart  Hint   Moves 0 (Left 6)
```

Náčrt schematicky ukazuje hrany, neutrální ovladače a doky se symbolem. Přesné polohy určuje záznam úrovně.

## 10. Obrazovky a stavy

| Stav | Obsah a přechody |
|---|---|
| Načítání | Úvodní obrazovka s logem, scénou a pokrokem, místo tlačítek text průběhu přípravy. Po připravení úrovně 1 a načtení pokroku zobrazí první vstup nebo menu při návratu. |
| Úvodní obrazovka | Samostatná obrazovka přes celé okno, deska ani dialog pod ní nejsou vidět. Velký název hry jako logo, nad ním malá dekorativní scéna: dok-magnet ve smyčce přitáhne krabici po pruhu do doku. Při omezeném pohybu zůstane scéna statická. Pod logem počet dokončených úrovní z celkového počtu a součet nejlepších hvězd z maxima kampaně pod popisky `Completed levels` / `Dokončené úrovně` a `Earned stars` / `Získané hvězdy`, i při nulovém postupu. Pod nimi velké primární tlačítko a pod ním vedle sebe `Levels` a `Settings`. Při nedostupném úložišti zobrazí `Progress won't save`. Na výšku je vše v jednom sloupci, na šířku při malé výšce je logo se scénou vlevo a pokrok s tlačítky vpravo. Bez posuvu při 320 × 480 i 568 × 320. |
| První vstup | Úvodní obrazovka s primárním tlačítkem `Play`. Play odhalí desku 1 i výukový pulz. |
| Menu při návratu | Úvodní obrazovka s primárním tlačítkem `Continue`, pokud existuje uložený rozehraný stav nebo výsledek. `Continue` otevře uložený rozehraný stav, jinak první nedohranou úroveň, po všech výhrách výběr úrovní. Výběr úrovní a nastavení se otevřou jako dialog nad úvodní obrazovkou a po zavření vrátí fokus na tlačítko, které je otevřelo. |
| Výběr úrovní | Seznam 1–40 se získanými hvězdami a stavem zámku. Aktivace dostupné úrovně otevře její rozehraný stav, pokud je právě ona uložená, jinak začne od začátku. Výběr jiné úrovně nahradí aktuální rozehraný stav. `Back` obnoví výchozí obrazovku. |
| Hra | Číslo úrovně, mřížka, tahy a vedle nich výrazný štítek zbývajících tahů `N left` / `Ještě N` (při 2 a méně ve výstražné barvě; v úzkém panelu na šířku vždy pod počtem tahů; čtečka dostane ve stavovém hlášení plné `Moves left: N` / `Zbývá tahů: N`), Undo, Restart, Hint, Pause. Undo beze změny historie je neaktivní. Hint od úrovně 4 otevře dialog, pokud má hráč bezplatné použití nebo možnost požádat o odměňovanou reklamu. |
| Pauza | `Resume`, `Levels`, `Settings`. Návrat z nastavení otevře stejnou pauzu. Ztráta viditelnosti během aktivní hry dokončí již vyhodnocený tah bez přehrání zbytku animace a uloží stav. Pokud vznikla výhra nebo zablokování, vrátí se přímo odpovídající stav, jinak hra přejde do pauzy. |
| Výhra | Hvězdy, výsledný počet tahů, `Next`, `Replay`, `Levels`. Po dokončení celé kampaně zobrazí závěrečný souhrn. |
| Závěrečný souhrn | Po dokončení kampaně zobrazí součet nejlepších hvězd ze všech desek, `Replay` a `Levels`. |
| Zablokovaná trasa | Deska zůstane viditelná pod vrstvou `Route blocked`. `Undo`, `Restart` nebo `Levels` podle §3. |
| Došly tahy | Deska zůstane viditelná pod vrstvou `Out of moves` / `Došly tahy` s počtem vyčerpaných tahů. Primární `Undo` (`Zpět o tah`), dále `Restart` (`Od začátku`) a podle §12 `+5 moves` / `+5 tahů` s ikonou videa. Okno nemá křížek ani Menu, Escape a klepnutí mimo něj nemají účinek. Při obnovení uloženého pokusu s vyčerpaným limitem se okno ukáže znovu. |
| Nastavení | Přepínač `Sound`, přepínač jazyka `Language` / `Jazyk` s volbami `English` a `Čeština` a tlačítko `Back`. Volba jazyka se projeví okamžitě i v otevřeném nastavení a zachová herní stav. Omezený pohyb se řídí nastavením zařízení. |
| Nápověda | Nabídne `Use hint` při volné zásobě a `Watch ad for hint` při dostupné nabídce, současně vždy `Resume`. Volba úspěšné nápovědy zavře dialog a ukáže správný magnet. |
| Reklama čeká | Stav bez tahů a dalšího spuštění reklamy. Ukončení průběžné reklamy nebo chyba spustí požadovanou následující úroveň. |
| Reklama nedostupná | Při neúspěchu odměňované reklamy text `Video unavailable` v dialogu Hint, dostupné `Resume` a případná bezplatná nápověda. |

Výhra, závěrečný souhrn, výběr úrovní, nastavení a pauza mají viditelný křížek vpravo nahoře s dotykovým cílem nejméně 44 × 44 CSS px a lokalizovaným přístupným názvem `Close` / `Zavřít`. Křížek zůstává dostupný i při posuvu dialogu. Tlačítko `Menu` ve všech pěti oknech otevře přímo úvodní obrazovku a zachová pokrok, rozehranou desku, počet tahů a historii Undo, také při nedostupném lokálním úložišti. Fokus přejde na hlavní akci `Play` nebo `Continue`.

Escape a klepnutí na pozadí dialogu odpovídají křížku, pokud lze zavřít okno bez ztráty rozehrané hry. Z pauzy pokračují na stejné desce, z výběru a nastavení obnoví výchozí obrazovku a její fokus a z výhry či závěrečného souhrnu otevřou menu. Zavření ani Menu nevyžaduje reklamu. Klepnutí uvnitř dialogu a dotyk, který začne uvnitř a skončí vně, okno nezavírají.

Po závěru hry se přesun fokusu řídí primární akcí aktuálního stavu. Po opuštění dialogu se fokus vrací na vyvolávající ovladač, pokud je stále dostupný. Textový stav mřížky, účinek tahu a zbývající zásilky jsou dostupné čtečce obrazovky.

## 11. Zvuk

Web Audio se aktivuje až po prvním vstupu. Všechny zvuky jsou syntetizované, bez hudby a stahování dalších souborů. Cvaknutí 45 ms, tlumené klepnutí 55 ms, tón doku 140 ms, výherní motiv do 340 ms. Výchozí hlasitost hlavní větve 0,20 lineárně, volba `Sound` nastavuje 0,20 nebo 0. Během přehrávání reklamy a skryté karty je hlasitost 0, poté se vrátí nastavení hráče.

## 12. Portál a monetizace

- Průběžná reklama pouze při stisku `Next` na výhře, nejvýše 1 požadavek na jeden přechod. Před prvním hraním a při opakování úrovní se nevyžaduje. Skutečnou frekvenci určuje SDK bez vlastního časovače. CrazyGames v dokumentaci uvádí nejvýše 1 midroll za 3 minuty. Poki vyhodnocuje frekvenci sám. [CrazyGames pravidla reklam](https://docs.crazygames.com/requirements/ads/), [Poki požadavky](https://developers.poki.com/guide/requirements-quality)
- `Hint` od úrovně 4 otevře přerušené hraní a ukáže 3 sekundy zvýraznění 1 magnetu, který leží na nejkratší trase. Zvýraznění skončí také při dalším účinném tahu. Nabídka s ikonou videa a stejně velkým tlačítkem jako Resume je k dispozici od úrovně 6 jen v dialogu, pokud adaptér pro danou platformu a režim podporuje žádost o odměňované video. Dostupnost konkrétního videa potvrdí až výsledek SDK. Bezplatné použití stojí 1 získanou nápovědu. Nejvýše 1 použitá nápověda a 1 žádost o odměňovanou reklamu pro dané ID úrovně za relaci (jedno načtení stránky), Restart ani Replay limity neodstraní. Přerušení, chyba a zrušení reklamy nápovědu neposkytnou. Při výběru bezplatné nápovědy je dostupné také pokračování bez nápovědy. Po přehrání SDK potvrzené odměny se nápověda připraví ihned a 3sekundové zvýraznění začne při návratu do aktivní hry.
- Ve stavu `Došly tahy` je nabídka `+5 moves` / `+5 tahů` dostupná, pokud adaptér podporuje odměňované video a v aktuálním pokusu ještě nebyla podána žádost. Pokus začíná novou hrou úrovně, `Restart` nebo `Replay` a trvá i přes obnovení stránky. Žádost se uloží s rozehraným stavem ještě před voláním SDK, takže druhá žádost v témže pokusu není možná, ani po neúspěchu. Ochrana platí v jedné kartě a přes obnovení stránky, ne mezi souběžně otevřenými kartami, kde rozehraný pokus platí podle posledního zápisu. Dokončená reklama přidá 5 tahů k limitu pokusu a vrátí hru do aktivního hraní se startem, nebo do pauzy při skryté kartě. Undo bonus neodebírá. Zrušení nebo chyba ponechá okno otevřené s textem `Video unavailable` bez nabídky a bez události start. Lokální adaptér bez SDK nabídku nezobrazí.
- Načítání mapuj na CrazyGames `loadingStart()` při zahájení a `loadingStop()` při zobrazení první připravené desky. Poki použije `gameLoadingFinished()` při zobrazení první připravené desky. Gameplay start signalizuje vstup po výběru `Play` či úrovně nebo návrat z pauzy. Stop signalizuje výhru, zablokování, došlé tahy, pauzu, odchod z úrovně nebo otevření nabídky nápovědy. Po Undo nebo restartu z blokovací vrstvy start obnoví. Události start a stop se párují a neduplikují. Pouhá změna fokusu okna SDK událost nevyvolá. Přechod hry do skutečné pauzy při skrytí karty vyvolá stop jen z aktivního hraní. Přechod do další úrovně jde po výhře přes stop, `Next`, volání reklamy a start. Během reklamy se další události hry do SDK neposílají. Resume z Hint obnoví hraní a vyšle start, stejně jako bezprostřední návrat po úspěšné nápovědě. Pokud je karta skrytá, přechod po průběžné reklamě nebo po úspěšné odměně skončí v pauze a start vyšle až viditelné Resume. Po úspěšné odměně se do té doby drží zvýraznění v paměti. Neúspěšná odměňovaná reklama ponechá dialog Hint otevřený bez události start a ukáže obecný text `Video unavailable`. [Poki SDK](https://developers.poki.com/guide/sdk-overview), [CrazyGames herní události](https://docs.crazygames.com/sdk/game/)
- Pokrok je lokální a verzovaný. Ukládá se nejvyšší dostupná úroveň, dokončení a nejlepší tahy a hvězdy každé úrovně, poloha a historie tahů 1 rozehrané desky včetně příznaků žádosti o bonus a přiděleného bonusu, zásoba nápověd a zvuk. Zápis nastane po tahu, Undo, restartu, výhře, změně zásoby a nastavení. Pokud lokální uložení není dostupné, hra pokračuje v paměti a při vstupu zobrazí `Progress won't save`. Neplatný formát se ignoruje, vstup je čistý. Rozehraný pokus uložený s více tahy, než povoluje limit podle §3, se zahodí jako neplatný. `Continue` pak postupuje jako bez uloženého pokusu a výsledky, hvězdy i odemčení zůstanou. Při úspěšném načtení zaseknuté desky se obnoví blokovací stav s Undo. Uložení pod stejným původem v prohlížeči se zachová i po obnově stránky. Převod uloženého prototypu zachová identity výsledků a jediného platného rozehraného pokusu včetně historie. Původní úrovně 13–15 se přemapují na 40, 39 a 38. Zásoba se při převodu přizná jednorázově po jedné nápovědě za každé tři různé platné výhry, nejvýše tři. [Kontrakt migrace](../plan/API.md)
- Lokální adaptér bez SDK hlásí odměňovaná videa jako nedostupná a pokračuje přes průběžné reklamy okamžitě. Při testu se dá vyměnit za řízený adaptér pro úspěch, zrušení a chybu. Adaptér CrazyGames Basic Launch deaktivuje oba typy požadavků na reklamu a skryje nabídku videa. Při stavbě ověřit aktuální dokumentaci obou portálů. Distribuce na obou závisí na podmínkách přijetí a zvolené spolupráci. [CrazyGames video SDK](https://docs.crazygames.com/sdk/video-ads/), [Poki modely spolupráce](https://developers.poki.com/guide/revenue-deal-types)

## 13. Měření

Interní události `level_start`, `level_win`, `level_blocked`, `level_exit`, `hint_use`, `ad_request`, `ad_outcome`. U úrovně ukládat ID a počet tahů, u výhry délku aktivního hraní v ms, u nápovědy zdroj a u reklamy umístění a výsledek. Odpovědi: dokončení úrovní 1, 5 a 10, pokračování po výhře, úroveň a okamžik nejčastějšího odchodu, použití nápověd. Použít dostupná měření příslušného portálu a u reklam jeho automatické metriky. Lokální test může události zachytit v paměti. Žádné identifikátory osob ani další analytické služby. [Měření Poki](https://developers.poki.com/guide/game-events)

## 14. Technické zadání

TypeScript + Vite, statický HTML5 build. Herní pravidla čistě v `src/game/logic`. Vykreslování v `src/game/render` přes DOM a CSS, aby ovladače byly nativní tlačítka a hra měla pružný layout. Obrazovky v `src/ui`, úrovně v `src/levels`, platformy v `src/platform`, řešič a generátor v `tools`. Hra za běhu načítá pouze vlastní soubory a povolené volání SDK. Skripty `lint`, `typecheck`, `test`, `build` a `test:e2e`.

Všechny texty herního UI jsou v `src/i18n` ve slovnících `en` a `cs` se stejnými klíči. Patří sem popisky obrazovek a ovladačů, stavová a chybová hlášení, texty s počty a texty pro čtečky obrazovky. Formulace a skloňování počtů se řídí zvoleným jazykem. Atribut `lang` na elementu `html` odpovídá aktuálnímu jazyku od první obrazovky a aktualizuje se při přepnutí.

Při načtení má přednost ruční volba uložená v lokálním nastavení. Pokud chybí, hra použije první podporovaný jazyk z `navigator.languages` v pořadí preferencí. Z regionálních variant použije základní jazyk, například `cs-CZ` jako `cs` a `en-GB` jako `en`. Pokud seznam preferencí chybí nebo je prázdný, použije `navigator.language`. Bez podporované preference se hra zobrazí anglicky. Ruční volba se ukládá stejným způsobem jako zvuk podle §12 a při nedostupném úložišti platí po dobu aktuálního načtení stránky.

Celý první download nejvýše 500 kB komprimovaně bez SDK, zobrazení prvního ovladatelného stavu do 2 s při 5 Mb/s, RTT 100 ms a 4× CPU zpomalení Chrome. Animace cílí na 60 snímků za sekundu. Při měření 10 po sobě spuštěných tahů v Chrome se 4× zpomalením musí mít alespoň 95 % snímků animace interval do 17 ms; žádný dlouhý úkol přes 50 ms při tahu. Tabulka dosažitelnosti se načte před aktivací desky.

## 15. Akceptační kritéria

1. Unit testy pokrývají všechny logické okrajové případy v §3, výhru, počítání tahu, Undo, Restart, hodnocení a detekci nedosažitelného cíle.
2. Všech 40 finálních desek projde řešičem a splní limity fáze. Prvních 12 odpovídá záznamu v prototypu. Generátor použije stejný seed dvakrát a vrátí stejný proud kandidátů.
3. Playwright dokončí úroveň 1 na desktopu a ve viewportech 320 × 480 a 568 × 320. Samostatně ověří klávesnicí její dokončení, čitelné zaměření, 44px cíle, žádný posuv celé herní plochy, potlačení druhého vstupu během animace a ukončení dotyku mimo ovladač bez aktivace.
4. Playwright v úrovni 3 ověří tah dvou krabic, doručení a zablokovanou trasu po `E3B → N2` a její návrat přes Undo. Dokončení a hvězdy zůstanou po obnovení stránky, poslední rozpracovaná deska obnoví pozice i Undo.
5. Testovací adaptér ověří průběžnou reklamu jen po Next, deaktivaci reklamních žádostí v Basic Launch, návrat do pauzy po reklamě při skryté kartě, párování lifecycle událostí, zablokování vstupů, ztlumení během přehrávání, chybu a návrat, přesně jednu odměnu při dokončení a žádnou při chybě či zrušení. Bez SDK jsou všechny desky dostupné dosažením výhry a bezplatná nápověda funguje.
6. Pokryté stavy ze §10 zahrnují první spuštění, dokončení poslední úrovně, ztrátu viditelnosti během hry a verzi s úložištěm blokovaným prohlížečem. Hra projde rozpočtem stažení, startu a animace z §14.
7. Playwright v čistých relacích ověří češtinu pro `cs-CZ`, angličtinu pro `en-GB`, první podporovanou volbu v pořadí preferencí a angličtinu pro seznam obsahující pouze nepodporované jazyky. Ověří text první obrazovky a atribut `lang`.
8. Playwright otevře nastavení z menu i z pauzy, přepne mezi angličtinou a češtinou a ověří okamžitou změnu textů a atributu `lang`. Z pauzy se vrátí na stejnou desku se stejnými pozicemi krabic, počtem tahů a historií Undo. Po obnovení stránky má uložená volba přednost před jazykem prohlížeče. Při blokovaném úložišti přepnutí funguje do obnovení stránky.
9. Oba slovníky mají shodné klíče a vyplněné překlady. V obou jazycích se ověří texty a přístupné názvy ve stavech z §10, včetně hlášení o zablokované trase, nedostupném videu a nedostupném uložení. Texty se vejdou do rozvržení při minimálních rozměrech z §9.

10. Playwright ověří ve výhře, závěrečném souhrnu, výběru, nastavení a pauze přístupný křížek nejméně 44 × 44 CSS px a akci Menu, v obou jazycích a při 320 × 480 i 568 × 320. Ověří shodu křížku, Escape a klepnutí mimo dialog, dostupnost křížku po posuvu dlouhého výběru, zachování tahu a Undo po Menu a Pokračovat i s blokovaným úložištěm a návrat z výhry či souhrnu bez reklamního požadavku. Na úvodní obrazovce ověří počet dokončených úrovní a hvězd na začátku, po první výhře a po dokončení kampaně.
11. Playwright ověří úvodní obrazovku v obou jazycích při 320 × 480 i 568 × 320: logo, scénu a pokrok celé v obraze, skrytou desku, pořadí a velikost akcí `Play`, `Levels`, `Settings` s cíli nejméně 44 × 44 CSS px a žádný posuv. S uloženým postupem ověří `Continue` a součty, dále návrat fokusu z nastavení a výběru, změnu jazyka nad úvodní obrazovkou a návrat z pauzy přes `Menu`. Ověří nekonečnou smyčku scény a její vypnutí při omezeném pohybu.
12. Limit tahů odpovídá tabulce rezerv z §3 (unit test na hranicích 5/6, 20/21, 30/31 a 40). Playwright ověří odpočet zbývajících tahů, okno `Došly tahy` po vyčerpání, Undo s návratem tahu, Restart s plným limitem, přednost výhry i zablokované trasy, obnovení okna po obnovení stránky, přidání 5 tahů po dokončené odměně se zachováním po Undo a obnovení, a při zrušení či chybě jedinou žádost v pokusu s textem `Video unavailable`. Bez SDK se nabídka nezobrazí.

## 16. Mimo rozsah první verze

Backend, účty, žebříčky, platby, denní úlohy, editor, barevné skiny, fyzika, multiplayer, reklama během tahu a bannery uvnitř plochy.

## 17. Rizika a otevřené body

- **K potvrzení Petrem před zveřejněním:** finální název a pořadí cílových portálů podle podmínek přijetí. Pro návrh používáme pracovní název Parcel Pull.
- Magnetické tahy v pruhu mají blízké předchůdce. V testu ověřit, že hráči samostatně popíšou, že uvolněním jednoho doku připravují cestu další krabici.
- Obtížnost má růst díky přesměrování a uvolňování cesty. Delší nejkratší řešení samo o sobě obtížnost nezaručuje.
- Ověřeno na 12 deskách počítáním tahů, 40 desek je rozsah první verze. Skutečná délka sezení, použitelnost a zájem o nápovědu jsou hypotézy.

## 18. Test s lidmi (dělá Petr)

Po vzniku hratelného prototypu dát prvních 12 desek 20 příležitostným hráčům, z toho alespoň 10 na telefonu. Zadání zní pouze `Try this game`. Sledovat dokončení úrovní 1 a 5, zda po prvním vítězství sami stisknou Next, dobu aktivního hraní a zda ji dobrovolně pošlou dál. Měření má pro každého limit 10 minut. Při úrovni 3 zaznamenat, kolik hráčů bez vysvětlení předvídá hromadný krok a účinek uvolnění pruhu. Spočítat také dokončení úrovně 10, medián doby hraní a spontánní sdílení. Jde o malé měření pro volbu směru, ne o odhad retence na portálech.

- Pokračovat k 40 deskám, když alespoň 16 z 20 dokončí úroveň 1 do 45 s, alespoň 12 z 20 samo otevře úroveň 2 a alespoň 8 z 20 dokončí úroveň 5.
- Upravit názornost pruhů, doků a výuky, pokud některá hranice nevyjde, a znovu ověřit s čerstvou skupinou.
- Odložit rozšiřování na 40 desek, pokud po úpravě stále pokračuje méně než 8 z 20 hráčů po první výhře nebo úroveň 5 dokončí méně než 5 z 20.
