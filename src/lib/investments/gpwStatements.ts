export interface GpwYear {
  year: string;
  revenue: number | null;
  netIncome: number | null;
}

function amount(cell: Element): number | null {
  const node = cell.querySelector('span.value span.pv span');
  const raw = node?.textContent?.replace(/\s/g, '').replace(',', '.') ?? '';
  if (!raw || raw === '-') return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

function series(table: Element, match: (label: string) => boolean): Array<number | null> {
  const row = [...table.querySelectorAll('tr')].find((candidate) => {
    const label = (candidate.querySelector('a')?.textContent ?? '').replace(/\s+/g, ' ').trim();
    return match(label);
  });
  if (!row) return [];
  return [...row.querySelectorAll('td')].slice(1).map(amount);
}

export async function fetchGpwYearly(ticker: string): Promise<GpwYear[]> {
  const safe = ticker.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  if (!safe) return [];
  const response = await fetch(`/biznesradar/raporty-finansowe-rachunek-zyskow-i-strat/${safe},Y`);
  if (!response.ok) return [];
  const doc = new DOMParser().parseFromString(await response.text(), 'text/html');
  const table = doc.querySelector('table.report-table');
  if (!table) return [];
  const years = [...table.querySelectorAll('th.thq')]
    .map((cell) => (cell.textContent ?? '').trim().slice(0, 4))
    .filter((year) => /^\d{4}$/.test(year));
  const revenue = series(
    table,
    (label) => label.startsWith('Przychody ze sprzedaży') || label === 'Przychody odsetkowe',
  );
  const netIncome = series(table, (label) => label === 'Zysk netto');
  return years.map((year, index) => ({
    year,
    revenue: revenue[index] ?? null,
    netIncome: netIncome[index] ?? null,
  }));
}
