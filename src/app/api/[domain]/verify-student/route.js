import { NextResponse } from 'next/server';
import { query } from 'src/lib/database/db';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator';

export async function GET(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json({ success: false, error: 'Tenant website not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const regParam = searchParams.get('reg');

    if (!regParam) {
      return NextResponse.json(
        { success: false, error: 'Registration number is required.' },
        { status: 400 }
      );
    }

    const regNorm = regParam.trim();

    const studentCheck = await query(
      `SELECT 
         s.name, 
         c.name AS class_name, 
         s.is_active, 
         s.is_registered, 
         s.image
       FROM website_students s
       LEFT JOIN website_student_information si ON s.id = si.student_id AND si.website_id = $1
       LEFT JOIN website_classes c ON si.class_id = c.id AND c.website_id = $1
       WHERE s.website_id = $1 AND LOWER(s.registration_number) = LOWER($2)`,
      [website.id, regNorm]
    );

    if (studentCheck.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No student found with this registration number.' },
        { status: 404 }
      );
    }

    const student = studentCheck.rows[0];

    // Determine status label
    let statusLabel = 'Inactive';
    if (student.is_registered && student.is_active) {
      statusLabel = 'Active';
    } else if (student.is_registered) {
      statusLabel = 'Registered (Pending Activation)';
    } else {
      statusLabel = 'Pre-registered (Setup Pending)';
    }

    const res_data = {
      name: student.name,
      class_name: student.class_name,
      status: statusLabel,
      image: student.image || null
    };

    return NextResponse.json(
      {
        success: true,
        message: 'Student verified successfully.',
        payload: res_data,
        paylod: res_data
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error verifying student:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error.' },
      { status: 500 }
    );
  }
}
