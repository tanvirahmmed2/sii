import { NextResponse } from 'next/server';
import { query } from 'src/lib/database/db';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator';

// GET billing details by registration number (Public route)
export async function GET(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json({ success: false, error: 'Tenant website not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const regNo = searchParams.get('reg_no');

    if (!regNo) {
      return NextResponse.json({ success: false, error: 'Registration number is required.' }, { status: 400 });
    }

    // Find student
    const studentRes = await query(`
      SELECT s.id, s.name, s.registration_number, c.name AS class_name 
      FROM website_students s
      LEFT JOIN website_student_information si ON si.student_id = s.id AND si.website_id = $1
      LEFT JOIN website_classes c ON si.class_id = c.id AND c.website_id = $1
      WHERE s.website_id = $1 AND LOWER(s.registration_number) = LOWER($2) AND s.is_registered = TRUE
    `, [website.id, regNo.trim()]);

    if (studentRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Student with this registration number not found.' }, { status: 404 });
    }

    const student = studentRes.rows[0];

    // Fetch student fees invoices (Last 3 fees)
    const feesRes = await query(`
      SELECT sf.id, sf.title, sf.amount, sf.due_date, sf.status, sf.paid_amount, sf.payment_date,
             s.name AS student_name, s.registration_number, c.name AS class_name
      FROM website_student_fees sf
      JOIN website_students s ON sf.student_id = s.id AND s.website_id = $1
      LEFT JOIN website_student_information si ON si.student_id = s.id AND si.website_id = $1
      LEFT JOIN website_classes c ON si.class_id = c.id AND c.website_id = $1
      WHERE sf.website_id = $1 AND sf.student_id = $2
      ORDER BY sf.due_date DESC, sf.id DESC
      LIMIT 3
    `, [website.id, student.id]);

    // Fetch student fines log
    const finesRes = await query(`
      SELECT id, title, amount, status, created_at
      FROM website_student_fines
      WHERE website_id = $1 AND student_id = $2
      ORDER BY created_at DESC
    `, [website.id, student.id]);

    const res_data = {
      student: {
        name: student.name,
        registration_number: student.registration_number,
        class_name: student.class_name
      },
      fees: feesRes.rows,
      fines: finesRes.rows
    };

    return NextResponse.json({
      success: true,
      payload: res_data,
      paylod: res_data
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching public payments:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
