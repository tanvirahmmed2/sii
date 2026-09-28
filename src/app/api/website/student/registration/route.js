import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { hashPassword } from '@/lib/auth';

// POST: Verify if registration number and verification code exists and is valid
export async function POST(request) {
  try {
    const { registration_number, verification_code } = await request.json();

    if (!registration_number || !verification_code) {
      return NextResponse.json({
        success: false,
        error: 'Registration number and verification code are required.',
        paylod: null
      }, { status: 400 });
    }

    const result = await query(
      `SELECT s.*, c.name as class_name 
       FROM students s
       JOIN classes c ON s.class_id = c.id
       WHERE LOWER(s.registration_number) = LOWER($1)`,
      [registration_number.trim()]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Registration number not found in our registry. Please contact admin.',
        paylod: null
      }, { status: 404 });
    }

    const student = result.rows[0];

    if (student.is_registered) {
      return NextResponse.json({
        success: false,
        error: 'This registration number is already registered. Please go to Login.',
        paylod: null
      }, { status: 400 });
    }

    // Verify verification code
    if (!student.verification_code || student.verification_code !== verification_code.trim()) {
      return NextResponse.json({
        success: false,
        error: 'Invalid verification code. Please check your email.',
        paylod: null
      }, { status: 400 });
    }

    // Check expiration
    if (student.verification_code_expires && new Date(student.verification_code_expires) < new Date()) {
      return NextResponse.json({
        success: false,
        error: 'The verification code has expired. Please contact admin.',
        paylod: null
      }, { status: 400 });
    }

    // Parse parents/guardian info
    let parentName = '';
    let parentContact = '';
    if (student.parents_info) {
      const parts = student.parents_info.split(', ');
      parts.forEach(p => {
        if (p.startsWith('Parent Name:')) parentName = p.replace('Parent Name:', '').trim();
        if (p.startsWith('Contact:')) parentContact = p.replace('Contact:', '').trim();
      });
    }

    const res_data = {
      message: 'Registration credentials verified successfully.',
      student: {
        id: student.id,
        registration_number: student.registration_number,
        class_name: student.class_name,
        name: student.name || '',
        email: student.email || '',
        phone: student.phone || '',
        date_of_birth: student.date_of_birth ? new Date(student.date_of_birth).toISOString().split('T')[0] : '',
        address: student.address || '',
        gender: student.gender || '',
        birth_certificate_number: student.birth_certificate_number || '',
        parent_name: parentName,
        parent_contact: parentContact
      }
    };

    return NextResponse.json({
      success: true,
      message: res_data.message,
      paylod: res_data
    }, { status: 200 });
  } catch (error) {
    console.error('Error verifying student registration:', error);
    const res_err_2405 = { error: 'Failed to verify registration number. Internal server error.' };
      return NextResponse.json({
        success: false,
        message: res_err_2405?.error || res_err_2405?.message || 'An error occurred',
        error: res_err_2405?.error || 'Internal Server Error',
        paylod: null
      }, { status: 500 });
  }
}

