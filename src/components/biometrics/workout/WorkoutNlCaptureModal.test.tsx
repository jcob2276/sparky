import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import WorkoutNlCaptureModal from './WorkoutNlCaptureModal';

vi.mock('../../../lib/health/workoutNlApi', () => ({ parseWorkoutNl: vi.fn() }));
vi.mock('../../../lib/notify', () => ({ notify: vi.fn() }));

class Recognition {
  static instances: Recognition[] = [];
  onstart?: () => void;
  onend?: () => void;
  onerror?: () => void;
  onresult?: (event: { results: Array<Array<{ transcript: string }>> }) => void;
  start = vi.fn(() => this.onstart?.());
  abort = vi.fn(() => this.onend?.());
  stop = vi.fn(() => this.onend?.());
  constructor() { Recognition.instances.push(this); }
}

const props = { isOpen: true, onClose: vi.fn(), onApplyParsed: vi.fn() };
function start() { fireEvent.click(screen.getByRole('button', { name: 'Dyktuj głosem' })); }

beforeEach(() => {
  Recognition.instances = [];
  vi.clearAllMocks();
  vi.stubGlobal('SpeechRecognition', Recognition);
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('workout speech capture lifecycle', () => {
  it('stops the actual recognizer and ignores late text when toggled off', () => {
    render(<WorkoutNlCaptureModal {...props} />);
    start();
    const recognition = Recognition.instances[0];
    fireEvent.click(screen.getByRole('button', { name: 'Zatrzymaj dyktowanie' }));
    expect(recognition.abort).toHaveBeenCalledOnce();
    act(() => recognition.onresult?.({ results: [[{ transcript: 'Spóźniony tekst' }]] }));
    expect(screen.getByRole('textbox')).toHaveValue('');
  });

  it('stops capture when the parent closes the modal', () => {
    const { rerender } = render(<WorkoutNlCaptureModal {...props} />);
    start();
    rerender(<WorkoutNlCaptureModal {...props} isOpen={false} />);
    expect(Recognition.instances[0].abort).toHaveBeenCalledOnce();
  });

  it('releases the recognizer on unmount', () => {
    const { unmount } = render(<WorkoutNlCaptureModal {...props} />);
    start();
    unmount();
    expect(Recognition.instances[0].abort).toHaveBeenCalledOnce();
  });

  it('stops capture before requesting close from the cancel button', () => {
    render(<WorkoutNlCaptureModal {...props} />);
    start();
    fireEvent.click(screen.getByRole('button', { name: 'Anuluj' }));
    expect(Recognition.instances[0].abort).toHaveBeenCalledOnce();
    expect(props.onClose).toHaveBeenCalledOnce();
  });

  it('does not let an old recognition end a newer recording', () => {
    render(<WorkoutNlCaptureModal {...props} />);
    start();
    const oldRecognition = Recognition.instances[0];
    fireEvent.click(screen.getByRole('button', { name: 'Zatrzymaj dyktowanie' }));
    start();
    act(() => oldRecognition.onend?.());
    expect(screen.getByRole('button', { name: 'Zatrzymaj dyktowanie' })).toBeInTheDocument();
  });

  it('preserves typed text and appends a recognized workout', () => {
    render(<WorkoutNlCaptureModal {...props} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Przysiad 80kg 3x5' } });
    start();
    act(() => Recognition.instances[0].onresult?.({ results: [[{ transcript: 'Wyciskanie 60kg 3x8' }]] }));
    expect(screen.getByRole('textbox')).toHaveValue('Przysiad 80kg 3x5, Wyciskanie 60kg 3x8');
  });

  it('uses stop when the browser does not expose abort', () => {
    render(<WorkoutNlCaptureModal {...props} />);
    start();
    const recognition = Recognition.instances[0];
    Object.defineProperty(recognition, 'abort', { value: undefined });
    fireEvent.click(screen.getByRole('button', { name: 'Zatrzymaj dyktowanie' }));
    expect(recognition.stop).toHaveBeenCalledOnce();
  });

  it('supports WebKit recognition and still releases it on close', () => {
    vi.stubGlobal('SpeechRecognition', undefined);
    vi.stubGlobal('webkitSpeechRecognition', Recognition);
    const { unmount } = render(<WorkoutNlCaptureModal {...props} />);
    start();
    expect(Recognition.instances[0].start).toHaveBeenCalledOnce();
    unmount();
    expect(Recognition.instances[0].abort).toHaveBeenCalledOnce();
  });

  it('ends capture on a recognition error and ignores subsequent results', () => {
    render(<WorkoutNlCaptureModal {...props} />);
    start();
    const recognition = Recognition.instances[0];
    act(() => recognition.onerror?.());
    expect(recognition.abort).toHaveBeenCalledOnce();
    act(() => recognition.onresult?.({ results: [[{ transcript: 'Spóźniony tekst' }]] }));
    expect(screen.getByRole('textbox')).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Dyktuj głosem' })).toBeInTheDocument();
  });
});
