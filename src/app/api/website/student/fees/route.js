import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJWT } from '@/lib/auth';
import { query } from '@/lib/db';
import { triggerMonthlyFeeGeneration } from '@/lib/fees';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('fit-student')?.value;
    if (!token) {
      const res_err_326 = { error: 'Not authenticated' };
      return NextResponse.json({
        success: false,
        message: res_err_326?.error || res_err_326?.message || 'An error occurred',
        error: res_err_326?.error || 'Internal Server Error',
        paylod: null
      }, { status: 401 });
    }

    const decoded = verifyJWT(token);
    if (!decoded || !decoded.id) {
      const res_err_715 = { error: 'Invalid token' };
      return NextResponse.json({
        success: false,
        message: res_err_715?.error || res_err_715?.message || 'An error occurred',
        error: res_err_715?.error || 'Internal Server Error',
        paylod: null
      }, { status: 401 });
    }

    // Auto-generate missing monthly fees
    await triggerMonthlyFeeGeneration();

    const studentId = decoded.id;

    // Fetch student profile
    const studentRes = await query(`
      SELECT s.id, s.name, s.registration_number, c.name AS class_name
      FROM students s
      JOIN classes c ON c.id = s.class_id
      WHERE s.id = $1
    `, [studentId]);

    const student = studentRes.rows[0] || null;

    // Fetch student fees joined with student & class info
    const feesRes = await query(`
      SELECT sf.id, sf.student_id, sf.title, sf.amount, sf.due_date, sf.status, sf.paid_amount, sf.payment_date,
             s.name AS student_name, s.registration_number, c.name AS class_name
      FROM student_fees sf
      JOIN students s ON sf.student_id = s.id
      JOIN classes c ON s.class_id = c.id
      WHERE sf.student_id = $1
      ORDER BY sf.due_date DESC
    `, [studentId]);

    // Fetch student fines
    const finesRes = await query(`
      SELECT id, title, amount, status, created_at
      FROM student_fines
      WHERE student_id = $1
      ORDER BY created_at DESC
    `, [studentId]);

    const res_data_1104 = {
      student,
      fees: feesRes.rows,
      fines: finesRes.rows
    };
      return NextResponse.json({
        success: true,
        message: res_data_1104?.message || 'Successfully fecthed data',
        paylod: res_data_1104
      }, { status: 200 });
  } catch (error) {
    console.error('Error fetching student fees and fines:', error);
    const res_err_1974 = { error: 'Internal server error' };
      return NextResponse.json({
        success: false,
        message: res_err_1974?.error || res_err_1974?.message || 'An error occurred',
        error: res_err_1974?.error || 'Internal Server Error',
        paylod: null
      }, { status: 500 });
  }
}
