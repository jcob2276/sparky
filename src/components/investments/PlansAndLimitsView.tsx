import { FC, useState } from 'react';
import Button from '../ui/Button';

interface PlanDef {
  id: string;
  name: string;
  priceMonthly: string;
  priceAnnual: string;
  badge?: string;
  isCurrent?: boolean;
  features: string[];
}

const PLANS: PlanDef[] = [
  {
    id: 'free',
    name: 'DARMOWY',
    priceMonthly: '0 zł',
    priceAnnual: '0 zł',
    badge: 'TWÓJ PLAN BAZOWY',
    isCurrent: true,
    features: [
      'Dostęp do wszystkich profili inwestorów',
      'Ostatni ujawniony koszyk 13F',
      'Top 10 pozycji z wagami',
      'Zmiany QoQ (nowa / zwiększona / zmniejszona / zniknęła)',
      'Podstawowy przegląd spółek i konsensusu',
      'Rejestr krótkiej sprzedaży GPW (KNF)',
      'Podgląd insiderów i top 6 rankingu polityków',
      'Analityk AI: 6 pytań miesięcznie',
    ],
  },
  {
    id: 'pro',
    name: 'PRO',
    priceMonthly: '39,99 zł',
    priceAnnual: '31,99 zł',
    features: [
      'Wszystko z planu Darmowego',
      'Pełna historia raportów 13F (do 5 lat)',
      'Pełne tabele pozycji, nie tylko top 10',
      'Eksport danych do CSV',
      'Watchlista + obserwowani politycy (synchronizacja)',
      'Dzienny digest e-mail o spółkach i politykach',
      'Rankingi i pełne profile polityków Kongresu',
      'Zbieżność ujawnień: fundusze i politycy',
      'Pełne dane insiderów: USA (Form 4) i GPW (MAR 19)',
      'Analityk AI: 45 pytań i 5 raportów miesięcznie',
    ],
  },
  {
    id: 'analyst',
    name: 'ANALITYK',
    priceMonthly: '89 zł',
    priceAnnual: '71 zł',
    badge: 'NAJWYŻSZY PAKIET',
    features: [
      'Wszystko z planu Pro',
      'Analityk AI: 120 pytań i 20 raportów miesięcznie',
      'API read-only (JSON) z kluczem',
      'Alerty natychmiastowe: nowe ujawnienie na spółkach',
      'Rozszerzony eksport: pełne zbiory CSV',
      'Wcześniejszy dostęp do nowych modułów',
      'Priorytetowe wsparcie techniczne',
    ],
  },
];

const COMPARISON_ROWS = [
  { name: 'Dostęp do wszystkich profili inwestorów', free: true, pro: true, analyst: true },
  { name: 'Ostatni ujawniony koszyk 13F', free: true, pro: true, analyst: true },
  { name: 'Top 10 pozycji z wagami', free: true, pro: true, analyst: true },
  { name: 'Zmiany QoQ (nowa / zwiększona / zmniejszona / zniknęła)', free: true, pro: true, analyst: true },
  { name: 'Podstawowy przegląd spółek i konsensusu', free: true, pro: true, analyst: true },
  { name: 'Rejestr krótkiej sprzedaży GPW (KNF)', free: true, pro: true, analyst: true },
  { name: 'Podgląd insiderów i top 6 polityków', free: true, pro: true, analyst: true },
  { name: 'Pełna historia raportów 13F (do 5 lat)', free: false, pro: true, analyst: true },
  { name: 'Pełne tabele pozycji (nie tylko top 10)', free: false, pro: true, analyst: true },
  { name: 'Eksport danych do CSV', free: false, pro: true, analyst: true },
  { name: 'Watchlista + obserwowani politycy', free: false, pro: true, analyst: true },
  { name: 'Zbieżność ujawnień: fundusze i politycy', free: false, pro: true, analyst: true },
  { name: 'Pełne dane insiderów: USA (Form 4) & GPW (MAR)', free: false, pro: true, analyst: true },
  { name: 'API read-only (JSON) z kluczem', free: false, pro: false, analyst: true },
  { name: 'Alerty natychmiastowe na Twoich spółkach', free: false, pro: false, analyst: true },
];

