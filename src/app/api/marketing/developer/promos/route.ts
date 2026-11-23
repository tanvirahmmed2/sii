import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';
import { requireDeveloperPermission } from 'src/lib/middleware/developer';

export async function GET(request: any) {
  try {
    const auth = await requireDeveloperPermission(request, ['promos', 'packages', 'billing'], 'view');
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.error || auth.message || 'Unauthorized' },
        { status: auth.status || 401 }
      );
    }

    const res = await queryDb(`
      SELECT p.*,
             COALESCE(
               (SELECT COUNT(*)::int FROM promo_usages pu WHERE pu.promo_id = p.id),
               0
             ) AS total_usages_count,
             COALESCE(
               (SELECT SUM(pu.discount_amount) FROM promo_usages pu WHERE pu.promo_id = p.id),
               0.00
             ) AS total_discount_granted
      FROM promos p
      ORDER BY p.id DESC
    `);

    return NextResponse.json({
      success: true,
      promos: res.rows,
    });
  } catch (error: any) {
    console.error('Developer promos GET error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch promos.' },
      { status: 500 }
    );
  }
}

export async function POST(request: any) {
  try {
    const auth = await requireDeveloperPermission(request, ['promos', 'packages', 'billing'], 'create');
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.error || auth.message || 'Access denied' },
        { status: auth.status || 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const name = (body.name || '').toString().trim();
    const code = (body.code || '').toString().trim().toUpperCase();
    const description = (body.description || '').toString().trim();
    const discountPercentage = Math.min(100, Math.max(0, Number(body.discount_percentage || body.discount) || 0));
    const maxUsesPerCreator = Math.max(1, Number(body.max_uses_per_creator) || 1);
    const maxTotalUses = body.max_total_uses ? Math.max(1, Number(body.max_total_uses)) : null;
    const endingDate = body.ending_date ? new Date(body.ending_date) : new Date(Date.now() + 365 * 24 * 3600 * 1000);
    const startDate = body.start_date ? new Date(body.start_date) : new Date();
    const isActive = body.is_active !== undefined ? Boolean(body.is_active) : true;

    if (!name || !code) {
      return NextResponse.json(
        { success: false, error: 'Promo name and code are required.' },
        { status: 400 }
      );
    }

    if (discountPercentage <= 0) {
      return NextResponse.json(
        { success: false, error: 'Discount percentage must be greater than 0.' },
        { status: 400 }
      );
    }

    const existing = await queryDb(
      'SELECT id FROM promos WHERE UPPER(code) = UPPER($1) LIMIT 1',
      [code]
    );
    if (existing.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: `Promo code "${code}" already exists.` },
        { status: 400 }
      );
    }

    const res = await queryDb(
      `INSERT INTO promos (
        name, code, description, discount_percentage,
        max_uses_per_creator, max_total_uses, is_active,
        start_date, ending_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        name,
        code,
        description,
        discountPercentage,
        maxUsesPerCreator,
        maxTotalUses,
        isActive,
        startDate,
        endingDate,
      ]
    );

    return NextResponse.json(
      {
        success: true,
        message: `Promo code "${code}" created successfully.`,
        promo: res.rows[0],
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Developer promo POST error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create promo code.' },
      { status: 500 }
    );
  }
}

export async function PUT(request: any) {
  try {
    const auth = await requireDeveloperPermission(request, ['promos', 'packages', 'billing'], 'edit');
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.error || auth.message || 'Access denied' },
        { status: auth.status || 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const id = Number(body.id);
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Promo ID is required.' },
        { status: 400 }
      );
    }

    const existingRes = await queryDb('SELECT * FROM promos WHERE id = $1 LIMIT 1', [id]);
    if (existingRes.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Promo code not found.' },
        { status: 404 }
      );
    }
    const current = existingRes.rows[0];

    const name = body.name !== undefined ? String(body.name).trim() : current.name;
    const description = body.description !== undefined ? String(body.description).trim() : current.description;
    const discountPercentage = body.discount_percentage !== undefined
      ? Math.min(100, Math.max(0, Number(body.discount_percentage) || 0))
      : Number(current.discount_percentage);
    const maxUsesPerCreator = body.max_uses_per_creator !== undefined
      ? Math.max(1, Number(body.max_uses_per_creator) || 1)
      : Number(current.max_uses_per_creator);
    const maxTotalUses = body.max_total_uses !== undefined
      ? (body.max_total_uses ? Number(body.max_total_uses) : null)
      : current.max_total_uses;
    const isActive = body.is_active !== undefined ? Boolean(body.is_active) : Boolean(current.is_active);
    const endingDate = body.ending_date ? new Date(body.ending_date) : current.ending_date;

    const res = await queryDb(
      `UPDATE promos
       SET name = $1,
           description = $2,
           discount_percentage = $3,
           max_uses_per_creator = $4,
           max_total_uses = $5,
           is_active = $6,
           ending_date = $7,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $8
       RETURNING *`,
      [
        name,
        description,
        discountPercentage,
        maxUsesPerCreator,
        maxTotalUses,
        isActive,
        endingDate,
        id,
      ]
    );

    return NextResponse.json({
      success: true,
      message: 'Promo code updated successfully.',
      promo: res.rows[0],
    });
  } catch (error: any) {
    console.error('Developer promo PUT error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update promo code.' },
      { status: 500 }
    );
  }
}
