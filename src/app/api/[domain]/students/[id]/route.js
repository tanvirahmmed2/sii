import { NextResponse } from 'next/server';
import { query } from 'src/lib/database/db';
import { isAdmin } from 'src/lib/middleware/auth';
import { deleteImage } from 'src/lib/database/cloudinary';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator';

// GET student by ID
export async function GET(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json({ success: false, error: 'Tenant website not found' }, { status: 404 });
    }

    const params = await context?.params;
    const id = params?.id;

    const result = await query(
      `SELECT 
        s.id,
        s.website_id,
        s.name,
        s.email,
        s.phone,
        s.registration_number,
        s.is_active,
        s.is_registered,
        s.image,
        si.class_id,
        si.section_id,
        si.roll,
        si.date_of_birth,
        si.gender,
        si.blood_group,
        si.birth_certificate_number,
        si.address,
        si.father_name,
        si.mother_name,
        si.parents_info,
        c.name AS class_name,
        sec.name AS section_name
       FROM website_students s
       LEFT JOIN website_student_information si ON s.id = si.student_id AND si.website_id = $1
       LEFT JOIN website_classes c ON si.class_id = c.id AND c.website_id = $1
       LEFT JOIN website_sections sec ON si.section_id = sec.id AND sec.website_id = $1
       WHERE s.website_id = $1 AND s.id = $2`,
      [website.id, id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Student record not found.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      payload: { student: result.rows[0] },
      paylod: { student: result.rows[0] }
    });
  } catch (error) {
    console.error('Error fetching student:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT: Update student record (Admin only)
export async function PUT(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json({ success: false, error: 'Tenant website not found' }, { status: 404 });
    }

    const authenticated = await isAdmin();
    if (!authenticated) {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized. Admins only.',
        error: 'Unauthorized',
        paylod: null
      }, { status: 403 });
    }

    const params = await context?.params;
    const id = params?.id;
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

    if (gender && !['Male', 'Female', 'Other'].includes(gender)) {
      return NextResponse.json({
        success: false,
        message: "Gender must be 'Male', 'Female', or 'Other'.",
        error: 'Bad Request',
        paylod: null
      }, { status: 400 });
    }

    if (!registration_number || !class_id) {
      return NextResponse.json({
        success: false,
        message: 'Registration number and Class are required.',
        error: 'Validation Error',
        paylod: null
      }, { status: 400 });
    }

    // Verify student exists for this website
    const checkExist = await query(
      'SELECT id, image_id FROM website_students WHERE website_id = $1 AND id = $2',
      [website.id, id]
    );
    if (checkExist.rows.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Student record not found.',
        error: 'Not Found',
        paylod: null
      }, { status: 404 });
    }

    // Check duplicate registration_number within this website (excluding current student)
    const dupReg = await query(
      'SELECT id FROM website_students WHERE website_id = $1 AND LOWER(registration_number) = LOWER($2) AND id <> $3',
      [website.id, registration_number.trim(), id]
    );
    if (dupReg.rows.length > 0) {
      return NextResponse.json({
        success: false,
        message: 'A student account with this registration number already exists.',
        error: 'Duplicate Error',
        paylod: null
      }, { status: 400 });
    }

    // Check duplicate email (if provided)
    if (email) {
      const dupEmail = await query(
        'SELECT id FROM website_students WHERE website_id = $1 AND LOWER(email) = LOWER($2) AND id <> $3',
        [website.id, email.trim(), id]
      );
      if (dupEmail.rows.length > 0) {
        return NextResponse.json({
          success: false,
          message: 'A student account with this email address already exists.',
          error: 'Duplicate Error',
          paylod: null
        }, { status: 400 });
      }
    }

    // Check duplicate roll number in class if roll is provided
    if (roll !== undefined && roll !== '' && roll !== null) {
      const parsedRoll = parseInt(roll, 10);
      const rollCheck = await query(
        'SELECT id FROM website_student_information WHERE website_id = $1 AND class_id = $2 AND roll = $3 AND student_id <> $4',
        [website.id, class_id, parsedRoll, id]
      );
      if (rollCheck.rows.length > 0) {
        return NextResponse.json({
          success: false,
          message: `Roll number ${parsedRoll} is already assigned to another student in this class.`,
          error: 'Bad Request',
          paylod: null
        }, { status: 400 });
      }
    }

    // Update master student table
    await query(
      `UPDATE website_students
       SET name = COALESCE($1, name),
           email = $2,
           phone = $3,
           registration_number = $4,
           is_active = $5,
           updated_at = CURRENT_TIMESTAMP
       WHERE website_id = $6 AND id = $7`,
      [
        name ? name.trim() : null,
        email ? email.trim().toLowerCase() : null,
        phone ? phone.trim() : null,
        registration_number.trim(),
        is_active === undefined ? true : Boolean(is_active),
        website.id,
        id
      ]
    );

    // Upsert student detailed information table
    await query(
      `INSERT INTO website_student_information (
         website_id, student_id, class_id, section_id, date_of_birth, address, 
         parents_info, birth_certificate_number, gender, roll, updated_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)
       ON CONFLICT (student_id) DO UPDATE SET
         class_id = EXCLUDED.class_id,
         section_id = EXCLUDED.section_id,
         date_of_birth = EXCLUDED.date_of_birth,
         address = EXCLUDED.address,
         parents_info = EXCLUDED.parents_info,
         birth_certificate_number = EXCLUDED.birth_certificate_number,
         gender = EXCLUDED.gender,
         roll = EXCLUDED.roll,
         updated_at = CURRENT_TIMESTAMP`,
      [
        website.id,
        id,
        class_id,
        section_id ? parseInt(section_id, 10) : null,
        date_of_birth || null,
        address ? address.trim() : null,
        parents_info ? parents_info.trim() : null,
        birth_certificate_number ? birth_certificate_number.trim() : null,
        gender || null,
        roll !== undefined && roll !== '' && roll !== null ? parseInt(roll, 10) : null
      ]
    );

    const res_data = {
      message: 'Student account updated successfully.',
      student: { id, name, registration_number, class_id, section_id, roll }
    };

    return NextResponse.json({
      success: true,
      message: res_data.message,
      payload: res_data,
      paylod: res_data
    }, { status: 200 });
  } catch (error) {
    console.error('Error updating student:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to update student account.',
      error: 'Internal Server Error',
      paylod: null
    }, { status: 500 });
  }
}

