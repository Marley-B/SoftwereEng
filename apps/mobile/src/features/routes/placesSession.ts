/** Session token for Google Places Autocomplete + Details billing group (per field). */
export function newPlacesSessionToken(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === 'function') {
    return c.randomUUID();
  }
  // Places session tokens must be at most 36 characters.
  return `t${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`.slice(0, 36);
}
