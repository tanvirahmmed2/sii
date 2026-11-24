import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';
import { fetchPublicPromos } from 'src/lib/redis/redisClient';

export async function GET() {
  try {
    const promos = await fetchPublicPromos(async () => {
      const res = await queryDb(`
        SELECT id, name, code, description, discount_percentage,
               max_uses_per_creator, max_total_uses, start_date, ending_date
        FROM promos
        WHERE is_public = TRUE
          AND is_active = TRUE
          AND (start_date IS NULL OR start_date <= CURRENT_TIMESTAMP)
          AND (ending_date IS NULL OR ending_date >= CURRENT_TIMESTAMP)
        ORDER BY discount_percentage DESC, id DESC
      `);

      return res.rows.map((p: any) => ({
        id: Number(p.id),
        name: p.name,
        code: p.code,
        description: p.description || '',
        discount_percentage: Number(p.discount_percentage),
        max_uses_per_creator: Number(p.max_uses_per_creator || 1),
        ending_date: p.ending_date,
      }));
    });

    return NextResponse.json({
      success: true,
      promos: promos || [],
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch public promos' },
      { status: 500 }
    );
  }
}
