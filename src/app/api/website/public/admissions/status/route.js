import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

// GET admission application status by Email or Application ID (Public route)
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');

    if (!search) {
      return NextResponse.json({ success: false, error: 'Application ID or Email is required.' }, { status: 400 });
    }

    let sql = `
      SELECT 
        sa.id AS application_id,
        sa.applicant_name AS candidate_name,
        sa.email AS candidate_email,
        sa.phone AS candidate_phone,
        sa.date_of_birth,
        sa.gender,
        sa.blood_group,
        sa.address,
        sa.father_name,
        sa.father_phone,
        sa.mother_name,
        sa.mother_phone,
        sa.status AS application_status,
        COALESCE(af.status, 'unpaid') AS payment_status,
        COALESCE(af.amount, adm.fees, 0) AS fee_amount,
        sa.created_at,
        c.name AS class_name,
        adm.title AS circular_name,
        adm.is_result_published,
        st.registration_number,
        st.roll AS roll_number,
        sec.name AS section_name
      FROM student_admissions sa
      LEFT JOIN classes c ON sa.applied_class_id = c.id
      LEFT JOIN admissions adm ON sa.admission_id = adm.id
      LEFT JOIN admission_fees af ON sa.id = af.student_admission_id
      LEFT JOIN students st ON LOWER(st.email) = LOWER(sa.email)
      LEFT JOIN sections sec ON st.section_id = sec.id
    `;

    const params = [];
    const searchTrimmed = search.trim();

    let idValue = null;
    if (!isNaN(parseInt(searchTrimmed, 10))) {
      idValue = parseInt(searchTrimmed, 10);
    } else if (searchTrimmed.toUpperCase().startsWith('APP-')) {
      const parsed = parseInt(searchTrimmed.replace(/^APP-/i, ''), 10);
      if (!isNaN(parsed)) idValue = parsed;
    }

    if (searchTrimmed.includes('@')) {
      sql += ' WHERE LOWER(sa.email) = LOWER($1)';
      params.push(searchTrimmed);
    } else if (idValue !== null) {
      sql += ' WHERE sa.id = $1 OR sa.id = $2';
      params.push(idValue, idValue > 10000 ? idValue - 10000 : idValue);
    } else {
      sql += ' WHERE LOWER(sa.email) = LOWER($1) OR LOWER(sa.applicant_name) LIKE LOWER($2)';
      params.push(searchTrimmed, `%${searchTrimmed}%`);
    }

    sql += ' ORDER BY sa.created_at DESC LIMIT 1';

    const result = await query(sql, params);

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'No matching admission application found.' }, { status: 404 });
    }

    const settingsRes = await query('SELECT address, contact_phone, contact_email FROM website_settings ORDER BY id ASC LIMIT 1');
    const dbSettings = settingsRes.rows[0] || {};

    return NextResponse.json({
      success: true,
      paylod: {
        application: {
          ...result.rows[0],
          school_address: dbSettings.address || '',
          school_phone: dbSettings.contact_phone || '',
          school_email: dbSettings.contact_email || ''
        }
      }
    }, { status: 200 });
  } catch (error) {
    console.error('Error checking public admission status:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
