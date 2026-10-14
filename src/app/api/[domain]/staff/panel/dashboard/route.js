import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator';
import { getStaffSession } from 'src/lib/middleware/staff';

export const dynamic = 'force-dynamic';

export async function GET(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json({ success: false, error: 'Educational institution portal not found.' }, { status: 404 });
    }

    const staffSession = await getStaffSession(request);
    if (!staffSession) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Staff authentication required.' }, { status: 401 });
    }

    const websiteId = website.id;

    // Fetch dashboard KPIs and statistics safely
    const [
      studentsRes,
      teachersRes,
      staffRes,
      classesRes,
      admissionsRes,
      recentAdmRes,
      logsRes,
    ] = await Promise.allSettled([
      queryDb('SELECT COUNT(*) AS total FROM website_students WHERE website_id = $1', [websiteId]),
      queryDb('SELECT COUNT(*) AS total FROM website_teachers WHERE website_id = $1', [websiteId]),
      queryDb('SELECT COUNT(*) AS total FROM website_staffs WHERE website_id = $1', [websiteId]),
      queryDb('SELECT COUNT(*) AS total FROM website_classes WHERE website_id = $1', [websiteId]),
      queryDb(`
        SELECT 
          COUNT(*) AS total,
          COUNT(*) FILTER (WHERE status = 'pending') AS pending,
          COUNT(*) FILTER (WHERE status = 'approved') AS approved
        FROM website_student_admissions 
        WHERE website_id = $1
      `, [websiteId]),
      queryDb(`
        SELECT id, student_name, guardian_phone, status, created_at
        FROM website_student_admissions
        WHERE website_id = $1
        ORDER BY created_at DESC
        LIMIT 5
      `, [websiteId]),
      queryDb(`
        SELECT id, user_email, user_type, ip_address, login_time
        FROM website_staff_login_logs
        WHERE website_id = $1
        ORDER BY login_time DESC
        LIMIT 5
      `, [websiteId]),
    ]);

    const totalStudents = studentsRes.status === 'fulfilled' ? parseInt(studentsRes.value.rows[0]?.total || 0, 10) : 0;
    const totalTeachers = teachersRes.status === 'fulfilled' ? parseInt(teachersRes.value.rows[0]?.total || 0, 10) : 0;
    const totalStaff = staffRes.status === 'fulfilled' ? parseInt(staffRes.value.rows[0]?.total || 0, 10) : 0;
    const totalClasses = classesRes.status === 'fulfilled' ? parseInt(classesRes.value.rows[0]?.total || 0, 10) : 0;

    const admData = admissionsRes.status === 'fulfilled' ? admissionsRes.value.rows[0] : null;
    const admissions = {
      total: parseInt(admData?.total || 0, 10),
      pending: parseInt(admData?.pending || 0, 10),
      approved: parseInt(admData?.approved || 0, 10),
    };

    const recentAdmissions = recentAdmRes.status === 'fulfilled' ? recentAdmRes.value.rows : [];
    const loginLogs = logsRes.status === 'fulfilled' ? logsRes.value.rows : [];

    const stats = {
      totalStudents,
      totalTeachers,
      totalStaff,
      totalClasses,
      admissions,
      finance: {
        totalIncome: 0,
        totalExpenses: 0,
        netBalance: 0,
      },
      recentAdmissions,
      loginLogs,
    };

    return NextResponse.json({
      success: true,
      stats,
      payload: { stats },
      paylod: { stats },
    });
  } catch (error) {
    console.error('Error fetching staff dashboard statistics:', error);
    return NextResponse.json({ success: false, error: 'Internal server error fetching dashboard.' }, { status: 500 });
  }
}
