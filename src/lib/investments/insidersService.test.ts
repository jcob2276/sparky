import { describe, expect, it } from 'vitest';
import { buildInsidersPageData } from './insidersService';
describe('reported Form 4 analytics', () => {
 it('keeps missing prices unknown and never invents owners or analytics', () => {
  const data = buildInsidersPageData([{ id:'sec:a:n:0', filer_name:'Reported Person', ticker:'REAL', transaction_code:'F', filing_date:'2026-10-05', shares:5, price_usd:null, value_usd:null }], new Date('2026-10-06'));
  expect(data.feed[0].insiderName).toBe('Reported Person'); expect(data.feed[0].priceUsd).toBeNull(); expect(data.feed[0].typeBadgeLabel).toBe('F'); expect(data.stats.purchasesCount).toBe(0); expect(data.clusters).toEqual([]);
 });
 it('counts purchases from observed rows and requires distinct owners inside 14 days for clusters', () => {
  const rows = [
   {id:'1',filer_name:'A',filer_id:'1',ticker:'REAL',transaction_code:'P',transaction_date:'2026-10-01',filing_date:'2026-10-02',shares:10,price_usd:2,value_usd:20},
   {id:'2',filer_name:'B',filer_id:'2',ticker:'REAL',transaction_code:'P',transaction_date:'2026-10-03',filing_date:'2026-10-04',shares:10,price_usd:null,value_usd:null},
   {id:'3',filer_name:'A',filer_id:'1',ticker:'SOLO',transaction_code:'P',transaction_date:'2026-10-03',filing_date:'2026-10-04'},
  ];
  const data = buildInsidersPageData(rows,new Date('2026-10-06'));
  expect(data.stats.purchasesCount).toBe(3); expect(data.clusters).toHaveLength(1); expect(data.clusters[0].buyersCount).toBe(2); expect(data.clusters[0].totalValueFormatted).toContain('niepełna');
  expect(buildInsidersPageData([],new Date('2026-10-06')).stats.mostActiveTicker).toBe('—');
 });
});
