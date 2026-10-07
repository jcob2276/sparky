import { describe,expect,it } from 'vitest';
import { parseAnnualReport } from './gpwAnnualReportService';

describe('primary GPW annual facts',()=>{
  const raw={isin:'PLXTRDM00011',period_start:'2025-01-01',period_end:'2025-12-31',
    publication_date:'2026-03-20',currency:'PLN',source_url:'https://ir.xtb.com/report.zip',
    metrics:{revenue:{value:'2146056000'},net_profit:{value:'644199000'},
      operating_cash_flow:{value:'614344000'},ppe_purchases:{value:'21876000'},intangible_purchases:{value:'15000'}}};
  it('preserves the annual period, publication date and monetary scale',()=>{
    expect(parseAnnualReport(raw)).toMatchObject({periodEnd:'2025-12-31',publicationDate:'2026-03-20',
      currency:'PLN',revenue:2146056000,netProfit:644199000,freeCashFlow:592453000});
  });
  it('does not calculate FCF when capex is missing',()=>{
    expect(parseAnnualReport({...raw,metrics:{...raw.metrics,intangible_purchases:null}})?.freeCashFlow).toBeNull();
  });
  it('preserves standalone scope instead of calling it a group result',()=>{
    expect(parseAnnualReport({...raw,reporting_scope:'standalone'})?.reportingScope).toBe('standalone');
    expect(parseAnnualReport({...raw,reporting_scope:'invented'})).toBeNull();
  });
  it('rejects unsafe links and malformed period metadata',()=>{
    expect(parseAnnualReport({...raw,source_url:'javascript:alert(1)'})).toBeNull();
    expect(parseAnnualReport({...raw,publication_date:'2024-01-01'})).toBeNull();
    expect(parseAnnualReport({...raw,period_end:'2025-99-99'})).toBeNull();
  });
});
