import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { verifyTeacherStaffAccess } from 'src/lib/middleware/teacher-auth.js';

// GET: List issued teacher ID cards with rich faculty JOIN metadata
export async function GET(request, context) {
  try {
    const auth = await verifyTeacherStaffAccess(request, context, 'view');
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { website } = auth;
    const { searchParams } = new URL(request.url);

    const id = searchParams.get('id');
    const teacherId = searchParams.get('teacher_id');
    const departmentId = searchParams.get('department_id');
    const designationId = searchParams.get('designation_id');
    const status = searchParams.get('status') || searchParams.get('card_status');
    const search = searchParams.get('search')?.trim();
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
    const offset = (page - 1) * limit;

    const baseSelect = `
      SELECT tid.id, tid.website_id, tid.teacher_id, tid.card_number,
             tid.template_id, tid.department_id, tid.designation_id,
             tid.issue_date, tid.expiry_date, tid.valid_upto, tid.barcode_data,
             tid.card_status, tid.issued_by_staff_id, tid.custom_data,
             tid.created_at, tid.updated_at,
             t.name AS teacher_name,
             COALESCE(t.code, CONCAT('FAC-', t.id)) AS employee_id,
             COALESCE(t.phone, t.number) AS phone,
             t.email, t.blood_group,
             COALESCE(t.image, t.photo_url) AS teacher_photo_url,
             dept.name AS department_name,
             desig.name AS designation_name,
             st.name AS issued_by_staff_name,
             tpl.name AS template_name
      FROM website_teacher_ids tid
      JOIN website_teachers t ON tid.teacher_id = t.id
      LEFT JOIN website_departments dept ON tid.department_id = dept.id OR (tid.department_id IS NULL AND t.department_id = dept.id)
      LEFT JOIN website_designations desig ON tid.designation_id = desig.id OR (tid.designation_id IS NULL AND t.designation_id = desig.id)
      LEFT JOIN website_staffs st ON tid.issued_by_staff_id = st.id
      LEFT JOIN website_teacher_id_templates tpl ON tid.template_id = tpl.id
    `;

    // Single card fetch
    if (id) {
      const res = await queryDb(`${baseSelect} WHERE tid.website_id = $1 AND tid.id = $2 LIMIT 1`, [website.id, id]);
      if (res.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Issued Faculty ID Card not found.' }, { status: 404 });
      }
      return NextResponse.json({ success: true, payload: { id_card: res.rows[0] } });
    }

    // List with filters
    const conditions = ['tid.website_id = $1'];
    const values = [website.id];
    let pIdx = 2;

    if (teacherId) {
      conditions.push(`tid.teacher_id = $${pIdx++}`);
      values.push(teacherId);
    }
    if (departmentId) {
      conditions.push(`(tid.department_id = $${pIdx} OR (tid.department_id IS NULL AND t.department_id = $${pIdx}))`);
      values.push(departmentId);
      pIdx++;
    }
    if (designationId) {
      conditions.push(`(tid.designation_id = $${pIdx} OR (tid.designation_id IS NULL AND t.designation_id = $${pIdx}))`);
      values.push(designationId);
      pIdx++;
    }
    if (status && status !== 'all') {
      conditions.push(`tid.card_status = $${pIdx++}`);
      values.push(status);
    }
    if (search) {
      conditions.push(`(
        t.name ILIKE $${pIdx} OR
        t.code ILIKE $${pIdx} OR
        t.email ILIKE $${pIdx} OR
        tid.card_number ILIKE $${pIdx}
      )`);
      values.push(`%${search}%`);
      pIdx++;
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const [countRes, listRes] = await Promise.all([
      queryDb(
        `SELECT COUNT(*) AS total
         FROM website_teacher_ids tid
         JOIN website_teachers t ON tid.teacher_id = t.id
         ${whereClause}`,
        values
      ),
      queryDb(
        `${baseSelect}
         ${whereClause}
         ORDER BY tid.id DESC
         LIMIT $${pIdx++} OFFSET $${pIdx++}`,
        [...values, limit, offset]
      ),
    ]);

    const total = parseInt(countRes.rows[0]?.total || '0', 10);

    return NextResponse.json({
      success: true,
      payload: {
        id_cards: listRes.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (err) {
    console.error('Error fetching issued teacher ID cards:', err);
    return NextResponse.json({ success: false, error: err.message || 'Server error' }, { status: 500 });
  }
}

// POST: Issue new faculty ID card(s)
export async function POST(request, context) {
  try {
    const auth = await verifyTeacherStaffAccess(request, context, 'create');
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { website, staffSession } = auth;
    const body = await request.json();

    const staffId = staffSession?.id || staffSession?.staff?.id || null;
    const {
      teacher_id,
      teacher_ids,
      template_id,
      valid_upto = 'Dec 2028',
      expiry_date,
      issue_date = new Date().toISOString().split('T')[0],
      card_status = 'active',
      custom_data = {},
    } = body;

    const targetTeacherIds = Array.isArray(teacher_ids) && teacher_ids.length > 0
      ? teacher_ids
      : (teacher_id ? [teacher_id] : []);

    if (targetTeacherIds.length === 0) {
      return NextResponse.json({ success: false, error: 'Please select at least one teacher.' }, { status: 400 });
    }

    // Fetch teachers metadata
    const teachersRes = await queryDb(
      `SELECT t.id, t.code, t.name, t.department_id, t.designation_id
       FROM website_teachers t
       WHERE t.website_id = $1 AND t.id = ANY($2::bigint[])`,
      [website.id, targetTeacherIds]
    );

    if (teachersRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'No matching teachers found.' }, { status: 404 });
    }

    const defaultExpiry = expiry_date || (() => {
      const exp = new Date();
      exp.setFullYear(exp.getFullYear() + 2);
      return exp.toISOString().split('T')[0];
    })();

    const issuedCards = [];

    for (const t of teachersRes.rows) {
      const cardNumber = `FAC-${t.code || t.id}`;
      const barcodeData = t.code || cardNumber;

      const insertRes = await queryDb(
        `INSERT INTO website_teacher_ids (
            website_id, teacher_id, card_number, template_id,
            department_id, designation_id,
            issue_date, expiry_date, valid_upto, barcode_data,
            card_status, issued_by_staff_id, custom_data
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         ON CONFLICT (website_id, card_number)
         DO UPDATE SET
            template_id = EXCLUDED.template_id,
            department_id = EXCLUDED.department_id,
            designation_id = EXCLUDED.designation_id,
            issue_date = EXCLUDED.issue_date,
            expiry_date = EXCLUDED.expiry_date,
            valid_upto = EXCLUDED.valid_upto,
            barcode_data = EXCLUDED.barcode_data,
            card_status = EXCLUDED.card_status,
            issued_by_staff_id = EXCLUDED.issued_by_staff_id,
            custom_data = EXCLUDED.custom_data,
            updated_at = CURRENT_TIMESTAMP
         RETURNING *`,
        [
          website.id,
          t.id,
          cardNumber,
          template_id || null,
          t.department_id || null,
          t.designation_id || null,
          issue_date,
          defaultExpiry,
          valid_upto,
          barcodeData,
          card_status,
          staffId,
          JSON.stringify(custom_data),
        ]
      );

      issuedCards.push(insertRes.rows[0]);
    }

    return NextResponse.json({
      success: true,
      message: `Successfully issued ${issuedCards.length} Faculty ID Card(s).`,
      payload: { id_cards: issuedCards },
    });
  } catch (err) {
    console.error('Error issuing faculty ID cards:', err);
    return NextResponse.json({ success: false, error: err.message || 'Server error' }, { status: 500 });
  }
}

// PUT: Update faculty card status or particulars
export async function PUT(request, context) {
  try {
    const auth = await verifyTeacherStaffAccess(request, context, 'update');
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { website } = auth;
    const body = await request.json();
    const { id, card_status, valid_upto, expiry_date, card_number } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID card id is required.' }, { status: 400 });
    }

    const updateRes = await queryDb(
      `UPDATE website_teacher_ids
       SET card_status = COALESCE($1, card_status),
           valid_upto = COALESCE($2, valid_upto),
           expiry_date = COALESCE($3, expiry_date),
           card_number = COALESCE($4, card_number),
           updated_at = CURRENT_TIMESTAMP
       WHERE website_id = $5 AND id = $6
       RETURNING *`,
      [card_status || null, valid_upto || null, expiry_date || null, card_number || null, website.id, id]
    );

    if (updateRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Card record not found.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Faculty ID Card updated successfully.',
      payload: { id_card: updateRes.rows[0] },
    });
  } catch (err) {
    console.error('Error updating faculty ID card:', err);
    return NextResponse.json({ success: false, error: err.message || 'Server error' }, { status: 500 });
  }
}

// DELETE: Revoke/delete faculty ID card
export async function DELETE(request, context) {
  try {
    const auth = await verifyTeacherStaffAccess(request, context, 'delete');
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { website } = auth;
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID card id is required.' }, { status: 400 });
    }

    const deleteRes = await queryDb(
      `DELETE FROM website_teacher_ids WHERE website_id = $1 AND id = $2 RETURNING id`,
      [website.id, id]
    );

    if (deleteRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Faculty card record not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Faculty ID Card record deleted successfully.' });
  } catch (err) {
    console.error('Error deleting faculty ID card:', err);
    return NextResponse.json({ success: false, error: err.message || 'Server error' }, { status: 500 });
  }
}
