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

    // Student profile info
    const studentRes = await queryDb(
      `SELECT s.id, s.website_id, s.registration_no, s.roll_no, s.class_id, s.section_id,
              i.name, i.email, i.number,
              c.name AS class_name, sec.name AS section_name, ses.name AS session_name
       FROM website_students s
       JOIN website_student_info i ON i.student_id = s.id
       LEFT JOIN website_classes c ON c.id = s.class_id AND c.website_id = s.website_id
       LEFT JOIN website_sections sec ON sec.id = s.section_id AND sec.website_id = s.website_id
       LEFT JOIN website_sessions ses ON ses.id = s.session_id AND ses.website_id = s.website_id
       WHERE s.id = $1 AND s.website_id = $2
       LIMIT 1`,
      [session.id, website.id]
    );

    if (studentRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Student record not found.' }, { status: 404 });
    }
    const student = studentRes.rows[0];

    // Fetch issued certificates
    let certificates = [];
    try {
      const certRes = await queryDb(
        `SELECT cert.*, c.name AS class_name
         FROM website_student_certificates cert
         LEFT JOIN website_classes c ON c.id = cert.class_id OR (cert.class_id IS NULL AND c.id = $3)
         WHERE cert.student_id = $1 AND cert.website_id = $2
         ORDER BY cert.id DESC`,
        [student.id, website.id, student.class_id]
      );
      certificates = certRes.rows;
    } catch (e) {
      console.warn('Error fetching student certificates:', e);
    }

    // Fetch active Certificate template
    let template = null;
    try {
      const tplRes = await queryDb(
        `SELECT wt.id, wt.name,
                COALESCE(wt.custom_html, st.html_content) AS html_content,
                COALESCE(wt.custom_css, st.css_content) AS css_content,
                st.dimension_width, st.dimension_height, st.dimension_unit
         FROM website_student_certificate_templates wt
         LEFT JOIN system_student_certificate_templates st ON wt.system_template_id = st.id
         WHERE wt.website_id = $1 AND wt.is_default = TRUE
         LIMIT 1`,
        [website.id]
      );
      if (tplRes.rows.length > 0) {
        template = tplRes.rows[0];
      }

      if (!template) {
        const sysTplRes = await queryDb(
          `SELECT id, name, html_content, css_content,
                  dimension_width, dimension_height, dimension_unit
           FROM system_student_certificate_templates
           WHERE is_active = TRUE
           ORDER BY is_system_default DESC, id ASC
           LIMIT 1`
        );
        if (sysTplRes.rows.length > 0) {
          template = sysTplRes.rows[0];
        }
      }
    } catch (e) {
      console.warn('Error fetching certificate template:', e);
    }

    return NextResponse.json({
      success: true,
      student,
      certificates,
      template,
      institution: {
        name: website.name || 'Campus Academic Portal',
        slug: website.slug,
        address: website.address || 'Academic Campus',
        logo_url: website.logo_url || website.logo,
        phone: website.phone,
        email: website.email,
        domain: website.domain,
      },
    });
  } catch (error) {
    console.error('Error fetching student certificates:', error);
    return NextResponse.json({ success: false, error: 'Internal server error.' }, { status: 500 });
  }
}
