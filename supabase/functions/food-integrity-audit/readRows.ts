interface Result<T> { data: T[] | null; error: { message: string } | null }

/** A partial read must never resolve findings or recompute totals from an incomplete day. */
export async function readAuditRows<T>(
  page: (from: number, to: number) => PromiseLike<Result<T>>,
  label: string,
): Promise<T[]> {
  const rows: T[] = [];
  const size = 500;
  for (let from = 0; ; from += size) {
    const { data, error } = await page(from, from + size - 1);
    if (error) throw new Error(`food-integrity-audit ${label}: ${error.message}`);
    if (!data) throw new Error(`food-integrity-audit ${label}: missing response`);
    rows.push(...data);
    if (data.length < size) return rows;
  }
}
