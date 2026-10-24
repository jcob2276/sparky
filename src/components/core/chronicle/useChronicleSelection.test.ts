import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useChronicleSelection } from './useChronicleSelection';

describe('useChronicleSelection', () => {
  it('zaczyna od bieżącego okresu zestawionego z poprzednim', () => {
    const { result } = renderHook(() => useChronicleSelection());
    expect([result.current.offset, result.current.compareOffset]).toEqual([0, 1]);
  });

  it('cofa się w przeszłość, nie wychodzi w przyszłość i ciągnie za sobą porównanie', () => {
    const { result } = renderHook(() => useChronicleSelection());
    act(() => result.current.shiftMain(1));
    expect([result.current.offset, result.current.compareOffset]).toEqual([1, 2]);
    act(() => result.current.shiftMain(-1));
    act(() => result.current.shiftMain(-1));
    expect(result.current.offset).toBe(0);
  });

  it('po ręcznym wyborze porównania przestaje je ciągnąć, ale nie pozwala porównać okresu z samym sobą', () => {
    const { result } = renderHook(() => useChronicleSelection());
    act(() => result.current.shiftCompare(2));
    expect(result.current.compareOffset).toBe(3);
    act(() => result.current.shiftMain(1));
    expect([result.current.offset, result.current.compareOffset]).toEqual([1, 3]);
    act(() => result.current.shiftCompare(-1));
    expect(result.current.compareOffset).toBe(2);
    act(() => result.current.shiftCompare(-1));
    expect(result.current.compareOffset).toBe(0);
  });

  it('reset wraca do bieżącego okresu i znów prowadzi porównanie', () => {
    const { result } = renderHook(() => useChronicleSelection());
    act(() => result.current.shiftCompare(3));
    act(() => result.current.shiftMain(2));
    act(() => result.current.reset());
    expect([result.current.offset, result.current.compareOffset]).toEqual([0, 1]);
    act(() => result.current.shiftMain(1));
    expect(result.current.compareOffset).toBe(2);
  });
});
