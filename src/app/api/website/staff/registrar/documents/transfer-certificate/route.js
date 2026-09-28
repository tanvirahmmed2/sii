import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJWT } from '@/lib/auth';
import { query } from '@/lib/db';
import { logActivity } from '@/lib/activity_logger';

export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('fit-staff')?.value || cookieStore.get('fit-admin')?.value;
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyJWT(token);
    if (!decoded) {
      return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });
    }

    const {
      student_id,
      reason_for_leaving,
      destination_school,
      conduct = 'Good',
      promoted_to_class = 'Promoted',
      remarks = ''
    } = await request.json();

    if (!student_id || !reason_for_leaving) {
      return NextResponse.json({ success: false, error: 'student_id and reason_for_leaving are required.' }, { status: 400 });
    }

    // Check student existence
    const studentRes = await query(`
      SELECT s.*, c.name AS class_name
      FROM students s
      LEFT JOIN classes c ON c.id = s.class_id
      WHERE s.id = $1
    `, [student_id]);

    if (studentRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Student not found.' }, { status: 404 });
    }

    const student = studentRes.rows[0];

    if (student.status === 'transferred') {
      return NextResponse.json({ success: false, error: 'This student has already been issued a Transfer Certificate.' }, { status: 400 });
    }

    const tcNumber = `TC-${Date.now().toString().slice(-6)}-${student.id}`;

    // 1. Insert into student_transfer_certificates
    const tcRes = await query(`
      INSERT INTO student_transfer_certificates (
        tc_number, student_id, reason_for_leaving, destination_school,
        conduct, last_class_attended, promoted_to_class, fee_cleared, remarks,
        issued_by_type, issued_by_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [
      tcNumber,
      student.id,
      reason_for_leaving.trim(),
      destination_school ? destination_school.trim() : 'N/A',
      conduct,
      student.class_name || 'N/A',
      promoted_to_class,
      true,
      remarks ? remarks.trim() : null,
      decoded.role || 'staff',
      decoded.id
    ]);

    const tc = tcRes.rows[0];

    // 2. Insert into transferred_students archive
    await pool_or_query(`
      INSERT INTO transferred_students (
        student_id, tc_id, transfer_date, reason, destination_school,
        previous_class, previous_roll, archived_by_type, archived_by_id
      ) VALUES ($1, $2, CURRENT_DATE, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (student_id) DO UPDATE SET
        tc_id = EXCLUDED.tc_id,
        transfer_date = CURRENT_DATE,
        reason = EXCLUDED.reason,
        destination_school = EXCLUDED.destination_school
    `, [
      student.id,
      tc.id,
      reason_for_leaving.trim(),
      destination_school ? destination_school.trim() : 'N/A',
      student.class_name || 'N/A',
      student.roll || null,
      decoded.role || 'staff',
      decoded.id
    ]);

    // 3. Deactivate & update student status (is_active = false, status = 'transferred', class_id = null, section_id = null)
    await query(`
      UPDATE students
      SET status = 'transferred',
          is_active = FALSE,
          class_id = NULL,
          section_id = NULL,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [student.id]);

    await logActivity({
      userId: decoded.id,
      userType: decoded.role || 'staff',
      action: 'ISSUE_TRANSFER_CERTIFICATE',
      details: {
        student_id: student.id,
        student_name: student.name,
        tc_number: tcNumber,
        reason: reason_for_leaving
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Transfer Certificate issued successfully. Student status updated to transferred.',
      paylod: {
        tc,
        student: { ...student, status: 'transferred', is_active: false, class_id: null, section_id: null }
      }
    });

  } catch (error) {
    console.error('Error issuing TC:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}

// Helper to prevent undefined pool_or_query
async function pool_or_query(sql, params) {
  return query(sql, params);
}
