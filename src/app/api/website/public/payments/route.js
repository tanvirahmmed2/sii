import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { triggerMonthlyFeeGeneration } from '@/lib/fees';

// GET billing details by registration number (Public route)
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const regNo = searchParams.get('reg_no');

    if (!regNo) {
      return NextResponse.json({ success: false, error: 'Registration number is required.' }, { status: 400 });
    }

    // Auto-generate missing monthly fees
    await triggerMonthlyFeeGeneration();

    // Find student
    const studentRes = await query(`
      SELECT s.id, s.name, s.registration_number, c.name AS class_name 
      FROM students s
      JOIN classes c ON s.class_id = c.id
      WHERE LOWER(s.registration_number) = LOWER($1) AND s.is_registered = TRUE
    `, [regNo.trim()]);

    if (studentRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Student with this registration number not found.' }, { status: 404 });
    }

    const student = studentRes.rows[0];

    // Fetch student fees invoices (Last 3 fees)
    const feesRes = await query(`
      SELECT sf.id, sf.title, sf.amount, sf.due_date, sf.status, sf.paid_amount, sf.payment_date,
             s.name AS student_name, s.registration_number, c.name AS class_name
      FROM student_fees sf
      JOIN students s ON sf.student_id = s.id
      JOIN classes c ON s.class_id = c.id
      WHERE sf.student_id = $1
      ORDER BY sf.due_date DESC, sf.id DESC
      LIMIT 3
    `, [student.id]);

    // Fetch student fines log
    const finesRes = await query(`
      SELECT id, title, amount, status, created_at
      FROM student_fines
      WHERE student_id = $1
      ORDER BY created_at DESC
    `, [student.id]);

    return NextResponse.json({
      success: true,
      paylod: {
        student: {
          name: student.name,
          registration_number: student.registration_number,
          class_name: student.class_name
        },
        fees: feesRes.rows,
        fines: finesRes.rows
      }
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching public payments:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
