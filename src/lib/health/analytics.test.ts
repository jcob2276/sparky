import {describe,it,expect} from 'vitest';
import {chartDailySeries} from '@vanguard/domain';
describe('health charts',()=>{
  it('keeps missing days as gaps, real zeroes and only explicitly complete nutrition days',()=>{
    const result=chartDailySeries({table:'daily_nutrition',from:'2026-10-12',to:'2026-10-14',truncated:false,rows:[
      {date:'2026-10-12',calories:0},{date:'2026-10-13',calories:2100},
    ]},'calories','sum',new Set(['2026-10-12']));
    expect(result).toEqual([{date:'2026-10-12',value:0,n:1},{date:'2026-10-13',value:null,n:0},{date:'2026-10-14',value:null,n:0}]);
  });
  it('groups activities by Warsaw date and labels the chosen daily aggregation',()=>{
    const rows={table:'strava_activities_clean',from:'2026-10-14',to:'2026-10-14',truncated:false,rows:[
      {start_date:'2026-10-13T22:30:00Z',distance:5000},{start_date:'2026-10-14T06:00:00Z',distance:3000},
      {start_date:'2026-10-14T07:00:00Z',distance:null},
    ]};
    expect(chartDailySeries(rows,'distance','sum')).toEqual([{date:'2026-10-14',value:8000,n:2}]);
    expect(chartDailySeries(rows,'distance','mean')[0].value).toBe(4000);
  });
});
