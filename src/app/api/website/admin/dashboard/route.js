import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { isAdmin } from '@/lib/auth';

export async function GET() {
  try {
    const authenticated = await isAdmin();
    if (!authenticated) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    // Parallel Database Queries for Maximum Performance
    const [
      studentsRes,
      teachersRes,
      staffRes,
      classesRes,
      eventsRes,
      noticesRes,
      admissionsCountRes,
      incomeRes,
      expenseRes,
      recentAdmissionsRes,
      loginLogsRes
    ] = await Promise.all([
      query('SELECT COUNT(*) as count FROM students').catch(() => ({ rows: [{ count: 0 }] })),
      query('SELECT COUNT(*) as count FROM teachers').catch(() => ({ rows: [{ count: 0 }] })),
      query('SELECT COUNT(*) as count FROM staff').catch(() => ({ rows: [{ count: 0 }] })),
      query('SELECT COUNT(*) as count FROM classes').catch(() => ({ rows: [{ count: 0 }] })),
      query('SELECT COUNT(*) as count FROM events').catch(() => ({ rows: [{ count: 0 }] })),
      query('SELECT COUNT(*) as count FROM notices').catch(() => ({ rows: [{ count: 0 }] })),
      query(`
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'pending' OR status IS NULL) as pending,
          COUNT(*) FILTER (WHERE status = 'approved') as approved
        FROM admissions
      `).catch(() => ({ rows: [{ total: 0, pending: 0, approved: 0 }] })),
      query('SELECT COALESCE(SUM(amount), 0) as total FROM incomes').catch(() => ({ rows: [{ total: 0 }] })),
      query('SELECT COALESCE(SUM(amount), 0) as total FROM expenses').catch(() => ({ rows: [{ total: 0 }] })),
      query(`
        SELECT id, student_name, guardian_phone, created_at, status 
        FROM admissions 
        ORDER BY id DESC 
        LIMIT 5
      `).catch(() => ({ rows: [] })),
      query(`
        SELECT id, user_type, user_email, ip_address, login_time, status 
        FROM login_logs 
        ORDER BY id DESC 
        LIMIT 5
      `).catch(() => ({ rows: [] }))
    ]);

    const stats = {
      totalStudents: parseInt(studentsRes.rows[0]?.count || '0', 10),
      totalTeachers: parseInt(teachersRes.rows[0]?.count || '0', 10),
      totalStaff: parseInt(staffRes.rows[0]?.count || '0', 10),
      totalClasses: parseInt(classesRes.rows[0]?.count || '0', 10),
      totalEvents: parseInt(eventsRes.rows[0]?.count || '0', 10),
      totalNotices: parseInt(noticesRes.rows[0]?.count || '0', 10),

      admissions: {
        total: parseInt(admissionsCountRes.rows[0]?.total || '0', 10),
        pending: parseInt(admissionsCountRes.rows[0]?.pending || '0', 10),
        approved: parseInt(admissionsCountRes.rows[0]?.approved || '0', 10),
      },

      finance: {
        totalIncome: parseFloat(incomeRes.rows[0]?.total || '0'),
        totalExpenses: parseFloat(expenseRes.rows[0]?.total || '0'),
        netBalance: parseFloat(incomeRes.rows[0]?.total || '0') - parseFloat(expenseRes.rows[0]?.total || '0')
      },

      recentAdmissions: recentAdmissionsRes.rows || [],
      loginLogs: loginLogsRes.rows || []
    };

    return NextResponse.json({
      success: true,
      payload: { stats },
      paylod: { stats },
      stats
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching admin dashboard metrics:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal Server Error'
    }, { status: 500 });
  }
}
