import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator.js';

export const dynamic = 'force-dynamic';

/**
 * GET /api/[domain]/admissions/admit-card?query=...&admission_id=...
 * Public lookup for candidate Admit Card.
 * Eligibility:
 * - Admission circular must be 'exam' based
 * - Applicant status must be 'completed', 'selected', or 'enrolled'
 * - Staff must have issued admit card (is_admit_card_issued = true) OR CURRENT_TIMESTAMP >= admit_publish_date
 */
export async function GET(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json({ success: false, error: 'Educational institution portal not found.' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query')?.trim();
    const admissionId = searchParams.get('admission_id');

    if (!query) {
      return NextResponse.json({
        success: false,
        error: 'Please enter your Application Number, Exam Roll Number, or Registered Email.'
      }, { status: 400 });
    }

    let sql = `
      SELECT a.id, a.admission_id, a.application_no, a.exam_roll, a.roll_no,
             a.applicant_name, a.email, a.phone, a.gender, a.date_of_birth, a.status,
             a.is_admit_card_issued, a.admit_card_issued_at,
             adm.title AS circular_title, adm.selection_method,
             cls.name AS class_name, ses.name AS session_name, dept.name AS department_name,
             ex.exam_date, ex.admit_publish_date, ex.venue, ex.instructions,
             img.photo_url,
             img.signature_url,
             grd.data->>'father_name' AS father_name,
             grd.data->>'mother_name' AS mother_name,
             addr.data->>'present_address' AS present_address
      FROM website_admission_applicants a
      JOIN website_admissions adm ON adm.id = a.admission_id
      LEFT JOIN website_classes cls ON cls.id = adm.class_id
      LEFT JOIN website_sessions ses ON ses.id = adm.session_id
      LEFT JOIN website_departments dept ON dept.id = adm.department_id
      LEFT JOIN website_admission_exams ex ON ex.admission_id = adm.id
      LEFT JOIN website_admission_applicant_images img ON img.applicant_id = a.id
      LEFT JOIN website_admission_applicant_info inf ON inf.applicant_id = a.id
      LEFT JOIN website_admission_applicant_guardians grd ON grd.applicant_id = a.id
      LEFT JOIN website_admission_applicant_addresses addr ON addr.applicant_id = a.id
      WHERE a.website_id = $1
        AND (
          a.application_no ILIKE $2
          OR a.exam_roll ILIKE $2
          OR a.roll_no ILIKE $2
          OR LOWER(a.email) = LOWER($2)
        )
    `;

    const params = [website.id, query];

    if (admissionId) {
      sql += ` AND a.admission_id = $3`;
      params.push(parseInt(admissionId, 10));
    }

    sql += ` ORDER BY a.id DESC LIMIT 1`;

    const res = await queryDb(sql, params);

    if (res.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No applicant record found matching the identifier provided. Please check your application number or email.'
      }, { status: 404 });
    }

    const applicant = res.rows[0];

    // Check circular method
    if (applicant.selection_method !== 'exam') {
      return NextResponse.json({
        success: false,
        error: `This admission circular (${applicant.circular_title}) is '${applicant.selection_method || 'manual'}' based. No admission test or admit card is required.`
      }, { status: 400 });
    }

    // Check completion status
    if (!['completed', 'selected', 'enrolled', 'accepted'].includes(applicant.status)) {
      return NextResponse.json({
        success: false,
        error: `Your application is currently in '${applicant.status}' status. You must pay fees and submit photo/signature before an admit card can be generated.`,
        current_status: applicant.status
      }, { status: 400 });
    }

    // Check admit card issuance eligibility
    const admitPublishDate = applicant.admit_publish_date ? new Date(applicant.admit_publish_date) : null;
    const isDateReached = admitPublishDate ? new Date() >= admitPublishDate : false;
    const isIssued = Boolean(applicant.is_admit_card_issued || isDateReached);

    if (!isIssued) {
      const publishStr = admitPublishDate ? admitPublishDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }) : 'TBA';

      return NextResponse.json({
        success: false,
        is_issued: false,
        error: `Admit card has not been issued yet. Scheduled publication date: ${publishStr}. Please check back on or after the scheduled date.`,
        admit_publish_date: applicant.admit_publish_date
      }, { status: 403 });
    }

    // Fetch exam subjects
    const subjectsRes = await queryDb(`
      SELECT id, title, mark, time
      FROM website_admission_exam_subjects
      WHERE admission_id = $1 AND website_id = $2
      ORDER BY id ASC
    `, [applicant.admission_id, website.id]);

    // Fetch active admit card template for this website (or default system template)
    let activeTemplate = null;
    let compiledHtml = null;

    try {
      const tplRes = await queryDb(`
        SELECT wt.id, wt.name, wt.custom_html, wt.custom_css,
               st.html_content AS system_html, st.css_content AS system_css,
               COALESCE(wt.dimension_width, st.dimension_width, 210.00) AS dimension_width,
               COALESCE(wt.dimension_height, st.dimension_height, 297.00) AS dimension_height,
               COALESCE(wt.dimension_unit, st.dimension_unit, 'mm') AS dimension_unit
        FROM website_admit_card_templates wt
        LEFT JOIN system_admit_card_templates st ON wt.system_template_id = st.id
        WHERE wt.website_id = $1 AND wt.is_default = TRUE
        LIMIT 1
      `, [website.id]);

      let tplRow = tplRes.rows[0];
      if (!tplRow) {
        const sysDef = await queryDb(`
          SELECT id, name, html_content AS system_html, css_content AS system_css,
                 dimension_width, dimension_height, dimension_unit
          FROM system_admit_card_templates
          WHERE is_active = TRUE
          ORDER BY is_system_default DESC, id ASC
          LIMIT 1
        `);
        tplRow = sysDef.rows[0];
      }

      if (tplRow) {
        const rawHtml = tplRow.custom_html || tplRow.system_html || '';
        const rawCss = tplRow.custom_css || tplRow.system_css || '';

        const examDateFormatted = applicant.exam_date
          ? new Date(applicant.exam_date).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })
          : 'To Be Announced';

        const examTimeFormatted = applicant.exam_date
          ? new Date(applicant.exam_date).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
            })
          : '10:00 AM';

        const dobFormatted = applicant.date_of_birth
          ? new Date(applicant.date_of_birth).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })
          : 'N/A';

        const replacements = {
          '{{applicant_name}}': applicant.applicant_name || 'N/A',
          '{{application_no}}': applicant.application_no || 'N/A',
          '{{exam_roll}}': applicant.exam_roll || applicant.roll_no || 'TBA',
          '{{roll_no}}': applicant.exam_roll || applicant.roll_no || 'TBA',
          '{{father_name}}': applicant.father_name || 'N/A',
          '{{mother_name}}': applicant.mother_name || 'N/A',
          '{{date_of_birth}}': dobFormatted,
          '{{gender}}': applicant.gender || 'N/A',
          '{{phone}}': applicant.phone || 'N/A',
          '{{email}}': applicant.email || 'N/A',
          '{{class_name}}': applicant.class_name || 'General Program',
          '{{session_name}}': applicant.session_name || 'Current Session',
          '{{circular_title}}': applicant.circular_title || 'Admission',
          '{{exam_date}}': examDateFormatted,
          '{{exam_time}}': examTimeFormatted,
          '{{exam_venue}}': applicant.venue || 'Main Institutional Campus',
          '{{exam_instructions}}':
            applicant.instructions ||
            'Please arrive at least 30 minutes before exam time. Bring a printed copy of this admit card and photo ID.',
          '{{institution_name}}': website.name || 'Educational Institution',
          '{{institution_address}}': website.address || 'Campus Secretariat',
          '{{institution_logo}}': website.logo_url || '/icon.png',
          '{{candidate_photo}}': applicant.photo_url || '/default-avatar.png',
          '{{candidate_signature}}': applicant.signature_url || '',
          '{{qr_code}}': applicant.application_no || '',
        };

        let processedHtml = rawHtml;
        Object.entries(replacements).forEach(([tag, val]) => {
          const reg = new RegExp(tag.replace(/([{}])/g, '\\$1'), 'g');
          processedHtml = processedHtml.replace(reg, val);
        });

        compiledHtml = processedHtml;
        activeTemplate = {
          name: tplRow.name,
          css: rawCss,
          dimension_width: tplRow.dimension_width,
          dimension_height: tplRow.dimension_height,
          dimension_unit: tplRow.dimension_unit,
        };
      }
    } catch (e) {
      console.warn('Template compilation notice:', e.message);
    }

    return NextResponse.json({
      success: true,
      is_issued: true,
      compiled_html: compiledHtml,
      active_template: activeTemplate,
      admit_card: {
        applicant: {
          id: applicant.id,
          application_no: applicant.application_no,
          exam_roll: applicant.exam_roll || applicant.roll_no,
          roll_no: applicant.exam_roll || applicant.roll_no,
          applicant_name: applicant.applicant_name,
          email: applicant.email,
          phone: applicant.phone,
          gender: applicant.gender,
          date_of_birth: applicant.date_of_birth,
          father_name: applicant.father_name,
          mother_name: applicant.mother_name,
          present_address: applicant.present_address,
          photo_url: applicant.photo_url,
          signature_url: applicant.signature_url
        },
        admission: {
          id: applicant.admission_id,
          title: applicant.circular_title,
          class_name: applicant.class_name,
          session_name: applicant.session_name,
          department_name: applicant.department_name
        },
        exam: {
          exam_date: applicant.exam_date,
          admit_publish_date: applicant.admit_publish_date,
          venue: applicant.venue || 'Main Institutional Campus',
          instructions: applicant.instructions || 'Please arrive at least 30 minutes before exam time. Bring a printed copy of this admit card, photo ID, and writing materials. Electronic devices and calculators are strictly prohibited.',
          subjects: subjectsRes.rows
        },
        institution: {
          name: website.name || 'Educational Institution',
          logo_url: website.logo_url || null,
          phone: website.phone || null,
          email: website.email || null,
          address: website.address || null
        }
      }
    });
  } catch (error) {
    console.error('Error fetching admit card:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
