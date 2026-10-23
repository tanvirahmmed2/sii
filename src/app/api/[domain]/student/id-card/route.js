import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator.js';
import { getStudentSession } from 'src/lib/middleware/students.js';

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

    // Fetch student info
    const studentRes = await queryDb(
      `SELECT s.id, s.website_id, s.registration_no, s.roll_no, s.student_unique_id,
              s.class_id, s.section_id, s.session_id,
              COALESCE(s.name, i.data->>'name') AS name,
              COALESCE(s.email, i.data->>'email') AS email,
              COALESCE(s.number, i.data->>'number') AS number,
              COALESCE(s.blood_group, i.data->>'blood_group') AS blood_group,
              COALESCE(s.date_of_birth, (i.data->>'date_of_birth')::date) AS date_of_birth,
              COALESCE(s.admission_date, (i.data->>'admission_date')::date) AS admission_date,
              c.name AS class_name,
              sec.name AS section_name,
              ses.name AS session_name,
              p.image_url AS photo_url,
              sig.signature_url,
              g.data->>'father_name' AS father_name, g.data->>'guardian_phone' AS emergency_phone
       FROM website_students s
       LEFT JOIN website_student_info i ON i.student_id = s.id
       LEFT JOIN website_classes c ON c.id = s.class_id
       LEFT JOIN website_sections sec ON sec.id = s.section_id
       LEFT JOIN website_sessions ses ON ses.id = s.session_id
       LEFT JOIN website_student_pictures p ON p.student_id = s.id AND p.is_primary = TRUE
       LEFT JOIN website_student_signatures sig ON sig.student_id = s.id
       LEFT JOIN website_student_guardians g ON g.student_id = s.id
       WHERE s.id = $1 AND s.website_id = $2
       LIMIT 1`,
      [studentId, website.id]
    );

    if (studentRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Student record not found.' }, { status: 404 });
    }

    const student = studentRes.rows[0];

    // Fetch existing card from DB or generate active identity card
    let card = null;
    try {
      const cardRes = await queryDb(
        `SELECT * FROM website_student_ids WHERE website_id = $1 AND student_id = $2 ORDER BY id DESC LIMIT 1`,
        [website.id, studentId]
      );
      if (cardRes.rows.length > 0) {
        card = cardRes.rows[0];
      }
    } catch {}

    if (!card) {
      const expiry = new Date();
      expiry.setFullYear(expiry.getFullYear() + 1);
      card = {
        card_number: `ID-${student.registration_no || student.id}`,
        issue_date: student.admission_date || new Date().toISOString().split('T')[0],
        expiry_date: expiry.toISOString().split('T')[0],
        barcode_data: student.student_unique_id || student.registration_no,
        card_status: 'active'
      };
    }

    const idCard = {
      id_card_no: card.card_number,
      issue_date: card.issue_date,
      expiry_date: card.expiry_date,
      status: card.card_status,
      barcode_data: card.barcode_data
    };

    const formattedStudent = {
      ...student,
      roll: student.roll_no,
      registration_number: student.registration_no
    };

    // Fetch class-assigned template or school default template
    let template = null;
    try {
      if (student.class_id) {
        const classTplRes = await queryDb(
          `SELECT st.id, st.name, st.html_content, st.html_back_content, st.css_content,
                  st.dimension_width, st.dimension_height, st.dimension_unit
           FROM website_class_student_id_templates ct
           JOIN system_student_id_templates st ON st.id = ct.system_template_id
           WHERE ct.website_id = $1 AND ct.class_id = $2
           LIMIT 1`,
          [website.id, student.class_id]
        );
        if (classTplRes.rows.length > 0) {
          template = classTplRes.rows[0];
        }
      }

      if (!template) {
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
          template = webTplRes.rows[0];
        }
      }

      if (!template) {
        const sysTplRes = await queryDb(
          `SELECT id, name, html_content, html_back_content, css_content,
                  dimension_width, dimension_height, dimension_unit
           FROM system_student_id_templates
           WHERE is_active = TRUE
           ORDER BY is_system_default DESC, id ASC
           LIMIT 1`
        );
        if (sysTplRes.rows.length > 0) {
          template = sysTplRes.rows[0];
        }
      }
    } catch (e) {
      console.warn('Error resolving student ID template:', e);
    }

    const payload = {
      card,
      idCard,
      student: formattedStudent,
      template,
      isProvided: true,
      institution: {
        name: website.name || 'Campus Academic Portal',
        slug: website.slug,
        address: website.address || 'Academic Campus',
        logo: website.logo_icon || website.logo,
        logo_url: website.logo_url || website.logo,
        phone: website.phone,
        email: website.email,
        domain: website.domain,
      }
    };

    return NextResponse.json({
      success: true,
      card,
      idCard,
      student: formattedStudent,
      template,
      isProvided: true,
      institution: payload.institution,
      payload,
      paylod: payload
    });
  } catch (error) {
    console.error('Error fetching student ID card:', error);
    return NextResponse.json({ success: false, error: 'Internal server error.' }, { status: 500 });
  }
}
