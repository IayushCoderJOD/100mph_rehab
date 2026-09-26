/**
 * A client-generated id for writes that must be safe to retry — a session
 * logged on a phone that dropped its connection mid-request is sent again
 * with the same id, and the server updates the row instead of adding one.
 */
export function newId(): string {
  const native = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (native?.randomUUID) return native.randomUUID();

  // Older Hermes builds have no crypto. Math.random is fine for an
  // idempotency key: it only has to be unique per device, not unguessable.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}
