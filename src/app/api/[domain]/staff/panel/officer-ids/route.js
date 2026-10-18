import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { queryDb } from 'src/lib/database/db.js';
import { resolveWebsiteFromRequest, hasTenantModuleAllowance } from 'src/lib/middleware/websiteResolver.js';
import { getStaffSession, hasStaffModulePermission } from 'src/lib/middleware/staff.js';

/**
 * Validates staff authorization to manage officer ID cards for this tenant website.
 */
async function verifyOfficerStaffAccess(request, context, action = 'view') {
  const website = await resolveWebsiteFromRequest(request, context);
  if (!website) {
    return { error: 'Educational institution portal not found.', status: 404 };
  }

  const hasAllowance =
    (await hasTenantModuleAllowance(website, 'officers')) ||
    (await hasTenantModuleAllowance(website, 'staff-payroll')) ||
    (await hasTenantModuleAllowance(website, 'sis'));

  if (!hasAllowance) {
    return {
      error: "The 'officers' / 'staff-payroll' module is not included in this institution's subscription plan.",
      status: 403,
      website,
    };
  }

  const staffSession = await getStaffSession(request);
  if (!staffSession) {
    return { error: 'Unauthorized: Staff credentials required.', status: 401 };
  }

  const staffWebsiteId =
    staffSession?.website_id ||
    staffSession?.websiteId ||
    staffSession?.staff?.websiteId ||
    staffSession?.staff?.website_id;

  if (staffSession && staffWebsiteId && String(staffWebsiteId) !== String(website.id)) {
    return { error: 'Forbidden: Cross-tenant access denied.', status: 403 };
  }

  const hasPerm =
    hasStaffModulePermission(staffSession, 'officers', action) ||
    hasStaffModulePermission(staffSession, 'staff-payroll', action) ||
    hasStaffModulePermission(staffSession, 'sis', action);

  if (!hasPerm) {
    return {
      error: `Forbidden: Insufficient privileges to ${action} officer ID records.`,
      status: 403,
      website,
      staffSession,
    };
  }

  return {
    website,
    staffSession,
    staff: staffSession.staff || staffSession.user,
    allowed: true,
  };
}

