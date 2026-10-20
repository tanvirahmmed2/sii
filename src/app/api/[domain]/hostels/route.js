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
    const type = searchParams.get('type');

    let query = `
      SELECT 
        h.id, 
        h.name, 
        h.type, 
        h.type AS gender, 
        h.warden_name, 
        h.warden_phone, 
        h.warden_email, 
        h.address, 
        h.address AS location, 
        h.capacity, 
        h.capacity AS total_seats, 
        h.monthly_fee, 
        h.status,
        (SELECT COUNT(*)::int FROM website_hostel_rooms r WHERE r.hostel_id = h.id AND r.website_id = $1) AS total_room,
        (SELECT COUNT(*)::int FROM website_hostel_seats s WHERE s.hostel_id = h.id AND s.website_id = $1 AND s.status = 'occupied') AS allocated_seats,
        (SELECT COUNT(*)::int FROM website_hostel_seats s WHERE s.hostel_id = h.id AND s.website_id = $1 AND s.status = 'available') AS available_seats
      FROM website_hostels h
      WHERE h.website_id = $1 AND (h.status = 'active' OR h.status IS NULL)
    `;
    const params = [website.id];

    if (type && type !== 'all') {
      params.push(type);
      query += ` AND h.type = $${params.length}`;
    }

    query += ` ORDER BY h.id ASC`;

    const result = await queryDb(query, params);

    return NextResponse.json({
      success: true,
      hostels: result.rows,
      payload: {
        hostels: result.rows,
      },
    });
  } catch (error) {
    console.error('Error in home/hostels API:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch hostels.' },
      { status: 500 }
    );
  }
}
