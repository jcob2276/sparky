import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks=vi.hoisted(()=>({range:vi.fn(),single:vi.fn(),eq:vi.fn(),update:vi.fn()}));
vi.mock('../supabase',()=>({supabase:{from:()=>({
  select:()=>({eq:mocks.eq}),update:mocks.update,
})}}));
import { fetchCloserCalls, saveCloserCallNotes } from './closerCallsApi';
beforeEach(()=>{
  vi.clearAllMocks();
  const query={eq:mocks.eq,order:()=>query,range:mocks.range,select:()=>query,single:mocks.single};
  mocks.eq.mockReturnValue(query);
  mocks.update.mockReturnValue(query);
});
describe('call library access',()=>{
  it('loads all pages without a selected-day filter',async()=>{
    mocks.range.mockResolvedValueOnce({data:Array.from({length:100},(_,i)=>({id:String(i)})),error:null})
      .mockResolvedValueOnce({data:[{id:'last'}],error:null});
    expect(await fetchCloserCalls('owner')).toHaveLength(101);
    expect(mocks.eq).toHaveBeenCalledWith('user_id','owner');
    expect(mocks.eq).not.toHaveBeenCalledWith('call_date',expect.anything());
    expect(mocks.range).toHaveBeenNthCalledWith(2,100,199);
  });
  it('scopes a saved note to its owner and reports rejected writes',async()=>{
    mocks.single.mockResolvedValue({data:null,error:new Error('denied')});
    await expect(saveCloserCallNotes('owner','call','My note')).rejects.toThrow('denied');
    expect(mocks.eq).toHaveBeenCalledWith('id','call');
    expect(mocks.eq).toHaveBeenCalledWith('user_id','owner');
  });
});

