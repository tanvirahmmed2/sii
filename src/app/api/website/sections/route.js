import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { isAdmin, getAdminUser } from '@/lib/auth';
import { recordActivityLog } from '@/lib/logger';

// GET sections
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('class_id');

    let sql = `
      SELECT s.*, c.name AS class_name, c.code AS class_code 
      FROM sections s 
      JOIN classes c ON s.class_id = c.id
    `;
    let params = [];

    if (classId) {
      sql += ' WHERE s.class_id = $1';
      params.push(classId);
    }

    sql += ' ORDER BY c.numeric_name ASC, s.name ASC';

    const result = await query(sql, params);
    const res_data_699 = { sections: result.rows };
      return NextResponse.json({
        success: true,
        message: res_data_699?.message || 'Successfully fecthed data',
        paylod: res_data_699
      }, { status: 200 });
  } catch (error) {
    console.error('Error fetching sections:', error);
    const res_err_1058 = { error: 'Failed to retrieve sections. Internal server error.' };
      return NextResponse.json({
        success: false,
        message: res_err_1058?.error || res_err_1058?.message || 'An error occurred',
        error: res_err_1058?.error || 'Internal Server Error',
        paylod: null
      }, { status: 500 });
  }
}

// POST create section under class (Admin only)
export async function POST(request) {
  try {
    const authenticated = await isAdmin();
    if (!authenticated) {
      const res_err_1575 = { error: 'Unauthorized. Admins only.' };
      return NextResponse.json({
        success: false,
        message: res_err_1575?.error || res_err_1575?.message || 'An error occurred',
        error: res_err_1575?.error || 'Internal Server Error',
        paylod: null
      }, { status: 403 });
    }

    const { class_id, name, capacity, room_number } = await request.json();

    if (!class_id || !name) {
      const res_err_2011 = { error: 'Class ID and Section Name are required.' };
      return NextResponse.json({
        success: false,
        message: res_err_2011?.error || res_err_2011?.message || 'An error occurred',
        error: res_err_2011?.error || 'Internal Server Error',
        paylod: null
      }, { status: 400 });
    }

    const capVal = capacity !== undefined ? parseInt(capacity, 10) : 40;
    if (isNaN(capVal)) {
      const res_err_2451 = { error: 'Capacity must be a valid number.' };
      return NextResponse.json({
        success: false,
        message: res_err_2451?.error || res_err_2451?.message || 'An error occurred',
        error: res_err_2451?.error || 'Internal Server Error',
        paylod: null
      }, { status: 400 });
    }

    // Verify class exists
    const classCheck = await query('SELECT id FROM classes WHERE id = $1', [class_id]);
    if (classCheck.rows.length === 0) {
      const res_err_2941 = { error: 'Target class not found.' };
      return NextResponse.json({
        success: false,
        message: res_err_2941?.error || res_err_2941?.message || 'An error occurred',
        error: res_err_2941?.error || 'Internal Server Error',
        paylod: null
      }, { status: 404 });
    }

    // Verify unique section name under the same class
    const duplicateCheck = await query(
      'SELECT id FROM sections WHERE class_id = $1 AND LOWER(name) = LOWER($2)',
      [class_id, name.trim()]
    );

    if (duplicateCheck.rows.length > 0) {
      const res_err_3523 = { error: 'A section with this name already exists under the selected class.' };
      return NextResponse.json({
        success: false,
        message: res_err_3523?.error || res_err_3523?.message || 'An error occurred',
        error: res_err_3523?.error || 'Internal Server Error',
        paylod: null
      }, { status: 400 });
    }

    const newSection = await query(
      `INSERT INTO sections (class_id, name, capacity, room_number) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
      [class_id, name.trim(), capVal, room_number ? room_number.trim() : null]
    );

    const createdSection = newSection.rows[0];
    const sessionAdmin = await getAdminUser();

    // Log Activity
    await recordActivityLog({
      userId: sessionAdmin?.id || null,
      userType: 'admin',
      userName: sessionAdmin?.name || 'Administrator',
      action: 'CREATE_SECTION',
      entityType: 'section',
      entityId: createdSection.id,
      details: `Created section ${createdSection.name} for class ID #${class_id}`
    });

    const res_data_2784 = { message: 'Section created successfully.', section: createdSection };

      return NextResponse.json({
        success: true,
        message: res_data_2784?.message || 'Successfully fecthed data',
        paylod: res_data_2784
      }, { status: 201 });
  } catch (error) {
    console.error('Error creating section:', error);
    const res_err_4588 = { error: 'Failed to create section. Internal server error.' };
      return NextResponse.json({
        success: false,
        message: res_err_4588?.error || res_err_4588?.message || 'An error occurred',
        error: res_err_4588?.error || 'Internal Server Error',
        paylod: null
      }, { status: 500 });
  }
}
