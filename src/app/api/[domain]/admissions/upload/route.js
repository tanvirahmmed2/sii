import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator.js';
import { uploadImage } from 'src/lib/database/cloudinary.js';

/**
 * GET: Retrieves applicant information, fee payment status, and existing media for candidate
 */
export async function GET(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json({ success: false, error: 'Institution portal not found.' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const applicantId = searchParams.get('id');
    const applicationNo = searchParams.get('application_no');

    if (!applicantId && !applicationNo) {
      return NextResponse.json({ success: false, error: 'Applicant ID or Application Number is required.' }, { status: 400 });
    }

    const query = `
      SELECT 
        a.id, a.admission_id, a.application_no, a.roll_no, a.applicant_name,
        a.email, a.phone, a.status, a.created_at,
        c.title AS circular_title,
        cls.name AS class_name, ses.name AS session_name,
        COALESCE(p.payment_status, 'unpaid') AS payment_status,
        COALESCE(p.amount, 500.00) AS fee_amount,
        COALESCE(p.currency, 'BDT') AS fee_currency,
        img.photo_url,
        img.signature_url,
        a.gender, a.date_of_birth
      FROM website_admission_applicants a
      JOIN website_admissions c ON a.admission_id = c.id
      LEFT JOIN website_classes cls ON cls.id = c.class_id
      LEFT JOIN website_sessions ses ON ses.id = c.session_id
      LEFT JOIN website_admission_fee_payments p ON p.applicant_id = a.id
      LEFT JOIN website_admission_applicant_images img ON img.applicant_id = a.id
      WHERE a.website_id = $1 AND (${applicantId ? 'a.id = $2' : 'a.application_no = $2'})
      ORDER BY p.id DESC
      LIMIT 1
    `;

    const res = await queryDb(query, [website.id, applicantId || applicationNo]);

    if (res.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Applicant record not found.' }, { status: 404 });
    }

    const applicant = res.rows[0];

    return NextResponse.json({
      success: true,
      applicant: {
        id: applicant.id,
        admission_id: applicant.admission_id,
        application_no: applicant.application_no,
        roll_no: applicant.roll_no,
        applicant_name: applicant.applicant_name,
        email: applicant.email,
        phone: applicant.phone,
        status: applicant.status,
        payment_status: applicant.payment_status,
        fee_amount: applicant.fee_amount,
        fee_currency: applicant.fee_currency,
        circular_title: applicant.circular_title,
        session_name: applicant.session_name,
        class_name: applicant.class_name,
        photo_url: applicant.photo_url,
        signature_url: applicant.signature_url,
        image: applicant.photo_url,
        signature: applicant.signature_url,
        created_at: applicant.created_at
      }
    });
  } catch (error) {
    console.error('Error fetching applicant for media upload:', error);
    return NextResponse.json({ success: false, error: 'Internal server error.' }, { status: 500 });
  }
}

/**
 * POST: Uploads candidate photo (300x300 strict) and signature (150x50 strict) to Cloudinary,
 * records into website_admission_applicant_images, and updates applicant status to 'completed'.
 */
export async function POST(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json({ success: false, error: 'Institution portal not found.' }, { status: 404 });
    }

    let applicantId, photoData, signatureData;

    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      applicantId = formData.get('id') || formData.get('applicant_id');
      photoData = formData.get('photo') || formData.get('image');
      signatureData = formData.get('signature');
    } else {
      const json = await request.json();
      applicantId = json.id || json.applicant_id;
      photoData = json.photo || json.image || json.photo_url;
      signatureData = json.signature || json.signature_url;
    }

    if (!applicantId) {
      return NextResponse.json({ success: false, error: 'Applicant ID is required.' }, { status: 400 });
    }

    if (!photoData || !signatureData) {
      return NextResponse.json({ success: false, error: 'Both candidate photo and signature are required.' }, { status: 400 });
    }

    const appId = parseInt(applicantId, 10);

    // 1. Verify applicant and ensure payment clearance in website_admission_fee_payments
    const appRes = await queryDb(
      `SELECT a.id, a.status, a.applicant_name, a.application_no,
              COALESCE(p.payment_status, 'unpaid') AS payment_status
       FROM website_admission_applicants a
       LEFT JOIN website_admission_fee_payments p ON p.applicant_id = a.id
       WHERE a.id = $1 AND a.website_id = $2
       ORDER BY p.id DESC
       LIMIT 1`,
      [appId, website.id]
    );

    if (appRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Applicant record not found.' }, { status: 404 });
    }

    const applicant = appRes.rows[0];

    // Strictly enforce payment clearance
    if (applicant.payment_status !== 'paid') {
      return NextResponse.json({
        success: false,
        error: 'Application fee has not been cleared. Please complete payment before uploading candidate portrait and signature.'
      }, { status: 403 });
    }

    // 2. Upload to Cloudinary
    let photoUrl = photoData;
    let photoPublicId = null;
    let signatureUrl = signatureData;
    let signaturePublicId = null;

    if (typeof photoData === 'string' && photoData.startsWith('data:image')) {
      const cloudPhoto = await uploadImage(photoData, `admissions/applicants/${website.id}/photos`);
      photoUrl = cloudPhoto.url;
      photoPublicId = cloudPhoto.public_id || null;
    }

    if (typeof signatureData === 'string' && signatureData.startsWith('data:image')) {
      const cloudSig = await uploadImage(signatureData, `admissions/applicants/${website.id}/signatures`);
      signatureUrl = cloudSig.url;
      signaturePublicId = cloudSig.public_id || null;
    }

    // 3. Upsert into website_admission_applicant_images
    await queryDb(`
      INSERT INTO website_admission_applicant_images (
        website_id, applicant_id, photo_url, photo_public_id, signature_url, signature_public_id, uploaded_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP
      )
      ON CONFLICT (applicant_id)
      DO UPDATE SET
        photo_url = EXCLUDED.photo_url,
        photo_public_id = EXCLUDED.photo_public_id,
        signature_url = EXCLUDED.signature_url,
        signature_public_id = EXCLUDED.signature_public_id,
        uploaded_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    `, [
      website.id,
      appId,
      photoUrl,
      photoPublicId,
      signatureUrl,
      signaturePublicId
    ]);

    // 4. Check circular type and generate exam_roll if admission is exam based
    const admRes = await queryDb(
      `SELECT a.id, a.selection_method, a.exam_date,
              ex.exam_date AS admission_exam_date, ex.admit_publish_date, ex.venue
       FROM website_admissions a
       LEFT JOIN website_admission_exams ex ON ex.admission_id = a.id
       WHERE a.id = $1`,
      [applicant.admission_id]
    );
    const circular = admRes.rows[0];

    let generatedExamRoll = applicant.exam_roll || applicant.roll_no || null;
    if (circular && circular.selection_method === 'exam' && !generatedExamRoll) {
      const completedCountRes = await queryDb(
        `SELECT COUNT(*)::int AS count
         FROM website_admission_applicants
         WHERE admission_id = $1 AND website_id = $2 AND exam_roll IS NOT NULL`,
        [applicant.admission_id, website.id]
      );
      const completedSeq = (completedCountRes.rows[0]?.count || 0) + 1;
      const currentYear = new Date().getFullYear();
      generatedExamRoll = `${currentYear}${completedSeq}`;
    }

    // 5. Update website_admission_applicants status to 'completed' and set exam_roll
    await queryDb(`
      UPDATE website_admission_applicants
      SET status = 'completed',
          exam_roll = COALESCE($1, exam_roll),
          roll_no = COALESCE($1, roll_no),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND website_id = $3
    `, [generatedExamRoll, appId, website.id]);

    return NextResponse.json({
      success: true,
      message: 'Candidate documents successfully uploaded and intake status marked as completed!',
      applicant_id: appId,
      photo_url: photoUrl,
      signature_url: signatureUrl,
      status: 'completed',
      exam_roll: generatedExamRoll,
      roll_no: generatedExamRoll
    });
  } catch (error) {
    console.error('Error uploading candidate media:', error);
    return NextResponse.json({ success: false, error: error.message || 'Media upload failed.' }, { status: 500 });
  }
}