const PlanCard: FC<{ plan: PlanDef; billingCycle: 'monthly' | 'annual' }> = ({ plan, billingCycle }) => {
  const price = billingCycle === 'monthly' ? plan.priceMonthly : plan.priceAnnual;
  const isAnalyst = plan.id === 'analyst';

  return (
    <div
      className={`p-6 rounded-3xl bg-surface border flex flex-col justify-between shadow-xs transition-all ${
        isAnalyst ? 'border-primary/50 ring-1 ring-primary/30' : 'border-border-custom'
      }`}
    >
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-extrabold text-lg text-text-primary tracking-tight">{plan.name}</h3>
          {plan.badge && (
            <span className="px-2 py-0.5 rounded-md text-3xs font-mono font-bold bg-primary/10 text-primary border border-primary/20">
              {plan.badge}
            </span>
          )}
        </div>

        <div className="my-4">
          <div className="text-3xl font-black font-mono text-text-primary tabular-nums">
            {price}
            <span className="text-xs font-normal text-text-secondary"> / miesiąc</span>
          </div>
          <div className="text-3xs text-text-secondary mt-1">płatność co miesiąc, anulujesz kiedy chcesz</div>
        </div>

        <ul className="space-y-2.5 pt-4 border-t border-border-custom/40 text-xs text-text-secondary">
          {plan.features.map((f, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="text-success font-bold shrink-0">✓</span>
              <span>{f}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="pt-6 mt-6 border-t border-border-custom/40">
        <Button size="md" variant={isAnalyst ? 'primary' : 'secondary'} className="w-full rounded-2xl text-xs font-bold">
          {plan.isCurrent ? 'Twój obecny plan' : `Wybierz ${plan.name}`}
        </Button>
        <div className="text-3xs text-center text-text-muted mt-2 font-mono">anulujesz w każdej chwili</div>
      </div>
    </div>
  );
};

const ComparisonTable: FC = () => (
  <div className="bg-surface border border-border-custom rounded-3xl overflow-hidden shadow-xs">
    <div className="p-5 border-b border-border-custom/50">
      <h3 className="text-base font-bold text-text-primary">Porównanie funkcji (OrcaFolio Matrix)</h3>
      <p className="text-xs text-text-secondary">Zestawienie limitów w planie darmowym vs Pro vs Analityk</p>
    </div>

    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead className="bg-surface border-b border-border-custom/50 text-2xs uppercase text-text-secondary font-semibold">
          <tr>
            <th className="py-3 px-4">Funkcja</th>
            <th className="py-3 px-4 text-center">DARMOWY</th>
            <th className="py-3 px-4 text-center">PRO</th>
            <th className="py-3 px-4 text-center text-primary font-bold">ANALITYK</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-custom/40">
          {COMPARISON_ROWS.map((row, i) => (
            <tr key={i} className="hover:bg-surface transition-colors">
              <td className="py-3 px-4 text-text-primary font-medium">{row.name}</td>
              <td className="py-3 px-4 text-center font-mono">
                {row.free ? <span className="text-success font-bold">✓</span> : <span className="text-text-muted">—</span>}
              </td>
              <td className="py-3 px-4 text-center font-mono">
                {row.pro ? <span className="text-success font-bold">✓</span> : <span className="text-text-muted">—</span>}
              </td>
              <td className="py-3 px-4 text-center font-mono">
                {row.analyst ? <span className="text-success font-bold">✓</span> : <span className="text-text-muted">—</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

export const PlansAndLimitsView: FC = () => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');

  return (
    <div className="space-y-8 animate-fade-in text-text-primary max-w-6xl mx-auto">
      {/* Header */}
      <div className="p-6 sm:p-8 rounded-3xl bg-surface border border-border-custom shadow-xs text-center space-y-3">
        <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
          Cennik & Subskrypcje
        </span>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Plan i limity</h1>
        <p className="text-xs sm:text-sm text-text-secondary max-w-2xl mx-auto">
          Korzystasz z planu Darmowy w OrcaFolio. Zmiana planu nie wymaga ponownej rejestracji.
        </p>

        {/* Sparky OS Free Perk Callout */}
        <div className="mt-4 p-4 rounded-2xl bg-success/10 border border-success/20 text-left max-w-3xl mx-auto flex items-start gap-3">
          <span className="text-2xl shrink-0">🎁</span>
          <div>
            <div className="text-xs font-bold text-success">
              W Sparky OS: Masz wszystko odblokowane bez opłat!
            </div>
            <p className="text-xs text-text-secondary mt-0.5 leading-relaxed">
              W OrcaFolio pakiet Analityk kosztuje <strong className="text-text-primary">89 zł/miesięcznie</strong>. W Twoim Sparky OS pełne dane (13F, szorty GPW KNF, politycy STOCK Act, insiderzy MAR oraz zbieżności) są w <strong className="text-success">100% bezpłatne</strong>.
            </p>
          </div>
        </div>

        {/* Billing Switcher */}
        <div className="inline-flex items-center gap-1 p-1 rounded-2xl bg-surface border border-border-custom/60 mt-2 shadow-xs">
          <Button
            size="sm"
            variant={billingCycle === 'monthly' ? 'primary' : 'secondary'}
            onClick={() => setBillingCycle('monthly')}
            className="rounded-xl text-xs font-semibold"
          >
            MIESIĘCZNIE
          </Button>
          <Button
            size="sm"
            variant={billingCycle === 'annual' ? 'primary' : 'secondary'}
            onClick={() => setBillingCycle('annual')}
            className="rounded-xl text-xs font-semibold"
          >
            ROCZNIE (-20%)
          </Button>
        </div>
      </div>

      {/* 3 Price Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PLANS.map((plan) => (
          <PlanCard key={plan.id} plan={plan} billingCycle={billingCycle} />
        ))}
      </div>

      {/* Comparison Table */}
      <ComparisonTable />

      {/* Footer Notes & Legal */}
      <div className="p-6 rounded-3xl bg-surface border border-border-custom shadow-xs space-y-3 text-xs text-text-secondary">
        <div className="font-mono font-bold text-2xs uppercase tracking-wider text-text-muted">
          Płatności: Stripe · Faktura VAT · Dostęp aktywny do końca okresu po anulowaniu
        </div>
        <p className="leading-relaxed">
          Ceny obejmują VAT. Subskrypcję można anulować w dowolnym momencie, a dostęp trwa do końca opłaconego okresu. Płatności obsługuje Stripe.
        </p>
        <p className="text-2xs text-text-muted leading-relaxed pt-2 border-t border-border-custom/40">
          Zastrzeżenie informacyjne: Serwis ma charakter wyłącznie informacyjno-edukacyjny. Prezentowane dane pochodzą z publicznych źródeł (formularze 13F SEC, ujawnienia STOCK Act, KNF). Serwis nie świadczy usług doradztwa inwestycyjnego ani zarządzania portfelem.
        </p>
      </div>
    </div>
  );
};
