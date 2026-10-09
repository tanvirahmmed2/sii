import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { queryDb } from 'src/lib/database/db.js';
import { verifyTeacherStaffAccess } from 'src/lib/middleware/teacher-auth.js';
import { hashPassword } from 'src/lib/middleware/staff.js';
import { sendEmail, buildStyledEmail } from 'src/lib/database/brevo.js';

/**
 * Constructs the teacher verification link using custom domain (if set)
 * or ${subdomain}.${baseDomain}/auth/access/teacher/verify?token=...
 */
function buildTeacherVerificationUrl(website, token, request) {
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
        SELECT wt.id, wt.website_id, wt.designation_id, wt.name, wt.email, wt.number,
               wt.emergency_contact, wt.gender, wt.blood_group, wt.date_of_birth, wt.religion,
               wt.address, wt.permanent_address, wt.joining_date, wt.salary, wt.photo_url,
               wt.photo_id, wt.is_active, wt.is_registered, wt.created_at, wt.updated_at,
               wd.title AS designation_title, wd.display_order AS designation_order
        FROM website_teachers wt
        LEFT JOIN website_designations wd ON wd.id = wt.designation_id
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
         COUNT(DISTINCT designation_id)::int AS total_designations
       FROM website_teachers
       WHERE website_id = $1`,
      [website.id]
    );
    const stats = statsRes.rows[0] || {
      total_teachers: 0,
      active_teachers: 0,
      inactive_teachers: 0,
      total_designations: 0,
    };

    // Query rows with pagination
    const listQuery = `
      SELECT wt.id, wt.website_id, wt.designation_id, wt.name, wt.email, wt.number,
             wt.emergency_contact, wt.gender, wt.blood_group, wt.date_of_birth, wt.religion,
             wt.address, wt.permanent_address, wt.joining_date, wt.salary, wt.photo_url,
             wt.photo_id, wt.is_active, wt.is_registered, wt.created_at, wt.updated_at,
             wd.title AS designation_title,
             (SELECT COUNT(*)::int FROM website_teacher_qualifications wtq WHERE wtq.teacher_id = wt.id) AS qualification_count,
             (SELECT COUNT(*)::int FROM website_teacher_subjects wts WHERE wts.teacher_id = wt.id) AS subject_count
      FROM website_teachers wt
      LEFT JOIN website_designations wd ON wd.id = wt.designation_id
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

// POST: Create / Register new teacher
export async function POST(request, context) {
  try {
    const auth = await verifyTeacherStaffAccess(request, context, 'create');
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { website } = auth;
    const body = await request.json().catch(() => ({}));
    const {
      name,
      email,
      number,
      emergency_contact = null,
      gender = 'male',
      blood_group = null,
      date_of_birth = null,
      religion = null,
      address = null,
      permanent_address = null,
      joining_date = null,
      salary = 0.00,
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

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedNumber = number.trim();

    // Check duplicate email per website
    const existing = await queryDb(
      `SELECT id FROM website_teachers WHERE website_id = $1 AND LOWER(email) = $2 LIMIT 1`,
      [website.id, trimmedEmail]
    );

    if (existing.rows.length > 0) {
      return NextResponse.json({ success: false, error: 'A teacher with this email already exists in this institution.' }, { status: 409 });
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

    // Generate a demo password by setup while creating teacher
    const demoPassword = password && password.trim()
      ? password.trim()
      : `Teacher@${Math.floor(100000 + Math.random() * 900000)}`;
    const hashedPassword = await hashPassword(demoPassword);

    // Cryptographic verification token (valid for 7 days)
    const verificationToken = crypto.randomBytes(32).toString('hex');

    const insertRes = await queryDb(
      `INSERT INTO website_teachers (
         website_id, designation_id, name, email, number, emergency_contact,
         gender, blood_group, date_of_birth, religion, address, permanent_address,
         joining_date, salary, photo_url, photo_id, password, is_active, is_registered,
         verification_token, verification_token_expires
       ) VALUES (
         $1, $2, $3, $4, $5, $6,
         $7, $8, $9, $10, $11, $12,
         COALESCE($13::date, CURRENT_DATE), $14, $15, $16, $17, $18, FALSE,
         $19, CURRENT_TIMESTAMP + INTERVAL '7 days'
       ) RETURNING *`,
      [
        website.id,
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
        Number(salary) || 0.00,
        photo_url?.trim() || null,
        photo_id?.trim() || null,
        hashedPassword,
        Boolean(is_active),
        verificationToken,
      ]
    );

    const createdTeacher = insertRes.rows[0];

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
        title: 'Faculty Account Invitation',
        subtitle: `${website.name} — Teacher Operations Portal`,
        recipientName: name.trim(),
        bodyParagraphs: [
          `You have been invited and registered as a teacher at ${website.name}.`,
          'Please verify your faculty profile and set up your login password using the secure link below.',
          'This invitation link is valid for 7 days. Once verified, you will be able to access the Teacher Portal to manage your classes, schedules, and attendance records.',
        ],
        actionUrl: verificationUrl,
        actionText: 'Verify Profile & Set Password →',
        footerNote: 'If you did not expect this invitation, please contact your campus administration.',
      });

      await sendEmail({
        to: trimmedEmail,
        toName: name.trim(),
        subject: `${website.name} - Complete Your Faculty Account Setup`,
        html: emailHtml,
        websiteId: website.id,
      });
      emailSent = true;
    } catch (mailErr) {
      emailError = mailErr.message;
      console.warn('[Staff Teacher Create] Verification email dispatch note:', mailErr.message);
    }

    return NextResponse.json({
      success: true,
      teacher: createdTeacher,
      verificationUrl,
      emailSent,
      emailError: emailSent ? null : emailError,
      message: emailSent
        ? 'Teacher registered successfully! Verification invitation has been dispatched to their email.'
        : 'Teacher registered successfully. Verification link generated.',
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
    const body = await request.json().catch(() => ({}));
    const {
      id,
      name,
      email,
      number,
      emergency_contact,
      gender,
      blood_group,
      date_of_birth,
      religion,
      address,
      permanent_address,
      joining_date,
      salary,
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
      `SELECT id, password FROM website_teachers WHERE id = $1 AND website_id = $2 LIMIT 1`,
      [id, website.id]
    );

    if (checkRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Teacher not found or access denied.' }, { status: 404 });
    }

    const currentTeacher = checkRes.rows[0];

    // Check duplicate email
    if (email) {
      const emailConflict = await queryDb(
        `SELECT id FROM website_teachers WHERE website_id = $1 AND LOWER(email) = LOWER($2) AND id != $3 LIMIT 1`,
        [website.id, email.trim(), id]
      );
      if (emailConflict.rows.length > 0) {
        return NextResponse.json({ success: false, error: 'Another teacher is already using this email.' }, { status: 409 });
      }
    }

    // Handle password update if provided
    let passwordHash = currentTeacher.password;
    if (password && password.trim()) {
      passwordHash = await hashPassword(password.trim());
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
           photo_url = COALESCE($14, photo_url),
           photo_id = COALESCE($15, photo_id),
           password = $16,
           is_active = COALESCE($17, is_active),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $18 AND website_id = $19
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
        salary !== undefined ? Number(salary) : null,
        verifiedDesignationId,
        photo_url !== undefined ? (photo_url?.trim() || null) : null,
        photo_id !== undefined ? (photo_id?.trim() || null) : null,
        passwordHash,
        is_active !== undefined ? Boolean(is_active) : null,
        id,
        website.id,
      ]
    );

    return NextResponse.json({
      success: true,
      teacher: updateRes.rows[0],
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
      `DELETE FROM website_teachers WHERE id = $1 AND website_id = $2 RETURNING id, name, email`,
      [id, website.id]
    );

    if (delRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Teacher record not found or already deleted.' }, { status: 404 });
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
