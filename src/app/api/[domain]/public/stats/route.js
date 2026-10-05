import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator';

export async function GET(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json({ success: false, error: 'Tenant website not found' }, { status: 404 });
    }
    const websiteId = website.id;

    const [studentRes, teacherRes, classRes] = await Promise.all([
      queryDb('SELECT COUNT(*) as count FROM website_students WHERE website_id = $1', [websiteId]).catch(() =>
        queryDb('SELECT COUNT(*) as count FROM students WHERE website_id = $1', [websiteId]).catch(() => ({ rows: [{ count: 0 }] }))
      ),
      queryDb('SELECT COUNT(*) as count FROM website_teachers WHERE website_id = $1', [websiteId]).catch(() =>
        queryDb('SELECT COUNT(*) as count FROM teachers WHERE website_id = $1', [websiteId]).catch(() => ({ rows: [{ count: 0 }] }))
      ),
      queryDb('SELECT COUNT(*) as count FROM website_classes WHERE website_id = $1', [websiteId]).catch(() =>
        queryDb('SELECT COUNT(*) as count FROM classes WHERE website_id = $1', [websiteId]).catch(() => ({ rows: [{ count: 0 }] }))
      ),
    ]);

    return NextResponse.json({
      success: true,
      payload: {
        totalStudents: parseInt(studentRes.rows[0]?.count || '0', 10),
        totalTeachers: parseInt(teacherRes.rows[0]?.count || '0', 10),
        totalClasses: parseInt(classRes.rows[0]?.count || '0', 10),
      }
    });
  } catch (error) {
    console.error('Error fetching public stats:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal Server Error'
    }, { status: 500 });
  }
}

