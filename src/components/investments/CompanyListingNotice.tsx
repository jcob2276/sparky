import { isListingInactive, type CompanyListing } from '../../lib/investments/companyListing';

export function CompanyListingNotice({ listingStatus, listingStatusDate, listingSourceUrl }: CompanyListing) {
  if (!isListingInactive(listingStatus)) return null;
  return <div className="text-3xs text-text-muted">
    {listingStatus === 'delisted' ? 'Wycofana z giełdy' : 'Obrót wstrzymany'} {listingStatusDate}
    {listingSourceUrl && <a href={listingSourceUrl} target="_blank" rel="noopener noreferrer"
      className="ml-1 text-primary underline" onClick={event => event.stopPropagation()}>Źródło</a>}
  </div>;
}
