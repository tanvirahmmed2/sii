import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { verifyEducationFeeAccess } from 'src/lib/middleware/education_fee_auth.js';

export async function GET(request, context) {
  try {
    const auth = await verifyEducationFeeAccess(request, context, 'view');
    if (!auth.allowed) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { website } = auth;

    // Fetch classes
    const classesRes = await queryDb(
      `SELECT id, name AS class_name, numeric_name AS numeric_value
       FROM website_classes
       WHERE website_id = $1
       ORDER BY numeric_name ASC NULLS LAST, name ASC`,
      [website.id]
    );

    // Fetch sections
    const sectionsRes = await queryDb(
      `SELECT id, class_id, name AS section_name
       FROM website_sections
       WHERE website_id = $1
       ORDER BY name ASC`,
      [website.id]
    );

    // Fetch sessions
    const sessionsRes = await queryDb(
      `SELECT id, name AS session_name, is_current
       FROM website_sessions
       WHERE website_id = $1
       ORDER BY is_current DESC, name DESC`,
      [website.id]
    );

    const feeTypes = [
      { id: 'tuition', label: 'Monthly Tuition Fee' },
      { id: 'admission', label: 'Admission Fee' },
      { id: 'session', label: 'Session / Development Fee' },
      { id: 'lab', label: 'Computer / Science Lab Fee' },
      { id: 'library', label: 'Library Fee' },
      { id: 'sports', label: 'Sports & Cultural Fee' },
      { id: 'transport', label: 'Transport Fee' },
      { id: 'hostel', label: 'Hostel Accommodation Fee' },
      { id: 'others', label: 'Other Educational Charges' },
    ];

    const frequencies = [
      { id: 'monthly', label: 'Monthly' },
      { id: 'term', label: 'Per Term / Semester' },
      { id: 'quarterly', label: 'Quarterly' },
      { id: 'yearly', label: 'Annual / Yearly' },
      { id: 'one_time', label: 'One Time' },
    ];

    return NextResponse.json({
      success: true,
      classes: classesRes.rows,
      sections: sectionsRes.rows,
      sessions: sessionsRes.rows,
      feeTypes,
      frequencies,
    });
  } catch (error) {
    console.error('Error fetching education fee meta:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to load fee configuration metadata.' },
      { status: 500 }
    );
  }
}
