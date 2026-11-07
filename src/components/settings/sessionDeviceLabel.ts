/** User-agent is a hint supplied by the client, not verified device identity. */
export function sessionDeviceLabel(userAgent: string | null): string {
  if (!userAgent?.trim()) return 'Nieznane urządzenie';
  const browser = /HeadlessChrome/i.test(userAgent) ? 'Przeglądarka testowa'
    : /Claude\//i.test(userAgent) ? 'Claude'
      : /Codex\//i.test(userAgent) ? 'Codex'
        : /Cursor\//i.test(userAgent) ? 'Cursor'
          : /; wv\)/i.test(userAgent) ? 'Aplikacja'
    : /Edg(?:e|A|iOS)?\//i.test(userAgent) ? 'Edge'
      : /(?:OPR|Opera)\//i.test(userAgent) ? 'Opera'
        : /(?:Firefox|FxiOS)\//i.test(userAgent) ? 'Firefox'
          : /(?:Chrome|CriOS)\//i.test(userAgent) ? 'Chrome'
            : /Safari\//i.test(userAgent) ? 'Safari' : 'Nieznana przeglądarka';
  const system = /Android/i.test(userAgent) ? 'Android'
    : /iPhone|iPad|iPod/i.test(userAgent) ? 'iOS'
      : /Windows/i.test(userAgent) ? 'Windows'
        : /Macintosh|Mac OS X/i.test(userAgent) ? 'macOS'
          : /Linux/i.test(userAgent) ? 'Linux' : 'Nieznany system';
  return `${browser} · ${system}`;
}

export function sessionMethodLabel(methods: string[]): string {
  const labels: Record<string, string> = {
    password: 'Hasło', otp: 'Kod jednorazowy', totp: 'Aplikacja uwierzytelniająca',
    oauth: 'Konto zewnętrzne', sso: 'SSO', recovery: 'Odzyskiwanie konta',
    magiclink: 'Link z e-maila', webauthn: 'Klucz dostępu', passkey: 'Klucz dostępu',
    phone: 'Telefon', mfa: 'MFA', anonymous: 'Logowanie anonimowe',
  };
  return methods.length ? methods.map(method => labels[method] ?? 'Inna metoda').join(' + ') : 'Brak danych';
}
