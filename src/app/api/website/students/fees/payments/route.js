import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { isAdmin, isCashier } from '@/lib/auth';

// GET student fee payment logs (Admin/Cashier only)
export async function GET(request) {
  try {
    const authenticated = (await isAdmin()) || (await isCashier());
    if (!authenticated) {
      const res_err_289 = { error: 'Unauthorized. Admins only.' };
      return NextResponse.json({
        success: false,
        message: res_err_289?.error || res_err_289?.message || 'An error occurred',
        error: res_err_289?.error || 'Internal Server Error',
        paylod: null
      }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const feeId = searchParams.get('student_fee_id');
    const studentId = searchParams.get('student_id');

    let sql = `
      SELECT 
        sfp.*,
        sf.title AS fee_title,
        sf.amount AS fee_total_amount,
        s.name AS student_name, 
        s.registration_number,
        c.name AS class_name
      FROM student_fee_payments sfp
      JOIN student_fees sf ON sfp.student_fee_id = sf.id
      JOIN students s ON sf.student_id = s.id
      JOIN classes c ON s.class_id = c.id
    `;
    let params = [];
    let conditions = [];

    if (feeId) {
      params.push(feeId);
      conditions.push(`sfp.student_fee_id = $${params.length}`);
    }

    if (studentId) {
      params.push(studentId);
      conditions.push(`sf.student_id = $${params.length}`);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY sfp.payment_date DESC';

    const result = await query(sql, params);
    const res_data_1445 = { payments: result.rows };
      return NextResponse.json({
        success: true,
        message: res_data_1445?.message || 'Successfully fecthed data',
        paylod: res_data_1445
      }, { status: 200 });
  } catch (error) {
    console.error('Error fetching student fee payments:', error);
    const res_err_2050 = { error: 'Failed to retrieve payment logs. Internal server error.' };
      return NextResponse.json({
        success: false,
        message: res_err_2050?.error || res_err_2050?.message || 'An error occurred',
        error: res_err_2050?.error || 'Internal Server Error',
        paylod: null
      }, { status: 500 });
  }
}