// GET: List issued officer ID cards with rich officer JOIN metadata
export async function GET(request, context) {
  try {
    const auth = await verifyOfficerStaffAccess(request, context, 'view');
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { website } = auth;
    const { searchParams } = new URL(request.url);

    const id = searchParams.get('id');
    const officerId = searchParams.get('officer_id');
    const department = searchParams.get('department');
    const designation = searchParams.get('designation');
    const status = searchParams.get('status') || searchParams.get('card_status');
    const search = searchParams.get('search')?.trim();
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
    const offset = (page - 1) * limit;

    const baseSelect = `
      SELECT oid.id, oid.website_id, oid.officer_id, oid.card_number,
             oid.template_id, oid.department, oid.designation,
             oid.issue_date, oid.expiry_date, oid.valid_upto, oid.barcode_data,
             oid.card_status, oid.issued_by_staff_id, oid.custom_data,
             oid.created_at, oid.updated_at,
             o.name AS officer_name,
             o.email AS officer_email,
             o.phone AS officer_phone,
             COALESCE(oid.department, o.department) AS department_name,
             COALESCE(oid.designation, o.designation) AS designation_name,
             o.blood_group,
             o.gender,
             o.photo_url AS officer_photo_url,
             o.nid_number,
             o.joining_date,
             st.name AS issued_by_staff_name,
             tpl.name AS template_name
      FROM website_officer_ids oid
      JOIN website_officers o ON oid.officer_id = o.id
      LEFT JOIN website_staffs st ON oid.issued_by_staff_id = st.id
      LEFT JOIN website_officer_id_templates tpl ON oid.template_id = tpl.id
    `;

    // Single card fetch
    if (id) {
      const res = await queryDb(`${baseSelect} WHERE oid.website_id = $1 AND oid.id = $2 LIMIT 1`, [website.id, id]);
      if (res.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Issued Officer ID Card not found.' }, { status: 404 });
      }
      return NextResponse.json({ success: true, payload: { id_card: res.rows[0] } });
    }

    // List with filters
    const conditions = ['oid.website_id = $1'];
    const values = [website.id];
    let pIdx = 2;

    if (officerId) {
      conditions.push(`oid.officer_id = $${pIdx++}`);
      values.push(officerId);
    }
    if (department && department !== 'all') {
      conditions.push(`(oid.department = $${pIdx} OR (oid.department IS NULL AND o.department = $${pIdx}))`);
      values.push(department);
      pIdx++;
    }
    if (designation && designation !== 'all') {
      conditions.push(`(oid.designation = $${pIdx} OR (oid.designation IS NULL AND o.designation = $${pIdx}))`);
      values.push(designation);
      pIdx++;
    }
    if (status && status !== 'all') {
      conditions.push(`oid.card_status = $${pIdx++}`);
      values.push(status);
    }
    if (search) {
      conditions.push(`(
        o.name ILIKE $${pIdx} OR
        o.email ILIKE $${pIdx} OR
        o.phone ILIKE $${pIdx} OR
        oid.card_number ILIKE $${pIdx} OR
        o.nid_number ILIKE $${pIdx}
      )`);
      values.push(`%${search}%`);
      pIdx++;
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const [countRes, listRes] = await Promise.all([
      queryDb(
        `SELECT COUNT(*) AS total
         FROM website_officer_ids oid
         JOIN website_officers o ON oid.officer_id = o.id
         ${whereClause}`,
        values
      ),
      queryDb(
        `${baseSelect}
         ${whereClause}
         ORDER BY oid.created_at DESC
         LIMIT $${pIdx++} OFFSET $${pIdx}`,
        [...values, limit, offset]
      ),
    ]);

    const total = parseInt(countRes.rows[0]?.total || '0', 10);

    return NextResponse.json({
      success: true,
      payload: {
        id_cards: listRes.rows,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('Error fetching officer ID cards:', error);
    return NextResponse.json({ success: false, error: 'Internal server error while fetching officer ID cards.' }, { status: 500 });
  }
}

// POST: Issue new officer ID cards (single or bulk batch)
export async function POST(request, context) {
  try {
    const auth = await verifyOfficerStaffAccess(request, context, 'create');
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { website, staff } = auth;
    const body = await request.json().catch(() => ({}));
    const staffId = staff?.id || null;

    // Handle Bulk issuance
    if (Array.isArray(body.officers) && body.officers.length > 0) {
      const results = [];
      const now = new Date();
      const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;

      for (const item of body.officers) {
        const offId = item.officer_id || item.id;
        if (!offId) continue;

        const autoCardNo = item.card_number || `OFF-${yearMonth}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
        const issueDate = item.issue_date || body.issue_date || new Date().toISOString().split('T')[0];
        const expiryDate = item.expiry_date || body.expiry_date || null;
        const validUpto = item.valid_upto || body.valid_upto || null;
        const barcodeData = item.barcode_data || autoCardNo;
        const templateId = item.template_id || body.template_id || null;
        const department = item.department || null;
        const designation = item.designation || null;
        const customData = item.custom_data || {};

        const insertRes = await queryDb(
          `INSERT INTO website_officer_ids (
             website_id, officer_id, card_number, template_id,
             department, designation, issue_date, expiry_date,
             valid_upto, barcode_data, card_status, issued_by_staff_id,
             custom_data
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'active', $11, $12)
           ON CONFLICT (website_id, card_number)
           DO UPDATE SET
             officer_id = EXCLUDED.officer_id,
             template_id = EXCLUDED.template_id,
             department = EXCLUDED.department,
             designation = EXCLUDED.designation,
             issue_date = EXCLUDED.issue_date,
             expiry_date = EXCLUDED.expiry_date,
             valid_upto = EXCLUDED.valid_upto,
             barcode_data = EXCLUDED.barcode_data,
             card_status = 'active',
             issued_by_staff_id = EXCLUDED.issued_by_staff_id,
             custom_data = EXCLUDED.custom_data,
             updated_at = CURRENT_TIMESTAMP
           RETURNING id, card_number`,
          [
            website.id, offId, autoCardNo, templateId,
            department, designation, issueDate, expiryDate,
            validUpto, barcodeData, staffId, JSON.stringify(customData)
          ]
        );
        results.push(insertRes.rows[0]);
      }

      return NextResponse.json({
        success: true,
        message: `Successfully issued ${results.length} officer ID cards.`,
        payload: { issued_cards: results },
      });
    }

    // Single card issuance
    const {
      officer_id,
      card_number,
      template_id,
      department,
      designation,
      issue_date,
      expiry_date,
      valid_upto,
      barcode_data,
      custom_data,
    } = body;

    if (!officer_id) {
      return NextResponse.json({ success: false, error: 'Officer selection is required.' }, { status: 400 });
    }

    // Verify officer belongs to tenant website
    const officerCheck = await queryDb(
      `SELECT id, name, department, designation FROM website_officers WHERE id = $1 AND website_id = $2`,
      [officer_id, website.id]
    );

    if (officerCheck.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Officer does not exist or does not belong to this institution.' }, { status: 404 });
    }

    const offInfo = officerCheck.rows[0];
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const finalCardNo = card_number?.trim() || `OFF-${yearMonth}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const finalBarcode = barcode_data?.trim() || finalCardNo;
    const finalDept = department || offInfo.department;
    const finalDesig = designation || offInfo.designation;

    const insertRes = await queryDb(
      `INSERT INTO website_officer_ids (
         website_id, officer_id, card_number, template_id,
         department, designation, issue_date, expiry_date,
         valid_upto, barcode_data, card_status, issued_by_staff_id,
         custom_data
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'active', $11, $12)
       ON CONFLICT (website_id, card_number)
       DO UPDATE SET
         officer_id = EXCLUDED.officer_id,
         template_id = EXCLUDED.template_id,
         department = EXCLUDED.department,
         designation = EXCLUDED.designation,
         issue_date = EXCLUDED.issue_date,
         expiry_date = EXCLUDED.expiry_date,
         valid_upto = EXCLUDED.valid_upto,
         barcode_data = EXCLUDED.barcode_data,
         card_status = 'active',
         issued_by_staff_id = EXCLUDED.issued_by_staff_id,
         custom_data = EXCLUDED.custom_data,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [
        website.id,
        officer_id,
        finalCardNo,
        template_id || null,
        finalDept,
        finalDesig,
        issue_date || new Date().toISOString().split('T')[0],
        expiry_date || null,
        valid_upto || null,
        finalBarcode,
        staffId,
        JSON.stringify(custom_data || {}),
      ]
    );

    return NextResponse.json({
      success: true,
      message: `Officer ID Card issued successfully for ${offInfo.name}.`,
      payload: { id_card: insertRes.rows[0] },
    });
  } catch (error) {
    console.error('Error issuing officer ID card:', error);
    return NextResponse.json({ success: false, error: 'Internal server error while issuing officer ID card.' }, { status: 500 });
  }
}

// PUT: Update card status or metadata
export async function PUT(request, context) {
  try {
    const auth = await verifyOfficerStaffAccess(request, context, 'edit');
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { website } = auth;
    const body = await request.json().catch(() => ({}));
    const { id, card_status, valid_upto, expiry_date, department, designation, barcode_data, custom_data } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID Card identifier is required.' }, { status: 400 });
    }

    const validStatuses = ['active', 'expired', 'lost', 'revoked', 'reissued'];
    if (card_status && !validStatuses.includes(card_status)) {
      return NextResponse.json({ success: false, error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` }, { status: 400 });
    }

    const updateFields = [];
    const values = [website.id, id];
    let pIdx = 3;

    if (card_status) {
      updateFields.push(`card_status = $${pIdx++}`);
      values.push(card_status);
    }
    if (valid_upto !== undefined) {
      updateFields.push(`valid_upto = $${pIdx++}`);
      values.push(valid_upto);
    }
    if (expiry_date !== undefined) {
      updateFields.push(`expiry_date = $${pIdx++}`);
      values.push(expiry_date || null);
    }
    if (department !== undefined) {
      updateFields.push(`department = $${pIdx++}`);
      values.push(department);
    }
    if (designation !== undefined) {
      updateFields.push(`designation = $${pIdx++}`);
      values.push(designation);
    }
    if (barcode_data !== undefined) {
      updateFields.push(`barcode_data = $${pIdx++}`);
      values.push(barcode_data);
    }
    if (custom_data !== undefined) {
      updateFields.push(`custom_data = $${pIdx++}`);
      values.push(JSON.stringify(custom_data));
    }

    if (updateFields.length === 0) {
      return NextResponse.json({ success: false, error: 'No fields provided for update.' }, { status: 400 });
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');

    const updateRes = await queryDb(
      `UPDATE website_officer_ids
       SET ${updateFields.join(', ')}
       WHERE website_id = $1 AND id = $2
       RETURNING *`,
      values
    );

    if (updateRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Officer ID card record not found.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Officer ID Card updated successfully.',
      payload: { id_card: updateRes.rows[0] },
    });
  } catch (error) {
    console.error('Error updating officer ID card:', error);
    return NextResponse.json({ success: false, error: 'Internal server error while updating officer ID card.' }, { status: 500 });
  }
}

// DELETE: Revoke or delete officer ID card
export async function DELETE(request, context) {
  try {
    const auth = await verifyOfficerStaffAccess(request, context, 'delete');
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { website } = auth;
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID card identifier is required.' }, { status: 400 });
    }

    const deleteRes = await queryDb(
      `DELETE FROM website_officer_ids WHERE website_id = $1 AND id = $2 RETURNING id, card_number`,
      [website.id, id]
    );

    if (deleteRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Officer ID card record not found.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `Officer ID Card #${deleteRes.rows[0].card_number} revoked and deleted.`,
    });
  } catch (error) {
    console.error('Error deleting officer ID card:', error);
    return NextResponse.json({ success: false, error: 'Internal server error while deleting officer ID card.' }, { status: 500 });
  }
}
