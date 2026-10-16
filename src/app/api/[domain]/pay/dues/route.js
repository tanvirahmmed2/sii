import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator.js';

/**
 * GET /api/[domain]/pay/dues
 * Public search endpoint for students and admission applicants to query unpaid fees.
 * Query Parameters:
 *   - identifier: Registration No / Roll No / Application No / Student ID / Email
 *   - type: 'all' | 'education' | 'exam' | 'admission' | 'residential'
 *   - id: Direct applicant ID or student ID
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
    const directId = searchParams.get('id');

    // Fetch active payment gateway accounts configured for this institution
    const gatewayRes = await queryDb(`
      SELECT ga.id, ga.gateway_code, ga.account_name, ga.account_number,
             ga.environment, ga.currency, ga.is_default,
             gw.name AS gateway_name, gw.category AS gateway_category, gw.logo_icon
      FROM website_payment_gateway_accounts ga
      JOIN website_payment_gateways gw ON gw.code = ga.gateway_code
      WHERE ga.website_id = $1 AND ga.is_active = TRUE
      ORDER BY ga.is_default DESC, ga.id ASC
    `, [website.id]);

    const activeGateways = gatewayRes.rows.map((gw) => ({
      id: gw.id,
      code: gw.gateway_code,
      name: gw.gateway_name,
      label: gw.gateway_name || gw.gateway_code.toUpperCase(),
      category: gw.gateway_category,
      logo_icon: gw.logo_icon,
      is_default: gw.is_default
    }));

    // Masking helpers to prevent personal data scraping in public dues searches
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

    // If neither identifier nor id is provided, return gateway availability
    if (!identifier && !directId) {
      return NextResponse.json({
        success: true,
        message: 'Provide student registration number, roll number, or application number to check dues.',
        available_gateways: activeGateways,
        gateways: activeGateways,
        categories: [
          { key: 'education', label: 'Education & Tuition Fees', path: '/pay/education-fees' },
          { key: 'exam', label: 'Examination & Admit Card Fees', path: '/pay/exam-fees' },
          { key: 'admission', label: 'Admission Circular Fees', path: '/pay/admission-fees' },
          { key: 'residential', label: 'Hostel & Residential Fees', path: '/pay/residential-fees' }
        ]
      });
    }

    let student = null;
    let applicant = null;

    // 1. Look up student if not exclusively requesting admission
    if (type !== 'admission') {
      const studentQuery = `
        SELECT s.id, s.registration_no, s.roll_no, s.student_unique_id,
               COALESCE(i.name, s.name, 'Student') AS name,
               COALESCE(i.email, s.email) AS raw_email,
               COALESCE(i.phone, s.number) AS raw_phone,
               c.name AS class_name, c.id AS class_id,
               sec.name AS section_name, ses.name AS session_name
        FROM website_students s
        LEFT JOIN website_student_info i ON i.student_id = s.id
        LEFT JOIN website_classes c ON c.id = s.class_id
        LEFT JOIN website_sections sec ON sec.id = s.section_id
        LEFT JOIN website_sessions ses ON ses.id = s.session_id
        WHERE s.website_id = $1 AND (
          ${directId ? 's.id = $2' : `
            LOWER(s.registration_no) = LOWER($2) OR
            LOWER(s.roll_no) = LOWER($2) OR
            LOWER(s.student_unique_id) = LOWER($2) OR
            LOWER(COALESCE(i.email, s.email, '')) = LOWER($2) OR
            LOWER(COALESCE(i.phone, s.number, '')) = LOWER($2)
          `}
        )
        LIMIT 1
      `;
      const sRes = await queryDb(studentQuery, [website.id, directId || identifier]);
      if (sRes.rows.length > 0) {
        const row = sRes.rows[0];
        student = {
          id: row.id,
          registration_no: row.registration_no,
          roll_no: row.roll_no,
          student_unique_id: row.student_unique_id,
          name: row.name,
          class_name: row.class_name,
          class_id: row.class_id,
          section_name: row.section_name,
          session_name: row.session_name,
          masked_email: maskEmail(row.raw_email),
          masked_phone: maskPhone(row.raw_phone)
        };
      }
    }

    // 2. Look up admission applicant if not exclusively student fee types
    if (type === 'admission' || type === 'all' || !student) {
      const applicantQuery = `
        SELECT a.id, a.admission_id, a.application_no, a.roll_no, a.applicant_name,
               a.email, a.phone, a.status, a.created_at,
               adm.title AS circular_title, c.name AS class_name, ses.name AS session_name
        FROM website_admission_applicants a
        JOIN website_admissions adm ON adm.id = a.admission_id
        LEFT JOIN website_classes c ON c.id = adm.class_id
        LEFT JOIN website_sessions ses ON ses.id = adm.session_id
        WHERE a.website_id = $1 AND (
          ${directId ? 'a.id = $2' : `
            LOWER(a.application_no) = LOWER($2) OR
            LOWER(a.email) = LOWER($2) OR
            LOWER(a.phone) = LOWER($2)
          `}
        )
        LIMIT 1
      `;
      const aRes = await queryDb(applicantQuery, [website.id, directId || identifier]);
      if (aRes.rows.length > 0) {
        const row = aRes.rows[0];
        applicant = {
          id: row.id,
          admission_id: row.admission_id,
          application_no: row.application_no,
          applicant_name: row.applicant_name,
          status: row.status,
          circular_title: row.circular_title,
          class_name: row.class_name,
          session_name: row.session_name,
          masked_email: maskEmail(row.email),
          masked_phone: maskPhone(row.phone)
        };
      }
    }

    if (!student && !applicant) {
      return NextResponse.json({
        success: false,
        error: 'No enrolled student or applicant found matching the entered reference.',
        identifier
      }, { status: 404 });
    }

    const dues = {
      education: [],
      exam: [],
      admission: [],
      residential: []
    };

    // A. FETCH EDUCATION / TUITION DUES
    if (student && (type === 'all' || type === 'education')) {
      const eduRes = await queryDb(`
        SELECT p.id, p.invoice_no, p.title, p.fee_type, p.month_name,
               p.amount, p.fine_amount, p.paid_amount, p.currency, p.due_date,
               p.payment_status,
               (p.amount + p.fine_amount - p.paid_amount) AS net_due
        FROM website_education_fee_payments p
        WHERE p.website_id = $1 AND p.student_id = $2
          AND p.payment_status IN ('unpaid', 'partially_paid')
        ORDER BY p.due_date ASC, p.id ASC
      `, [website.id, student.id]);

      dues.education = eduRes.rows.map((row) => ({
        id: row.id,
        category: 'education',
        category_label: 'Tuition & Academic Fee',
        invoice_no: row.invoice_no,
        title: row.title,
        month_name: row.month_name,
        amount: parseFloat(row.amount),
        fine_amount: parseFloat(row.fine_amount || 0),
        paid_amount: parseFloat(row.paid_amount || 0),
        net_due: parseFloat(row.net_due),
        currency: row.currency || 'BDT',
        due_date: row.due_date,
        payment_status: row.payment_status
      }));
    }

    // B. FETCH EXAM FEES DUES
    if (student && (type === 'all' || type === 'exam')) {
      const examRes = await queryDb(`
        SELECT p.id, p.invoice_no, p.exam_id, p.amount, p.fine_amount, p.paid_amount,
               p.currency, p.payment_status, p.paid_date,
               ex.title AS exam_title, ex.exam_type, ex.start_date,
               ef.fee_title, ef.due_date,
               (p.amount + p.fine_amount - p.paid_amount) AS net_due
        FROM website_exam_fee_payments p
        JOIN website_exams ex ON ex.id = p.exam_id
        LEFT JOIN website_exam_fees ef ON ef.id = p.fee_id
        WHERE p.website_id = $1 AND p.student_id = $2
          AND p.payment_status IN ('pending', 'partially_paid')
        ORDER BY p.id ASC
      `, [website.id, student.id]);

      dues.exam = examRes.rows.map((row) => ({
        id: row.id,
        category: 'exam',
        category_label: 'Examination Fee & Admit Clearance',
        invoice_no: row.invoice_no || `INV-EXAM-${row.id}`,
        title: row.fee_title || `${row.exam_title} Examination Fee`,
        exam_title: row.exam_title,
        amount: parseFloat(row.amount),
        fine_amount: parseFloat(row.fine_amount || 0),
        paid_amount: parseFloat(row.paid_amount || 0),
        net_due: parseFloat(row.net_due),
        currency: row.currency || 'BDT',
        due_date: row.due_date || row.start_date,
        payment_status: row.payment_status
      }));
    }

    // C. FETCH ADMISSION INTAKE DUES
    if (applicant && (type === 'all' || type === 'admission')) {
      const admRes = await queryDb(`
        SELECT p.id, p.invoice_no, p.admission_id, p.amount, p.currency, p.payment_status,
               c.title AS circular_title, c.end_date,
               cls.name AS class_name
        FROM website_admission_fee_payments p
        JOIN website_admissions c ON c.id = p.admission_id
        LEFT JOIN website_classes cls ON cls.id = c.class_id
        WHERE p.website_id = $1 AND p.applicant_id = $2
          AND p.payment_status IN ('pending', 'unpaid')
        ORDER BY p.id DESC
      `, [website.id, applicant.id]);

      dues.admission = admRes.rows.map((row) => ({
        id: row.id,
        applicant_id: applicant.id,
        category: 'admission',
        category_label: 'Admission Application Form Fee',
        invoice_no: row.invoice_no || `INV-ADM-${applicant.application_no}`,
        title: `${row.circular_title} Form Fee`,
        circular_title: row.circular_title,
        class_name: row.class_name,
        amount: parseFloat(row.amount),
        fine_amount: 0.00,
        paid_amount: 0.00,
        net_due: parseFloat(row.amount),
        currency: row.currency || 'BDT',
        due_date: row.end_date,
        payment_status: row.payment_status
      }));
    }

    // D. FETCH RESIDENTIAL / HOSTEL DUES
    if (student && (type === 'all' || type === 'residential')) {
      // 1. Check existing records in website_hall_fee_payments
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

      let resDues = resFeeRes.rows.map((row) => ({
        id: row.id,
        category: 'residential',
        category_label: 'Hall & Residential Fee',
        invoice_no: row.invoice_no,
        title: row.title,
        month_name: row.month_name,
        hall_name: row.hall_name,
        room_number: row.room_number,
        seat_number: row.seat_number,
        amount: parseFloat(row.amount),
        fine_amount: parseFloat(row.fine_amount || 0),
        paid_amount: parseFloat(row.paid_amount || 0),
        net_due: parseFloat(row.net_due),
        currency: row.currency || 'BDT',
        due_date: row.due_date,
        payment_status: row.payment_status
      }));

      // 2. If no residential payment records exist yet, check active hall seat allocation
      if (resDues.length === 0) {
        const allocRes = await queryDb(`
          SELECT a.id, a.fee_monthly, a.allocated_date,
                 h.name AS hall_name, h.id AS hall_id,
                 r.room_number, r.id AS room_id,
                 s.seat_number, s.id AS seat_id
          FROM website_hall_seat_allocations a
          JOIN website_halls h ON h.id = a.hall_id
          JOIN website_hall_rooms r ON r.id = a.room_id
          JOIN website_hall_room_seats s ON s.id = a.seat_id
          WHERE a.website_id = $1 AND a.student_id = $2 AND a.status = 'active'
          LIMIT 1
        `, [website.id, student.id]);

        if (allocRes.rows.length > 0) {
          const alloc = allocRes.rows[0];
          const monthlyRent = parseFloat(alloc.fee_monthly) || 0;
          if (monthlyRent > 0) {
            const currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
            resDues.push({
              id: `alloc-${alloc.id}`,
              allocation_id: alloc.id,
              category: 'residential',
              category_label: 'Hall Seat Monthly Rent',
              invoice_no: `INV-HALL-${student.registration_no || student.id}-${Date.now().toString().slice(-4)}`,
              title: `${alloc.hall_name} — Room ${alloc.room_number} (Seat ${alloc.seat_number})`,
              month_name: currentMonth,
              hall_name: alloc.hall_name,
              room_number: alloc.room_number,
              seat_number: alloc.seat_number,
              amount: monthlyRent,
              fine_amount: 0.00,
              paid_amount: 0.00,
              net_due: monthlyRent,
              currency: 'BDT',
              due_date: new Date().toISOString().split('T')[0],
              payment_status: 'unpaid'
            });
          }
        }
      }

      dues.residential = resDues;
    }

    // Calculate Summary
    const allDuesList = [
      ...dues.education,
      ...dues.exam,
      ...dues.admission,
      ...dues.residential
    ];

    const totalDue = allDuesList.reduce((sum, item) => sum + (item.net_due || item.amount || 0), 0);

    return NextResponse.json({
      success: true,
      profile: student
        ? {
            type: 'student',
            id: student.id,
            name: student.name,
            registration_no: student.registration_no,
            roll_no: student.roll_no,
            class_name: student.class_name,
            section_name: student.section_name,
            session_name: student.session_name,
            email: student.email,
            phone: student.phone,
            photo_url: student.photo_url
          }
        : {
            type: 'applicant',
            id: applicant.id,
            name: applicant.applicant_name,
            application_no: applicant.application_no,
            circular_title: applicant.circular_title,
            class_name: applicant.class_name,
            email: applicant.email,
            phone: applicant.phone,
            photo_url: applicant.photo_url
          },
      summary: {
        total_due: totalDue,
        total_items: allDuesList.length,
        has_dues: allDuesList.length > 0,
        currency: allDuesList[0]?.currency || 'BDT'
      },
      dues,
      gateways: activeGateways
    });
  } catch (error) {
    console.error('Error in GET /pay/dues:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
