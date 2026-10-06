import { orcaSelect } from './superinvestorsApi';
import { getTodayWarsaw, shiftDateStr } from '../date';

export interface HouseDisclosureDocument {
  id: string; filer_name: string; filing_date: string; source_url: string;
  parse_status: 'pending' | 'parsed' | 'error'; transaction_count: number | null;
  parse_error?: string | null;
}

export async function fetchHouseDisclosureDocuments(options?: { searchQuery?: string; timeframe?: '90' | '365' | 'all' }) {
  const today = getTodayWarsaw();
  const since = options?.timeframe === '90' ? shiftDateStr(today, -90)
    : options?.timeframe === '365' ? shiftDateStr(today, -365) : null;
  const name = options?.searchQuery?.replace(/[%_,()*]/g, ' ').trim();
  const filters = `${since ? `&filing_date=gte.${since}` : ''}${name ? `&filer_name=ilike.*${encodeURIComponent(name)}*` : ''}`;
  return orcaSelect<HouseDisclosureDocument>(`house_disclosures?select=id,filer_name,filing_date,source_url,parse_status,transaction_count,parse_error&filing_date=lte.${today}${filters}&order=filing_date.desc,doc_id.desc`, { strict: true });
}
