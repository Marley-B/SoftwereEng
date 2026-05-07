/** Client-side id until the API assigns persistent identifiers. */
export function makeRouteId(): string {
  return `route-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}
