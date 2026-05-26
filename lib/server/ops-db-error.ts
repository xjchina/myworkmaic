export function isMissingTableError(error: unknown): boolean {
  const raw = error as { message?: string; cause?: { message?: string; sqlMessage?: string; code?: string } };
  const message = String(
    raw?.message ||
      raw?.cause?.sqlMessage ||
      raw?.cause?.message ||
      (raw?.cause?.code ? `${raw.cause.code}` : '') ||
      (error || ''),
  );
  return (
    message.includes('ER_NO_SUCH_TABLE') ||
    message.includes('doesn\'t exist') ||
    message.includes('不存在') ||
    message.includes('no such table')
  );
}

export function missingTableHint() {
  return '后台新表尚未创建，请先执行数据库迁移（包含 0004_ops_admin.sql）。';
}
