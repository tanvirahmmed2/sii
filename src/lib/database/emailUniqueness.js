import { queryDb } from './db.js';

/**
 * Checks if an email is already registered across any institutional role:
 * - Student (website_students)
 * - Applicant (website_admission_applicants)
 * - Staff (website_staffs)
 * - Teacher (website_teachers)
 * - Officer (website_officers)
 *
 * Rule: An email address must be globally unique per institution (website_id).
 * No student can apply for admission, and no same email can be shared across
 * staffs, teachers, officers, and applicants.
 *
 * @param {number|string} websiteId
 * @param {string} email
 * @param {Object} options
 * @param {'student'|'applicant'|'staff'|'teacher'|'officer'} [options.excludeRole] - Current entity role (if updating or self-enrolling)
 * @param {number|string} [options.excludeId] - ID of current record to exclude on updates
 * @returns {Promise<{ available: boolean, role?: string, message?: string }>}
 */
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

  // 1. Check website_students
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

  // 2. Check website_staffs
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

  // 3. Check website_teachers
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

  // 4. Check website_officers
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

  // 5. Check website_admission_applicants
  if (excludeRole !== 'applicant') {
    // If student is being enrolled from an applicant, exclude that applicant's record
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
