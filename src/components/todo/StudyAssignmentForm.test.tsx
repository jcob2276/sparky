import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import StudyAssignmentForm from './StudyAssignmentForm';
import StudySubject from './StudySubject';

afterEach(cleanup);

describe('study assignments', () => {
  it('opens the subject with a keyboard-accessible button and saves a task with its date', async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    render(<StudySubject title="Kryptografia kwantowa" openCount={0} doneCount={0} onSave={save}>{null}</StudySubject>);
    const subject = screen.getByRole('button', { name: /Kryptografia kwantowa/ });
    expect(subject.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(subject);
    fireEvent.change(screen.getByLabelText('Co jest do zrobienia?'), { target: { value: '  Oddać projekt  ' } });
    fireEvent.change(screen.getByLabelText(/Na kiedy/), { target: { value: '2026-10-20' } });
    fireEvent.click(screen.getByRole('button', { name: 'Dodaj zadanie' }));
    await waitFor(() => expect(save).toHaveBeenCalledWith('Oddać projekt', '2026-10-20'));
    await waitFor(() => expect((screen.getByLabelText('Co jest do zrobienia?') as HTMLInputElement).value).toBe(''));
  });

  it('retains the title and deadline after a failed save, then allows retry', async () => {
    const save = vi.fn().mockRejectedValueOnce(new Error('Brak połączenia')).mockResolvedValueOnce(undefined);
    render(<StudyAssignmentForm onSave={save} />);
    const title = screen.getByLabelText('Co jest do zrobienia?') as HTMLInputElement;
    const date = screen.getByLabelText(/Na kiedy/) as HTMLInputElement;
    fireEvent.change(title, { target: { value: 'Sprawozdanie' } });
    fireEvent.change(date, { target: { value: '2026-10-20' } });
    fireEvent.click(screen.getByRole('button', { name: 'Dodaj zadanie' }));
    await screen.findByRole('alert');
    expect(title.value).toBe('Sprawozdanie');
    expect(date.value).toBe('2026-10-20');
    fireEvent.click(screen.getByRole('button', { name: 'Dodaj zadanie' }));
    await waitFor(() => expect(title.value).toBe(''));
    expect(save).toHaveBeenCalledTimes(2);
  });

  it('allows tasks without a date and prevents duplicate submissions while saving', async () => {
    let finish: () => void = () => {};
    const save = vi.fn(() => new Promise<void>(resolve => { finish = resolve; }));
    render(<StudyAssignmentForm onSave={save} />);
    const title = screen.getByLabelText('Co jest do zrobienia?');
    fireEvent.change(title, { target: { value: 'Wybrać temat' } });
    fireEvent.click(screen.getByRole('button', { name: 'Dodaj zadanie' }));
    fireEvent.submit(title.closest('form')!);
    expect(save).toHaveBeenCalledOnce();
    expect(save).toHaveBeenCalledWith('Wybrać temat', '');
    await act(async () => finish());
  });

  it('reads the current native date input when submitting, even before its change event', async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    render(<StudyAssignmentForm onSave={save} />);
    fireEvent.change(screen.getByLabelText('Co jest do zrobienia?'), { target: { value: 'Oddać projekt' } });
    (screen.getByLabelText(/Na kiedy/) as HTMLInputElement).value = '2026-10-20';
    fireEvent.click(screen.getByRole('button', { name: 'Dodaj zadanie' }));
    await waitFor(() => expect(save).toHaveBeenCalledWith('Oddać projekt', '2026-10-20'));
  });
});
