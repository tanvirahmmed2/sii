import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator.js';

export const DEFAULT_ADMISSION_FIELDS = [
  {
    field_key: 'applicant_name',
    label: 'Applicant Full Name',
    field_type: 'text',
    options: [],
    is_required: true,
    is_unique: false,
    validation_regex: null,
    placeholder: 'e.g. Tanvir Ahmed',
    help_text: 'Legal name as per birth certificate or prior transcript',
    section: 'personal',
    is_shown_in_id_card: true,
    sort_order: 1,
    is_active: true
  },
  {
    field_key: 'phone',
    label: 'Mobile Contact Number',
    field_type: 'text',
    options: [],
    is_required: true,
    is_unique: false,
    validation_regex: '^01[3-9]\\d{8}$',
    placeholder: '017XXXXXXXX',
    help_text: '11-digit Bangladeshi mobile number for SMS alerts',
    section: 'personal',
    is_shown_in_id_card: false,
    sort_order: 2,
    is_active: true
  },
  {
    field_key: 'gender',
    label: 'Gender',
    field_type: 'select',
    options: ['Male', 'Female', 'Other'],
    is_required: true,
    is_unique: false,
    validation_regex: null,
    placeholder: 'Select gender',
    help_text: null,
    section: 'personal',
    is_shown_in_id_card: false,
    sort_order: 3,
    is_active: true
  },
  {
    field_key: 'date_of_birth',
    label: 'Date of Birth',
    field_type: 'date',
    options: [],
    is_required: true,
    is_unique: false,
    validation_regex: null,
    placeholder: 'YYYY-MM-DD',
    help_text: null,
    section: 'personal',
    is_shown_in_id_card: false,
    sort_order: 4,
    is_active: true
  },
  {
    field_key: 'blood_group',
    label: 'Blood Group',
    field_type: 'select',
    options: ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'],
    is_required: false,
    is_unique: false,
    validation_regex: null,
    placeholder: 'Select blood group',
    help_text: null,
    section: 'personal',
    is_shown_in_id_card: true,
    sort_order: 5,
    is_active: true
  },
  {
    field_key: 'father_name',
    label: "Father's Full Name",
    field_type: 'text',
    options: [],
    is_required: true,
    is_unique: false,
    validation_regex: null,
    placeholder: "Father's legal name",
    help_text: null,
    section: 'guardian',
    is_shown_in_id_card: false,
    sort_order: 6,
    is_active: true
  },
  {
    field_key: 'father_phone',
    label: "Father's Mobile Phone",
    field_type: 'text',
    options: [],
    is_required: false,
    is_unique: false,
    validation_regex: '^01[3-9]\\d{8}$',
    placeholder: '01XXXXXXXXX',
    help_text: null,
    section: 'guardian',
    is_shown_in_id_card: false,
    sort_order: 7,
    is_active: true
  },
  {
    field_key: 'father_occupation',
    label: "Father's Occupation",
    field_type: 'text',
    options: [],
    is_required: false,
    is_unique: false,
    validation_regex: null,
    placeholder: 'e.g. Teacher, Engineer, Businessman',
    help_text: null,
    section: 'guardian',
    is_shown_in_id_card: false,
    sort_order: 8,
    is_active: true
  },
  {
    field_key: 'mother_name',
    label: "Mother's Full Name",
    field_type: 'text',
    options: [],
    is_required: true,
    is_unique: false,
    validation_regex: null,
    placeholder: "Mother's legal name",
    help_text: null,
    section: 'guardian',
    is_shown_in_id_card: false,
    sort_order: 9,
    is_active: true
  },
  {
    field_key: 'guardian_name',
    label: 'Legal Guardian Name',
    field_type: 'text',
    options: [],
    is_required: false,
    is_unique: false,
    validation_regex: null,
    placeholder: 'If different from parents',
    help_text: null,
    section: 'guardian',
    is_shown_in_id_card: false,
    sort_order: 10,
    is_active: true
  },
  {
    field_key: 'guardian_phone',
    label: 'Guardian Phone',
    field_type: 'text',
    options: [],
    is_required: false,
    is_unique: false,
    validation_regex: '^01[3-9]\\d{8}$',
    placeholder: '01XXXXXXXXX',
    help_text: null,
    section: 'guardian',
    is_shown_in_id_card: false,
    sort_order: 11,
    is_active: true
  },
  {
    field_key: 'present_address',
    label: 'Present Address',
    field_type: 'textarea',
    options: [],
    is_required: true,
    is_unique: false,
    validation_regex: null,
    placeholder: 'House / Village, Road, Upazila, District',
    help_text: 'Current residential address for correspondence',
    section: 'address',
    is_shown_in_id_card: false,
    sort_order: 12,
    is_active: true
  },
  {
    field_key: 'permanent_address',
    label: 'Permanent Address',
    field_type: 'textarea',
    options: [],
    is_required: false,
    is_unique: false,
    validation_regex: null,
    placeholder: 'Permanent ancestral home address',
    help_text: null,
    section: 'address',
    is_shown_in_id_card: false,
    sort_order: 13,
    is_active: true
  },
  {
    field_key: 'previous_school',
    label: 'Previous School / Institution',
    field_type: 'text',
    options: [],
    is_required: false,
    is_unique: false,
    validation_regex: null,
    placeholder: 'Name of the last attended school',
    help_text: null,
    section: 'academic',
    is_shown_in_id_card: false,
    sort_order: 14,
    is_active: true
  },
  {
    field_key: 'previous_gpa',
    label: 'Previous GPA / Grade',
    field_type: 'number',
    options: [],
    is_required: false,
    is_unique: false,
    validation_regex: null,
    placeholder: 'e.g. 5.00',
    help_text: 'Grade point average from prior academic certificate',
    section: 'academic',
    is_shown_in_id_card: false,
    sort_order: 15,
    is_active: true
  }
];

