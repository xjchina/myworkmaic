function parseSet(raw: string | undefined): Set<string> {
  if (!raw) return new Set();
  return new Set(
    raw
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
  );
}

export function isAdminIdentity(input: { userId?: string | null; phone?: string | null }): boolean {
  const adminIds = parseSet(process.env.ADMIN_USER_IDS);
  const adminPhones = parseSet(process.env.ADMIN_PHONES);

  if (input.userId && adminIds.has(input.userId)) return true;
  if (input.phone && adminPhones.has(input.phone)) return true;
  return false;
}
