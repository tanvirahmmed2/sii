export interface AcademicSession {
  id: string;
  website_id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  created_at: string;
}

export interface AcademicClass {
  id: string;
  website_id: string;
  name: string;
  code?: string | null;
  numeric_value?: number | null;
  order_index?: number;
  created_at: string;
}

export interface AcademicSection {
  id: string;
  website_id: string;
  class_id: string;
  name: string;
  capacity?: number;
  room_number?: string | null;
  created_at: string;
}

export interface AcademicSubject {
  id: string;
  website_id: string;
  class_id: string;
  name: string;
  code?: string | null;
  type: 'theory' | 'practical' | 'combined' | 'optional';
  credit_hours?: number;
  pass_mark?: number;
  total_mark?: number;
  created_at: string;
}

export interface StudentProfile {
  id: string;
  website_id: string;
  admission_number: string;
  first_name: string;
  last_name: string;
  gender: 'male' | 'female' | 'other';
  dob?: string | null;
  blood_group?: string | null;
  religion?: string | null;
  phone?: string | null;
  email?: string | null;
  guardian_name?: string | null;
  guardian_phone?: string | null;
  current_class_id?: string | null;
  current_section_id?: string | null;
  roll_number?: string | null;
  status: 'active' | 'graduated' | 'transferred' | 'suspended' | 'dropped';
  created_at: string;
  updated_at: string;
}
