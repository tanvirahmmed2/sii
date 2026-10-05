import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator';
import { isAdmin, getAdminUser } from 'src/lib/middleware/auth';
import { recordActivityLog } from 'src/lib/database/logger';

// GET all subjects
export async function GET(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json({ success: false, error: 'Tenant website not found' }, { status: 404 });
    }
    const websiteId = website.id;

    const result = await queryDb(
      'SELECT * FROM website_subjects WHERE website_id = $1 ORDER BY name ASC',
      [websiteId]
    ).catch(() =>
      queryDb('SELECT * FROM subjects WHERE website_id = $1 ORDER BY name ASC', [websiteId]).catch(() =>
        queryDb('SELECT * FROM subjects ORDER BY name ASC')
      )
    );

    const res_data_304 = { subjects: result.rows };
    return NextResponse.json({
      success: true,
      message: res_data_304?.message || 'Successfully fetched data',
      paylod: res_data_304,
      payload: res_data_304
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching subjects:', error);
    const res_err_663 = { error: 'Failed to retrieve subjects. Internal server error.' };
    return NextResponse.json({
      success: false,
      message: res_err_663?.error || res_err_663?.message || 'An error occurred',
      error: res_err_663?.error || 'Internal Server Error',
      paylod: null
    }, { status: 500 });
  }
}

// POST create subject (Admin only)
export async function POST(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json({ success: false, error: 'Tenant website not found' }, { status: 404 });
    }
    const websiteId = website.id;

    const authenticated = await isAdmin();
    if (!authenticated) {
      const res_err_1164 = { error: 'Unauthorized. Admins only.' };
      return NextResponse.json({
        success: false,
        message: res_err_1164?.error || res_err_1164?.message || 'An error occurred',
        error: res_err_1164?.error || 'Internal Server Error',
        paylod: null
      }, { status: 403 });
    }

    const { name, code } = await request.json();

    if (!name || !code) {
      const res_err_1569 = { error: 'Subject Name and Subject Code are required.' };
      return NextResponse.json({
        success: false,
        message: res_err_1569?.error || res_err_1569?.message || 'An error occurred',
        error: res_err_1569?.error || 'Internal Server Error',
        paylod: null
      }, { status: 400 });
    }

    // Check unique constraints
    const duplicateCheck = await queryDb(
      'SELECT name, code FROM website_subjects WHERE website_id = $1 AND (name = $2 OR code = $3)',
      [websiteId, name.trim(), code.trim().toUpperCase()]
    ).catch(() =>
      queryDb('SELECT name, code FROM subjects WHERE name = $1 OR code = $2', [name.trim(), code.trim().toUpperCase()])
    );

    if (duplicateCheck.rows.length > 0) {
      const match = duplicateCheck.rows[0];
      if (match.name === name.trim()) {
        const res_err_2240 = { error: 'A subject with this name already exists in this institution.' };
        return NextResponse.json({
          success: false,
          message: res_err_2240.error,
          error: res_err_2240.error,
          paylod: null
        }, { status: 400 });
      }
      if (match.code === code.trim().toUpperCase()) {
        const res_err_2640 = { error: 'A subject with this code already exists in this institution.' };
        return NextResponse.json({
          success: false,
          message: res_err_2640.error,
          error: res_err_2640.error,
          paylod: null
        }, { status: 400 });
      }
    }

    let newSubject;
    try {
      newSubject = await queryDb(
        `INSERT INTO website_subjects (website_id, name, code) 
         VALUES ($1, $2, $3) 
         RETURNING *`,
        [websiteId, name.trim(), code.trim().toUpperCase()]
      );
    } catch {
      newSubject = await queryDb(
        `INSERT INTO subjects (name, code) 
         VALUES ($1, $2) 
         RETURNING *`,
        [name.trim(), code.trim().toUpperCase()]
      );
    }

    const createdSubject = newSubject.rows[0];
    const sessionAdmin = await getAdminUser();

    // Log Activity
    await recordActivityLog({
      userId: sessionAdmin?.id || null,
      userType: 'admin',
      userName: sessionAdmin?.name || 'Administrator',
      action: 'CREATE_SUBJECT',
      entityType: 'subject',
      entityId: createdSubject.id,
      details: `Created subject: ${createdSubject.name} (${createdSubject.code})`
    });

    const res_data_2053 = { message: 'Subject created successfully.', subject: createdSubject };

    return NextResponse.json({
      success: true,
      message: res_data_2053?.message || 'Successfully fetched data',
      paylod: res_data_2053,
      payload: res_data_2053
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating subject:', error);
    const res_err_3621 = { error: 'Failed to create subject. Internal server error.' };
    return NextResponse.json({
      success: false,
      message: res_err_3621?.error || res_err_3621?.message || 'An error occurred',
      error: res_err_3621?.error || 'Internal Server Error',
      paylod: null
    }, { status: 500 });
  }
}

