import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator.js';
import { getTeacherSession } from 'src/lib/middleware/teacher.js';

export async function GET(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json({ success: false, error: 'Institution portal not found.' }, { status: 404 });
    }

    const teacher = await getTeacherSession(request);
    if (!teacher || !teacher.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Active teacher session required.' },
        { status: 401 }
      );
    }

    if (teacher.website_id && String(teacher.website_id) !== String(website.id)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Access denied to foreign institution resources.' },
        { status: 403 }
      );
    }

    // 1. Fetch issued card record if exists, or generate fallback card
    let card = null;
    try {
      const cardRes = await queryDb(
        `SELECT * FROM website_teacher_ids WHERE website_id = $1 AND teacher_id = $2 ORDER BY id DESC LIMIT 1`,
        [website.id, teacher.id]
      );
      if (cardRes.rows.length > 0) {
        card = cardRes.rows[0];
      }
    } catch {}

    if (!card) {
      const expiry = new Date();
      expiry.setFullYear(expiry.getFullYear() + 2);
      card = {
        card_number: `TCH-${String(teacher.id).padStart(4, '0')}`,
        issue_date: teacher.joining_date || new Date().toISOString().split('T')[0],
        expiry_date: expiry.toISOString().split('T')[0],
        valid_upto: 'December 2028',
        card_status: 'active',
      };
    }

    // 2. Fetch active Teacher ID Card template
    let template = null;
    try {
      const webTplRes = await queryDb(
        `SELECT wt.id, wt.name,
                COALESCE(wt.custom_html, st.html_content) AS html_content,
                COALESCE(wt.custom_html_back, st.html_back_content) AS html_back_content,
                COALESCE(wt.custom_css, st.css_content) AS css_content,
                st.dimension_width, st.dimension_height, st.dimension_unit
         FROM website_teacher_id_templates wt
         LEFT JOIN system_teacher_id_templates st ON wt.system_template_id = st.id
         WHERE wt.website_id = $1 AND wt.is_default = TRUE
         LIMIT 1`,
        [website.id]
      );
      if (webTplRes.rows.length > 0) {
        template = webTplRes.rows[0];
      }

      if (!template) {
        const sysTplRes = await queryDb(
          `SELECT id, name, html_content, html_back_content, css_content,
                  dimension_width, dimension_height, dimension_unit
           FROM system_teacher_id_templates
           WHERE is_active = TRUE
           ORDER BY is_system_default DESC, id ASC
           LIMIT 1`
        );
        if (sysTplRes.rows.length > 0) {
          template = sysTplRes.rows[0];
        }
      }
    } catch (e) {
      console.warn('Error loading teacher ID template:', e);
    }

    return NextResponse.json({
      success: true,
      teacher,
      card,
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
    console.error('Error fetching teacher ID card:', error);
    return NextResponse.json({ success: false, error: 'Internal server error.' }, { status: 500 });
  }
}
