import { useEffect, useRef, useState } from 'react';
import { Eye, EyeOff, Fingerprint, LockKeyhole } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { STORAGE_KEYS } from '../../lib/constants';
import { ControlInput, Pressable } from '../ui/ControlPrimitives';
import './auth.css';

const EMAIL_CACHE_KEY = 'sparky_login_email';

// eslint-disable-next-line max-lines-per-function
export default function Auth() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState(() => localStorage.getItem(EMAIL_CACHE_KEY) ?? '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const theme = localStorage.getItem(STORAGE_KEYS.THEME) || 'light';
    document.documentElement.classList.toggle('dark', theme === 'dark');
    if (email) {
      passwordRef.current?.focus();
    } else {
      emailRef.current?.focus();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const triggerShake = () => {
    const el = cardRef.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    el.animate(
      [
        { transform: 'translateX(0)' },
        { transform: 'translateX(-8px)' },
        { transform: 'translateX(7px)' },
        { transform: 'translateX(-6px)' },
        { transform: 'translateX(5px)' },
        { transform: 'translateX(-3px)' },
        { transform: 'translateX(0)' },
      ],
      { duration: 500, easing: 'cubic-bezier(0.36, 0.07, 0.19, 0.97)' },
    );
  };

  const handleSignIn = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError('Podaj email i hasło.');
      setLoading(false);
      triggerShake();
      return;
    }

    try {
      localStorage.setItem(EMAIL_CACHE_KEY, trimmedEmail);
    } catch {
      /* ignore quota errors in Safari Private mode */
    }

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });

      if (signInError) {
        if (signInError.message.includes('Invalid login credentials')) {
          setError('Błędny email lub hasło.');
        } else if (signInError.message.includes('Email not confirmed')) {
          setError('Email nie został jeszcze potwierdzony.');
        } else {
          setError(signInError.message);
        }
        triggerShake();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Wystąpił nieoczekiwany błąd logowania.');
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative flex min-h-screen w-full items-center justify-center p-4 selection:bg-primary/20">
      <div className="auth-bg" aria-hidden="true">
        <div className="auth-orb auth-orb-1" />
        <div className="auth-orb auth-orb-2" />
        <div className="auth-orb auth-orb-3" />
        <div className="auth-noise" />
      </div>

      <div ref={cardRef} className="auth-card w-full max-w-[392px]">
        <div className="mb-7 flex flex-col items-center text-center">
          <div className="auth-logo-wrap mb-4">
            <div className="auth-logo-ring" />
            <div className="auth-logo-inner shadow-sm">
              <Fingerprint size={24} strokeWidth={1.9} />
            </div>
          </div>
          <h1 className="auth-title font-display text-text-primary tracking-tight">
            Sparky
          </h1>
          <p className="auth-subtitle">
            Wpisz dane, aby wejść do systemu.
          </p>
        </div>

        <form onSubmit={handleSignIn} className="space-y-4" noValidate>
          {error && (
            <div role="alert" className="auth-error">
              {error}
            </div>
          )}

          <label className="auth-field" style={{ '--stagger': '0' } as React.CSSProperties}>
            <span className="auth-label">Email</span>
            <ControlInput
              ref={emailRef}
              type="email"
              required
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="twoj@email.pl"
              className="auth-input"
            />
          </label>

          <label className="auth-field" style={{ '--stagger': '1' } as React.CSSProperties}>
            <span className="auth-label">Hasło</span>
            <div className="relative">
              <ControlInput
                ref={passwordRef}
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="auth-input auth-input-pw"
              />
              <Pressable
                onClick={() => setShowPassword((v) => !v)}
                className="auth-eye-btn"
                tabIndex={-1}
                aria-label={showPassword ? 'Ukryj hasło' : 'Pokaż hasło'}
              >
                {showPassword
                  ? <EyeOff size={16} strokeWidth={1.8} />
                  : <Eye size={16} strokeWidth={1.8} />}
              </Pressable>
            </div>
          </label>

          <Pressable
            type="submit"
            variant="primary"
            size="lg"
            loading={loading}
            icon={<LockKeyhole size={15} />}
            className="auth-submit mt-2 w-full"
          >
            Zaloguj się
          </Pressable>
        </form>
      </div>
    </main>
  );
}
