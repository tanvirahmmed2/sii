import { NextResponse } from 'next/server';
import { query } from 'src/lib/database/db';
import { isAdmin } from 'src/lib/middleware/auth';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator';

// GET all students (with class & section filter)
export async function GET(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json({ success: false, message: 'Tenant website not found', paylod: { students: [] } }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('class_id');
    const sectionId = searchParams.get('section_id');
    const regNo = searchParams.get('registration_number');

    let sql = `
      SELECT 
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
        c.name AS class_name, 
        c.code AS class_code,
        sec.name AS section_name
      FROM website_students s
      LEFT JOIN website_student_information si ON s.id = si.student_id AND si.website_id = $1
      LEFT JOIN website_classes c ON si.class_id = c.id AND c.website_id = $1
      LEFT JOIN website_sections sec ON si.section_id = sec.id AND sec.website_id = $1
      WHERE s.website_id = $1
    `;
    let params = [website.id];

    if (classId) {
      params.push(classId);
      sql += ` AND si.class_id = $${params.length}`;
    }

    if (sectionId) {
      params.push(sectionId);
      sql += ` AND si.section_id = $${params.length}`;
    }

    if (regNo) {
      params.push(`%${regNo}%`);
      sql += ` AND s.registration_number ILIKE $${params.length}`;
    }

    sql += ' ORDER BY c.numeric_name ASC, sec.name ASC, COALESCE(si.roll, 999999) ASC, s.registration_number ASC';

    const result = await query(sql, params);
    const res_data = { students: result.rows };
    return NextResponse.json({
      success: true,
      message: 'Successfully fetched students',
      payload: res_data,
      paylod: res_data
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching students:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to retrieve students.',
      error: 'Internal Server Error',
      paylod: null
    }, { status: 500 });
  }
}

// POST: Pre-create student account (Admin only)
export async function POST(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json({ success: false, message: 'Tenant website not found', paylod: null }, { status: 404 });
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

    const { registration_number, class_id, section_id, gender, roll, name } = await request.json();

    if (!registration_number || !class_id) {
      return NextResponse.json({
        success: false,
        message: 'Registration number and Target class are required.',
        error: 'Validation Error',
        paylod: null
      }, { status: 400 });
    }

    if (gender && !['Male', 'Female', 'Other'].includes(gender)) {
      return NextResponse.json({
        success: false,
        message: "Gender must be 'Male', 'Female', or 'Other'.",
        error: 'Bad Request',
        paylod: null
      }, { status: 400 });
    }

    // Verify class exists for this website
    const classCheck = await query(
      'SELECT id, name, numeric_name FROM website_classes WHERE website_id = $1 AND id = $2',
      [website.id, class_id]
    );
    if (classCheck.rows.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Target academic class not found.',
        error: 'Not Found',
        paylod: null
      }, { status: 404 });
    }
    const classObj = classCheck.rows[0];

    const generateClassRoll = (classNameOrNumeric, seqNumber) => {
      const match = String(classNameOrNumeric || '').match(/\d+/);
      const classNum = match ? match[0] : '1';
      const seqStr = String(seqNumber).padStart(2, '0');
      return parseInt(`${classNum}0${seqStr}`, 10);
    };

    let assignedRoll = null;

    if (roll !== undefined && roll !== '' && roll !== null) {
      assignedRoll = parseInt(roll, 10);
      const rollCheck = await query(
        'SELECT id FROM website_student_information WHERE website_id = $1 AND class_id = $2 AND roll = $3',
        [website.id, class_id, assignedRoll]
      );
      if (rollCheck.rows.length > 0) {
        return NextResponse.json({
          success: false,
          message: `Roll number ${assignedRoll} is already assigned in this class.`,
          error: 'Bad Request',
          paylod: null
        }, { status: 400 });
      }
    } else {
      const countRes = await query(
        'SELECT COUNT(*) as count FROM website_student_information WHERE website_id = $1 AND class_id = $2',
        [website.id, class_id]
      );
      const nextSeq = parseInt(countRes.rows[0]?.count || 0, 10) + 1;
      assignedRoll = generateClassRoll(classObj.numeric_name || classObj.name, nextSeq);
    }

    // Check duplicate registration number within this website
    const dupCheck = await query(
      'SELECT id FROM website_students WHERE website_id = $1 AND LOWER(registration_number) = LOWER($2)',
      [website.id, registration_number.trim()]
    );
    if (dupCheck.rows.length > 0) {
      return NextResponse.json({
        success: false,
        message: 'A student account with this registration number already exists.',
        error: 'Duplicate Error',
        paylod: null
      }, { status: 400 });
    }

    // Insert student master record
    const studentName = name ? name.trim() : `Student ${registration_number.trim()}`;
    const insertRes = await query(
      `INSERT INTO website_students (website_id, name, registration_number, is_active, is_registered) 
       VALUES ($1, $2, $3, FALSE, FALSE) 
       RETURNING *`,
      [website.id, studentName, registration_number.trim()]
    );
    const newStudent = insertRes.rows[0];

    // Insert student detailed info record
    await query(
      `INSERT INTO website_student_information (website_id, student_id, class_id, section_id, gender, roll)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        website.id,
        newStudent.id,
        class_id,
        section_id ? parseInt(section_id, 10) : null,
        gender || null,
        assignedRoll
      ]
    );

    const res_data = {
      message: 'Student account pre-created successfully.',
      student: {
        ...newStudent,
        class_id,
        section_id,
        roll: assignedRoll,
        gender
      }
    };

    return NextResponse.json({
      success: true,
      message: res_data.message,
      payload: res_data,
      paylod: res_data
    }, { status: 201 });
  } catch (error) {
    console.error('Error pre-creating student account:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to pre-create student account.',
      error: 'Internal Server Error',
      paylod: null
    }, { status: 500 });
  }
}
