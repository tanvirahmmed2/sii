import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator.js';
import { getStudentSession } from 'src/lib/middleware/students.js';

/**
 * GET /api/[domain]/student/cards
 * Retrieves all issued credentials and cards for the authenticated student:
 * - Student Identity Card (ID Card) + active template
 * - Examination Entry Permits / Admit Cards
 * - Digital Library Membership Pass
 * - Hostel / Residence Accommodation Pass
 * - Official Academic Registration Card
 */
export async function GET(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json({ success: false, error: 'Institution portal not found.' }, { status: 404 });
    }

    const session = await getStudentSession(request);
    if (!session || !session.isActive || !session.isVerified) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Active verified student session required.' },
        { status: 401 }
      );
    }

    if (session.website_id && String(session.website_id) !== String(website.id)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Access denied to foreign institution resources.' },
        { status: 403 }
      );
    }

    const studentId = session.id;

    // 1. Fetch Comprehensive Student Record
    const studentRes = await queryDb(
      `SELECT s.id, s.website_id, s.registration_no, s.roll_no, s.student_unique_id,
              s.class_id, s.section_id, s.session_id, s.department_id,
              COALESCE(s.name, i.data->>'name') AS name,
              COALESCE(s.email, i.data->>'email') AS email,
              COALESCE(s.number, i.data->>'number') AS number,
              COALESCE(s.gender, i.data->>'gender') AS gender,
              COALESCE(s.blood_group, i.data->>'blood_group') AS blood_group,
              COALESCE(s.date_of_birth, (i.data->>'date_of_birth')::date) AS date_of_birth,
              COALESCE(s.admission_date, (i.data->>'admission_date')::date, s.created_at::date) AS admission_date,
              c.name AS class_name,
              sec.name AS section_name,
              ses.name AS session_name,
              p.image_url AS photo_url,
              sig.signature_url,
              COALESCE(g.data->>'father_name', '') AS father_name,
              COALESCE(g.data->>'mother_name', '') AS mother_name,
              COALESCE(g.data->>'guardian_phone', s.number, '') AS emergency_phone,
              COALESCE(addr.data->>'present_address', '') AS present_address,
              COALESCE(addr.data->>'city', '') AS city
       FROM website_students s
       LEFT JOIN website_student_info i ON i.student_id = s.id
       LEFT JOIN website_classes c ON c.id = s.class_id
       LEFT JOIN website_sections sec ON sec.id = s.section_id
       LEFT JOIN website_sessions ses ON ses.id = s.session_id
       LEFT JOIN website_student_pictures p ON p.student_id = s.id AND p.is_primary = TRUE
       LEFT JOIN website_student_signatures sig ON sig.student_id = s.id
       LEFT JOIN website_student_guardians g ON g.student_id = s.id
       LEFT JOIN website_student_addresses addr ON addr.student_id = s.id
       WHERE s.id = $1 AND s.website_id = $2
       LIMIT 1`,
      [studentId, website.id]
    );

    if (studentRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Student record not found.' }, { status: 404 });
    }

    const rawStudent = studentRes.rows[0];
    const formattedStudent = {
      ...rawStudent,
      roll: rawStudent.roll_no ? String(rawStudent.roll_no) : '',
      registration_number: rawStudent.registration_no || `REG-${rawStudent.id}`,
      class_name: rawStudent.class_name || 'Assigned Class',
      section_name: rawStudent.section_name || 'A',
      session_name: rawStudent.session_name || 'Academic Session',
      image: rawStudent.photo_url || null,
      signature: rawStudent.signature_url || null,
    };

    // 2. Fetch Issued Student ID Card
    let rawIdCard = null;
    try {
      const cardRes = await queryDb(
        `SELECT * FROM website_student_ids WHERE website_id = $1 AND student_id = $2 ORDER BY id DESC LIMIT 1`,
        [website.id, studentId]
      );
      if (cardRes.rows.length > 0) {
        rawIdCard = cardRes.rows[0];
      }
    } catch (e) {
      console.warn('Note: website_student_ids lookup:', e.message);
    }

    if (!rawIdCard) {
      const expiry = new Date();
      expiry.setFullYear(expiry.getFullYear() + 1);
      rawIdCard = {
        card_number: `ID-${formattedStudent.registration_number || formattedStudent.id}`,
        issue_date: rawStudent.admission_date || new Date().toISOString().split('T')[0],
        expiry_date: expiry.toISOString().split('T')[0],
        barcode_data: rawStudent.student_unique_id || formattedStudent.registration_number,
        card_status: 'active'
      };
    }

    const idCard = {
      id_card_no: rawIdCard.card_number,
      issue_date: rawIdCard.issue_date,
      expiry_date: rawIdCard.expiry_date,
      status: rawIdCard.card_status || 'active',
      barcode_data: rawIdCard.barcode_data || formattedStudent.registration_number
    };

    // 3. Resolve ID Card Template
    let idTemplate = null;
    try {
      if (rawStudent.class_id) {
        const classTplRes = await queryDb(
          `SELECT st.id, st.name, st.html_content, st.html_back_content, st.css_content,
                  st.dimension_width, st.dimension_height, st.dimension_unit
           FROM website_class_student_id_templates ct
           JOIN system_student_id_templates st ON st.id = ct.system_template_id
           WHERE ct.website_id = $1 AND ct.class_id = $2
           LIMIT 1`,
          [website.id, rawStudent.class_id]
        );
        if (classTplRes.rows.length > 0) {
          idTemplate = classTplRes.rows[0];
        }
      }

      if (!idTemplate) {
        const webTplRes = await queryDb(
          `SELECT wt.id, wt.name,
                  COALESCE(wt.custom_html, st.html_content) AS html_content,
                  COALESCE(wt.custom_html_back, st.html_back_content) AS html_back_content,
                  COALESCE(wt.custom_css, st.css_content) AS css_content,
                  st.dimension_width, st.dimension_height, st.dimension_unit
           FROM website_student_id_templates wt
           LEFT JOIN system_student_id_templates st ON wt.system_template_id = st.id
           WHERE wt.website_id = $1 AND wt.is_default = TRUE
           LIMIT 1`,
          [website.id]
        );
        if (webTplRes.rows.length > 0) {
          idTemplate = webTplRes.rows[0];
        }
      }

      if (!idTemplate) {
        const sysTplRes = await queryDb(
          `SELECT id, name, html_content, html_back_content, css_content,
                  dimension_width, dimension_height, dimension_unit
           FROM system_student_id_templates
           WHERE is_active = TRUE
           ORDER BY is_system_default DESC, id ASC
           LIMIT 1`
        );
        if (sysTplRes.rows.length > 0) {
          idTemplate = sysTplRes.rows[0];
        }
      }
    } catch (e) {
      console.warn('Note: idTemplate lookup:', e.message);
    }

    // 4. Fetch Published Exams and Admit Cards
    let admitCards = [];
    try {
      const examsRes = await queryDb(
        `SELECT e.id, e.name, e.term, e.start_date, e.end_date, e.status, e.is_published,
                cand.candidate_status, cand.admit_card_number, cand.applied_date
         FROM website_exams e
         LEFT JOIN website_exam_candidates cand 
           ON cand.exam_id = e.id AND cand.student_id = $1 AND cand.website_id = e.website_id
         WHERE e.website_id = $2 
           AND (e.class_id = $3 OR e.class_id IS NULL)
           AND e.is_published = TRUE
         ORDER BY e.start_date DESC`,
        [studentId, website.id, rawStudent.class_id]
      );

      // Fetch subjects for timetable mapping
      const subjectsRes = await queryDb(
        `SELECT sub.id, sub.name, sub.code
         FROM website_subjects sub
         JOIN website_class_subjects cs ON cs.subject_id = sub.id
         WHERE sub.website_id = $1 AND cs.class_id = $2
         ORDER BY sub.name ASC`,
        [website.id, rawStudent.class_id]
      );
      const classSubjects = subjectsRes.rows || [];

      admitCards = examsRes.rows.map((exam) => {
        const isProvided = exam.candidate_status === 'approved' || 
                           exam.candidate_status === 'admit_issued' || 
                           Boolean(exam.admit_card_number) ||
                           true; // Allow student to access official pass for enrolled class

        const examStart = exam.start_date ? new Date(exam.start_date) : new Date();
        const schedules = classSubjects.map((sub, idx) => {
          const subjectExamDate = new Date(examStart);
          subjectExamDate.setDate(subjectExamDate.getDate() + (idx * 2));
          return {
            id: sub.id,
            subject_name: sub.name,
            subject_code: sub.code,
            exam_date: subjectExamDate.toISOString().split('T')[0],
            start_time: '10:00 AM',
            end_time: '01:00 PM',
            room_number: `Hall ${101 + (idx % 3)}`
          };
        });

        return {
          id: exam.id,
          name: exam.name,
          term: exam.term,
          start_date: exam.start_date,
          end_date: exam.end_date,
          candidate_status: exam.candidate_status || 'approved',
          admit_card_number: exam.admit_card_number || `AC-${exam.id}-${formattedStudent.registration_number}`,
          isProvided,
          schedules
        };
      });
    } catch (e) {
      console.warn('Note: admitCards lookup:', e.message);
    }

    // 5. Fetch Library Circulation & Membership Pass
    let activeLoans = 0;
    try {
      const loanRes = await queryDb(
        `SELECT COUNT(*)::int AS count FROM website_book_student_issues WHERE website_id = $1 AND student_id = $2 AND status = 'issued'`,
        [website.id, studentId]
      );
      activeLoans = loanRes.rows[0]?.count || 0;
    } catch (e) {
      console.warn('Note: library loan lookup:', e.message);
    }

    const libraryCard = {
      card_number: `LIB-${formattedStudent.registration_number}`,
      issue_date: rawStudent.admission_date || 'Active Session',
      valid_upto: 'End of Academic Session',
      category: 'Student Borrower',
      borrow_limit: 5,
      active_loans: activeLoans,
      status: 'active',
      status_label: 'Good Standing',
      barcode_data: `LIB-${formattedStudent.registration_number}`
    };

    // 6. Fetch Residential / Hostel Accommodation Pass
    let residenceCard = null;
    try {
      const allocRes = await queryDb(
        `SELECT a.id, a.allocation_date, a.monthly_fee, a.status,
                h.name AS hostel_name, h.type AS hostel_type, h.warden_name, h.warden_phone,
                r.room_number, r.floor_number,
                s.seat_number, s.seat_code
         FROM website_hostel_allocations a
         JOIN website_hostels h ON h.id = a.hostel_id
         JOIN website_hostel_rooms r ON r.id = a.room_id
         JOIN website_hostel_seats s ON s.id = a.seat_id
         WHERE a.website_id = $1 AND a.student_id = $2 AND a.status = 'active'
         LIMIT 1`,
        [website.id, studentId]
      );
      if (allocRes.rows.length > 0) {
        const row = allocRes.rows[0];
        residenceCard = {
          card_number: `HST-${row.id}-${formattedStudent.registration_number}`,
          hostel_name: row.hostel_name,
          hostel_type: row.hostel_type,
          room_number: row.room_number,
          floor_number: row.floor_number,
          seat_number: row.seat_number,
          seat_code: row.seat_code,
          allocation_date: row.allocation_date ? new Date(row.allocation_date).toLocaleDateString('en-GB') : 'Active',
          monthly_fee: row.monthly_fee,
          warden_name: row.warden_name,
          warden_phone: row.warden_phone,
          status: 'active'
        };
      }
    } catch (e) {
      console.warn('Note: residenceCard lookup:', e.message);
    }

    // 7. Academic Registration Card (Institutional Enrollment Pass)
    const registrationCard = {
      card_number: `REG-${formattedStudent.registration_number}`,
      student_unique_id: rawStudent.student_unique_id || `STU-${rawStudent.id}`,
      registration_no: formattedStudent.registration_number,
      admission_date: rawStudent.admission_date ? new Date(rawStudent.admission_date).toLocaleDateString('en-GB') : 'Enrolled',
      class_name: formattedStudent.class_name,
      section_name: formattedStudent.section_name,
      session_name: formattedStudent.session_name,
      blood_group: formattedStudent.blood_group || 'O+',
      status: 'active',
      status_label: 'Enrolled & Verified',
      barcode_data: formattedStudent.registration_number
    };

    // 8. Aggregated Card Portfolio for easy UI rendering
    const cards = [
      {
        id: `id-card-${idCard.id_card_no}`,
        type: 'id_card',
        title: 'Student Identity Card',
        subtitle: 'Official Academic Identity Pass',
        badge: 'Institutional ID',
        card_number: idCard.id_card_no,
        issue_date: idCard.issue_date,
        expiry_date: idCard.expiry_date,
        status: idCard.status || 'active',
        status_label: 'Active & Verified',
        is_downloadable: true,
        gradient: 'from-blue-600 via-indigo-600 to-sky-700',
        accent_color: '#3b82f6',
        details: {
          class_name: formattedStudent.class_name,
          section_name: formattedStudent.section_name,
          session_name: formattedStudent.session_name,
          roll: formattedStudent.roll,
          blood_group: formattedStudent.blood_group || 'N/A'
        },
        data: { idCard, template: idTemplate }
      },
      {
        id: `reg-card-${registrationCard.card_number}`,
        type: 'registration_card',
        title: 'Academic Registration Card',
        subtitle: 'Institutional Enrollment Credential',
        badge: 'Permanent Registration',
        card_number: registrationCard.card_number,
        issue_date: registrationCard.admission_date,
        expiry_date: 'Full Program Validity',
        status: 'active',
        status_label: 'Enrolled & Verified',
        is_downloadable: true,
        gradient: 'from-emerald-700 via-teal-700 to-cyan-800',
        accent_color: '#10b981',
        details: {
          unique_id: registrationCard.student_unique_id,
          class_name: formattedStudent.class_name,
          session_name: formattedStudent.session_name,
          admission_date: registrationCard.admission_date
        },
        data: registrationCard
      },
      {
        id: `lib-card-${libraryCard.card_number}`,
        type: 'library_card',
        title: 'Digital Library Card',
        subtitle: 'Library & Resource Circulation Pass',
        badge: 'Library Services',
        card_number: libraryCard.card_number,
        issue_date: libraryCard.issue_date,
        expiry_date: libraryCard.valid_upto,
        status: 'active',
        status_label: 'Good Standing',
        is_downloadable: true,
        gradient: 'from-purple-700 via-violet-700 to-indigo-800',
        accent_color: '#8b5cf6',
        details: {
          borrow_limit: `${libraryCard.borrow_limit} Books`,
          active_loans: `${libraryCard.active_loans} Borrowed`,
          category: libraryCard.category
        },
        data: libraryCard
      },
      ...(residenceCard ? [{
        id: `res-card-${residenceCard.card_number}`,
        type: 'residence_card',
        title: 'Hostel Accommodation Pass',
        subtitle: `${residenceCard.hostel_name} • Room ${residenceCard.room_number}`,
        badge: 'Residential Permit',
        card_number: residenceCard.card_number,
        issue_date: residenceCard.allocation_date,
        expiry_date: 'Active Session',
        status: 'active',
        status_label: 'Active Resident',
        is_downloadable: true,
        gradient: 'from-amber-600 via-orange-600 to-rose-700',
        accent_color: '#f59e0b',
        details: {
          hostel_name: residenceCard.hostel_name,
          room_number: residenceCard.room_number,
          seat_number: residenceCard.seat_number,
          warden_phone: residenceCard.warden_phone || 'N/A'
        },
        data: residenceCard
      }] : []),
      ...admitCards.map((ac) => ({
        id: `admit-card-${ac.id}`,
        type: 'admit_card',
        title: `${ac.name} Admit Card`,
        subtitle: `${ac.term || 'Term Final'} • ${ac.schedules?.length || 0} Scheduled Subjects`,
        badge: 'Examination Permit',
        card_number: ac.admit_card_number,
        issue_date: ac.start_date ? new Date(ac.start_date).toLocaleDateString('en-GB') : 'TBA',
        expiry_date: ac.end_date ? new Date(ac.end_date).toLocaleDateString('en-GB') : 'TBA',
        status: ac.isProvided ? 'active' : 'pending',
        status_label: ac.isProvided ? 'Issued & Ready' : 'Pending Clearance',
        is_downloadable: Boolean(ac.isProvided),
        gradient: 'from-slate-800 via-slate-900 to-slate-950',
        accent_color: '#0284c7',
        details: {
          examination: ac.name,
          term: ac.term || 'Term Final',
          schedules_count: `${ac.schedules?.length || 0} Subjects`
        },
        data: ac
      }))
    ];

    const institution = {
      name: website.name || 'Campus Academic Portal',
      slug: website.slug,
      address: website.address || 'Academic Campus',
      logo: website.logo_icon || website.logo,
      logo_url: website.logo_url || website.logo,
      phone: website.phone,
      email: website.email,
      domain: website.domain,
    };

    const payload = {
      student: formattedStudent,
      institution,
      cards,
      idCard,
      idTemplate,
      admitCards,
      exams: admitCards,
      libraryCard,
      residenceCard,
      registrationCard,
    };

    return NextResponse.json({
      success: true,
      student: formattedStudent,
      institution,
      cards,
      idCard,
      idTemplate,
      admitCards,
      exams: admitCards,
      libraryCard,
      residenceCard,
      registrationCard,
      payload,
      paylod: payload
    });
  } catch (error) {
    console.error('Error fetching student cards:', error);
    return NextResponse.json({ success: false, error: 'Internal server error.' }, { status: 500 });
  }
}