// DELETE: Delete student (Admin only)
export async function DELETE(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json({ success: false, error: 'Tenant website not found' }, { status: 404 });
    }

    const authenticated = await isAdmin();
    if (!authenticated) {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized. Admins only.',
        error: 'Unauthorized',
        paylod: null
      }, { status: 403 });
    }

    const params = await context?.params;
    const id = params?.id;

    const studentRes = await query(
      'SELECT image_id FROM website_students WHERE website_id = $1 AND id = $2',
      [website.id, id]
    );
    if (studentRes.rows.length > 0 && studentRes.rows[0].image_id) {
      try {
        await deleteImage(studentRes.rows[0].image_id);
      } catch (err) {
        console.error('Failed to delete student image from Cloudinary:', err);
      }
    }

    const result = await query(
      'DELETE FROM website_students WHERE website_id = $1 AND id = $2 RETURNING id',
      [website.id, id]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({
        success: false,
        message: 'Student record not found.',
        error: 'Not Found',
        paylod: null
      }, { status: 404 });
    }

    const res_data = { message: 'Student record deleted successfully.' };
    return NextResponse.json({
      success: true,
      message: res_data.message,
      payload: res_data,
      paylod: res_data
    }, { status: 200 });
  } catch (error) {
    console.error('Error deleting student:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to delete student.',
      error: 'Internal Server Error',
      paylod: null
    }, { status: 500 });
  }
}
