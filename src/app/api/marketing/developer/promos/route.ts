import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';
import { requireDeveloperPermission } from 'src/lib/middleware/developer';
import { invalidatePromosCache } from 'src/lib/redis/redisClient';

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

    const usagesRes = await queryDb(`
      SELECT pu.id, pu.promo_id, pu.creator_id, pu.payment_id, pu.purchase_id,
             pu.discount_amount, pu.used_at,
             p.code AS promo_code, p.name AS promo_name, p.discount_percentage,
             c.name AS creator_name, c.email AS creator_email, c.phone AS creator_phone,
             pay.invoice_no, pay.amount AS payment_amount, pay.currency
      FROM promo_usages pu
      JOIN promos p ON pu.promo_id = p.id
      JOIN creators c ON pu.creator_id = c.id
      LEFT JOIN payments pay ON pu.payment_id = pay.id
      ORDER BY pu.used_at DESC, pu.id DESC
      LIMIT 250
    `);

    const promos = res.rows || [];
    const usages = usagesRes.rows || [];

    const stats = {
      totalPromos: promos.length,
      activePromos: promos.filter((p: any) => p.is_active).length,
      publicPromos: promos.filter((p: any) => p.is_public).length,
      privatePromos: promos.filter((p: any) => !p.is_public).length,
      totalUsages: usages.length,
      totalDiscountGranted: promos.reduce((sum: number, p: any) => sum + Number(p.total_discount_granted || 0), 0),
    };

    return NextResponse.json({
      success: true,
      promos,
      usages,
      stats,
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
    const isPublic = body.is_public !== undefined ? Boolean(body.is_public) : false;
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
        max_uses_per_creator, max_total_uses, is_public, is_active,
        start_date, ending_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        name,
        code,
        description,
        discountPercentage,
        maxUsesPerCreator,
        maxTotalUses,
        isPublic,
        isActive,
        startDate,
        endingDate,
      ]
    );

    await invalidatePromosCache();

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
    const isPublic = body.is_public !== undefined ? Boolean(body.is_public) : Boolean(current.is_public);
    const isActive = body.is_active !== undefined ? Boolean(body.is_active) : Boolean(current.is_active);
    const endingDate = body.ending_date ? new Date(body.ending_date) : current.ending_date;

    const res = await queryDb(
      `UPDATE promos
       SET name = $1,
           description = $2,
           discount_percentage = $3,
           max_uses_per_creator = $4,
           max_total_uses = $5,
           is_public = $6,
           is_active = $7,
           ending_date = $8,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $9
       RETURNING *`,
      [
        name,
        description,
        discountPercentage,
        maxUsesPerCreator,
        maxTotalUses,
        isPublic,
        isActive,
        endingDate,
        id,
      ]
    );

    await invalidatePromosCache();

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

export async function PATCH(request: any) {
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
      return NextResponse.json({ success: false, error: 'Promo ID is required.' }, { status: 400 });
    }

    const existingRes = await queryDb('SELECT * FROM promos WHERE id = $1 LIMIT 1', [id]);
    if (existingRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Promo code not found.' }, { status: 404 });
    }
    const current = existingRes.rows[0];

    const nextActive = body.is_active !== undefined
      ? Boolean(body.is_active)
      : (body.toggleActive ? !current.is_active : current.is_active);

    const nextPublic = body.is_public !== undefined
      ? Boolean(body.is_public)
      : (body.togglePublic ? !current.is_public : current.is_public);

    const res = await queryDb(
      `UPDATE promos
       SET is_active = $1, is_public = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [nextActive, nextPublic, id]
    );

    await invalidatePromosCache();

    return NextResponse.json({
      success: true,
      message: 'Promo status updated successfully.',
      promo: res.rows[0],
    });
  } catch (error: any) {
    console.error('Developer promo PATCH error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update promo status.' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: any) {
  try {
    const auth = await requireDeveloperPermission(request, ['promos', 'packages', 'billing'], 'delete');
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.error || auth.message || 'Access denied' },
        { status: auth.status || 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    let id = searchParams.get('id');
    if (!id) {
      const body = await request.json().catch(() => ({}));
      id = body.id;
    }
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Promo ID is required.' },
        { status: 400 }
      );
    }

    const res = await queryDb('DELETE FROM promos WHERE id = $1 RETURNING id, code, name', [Number(id)]);
    if (res.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Promo code not found or already deleted.' },
        { status: 404 }
      );
    }

    await invalidatePromosCache();

    return NextResponse.json({
      success: true,
      message: `Promo code "${res.rows[0].code}" deleted successfully.`,
      deleted: res.rows[0],
    });
  } catch (error: any) {
    console.error('Developer promo DELETE error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete promo code.' },
      { status: 500 }
    );
  }
}
