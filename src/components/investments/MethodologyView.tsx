import { FC } from 'react';

export const MethodologyView: FC = () => {
  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fade-in text-text-primary">
      {/* Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-surface border border-border-custom shadow-xs">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-3">
          <span>📖</span> Metodologia obliczeń i źródła
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
          Skąd biorą się dane i jak je liczymy
        </h1>
        <p className="text-xs sm:text-sm text-text-secondary mt-2 leading-relaxed">
          Transparentność metodologiczna: zrozumienie założeń, opóźnień sprawozdawczych oraz ograniczeń prawnych raportowania SEC 13F oraz STOCK Act.
        </p>
      </div>

      {/* Grid of Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Źródło danych */}
        <div className="p-6 rounded-3xl bg-surface border border-border-custom shadow-xs space-y-2">
          <div className="text-xs font-mono font-bold text-primary flex items-center gap-1.5 uppercase">
            <span>🏛</span> Źródło danych
          </div>
          <h3 className="text-base font-bold text-text-primary">Formularze SEC 13F-HR & EDGAR</h3>
          <p className="text-xs text-text-secondary leading-relaxed">
            Wszystkie portfele rekonstruujemy na podstawie publicznie dostępnych formularzy SEC 13F-HR składanych w systemie EDGAR przez instytucjonalnych zarządzających aktywami powyżej 100 mln USD AUM. Pobieramy oryginalne pliki XML i mapujemy CUSIP-y na tickery oraz nazwy spółek.
          </p>
        </div>

        {/* Opóźnienie ujawnień */}
        <div className="p-6 rounded-3xl bg-surface border border-border-custom shadow-xs space-y-2">
          <div className="text-xs font-mono font-bold text-warning flex items-center gap-1.5 uppercase">
            <span>⏱</span> Opóźnienie ujawnień (45 dni)
          </div>
          <h3 className="text-base font-bold text-text-primary">Zrozumienie lagowania danych</h3>
          <p className="text-xs text-text-secondary leading-relaxed">
            Raport 13F musi zostać złożony do 45 dni po końcu kwartału. Oznacza to, że publikowane przez nas dane zawsze są opóźnione względem aktualnych pozycji zarządzającego. Stan na dzień ujawnienia może istotnie różnić się od stanu w dniu publikacji raportu.
          </p>
        </div>

        {/* Co liczymy */}
        <div className="p-6 rounded-3xl bg-surface border border-border-custom shadow-xs space-y-2 md:col-span-2">
          <div className="text-xs font-mono font-bold text-success flex items-center gap-1.5 uppercase">
            <span>🧮</span> Co liczymy
          </div>
          <h3 className="text-base font-bold text-text-primary">Metryki portfela i wskaźniki QoQ</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs text-text-secondary">
            <div className="p-3 rounded-2xl bg-surface border border-border-custom/60">
              <strong className="text-text-primary block font-semibold mb-1">Wartość ujawnionego koszyka:</strong>
              Suma rynkowych wartości pozycji raportowanych w 13F na koniec danego kwartału.
            </div>
            <div className="p-3 rounded-2xl bg-surface border border-border-custom/60">
              <strong className="text-text-primary block font-semibold mb-1">Wagi pozycji (% koszyka):</strong>
              Udział wartości danej pozycji w całkowitej wartości ujawnionego koszyka akcji USA.
            </div>
            <div className="p-3 rounded-2xl bg-surface border border-border-custom/60">
              <strong className="text-text-primary block font-semibold mb-1">Zmiany kwartalne QoQ:</strong>
              Porównanie liczby akcji z poprzednim ujawnieniem: nowa pozycja, zwiększona, zmniejszona lub zlikwidowana.
            </div>
            <div className="p-3 rounded-2xl bg-surface border border-border-custom/60">
              <strong className="text-text-primary block font-semibold mb-1">Zwrot koszyka od ujawnienia:</strong>
              Indeks (baza = 100) liczony tak, jakby pozycje były utrzymane w proporcjach z dnia ujawnienia, bez rebalansowania.
            </div>
          </div>
        </div>

        {/* Ograniczenia 13F */}
        <div className="p-6 rounded-3xl bg-surface border border-border-custom shadow-xs space-y-2">
          <div className="text-xs font-mono font-bold text-danger flex items-center gap-1.5 uppercase">
            <span>⚠️</span> Ograniczenia 13F
          </div>
          <h3 className="text-base font-bold text-text-primary">Czego formularz 13F nie pokazuje</h3>
          <ul className="text-xs text-text-secondary space-y-1.5 list-disc list-inside leading-relaxed">
            <li>Obejmuje wyłącznie długie pozycje w akcjach USA oraz wybrane opcje.</li>
            <li>Krótkie pozycje (szorty), gotówka, obligacje i instrumenty zagraniczne nie są raportowane.</li>
            <li>Niektóre pozycje mogą być objęte poufnym opóźnieniem ujawnienia („confidential treatment”).</li>
            <li>Pokazuje migawkę na koniec kwartału, a nie obrót w trakcie jego trwania.</li>
          </ul>
        </div>

        {/* Politycy USA / STOCK Act */}
        <div className="p-6 rounded-3xl bg-surface border border-border-custom shadow-xs space-y-2">
          <div className="text-xs font-mono font-bold text-info flex items-center gap-1.5 uppercase">
            <span>🏛</span> Politycy USA / STOCK Act
          </div>
          <h3 className="text-base font-bold text-text-primary">Zgłoszenia Senatu i Kongresu</h3>
          <ul className="text-xs text-text-secondary space-y-1.5 list-disc list-inside leading-relaxed">
            <li>Prezentujemy fakt zgłoszenia zakupu lub sprzedaży oraz widełki kwoty podane w ujawnieniu.</li>
            <li>Mówimy o „zgłoszonym zakupie/sprzedaży”, a nie o rekomendacji.</li>
            <li>Brak dokładnego dnia wykonania: znany jest przedział dat oraz data ujawnienia (do 30–45 dni opóźnienia).</li>
            <li>Wartości transakcji to zakresy (np. $1,001–$15,000, $500k–$1M), nie kwoty dokładne.</li>
          </ul>
        </div>

        {/* Ceny i wyniki EOD */}
        <div className="p-6 rounded-3xl bg-surface border border-border-custom shadow-xs space-y-2 md:col-span-2">
          <div className="text-xs font-mono font-bold text-text-secondary flex items-center gap-1.5 uppercase">
            <span>📈</span> Ceny i wyniki (Alpha vs SPY/QQQ)
          </div>
          <h3 className="text-base font-bold text-text-primary">Kalkulacja zwrotów i benchmarków</h3>
          <p className="text-xs text-text-secondary leading-relaxed">
            Dzienne ceny EOD (open/high/low/close, dywidendy, splity) pobieramy od dostawców danych rynkowych. Historyczny zwrot po ujawnieniu: zmiana ceny od dnia zgłoszonej transakcji po +30 / +90 / +180 / +365 dniach (sprzedaż ze znakiem ujemnym). Alpha względem SPY / QQQ to zwrot transakcji minus zwrot benchmarku w tym samym oknie. To model analityczny, a nie zrealizowany wynik inwestora ani rekonstrukcja pełnego portfela.
          </p>
        </div>

        {/* Czego nie robimy */}
        <div className="p-6 rounded-3xl bg-surface border border-border-custom shadow-xs space-y-2">
          <div className="text-xs font-mono font-bold text-danger flex items-center gap-1.5 uppercase">
            <span>🚫</span> Czego nie robimy
          </div>
          <ul className="text-xs text-text-secondary space-y-1.5 list-disc list-inside leading-relaxed">
            <li>Nie integrujemy się z brokerami, custodianami ani rachunkami inwestycyjnymi.</li>
            <li>Nie pośredniczymy w transakcjach i nie umożliwiamy zlecania transakcji.</li>
            <li>Nie wydajemy rekomendacji ani nie prowadzimy modeli kopiowania.</li>
            <li>Nie świadczymy doradztwa inwestycyjnego ani podatkowego.</li>
          </ul>
        </div>

        {/* Zastrzeżenie prawne */}
        <div className="p-6 rounded-3xl bg-surface border border-border-custom shadow-xs space-y-2">
          <div className="text-xs font-mono font-bold text-text-secondary flex items-center gap-1.5 uppercase">
            <span>⚖️</span> Zastrzeżenie prawne
          </div>
          <p className="text-xs text-text-secondary leading-relaxed">
            Serwis ma charakter wyłącznie informacyjno-edukacyjny. Prezentowane dane pochodzą z publicznych źródeł (formularze 13F SEC, ujawnienia STOCK Act, KNF). Wyniki historyczne nie stanowią gwarancji przyszłych wyników. Każda decyzja inwestycyjna jest wyłączną decyzją użytkownika.
          </p>
        </div>
      </div>
    </div>
  );
};
