import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { queryDb } from 'src/lib/database/db.js';
import { verifyEducationFeeAccess } from 'src/lib/middleware/education_fee_auth.js';

// GET: Preview eligible students for fee due generation
export async function GET(request, context) {
  try {
    const auth = await verifyEducationFeeAccess(request, context, 'view');
    if (!auth.allowed) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { website } = auth;
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('class_id');
    const sectionId = searchParams.get('section_id');
    const feeId = searchParams.get('education_fee_id');
    const monthName = searchParams.get('month_name') || '';

    if (!classId) {
      return NextResponse.json({ success: false, error: 'class_id is required for preview.' }, { status: 400 });
    }

    let studentQuery = `
      SELECT s.id, s.registration_no, s.roll_no, s.class_id, s.section_id,
             i.name, i.number AS phone
      FROM website_students s
      LEFT JOIN website_student_info i ON i.student_id = s.id
      WHERE s.website_id = $1 AND s.class_id = $2
    `;
    const params = [website.id, classId];
    let idx = 3;

    if (sectionId && sectionId !== 'all') {
      studentQuery += ` AND s.section_id = $${idx++}`;
      params.push(sectionId);
    }

    studentQuery += ` ORDER BY s.roll_no ASC NULLS LAST, s.id ASC`;

    const studentsRes = await queryDb(studentQuery, params);
    const totalStudents = studentsRes.rows.length;

    // Check how many already have due generated for this fee & month
    let existingDuesCount = 0;
    if (feeId && monthName) {
      const existingCheck = await queryDb(
        `SELECT COUNT(*)::int AS count
         FROM website_education_fee_payments
         WHERE website_id = $1 AND education_fee_id = $2 AND month_name = $3 AND class_id = $4`,
        [website.id, feeId, monthName, classId]
      );
      existingDuesCount = existingCheck.rows[0]?.count || 0;
    }

    return NextResponse.json({
      success: true,
      totalStudents,
      existingDuesCount,
      eligibleStudentsCount: Math.max(0, totalStudents - existingDuesCount),
      sampleStudents: studentsRes.rows.slice(0, 10),
    });
  } catch (error) {
    console.error('Error previewing fee dues:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to preview student fee dues.' },
      { status: 500 }
    );
  }
}

// POST: Batch generate dues for class students
export async function POST(request, context) {
  try {
    const auth = await verifyEducationFeeAccess(request, context, 'create');
    if (!auth.allowed) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { website, actor } = auth;
    const body = await request.json().catch(() => ({}));

    const {
      class_id,
      section_id,
      session_id,
      education_fee_id,
      month_name,
      due_date,
      custom_amount,
      fine_amount = 0,
      notes = '',
    } = body;

    if (!class_id) {
      return NextResponse.json({ success: false, error: 'Target academic class is required.' }, { status: 400 });
    }

    if (!education_fee_id) {
      return NextResponse.json({ success: false, error: 'Configured education fee structure is required.' }, { status: 400 });
    }

    if (!month_name || !String(month_name).trim()) {
      return NextResponse.json({ success: false, error: 'Billing month or period name is required (e.g. "October 2026").' }, { status: 400 });
    }

    // Fetch the education fee configuration
    const feeRes = await queryDb(
      `SELECT * FROM website_education_fees WHERE id = $1 AND website_id = $2`,
      [education_fee_id, website.id]
    );

    if (feeRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Education fee structure not found.' }, { status: 404 });
    }

    const feeConfig = feeRes.rows[0];
    const finalAmount = custom_amount !== undefined && custom_amount !== '' ? parseFloat(custom_amount) : parseFloat(feeConfig.amount);
    const initialFine = parseFloat(fine_amount || 0);

    // Fetch active students for the class/section
    let studentQuery = `
      SELECT s.id, s.class_id, s.section_id, s.session_id, s.roll_no, s.registration_no
      FROM website_students s
      WHERE s.website_id = $1 AND s.class_id = $2
    `;
    const studentParams = [website.id, class_id];
    let sIdx = 3;

    if (section_id && section_id !== 'all') {
      studentQuery += ` AND s.section_id = $${sIdx++}`;
      studentParams.push(section_id);
    }

    const studentsRes = await queryDb(studentQuery, studentParams);
    const students = studentsRes.rows;

    if (students.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No students found enrolled in the selected class and section.',
      }, { status: 400 });
    }

    // Default due date calculation
    let targetDueDate = due_date;
    if (!targetDueDate) {
      const today = new Date();
      const dueDay = feeConfig.due_day_of_month || 10;
      targetDueDate = new Date(today.getFullYear(), today.getMonth(), dueDay).toISOString().split('T')[0];
    }

    let createdCount = 0;
    let skippedCount = 0;

    const datePrefix = new Date().toISOString().slice(2, 7).replace('-', '');

    for (const stu of students) {
      // Check if fee due already exists for this student, fee, and month
      const existing = await queryDb(
        `SELECT id FROM website_education_fee_payments 
         WHERE website_id = $1 AND student_id = $2 AND education_fee_id = $3 AND month_name = $4
         LIMIT 1`,
        [website.id, stu.id, feeConfig.id, String(month_name).trim()]
      );

      if (existing.rows.length > 0) {
        skippedCount++;
        continue;
      }

      const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
      const invoiceNo = `INV-${datePrefix}-${stu.id}-${randomSuffix}`;

      await queryDb(
        `INSERT INTO website_education_fee_payments (
          website_id,
          education_fee_id,
          student_id,
          class_id,
          section_id,
          session_id,
          invoice_no,
          title,
          fee_type,
          month_name,
          amount,
          fine_amount,
          paid_amount,
          due_date,
          payment_status,
          notes,
          received_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 0.00, $13, 'unpaid', $14, $15)`,
        [
          website.id,
          feeConfig.id,
          stu.id,
          stu.class_id || class_id,
          stu.section_id || (section_id !== 'all' ? section_id : null),
          session_id || stu.session_id || feeConfig.session_id || null,
          invoiceNo,
          feeConfig.fee_title,
          feeConfig.fee_type || 'tuition',
          String(month_name).trim(),
          finalAmount,
          initialFine,
          targetDueDate,
          notes ? String(notes).trim() : null,
          actor?.name || 'Staff'
        ]
      );

      createdCount++;
    }

    return NextResponse.json({
      success: true,
      message: `Generated ${createdCount} student fee dues successfully (${skippedCount} already existed and were skipped).`,
      createdCount,
      skippedCount,
      totalProcessed: students.length,
    });
  } catch (error) {
    console.error('Error batch generating fee dues:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to generate fee dues.' },
      { status: 500 }
    );
  }
}
