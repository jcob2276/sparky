export function describeSec13fError(cause: unknown): string {
  if (cause instanceof Error) return cause.message;
  if (cause && typeof cause === 'object') {
    const error = cause as Record<string, unknown>;
    const text = [error.message, error.details, error.hint]
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0).join(' — ');
    if (text) return `${typeof error.code === 'string' && error.code ? `${error.code}: ` : ''}${text}`;
  }
  return String(cause);
}
