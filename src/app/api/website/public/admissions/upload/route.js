import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { uploadImage } from '@/lib/cloudinary';

// GET applicant details by ID for upload portal
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Applicant ID is required.' }, { status: 400 });
    }

    const result = await query(`
      SELECT sa.id, sa.applicant_name, sa.email, sa.phone, sa.image, sa.signature, sa.status,
             c.name AS class_name, adm.title AS circular_title, af.status AS fee_status
      FROM student_admissions sa
      JOIN classes c ON sa.applied_class_id = c.id
      LEFT JOIN admissions adm ON sa.admission_id = adm.id
      LEFT JOIN admission_fees af ON sa.id = af.student_admission_id
      WHERE sa.id = $1
    `, [parseInt(id, 10)]);

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Applicant record not found.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      paylod: { applicant: result.rows[0] }
    });
  } catch (error) {
    console.error('Error fetching applicant for upload:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST upload candidate image and signature
export async function POST(request) {
  try {
    const body = await request.json();
    const { id, image, signature } = body;

    if (!id || (!image && !signature)) {
      return NextResponse.json({ success: false, error: 'Applicant ID and image/signature are required.' }, { status: 400 });
    }

    const applicantRes = await query('SELECT * FROM student_admissions WHERE id = $1', [parseInt(id, 10)]);
    if (applicantRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Applicant record not found.' }, { status: 404 });
    }

    const applicant = applicantRes.rows[0];

    let imageUrl = applicant.image;
    let imageId = applicant.image_id;
    let signatureUrl = applicant.signature;
    let signatureId = applicant.signature_id;

    if (image && image.startsWith('data:image')) {
      try {
        const uploadRes = await uploadImage(image, 'student_admissions_images');
        imageUrl = uploadRes.url;
        imageId = uploadRes.publicId;
      } catch (err) {
        console.error('Failed to upload candidate image:', err);
        return NextResponse.json({ success: false, error: 'Failed to upload photo.' }, { status: 500 });
      }
    }

    if (signature && signature.startsWith('data:image')) {
      try {
        const uploadRes = await uploadImage(signature, 'student_admissions_signatures');
        signatureUrl = uploadRes.url;
        signatureId = uploadRes.publicId;
      } catch (err) {
        console.error('Failed to upload candidate signature:', err);
        return NextResponse.json({ success: false, error: 'Failed to upload signature.' }, { status: 500 });
      }
    }

    await query(`
      UPDATE student_admissions SET
        image = $1,
        image_id = $2,
        signature = $3,
        signature_id = $4,
        status = 'pending',
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
    `, [imageUrl, imageId, signatureUrl, signatureId, parseInt(id, 10)]);

    return NextResponse.json({
      success: true,
      message: 'Photo and signature uploaded successfully.',
      paylod: { image: imageUrl, signature: signatureUrl }
    });
  } catch (error) {
    console.error('Error uploading candidate documents:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
