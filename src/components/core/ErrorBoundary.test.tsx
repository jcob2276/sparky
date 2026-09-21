// @vitest-environment happy-dom
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary';

function ProblemChild({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('Test crash in child component');
  }
  return <div>Normal Content</div>;
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('renders children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <div>All good</div>
      </ErrorBoundary>,
    );
    expect(screen.getByText('All good')).toBeInTheDocument();
  });

  it('renders root fallback when a child throws an error', () => {
    render(
      <ErrorBoundary>
        <ProblemChild shouldThrow={true} />
      </ErrorBoundary>,
    );
    expect(screen.getByTestId('root-error-boundary')).toBeInTheDocument();
    expect(screen.getByText('Test crash in child component')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /spróbuj ponownie/i })).toBeInTheDocument();
  });

  it('renders compact inline fallback when inline prop is true', () => {
    render(
      <ErrorBoundary inline>
        <ProblemChild shouldThrow={true} />
      </ErrorBoundary>,
    );
    expect(screen.getByTestId('inline-error-boundary')).toBeInTheDocument();
    expect(screen.getByText('Błąd modułu')).toBeInTheDocument();
    expect(screen.getByText('Test crash in child component')).toBeInTheDocument();
  });

  it('calls onReset and resets state when "Spróbuj ponownie" is clicked', () => {
    const handleReset = vi.fn();
    const { rerender } = render(
      <ErrorBoundary onReset={handleReset} inline>
        <ProblemChild shouldThrow={true} />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Błąd modułu')).toBeInTheDocument();

    // Fix the error condition and click reset
    rerender(
      <ErrorBoundary onReset={handleReset} inline>
        <ProblemChild shouldThrow={false} />
      </ErrorBoundary>,
    );

    const retryBtn = screen.getByRole('button', { name: /spróbuj ponownie/i });
    fireEvent.click(retryBtn);

    expect(handleReset).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Normal Content')).toBeInTheDocument();
  });
});
