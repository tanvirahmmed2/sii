import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator.js';

export async function GET(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json(
        { success: false, error: 'Educational institution portal not found.' },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const facilityType = searchParams.get('facility_type')?.trim();

    let query = `
      SELECT id, title, facility_type, description, image, image_id, icon, order_no, created_at, updated_at
      FROM website_facilities
      WHERE website_id = $1 AND is_active = true
    `;
    const params = [website.id];

    if (facilityType && facilityType !== 'all') {
      params.push(facilityType);
      query += ` AND facility_type = $${params.length}`;
    }

    query += ` ORDER BY order_no ASC, id ASC`;

    const result = await queryDb(query, params);

    return NextResponse.json({
      success: true,
      facilities: result.rows,
      payload: {
        facilities: result.rows,
      },
    });
  } catch (error) {
    console.error('Error fetching public facilities:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch facilities.' },
      { status: 500 }
    );
  }
}
