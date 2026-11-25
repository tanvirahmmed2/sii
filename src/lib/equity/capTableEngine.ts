import { queryDb } from 'src/lib/database/db';

export const SHARE_NOMINAL_PRICE = 10;

export async function recalculateCapTable() {
  const shRes = await queryDb(`
    SELECT id, total_invested, share_percentage, total_shares
    FROM shareholders
    WHERE is_active = true
    ORDER BY id ASC
  `);

  const shareholders = shRes.rows || [];
  if (shareholders.length === 0) return { totalInvested: 0, totalShares: 0 };

  const totalInvested = shareholders.reduce(
    (sum: number, s: any) => sum + Number(s.total_invested || 0),
    0
  );

  let totalIssuedShares = 0;

  if (totalInvested > 0) {
    for (const s of shareholders) {
      const invested = Number(s.total_invested || 0);
      const pct = Number(((invested / totalInvested) * 100).toFixed(3));
      const shares = Math.max(0, Math.round(invested / SHARE_NOMINAL_PRICE));
      totalIssuedShares += shares;

      await queryDb(
        `UPDATE shareholders
         SET share_percentage = $1,
             total_shares = $2,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [pct, shares, s.id]
      );
    }

    await queryDb(
      `UPDATE share_classes
       SET issued_shares = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE class_code = 'ORD-A'`,
      [totalIssuedShares]
    );
  }

  return { totalInvested, totalShares: totalIssuedShares };
}
