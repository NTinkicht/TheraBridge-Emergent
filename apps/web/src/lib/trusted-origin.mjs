/** Accept only a fixed server-configured origin; never derive it from request headers. */
export function trustedOrigin(raw) {
  const origin = new URL(raw);
  if (!['http:', 'https:'].includes(origin.protocol) || origin.username || origin.password ||
      origin.pathname !== '/' || origin.search || origin.hash) {
    throw new Error('API_UPSTREAM_ORIGIN must be a trusted HTTP(S) origin without credentials or path');
  }
  return origin.origin;
}
