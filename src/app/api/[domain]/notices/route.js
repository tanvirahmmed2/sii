import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator';
import { isAdmin, isRegister, getAdminUser } from 'src/lib/middleware/auth';
import { recordActivityLog } from 'src/lib/database/logger';

// GET all notices
export async function GET(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json({ success: false, error: 'Tenant website not found' }, { status: 404 });
    }
    const websiteId = website.id;

    const result = await queryDb(
      'SELECT * FROM website_notices WHERE website_id = $1 ORDER BY is_pinned DESC, created_at DESC',
      [websiteId]
    ).catch(() =>
      queryDb('SELECT * FROM notices WHERE website_id = $1 ORDER BY is_pinned DESC, created_at DESC', [websiteId]).catch(() =>
        queryDb('SELECT * FROM notices ORDER BY is_pinned DESC, created_at DESC')
      )
    );

    const res_data_325 = { notices: result.rows };
    return NextResponse.json({
      success: true,
      message: res_data_325?.message || 'Successfully fetched data',
      paylod: res_data_325,
      payload: res_data_325
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching notices:', error);
    const res_err_682 = { error: 'Failed to retrieve notices. Internal server error.' };
    return NextResponse.json({
      success: false,
      message: res_err_682?.error || res_err_682?.message || 'An error occurred',
      error: res_err_682?.error || 'Internal Server Error',
      paylod: null
    }, { status: 500 });
  }
}

// POST create notice (Admin/Registrar only)
export async function POST(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json({ success: false, error: 'Tenant website not found' }, { status: 404 });
    }
    const websiteId = website.id;

    const authenticated = (await isAdmin()) || (await isRegister());
    if (!authenticated) {
      const res_err_1181 = { error: 'Unauthorized. Admins only.' };
      return NextResponse.json({
        success: false,
        message: res_err_1181?.error || res_err_1181?.message || 'An error occurred',
        error: res_err_1181?.error || 'Internal Server Error',
        paylod: null
      }, { status: 403 });
    }

    const { title, link, is_pinned = false } = await request.json();

    if (!title || !link) {
      const res_err_1607 = { error: 'Title and Google Drive Link are required.' };
      return NextResponse.json({
        success: false,
        message: res_err_1607?.error || res_err_1607?.message || 'An error occurred',
        error: res_err_1607?.error || 'Internal Server Error',
        paylod: null
      }, { status: 400 });
    }

    let result;
    try {
      result = await queryDb(
        `INSERT INTO website_notices (website_id, title, link, is_pinned) 
         VALUES ($1, $2, $3, $4) 
         RETURNING *`,
        [websiteId, title.trim(), link.trim(), !!is_pinned]
      );
    } catch {
      result = await queryDb(
        `INSERT INTO notices (title, link, is_pinned) 
         VALUES ($1, $2, $3) 
         RETURNING *`,
        [title.trim(), link.trim(), !!is_pinned]
      );
    }

    const createdNotice = result.rows[0];
    const sessionAdmin = await getAdminUser();

    // Log Activity
    await recordActivityLog({
      userId: sessionAdmin?.id || null,
      userType: 'admin',
      userName: sessionAdmin?.name || 'Administrator',
      action: 'CREATE_NOTICE',
      entityType: 'notice',
      entityId: createdNotice.id,
      details: `Published institutional notice: ${createdNotice.title}`
    });

    const res_data_1488 = { message: 'Notice created successfully.', notice: createdNotice };

    return NextResponse.json({
      success: true,
      message: res_data_1488?.message || 'Successfully fetched data',
      paylod: res_data_1488,
      payload: res_data_1488
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating notice:', error);
    const res_err_2585 = { error: 'Failed to create notice. Internal server error.' };
    return NextResponse.json({
      success: false,
      message: res_err_2585?.error || res_err_2585?.message || 'An error occurred',
      error: res_err_2585?.error || 'Internal Server Error',
      paylod: null
    }, { status: 500 });
  }
}