// PUT: Complete account setup
export async function PUT(request) {
  try {
    const body = await request.json();
    const {
      registration_number,
      name,
      email,
      phone,
      date_of_birth,
      address,
      parents_info,
      birth_certificate_number,
      gender,
      password,
      parent_name,
      parent_contact
    } = body;

    if (!registration_number || !name || !email || !phone || !date_of_birth || !address || !parents_info || !birth_certificate_number || !password) {
      const res_err_3205 = { error: 'All fields are required to complete registration setup.' };
      return NextResponse.json({
        success: false,
        message: res_err_3205?.error || res_err_3205?.message || 'An error occurred',
        error: res_err_3205?.error || 'Internal Server Error',
        paylod: null
      }, { status: 400 });
    }

    if (gender && !['Male', 'Female'].includes(gender)) {
      return NextResponse.json({
        success: false,
        message: "Gender must be either 'Male' or 'Female'.",
        error: 'Bad Request',
        paylod: null
      }, { status: 400 });
    }

    // Verify student exists and is unregistered
    const studentCheck = await query(
      'SELECT id, is_registered FROM students WHERE LOWER(registration_number) = LOWER($1)',
      [registration_number.trim()]
    );

    if (studentCheck.rows.length === 0) {
      const res_err_3828 = { error: 'Student registration record not found.' };
      return NextResponse.json({
        success: false,
        message: res_err_3828?.error || res_err_3828?.message || 'An error occurred',
        error: res_err_3828?.error || 'Internal Server Error',
        paylod: null
      }, { status: 404 });
    }

    if (studentCheck.rows[0].is_registered) {
      const res_err_4215 = { error: 'This student account has already completed setup.' };
      return NextResponse.json({
        success: false,
        message: res_err_4215?.error || res_err_4215?.message || 'An error occurred',
        error: res_err_4215?.error || 'Internal Server Error',
        paylod: null
      }, { status: 400 });
    }

    const studentId = studentCheck.rows[0].id;

    // Check duplicate email (excluding current student)
    const emailCheck = await query('SELECT id FROM students WHERE LOWER(email) = LOWER($1) AND id <> $2', [email.trim(), studentId]);
    if (emailCheck.rows.length > 0) {
      const res_err_4744 = { error: 'A student account with this email address already exists.' };
      return NextResponse.json({
        success: false,
        message: res_err_4744?.error || res_err_4744?.message || 'An error occurred',
        error: res_err_4744?.error || 'Internal Server Error',
        paylod: null
      }, { status: 400 });
    }

    // Check duplicate birth certificate number (excluding current student)
    const certCheck = await query('SELECT id FROM students WHERE LOWER(birth_certificate_number) = LOWER($1) AND id <> $2', [birth_certificate_number.trim(), studentId]);
    if (certCheck.rows.length > 0) {
      const res_err_5336 = { error: 'A student account with this birth certificate number already exists.' };
      return NextResponse.json({
        success: false,
        message: res_err_5336?.error || res_err_5336?.message || 'An error occurred',
        error: res_err_5336?.error || 'Internal Server Error',
        paylod: null
      }, { status: 400 });
    }

    // Hash password
    const hashedPass = await hashPassword(password);

    // Save and activate student account (clearing temporary registration codes)
    const result = await query(
      `UPDATE students
       SET name = $1, 
           email = $2, 
           phone = $3, 
           date_of_birth = $4, 
           address = $5, 
           parents_info = $6, 
           birth_certificate_number = $7, 
           password_hash = $8,
           gender = $9,
           is_registered = TRUE,
           is_active = TRUE,
           verification_code = NULL,
           verification_code_expires = NULL,
           updated_at = CURRENT_TIMESTAMP
       WHERE LOWER(registration_number) = LOWER($10)
       RETURNING id, name, email, registration_number, is_active, is_registered`,
      [
        name.trim(),
        email.trim().toLowerCase(),
        phone.trim(),
        date_of_birth,
        address.trim(),
        parents_info.trim(),
        birth_certificate_number.trim(),
        hashedPass,
        gender || null,
        registration_number.trim()
      ]
    );

    let parentName = parent_name || '';
    let parentContact = parent_contact || '';

    if (!parentName || !parentContact) {
      if (parents_info) {
        const parts = parents_info.split(', ');
        parts.forEach(p => {
          if (p.startsWith('Parent Name:')) parentName = p.replace('Parent Name:', '').trim();
          if (p.startsWith('Contact:')) parentContact = p.replace('Contact:', '').trim();
        });
      }
    }

    // Check if guardian exists for this student
    const guardianCheck = await query(
      'SELECT id FROM student_guardians WHERE student_id = $1',
      [studentId]
    );

    if (guardianCheck.rows.length > 0) {
      // Update existing guardian
      await query(
        `UPDATE student_guardians 
         SET name = $1,
             phone = $2,
             updated_at = CURRENT_TIMESTAMP
         WHERE student_id = $3`,
        [parentName || 'Parent', parentContact || phone, studentId]
      );
    } else {
      // Insert new guardian
      await query(
        `INSERT INTO student_guardians (student_id, name, relationship, phone)
         VALUES ($1, $2, 'Relative', $3)`,
        [studentId, parentName || 'Relative', parentContact || phone]
      );
    }

    const res_data_4585 = {
      message: 'Student account setup completed successfully. You can now login.',
      student: result.rows[0]
    };
      return NextResponse.json({
        success: true,
        message: res_data_4585?.message || 'Successfully fecthed data',
        paylod: res_data_4585
      }, { status: 200 });
  } catch (error) {
    console.error('Error completing student registration:', error);
    const res_err_7139 = { error: 'Failed to complete registration setup. Internal server error.' };
      return NextResponse.json({
        success: false,
        message: res_err_7139?.error || res_err_7139?.message || 'An error occurred',
        error: res_err_7139?.error || 'Internal Server Error',
        paylod: null
      }, { status: 500 });
  }
}
