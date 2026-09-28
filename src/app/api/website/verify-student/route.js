import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request) {
  try {
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
       FROM students s
       JOIN classes c ON s.class_id = c.id
       WHERE LOWER(s.registration_number) = LOWER($1)`,
      [regNorm]
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

    return NextResponse.json(
      {
        success: true,
        message: 'Student verified successfully.',
        paylod: {
          name: student.name,
          class_name: student.class_name,
          status: statusLabel,
          image: student.image || null
        }
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
