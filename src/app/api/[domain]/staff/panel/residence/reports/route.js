import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { verifyResidenceStaffAccess } from 'src/lib/middleware/residence-auth.js';

// GET: Comprehensive residence vacancy and occupancy reports
export async function GET(request, context) {
  try {
    const auth = await verifyResidenceStaffAccess(request, context, 'view');
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { website } = auth;
    const { searchParams } = new URL(request.url);
    const hallId = searchParams.get('hall_id');

    // 1. Overview KPIs
    const kpiRes = await queryDb(
      `SELECT
         COUNT(DISTINCT h.id)::int AS total_halls,
         COUNT(DISTINCT r.id)::int AS total_rooms,
         COUNT(DISTINCT s.id)::int AS total_capacity,
         COUNT(DISTINCT CASE WHEN s.status = 'allocated' THEN s.id END)::int AS occupied_seats,
         COUNT(DISTINCT CASE WHEN s.status = 'available' THEN s.id END)::int AS vacant_seats,
         COUNT(DISTINCT CASE WHEN s.status = 'maintenance' THEN s.id END)::int AS maintenance_seats,
         COUNT(DISTINCT a.id)::int AS total_allocations_all_time,
         COALESCE(SUM(CASE WHEN a.status = 'active' THEN a.fee_monthly ELSE 0 END), 0)::numeric(12,2) AS monthly_revenue
       FROM website_halls h
       LEFT JOIN website_hall_rooms r ON h.id = r.hall_id
       LEFT JOIN website_hall_room_seats s ON h.id = s.hall_id
       LEFT JOIN website_hall_seat_allocations a ON h.id = a.hall_id AND a.status = 'active'
       WHERE h.website_id = $1`,
      [website.id]
    );

    // 2. Hall Breakdown
    const hallBreakdownRes = await queryDb(
      `SELECT
         h.id, h.name, h.code, h.gender, h.provost_name, h.contact_number, h.total_floors,
         COUNT(DISTINCT r.id)::int AS total_rooms,
         COUNT(DISTINCT s.id)::int AS total_seats,
         COUNT(DISTINCT CASE WHEN s.status = 'allocated' THEN s.id END)::int AS occupied_seats,
         COUNT(DISTINCT CASE WHEN s.status = 'available' THEN s.id END)::int AS vacant_seats,
         COUNT(DISTINCT CASE WHEN s.status = 'maintenance' THEN s.id END)::int AS maintenance_seats,
         CASE
           WHEN COUNT(DISTINCT s.id) > 0 THEN
             ROUND((COUNT(DISTINCT CASE WHEN s.status = 'allocated' THEN s.id END)::numeric / COUNT(DISTINCT s.id)::numeric) * 100, 1)
           ELSE 0
         END AS occupancy_rate
       FROM website_halls h
       LEFT JOIN website_hall_rooms r ON h.id = r.hall_id
       LEFT JOIN website_hall_room_seats s ON h.id = s.hall_id
       WHERE h.website_id = $1
       GROUP BY h.id
       ORDER BY h.name ASC`,
      [website.id]
    );

    // 3. Room Details for Vacancy Inspector
    const roomConditions = ['r.website_id = $1'];
    const roomValues = [website.id];
    if (hallId) {
      roomConditions.push('r.hall_id = $2');
      roomValues.push(hallId);
    }

    const roomsVacancyRes = await queryDb(
      `SELECT
         r.id, r.room_number, r.floor_number, r.room_type, r.capacity, r.rent_monthly,
         h.id AS hall_id, h.name AS hall_name, h.gender AS hall_gender,
         COUNT(s.id)::int AS total_seats,
         COUNT(CASE WHEN s.status = 'allocated' THEN s.id END)::int AS occupied_seats,
         COUNT(CASE WHEN s.status = 'available' THEN s.id END)::int AS vacant_seats,
         COUNT(CASE WHEN s.status = 'maintenance' THEN s.id END)::int AS maintenance_seats
       FROM website_hall_rooms r
       JOIN website_halls h ON r.hall_id = h.id
       LEFT JOIN website_hall_room_seats s ON r.id = s.room_id
       WHERE ${roomConditions.join(' AND ')}
       GROUP BY r.id, h.id, h.name, h.gender
       ORDER BY h.name ASC, r.floor_number ASC, r.room_number ASC`,
      roomValues
    );

    return NextResponse.json({
      success: true,
      payload: {
        kpi: kpiRes.rows[0] || {},
        hallBreakdown: hallBreakdownRes.rows,
        rooms: roomsVacancyRes.rows,
      },
    });
  } catch (error) {
    console.error('Error generating residence report:', error);
    return NextResponse.json({ success: false, error: 'Failed to generate report.' }, { status: 500 });
  }
}
