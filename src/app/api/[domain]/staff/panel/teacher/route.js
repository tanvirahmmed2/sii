import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { queryDb } from 'src/lib/database/db.js';
import { verifyTeacherStaffAccess } from 'src/lib/middleware/teacher-auth.js';
import { hashPassword } from 'src/lib/middleware/staff.js';
import { sendEmail, buildStyledEmail } from 'src/lib/database/brevo.js';
import { uploadImage, deleteImage } from 'src/lib/database/cloudinary.js';
import { checkInstitutionEmailAvailability } from 'src/lib/database/emailUniqueness.js';


/**
 * Constructs the teacher verification link using custom domain (if set)
 * or ${subdomain}.${baseDomain}/auth/access/teacher/verify?token=...
 */
export function buildTeacherVerificationUrl(website, token, request) {
  const reqHost = request?.headers?.get?.('x-forwarded-host') || request?.headers?.get?.('host') || '';
  const baseHost = (reqHost ? reqHost.split(',')[0].trim() : '') || 'localhost:3000';
  const protocol = request?.headers?.get?.('x-forwarded-proto') || (baseHost.includes('localhost') ? 'http' : 'https');

  // 1. Custom domain (if set)
  const rawCustom = (website?.custom_domain || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  if (rawCustom) {
    const customProto = rawCustom.includes('localhost') ? 'http' : 'https';
    return `${customProto}://${rawCustom}/auth/access/teacher/verify?token=${encodeURIComponent(token)}`;
  }

  // 2. Subdomain of platform base URL
  const rawSub = (website?.subdomain || website?.slug || '').trim().toLowerCase();
  const cleanSub = rawSub.includes('.') ? rawSub.split('.')[0] : rawSub;

  if (baseHost.includes('localhost')) {
    const port = baseHost.includes(':') ? `:${baseHost.split(':')[1]}` : '';
    return `${protocol}://${cleanSub}.localhost${port}/auth/access/teacher/verify?token=${encodeURIComponent(token)}`;
  }

  // Production base domain
  const cleanHostNoPort = baseHost.split(':')[0];
  const parts = cleanHostNoPort.split('.');
  const baseDomain = parts.length >= 2 ? parts.slice(-2).join('.') : cleanHostNoPort;
  const port = baseHost.includes(':') ? `:${baseHost.split(':')[1]}` : '';

  return `${protocol}://${cleanSub}.${baseDomain}${port}/auth/access/teacher/verify?token=${encodeURIComponent(token)}`;
}

// GET: Fetch teachers roster with designations, stats, or single teacher profile
export async function GET(request, context) {
  try {
    const auth = await verifyTeacherStaffAccess(request, context, 'view');
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { website } = auth;
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const email = searchParams.get('email');
    const search = searchParams.get('search')?.trim();
    const designationId = searchParams.get('designation_id');
    const status = searchParams.get('status'); // 'all', 'active', 'inactive'
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
    const offset = (page - 1) * limit;

    // Single teacher profile retrieval
    if (id || email) {
      let queryStr = `
        SELECT wt.id, wt.website_id, wt.department_id, wt.designation_id, wt.name, wt.email, wt.number,
               wt.emergency_contact, wt.gender, wt.blood_group, wt.date_of_birth, wt.religion,
               wt.address, wt.permanent_address, wt.joining_date, wt.salary, wt.photo_url,
               wt.photo_id, wt.is_active, wt.is_registered, wt.created_at, wt.updated_at,
               wd.title AS designation_title, wd.display_order AS designation_order,
               dept.name AS department_name, dept.code AS department_code,
               ts.payroll_id,
               tp.title AS payroll_title,
               tp.grade_code AS payroll_grade_code,
               tp.basic_salary AS payroll_basic_salary,
               (COALESCE(tp.basic_salary, 0) + COALESCE(tp.house_rent, 0) + COALESCE(tp.medical_allowance, 0) + COALESCE(tp.transport_allowance, 0) + COALESCE(tp.other_allowance, 0)) AS payroll_gross_salary,
               ((COALESCE(tp.basic_salary, 0) + COALESCE(tp.house_rent, 0) + COALESCE(tp.medical_allowance, 0) + COALESCE(tp.transport_allowance, 0) + COALESCE(tp.other_allowance, 0)) - 
                (COALESCE(tp.provident_fund, 0) + COALESCE(tp.tax_deduction, 0) + COALESCE(tp.other_deductions, 0))) AS payroll_net_salary
        FROM website_teachers wt
        LEFT JOIN website_designations wd ON wd.id = wt.designation_id
        LEFT JOIN website_departments dept ON dept.id = wt.department_id
        LEFT JOIN website_teacher_salaries ts ON ts.teacher_id = wt.id AND ts.website_id = wt.website_id
        LEFT JOIN website_teacher_payrolls tp ON tp.id = ts.payroll_id AND tp.website_id = wt.website_id
        WHERE wt.website_id = $1
      `;
      const queryParams = [website.id];

      if (id) {
        queryStr += ` AND wt.id = $2`;
        queryParams.push(id);
      } else {
        queryStr += ` AND LOWER(wt.email) = LOWER($2)`;
        queryParams.push(email.trim());
      }

      const res = await queryDb(queryStr, queryParams);
      if (res.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Teacher not found.' }, { status: 404 });
      }

      const teacher = res.rows[0];

      // Fetch teacher qualifications
      const qualRes = await queryDb(
        `SELECT id, degree, institute, board, passing_year, result, certificate_url, certificate_id, created_at
         FROM website_teacher_qualifications
         WHERE website_id = $1 AND teacher_id = $2
         ORDER BY passing_year DESC NULLS LAST, id DESC`,
        [website.id, teacher.id]
      );
      teacher.qualifications = qualRes.rows;

      // Fetch teacher assigned subjects
      const subjRes = await queryDb(
        `SELECT wts.id, wts.subject_id, wts.class_id, wts.is_primary,
                ws.name AS subject_name, ws.code AS subject_code,
                wc.name AS class_name
         FROM website_teacher_subjects wts
         JOIN website_subjects ws ON ws.id = wts.subject_id
         LEFT JOIN website_classes wc ON wc.id = wts.class_id
         WHERE wts.website_id = $1 AND wts.teacher_id = $2
         ORDER BY ws.name ASC`,
        [website.id, teacher.id]
      );
      teacher.subjects = subjRes.rows;

      // Fetch teacher class routine periods
      const periodsRes = await queryDb(
        `SELECT wtcp.id, wtcp.period_id, wtcp.class_id, wtcp.section_id, wtcp.day_id,
                wp.name AS period_name, wp.start_time, wp.end_time,
                wd.name AS day_name,
                wc.name AS class_name,
                wsec.name AS section_name
         FROM website_teacher_class_periods wtcp
         JOIN website_periods wp ON wp.id = wtcp.period_id
         LEFT JOIN website_days wd ON wd.id = wtcp.day_id
         LEFT JOIN website_classes wc ON wc.id = wtcp.class_id
         LEFT JOIN website_sections wsec ON wsec.id = wtcp.section_id
         WHERE wtcp.website_id = $1 AND wtcp.teacher_id = $2
         ORDER BY wd.id ASC, wp.start_time ASC`,
        [website.id, teacher.id]
      );
      teacher.class_periods = periodsRes.rows;

      return NextResponse.json({ success: true, teacher });
    }

    // List of teachers with filters & search
    let whereClauses = ['wt.website_id = $1'];
    let params = [website.id];
    let paramIndex = 2;

    if (search) {
      whereClauses.push(`(wt.name ILIKE $${paramIndex} OR wt.email ILIKE $${paramIndex} OR wt.number ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (designationId && designationId !== 'all') {
      whereClauses.push(`wt.designation_id = $${paramIndex}`);
      params.push(designationId);
      paramIndex++;
    }

    const departmentId = searchParams.get('department_id');
    if (departmentId && departmentId !== 'all') {
      whereClauses.push(`wt.department_id = $${paramIndex}`);
      params.push(departmentId);
      paramIndex++;
    }

    if (status === 'active') {
      whereClauses.push(`wt.is_active = TRUE`);
    } else if (status === 'inactive') {
      whereClauses.push(`wt.is_active = FALSE`);
    }

    const whereStr = whereClauses.join(' AND ');

    // Total count for current filter
    const countRes = await queryDb(
      `SELECT COUNT(*)::int AS count FROM website_teachers wt WHERE ${whereStr}`,
      params
    );
    const total = countRes.rows[0]?.count || 0;

    // Aggregated metrics
    const statsRes = await queryDb(
      `SELECT 
         COUNT(*)::int AS total_teachers,
         COUNT(*) FILTER (WHERE is_active = TRUE)::int AS active_teachers,
         COUNT(*) FILTER (WHERE is_active = FALSE)::int AS inactive_teachers,
         COUNT(DISTINCT designation_id)::int AS total_designations,
         COUNT(DISTINCT department_id)::int AS total_departments
       FROM website_teachers
       WHERE website_id = $1`,
      [website.id]
    );
    const stats = statsRes.rows[0] || {
      total_teachers: 0,
      active_teachers: 0,
      inactive_teachers: 0,
      total_designations: 0,
      total_departments: 0,
    };

    // Query rows with pagination
    const listQuery = `
      SELECT wt.id, wt.website_id, wt.department_id, wt.designation_id, wt.name, wt.email, wt.number,
             wt.emergency_contact, wt.gender, wt.blood_group, wt.date_of_birth, wt.religion,
             wt.address, wt.permanent_address, wt.joining_date, wt.salary, wt.photo_url,
             wt.photo_id, wt.is_active, wt.is_registered, wt.created_at, wt.updated_at,
             wd.title AS designation_title,
             dept.name AS department_name, dept.code AS department_code,
             ts.payroll_id,
             tp.title AS payroll_title,
             tp.grade_code AS payroll_grade_code,
             tp.basic_salary AS payroll_basic_salary,
             (SELECT COUNT(*)::int FROM website_teacher_qualifications wtq WHERE wtq.teacher_id = wt.id) AS qualification_count,
             (SELECT COUNT(*)::int FROM website_teacher_subjects wts WHERE wts.teacher_id = wt.id) AS subject_count
      FROM website_teachers wt
      LEFT JOIN website_designations wd ON wd.id = wt.designation_id
      LEFT JOIN website_departments dept ON dept.id = wt.department_id
      LEFT JOIN website_teacher_salaries ts ON ts.teacher_id = wt.id AND ts.website_id = wt.website_id
      LEFT JOIN website_teacher_payrolls tp ON tp.id = ts.payroll_id AND tp.website_id = wt.website_id
      WHERE ${whereStr}
      ORDER BY wt.is_active DESC, wd.display_order ASC NULLS LAST, wt.name ASC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(limit, offset);

    const listRes = await queryDb(listQuery, params);

    return NextResponse.json({
      success: true,
      teachers: listRes.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
      stats,
    });
  } catch (error) {
    console.error('Error fetching teachers list:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to fetch teachers.' }, { status: 500 });
  }
}

// Helper to parse multipart/form-data or json
async function parseTeacherRequest(request) {
  const contentType = request.headers.get('content-type') || '';
  let body = {};
  let imageFile = null;

  if (contentType.includes('multipart/form-data') || contentType.includes('form-data')) {
    const formData = await request.formData();
    for (const [key, value] of formData.entries()) {
      if (value && typeof value === 'object' && typeof value.arrayBuffer === 'function') {
        if (key === 'file' || key === 'photo' || key === 'image') {
          imageFile = value;
        }
      } else {
        body[key] = value;
      }
    }
    if (typeof body.qualifications === 'string') {
      try {
        body.qualifications = JSON.parse(body.qualifications);
      } catch (e) {
        body.qualifications = [];
      }
    }
  } else {
    body = await request.json().catch(() => ({}));
  }

  return { body, imageFile };
}

// POST: Create / Register new teacher
export async function POST(request, context) {
  try {
    const auth = await verifyTeacherStaffAccess(request, context, 'create');
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { website } = auth;
    const { body, imageFile } = await parseTeacherRequest(request);
    const {
      name,
      email,
      number,
      department_id,
      emergency_contact = null,
      gender = 'male',
      blood_group = null,
      date_of_birth = null,
      religion = null,
      address = null,
      permanent_address = null,
      joining_date = null,
      salary = 0.00,
      payroll_id = null,
      designation_id = null,
      photo_url = null,
      photo_id = null,
      password = null,
      is_active = true,
      qualifications = [],
    } = body;

    // Input validation
    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, error: 'Teacher full name is required.' }, { status: 400 });
    }
    if (!email || !email.trim()) {
      return NextResponse.json({ success: false, error: 'Teacher email address is required.' }, { status: 400 });
    }
    if (!number || !number.trim()) {
      return NextResponse.json({ success: false, error: 'Teacher contact number is required.' }, { status: 400 });
    }
    if (!department_id) {
      return NextResponse.json({ success: false, error: 'Department is required. Every teacher must belong to an academic department.' }, { status: 400 });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedNumber = number.trim();

    // Check cross-role email uniqueness across all institution roles
    const emailAvail = await checkInstitutionEmailAvailability(website.id, trimmedEmail);
    if (!emailAvail.available) {
      return NextResponse.json({ success: false, error: emailAvail.message }, { status: 409 });
    }


    // Verify department exists and belongs to this website
    const deptRes = await queryDb(
      `SELECT id, name FROM website_departments WHERE id = $1 AND website_id = $2 LIMIT 1`,
      [department_id, website.id]
    );
    if (deptRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Selected department does not exist in this institution.' }, { status: 400 });
    }
    const verifiedDepartmentId = deptRes.rows[0].id;

    // Verify designation exists if provided
    let verifiedDesignationId = null;
    if (designation_id) {
      const desRes = await queryDb(
        `SELECT id FROM website_designations WHERE id = $1 AND website_id = $2 LIMIT 1`,
        [designation_id, website.id]
      );
      if (desRes.rows.length > 0) {
        verifiedDesignationId = desRes.rows[0].id;
      }
    }

    // Verify payroll scale if provided and calculate salary
    let finalSalary = Number(salary) || 0.00;
    let selectedPayroll = null;
    const targetPayrollId = payroll_id || body.payrollId || null;

    if (targetPayrollId) {
      const payrollCheck = await queryDb(
        `SELECT id, title, grade_code, basic_salary, house_rent, medical_allowance, transport_allowance, other_allowance,
                provident_fund, tax_deduction, other_deductions
         FROM website_teacher_payrolls WHERE id = $1 AND website_id = $2 LIMIT 1`,
        [Number(targetPayrollId), website.id]
      );
      if (payrollCheck.rows.length > 0) {
        selectedPayroll = payrollCheck.rows[0];
        const gross = Number(selectedPayroll.basic_salary) + Number(selectedPayroll.house_rent) + Number(selectedPayroll.medical_allowance) + Number(selectedPayroll.transport_allowance) + Number(selectedPayroll.other_allowance);
        const deductions = Number(selectedPayroll.provident_fund) + Number(selectedPayroll.tax_deduction) + Number(selectedPayroll.other_deductions);
        finalSalary = Math.max(0, gross - deductions);
      }
    }

    // Generate a demo password by setup while creating teacher
    const demoPassword = password && password.trim()
      ? password.trim()
      : `Teacher@${Math.floor(100000 + Math.random() * 900000)}`;
    const hashedPassword = await hashPassword(demoPassword);

    // Cryptographic verification token (valid for 7 days)
    const verificationToken = crypto.randomBytes(32).toString('hex');

    // STEP 1: CREATE TEACHER TABLE ROW FIRST IN DATABASE (status inactive until email verification)
    const insertRes = await queryDb(
      `INSERT INTO website_teachers (
         website_id, department_id, designation_id, name, email, number, emergency_contact,
         gender, blood_group, date_of_birth, religion, address, permanent_address,
         joining_date, salary, photo_url, photo_id, password, is_active, is_registered,
         verification_token, verification_token_expires
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7,
         $8, $9, $10, $11, $12, $13,
         COALESCE($14::date, CURRENT_DATE), $15, $16, $17, $18, FALSE, FALSE,
         $19, CURRENT_TIMESTAMP + INTERVAL '7 days'
       ) RETURNING *`,
      [
        website.id,
        verifiedDepartmentId,
        verifiedDesignationId,
        name.trim(),
        trimmedEmail,
        trimmedNumber,
        emergency_contact?.trim() || null,
        ['male', 'female', 'other'].includes(gender) ? gender : 'male',
        blood_group?.trim() || null,
        date_of_birth || null,
        religion?.trim() || null,
        address?.trim() || null,
        permanent_address?.trim() || null,
        joining_date || null,
        finalSalary,
        photo_url?.trim() || null,
        photo_id?.trim() || null,
        hashedPassword,
        verificationToken,
      ]
    );

    const createdTeacher = insertRes.rows[0];

    // STEP 2: ASSIGN PAYROLL SCALE IN website_teacher_salaries TABLE
    if (selectedPayroll) {
      await queryDb(
        `INSERT INTO website_teacher_salaries (
           website_id, teacher_id, payroll_id, effective_date, status, remarks
         ) VALUES ($1, $2, $3, COALESCE($4::date, CURRENT_DATE), 'active', 'Assigned on teacher registration')
         ON CONFLICT (website_id, teacher_id) DO UPDATE SET
           payroll_id = EXCLUDED.payroll_id,
           effective_date = EXCLUDED.effective_date,
           status = EXCLUDED.status,
           updated_at = CURRENT_TIMESTAMP`,
        [website.id, createdTeacher.id, selectedPayroll.id, joining_date || null]
      );
      createdTeacher.payroll_id = selectedPayroll.id;
      createdTeacher.payroll_title = selectedPayroll.title;
      createdTeacher.payroll_grade_code = selectedPayroll.grade_code;
    }

    // STEP 3: ONLY AFTER TABLE ROW EXISTS, UPLOAD IMAGE TO CLOUDINARY & SAVE URL
    if (imageFile) {
      try {
        const uploadRes = await uploadImage(imageFile, `school/${website.id}/teachers`);
        if (uploadRes?.secure_url) {
          const updatePhotoRes = await queryDb(
            `UPDATE website_teachers SET photo_url = $1, photo_id = $2 WHERE id = $3 AND website_id = $4 RETURNING *`,
            [uploadRes.secure_url, uploadRes.publicId, createdTeacher.id, website.id]
          );
          if (updatePhotoRes.rows[0]) {
            createdTeacher.photo_url = updatePhotoRes.rows[0].photo_url;
            createdTeacher.photo_id = updatePhotoRes.rows[0].photo_id;
          }
        }
      } catch (uploadErr) {
        console.error('Teacher photo Cloudinary upload error:', uploadErr);
      }
    }

    // Optional initial qualifications insertion
    if (Array.isArray(qualifications) && qualifications.length > 0) {
      for (const q of qualifications) {
        if (q && q.degree && q.institute) {
          await queryDb(
            `INSERT INTO website_teacher_qualifications (
               website_id, teacher_id, degree, institute, board, passing_year, result, certificate_url, certificate_id
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
              website.id,
              createdTeacher.id,
              q.degree.trim(),
              q.institute.trim(),
              q.board?.trim() || null,
              q.passing_year ? parseInt(q.passing_year, 10) : null,
              q.result?.trim() || null,
              q.certificate_url?.trim() || null,
              q.certificate_id?.trim() || null,
            ]
          ).catch((e) => console.error('Error inserting initial qualification:', e));
        }
      }
    }

    // Build verification link using custom domain (if set) or subdomain.baseurl
    const verificationUrl = buildTeacherVerificationUrl(website, verificationToken, request);

    // Send verification link to teacher's email via website mailer (with fallback to platform mailer)
    let emailSent = false;
    let emailError = null;
    try {
      const emailHtml = buildStyledEmail({
        title: 'Faculty Account Activation',
        subtitle: `${website.name} — Teacher Operations Portal`,
        recipientName: name.trim(),
        bodyParagraphs: [
          `You have been registered as a teacher at ${website.name}.`,
          'Your account status is currently inactive pending verification. Please verify your faculty profile and configure your personal login password using the secure link below to activate your account.',
          'This verification link is valid for 7 days. Once verified, your status will become active and you will be able to log in, recover your password if forgotten, and access the Teacher Portal.',
        ],
        actionUrl: verificationUrl,
        actionText: 'Activate Account & Set Password →',
        footerNote: 'If you did not expect this invitation, please contact your campus administration.',
      });

      await sendEmail({
        to: trimmedEmail,
        toName: name.trim(),
        subject: `${website.name} - Activate Your Faculty Account`,
        html: emailHtml,
        websiteId: website.id,
      });
      emailSent = true;
    } catch (mailErr) {
      emailError = mailErr.message;
      console.warn('[Staff Teacher Create] Verification email dispatch note:', mailErr.message);
    }

    if (createdTeacher) {
      delete createdTeacher.password;
      delete createdTeacher.two_factor_code;
      delete createdTeacher.two_factor_expires;
    }

    return NextResponse.json({
      success: true,
      teacher: createdTeacher,
      verificationUrl,
      emailSent,
      emailError: emailSent ? null : emailError,
      message: emailSent
        ? 'Teacher registered successfully with status inactive (pending verification). Verification link dispatched to email.'
        : 'Teacher registered successfully (inactive pending verification). Verification link generated.',
    }, { status: 201 });
  } catch (error) {
    console.error('Error registering teacher:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to register teacher.' }, { status: 500 });
  }
}

// PUT: Update existing teacher profile
export async function PUT(request, context) {
  try {
    const auth = await verifyTeacherStaffAccess(request, context, 'edit');
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { website } = auth;
    const { body, imageFile } = await parseTeacherRequest(request);
    const {
      id,
      name,
      email,
      number,
      department_id,
      emergency_contact,
      gender,
      blood_group,
      date_of_birth,
      religion,
      address,
      permanent_address,
      joining_date,
      salary,
      payroll_id,
      designation_id,
      photo_url,
      photo_id,
      password,
      is_active,
    } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Teacher ID is required for update.' }, { status: 400 });
    }

    // Verify teacher exists and belongs to current website
    const checkRes = await queryDb(
      `SELECT id, password, photo_id FROM website_teachers WHERE id = $1 AND website_id = $2 LIMIT 1`,
      [id, website.id]
    );

    if (checkRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Teacher not found or access denied.' }, { status: 404 });
    }

    const currentTeacher = checkRes.rows[0];

    // Check duplicate email across all institution roles
    if (email) {
      const emailAvail = await checkInstitutionEmailAvailability(website.id, email.trim(), {
        excludeRole: 'teacher',
        excludeId: id
      });
      if (!emailAvail.available) {
        return NextResponse.json({ success: false, error: emailAvail.message }, { status: 409 });
      }
    }


    // Handle password update if provided
    let passwordHash = currentTeacher.password;
    if (password && password.trim()) {
      passwordHash = await hashPassword(password.trim());
    }

    // Verify department exists if provided
    let verifiedDepartmentId = undefined;
    if (department_id !== undefined) {
      if (!department_id) {
        return NextResponse.json({ success: false, error: 'Department is required.' }, { status: 400 });
      }
      const deptRes = await queryDb(
        `SELECT id FROM website_departments WHERE id = $1 AND website_id = $2 LIMIT 1`,
        [department_id, website.id]
      );
      if (deptRes.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Selected department does not exist in this institution.' }, { status: 400 });
      }
      verifiedDepartmentId = deptRes.rows[0].id;
    }

    // Verify designation exists if provided
    let verifiedDesignationId = null;
    if (designation_id) {
      const desRes = await queryDb(
        `SELECT id FROM website_designations WHERE id = $1 AND website_id = $2 LIMIT 1`,
        [designation_id, website.id]
      );
      if (desRes.rows.length > 0) {
        verifiedDesignationId = desRes.rows[0].id;
      }
    }

    // Verify payroll scale if provided and calculate salary
    const targetPayrollId = payroll_id !== undefined ? payroll_id : body.payrollId;
    let selectedPayroll = null;
    let computedSalary = undefined;

    if (targetPayrollId !== undefined) {
      if (
        targetPayrollId &&
        String(targetPayrollId).trim() !== '' &&
        String(targetPayrollId) !== '0' &&
        String(targetPayrollId) !== 'null' &&
        String(targetPayrollId) !== 'none'
      ) {
        const payrollCheck = await queryDb(
          `SELECT id, title, grade_code, basic_salary, house_rent, medical_allowance, transport_allowance, other_allowance,
                  provident_fund, tax_deduction, other_deductions
           FROM website_teacher_payrolls WHERE id = $1 AND website_id = $2 LIMIT 1`,
          [Number(targetPayrollId), website.id]
        );
        if (payrollCheck.rows.length > 0) {
          selectedPayroll = payrollCheck.rows[0];
          const gross =
            Number(selectedPayroll.basic_salary) +
            Number(selectedPayroll.house_rent) +
            Number(selectedPayroll.medical_allowance) +
            Number(selectedPayroll.transport_allowance) +
            Number(selectedPayroll.other_allowance);
          const deductions =
            Number(selectedPayroll.provident_fund) +
            Number(selectedPayroll.tax_deduction) +
            Number(selectedPayroll.other_deductions);
          computedSalary = Math.max(0, gross - deductions);
        }
      } else {
        computedSalary = 0.00;
      }
    }

    const finalSalaryToUpdate =
      computedSalary !== undefined
        ? computedSalary
        : salary !== undefined && salary !== null && salary !== ''
        ? Number(salary)
        : null;

    // STEP 1: UPDATE TEACHER TABLE ROW FIRST IN DATABASE
    const updateRes = await queryDb(
      `UPDATE website_teachers
       SET name = COALESCE($1, name),
           email = COALESCE($2, email),
           number = COALESCE($3, number),
           emergency_contact = $4,
           gender = COALESCE($5, gender),
           blood_group = $6,
           date_of_birth = $7,
           religion = $8,
           address = $9,
           permanent_address = $10,
           joining_date = COALESCE($11::date, joining_date),
           salary = COALESCE($12, salary),
           designation_id = $13,
           department_id = COALESCE($14, department_id),
           photo_url = COALESCE($15, photo_url),
           photo_id = COALESCE($16, photo_id),
           password = $17,
           is_active = COALESCE($18, is_active),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $19 AND website_id = $20
       RETURNING *`,
      [
        name?.trim() || null,
        email?.trim().toLowerCase() || null,
        number?.trim() || null,
        emergency_contact !== undefined ? (emergency_contact?.trim() || null) : null,
        gender && ['male', 'female', 'other'].includes(gender) ? gender : null,
        blood_group !== undefined ? (blood_group?.trim() || null) : null,
        date_of_birth !== undefined ? (date_of_birth || null) : null,
        religion !== undefined ? (religion?.trim() || null) : null,
        address !== undefined ? (address?.trim() || null) : null,
        permanent_address !== undefined ? (permanent_address?.trim() || null) : null,
        joining_date || null,
        finalSalaryToUpdate,
        verifiedDesignationId,
        verifiedDepartmentId !== undefined ? verifiedDepartmentId : null,
        photo_url !== undefined ? (photo_url?.trim() || null) : null,
        photo_id !== undefined ? (photo_id?.trim() || null) : null,
        passwordHash,
        is_active !== undefined ? Boolean(is_active) : null,
        id,
        website.id,
      ]
    );

    let updatedTeacher = updateRes.rows[0];

    // STEP 2: SYNC PAYROLL SCALE ASSIGNMENT IN website_teacher_salaries
    if (targetPayrollId !== undefined) {
      if (selectedPayroll) {
        await queryDb(
          `INSERT INTO website_teacher_salaries (
             website_id, teacher_id, payroll_id, effective_date, status, remarks
           ) VALUES ($1, $2, $3, COALESCE($4::date, CURRENT_DATE), 'active', 'Updated from teacher profile')
           ON CONFLICT (website_id, teacher_id) DO UPDATE SET
             payroll_id = EXCLUDED.payroll_id,
             effective_date = COALESCE(EXCLUDED.effective_date, website_teacher_salaries.effective_date),
             status = 'active',
             updated_at = CURRENT_TIMESTAMP`,
          [website.id, id, selectedPayroll.id, joining_date || null]
        );
        updatedTeacher.payroll_id = selectedPayroll.id;
        updatedTeacher.payroll_title = selectedPayroll.title;
        updatedTeacher.payroll_grade_code = selectedPayroll.grade_code;
        updatedTeacher.payroll_basic_salary = selectedPayroll.basic_salary;
      } else if (
        !targetPayrollId ||
        String(targetPayrollId) === '0' ||
        String(targetPayrollId) === 'null' ||
        String(targetPayrollId) === 'none'
      ) {
        await queryDb(
          `DELETE FROM website_teacher_salaries WHERE website_id = $1 AND teacher_id = $2`,
          [website.id, id]
        );
        updatedTeacher.payroll_id = null;
        updatedTeacher.payroll_title = null;
        updatedTeacher.payroll_grade_code = null;
        updatedTeacher.payroll_basic_salary = null;
      }
    }

    // STEP 3: IF NEW IMAGE PROVIDED, UPLOAD TO CLOUDINARY & UPDATE TABLE ROW
    if (imageFile) {
      try {
        const uploadRes = await uploadImage(imageFile, `school/${website.id}/teachers`);
        if (uploadRes?.secure_url) {
          if (currentTeacher.photo_id) {
            deleteImage(currentTeacher.photo_id).catch(() => {});
          }
          const photoUpdateRes = await queryDb(
            `UPDATE website_teachers SET photo_url = $1, photo_id = $2 WHERE id = $3 AND website_id = $4 RETURNING *`,
            [uploadRes.secure_url, uploadRes.publicId, id, website.id]
          );
          if (photoUpdateRes.rows[0]) {
            updatedTeacher = photoUpdateRes.rows[0];
          }
        }
      } catch (uploadErr) {
        console.error('Teacher photo update Cloudinary error:', uploadErr);
      }
    }

    if (updatedTeacher) {
      delete updatedTeacher.password;
      delete updatedTeacher.two_factor_code;
      delete updatedTeacher.two_factor_expires;
    }

    return NextResponse.json({
      success: true,
      teacher: updatedTeacher,
      message: 'Teacher profile updated successfully.',
    });
  } catch (error) {
    console.error('Error updating teacher:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to update teacher.' }, { status: 500 });
  }
}

// DELETE: Remove a teacher
export async function DELETE(request, context) {
  try {
    const auth = await verifyTeacherStaffAccess(request, context, 'delete');
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { website } = auth;
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Teacher ID parameter is required.' }, { status: 400 });
    }

    const delRes = await queryDb(
      `DELETE FROM website_teachers WHERE id = $1 AND website_id = $2 RETURNING id, name, email, photo_id`,
      [id, website.id]
    );

    if (delRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Teacher record not found or already deleted.' }, { status: 404 });
    }

    if (delRes.rows[0].photo_id) {
      deleteImage(delRes.rows[0].photo_id).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      message: `Teacher ${delRes.rows[0].name} deleted successfully.`,
    });
  } catch (error) {
    console.error('Error deleting teacher:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to delete teacher.' }, { status: 500 });
  }
}
