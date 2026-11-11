import { queryDb } from './db.js';

export async function checkInstitutionEmailAvailability(websiteId, email, options = {}) {
  if (!email || typeof email !== 'string') {
    return { available: false, message: 'Valid email address is required.' };
  }

  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@')) {
    return { available: false, message: 'Valid email address format is required.' };
  }

  const wId = parseInt(websiteId, 10);
  const { excludeRole = null, excludeId = null } = options;
  const exId = excludeId ? parseInt(excludeId, 10) : null;

  if (excludeRole !== 'student') {
    const res = await queryDb(
      `SELECT id, registration_no, is_active FROM website_students
       WHERE website_id = $1 AND LOWER(TRIM(email)) = $2 LIMIT 1`,
      [wId, cleanEmail]
    );
    if (res.rows.length > 0) {
      return {
        available: false,
        role: 'student',
        message: 'This email is already registered to an enrolled student in this institution. Existing students cannot apply for admission.'
      };
    }
  } else if (exId) {
    const res = await queryDb(
      `SELECT id FROM website_students
       WHERE website_id = $1 AND LOWER(TRIM(email)) = $2 AND id != $3 LIMIT 1`,
      [wId, cleanEmail, exId]
    );
    if (res.rows.length > 0) {
      return {
        available: false,
        role: 'student',
        message: 'This email is already registered to another student in this institution.'
      };
    }
  }

  if (excludeRole !== 'staff') {
    const res = await queryDb(
      `SELECT id, name FROM website_staffs
       WHERE website_id = $1 AND LOWER(TRIM(email)) = $2 LIMIT 1`,
      [wId, cleanEmail]
    );
    if (res.rows.length > 0) {
      return {
        available: false,
        role: 'staff',
        message: 'This email is already registered to a staff member in this institution.'
      };
    }
  } else if (exId) {
    const res = await queryDb(
      `SELECT id FROM website_staffs
       WHERE website_id = $1 AND LOWER(TRIM(email)) = $2 AND id != $3 LIMIT 1`,
      [wId, cleanEmail, exId]
    );
    if (res.rows.length > 0) {
      return {
        available: false,
        role: 'staff',
        message: 'This email is already registered to another staff member in this institution.'
      };
    }
  }

  if (excludeRole !== 'teacher') {
    const res = await queryDb(
      `SELECT id, name FROM website_teachers
       WHERE website_id = $1 AND LOWER(TRIM(email)) = $2 LIMIT 1`,
      [wId, cleanEmail]
    );
    if (res.rows.length > 0) {
      return {
        available: false,
        role: 'teacher',
        message: 'This email is already registered to a faculty / teacher in this institution.'
      };
    }
  } else if (exId) {
    const res = await queryDb(
      `SELECT id FROM website_teachers
       WHERE website_id = $1 AND LOWER(TRIM(email)) = $2 AND id != $3 LIMIT 1`,
      [wId, cleanEmail, exId]
    );
    if (res.rows.length > 0) {
      return {
        available: false,
        role: 'teacher',
        message: 'This email is already registered to another teacher in this institution.'
      };
    }
  }

  if (excludeRole !== 'officer') {
    const res = await queryDb(
      `SELECT id, name FROM website_officers
       WHERE website_id = $1 AND LOWER(TRIM(email)) = $2 LIMIT 1`,
      [wId, cleanEmail]
    );
    if (res.rows.length > 0) {
      return {
        available: false,
        role: 'officer',
        message: 'This email is already registered to an administrative officer in this institution.'
      };
    }
  } else if (exId) {
    const res = await queryDb(
      `SELECT id FROM website_officers
       WHERE website_id = $1 AND LOWER(TRIM(email)) = $2 AND id != $3 LIMIT 1`,
      [wId, cleanEmail, exId]
    );
    if (res.rows.length > 0) {
      return {
        available: false,
        role: 'officer',
        message: 'This email is already registered to another officer in this institution.'
      };
    }
  }

  if (excludeRole !== 'applicant') {
    let sql = `SELECT id, application_no, status, enrolled_student_id
               FROM website_admission_applicants
               WHERE website_id = $1 AND LOWER(TRIM(email)) = $2`;
    const params = [wId, cleanEmail];
    if (excludeRole === 'student' && exId) {
      sql += ` AND (enrolled_student_id IS NULL OR enrolled_student_id != $3)`;
      params.push(exId);
    }
    sql += ` LIMIT 1`;

    const res = await queryDb(sql, params);
    if (res.rows.length > 0) {
      return {
        available: false,
        role: 'applicant',
        message: 'This email is already registered to an admission applicant in this institution.'
      };
    }
  } else if (exId) {
    const res = await queryDb(
      `SELECT id FROM website_admission_applicants
       WHERE website_id = $1 AND LOWER(TRIM(email)) = $2 AND id != $3 LIMIT 1`,
      [wId, cleanEmail, exId]
    );
    if (res.rows.length > 0) {
      return {
        available: false,
        role: 'applicant',
        message: 'This email has already been submitted for another admission application in this institution.'
      };
    }
  }

  return { available: true };
}

