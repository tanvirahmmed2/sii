import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator.js';
import { getStaffSession, hasStaffModulePermission, isGeneralStaff } from 'src/lib/middleware/staff.js';
import { getOfficerSession } from 'src/lib/middleware/officer.js';
import { getTeacherSession } from 'src/lib/middleware/teacher.js';
import { getStudentSession } from 'src/lib/middleware/students.js';
import { query } from 'src/lib/database/db.js';

/**
 * Validates staff/officer access to manage classrooms (classes & sessions).
 * Strict Tenant Boundary. No developer bypass.
 */
export async function verifyStaffClassroomAccess(request, context, action = 'view') {
  const website = await resolveWebsiteFromRequest(request, context);
  if (!website) {
    return { error: 'Educational institution portal not found.', status: 404 };
  }

  // 1. Check Staff Session
  const staffSession = await getStaffSession(request);
  if (staffSession) {
    const staffWebsiteId =
      staffSession?.website_id ||
      staffSession?.websiteId ||
      staffSession?.staff?.websiteId ||
      staffSession?.staff?.website_id;

    if (staffWebsiteId && String(staffWebsiteId) !== String(website.id)) {
      return { error: 'Forbidden: Cross-tenant access denied.', status: 403 };
    }

    const generalStaff = await isGeneralStaff(request);
    const hasClassroomPerm =
      hasStaffModulePermission(staffSession, 'classrooms', action) ||
      hasStaffModulePermission(staffSession, 'classroom', action) ||
      hasStaffModulePermission(staffSession, 'classes', action) ||
      hasStaffModulePermission(staffSession, 'academic', action) ||
      hasStaffModulePermission(staffSession, 'sis', action);

    if (generalStaff || hasClassroomPerm) {
      const staffUser = staffSession.staff || staffSession.user || staffSession;
      return {
        website,
        actor: {
          type: 'staff',
          id: staffUser?.id || staffSession?.id,
          name: staffUser?.name || 'Staff Member',
          email: staffUser?.email || null,
          role: staffSession?.role || 'staff'
        },
        staffSession,
        allowed: true
      };
    }
  }

  // 2. Check Officer Session
  const officerSession = await getOfficerSession(request);
  if (officerSession && officerSession.officer) {
    const officer = officerSession.officer;
    if (officer.website_id && String(officer.website_id) !== String(website.id)) {
      return { error: 'Forbidden: Cross-tenant access denied.', status: 403 };
    }

    const dept = (officer.department || '').toLowerCase();
    const isAcademicOrAdmin =
      dept.includes('academic') ||
      dept.includes('admin') ||
      dept.includes('general') ||
      dept.includes('principal');

    if (isAcademicOrAdmin) {
      return {
        website,
        actor: {
          type: 'officer',
          id: officer.id,
          name: officer.name || 'Officer',
          email: officer.email,
          designation: officer.designation,
          department: officer.department
        },
        officerSession,
        allowed: true
      };
    }
  }

  return {
    error: `Forbidden: Insufficient privileges to ${action} classrooms. Staff or officer role required.`,
    status: staffSession || officerSession ? 403 : 401
  };
}

/**
 * Validates teacher access to classrooms, syllabus, assignments, lectures, notes.
 * Enforces tenant boundary and checks if teacher teaches the class.
 */
export async function verifyTeacherClassroomAccess(request, context, action = 'view', classroomId = null) {
  const website = await resolveWebsiteFromRequest(request, context);
  if (!website) {
    return { error: 'Educational institution portal not found.', status: 404 };
  }

  const teacherSession = await getTeacherSession(request);
  if (!teacherSession || !teacherSession.teacher) {
    return { error: 'Unauthorized: Teacher session required.', status: 401 };
  }

  const teacher = teacherSession.teacher;
  if (teacher.website_id && String(teacher.website_id) !== String(website.id)) {
    return { error: 'Forbidden: Cross-tenant access denied.', status: 403 };
  }

  if (classroomId) {
    const crRes = await query(
      `SELECT c.*, cls.name AS class_name, sess.name AS session_name
       FROM website_classrooms c
       LEFT JOIN website_classes cls ON cls.id = c.class_id
       LEFT JOIN website_sessions sess ON sess.id = c.session_id
       WHERE c.id = $1 AND c.website_id = $2
       LIMIT 1`,
      [classroomId, website.id]
    );

    if (crRes.rows.length === 0) {
      return { error: 'Classroom not found.', status: 404 };
    }

    const classroom = crRes.rows[0];

    // Check if teacher is assigned to this class
    const assignmentCheck = await query(
      `SELECT 
         (SELECT COUNT(*) FROM website_teacher_subjects WHERE website_id = $1 AND teacher_id = $2) AS total_subjects_assigned,
         (SELECT COUNT(*) FROM website_teacher_subjects WHERE website_id = $1 AND teacher_id = $2 AND class_id = $3) AS matching_subjects,
         (SELECT COUNT(*) FROM website_teacher_class_periods WHERE website_id = $1 AND teacher_id = $2 AND class_id = $3) AS matching_periods`,
      [website.id, teacher.id, classroom.class_id]
    );

    const row = assignmentCheck.rows[0];
    const totalAssigned = parseInt(row.total_subjects_assigned || '0', 10);
    const matchingSubjects = parseInt(row.matching_subjects || '0', 10);
    const matchingPeriods = parseInt(row.matching_periods || '0', 10);

    // If teacher has assigned subjects in the school, they must match this class (or period)
    if (totalAssigned > 0 && matchingSubjects === 0 && matchingPeriods === 0) {
      return {
        error: `Forbidden: You are not assigned to teach ${classroom.class_name || 'this class'}.`,
        status: 403
      };
    }

    return {
      website,
      teacher,
      classroom,
      allowed: true
    };
  }

  return {
    website,
    teacher,
    allowed: true
  };
}

/**
 * Validates student access to classrooms, syllabus, assignments, lectures, notes.
 * Enforces that student can only view their own class and session classrooms.
 */
export async function verifyStudentClassroomAccess(request, context, classroomId = null) {
  const website = await resolveWebsiteFromRequest(request, context);
  if (!website) {
    return { error: 'Educational institution portal not found.', status: 404 };
  }

  const studentSession = await getStudentSession(request);
  if (!studentSession) {
    return { error: 'Unauthorized: Student session required.', status: 401 };
  }

  const student = studentSession.student || studentSession;
  if (student.website_id && String(student.website_id) !== String(website.id)) {
    return { error: 'Forbidden: Cross-tenant access denied.', status: 403 };
  }

  if (classroomId) {
    const crRes = await query(
      `SELECT c.*, cls.name AS class_name, sess.name AS session_name
       FROM website_classrooms c
       LEFT JOIN website_classes cls ON cls.id = c.class_id
       LEFT JOIN website_sessions sess ON sess.id = c.session_id
       WHERE c.id = $1 AND c.website_id = $2
       LIMIT 1`,
      [classroomId, website.id]
    );

    if (crRes.rows.length === 0) {
      return { error: 'Classroom not found.', status: 404 };
    }

    const classroom = crRes.rows[0];

    // Check if student belongs to this class and session
    if (
      String(classroom.class_id) !== String(student.class_id) ||
      (classroom.session_id && student.session_id && String(classroom.session_id) !== String(student.session_id))
    ) {
      return {
        error: 'Forbidden: You can only view classrooms belonging to your own enrolled class and session.',
        status: 403
      };
    }

    return {
      website,
      student,
      classroom,
      allowed: true
    };
  }

  return {
    website,
    student,
    allowed: true
  };
}
