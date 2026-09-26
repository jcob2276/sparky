/**
 * portfolioForecastData.ts — Baza wiedzy konsensusu analityków Wall Street i GPW.
 */

export interface TickerAnalystData {
  base12mUpside: number;
  bull12mUpside: number;
  bear12mUpside: number;
  rating: 'Strong Buy' | 'Buy' | 'Hold' | 'Speculative Buy';
  numAnalysts: number;
  source: string;
  keyCatalyst: string;
  whatMustHappen: {
    bull: string[];
    base: string[];
    bear: string[];
  };
}

export const TICKER_ANALYST_DATABASE: Record<string, TickerAnalystData> = {
  JEDI: {
    base12mUpside: 38.0,
    bull12mUpside: 85.0,
    bear12mUpside: -22.0,
    rating: 'Speculative Buy',
    numAnalysts: 14,
    source: 'Morgan Stanley Space Index / FactSet',
    keyCatalyst: 'Komercjalizacja sieci Direct-to-Device (AST SpaceMobile) i loty Starship v3',
    whatMustHappen: {
      bull: [
        'Udany test transferu paliwa i powrotu Starshipa na orbitę, otwierający drogę do tanich wyniesień komercyjnych.',
        'AST SpaceMobile ($ASTS) i Lynk uruchamiają komercyjną łączność 5G bezpośrednio z telefonów w sieciach AT&T i Verizon.',
        'Wzrost zamówień US Space Force o >20% r/r dla Rocket Lab ($RKLB) i Planet Labs w programie Proliferated Warfighter.',
      ],
      base: [
        'Stabilny harmonogram startów Falcon 9 oraz postępy przy rakiecie Neutron (Rocket Lab) z premierą w 2026/2027.',
        'Wzrost przychodów spółek satelitarnych w tempie 18-25% r/r przy zachowaniu płynności finansowej.',
      ],
      bear: [
        'Opóźnienia misji NASA Artemis i cięcia w budżecie cywilnych programów kosmicznych.',
        'Emisje nowych akcji (rozwadnianie kapitału) przez nierentowne spółki New Space.',
      ],
    },
  },
  MRVL: {
    base12mUpside: 34.5,
    bull12mUpside: 62.0,
    bear12mUpside: -14.0,
    rating: 'Strong Buy',
    numAnalysts: 31,
    source: 'Wall Street Consensus (Morgan Stanley, Goldman Sachs)',
    keyCatalyst: 'Układy optyczne electro-optics PAM4 800G/1.6T oraz custom ASIC dla hiperskalerów AI',
    whatMustHappen: {
      bull: [
        'Eksplozja zamówień na chipy custom ASIC (Amazon Trainium2/3, Google Axion, Microsoft Maia) produkowane przez Marvell.',
        'Dominacja układów optycznych interconnect DSP 1.6T przy platformach Nvidia Blackwell Ultra i Rubin.',
        'Marża brutto spółki przekracza 66%, a dynamika zysku netto EPS rośnie o >45% r/r.',
      ],
      base: [
        'Ciągły popyt na modernizację centrów danych AI generujący stabilne +25% r/r wzrostu przychodów z data center.',
        'Umiarkowane ożywienie w tradycyjnych segmentach telekomunikacji (5G/Carrier).',
      ],
      bear: [
        'Spowolnienie capexu Big Tech na infrastrukturę AI i przesuwanie zamówień na kolejne kwartały.',
        'Agresywna konkurencja cenowa ze strony Broadcomu ($AVGO).',
      ],
    },
  },
  CDR: {
    base12mUpside: 28.0,
    bull12mUpside: 72.0,
    bear12mUpside: -18.0,
    rating: 'Buy',
    numAnalysts: 12,
    source: 'Domy Maklerskie GPW (BM mBank, Trigon, Noble)',
    keyCatalyst: 'Kampania marketingowa i zwiastun Polaris (Wiedźmin 4) na silniku UE5',
    whatMustHappen: {
      bull: [
        'Pierwszy oficjalny gameplay Polaris (Wiedźmin 4) na The Game Awards, budujący rekordową wishliście na Steam/konsolach.',
        'Zapowiedź okna premierowego na przełom 2026/2027 bez ryzyka tzw. crunchu produkcyjnego.',
        'Projekt Cyberpunk Orion (Wroc/Boston) wchodzi w pełną fazę produkcyjną, potwierdzając nowe projekty multimedialne.',
      ],
      base: [
        'Utrzymanie regularnej sprzedaży Cyberpunk 2077 + Phantom Liberty oraz dobre przyjęcie kolejnych aktualizacji.',
        'Przejście Polaris do etapu pełnej produkcji zgodnie z harmonogramem zarządu.',
      ],
      bear: [
        'Przesunięcie premiery Polaris na 2028 rok z powodu optymalizacji silnika Unreal Engine 5.',
        'Wypalenie sprzedaży back-katalogu Wiedźmina 3 i Cyberpunka przed nadejściem nowych premier.',
      ],
    },
  },
  SXR8: {
    base12mUpside: 12.5,
    bull12mUpside: 22.0,
    bear12mUpside: -8.0,
    rating: 'Buy',
    numAnalysts: 25,
    source: 'FactSet S&P 500 Consensus / Goldman Sachs Research',
    keyCatalyst: 'Cykl obniżek stóp procentowych Fed i wzrost zysków spółek S&P 500 (EPS > 275 USD)',
    whatMustHappen: {
      bull: [
        'Miękkie lądowanie gospodarki USA z inflacją stabilizującą się w rejonie 2.2% i serią 4 obniżek stóp przez Fed.',
        'Wzrost marż korporacyjnych dzięki wdrożeniom AI w sektorach finansowym, technologicznym i przemysłowym.',
      ],
      base: [
        'Wzrost PKB USA ~2.0%, zyski spółek z indeksu rosną w tempie 9-11% r/r.',
      ],
      bear: [
        'Powrót presji inflacyjnej i utrzymanie restrykcyjnych stóp procentowych przez Rezerwę Federalną.',
        'Wzrost napięć geopolitycznych lub wojen celnych osłabiający globalny handel.',
      ],
    },
  },
  NVDA: {
    base12mUpside: 30.0,
    bull12mUpside: 55.0,
    bear12mUpside: -15.0,
    rating: 'Strong Buy',
    numAnalysts: 42,
    source: 'Wall Street Consensus',
    keyCatalyst: 'Masowe dostawy platformy Blackwell B200 i premiera architektury Rubin',
    whatMustHappen: {
      bull: ['Popyt na Blackwell przekracza podaż o >100%, marże brutto >75%.'],
      base: ['Wzrost przychodów z data center o 35% r/r przy pełnym wykorzystaniu mocy produkcyjnych TSMC.'],
      bear: ['Restrykcje eksportowe do Azji i opóźnienia w zasilaniu centrów danych gigawatowych.'],
    },
  },
  NBIS: {
    base12mUpside: 45.0,
    bull12mUpside: 95.0,
    bear12mUpside: -28.0,
    rating: 'Speculative Buy',
    numAnalysts: 8,
    source: 'Tech Infrastructure Analysts',
    keyCatalyst: 'Ekspansja europejskich i amerykańskich klastrów GPU Neocloud',
    whatMustHappen: {
      bull: ['Duże wieloletnie kontrakty chmurowe z europejskimi laboratoriami AI i startupami LLM.'],
      base: ['Uruchomienie kolejnych klastrów H100/B200 zgodnie z budżetem.'],
      bear: ['Spadek stawek za wynajem GPU za godzinę (spadek cen compute).'],
    },
  },
  BE: {
    base12mUpside: 35.0,
    bull12mUpside: 80.0,
    bear12mUpside: -20.0,
    rating: 'Buy',
    numAnalysts: 16,
    source: 'Energy Transition Consensus',
    keyCatalyst: 'Zasilanie centrów danych AI ogniwami paliwowymi off-grid (Solid Oxide)',
    whatMustHappen: {
      bull: ['Podpisanie wielomegawatowych umów z hiperskalerami na zasilanie bez czekania na przyłącze do sieci energetycznej.'],
      base: ['Stabilny wzrost instalacji przemysłowych o 20% r/r.'],
      bear: ['Opóźnienia w dotacjach publicznych i spadek cen gazu ziemnego.'],
    },
  },
};
