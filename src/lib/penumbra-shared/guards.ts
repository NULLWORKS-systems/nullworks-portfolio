export function normalizedEmail(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}
export function allowedEmail(email: string, allowedCsv: string): boolean {
  const allow = allowedCsv.split(',').map(normalizedEmail).filter(Boolean);
  return allow.length > 0 && allow.includes(normalizedEmail(email));
}
export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value);
}
export function messageText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  return text.length >= 1 && text.length <= 4000 ? text : null;
}
export function roomTitle(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const title = value.trim();
  return title.length >= 1 && title.length <= 120 ? title : null;
}
export function inviteTokenValid(value: unknown): value is string {
  return typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
}
export function displayLabel(email: string, mason: string, jason: string): string {
  if (normalizedEmail(email) === normalizedEmail(mason)) return 'Mason';
  if (normalizedEmail(email) === normalizedEmail(jason)) return 'Jason';
  return email.split('@')[0].replace(/[^a-zA-Z0-9._-]/g, '').slice(0, 40) || 'Participant';
}
export function originAllowed(origin: string | null, expectedOrigin: string): boolean {
  if (!origin) return false;
  try { return new URL(origin).origin === expectedOrigin; } catch { return false; }
}
