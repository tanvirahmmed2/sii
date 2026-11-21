export interface CreatorJwtPayload {
  id: string;
  email: string;
  role: 'creator' | 'superadmin' | 'admin';
  name?: string;
  iat?: number;
  exp?: number;
}

export interface StaffJwtPayload {
  id: string;
  website_id: string;
  email: string;
  role: 'admin' | 'teacher' | 'accountant' | 'librarian' | 'hostel_manager' | 'staff';
  name?: string;
  permissions?: string[];
  iat?: number;
  exp?: number;
}

export interface StudentJwtPayload {
  id: string;
  website_id: string;
  student_id: string;
  name?: string;
  phone?: string;
  role: 'student';
  class_id?: string;
  section_id?: string;
  iat?: number;
  exp?: number;
}

export interface AuthSession<T = Record<string, unknown>> {
  authenticated: boolean;
  user: T | null;
  error?: string | null;
}
