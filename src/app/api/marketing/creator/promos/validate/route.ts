import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';
import { getCreatorSession } from 'src/lib/middleware/creator';

export async function POST(request: any) {
  try {
    const sessionCreator = await getCreatorSession(request);
    const body = await request.json().catch(() => ({}));
    const rawCode = (body.code || body.promoCode || '').toString().trim();
    const creatorId = Number(body.creatorId || sessionCreator?.id);
    const packageId = body.packageId ? Number(body.packageId) : null;
    const billingCycle = String(body.billingCycle || 'monthly').toLowerCase() === 'yearly' ? 'yearly' : 'monthly';
    const currency = String(body.currency || 'BDT').toUpperCase();

    if (!rawCode) {
      return NextResponse.json(
        { success: false, error: 'Promo code is required.' },
        { status: 400 }
      );
    }

    const promoRes = await queryDb(
      `SELECT * FROM promos 
       WHERE UPPER(code) = UPPER($1) 
       LIMIT 1`,
      [rawCode]
    );

    if (promoRes.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid promo code. Please check and try again.' },
        { status: 404 }
      );
    }

    const promo = promoRes.rows[0];

    if (!promo.is_active) {
      return NextResponse.json(
        { success: false, error: 'This promo code is currently disabled.' },
        { status: 400 }
      );
    }

    const now = new Date();
    if (promo.start_date && new Date(promo.start_date) > now) {
      return NextResponse.json(
        { success: false, error: 'This promo code campaign has not started yet.' },
        { status: 400 }
      );
    }

    if (promo.ending_date && new Date(promo.ending_date) < now) {
      return NextResponse.json(
        { success: false, error: 'This promo code has expired.' },
        { status: 400 }
      );
    }

    if (promo.max_total_uses !== null && promo.max_total_uses !== undefined) {
      const totalCountRes = await queryDb(
        `SELECT COUNT(*)::int AS count FROM promo_usages WHERE promo_id = $1`,
        [promo.id]
      );
      const totalCount = Number(totalCountRes.rows[0]?.count || 0);
      if (totalCount >= Number(promo.max_total_uses)) {
        return NextResponse.json(
          { success: false, error: 'This promo code has reached its maximum global usage limit.' },
          { status: 400 }
        );
      }
    }

    if (creatorId) {
      const userCountRes = await queryDb(
        `SELECT COUNT(*)::int AS count FROM promo_usages WHERE promo_id = $1 AND creator_id = $2`,
        [promo.id, creatorId]
      );
      const userCount = Number(userCountRes.rows[0]?.count || 0);
      const maxPerCreator = Number(promo.max_uses_per_creator || 1);
      if (userCount >= maxPerCreator) {
        return NextResponse.json(
          {
            success: false,
            error: `You have reached the maximum allowed limit (${maxPerCreator} time${maxPerCreator > 1 ? 's' : ''}) for this promo code.`,
          },
          { status: 400 }
        );
      }
    }

    let baseAmount = 0;
    let discountAmount = 0;
    let finalAmount = 0;

    if (packageId) {
      const pkgRes = await queryDb(
        `SELECT * FROM packages WHERE id = $1 AND is_active = TRUE LIMIT 1`,
        [packageId]
      );
      if (pkgRes.rows.length > 0) {
        const pkg = pkgRes.rows[0];
        const isYearly = billingCycle === 'yearly';
        const currKey = `${currency.toLowerCase()}_per_month`;
        const monthlyRate = Number(pkg[currKey] ?? pkg.bdt_per_month ?? 0);
        baseAmount = isYearly ? monthlyRate * 12 : monthlyRate;
        const discountPct = Number(promo.discount_percentage || 0);
        discountAmount = Number(((baseAmount * discountPct) / 100).toFixed(2));
        finalAmount = Math.max(0, Number((baseAmount - discountAmount).toFixed(2)));
      }
    }

    return NextResponse.json({
      success: true,
      promo: {
        id: Number(promo.id),
        name: promo.name,
        code: promo.code,
        description: promo.description || '',
        discount_percentage: Number(promo.discount_percentage),
        max_uses_per_creator: Number(promo.max_uses_per_creator || 1),
        ending_date: promo.ending_date,
      },
      baseAmount,
      discountAmount,
      finalAmount,
      message: `Promo code "${promo.code}" applied! ${Number(promo.discount_percentage)}% discount applied.`,
    });
  } catch (error: any) {
    console.error('Promo validate error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to validate promo code.' },
      { status: 500 }
    );
  }
}
