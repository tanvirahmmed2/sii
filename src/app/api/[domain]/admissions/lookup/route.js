import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator.js';
import { checkInstitutionEmailAvailability } from 'src/lib/database/emailUniqueness.js';

export const dynamic = 'force-dynamic';

/**
 * POST /api/[domain]/admissions/lookup
 * Checks if a candidate already exists for the given circular and email.
 * If candidate exists, returns profile and current state to bypass verification and resume.
 */
export async function POST(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json({ success: false, error: 'Educational institution portal not found.' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const { admission_id, circular_id, email } = body;

    const targetAdmId = admission_id || circular_id;
    if (!targetAdmId) {
      return NextResponse.json({ success: false, error: 'Admission circular ID is required.' }, { status: 400 });
    }

    if (!email || !email.trim() || !email.includes('@')) {
      return NextResponse.json({ success: false, error: 'A valid candidate email address is required.' }, { status: 400 });
    }

    const admId = parseInt(targetAdmId, 10);
    const cleanEmail = email.trim().toLowerCase();

    // 1. Query for existing applicant for this circular
    const appRes = await queryDb(
      `SELECT a.*,
              i.data AS info_data,
              g.data AS guardian_data,
              addr.data AS address_data,
              img.photo_url,
              img.signature_url,
              pay.payment_status, pay.amount AS fee_amount, pay.currency AS fee_currency,
              pay.transaction_id, pay.invoice_no,
              c.title AS circular_title, c.selection_method, c.exam_date, c.result_date,
              c.capacity, c.is_result_published,
              ex.exam_date AS admission_exam_date, ex.admit_publish_date, ex.venue AS exam_venue,
              ex.instructions AS exam_instructions
       FROM website_admission_applicants a
       LEFT JOIN website_admission_applicant_info i ON i.applicant_id = a.id
       LEFT JOIN website_admission_applicant_guardians g ON g.applicant_id = a.id
       LEFT JOIN website_admission_applicant_addresses addr ON addr.applicant_id = a.id
       LEFT JOIN website_admission_applicant_images img ON img.applicant_id = a.id
       LEFT JOIN website_admission_fee_payments pay ON pay.applicant_id = a.id
       LEFT JOIN website_admissions c ON c.id = a.admission_id
       LEFT JOIN website_admission_exams ex ON ex.admission_id = a.admission_id
       WHERE a.website_id = $1 AND a.admission_id = $2 AND LOWER(a.email) = $3
       ORDER BY a.id DESC
       LIMIT 1`,
      [website.id, admId, cleanEmail]
    );

    if (appRes.rows.length > 0) {
      const applicant = appRes.rows[0];
      const gData = applicant.guardian_data || {};
      const addrData = applicant.address_data || {};
      const iData = applicant.info_data || {};

      // Determine step based on applicant status
      let currentStep = 'info';
      if (applicant.status === 'incomplete') {
        currentStep = 'info';
      } else if (applicant.status === 'unpaid') {
        currentStep = 'payment';
      } else if (applicant.status === 'paid') {
        currentStep = 'upload';
      } else if (['completed', 'selected', 'rejected', 'enrolled', 'accepted'].includes(applicant.status)) {
        currentStep = 'completed';
      }

      // Check admit card eligibility
      const admitPublishDate = applicant.admit_publish_date ? new Date(applicant.admit_publish_date) : null;
      const isDateReached = admitPublishDate ? new Date() >= admitPublishDate : false;
      const canDownloadAdmitCard = Boolean(
        applicant.status === 'completed' &&
        applicant.selection_method === 'exam' &&
        (applicant.is_admit_card_issued || isDateReached)
      );

      return NextResponse.json({
        success: true,
        exists: true,
        is_verified: true,
        current_step: currentStep,
        status: applicant.status,
        can_download_admit_card: canDownloadAdmitCard,
        applicant: {
          id: applicant.id,
          admission_id: applicant.admission_id,
          application_no: applicant.application_no,
          roll_no: applicant.roll_no || applicant.exam_roll,
          exam_roll: applicant.exam_roll || applicant.roll_no,
          applicant_name: applicant.applicant_name,
          email: applicant.email,
          phone: applicant.phone,
          gender: applicant.gender,
          date_of_birth: applicant.date_of_birth,
          status: applicant.status,
          score: applicant.score,
          merit_position: applicant.merit_position,
          last_class: applicant.last_class,
          last_class_grade: applicant.last_class_grade,
          last_institution: applicant.last_institution,
          ...iData,
          ...gData,
          ...addrData,
          father_name: gData.father_name || iData.father_name || '',
          father_phone: gData.father_phone || iData.father_phone || '',
          father_occupation: gData.father_occupation || iData.father_occupation || '',
          mother_name: gData.mother_name || iData.mother_name || '',
          mother_phone: gData.mother_phone || iData.mother_phone || '',
          mother_occupation: gData.mother_occupation || iData.mother_occupation || '',
          guardian_name: gData.guardian_name || iData.guardian_name || '',
          guardian_phone: gData.guardian_phone || iData.guardian_phone || '',
          guardian_relation: gData.guardian_relation || iData.guardian_relation || '',
          present_address: addrData.present_address || iData.present_address || '',
          permanent_address: addrData.permanent_address || iData.permanent_address || '',
          photo_url: applicant.photo_url,
          signature_url: applicant.signature_url,
          is_admit_card_issued: applicant.is_admit_card_issued,
          admit_card_issued_at: applicant.admit_card_issued_at,
          circular_title: applicant.circular_title,
          selection_method: applicant.selection_method,
          fee_amount: applicant.fee_amount || 0,
          fee_currency: applicant.fee_currency || 'BDT',
          payment_status: applicant.payment_status || 'unpaid',
          invoice_no: applicant.invoice_no,
          transaction_id: applicant.transaction_id,
          exam_date: applicant.admission_exam_date || applicant.exam_date,
          exam_venue: applicant.exam_venue,
          exam_instructions: applicant.exam_instructions,
        }
      });
    }

    // 2. Candidate does not exist yet for this circular.
    // Verify that the email is not registered to an enrolled student, staff, teacher, officer, or other applicant
    const emailCheck = await checkInstitutionEmailAvailability(website.id, cleanEmail);
    if (!emailCheck.available) {
      return NextResponse.json({
        success: false,
        error: emailCheck.message
      }, { status: 409 });
    }

    // Check if email was already verified recently
    const verifiedRes = await queryDb(
      `SELECT id, is_verified, expires_at
       FROM website_email_verifications
       WHERE website_id = $1 AND LOWER(email) = $2 AND purpose = 'admission' AND is_verified = TRUE AND expires_at > CURRENT_TIMESTAMP
       ORDER BY id DESC
       LIMIT 1`,
      [website.id, cleanEmail]
    );

    const isVerified = verifiedRes.rows.length > 0;

    return NextResponse.json({
      success: true,
      exists: false,
      is_verified: isVerified,
      current_step: isVerified ? 'info' : 'verify',
      email: cleanEmail
    });
  } catch (error) {
    console.error('Error in admissions/lookup:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
