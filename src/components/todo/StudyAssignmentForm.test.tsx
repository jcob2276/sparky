import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import StudyAssignmentForm from './StudyAssignmentForm';
import StudySubjectBoard from './StudySubjectBoard';

afterEach(cleanup);

describe('study assignments', () => {
  it('opens the subject tile with a keyboard-accessible button and saves a task with its date', async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    render(<StudySubjectBoard subjects={[{ id: 's1', title: 'Kryptografia kwantowa', openCount: 0, doneCount: 0, nextDue: null, onRename: vi.fn(), onDelete: vi.fn(), onSave: save, children: null }]} />);
    const subject = screen.getByRole('button', { name: /^Kryptografia kwantowa/ });
    expect(subject.getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(subject);
    expect(subject.getAttribute('aria-pressed')).toBe('true');
    fireEvent.change(screen.getByLabelText('Co jest do zrobienia?'), { target: { value: '  Oddać projekt  ' } });
    fireEvent.change(screen.getByLabelText(/Na kiedy/), { target: { value: '2026-10-20' } });
    fireEvent.click(screen.getByRole('button', { name: 'Dodaj zadanie' }));
    await waitFor(() => expect(save).toHaveBeenCalledWith('Oddać projekt', '2026-10-20'));
    await waitFor(() => expect((screen.getByLabelText('Co jest do zrobienia?') as HTMLInputElement).value).toBe(''));
  });

  it('shows the semester summary, urgency and toggles the panel with the tasks', () => {
    const subject = (id: string, title: string, openCount: number, doneCount: number, nextDue: string | null) =>
      ({ id, title, openCount, doneCount, nextDue, onRename: vi.fn(), onDelete: vi.fn(), onSave: vi.fn(), children: <p>Zadania: {title}</p> });
    render(<StudySubjectBoard subjects={[subject('a', 'Seminarium dyplomowe', 1, 0, '2000-01-01'), subject('b', 'Bezpieczeństwo IoT', 0, 2, null)]} />);
    expect(screen.getByText(/Semestr:/)).toHaveTextContent('Semestr: 2 z 3 zadań');
    expect(screen.getAllByText(/po terminie/).length).toBeGreaterThan(0);
    expect(screen.getByText('Wszystko zrobione')).toBeVisible();
    expect(screen.queryByText('Zadania: Seminarium dyplomowe')).toBeNull();
    const tile = screen.getByRole('button', { name: /^Seminarium dyplomowe/ });
    fireEvent.click(tile);
    expect(screen.getByText('Zadania: Seminarium dyplomowe')).toBeVisible();
    fireEvent.click(tile);
    expect(screen.queryByText('Zadania: Seminarium dyplomowe')).toBeNull();
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
