import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator.js';
import { uploadImage } from 'src/lib/database/cloudinary.js';

/**
 * GET: Retrieves applicant information, payment status, and existing media for photo/signature upload
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
        a.email, a.phone, a.status, a.payment_status, a.created_at,
        c.title AS circular_title,
        cls.name AS class_name, ses.name AS session_name,
        info.photo_url, info.signature_url, info.father_name, info.mother_name,
        a.gender, a.date_of_birth
      FROM website_admission_applicants a
      JOIN website_admissions c ON a.admission_id = c.id
      LEFT JOIN website_classes cls ON cls.id = c.class_id
      LEFT JOIN website_sessions ses ON ses.id = c.session_id
      LEFT JOIN website_admission_applicant_info info ON a.id = info.applicant_id
      WHERE a.website_id = $1 AND (${applicantId ? 'a.id = $2' : 'a.application_no = $2'})
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
        circular_title: applicant.circular_title,
        session_name: applicant.session_name,
        class_name: applicant.class_name,
        photo_url: applicant.photo_url,
        signature_url: applicant.signature_url,
        image: applicant.photo_url,
        signature: applicant.signature_url,
        created_at: applicant.created_at
      },
      paylod: {
        applicant: {
          id: applicant.id,
          admission_id: applicant.admission_id,
          application_no: applicant.application_no,
          applicant_name: applicant.applicant_name,
          email: applicant.email,
          phone: applicant.phone,
          status: applicant.status,
          payment_status: applicant.payment_status,
          circular_title: applicant.circular_title,
          photo_url: applicant.photo_url,
          signature_url: applicant.signature_url,
          image: applicant.photo_url,
          signature: applicant.signature_url
        }
      }
    });
  } catch (error) {
    console.error('Error fetching applicant for media upload:', error);
    return NextResponse.json({ success: false, error: 'Internal server error.' }, { status: 500 });
  }
}

/**
 * POST: Uploads candidate photo (500x500) and signature, requiring payment clearance
 */
export async function POST(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json({ success: false, error: 'Institution portal not found.' }, { status: 404 });
    }

    let applicantId, photoData, signatureData;

    // Check if Content-Type is multipart/form-data or application/json
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

    // 1. Verify applicant and ensure payment clearance
    const appRes = await queryDb(
      `SELECT a.id, a.payment_status, a.status, a.applicant_name, a.application_no
       FROM website_admission_applicants a
       WHERE a.id = $1 AND a.website_id = $2
       LIMIT 1`,
      [applicantId, website.id]
    );

    if (appRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Applicant record not found.' }, { status: 404 });
    }

    const applicant = appRes.rows[0];

    // Enforce payment clearance
    if (applicant.payment_status !== 'paid') {
      return NextResponse.json({
        success: false,
        error: 'Application fee has not been marked as PAID. Please complete payment before uploading candidate media.'
      }, { status: 403 });
    }

    // 2. Upload / process photo and signature
    let photoUrl = photoData;
    let signatureUrl = signatureData;

    try {
      if (typeof photoData === 'string' && photoData.startsWith('data:')) {
        const upRes = await uploadImage(photoData, `website_${website.id}/admissions/photos`);
        photoUrl = upRes.secure_url;
      } else if (typeof photoData === 'object' && typeof photoData.arrayBuffer === 'function') {
        const upRes = await uploadImage(photoData, `website_${website.id}/admissions/photos`);
        photoUrl = upRes.secure_url;
      }
    } catch (uploadErr) {
      console.warn('Cloudinary photo upload fallback to raw data:', uploadErr.message);
      // If Cloudinary fails in dev/mock, we preserve data uri
    }

    try {
      if (typeof signatureData === 'string' && signatureData.startsWith('data:')) {
        const upRes = await uploadImage(signatureData, `website_${website.id}/admissions/signatures`);
        signatureUrl = upRes.secure_url;
      } else if (typeof signatureData === 'object' && typeof signatureData.arrayBuffer === 'function') {
        const upRes = await uploadImage(signatureData, `website_${website.id}/admissions/signatures`);
        signatureUrl = upRes.secure_url;
      }
    } catch (uploadErr) {
      console.warn('Cloudinary signature upload fallback to raw data:', uploadErr.message);
    }

    // 3. Upsert into website_admission_applicant_info
    await queryDb(
      `INSERT INTO website_admission_applicant_info (website_id, applicant_id, photo_url, signature_url, updated_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
       ON CONFLICT (applicant_id)
       DO UPDATE SET
         photo_url = EXCLUDED.photo_url,
         signature_url = EXCLUDED.signature_url,
         updated_at = CURRENT_TIMESTAMP`,
      [website.id, applicant.id, photoUrl, signatureUrl]
    );

    // 4. Mark applicant status as 'completed'
    await queryDb(
      `UPDATE website_admission_applicants
       SET status = 'completed', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND website_id = $2`,
      [applicant.id, website.id]
    );

    return NextResponse.json({
      success: true,
      message: 'Candidate photo and signature uploaded successfully! Application is now marked as Completed.',
      payload: {
        applicant_id: applicant.id,
        application_no: applicant.application_no,
        status: 'completed',
        photo_url: photoUrl,
        signature_url: signatureUrl
      }
    });
  } catch (error) {
    console.error('Error handling candidate media upload:', error);
    return NextResponse.json({ success: false, error: 'Internal server error while uploading media.' }, { status: 500 });
  }
}
