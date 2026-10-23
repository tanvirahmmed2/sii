import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { verifyStaffPaymentAccess } from 'src/lib/database/paymentGateways.js';

/**
 * GET /api/[domain]/staff/panel/admissions/applicants/export?status=all|selected|pending|rejected
 * Streams a formatted CSV export of applicants according to the selected filter.
 */
export async function GET(request, context) {
  try {
    const auth = await verifyStaffPaymentAccess(request, context);
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'all';
    const admissionId = searchParams.get('admission_id');

    let sql = `
      SELECT a.application_no, a.roll_no, a.applicant_name, a.email, a.phone,
             a.gender, a.date_of_birth, a.status,
             COALESCE(p.payment_status, 'unpaid') AS payment_status,
             a.score, a.merit_position, a.selection_notes, a.created_at,
             a.last_class, a.last_class_grade, a.last_institution,
             adm.title AS circular_title, c.name AS class_name,
             g.data->>'father_name' AS father_name,
             g.data->>'father_phone' AS father_phone,
             g.data->>'mother_name' AS mother_name,
             addr.data->>'present_address' AS present_address,
             inf.data->>'previous_school' AS previous_school,
             inf.data->>'previous_gpa' AS previous_gpa
      FROM website_admission_applicants a
      JOIN website_admissions adm ON adm.id = a.admission_id
      LEFT JOIN website_classes c ON c.id = adm.class_id
      LEFT JOIN website_admission_fee_payments p ON p.applicant_id = a.id
      LEFT JOIN website_admission_applicant_info inf ON inf.applicant_id = a.id
      LEFT JOIN website_admission_applicant_guardians g ON g.applicant_id = a.id
      LEFT JOIN website_admission_applicant_addresses addr ON addr.applicant_id = a.id
      WHERE a.website_id = $1
    `;

    const params = [auth.website.id];
    let paramIndex = 2;

    if (admissionId) {
      sql += ` AND a.admission_id = $${paramIndex++}`;
      params.push(parseInt(admissionId, 10));
    }

    if (status && status !== 'all') {
      sql += ` AND a.status = $${paramIndex++}`;
      params.push(status);
    } else {
      sql += ` AND a.status NOT IN ('incomplete', 'unpaid')`;
    }

    sql += ` ORDER BY a.merit_position ASC NULLS LAST, a.created_at DESC`;

    const res = await queryDb(sql, params);

    // Build CSV
    const headers = [
      'Application No',
      'Roll No',
      'Applicant Name',
      'Email',
      'Phone',
      'Gender',
      'Date of Birth',
      'Status',
      'Payment Status',
      'Score',
      'Merit Position',
      'Circular',
      'Target Class',
      'Father Name',
      'Father Phone',
      'Mother Name',
      'Present Address',
      'Last Class',
      'Last Class Grade',
      'Last Institution',
      'Applied Date',
      'Selection Notes'
    ];

    const escapeCsv = (val) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    let csvContent = headers.join(',') + '\r\n';

    for (const row of res.rows) {
      const line = [
        escapeCsv(row.application_no),
        escapeCsv(row.roll_no || ''),
        escapeCsv(row.applicant_name),
        escapeCsv(row.email),
        escapeCsv(row.phone),
        escapeCsv(row.gender),
        escapeCsv(row.date_of_birth ? new Date(row.date_of_birth).toISOString().split('T')[0] : ''),
        escapeCsv(row.status?.toUpperCase()),
        escapeCsv(row.payment_status?.toUpperCase()),
        escapeCsv(row.score !== null ? row.score : ''),
        escapeCsv(row.merit_position || ''),
        escapeCsv(row.circular_title),
        escapeCsv(row.class_name || 'N/A'),
        escapeCsv(row.father_name || ''),
        escapeCsv(row.father_phone || ''),
        escapeCsv(row.mother_name || ''),
        escapeCsv(row.present_address || ''),
        escapeCsv(row.last_class || row.previous_school || ''),
        escapeCsv(row.last_class_grade || row.previous_gpa || ''),
        escapeCsv(row.last_institution || row.previous_school || ''),
        escapeCsv(row.created_at ? new Date(row.created_at).toISOString().split('T')[0] : ''),
        escapeCsv(row.selection_notes || '')
      ].join(',');

      csvContent += line + '\r\n';
    }

    const filename = `applicants_${status}_${Date.now()}.csv`;

    return new Response(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    });
  } catch (error) {
    console.error('Error in GET /admissions/applicants/export:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
