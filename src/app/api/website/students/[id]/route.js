import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { isAdmin } from '@/lib/auth';
import { deleteImage } from '@/lib/cloudinary';

// PUT: Update student record (Admin only)
export async function PUT(request, { params }) {
  try {
    const authenticated = await isAdmin();
    if (!authenticated) {
      const res_err_299 = { error: 'Unauthorized. Admins only.' };
      return NextResponse.json({
        success: false,
        message: res_err_299?.error || res_err_299?.message || 'An error occurred',
        error: res_err_299?.error || 'Internal Server Error',
        paylod: null
      }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const {
      name,
      email,
      phone,
      registration_number,
      class_id,
      section_id,
      date_of_birth,
      address,
      parents_info,
      birth_certificate_number,
      gender,
      is_active,
      roll
    } = body;

    if (gender && !['Male', 'Female'].includes(gender)) {
      return NextResponse.json({
        success: false,
        message: "Gender must be either 'Male' or 'Female'.",
        error: 'Bad Request',
        paylod: null
      }, { status: 400 });
    }

    if (!registration_number || !class_id) {
      const res_err_971 = { error: 'Registration number and Class are required.' };
      return NextResponse.json({
        success: false,
        message: res_err_971?.error || res_err_971?.message || 'An error occurred',
        error: res_err_971?.error || 'Internal Server Error',
        paylod: null
      }, { status: 400 });
    }

    // Verify student exists
    const checkExist = await query('SELECT id FROM students WHERE id = $1', [id]);
    if (checkExist.rows.length === 0) {
      const res_err_1465 = { error: 'Student record not found.' };
      return NextResponse.json({
        success: false,
        message: res_err_1465?.error || res_err_1465?.message || 'An error occurred',
        error: res_err_1465?.error || 'Internal Server Error',
        paylod: null
      }, { status: 404 });
    }

    // Check duplicate registration_number (excluding current ID)
    const dupReg = await query('SELECT id FROM students WHERE LOWER(registration_number) = LOWER($1) AND id <> $2', [registration_number.trim(), id]);
    if (dupReg.rows.length > 0) {
      const res_err_2044 = { error: 'A student account with this registration number already exists.' };
      return NextResponse.json({
        success: false,
        message: res_err_2044?.error || res_err_2044?.message || 'An error occurred',
        error: res_err_2044?.error || 'Internal Server Error',
        paylod: null
      }, { status: 400 });
    }

    // Check duplicate email (if provided)
    if (email) {
      const dupEmail = await query('SELECT id FROM students WHERE LOWER(email) = LOWER($1) AND id <> $2', [email.trim(), id]);
      if (dupEmail.rows.length > 0) {
        const res_err_2637 = { error: 'A student account with this email address already exists.' };
      return NextResponse.json({
        success: false,
        message: res_err_2637?.error || res_err_2637?.message || 'An error occurred',
        error: res_err_2637?.error || 'Internal Server Error',
        paylod: null
      }, { status: 400 });
      }
    }

    // Check duplicate birth_certificate_number (if provided)
    if (birth_certificate_number) {
      const dupCert = await query('SELECT id FROM students WHERE LOWER(birth_certificate_number) = LOWER($1) AND id <> $2', [birth_certificate_number.trim(), id]);
      if (dupCert.rows.length > 0) {
        const res_err_3306 = { error: 'A student account with this birth certificate number already exists.' };
        return NextResponse.json({
          success: false,
          message: res_err_3306?.error || res_err_3306?.message || 'An error occurred',
          error: res_err_3306?.error || 'Internal Server Error',
          paylod: null
        }, { status: 400 });
      }
    }

    // Check duplicate roll number in class if roll is provided (excluding current student)
    if (roll !== undefined && roll !== '' && roll !== null) {
      const parsedRoll = parseInt(roll, 10);
      const rollCheck = await query('SELECT id FROM students WHERE class_id = $1 AND roll = $2 AND id <> $3', [class_id, parsedRoll, id]);
      if (rollCheck.rows.length > 0) {
        return NextResponse.json({
          success: false,
          message: `Roll number ${parsedRoll} is already assigned to another student in this class.`,
          error: 'Bad Request',
          paylod: null
        }, { status: 400 });
      }
    }

    const result = await query(
      `UPDATE students
       SET name = $1,
           email = $2,
           phone = $3,
           registration_number = $4,
           class_id = $5,
           section_id = $6,
           date_of_birth = $7,
           address = $8,
           parents_info = $9,
           birth_certificate_number = $10,
           gender = $11,
           is_active = $12,
           roll = $13,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $14
       RETURNING *`,
      [
        name ? name.trim() : null,
        email ? email.trim().toLowerCase() : null,
        phone ? phone.trim() : null,
        registration_number.trim(),
        class_id,
        section_id ? parseInt(section_id, 10) : null,
        date_of_birth || null,
        address ? address.trim() : null,
        parents_info ? parents_info.trim() : null,
        birth_certificate_number ? birth_certificate_number.trim() : null,
        gender || null,
        is_active === undefined ? true : is_active,
        roll !== undefined && roll !== '' && roll !== null ? parseInt(roll, 10) : null,
        id
      ]
    );

    const res_data_3313 = {
      message: 'Student account updated successfully.',
      student: result.rows[0]
    };
      return NextResponse.json({
        success: true,
        message: res_data_3313?.message || 'Successfully fecthed data',
        paylod: res_data_3313
      }, { status: 200 });
  } catch (error) {
    console.error('Error updating student:', error);
    const res_err_5129 = { error: 'Failed to update student account. Internal server error.' };
      return NextResponse.json({
        success: false,
        message: res_err_5129?.error || res_err_5129?.message || 'An error occurred',
        error: res_err_5129?.error || 'Internal Server Error',
        paylod: null
      }, { status: 500 });
  }
}

// DELETE: Delete student (Admin only)
export async function DELETE(request, { params }) {
  try {
    const authenticated = await isAdmin();
    if (!authenticated) {
      const res_err_5656 = { error: 'Unauthorized. Admins only.' };
      return NextResponse.json({
        success: false,
        message: res_err_5656?.error || res_err_5656?.message || 'An error occurred',
        error: res_err_5656?.error || 'Internal Server Error',
        paylod: null
      }, { status: 403 });
    }

    const { id } = await params;

    // Retrieve image_id, signature_id, and signatre_id before deleting to clean up Cloudinary assets
    const studentRes = await query('SELECT image_id, signature_id FROM students WHERE id = $1', [id]);
    if (studentRes.rows.length > 0) {
      const { image_id, signature_id } = studentRes.rows[0];
      if (image_id) {
        try {
          await deleteImage(image_id);
        } catch (err) {
          console.error('Failed to delete student image from Cloudinary:', err);
        }
      }
      if (signature_id) {
        try {
          await deleteImage(signature_id);
        } catch (err) {
          console.error('Failed to delete student signature from Cloudinary:', err);
        }
      }
    }

    const result = await query('DELETE FROM students WHERE id = $1 RETURNING id', [id]);

    if (result.rowCount === 0) {
      const res_err_6142 = { error: 'Student record not found.' };
      return NextResponse.json({
        success: false,
        message: res_err_6142?.error || res_err_6142?.message || 'An error occurred',
        error: res_err_6142?.error || 'Internal Server Error',
        paylod: null
      }, { status: 404 });
    }

    const res_data_4430 = {
      message: 'Student record deleted successfully.'
    };
      return NextResponse.json({
        success: true,
        message: res_data_4430?.message || 'Successfully fecthed data',
        paylod: res_data_4430
      }, { status: 200 });
  } catch (error) {
    console.error('Error deleting student:', error);
    const res_err_6910 = { error: 'Failed to delete student. Internal server error.' };
      return NextResponse.json({
        success: false,
        message: res_err_6910?.error || res_err_6910?.message || 'An error occurred',
        error: res_err_6910?.error || 'Internal Server Error',
        paylod: null
      }, { status: 500 });
  }
}
