/** An email link is parsed locally. Only its token is sent to the configured API. */
export function emailActionToken(raw: string, action: 'verify-account' | 'reset-password'): string | null {
  const value = raw.trim();
  if (/^[A-Za-z0-9_-]{1,512}$/.test(value)) return value;
  try {
    const url = new URL(value);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password ||
        !url.pathname.endsWith('/' + action)) return null;
    const tokens = url.searchParams.getAll('token');
    return tokens.length === 1 && /^[A-Za-z0-9_-]{1,512}$/.test(tokens[0]) ? tokens[0] : null;
  } catch {
    return null;
  }
}
