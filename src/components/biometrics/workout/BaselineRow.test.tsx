// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import BaselineRow from './BaselineRow';
import { BASELINE_TESTS } from '../../../lib/health/baselineTests';

vi.mock('../../../lib/health/baselineApi', () => ({ baselineVideoUrl: vi.fn(async () => 'https://example.test/v.mp4') }));

const test = BASELINE_TESTS.find((t) => t.key === 't05')!;
const show = (props: Partial<Parameters<typeof BaselineRow>[0]> = {}) => {
  const onSave = vi.fn();
  render(
    <QueryClientProvider client={new QueryClient()}>
      <BaselineRow test={test} tone="a" onSave={onSave} onUpload={vi.fn()} onRemoveVideo={vi.fn()} {...props} />
    </QueryClientProvider>,
  );
  return onSave;
};

describe('BaselineRow', () => {
  it('zapisuje główną serię i max dopiero po wyjściu z pola', () => {
    const onSave = show();
    const main = screen.getByLabelText(`Główna seria: ${test.name}`);
    fireEvent.change(main, { target: { value: '160 kg × 3' } });
    expect(onSave).not.toHaveBeenCalled();
    fireEvent.blur(main);
    expect(onSave).toHaveBeenCalledWith({ main_set: '160 kg × 3' });
    const max = screen.getByLabelText(`Mój max: ${test.name}`);
    fireEvent.change(max, { target: { value: '180' } });
    fireEvent.blur(max);
    expect(onSave).toHaveBeenLastCalledWith({ max_value: '180' });
  });

  it('pominięty test chowa pola i pozwala go przywrócić', () => {
    const onSave = show({ result: { test_key: 't05', main_set: null, max_value: null, skipped: true, video_path: null, video_url: null } });
    expect(screen.queryByLabelText(`Mój max: ${test.name}`)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Przywróć' }));
    expect(onSave).toHaveBeenCalledWith({ skipped: false });
  });

  it('pokazuje przyciski wideo i odtwarza zapisane nagranie', async () => {
    show({ result: { test_key: 't05', main_set: null, max_value: null, skipped: null, video_path: 'u/t05.mp4', video_url: null } });
    expect(screen.getByRole('button', { name: 'Zmień wideo' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Odtwórz' }));
    expect(await screen.findByRole('button', { name: 'Ukryj' })).toBeVisible();
  });
});
