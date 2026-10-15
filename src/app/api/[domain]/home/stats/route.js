import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator.js';

// GET: High-level public statistical counters for hero strip and showcases
export async function GET(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json(
        { success: false, error: 'Educational institution portal not found.' },
        { status: 404 }
      );
    }

    const statsRes = await queryDb(
      `SELECT
        (SELECT COUNT(*) FROM website_students WHERE website_id = $1)::int AS total_students,
        (SELECT COUNT(*) FROM website_teachers WHERE website_id = $1 AND is_active = true)::int AS total_teachers,
        (SELECT COUNT(*) FROM website_classes WHERE website_id = $1)::int AS total_classes,
        (SELECT COUNT(*) FROM website_clubs WHERE website_id = $1 AND is_active = true)::int AS total_clubs,
        (SELECT COUNT(*) FROM website_departments WHERE website_id = $1 AND is_active = true)::int AS total_departments`,
      [website.id]
    );

    const counts = statsRes.rows[0] || {
      total_students: 0,
      total_teachers: 0,
      total_classes: 0,
      total_clubs: 0,
      total_departments: 0,
    };

    const statsPayload = {
      totalStudents: counts.total_students,
      totalTeachers: counts.total_teachers,
      totalClasses: counts.total_classes,
      totalClubs: counts.total_clubs,
      totalDepartments: counts.total_departments,
    };

    return NextResponse.json({
      success: true,
      stats: statsPayload,
      payload: statsPayload,
      paylod: statsPayload,
    });
  } catch (error) {
    console.error('Error fetching home stats:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
