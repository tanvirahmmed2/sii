import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { verifyStaffPaymentAccess } from 'src/lib/database/paymentGateways.js';

/**
 * GET /api/[domain]/staff/panel/admissions
 * Fetches all admission circulars, departments, classes, sessions, exam details, and applicant counts.
 */
export async function GET(request, context) {
  try {
    const auth = await verifyStaffPaymentAccess(request, context);
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const websiteId = auth.website.id;

    // 1. Fetch circulars with fee info, dept info, class info, session info, and stats
    const circularsRes = await queryDb(`
      SELECT a.*,
             d.name AS department_name,
             d.code AS department_code,
             c.name AS class_name,
             c.max_seats AS class_max_seats,
             s.name AS session_name,
             af.id AS fee_id, af.fee_title, af.amount AS fee_amount, af.currency AS fee_currency, af.late_fee,
             COALESCE(st.total_applicants, 0)::int AS total_applicants,
             COALESCE(st.pending_applicants, 0)::int AS pending_applicants,
             COALESCE(st.selected_applicants, 0)::int AS selected_applicants,
             COALESCE(st.rejected_applicants, 0)::int AS rejected_applicants,
             COALESCE(st.enrolled_applicants, 0)::int AS enrolled_applicants,
             COALESCE(st.completed_applicants, 0)::int AS completed_applicants,
             ex.id AS exam_record_id,
             ex.exam_date AS admission_exam_date,
             ex.admit_publish_date AS admission_admit_publish_date,
             ex.venue AS exam_venue,
             ex.instructions AS exam_instructions
      FROM website_admissions a
      LEFT JOIN website_departments d ON d.id = a.department_id
      LEFT JOIN website_classes c ON c.id = a.class_id
      LEFT JOIN website_sessions s ON s.id = a.session_id
      LEFT JOIN website_admission_fees af ON af.admission_id = a.id AND af.status = 'active'
      LEFT JOIN website_admission_exams ex ON ex.admission_id = a.id
      LEFT JOIN (
        SELECT admission_id,
               COUNT(*)::int AS total_applicants,
               COUNT(CASE WHEN status = 'pending' THEN 1 END)::int AS pending_applicants,
               COUNT(CASE WHEN status = 'selected' THEN 1 END)::int AS selected_applicants,
               COUNT(CASE WHEN status = 'rejected' THEN 1 END)::int AS rejected_applicants,
               COUNT(CASE WHEN status = 'enrolled' THEN 1 END)::int AS enrolled_applicants,
               COUNT(CASE WHEN status = 'completed' THEN 1 END)::int AS completed_applicants
        FROM website_admission_applicants
        WHERE website_id = $1
        GROUP BY admission_id
      ) st ON st.admission_id = a.id
      WHERE a.website_id = $1
      ORDER BY a.created_at DESC
    `, [websiteId]);

    // 2. Fetch exam subjects for circulars
    const examSubjectsRes = await queryDb(`
      SELECT id, admission_id, admission_exam_id, title, mark, time
      FROM website_admission_exam_subjects
      WHERE website_id = $1
      ORDER BY id ASC
    `, [websiteId]);

    const subjectsByAdmission = {};
    for (const sub of examSubjectsRes.rows) {
      if (!subjectsByAdmission[sub.admission_id]) {
        subjectsByAdmission[sub.admission_id] = [];
      }
      subjectsByAdmission[sub.admission_id].push(sub);
    }

    const circularsWithSubjects = circularsRes.rows.map((circ) => ({
      ...circ,
      exam_subjects: subjectsByAdmission[circ.id] || []
    }));

    // 3. Fetch departments, classes and sessions for selectors
    const [departmentsRes, classesRes, sessionsRes] = await Promise.all([
      queryDb(`SELECT id, name, code FROM website_departments WHERE website_id = $1 ORDER BY order_no ASC, name ASC`, [websiteId]),
      queryDb(`SELECT id, name, department_id, max_seats FROM website_classes WHERE website_id = $1 ORDER BY name ASC`, [websiteId]),
      queryDb(`SELECT id, name, is_current FROM website_sessions WHERE website_id = $1 ORDER BY id DESC`, [websiteId])
    ]);

    return NextResponse.json({
      success: true,
      circulars: circularsWithSubjects,
      departments: departmentsRes.rows,
      classes: classesRes.rows,
      sessions: sessionsRes.rows
    });
  } catch (error) {
    console.error('Error in GET /staff/panel/admissions:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/[domain]/staff/panel/admissions
 * Creates an admission circular with validation against class seat ceiling,
 * candidate previous background requirements, selection method, and exam subjects if exam-based.
 */
export async function POST(request, context) {
  try {
    const auth = await verifyStaffPaymentAccess(request, context);
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const body = await request.json().catch(() => ({}));
    const {
      title,
      description,
      department_id,
      session_id,
      class_id,
      start_date,
      end_date,
      exam_date,
      result_date,
      admit_publish_date,
      exam_venue,
      exam_instructions,
      min_age,
      max_age,
      capacity = 100,
      status = 'open',
      is_published = true,
      fee_title = 'Application Form Fee',
      fee_amount = 500.00,
      fee_currency = 'BDT',
      late_fee = 0.00,
      selection_method = 'manual',
      last_class,
      last_class_grade,
      last_institution,
      exam_subjects = []
    } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ success: false, error: 'Admission circular title is required.' }, { status: 400 });
    }
    if (!start_date || !end_date) {
      return NextResponse.json({ success: false, error: 'Start date and end date are required.' }, { status: 400 });
    }
    if (!class_id) {
      return NextResponse.json({ success: false, error: 'A class must be selected for admission.' }, { status: 400 });
    }

    const parsedCapacity = parseInt(capacity, 10) || 100;

    // Enforce Class Seat Capacity Ceiling
    const classCheck = await queryDb(
      `SELECT id, name, max_seats FROM website_classes WHERE id = $1 AND website_id = $2`,
      [parseInt(class_id, 10), auth.website.id]
    );

    if (classCheck.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Selected class does not exist.' }, { status: 400 });
    }

    const classRow = classCheck.rows[0];
    const maxSeats = classRow.max_seats ? parseInt(classRow.max_seats, 10) : null;
    if (maxSeats && parsedCapacity > maxSeats) {
      return NextResponse.json({
        success: false,
        error: `Circular capacity (${parsedCapacity}) cannot exceed maximum seats (${maxSeats}) of class '${classRow.name}'.`
      }, { status: 400 });
    }

    const validSelectionMethod = ['exam', 'merit', 'manual'].includes(selection_method) ? selection_method : 'manual';
    const staffId = auth.user?.id || null;

    // 1. Insert admission circular
    const insertRes = await queryDb(`
      INSERT INTO website_admissions (
        website_id, department_id, session_id, class_id, title, description,
        start_date, end_date, exam_date, result_date, min_age, max_age, capacity,
        status, is_published, created_by_staff_id,
        selection_method, last_class, last_class_grade, last_institution
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11, $12, $13,
        $14, $15, $16,
        $17, $18, $19, $20
      ) RETURNING *
    `, [
      auth.website.id,
      department_id ? parseInt(department_id, 10) : null,
      session_id ? parseInt(session_id, 10) : null,
      parseInt(class_id, 10),
      title.trim(),
      description ? description.trim() : null,
      start_date,
      end_date,
      exam_date || null,
      result_date || null,
      min_age ? parseInt(min_age, 10) : null,
      max_age ? parseInt(max_age, 10) : null,
      parsedCapacity,
      status || 'open',
      Boolean(is_published),
      staffId,
      validSelectionMethod,
      last_class ? last_class.trim() : 'N/A',
      last_class_grade !== undefined && last_class_grade !== '' && last_class_grade !== null ? parseFloat(last_class_grade) : null,
      last_institution ? last_institution.trim() : 'N/A'
    ]);

    const createdAdm = insertRes.rows[0];

    // 2. Insert admission fee structure
    const feeRes = await queryDb(`
      INSERT INTO website_admission_fees (
        website_id, admission_id, fee_title, amount, currency, late_fee, status
      ) VALUES (
        $1, $2, $3, $4, $5, $6, 'active'
      ) RETURNING *
    `, [
      auth.website.id,
      createdAdm.id,
      fee_title ? fee_title.trim() : 'Application Form Fee',
      parseFloat(fee_amount) || 0.00,
      String(fee_currency || 'BDT').toUpperCase().trim(),
      parseFloat(late_fee) || 0.00
    ]);

    // 3. If exam-based admission, create website_admission_exams and website_admission_exam_subjects
    let createdExam = null;
    let createdSubjects = [];
    if (validSelectionMethod === 'exam') {
      const examRes = await queryDb(`
        INSERT INTO website_admission_exams (
          website_id, admission_id, exam_date, admit_publish_date, venue, instructions
        ) VALUES (
          $1, $2, $3, $4, $5, $6
        ) RETURNING *
      `, [
        auth.website.id,
        createdAdm.id,
        exam_date ? new Date(exam_date).toISOString() : null,
        admit_publish_date ? new Date(admit_publish_date).toISOString() : null,
        exam_venue ? exam_venue.trim() : null,
        exam_instructions ? exam_instructions.trim() : null
      ]);
      createdExam = examRes.rows[0];

      if (Array.isArray(exam_subjects) && exam_subjects.length > 0) {
        for (const sub of exam_subjects) {
          if (sub.title && sub.title.trim()) {
            const subRes = await queryDb(`
              INSERT INTO website_admission_exam_subjects (
                website_id, admission_id, admission_exam_id, title, mark, time
              ) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *
            `, [
              auth.website.id,
              createdAdm.id,
              createdExam.id,
              sub.title.trim(),
              parseFloat(sub.mark) || 100.00,
              sub.time ? sub.time.trim() : '1 hour'
            ]);
            createdSubjects.push(subRes.rows[0]);
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Admission circular '${createdAdm.title}' created successfully.`,
      circular: {
        ...createdAdm,
        fee: feeRes.rows[0],
        exam: createdExam,
        exam_subjects: createdSubjects
      }
    });
  } catch (error) {
    console.error('Error in POST /staff/panel/admissions:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * PUT /api/[domain]/staff/panel/admissions
 * Updates an admission circular, fee, capacity checks, and exam configuration.
 */
export async function PUT(request, context) {
  try {
    const auth = await verifyStaffPaymentAccess(request, context);
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const body = await request.json().catch(() => ({}));
    const {
      id,
      title,
      description,
      department_id,
      class_id,
      session_id,
      start_date,
      end_date,
      exam_date,
      result_date,
      admit_publish_date,
      exam_venue,
      exam_instructions,
      min_age,
      max_age,
      capacity,
      status,
      is_published,
      fee_title,
      fee_amount,
      fee_currency,
      late_fee,
      selection_method,
      last_class,
      last_class_grade,
      last_institution,
      exam_subjects
    } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Admission circular ID is required.' }, { status: 400 });
    }

    // Verify ownership
    const checkRes = await queryDb(
      `SELECT * FROM website_admissions WHERE id = $1 AND website_id = $2`,
      [id, auth.website.id]
    );
    if (checkRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Admission circular not found.' }, { status: 404 });
    }

    const existingCircular = checkRes.rows[0];
    const targetClassId = class_id !== undefined ? (class_id ? parseInt(class_id, 10) : null) : existingCircular.class_id;
    const targetCapacity = capacity !== undefined ? parseInt(capacity, 10) : existingCircular.capacity;

    if (targetClassId) {
      const classCheck = await queryDb(
        `SELECT id, name, max_seats FROM website_classes WHERE id = $1 AND website_id = $2`,
        [targetClassId, auth.website.id]
      );
      if (classCheck.rows.length > 0 && classCheck.rows[0].max_seats) {
        const maxSeats = parseInt(classCheck.rows[0].max_seats, 10);
        if (targetCapacity > maxSeats) {
          return NextResponse.json({
            success: false,
            error: `Circular capacity (${targetCapacity}) cannot exceed maximum seats (${maxSeats}) of class '${classCheck.rows[0].name}'.`
          }, { status: 400 });
        }
      }
    }

    // Update circular
    const updateRes = await queryDb(`
      UPDATE website_admissions
      SET title = COALESCE($1, title),
          description = COALESCE($2, description),
          department_id = $3,
          session_id = $4,
          class_id = $5,
          start_date = COALESCE($6, start_date),
          end_date = COALESCE($7, end_date),
          exam_date = $8,
          result_date = $9,
          min_age = $10,
          max_age = $11,
          capacity = COALESCE($12, capacity),
          status = COALESCE($13, status),
          is_published = COALESCE($14, is_published),
          selection_method = COALESCE($15, selection_method),
          last_class = COALESCE($16, last_class),
          last_class_grade = $17,
          last_institution = COALESCE($18, last_institution),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $19 AND website_id = $20
      RETURNING *
    `, [
      title ? title.trim() : null,
      description !== undefined ? description : null,
      department_id ? parseInt(department_id, 10) : null,
      session_id ? parseInt(session_id, 10) : null,
      targetClassId,
      start_date || null,
      end_date || null,
      exam_date || null,
      result_date || null,
      min_age ? parseInt(min_age, 10) : null,
      max_age ? parseInt(max_age, 10) : null,
      targetCapacity,
      status || null,
      is_published !== undefined ? Boolean(is_published) : null,
      selection_method || null,
      last_class !== undefined ? (last_class ? last_class.trim() : 'N/A') : null,
      last_class_grade !== undefined && last_class_grade !== '' && last_class_grade !== null ? parseFloat(last_class_grade) : null,
      last_institution !== undefined ? (last_institution ? last_institution.trim() : 'N/A') : null,
      id,
      auth.website.id
    ]);

    const updatedCirc = updateRes.rows[0];

    // Upsert or update fee
    if (fee_amount !== undefined) {
      const existingFee = await queryDb(
        `SELECT id FROM website_admission_fees WHERE admission_id = $1 AND website_id = $2 LIMIT 1`,
        [id, auth.website.id]
      );

      if (existingFee.rows.length > 0) {
        await queryDb(`
          UPDATE website_admission_fees
          SET fee_title = COALESCE($1, fee_title),
              amount = $2,
              currency = COALESCE($3, currency),
              late_fee = COALESCE($4, late_fee),
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $5
        `, [
          fee_title ? fee_title.trim() : null,
          parseFloat(fee_amount) || 0.00,
          fee_currency ? String(fee_currency).toUpperCase().trim() : null,
          late_fee !== undefined ? parseFloat(late_fee) || 0.00 : null,
          existingFee.rows[0].id
        ]);
      } else {
        await queryDb(`
          INSERT INTO website_admission_fees (
            website_id, admission_id, fee_title, amount, currency, late_fee, status
          ) VALUES (
            $1, $2, $3, $4, $5, $6, 'active'
          )
        `, [
          auth.website.id,
          id,
          fee_title ? fee_title.trim() : 'Application Form Fee',
          parseFloat(fee_amount) || 0.00,
          String(fee_currency || 'BDT').toUpperCase().trim(),
          parseFloat(late_fee) || 0.00
        ]);
      }
    }

    // Handle exam config and subjects
    if (updatedCirc.selection_method === 'exam') {
      const examUpsert = await queryDb(`
        INSERT INTO website_admission_exams (
          website_id, admission_id, exam_date, admit_publish_date, venue, instructions
        ) VALUES (
          $1, $2, $3, $4, $5, $6
        )
        ON CONFLICT (admission_id)
        DO UPDATE SET
          exam_date = EXCLUDED.exam_date,
          admit_publish_date = EXCLUDED.admit_publish_date,
          venue = EXCLUDED.venue,
          instructions = EXCLUDED.instructions,
          updated_at = CURRENT_TIMESTAMP
        RETURNING id
      `, [
        auth.website.id,
        id,
        exam_date ? new Date(exam_date).toISOString() : null,
        admit_publish_date ? new Date(admit_publish_date).toISOString() : null,
        exam_venue ? exam_venue.trim() : null,
        exam_instructions ? exam_instructions.trim() : null
      ]);

      const examId = examUpsert.rows[0]?.id;

      if (Array.isArray(exam_subjects) && exam_subjects.length > 0) {
        // Sync subjects: clear existing and re-insert
        await queryDb(`DELETE FROM website_admission_exam_subjects WHERE admission_id = $1`, [id]);
        for (const sub of exam_subjects) {
          if (sub.title && sub.title.trim()) {
            await queryDb(`
              INSERT INTO website_admission_exam_subjects (
                website_id, admission_id, admission_exam_id, title, mark, time
              ) VALUES ($1, $2, $3, $4, $5, $6)
            `, [
              auth.website.id,
              id,
              examId,
              sub.title.trim(),
              parseFloat(sub.mark) || 100.00,
              sub.time ? sub.time.trim() : '1 hour'
            ]);
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Admission circular updated successfully.',
      circular: updatedCirc
    });
  } catch (error) {
    console.error('Error in PUT /staff/panel/admissions:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * DELETE /api/[domain]/staff/panel/admissions
 */
export async function DELETE(request, context) {
  try {
    const auth = await verifyStaffPaymentAccess(request, context);
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Circular ID is required.' }, { status: 400 });
    }

    await queryDb(`DELETE FROM website_admissions WHERE id = $1 AND website_id = $2`, [id, auth.website.id]);

    return NextResponse.json({
      success: true,
      message: 'Admission circular deleted successfully.'
    });
  } catch (error) {
    console.error('Error in DELETE /staff/panel/admissions:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
