import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator';

// GET public staff roster & modules for the website
export async function GET(request, context) {
  try {
    const resolvedParams = await context?.params;
    const website = await resolveWebsiteFromRequest(request, { params: resolvedParams });

    if (!website) {
      return NextResponse.json(
        { success: false, error: 'Campus portal website not found.' },
        { status: 404 }
      );
    }

    // 1. Query staff from website_staffs
    const staffsResult = await queryDb(
      `SELECT 
        id, name, email, username, number, address, image, created_at, is_active, is_registered
      FROM website_staffs 
      WHERE website_id = $1 AND is_active = TRUE
      ORDER BY name ASC`,
      [website.id]
    );

    // 2. Query all permissions for these staffs
    const permsResult = await queryDb(
      `SELECT wmp.staff_id, wm.slug AS module_slug, wmp.can_view, wmp.can_create, wmp.can_edit, wmp.can_delete,
              wm.name AS module_name
       FROM website_modules_permissions wmp
       JOIN website_modules wm ON wm.id = wmp.website_module_id
       WHERE wmp.website_id = $1 AND wmp.can_view = TRUE AND wm.is_active = TRUE`,
      [website.id]
    );

    const staffPermsMap = {};
    for (const p of permsResult.rows) {
      if (!staffPermsMap[p.staff_id]) {
        staffPermsMap[p.staff_id] = [];
      }
      staffPermsMap[p.staff_id].push({
        slug: p.module_slug,
        name: p.module_name,
        canView: p.can_view,
        canCreate: p.can_create,
        canEdit: p.can_edit,
        canDelete: p.can_delete,
      });
    }

    const enrichedStaff = staffsResult.rows.map((s) => ({
      ...s,
      modules: staffPermsMap[s.id] || [],
    }));

    return NextResponse.json(
      {
        success: true,
        message: 'Staff members retrieved successfully',
        paylod: {
          staff: enrichedStaff,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching public staff:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to retrieve staff members.',
        paylod: { staff: [] },
      },
      { status: 500 }
    );
  }
}
