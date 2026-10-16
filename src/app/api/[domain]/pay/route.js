import { NextResponse } from 'next/server';
import { queryDb, pool } from '@/lib/database/db';
import { resolveWebsiteFromRequest } from '@/lib/middleware/creator';

export const dynamic = 'force-dynamic';

/**
 * GET /api/[domain]/pay
 * Central query endpoint for /pay home portal.
 * Multi-criteria search across all fee categories.
 */
export async function GET(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json({ success: false, error: 'Institution portal not found.' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const identifier = (searchParams.get('identifier') || '').trim();
    const type = (searchParams.get('type') || 'all').toLowerCase();

    // Fetch active gateways for this tenant
    const gwRes = await queryDb(`
      SELECT ga.id, ga.gateway_code AS code, ga.account_name, ga.account_number,
             ga.environment, ga.currency, ga.is_default,
             gw.name AS label, gw.category, gw.logo_icon
      FROM website_payment_gateway_accounts ga
      JOIN website_payment_gateways gw ON gw.code = ga.gateway_code
      WHERE ga.website_id = $1 AND ga.is_active = TRUE
      ORDER BY ga.is_default DESC, ga.id ASC
    `, [website.id]);

    // Sanitize gateways: only expose public gateway info
    const sanitizedGateways = gwRes.rows.map(gw => ({
      id: gw.id,
      code: gw.code,
      label: gw.label || gw.code.toUpperCase(),
      category: gw.category,
      logo_icon: gw.logo_icon,
      is_default: gw.is_default
    }));

    if (!identifier) {
      return NextResponse.json({
        success: true,
        message: 'Enter student roll, registration, or application tracking number to query dues.',
        available_gateways: sanitizedGateways,
        portals: [
          { name: 'Education Fees', path: '/pay/education-fees' },
          { name: 'Examination Fees', path: '/pay/exam-fees' },
          { name: 'Admission Fees', path: '/pay/admission-fees' },
          { name: 'Residential Fees', path: '/pay/residential-fees' }
        ]
      });
    }

    // Helper functions for masking sensitive data to prevent scraping leaks
    const maskEmail = (email) => {
      if (!email || typeof email !== 'string') return null;
      const parts = email.split('@');
      if (parts.length !== 2) return '***@***';
      const name = parts[0];
      const host = parts[1];
      if (name.length <= 2) return `${name.charAt(0)}*@${host}`;
      return `${name.slice(0, 2)}****${name.slice(-1)}@${host}`;
    };

    const maskPhone = (phone) => {
      if (!phone || typeof phone !== 'string') return null;
      const clean = phone.trim();
      if (clean.length <= 4) return '****';
      return `${clean.slice(0, 3)}*****${clean.slice(-3)}`;
    };

    // Forward to dues resolution logic
    const studentRes = await queryDb(`
      SELECT s.id, s.registration_no, s.roll_no, s.student_unique_id,
             COALESCE(i.name, s.name, 'Student') AS name,
             COALESCE(i.email, s.email) AS raw_email,
             COALESCE(i.phone, s.number) AS raw_phone,
             c.name AS class_name, c.id AS class_id
      FROM website_students s
      LEFT JOIN website_student_information i ON i.student_id = s.id
      LEFT JOIN website_classes c ON c.id = s.class_id
      WHERE s.website_id = $1
        AND (
          s.student_unique_id = $2 OR
          s.roll_no = $2 OR
          s.registration_no = $2 OR
          i.email = $2 OR
          s.email = $2 OR
          i.phone = $2 OR
          s.number = $2
        )
      LIMIT 1
    `, [website.id, identifier]);

    let student = null;
    if (studentRes.rows.length > 0) {
      const row = studentRes.rows[0];
      student = {
        id: row.id,
        name: row.name,
        student_unique_id: row.student_unique_id,
        roll_no: row.roll_no,
        registration_no: row.registration_no,
        class_name: row.class_name,
        masked_email: maskEmail(row.raw_email),
        masked_phone: maskPhone(row.raw_phone)
      };
    }

    let applicant = null;
    if (!student || type === 'admission' || type === 'all') {
      const appRes = await queryDb(`
        SELECT a.id, a.application_no, a.applicant_name, a.email, a.phone,
               a.status, a.admission_id, adm.title AS circular_title,
               adm.fee_amount, adm.fee_currency
        FROM website_admission_applicants a
        LEFT JOIN website_admissions adm ON adm.id = a.admission_id
        WHERE a.website_id = $1
          AND (
            a.application_no = $2 OR
            a.phone = $2 OR
            a.email = $2 OR
            CAST(a.id AS TEXT) = $2
          )
        ORDER BY a.id DESC LIMIT 1
      `, [website.id, identifier]);

      if (appRes.rows.length > 0) {
        const row = appRes.rows[0];
        applicant = {
          id: row.id,
          application_no: row.application_no,
          applicant_name: row.applicant_name,
          circular_title: row.circular_title,
          status: row.status,
          masked_email: maskEmail(row.email),
          masked_phone: maskPhone(row.phone)
        };
      }
    }

    if (!student && !applicant) {
      return NextResponse.json({
        success: false,
        error: `No student or admission applicant found matching "${identifier}".`,
        available_gateways: sanitizedGateways
      }, { status: 404 });
    }

    const dues = { education: [], exam: [], admission: [], residential: [] };

    // 1. Education Dues
    if (student && (type === 'all' || type === 'education')) {
      const eduRes = await queryDb(`
        SELECT id, invoice_no, title, month_name, amount, fine_amount, paid_amount,
               currency, due_date, payment_status,
               (amount + fine_amount - paid_amount) AS net_due
        FROM website_education_fee_payments
        WHERE website_id = $1 AND student_id = $2
          AND payment_status IN ('unpaid', 'partially_paid')
        ORDER BY id ASC
      `, [website.id, student.id]);

      dues.education = eduRes.rows.map(r => ({
        ...r,
        category: 'education_fees',
        category_label: 'Education & Tuition Fee',
        amount: parseFloat(r.amount),
        fine_amount: parseFloat(r.fine_amount || 0),
        paid_amount: parseFloat(r.paid_amount || 0),
        net_due: parseFloat(r.net_due)
      }));
    }

    // 2. Exam Dues
    if (student && (type === 'all' || type === 'exam')) {
      const examRes = await queryDb(`
        SELECT p.id, p.invoice_no, p.title, p.amount, p.currency, p.payment_status,
               e.name AS exam_name, p.amount AS net_due
        FROM website_exam_fee_payments p
        LEFT JOIN website_exams e ON e.id = p.exam_id
        WHERE p.website_id = $1 AND p.student_id = $2
          AND p.payment_status IN ('pending', 'unpaid')
        ORDER BY p.id ASC
      `, [website.id, student.id]);

      dues.exam = examRes.rows.map(r => ({
        ...r,
        category: 'exam_fees',
        category_label: 'Examination Fee',
        amount: parseFloat(r.amount),
        net_due: parseFloat(r.net_due)
      }));
    }

    // 3. Admission Dues
    if (applicant && (type === 'all' || type === 'admission')) {
      const admFeeRes = await queryDb(`
        SELECT p.id, p.invoice_no, p.amount, p.currency, p.payment_status,
               a.application_no, a.applicant_name,
               COALESCE(c.title, 'Admission Application Fee') AS title,
               p.amount AS net_due
        FROM website_admission_fee_payments p
        JOIN website_admission_applicants a ON a.id = p.applicant_id
        LEFT JOIN website_admissions c ON c.id = p.admission_id
        WHERE p.website_id = $1 AND p.applicant_id = $2
          AND p.payment_status IN ('pending', 'unpaid')
        ORDER BY p.id ASC
      `, [website.id, applicant.id]);

      dues.admission = admFeeRes.rows.map(r => ({
        ...r,
        category: 'admission_fees',
        category_label: 'Admission Application Fee',
        amount: parseFloat(r.amount),
        net_due: parseFloat(r.net_due)
      }));
    }

    // 4. Residential Dues (using website_hall_fee_payments)
    if (student && (type === 'all' || type === 'residential')) {
      const resFeeRes = await queryDb(`
        SELECT p.id, p.invoice_no, p.title, p.month_name, p.amount, p.fine_amount,
               p.paid_amount, p.currency, p.due_date, p.payment_status,
               h.name AS hall_name, r.room_number, s.seat_number,
               (p.amount + p.fine_amount - p.paid_amount) AS net_due
        FROM website_hall_fee_payments p
        LEFT JOIN website_halls h ON h.id = p.hall_id
        LEFT JOIN website_hall_rooms r ON r.id = p.room_id
        LEFT JOIN website_hall_room_seats s ON s.id = p.seat_id
        WHERE p.website_id = $1 AND p.student_id = $2
          AND p.payment_status IN ('unpaid', 'partially_paid')
        ORDER BY p.id ASC
      `, [website.id, student.id]);

      let resDues = resFeeRes.rows.map(r => ({
        ...r,
        category: 'residential_fees',
        category_label: 'Hall & Residential Fee',
        amount: parseFloat(r.amount),
        fine_amount: parseFloat(r.fine_amount || 0),
        paid_amount: parseFloat(r.paid_amount || 0),
        net_due: parseFloat(r.net_due)
      }));

      if (resDues.length === 0) {
        const allocRes = await queryDb(`
          SELECT a.id, a.fee_monthly, h.name AS hall_name, r.room_number, s.seat_number
          FROM website_hall_seat_allocations a
          JOIN website_halls h ON h.id = a.hall_id
          JOIN website_hall_rooms r ON r.id = a.room_id
          JOIN website_hall_room_seats s ON s.id = a.seat_id
          WHERE a.website_id = $1 AND a.student_id = $2 AND a.status = 'active'
          LIMIT 1
        `, [website.id, student.id]);

        if (allocRes.rows.length > 0) {
          const alloc = allocRes.rows[0];
          const rent = parseFloat(alloc.fee_monthly) || 0;
          if (rent > 0) {
            resDues.push({
              id: `alloc-${alloc.id}`,
              allocation_id: alloc.id,
              category: 'residential_fees',
              category_label: 'Hall Seat Monthly Rent',
              invoice_no: `INV-HALL-${student.registration_no || student.id}-${Date.now().toString().slice(-4)}`,
              title: `${alloc.hall_name} — Room ${alloc.room_number} (Seat ${alloc.seat_number})`,
              amount: rent,
              net_due: rent,
              currency: 'BDT',
              payment_status: 'unpaid'
            });
          }
        }
      }

      dues.residential = resDues;
    }

    const allItems = [...dues.education, ...dues.exam, ...dues.admission, ...dues.residential];
    const totalDue = allItems.reduce((acc, curr) => acc + (curr.net_due || 0), 0);

    return NextResponse.json({
      success: true,
      student,
      applicant,
      dues,
      summary: {
        total_unpaid_items: allItems.length,
        total_due_amount: totalDue,
        currency: 'BDT'
      },
      available_gateways: sanitizedGateways
    });
  } catch (error) {
    console.error('Error in GET /api/[domain]/pay:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