/**
 * GET /api/[domain]/admissions/fields?admission_id=...
 * Public endpoint to fetch active modular fields assigned to this institution / circular.
 * Primary source of truth is website_student_form_fields (custom columns configured by staff for students table).
 */
export async function GET(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json({ success: false, error: 'Institution portal not found.' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const admissionIdParam = searchParams.get('admission_id') || searchParams.get('circular_id');
    const admId = admissionIdParam ? parseInt(admissionIdParam, 10) : null;

    // 1. Fetch custom columns configured for the student table (master blueprint)
    const stuFieldsRes = await queryDb(`
      SELECT * FROM website_student_form_fields
      WHERE website_id = $1 AND is_active = TRUE
      ORDER BY sort_order ASC, id ASC
    `, [website.id]);

    let fields = [];

    if (stuFieldsRes.rows.length > 0) {
      fields = stuFieldsRes.rows;

      // Also check if any circular-specific fields exist in website_admission_form_fields
      if (admId) {
        const admFieldsRes = await queryDb(`
          SELECT * FROM website_admission_form_fields
          WHERE website_id = $1 AND admission_id = $2 AND is_active = TRUE
          ORDER BY sort_order ASC, id ASC
        `, [website.id, admId]);

        const existingKeys = new Set(fields.map((f) => f.field_key));
        for (const af of admFieldsRes.rows) {
          if (!existingKeys.has(af.field_key)) {
            fields.push(af);
            existingKeys.add(af.field_key);
          }
        }
      }
    } else {
      // Check website_admission_form_fields
      let admFieldsRes;
      if (admId) {
        admFieldsRes = await queryDb(`
          SELECT * FROM website_admission_form_fields
          WHERE website_id = $1 AND (admission_id = $2 OR admission_id IS NULL) AND is_active = TRUE
          ORDER BY sort_order ASC, id ASC
        `, [website.id, admId]);
      } else {
        admFieldsRes = await queryDb(`
          SELECT * FROM website_admission_form_fields
          WHERE website_id = $1 AND is_active = TRUE
          ORDER BY sort_order ASC, id ASC
        `, [website.id]);
      }

      fields = admFieldsRes.rows.length > 0 ? admFieldsRes.rows : DEFAULT_ADMISSION_FIELDS;
    }

    // Group fields by section for seamless client rendering
    const sections = {};
    for (const f of fields) {
      const sec = f.section || 'general';
      if (!sections[sec]) sections[sec] = [];
      sections[sec].push(f);
    }

    return NextResponse.json({
      success: true,
      fields,
      sections,
      is_customized: stuFieldsRes.rows.length > 0 || fields !== DEFAULT_ADMISSION_FIELDS
    });
  } catch (error) {
    console.error('Error fetching admission form fields:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

