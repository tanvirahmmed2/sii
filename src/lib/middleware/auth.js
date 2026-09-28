import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { JWT_SECRET } from './secret';
import { query } from './db';

const DEFAULT_JWT_SECRET = JWT_SECRET || 'fallback_secret_for_dev_mode';


export async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}


export async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}


export function signJWT(payload) {
  return jwt.sign(payload, DEFAULT_JWT_SECRET, { expiresIn: '7d' });
}


export function verifyJWT(token) {
  try {
    return jwt.verify(token, DEFAULT_JWT_SECRET);
  } catch (error) {
    return null;
  }
}


export async function isAdmin() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('fit-admin')?.value;
    if (!token) return false;
    
    const decoded = verifyJWT(token);
    if (!decoded || !decoded.id) return false;

    // Direct database validation check
    const result = await query('SELECT id, is_active FROM admins WHERE id = $1', [decoded.id]);
    if (result.rows.length === 0) return false;

    const admin = result.rows[0];
    return !!admin.is_active;
  } catch (error) {
    console.error('Error verifying admin authorization:', error);
    return false;
  }
}

export async function getAdminUser() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('fit-admin')?.value;
    if (!token) return null;

    const decoded = verifyJWT(token);
    if (!decoded || !decoded.id) return null;

    const result = await query(
      'SELECT id, name, email, number, address, is_active, created_at FROM admins WHERE id = $1',
      [decoded.id]
    );
    if (result.rows.length === 0) return null;

    const admin = result.rows[0];
    if (admin.is_active) {
      return admin;
    }
    return null;
  } catch (error) {
    console.error('Error getting admin user:', error);
    return null;
  }
}



export async function isTeacher() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('fit-teacher')?.value;
    if (!token) return false;

    const decoded = verifyJWT(token);
    if (!decoded || !decoded.id) return false;

    // Direct database validation check
    const result = await query('SELECT id, is_active, is_registered FROM teachers WHERE id = $1', [decoded.id]);
    if (result.rows.length === 0) return false;

    const teacher = result.rows[0];
    return !!(teacher.is_active && teacher.is_registered);
  } catch (error) {
    console.error('Error verifying teacher authorization:', error);
    return false;
  }
}


export async function isStudent() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('fit-student')?.value;
    if (!token) return false;

    const decoded = verifyJWT(token);
    if (!decoded || !decoded.id) return false;

    // Direct database validation check
    const result = await query('SELECT id, is_active, is_registered FROM students WHERE id = $1', [decoded.id]);
    if (result.rows.length === 0) return false;

    const student = result.rows[0];
    return !!(student.is_active && student.is_registered);
  } catch (error) {
    console.error('Error verifying student authorization:', error);
    return false;
  }
}

export async function getTeacherUser() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('fit-teacher')?.value;
    if (!token) return null;

    const decoded = verifyJWT(token);
    if (!decoded || !decoded.id) return null;

    const result = await query('SELECT id, name, email, is_active, is_registered FROM teachers WHERE id = $1', [decoded.id]);
    if (result.rows.length === 0) return null;

    const teacher = result.rows[0];
    if (teacher.is_active && teacher.is_registered) {
      return teacher;
    }
    return null;
  } catch (error) {
    return null;
  }
}

export async function getStudentUser() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('fit-student')?.value;
    if (!token) return null;

    const decoded = verifyJWT(token);
    if (!decoded || !decoded.id) return null;

    const result = await query('SELECT id, name, email, registration_number, is_active, is_registered FROM students WHERE id = $1', [decoded.id]);
    if (result.rows.length === 0) return null;

    const student = result.rows[0];
    if (student.is_active && student.is_registered) {
      return student;
    }
    return null;
  } catch (error) {
    return null;
  }
}

export async function isStaff() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('fit-staff')?.value;
    if (!token) return false;

    const decoded = verifyJWT(token);
    if (!decoded || !decoded.id) return false;

    const result = await query('SELECT id, role, is_active, is_registered FROM staffs WHERE id = $1', [decoded.id]);
    if (result.rows.length === 0) return false;

    const staff = result.rows[0];
    return !!(staff.is_active && staff.is_registered);
  } catch (error) {
    console.error('Error verifying staff authorization:', error);
    return false;
  }
}

export async function getStaffUser() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('fit-staff')?.value;
    if (!token) return null;

    const decoded = verifyJWT(token);
    if (!decoded || !decoded.id) return null;

    const result = await query('SELECT id, name, email, role, is_active, is_registered FROM staffs WHERE id = $1', [decoded.id]);
    if (result.rows.length === 0) return null;

    const staff = result.rows[0];
    if (staff.is_active && staff.is_registered) {
      return staff;
    }
    return null;
  } catch (error) {
    return null;
  }
}

export async function isCashier() {
  const staff = await getStaffUser();
  return staff?.role === 'cashier';
}

export async function isRegister() {
  const staff = await getStaffUser();
  return staff?.role === 'registrar';
}

export async function isGeneralStaff() {
  const staff = await getStaffUser();
  return staff?.role === 'staff';
}

export async function isStaffRole() {
  const staff = await getStaffUser();
  return staff?.role === 'staff';
}



