import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ErrorBoundary } from './ErrorBoundary';
import { ErrorFallback } from './ErrorFallback';

function Bomb(): never {
  throw new Error('boom');
}

describe('ErrorBoundary', () => {
  it('shows the friendly fallback instead of a blank page when a child throws', () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong');
    expect(screen.getByRole('button', { name: 'Reload' })).toBeInTheDocument();
    expect(log).toHaveBeenCalled();
    log.mockRestore();
  });

  it('renders children when nothing throws', () => {
    render(
      <ErrorBoundary>
        <p>All good</p>
      </ErrorBoundary>,
    );
    expect(screen.getByText('All good')).toBeInTheDocument();
  });

  it('uses a custom fallback when given one', () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    render(
      <ErrorBoundary fallback={<p>Canvas failed</p>}>
        <Bomb />
      </ErrorBoundary>,
    );
    expect(screen.getByText('Canvas failed')).toBeInTheDocument();
    log.mockRestore();
  });
});

describe('ErrorFallback', () => {
  it('calls onReload when the Reload button is pressed', async () => {
    const onReload = vi.fn();
    render(<ErrorFallback onReload={onReload} />);
    await userEvent.click(screen.getByRole('button', { name: 'Reload' }));
    expect(onReload).toHaveBeenCalledTimes(1);
  });
});
