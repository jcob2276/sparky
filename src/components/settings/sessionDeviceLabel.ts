/** User-agent is a hint supplied by the client, not verified device identity. */
export function sessionDeviceLabel(userAgent: string | null): string {
  if (!userAgent?.trim()) return 'Nieznane urządzenie';
  const browser = /; wv\)/i.test(userAgent) ? 'Aplikacja'
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
