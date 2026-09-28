import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJWT, comparePassword, hashPassword } from '@/lib/auth';
import { query } from '@/lib/db';
import { uploadImage, deleteImage } from '@/lib/cloudinary';

// GET logged-in student profile details
export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('fit-student')?.value;
    if (!token) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const decoded = verifyJWT(token);
    if (!decoded || !decoded.id) {
      return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });
    }

    const result = await query(`
      SELECT 
        s.id, s.name, s.email, s.phone, s.registration_number, s.roll, 
        s.date_of_birth, s.gender, s.birth_certificate_number, s.blood_group, s.address, 
        s.image, s.image_id,
        s.father_name, s.father_occupation, s.father_phone, 
        s.mother_name, s.mother_occupation, s.mother_phone, 
        s.past_school_name, s.past_school_class, s.past_school_result, s.special_note, 
        s.parents_info, s.class_id, s.section_id, 
        c.name as class_name, sec.name as section_name
      FROM students s
      LEFT JOIN classes c ON s.class_id = c.id
      LEFT JOIN sections sec ON s.section_id = sec.id
      WHERE s.id = $1 AND s.is_active = TRUE AND s.is_registered = TRUE
    `, [decoded.id]);

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Student account is inactive or not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      paylod: { student: result.rows[0] }
    }, { status: 200 });
  } catch (error) {
    console.error('Error in student/me GET endpoint:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}

// PUT update logged-in student profile & password
export async function PUT(request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('fit-student')?.value;
    if (!token) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const decoded = verifyJWT(token);
    if (!decoded || !decoded.id) {
      return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });
    }

    const studentRes = await query(
      'SELECT id, password_hash, image, image_id FROM students WHERE id = $1 AND is_active = TRUE AND is_registered = TRUE',
      [decoded.id]
    );

    if (studentRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Student account not found or inactive.' }, { status: 404 });
    }

    const currentStudent = studentRes.rows[0];
    const body = await request.json();

    const {
      name,
      phone,
      date_of_birth,
      gender,
      blood_group,
      address,
      father_name,
      father_occupation,
      father_phone,
      mother_name,
      mother_occupation,
      mother_phone,
      past_school_name,
      past_school_class,
      past_school_result,
      special_note,
      current_password,
      new_password,
      image
    } = body;

    let updatedPasswordHash = currentStudent.password_hash;

    // Password update verification
    if (new_password) {
      if (!current_password) {
        return NextResponse.json({ success: false, error: 'Current password is required to change password.' }, { status: 400 });
      }

      const match = await comparePassword(current_password, currentStudent.password_hash);
      if (!match) {
        return NextResponse.json({ success: false, error: 'Current password is incorrect.' }, { status: 400 });
      }

      if (new_password.length < 6) {
        return NextResponse.json({ success: false, error: 'New password must be at least 6 characters long.' }, { status: 400 });
      }

      updatedPasswordHash = await hashPassword(new_password);
    }

    // Optional profile picture update
    let imageUrl = currentStudent.image;
    let imageId = currentStudent.image_id;

    if (image && image.startsWith('data:image')) {
      try {
        const uploadResult = await uploadImage(image, 'students');
        imageUrl = uploadResult.url;
        imageId = uploadResult.publicId;

        if (currentStudent.image_id) {
          try {
            await deleteImage(currentStudent.image_id);
          } catch (delErr) {
            console.error('Failed to delete old student image:', delErr);
          }
        }
      } catch (uploadErr) {
        console.error('Cloudinary upload failure:', uploadErr);
        return NextResponse.json({ success: false, error: 'Failed to upload student image.' }, { status: 500 });
      }
    }

    const parentsInfo = `Father: ${father_name || 'N/A'} (${father_phone || 'N/A'}), Mother: ${mother_name || 'N/A'} (${mother_phone || 'N/A'})`;

    // Update student details
    const updateRes = await query(`
      UPDATE students SET
        name = COALESCE($1, name),
        phone = COALESCE($2, phone),
        date_of_birth = COALESCE($3, date_of_birth),
        gender = COALESCE($4, gender),
        blood_group = $5,
        address = COALESCE($6, address),
        father_name = $7,
        father_occupation = $8,
        father_phone = $9,
        mother_name = $10,
        mother_occupation = $11,
        mother_phone = $12,
        past_school_name = $13,
        past_school_class = $14,
        past_school_result = $15,
        special_note = $16,
        parents_info = $17,
        password_hash = $18,
        image = $19,
        image_id = $20,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $21
      RETURNING id, name, email, phone, registration_number, roll, date_of_birth, gender, birth_certificate_number, blood_group, address, father_name, father_occupation, father_phone, mother_name, mother_occupation, mother_phone, past_school_name, past_school_class, past_school_result, special_note, parents_info, image, image_id
    `, [
      name ? name.trim() : null,
      phone ? phone.trim() : null,
      date_of_birth || null,
      gender || null,
      blood_group ? blood_group.trim() : null,
      address ? address.trim() : null,
      father_name ? father_name.trim() : null,
      father_occupation ? father_occupation.trim() : null,
      father_phone ? father_phone.trim() : null,
      mother_name ? mother_name.trim() : null,
      mother_occupation ? mother_occupation.trim() : null,
      mother_phone ? mother_phone.trim() : null,
      past_school_name ? past_school_name.trim() : null,
      past_school_class ? past_school_class.trim() : null,
      past_school_result ? past_school_result.trim() : null,
      special_note ? special_note.trim() : null,
      parentsInfo,
      updatedPasswordHash,
      imageUrl,
      imageId,
      decoded.id
    ]);

    return NextResponse.json({
      success: true,
      message: 'Profile details updated successfully.',
      paylod: { student: updateRes.rows[0] }
    }, { status: 200 });
  } catch (error) {
    console.error('Error updating student profile:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
