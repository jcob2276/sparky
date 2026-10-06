import { orcaSelect } from './superinvestorsApi';

export type ListingStatus = 'unknown' | 'active' | 'delisted' | 'halted';
export interface CompanyListing {
  listingStatus?: ListingStatus;
  listingStatusDate?: string;
  listingSourceUrl?: string;
}

export function isListingInactive(status?: ListingStatus): boolean {
  return status === 'delisted' || status === 'halted';
}

export async function fetchCompanyListing(ticker: string): Promise<CompanyListing> {
  const rows = await orcaSelect<{
    listing_status: ListingStatus; listing_status_date?: string; listing_source_url?: string;
  }>(`companies?market=eq.us&ticker=eq.${encodeURIComponent(ticker)}&select=listing_status,listing_status_date,listing_source_url&limit=1`, { strict: true });
  return {
    listingStatus: rows[0]?.listing_status ?? 'unknown',
    listingStatusDate: rows[0]?.listing_status_date,
    listingSourceUrl: rows[0]?.listing_source_url,
  };
}
