// @vitest-environment-options {"settings":{"navigation":{"disableChildFrameNavigation":true,"disableFallbackToSetURL":true}}}
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import CloserCallReviewView from './CloserCallReviewView';
import type { CloserCallRow } from '../../../lib/closer/closerCallsApi';

const call: CloserCallRow = { user_id:'u1',call_date:'2026-10-25',fathom_recording_id:1,ended_at:null,has_external_invitees:true,summary_md:null,invitees:null,action_items:null,ai_outcome:'unclear',ai_analyzed_at:null,created_at:'2026-10-25T10:00:00Z',updated_at:'2026-10-25T10:00:00Z',id:'call-1',title:'Rozmowa z klientem',started_at:'2026-10-25T10:00:00Z',
  duration_seconds:3600,share_url:'https://fathom.video/share/test-token',ai_status:'done',ai_score:6,
  ai_mistakes:[{ timestamp:'00:03:10',what:'Pytanie bez pogłębienia',why:'Zapytaj, co konkretnie budzi wątpliwość.' }],
  ai_good_moves:[{ timestamp:'00:01:00',what:'Dopytanie o cel',why:'Pomogło poznać sytuację.' }],
  ai_next_step:'Ustal termin kontaktu.',review_notes:'',
  transcript:[{ timestamp:'00:03:05',speaker:{display_name:'Klient'},text:'Potrzebuję więcej czasu.' }]
};
beforeEach(() => localStorage.clear());
afterEach(cleanup);

describe('separate call review', () => {
  it('recovers an unsaved note after remount and isolates it from another user', () => {
    const props={onClose:vi.fn(),onSaveNotes:vi.fn(),saving:false,saveError:false};
    const first=render(<CloserCallReviewView call={call} {...props}/>);
    fireEvent.change(screen.getByRole('textbox'),{target:{value:'Mój niezapisany wniosek'}});
    const unload=new Event('beforeunload',{cancelable:true});
    window.dispatchEvent(unload);
    expect(unload.defaultPrevented).toBe(true);
    first.unmount();
    const second=render(<CloserCallReviewView call={call} {...props}/>);
    expect(screen.getByRole('textbox')).toHaveValue('Mój niezapisany wniosek');
    second.unmount();
    render(<CloserCallReviewView call={{...call,user_id:'other'}} {...props}/>);
    expect(screen.getByRole('textbox')).toHaveValue('');
  });
  it('connects a chosen AI moment to playback and the actual transcript', () => {
    render(<CloserCallReviewView call={call} onClose={vi.fn()} onSaveNotes={vi.fn()} saving={false} saveError={false} />);
    fireEvent.click(screen.getByRole('button',{name:/00:03:10.*Pytanie bez pogłębienia/}));
    const frame=screen.getByTitle('Nagranie rozmowy') as HTMLIFrameElement;
    const send=vi.spyOn(frame.contentWindow!,'postMessage').mockImplementation(()=>undefined);
    window.dispatchEvent(new MessageEvent('message',{origin:'https://fathom.video',source:frame.contentWindow,
      data:JSON.stringify({context:'player.js',event:'getDuration',listener:'sparky-duration',value:3600})}));
    expect(send).toHaveBeenCalledWith(JSON.stringify({context:'player.js',version:'0.0.11',method:'setCurrentTime',value:190}),'https://fathom.video');
    expect(screen.getByText('Potrzebuję więcej czasu.')).toBeInTheDocument();
    expect(screen.getByText('Zapytaj, co konkretnie budzi wątpliwość.')).toBeInTheDocument();
  });
  it('sends the user note only on save and preserves it on a server failure', () => {
    const save = vi.fn();
    const {rerender}=render(<CloserCallReviewView call={call} onClose={vi.fn()} onSaveNotes={save} saving={false} saveError={false} />);
    fireEvent.change(screen.getByRole('textbox',{name:'Moje wnioski na następną rozmowę'}),{target:{value:'Najpierw dopytam o obiekcję.'}});
    expect(save).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button',{name:'Zapisz notatkę'}));
    expect(save).toHaveBeenCalledWith('Najpierw dopytam o obiekcję.');
    rerender(<CloserCallReviewView call={call} onClose={vi.fn()} onSaveNotes={save} saving={false} saveError />);
    expect(screen.getByRole('textbox')).toHaveValue('Najpierw dopytam o obiekcję.');
    expect(screen.getByRole('alert')).toHaveTextContent('Nie udało się zapisać');
  });
  it('offers usable empty states when a recording has no analysis or transcript', () => {
    render(<CloserCallReviewView call={{...call,share_url:null,transcript:null,ai_mistakes:[],ai_good_moves:[],ai_status:'skipped'}} onClose={vi.fn()} onSaveNotes={vi.fn()} saving={false} saveError={false} />);
    expect(screen.getByText('Brak momentów do przejrzenia')).toBeInTheDocument();
    expect(screen.getByText('Nagranie jest niedostępne')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });
});

