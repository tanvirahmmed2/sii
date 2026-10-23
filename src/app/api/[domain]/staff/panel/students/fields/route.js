import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { verifyStaffPaymentAccess } from 'src/lib/database/paymentGateways.js';

export const DEFAULT_STUDENT_FIELDS = [
  { field_key: 'name', label: 'Student Full Name', field_type: 'text', is_required: true, section: 'personal', sort_order: 1 },
  { field_key: 'number', label: 'Contact Phone Number', field_type: 'text', is_required: true, validation_regex: '^01[3-9]\\d{8}$', section: 'personal', sort_order: 2 },
  { field_key: 'gender', label: 'Gender', field_type: 'select', options: ['Male', 'Female', 'Other'], is_required: true, section: 'personal', sort_order: 3 },
  { field_key: 'date_of_birth', label: 'Date of Birth', field_type: 'date', is_required: true, section: 'personal', sort_order: 4 },
  { field_key: 'blood_group', label: 'Blood Group', field_type: 'select', options: ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'], is_required: false, section: 'personal', sort_order: 5 },
  { field_key: 'religion', label: 'Religion', field_type: 'select', options: ['Islam', 'Hinduism', 'Christianity', 'Buddhism', 'Other'], is_required: false, section: 'personal', sort_order: 6 },
  { field_key: 'father_name', label: "Father's Full Name", field_type: 'text', is_required: true, section: 'guardian', sort_order: 7 },
  { field_key: 'father_phone', label: "Father's Contact Phone", field_type: 'text', is_required: false, validation_regex: '^01[3-9]\\d{8}$', section: 'guardian', sort_order: 8 },
  { field_key: 'father_nid', label: "Father's NID / Smart Card", field_type: 'text', is_required: false, section: 'guardian', sort_order: 9 },
  { field_key: 'mother_name', label: "Mother's Full Name", field_type: 'text', is_required: true, section: 'guardian', sort_order: 10 },
  { field_key: 'mother_phone', label: "Mother's Contact Phone", field_type: 'text', is_required: false, validation_regex: '^01[3-9]\\d{8}$', section: 'guardian', sort_order: 11 },
  { field_key: 'guardian_name', label: 'Emergency Guardian Name', field_type: 'text', is_required: false, section: 'guardian', sort_order: 12 },
  { field_key: 'guardian_phone', label: 'Emergency Guardian Phone', field_type: 'text', is_required: false, validation_regex: '^01[3-9]\\d{8}$', section: 'guardian', sort_order: 13 },
  { field_key: 'present_address', label: 'Present Address', field_type: 'textarea', is_required: true, section: 'address', sort_order: 14 },
  { field_key: 'permanent_address', label: 'Permanent Address', field_type: 'textarea', is_required: false, section: 'address', sort_order: 15 }
];

/**
 * GET /api/[domain]/staff/panel/students/fields
 * List modular fields configured for student info & guardians.
 */
export async function GET(request, context) {
  try {
    const auth = await verifyStaffPaymentAccess(request, context);
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const res = await queryDb(`
      SELECT * FROM website_student_form_fields
      WHERE website_id = $1
      ORDER BY sort_order ASC, id ASC
    `, [auth.website.id]);

    const fields = res.rows.length > 0 ? res.rows : DEFAULT_STUDENT_FIELDS;

    return NextResponse.json({
      success: true,
      fields,
      default_fields: DEFAULT_STUDENT_FIELDS,
      count: res.rows.length
    });
  } catch (error) {
    console.error('Error in GET /staff/panel/students/fields:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/[domain]/staff/panel/students/fields
 * Create modular field for student info or guardians.
 */
export async function POST(request, context) {
  try {
    const auth = await verifyStaffPaymentAccess(request, context);
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const body = await request.json().catch(() => ({}));
    const {
      field_key,
      label,
      field_type = 'text',
      options = [],
      is_required = false,
      is_unique = false,
      validation_regex = null,
      placeholder = '',
      help_text = '',
      section = 'general',
      is_shown_in_id_card = false,
      sort_order = 0,
      is_active = true
    } = body;

    if (!field_key?.trim() || !label?.trim()) {
      return NextResponse.json({ success: false, error: 'Field key and label are required.' }, { status: 400 });
    }

    const cleanKey = field_key.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');

    const res = await queryDb(`
      INSERT INTO website_student_form_fields (
        website_id, field_key, label, field_type,
        options, is_required, is_unique, validation_regex, placeholder,
        help_text, section, is_shown_in_id_card, sort_order, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      ON CONFLICT (website_id, field_key) DO UPDATE SET
        label = EXCLUDED.label,
        field_type = EXCLUDED.field_type,
        options = EXCLUDED.options,
        is_required = EXCLUDED.is_required,
        is_unique = EXCLUDED.is_unique,
        validation_regex = EXCLUDED.validation_regex,
        placeholder = EXCLUDED.placeholder,
        help_text = EXCLUDED.help_text,
        section = EXCLUDED.section,
        is_shown_in_id_card = EXCLUDED.is_shown_in_id_card,
        sort_order = EXCLUDED.sort_order,
        is_active = EXCLUDED.is_active,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `, [
      auth.website.id,
      cleanKey,
      label.trim(),
      field_type,
      JSON.stringify(options || []),
      Boolean(is_required),
      Boolean(is_unique),
      validation_regex || null,
      placeholder || '',
      help_text || '',
      section || 'general',
      Boolean(is_shown_in_id_card),
      parseInt(sort_order, 10) || 0,
      Boolean(is_active)
    ]);

    return NextResponse.json({
      success: true,
      message: 'Student modular form field saved successfully.',
      field: res.rows[0]
    });
  } catch (error) {
    console.error('Error in POST /staff/panel/students/fields:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * DELETE /api/[domain]/staff/panel/students/fields?id=...
 */
export async function DELETE(request, context) {
  try {
    const auth = await verifyStaffPaymentAccess(request, context);
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Field ID is required.' }, { status: 400 });
    }

    await queryDb(`
      DELETE FROM website_student_form_fields
      WHERE id = $1 AND website_id = $2
    `, [parseInt(id, 10), auth.website.id]);

    return NextResponse.json({
      success: true,
      message: 'Student modular form field deleted successfully.'
    });
  } catch (error) {
    console.error('Error in DELETE /staff/panel/students/fields:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
