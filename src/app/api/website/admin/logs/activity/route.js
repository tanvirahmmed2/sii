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
    const entityType = searchParams.get('entity_type');

    let sql = `
      SELECT 
        id, 
        user_id, 
        COALESCE(user_type, user_role, 'system') AS user_type, 
        COALESCE(user_name, 'System') AS user_name, 
        action, 
        entity_type, 
        entity_id, 
        details, 
        created_at 
      FROM activity_logs
    `;
    const params = [];

    if (entityType) {
      sql += ' WHERE LOWER(entity_type) = LOWER($1)';
      params.push(entityType);
    }

    sql += ' ORDER BY created_at DESC LIMIT 200';

    const result = await query(sql, params);

    return NextResponse.json({
      success: true,
      message: 'Activity logs retrieved successfully.',
      paylod: { logs: result.rows },
    }, { status: 200 });

  } catch (error) {
    console.error('Error fetching activity logs:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to retrieve activity logs.',
      error: 'Internal Server Error',
      paylod: null,
    }, { status: 500 });
  }
}