export async function checkInstitutionPhoneAvailability(websiteId, phone, options = {}) {
  if (!phone || typeof phone !== 'string') {
    return { available: false, message: 'Valid phone number is required.' };
  }

  const cleanPhone = phone.trim();
  if (!cleanPhone) {
    return { available: false, message: 'Valid phone number is required.' };
  }

  const wId = parseInt(websiteId, 10);
  const { excludeRole = null, excludeId = null } = options;
  const exId = excludeId ? parseInt(excludeId, 10) : null;

  if (excludeRole !== 'staff') {
    const res = await queryDb(
      `SELECT id, name FROM website_staffs
       WHERE website_id = $1 AND TRIM(number) = $2 LIMIT 1`,
      [wId, cleanPhone]
    );
    if (res.rows.length > 0) {
      return {
        available: false,
        role: 'staff',
        message: 'This phone number is already registered to a staff member in this institution.'
      };
    }
  } else if (exId) {
    const res = await queryDb(
      `SELECT id FROM website_staffs
       WHERE website_id = $1 AND TRIM(number) = $2 AND id != $3 LIMIT 1`,
      [wId, cleanPhone, exId]
    );
    if (res.rows.length > 0) {
      return {
        available: false,
        role: 'staff',
        message: 'This phone number is already registered to another staff member in this institution.'
      };
    }
  }

  if (excludeRole !== 'teacher') {
    const res = await queryDb(
      `SELECT id, name FROM website_teachers
       WHERE website_id = $1 AND TRIM(number) = $2 LIMIT 1`,
      [wId, cleanPhone]
    );
    if (res.rows.length > 0) {
      return {
        available: false,
        role: 'teacher',
        message: 'This phone number is already registered to a faculty / teacher in this institution.'
      };
    }
  } else if (exId) {
    const res = await queryDb(
      `SELECT id FROM website_teachers
       WHERE website_id = $1 AND TRIM(number) = $2 AND id != $3 LIMIT 1`,
      [wId, cleanPhone, exId]
    );
    if (res.rows.length > 0) {
      return {
        available: false,
        role: 'teacher',
        message: 'This phone number is already registered to another teacher in this institution.'
      };
    }
  }

  if (excludeRole !== 'officer') {
    const res = await queryDb(
      `SELECT id, name FROM website_officers
       WHERE website_id = $1 AND TRIM(phone) = $2 LIMIT 1`,
      [wId, cleanPhone]
    );
    if (res.rows.length > 0) {
      return {
        available: false,
        role: 'officer',
        message: 'This phone number is already registered to an administrative officer in this institution.'
      };
    }
  } else if (exId) {
    const res = await queryDb(
      `SELECT id FROM website_officers
       WHERE website_id = $1 AND TRIM(phone) = $2 AND id != $3 LIMIT 1`,
      [wId, cleanPhone, exId]
    );
    if (res.rows.length > 0) {
      return {
        available: false,
        role: 'officer',
        message: 'This phone number is already registered to another officer in this institution.'
      };
    }
  }

  return { available: true };
}
