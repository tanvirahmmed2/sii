import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { verifyStaffPaymentAccess } from 'src/lib/database/paymentGateways.js';

/**
 * POST /api/[domain]/staff/panel/admissions/exam-marks/process
 * Calculates total scores, computes merit ranking, and auto-selects top candidates up to class seat limit.
 */
export async function POST(request, context) {
  try {
    const auth = await verifyStaffPaymentAccess(request, context);
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const body = await request.json().catch(() => ({}));
    const { admission_id, mark_unselected_as = 'rejected' } = body; // 'rejected' | 'waiting'

    if (!admission_id) {
      return NextResponse.json({ success: false, error: 'admission_id is required.' }, { status: 400 });
    }

    const admId = parseInt(admission_id, 10);

    // 1. Fetch circular and class seat capacity
    const circularRes = await queryDb(`
      SELECT a.id, a.title, a.capacity, a.selection_method,
             c.id AS class_id, c.name AS class_name, c.max_seats AS class_max_seats
      FROM website_admissions a
      LEFT JOIN website_classes c ON c.id = a.class_id
      WHERE a.id = $1 AND a.website_id = $2
    `, [admId, auth.website.id]);

    if (circularRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Admission circular not found.' }, { status: 404 });
    }

    const circular = circularRes.rows[0];

    // Determine seats limit: capacity cannot exceed class max_seats
    const circCapacity = parseInt(circular.capacity, 10) || 50;
    const classMaxSeats = circular.class_max_seats ? parseInt(circular.class_max_seats, 10) : circCapacity;
    const effectiveSeats = Math.min(circCapacity, classMaxSeats);

    // 2. Compute each candidate's sum of exam marks and update applicant score
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

    // 3. Fetch candidates ordered by highest score
    const applicantsRes = await queryDb(`
      SELECT a.id, a.application_no, a.roll_no, a.applicant_name, a.score
      FROM website_admission_applicants a
      WHERE a.admission_id = $1 AND a.website_id = $2
      ORDER BY a.score DESC NULLS LAST, a.created_at ASC
    `, [admId, auth.website.id]);

    const allApplicants = applicantsRes.rows;
    if (allApplicants.length === 0) {
      return NextResponse.json({ success: false, error: 'No applicants found for this admission circular.' }, { status: 400 });
    }

    const staffId = auth.user?.id || null;
    let rank = 1;
    let selectedCount = 0;
    let rejectedCount = 0;

    for (let i = 0; i < allApplicants.length; i++) {
      const app = allApplicants[i];
      const isWithinSeatLimit = i < effectiveSeats;

      if (isWithinSeatLimit) {
        // Auto-select candidate
        await queryDb(`
          UPDATE website_admission_applicants
          SET status = 'selected',
              merit_position = $1,
              selected_at = CURRENT_TIMESTAMP,
              selected_by_staff_id = $2,
              selection_notes = $3,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $4
        `, [
          rank,
          staffId,
          `Auto-selected on merit (Rank #${rank}, Score: ${app.score || 0})`,
          app.id
        ]);

        // Sync into website_admission_results
        await queryDb(`
          INSERT INTO website_admission_results (
            website_id, admission_id, applicant_id, roll_no, applicant_name,
            score, merit_position, selection_status, remarks, is_published, published_by_staff_id
          ) VALUES (
            $1, $2, $3, $4, $5,
            $6, $7, 'selected', $8, true, $9
          )
          ON CONFLICT (admission_id, applicant_id) DO UPDATE SET
            roll_no = EXCLUDED.roll_no,
            applicant_name = EXCLUDED.applicant_name,
            score = EXCLUDED.score,
            merit_position = EXCLUDED.merit_position,
            selection_status = 'selected',
            remarks = EXCLUDED.remarks,
            is_published = true,
            updated_at = CURRENT_TIMESTAMP
        `, [
          auth.website.id,
          admId,
          app.id,
          app.roll_no || `ROL-${app.id}`,
          app.applicant_name,
          app.score || 0.00,
          rank,
          `Auto-selected on merit (Rank #${rank})`,
          staffId
        ]);

        rank++;
        selectedCount++;
      } else {
        // Beyond capacity: mark as rejected or waiting
        const fallbackStatus = mark_unselected_as === 'waiting' ? 'pending' : 'rejected';
        await queryDb(`
          UPDATE website_admission_applicants
          SET status = $1,
              merit_position = $2,
              selection_notes = $3,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $4
        `, [
          fallbackStatus,
          rank++,
          `Beyond available intake capacity (${effectiveSeats} seats)`,
          app.id
        ]);

        // Remove from results if previously selected
        await queryDb(`
          DELETE FROM website_admission_results
          WHERE admission_id = $1 AND applicant_id = $2
        `, [admId, app.id]);

        rejectedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Exam calculation complete! Top ${selectedCount} candidates selected according to class seat capacity of ${effectiveSeats}. ${rejectedCount} candidates marked as ${mark_unselected_as}.`,
      effective_seats: effectiveSeats,
      total_applicants: allApplicants.length,
      selected_count: selectedCount,
      rejected_count: rejectedCount
    });
  } catch (error) {
    console.error('Error in exam-marks process route:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
