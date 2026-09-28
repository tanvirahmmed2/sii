import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

// GET public staff list & available roles
export async function GET() {
  try {
    // 1. Query staff from staffs table
    const staffsResult = await query(`
      SELECT 
        id, name, email, username, COALESCE(phone, number) AS phone, number, role, address, image, created_at
      FROM staffs 
      WHERE is_active = TRUE OR is_registered = TRUE
      ORDER BY name ASC
    `);

    // 2. Query distinct roles from staffs table
    const rolesResult = await query(`
      SELECT DISTINCT role 
      FROM staffs 
      WHERE (is_active = TRUE OR is_registered = TRUE) AND role IS NOT NULL AND role <> ''
    `);

    const rolesList = rolesResult.rows.map(r => r.role);
    
    // Ensure default common roles exist if list is small
    const defaultRoles = ['cashier', 'registrar', 'staff'];
    const mergedRoles = Array.from(new Set([...rolesList, ...defaultRoles]));

    return NextResponse.json({
      success: true,
      message: 'Staff members retrieved successfully',
      paylod: { 
        staff: staffsResult.rows,
        roles: mergedRoles
      }
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching public staff:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to retrieve staff members.',
      paylod: { 
        staff: [],
        roles: ['cashier', 'registrar', 'staff']
      }
    }, { status: 500 });
  }
}
