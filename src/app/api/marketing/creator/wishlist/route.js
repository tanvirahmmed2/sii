import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';
import { getCreatorSession } from 'src/lib/middleware/creator';

export async function GET(request) {
  try {
    const sessionCreator = await getCreatorSession(request);
    const { searchParams } = new URL(request.url);
    const creatorIdParam = searchParams.get('creatorId');

    const creatorId = creatorIdParam ? Number(creatorIdParam) : Number(sessionCreator?.id);
    if (!creatorId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized or missing creator ID', package_ids: [], wishlists: [] },
        { status: 401 }
      );
    }

    if (sessionCreator && Number(sessionCreator.id) !== creatorId) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const res = await queryDb(
      `SELECT w.id AS wishlist_id, 
              w.package_id, 
              w.created_at AS wishlisted_at,
              p.name, 
              p.slug, 
              p.tagline, 
              p.description,
              p.monthly_price_usd,
              p.yearly_price_usd,
              p.monthly_price_bdt,
              p.yearly_price_bdt,
              p.max_students,
              p.max_teachers,
              p.max_staff,
              p.max_storage_mb,
              p.max_websites,
              p.is_popular,
              p.is_active,
              p.features
       FROM wishlists w
       JOIN packages p ON w.package_id = p.id
       WHERE w.creator_id = $1
       ORDER BY w.id DESC
       LIMIT 1`,
      [creatorId]
    ).catch(() => ({ rows: [] }));

    const packageIds = res.rows.map((row) => Number(row.package_id));
    const wishlistedPackage = res.rows[0] || null;

    return NextResponse.json({
      success: true,
      wishlists: res.rows,
      wishlist: wishlistedPackage,
      package_ids: packageIds,
      count: res.rows.length,
    });
  } catch (error) {
    console.error('Wishlist GET API error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const sessionCreator = await getCreatorSession(request);
    const body = await request.json();
    const creatorId = Number(body.creatorId || sessionCreator?.id);
    const packageId = Number(body.packageId || body.id);
    const action = body.action || 'toggle'; // 'toggle' | 'add'

    if (!creatorId) {
      return NextResponse.json(
        { success: false, error: 'Please log in as a creator to save packages to your wishlist.' },
        { status: 401 }
      );
    }

    if (!packageId) {
      return NextResponse.json({ success: false, error: 'Package ID is required.' }, { status: 400 });
    }

    // Verify package exists
    const pkgCheck = await queryDb('SELECT id, name FROM packages WHERE id = $1', [packageId]);
    if (pkgCheck.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Package not found.' }, { status: 404 });
    }
    const pkgName = pkgCheck.rows[0].name;

    // Check existing wishlisted item for creator
    const existing = await queryDb(
      'SELECT id, package_id FROM wishlists WHERE creator_id = $1 LIMIT 1',
      [creatorId]
    );

    const isCurrentPackageWishlisted = existing.rows.length > 0 && Number(existing.rows[0].package_id) === packageId;

    if (action === 'toggle' && isCurrentPackageWishlisted) {
      // Toggle off: remove package from wishlist
      await queryDb('DELETE FROM wishlists WHERE creator_id = $1', [creatorId]);
      return NextResponse.json({
        success: true,
        isWishlisted: false,
        package_ids: [],
        packageId,
        message: `Removed "${pkgName}" from your wishlist.`,
      });
    }

    // Otherwise, enforce single package in wishlist:
    // Remove any previously wishlisted package and replace with the new one
    await queryDb('DELETE FROM wishlists WHERE creator_id = $1', [creatorId]);
    await queryDb(
      `INSERT INTO wishlists (creator_id, package_id)
       VALUES ($1, $2)`,
      [creatorId, packageId]
    );

    return NextResponse.json({
      success: true,
      isWishlisted: true,
      package_ids: [packageId],
      packageId,
      message: `Saved "${pkgName}" to your wishlist! (Only one package can be wishlisted at a time)`,
    });
  } catch (error) {
    console.error('Wishlist POST API error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const sessionCreator = await getCreatorSession(request);
    const { searchParams } = new URL(request.url);
    let creatorId = searchParams.get('creatorId') ? Number(searchParams.get('creatorId')) : sessionCreator?.id;
    let packageId = searchParams.get('packageId') ? Number(searchParams.get('packageId')) : null;
    let clearAll = searchParams.get('clear') === 'true' || searchParams.get('all') === 'true';

    if (!packageId && !clearAll) {
      const body = await request.json().catch(() => ({}));
      if (body.packageId || body.id) packageId = Number(body.packageId || body.id);
      if (body.creatorId) creatorId = Number(body.creatorId);
      if (body.clear || body.all) clearAll = true;
    }

    if (!creatorId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (clearAll || !packageId) {
      // Clear entire wishlist for creator
      await queryDb('DELETE FROM wishlists WHERE creator_id = $1', [creatorId]);
      return NextResponse.json({
        success: true,
        isWishlisted: false,
        package_ids: [],
        message: 'Wishlist cleared successfully.',
      });
    }

    await queryDb('DELETE FROM wishlists WHERE creator_id = $1 AND package_id = $2', [creatorId, packageId]);

    return NextResponse.json({
      success: true,
      isWishlisted: false,
      package_ids: [],
      message: 'Package removed from wishlist successfully.',
      packageId,
    });
  } catch (error) {
    console.error('Wishlist DELETE API error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
