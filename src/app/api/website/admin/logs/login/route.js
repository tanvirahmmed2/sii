import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { isAdmin } from '@/lib/auth';

export async function GET(request) {
  try {
    const authenticated = await isAdmin();
    if (!authenticated) {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized. Admins only.',
        error: 'Unauthorized',
        paylod: null,
      }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const userType = searchParams.get('user_type');

    let sql = `
      SELECT 
        id, 
        user_id, 
        COALESCE(user_type, user_role, 'user') AS user_type, 
        COALESCE(name, email, 'User') AS name, 
        email, 
        ip_address, 
        user_agent, 
        COALESCE(status, 'success') AS status, 
        created_at 
      FROM login_logs
    `;
    const params = [];

    if (userType && ['admin', 'teacher', 'student', 'staff'].includes(userType)) {
      sql += ' WHERE (LOWER(user_type) = LOWER($1) OR LOWER(user_role) = LOWER($1))';
      params.push(userType);
    }

    sql += ' ORDER BY created_at DESC LIMIT 200';

    const result = await query(sql, params);

    return NextResponse.json({
      success: true,
      message: 'Login logs retrieved successfully.',
      paylod: { logs: result.rows },
    }, { status: 200 });

  } catch (error) {
    console.error('Error fetching login logs:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to retrieve login logs.',
      error: 'Internal Server Error',
      paylod: null,
    }, { status: 500 });
  }
}
