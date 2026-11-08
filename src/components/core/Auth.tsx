import { useEffect, useRef, useState } from 'react';
import { Eye, EyeOff, LockKeyhole } from 'lucide-react';
import { supabase } from '../../lib/supabase';
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
    // Auth screen is immersive dark
    document.documentElement.classList.add('dark');
    if (email) {
      passwordRef.current?.focus();
    } else {
      emailRef.current?.focus();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const triggerShake = () => {
    const el = cardRef.current;
    if (!el || typeof el.animate !== 'function') return;
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
      /* ignore quota errors */
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
    <main className="auth-hero">
      {/* Full-bleed cinematic background */}
      <div className="auth-hero-bg" aria-hidden="true">
        <img decoding="async"
          src={`${import.meta.env.BASE_URL}auth_hero.jpg`}
          alt=""
          className="auth-hero-img"
        />
        <div className="auth-hero-scrim" />
        <div className="auth-hero-vignette" />
      </div>

      {/* Centered luxury glass card */}
      <div className="auth-hero-content">
        <div ref={cardRef} className="auth-luxury-card">
          <div className="auth-card-glow" aria-hidden="true" />

          {/* Logo & Brand Header */}
          <div className="auth-card-header">
            <div className="auth-logo-box">
              <img decoding="async"
                src={`${import.meta.env.BASE_URL}favicon.svg`}
                alt="Sparky"
                width={40}
                height={40}
                className="auth-logo-badge"
              />
            </div>
            <div className="text-center mt-3">
              <span className="auth-brand-badge">Sparky OS</span>
              <h1 className="auth-card-title">Zaloguj się</h1>
              <p className="auth-card-sub">Wpisz dane, aby wejść do systemu.</p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSignIn} className="auth-card-form" noValidate>
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
                className="auth-input auth-input-dark"
              />
            </label>

            <label className="auth-field" style={{ '--stagger': '1' } as React.CSSProperties}>
              <span className="auth-label">Hasło</span>
              <div className="relative flex items-center">
                <ControlInput
                  ref={passwordRef}
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="auth-input auth-input-dark auth-input-pw"
                />
                <Pressable
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="auth-eye-btn"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Ukryj hasło' : 'Pokaż hasło'}
                >
                  {showPassword
                    ? <EyeOff size={18} strokeWidth={1.8} />
                    : <Eye size={18} strokeWidth={1.8} />}
                </Pressable>
              </div>
            </label>

            <Pressable
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              icon={<LockKeyhole size={16} />}
              className="auth-submit auth-submit-hero mt-2 w-full font-semibold"
            >
              Zaloguj się
            </Pressable>
          </form>
        </div>
      </div>
    </main>
  );
}
