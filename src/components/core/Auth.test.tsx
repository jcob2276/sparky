import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AuthError, type User, type Session } from '@supabase/supabase-js';
import Auth from './Auth';
import { supabase } from '../../lib/supabase';

const mockUser: User = {
  id: 'user-1',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  created_at: '2026-10-18T00:00:00Z',
};

const mockSession: Session = {
  access_token: 'token-xyz',
  refresh_token: 'refresh-xyz',
  expires_in: 3600,
  token_type: 'bearer',
  user: mockUser,
};

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
    },
  },
}));

describe('Auth component - render and interactions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders Sparky login card with email and password inputs', () => {
    render(<Auth />);
    expect(screen.getByRole('heading', { name: 'Sparky' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('twoj@email.pl')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Zaloguj się' })).toBeInTheDocument();
  });

  it('toggles password visibility when clicking the eye button', () => {
    render(<Auth />);
    const passwordInput = screen.getByPlaceholderText('••••••••');
    const eyeButton = screen.getByRole('button', { name: 'Pokaż hasło' });

    expect(passwordInput).toHaveAttribute('type', 'password');

    fireEvent.click(eyeButton);
    expect(passwordInput).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: 'Ukryj hasło' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Ukryj hasło' }));
    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  it('toggles theme when clicking the theme switch button', () => {
    render(<Auth />);
    const themeButton = screen.getByRole('button', { name: /Przełącz na tryb/i });
    expect(themeButton).toBeInTheDocument();

    fireEvent.click(themeButton);
    expect(localStorage.getItem('vanguard_theme')).toBe('dark');
  });
});

describe('Auth component - submission and errors', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('shows error if submitted without email or password', async () => {
    render(<Auth />);
    fireEvent.click(screen.getByRole('button', { name: 'Zaloguj się' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Podaj email i hasło.');
    expect(supabase.auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it('calls supabase signInWithPassword on valid submit', async () => {
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      data: { user: mockUser, session: mockSession },
      error: null,
    });

    render(<Auth />);
    fireEvent.change(screen.getByPlaceholderText('twoj@email.pl'), { target: { value: 'user@example.com' } });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'secret123' } });

    fireEvent.click(screen.getByRole('button', { name: 'Zaloguj się' }));

    await waitFor(() => {
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'user@example.com',
        password: 'secret123',
      });
    });
  });

  it('handles invalid login credentials error with friendly polish message', async () => {
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      data: { user: null, session: null },
      error: new AuthError('Invalid login credentials', 400),
    });

    render(<Auth />);
    fireEvent.change(screen.getByPlaceholderText('twoj@email.pl'), { target: { value: 'user@example.com' } });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'wrongpass' } });

    fireEvent.click(screen.getByRole('button', { name: 'Zaloguj się' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Błędny email lub hasło.');
  });
});
