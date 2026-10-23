import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { verifyStaffPaymentAccess } from 'src/lib/database/paymentGateways.js';

/**
 * GET /api/[domain]/staff/panel/admissions/exam-marks?admission_id=...
 * Fetches exam details, subjects, applicants, and marks breakdown for an admission circular.
 */
export async function GET(request, context) {
  try {
    const auth = await verifyStaffPaymentAccess(request, context);
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    const admissionId = searchParams.get('admission_id');

    if (!admissionId) {
      // Return list of exam-based circulars if no admission_id is specified
      const circularsRes = await queryDb(`
        SELECT a.id, a.title, a.start_date, a.end_date, a.capacity,
               c.name AS class_name, c.max_seats AS class_max_seats,
               ses.name AS session_name,
               ex.exam_date, ex.admit_publish_date, ex.venue AS exam_venue
        FROM website_admissions a
        LEFT JOIN website_classes c ON c.id = a.class_id
        LEFT JOIN website_sessions ses ON ses.id = a.session_id
        LEFT JOIN website_admission_exams ex ON ex.admission_id = a.id
        WHERE a.website_id = $1 AND a.selection_method = 'exam'
        ORDER BY a.created_at DESC
      `, [auth.website.id]);

      return NextResponse.json({
        success: true,
        circulars: circularsRes.rows
      });
    }

    const admId = parseInt(admissionId, 10);

    // 1. Fetch circular and exam metadata
    const circularRes = await queryDb(`
      SELECT a.id, a.title, a.capacity, a.selection_method, a.result_date,
             c.name AS class_name, c.max_seats AS class_max_seats,
             ses.name AS session_name,
             ex.id AS exam_id, ex.exam_date, ex.admit_publish_date, ex.venue, ex.instructions
      FROM website_admissions a
      LEFT JOIN website_classes c ON c.id = a.class_id
      LEFT JOIN website_sessions ses ON ses.id = a.session_id
      LEFT JOIN website_admission_exams ex ON ex.admission_id = a.id
      WHERE a.id = $1 AND a.website_id = $2
    `, [admId, auth.website.id]);

    if (circularRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Admission circular not found.' }, { status: 404 });
    }

    const circular = circularRes.rows[0];

    // 2. Fetch exam subjects
    const subjectsRes = await queryDb(`
      SELECT id, title, mark, time
      FROM website_admission_exam_subjects
      WHERE admission_id = $1 AND website_id = $2
      ORDER BY id ASC
    `, [admId, auth.website.id]);

    const subjects = subjectsRes.rows;

    const statusParam = searchParams.get('status') || 'completed';

    // 3. Fetch applicants for this circular with images and fee status - strictly completed applicants only
    const applicantsRes = await queryDb(`
      SELECT a.id, a.application_no, a.exam_roll,
             COALESCE(a.exam_roll, a.roll_no, 'ROL-' || a.id) AS roll_no,
             a.applicant_name, a.email, a.phone,
             a.status, a.score, a.merit_position, a.last_class, a.last_class_grade, a.last_institution,
             COALESCE(p.payment_status, 'unpaid') AS payment_status,
             COALESCE(img.photo_url, inf.photo_url) AS photo_url
      FROM website_admission_applicants a
      LEFT JOIN website_admission_fee_payments p ON p.applicant_id = a.id
      LEFT JOIN website_admission_applicant_images img ON img.applicant_id = a.id
      LEFT JOIN website_admission_applicant_info inf ON inf.applicant_id = a.id
      WHERE a.admission_id = $1 AND a.website_id = $2
        AND a.status = $3
      ORDER BY a.score DESC NULLS LAST, a.created_at ASC
    `, [admId, auth.website.id, statusParam]);

    // 4. Fetch all recorded exam marks for this circular
    const marksRes = await queryDb(`
      SELECT m.id, m.subject_id, m.applicant_id, m.marks_obtained, m.remarks
      FROM website_admission_exam_marks m
      WHERE m.admission_id = $1 AND m.website_id = $2
    `, [admId, auth.website.id]);

    // Group marks by applicant_id -> subject_id -> mark
    const marksByApplicant = {};
    for (const m of marksRes.rows) {
      if (!marksByApplicant[m.applicant_id]) {
        marksByApplicant[m.applicant_id] = {};
      }
      marksByApplicant[m.applicant_id][m.subject_id] = {
        marks_obtained: parseFloat(m.marks_obtained) || 0,
        remarks: m.remarks || ''
      };
    }

    // Attach subject marks & calculate total obtained for each applicant
    const applicantsWithMarks = applicantsRes.rows.map((app) => {
      const appMarks = marksByApplicant[app.id] || {};
      let totalMarksObtained = 0;
      let totalMaxMarks = 0;

      const marksBreakdown = subjects.map((sub) => {
        const markEntry = appMarks[sub.id];
        const obtained = markEntry ? markEntry.marks_obtained : null;
        if (obtained !== null) {
          totalMarksObtained += obtained;
        }
        totalMaxMarks += parseFloat(sub.mark) || 0;
        return {
          subject_id: sub.id,
          subject_title: sub.title,
          max_mark: parseFloat(sub.mark) || 0,
          marks_obtained: obtained,
          remarks: markEntry?.remarks || ''
        };
      });

      return {
        ...app,
        marks_breakdown: marksBreakdown,
        total_marks_obtained: totalMarksObtained,
        total_max_marks: totalMaxMarks,
        marks_percentage: totalMaxMarks > 0 ? ((totalMarksObtained / totalMaxMarks) * 100).toFixed(2) : 0
      };
    });

    return NextResponse.json({
      success: true,
      circular,
      subjects,
      applicants: applicantsWithMarks
    });
  } catch (error) {
    console.error('Error in GET /staff/panel/admissions/exam-marks:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/[domain]/staff/panel/admissions/exam-marks
 * Upserts subject marks for applicants in real-time or bulk.
 * Must be updateable as required.
 */
export async function POST(request, context) {
  try {
    const auth = await verifyStaffPaymentAccess(request, context);
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const body = await request.json().catch(() => ({}));
    const { admission_id, marks_records = [] } = body;

    if (!admission_id) {
      return NextResponse.json({ success: false, error: 'admission_id is required.' }, { status: 400 });
    }
    if (!Array.isArray(marks_records) || marks_records.length === 0) {
      return NextResponse.json({ success: false, error: 'marks_records must be a non-empty array.' }, { status: 400 });
    }

    const admId = parseInt(admission_id, 10);

    // Verify circular belongs to this website
    const checkRes = await queryDb(
      `SELECT id FROM website_admissions WHERE id = $1 AND website_id = $2`,
      [admId, auth.website.id]
    );
    if (checkRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Admission circular not found.' }, { status: 404 });
    }

    let updatedCount = 0;

    for (const record of marks_records) {
      const { applicant_id, subject_id, marks_obtained, remarks } = record;
      if (!applicant_id || !subject_id) continue;

      const marksVal = Math.max(0, parseFloat(marks_obtained) || 0);

      // Upsert into website_admission_exam_marks (updateable anytime)
      await queryDb(`
        INSERT INTO website_admission_exam_marks (
          website_id, admission_id, subject_id, applicant_id, marks_obtained, remarks
        ) VALUES (
          $1, $2, $3, $4, $5, $6
        )
        ON CONFLICT (admission_id, subject_id, applicant_id)
        DO UPDATE SET
          marks_obtained = EXCLUDED.marks_obtained,
          remarks = EXCLUDED.remarks,
          updated_at = CURRENT_TIMESTAMP
      `, [
        auth.website.id,
        admId,
        parseInt(subject_id, 10),
        parseInt(applicant_id, 10),
        marksVal,
        remarks || null
      ]);

      updatedCount++;
    }

    // Recalculate applicant total scores in website_admission_applicants
    await queryDb(`
      UPDATE website_admission_applicants a
      SET score = COALESCE((
        SELECT SUM(m.marks_obtained)
        FROM website_admission_exam_marks m
        WHERE m.applicant_id = a.id AND m.admission_id = $1
      ), 0),
      updated_at = CURRENT_TIMESTAMP
      WHERE a.admission_id = $1 AND a.website_id = $2
    `, [admId, auth.website.id]);

    return NextResponse.json({
      success: true,
      message: `Successfully saved ${updatedCount} subject marks entries. Total scores recalculated.`,
      updated_count: updatedCount
    });
  } catch (error) {
    console.error('Error in POST /staff/panel/admissions/exam-marks:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
