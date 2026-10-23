import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { verifyStaffPaymentAccess } from 'src/lib/database/paymentGateways.js';

export const DEFAULT_STUDENT_FIELDS = [
  { field_key: 'name', label: 'Student Full Name', field_type: 'text', is_required: true, placeholder: 'e.g. Tanvir Ahmed', help_text: 'Legal student name', section: 'personal', sort_order: 1, is_active: true },
  { field_key: 'number', label: 'Contact Phone Number', field_type: 'text', is_required: true, validation_regex: '^01[3-9]\\d{8}$', placeholder: '017XXXXXXXX', help_text: '11-digit mobile number', section: 'personal', sort_order: 2, is_active: true },
  { field_key: 'gender', label: 'Gender', field_type: 'select', options: ['Male', 'Female', 'Other'], is_required: true, section: 'personal', sort_order: 3, is_active: true },
  { field_key: 'date_of_birth', label: 'Date of Birth', field_type: 'date', is_required: true, section: 'personal', sort_order: 4, is_active: true },
  { field_key: 'blood_group', label: 'Blood Group', field_type: 'select', options: ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'], is_required: false, section: 'personal', sort_order: 5, is_active: true },
  { field_key: 'religion', label: 'Religion', field_type: 'select', options: ['Islam', 'Hinduism', 'Christianity', 'Buddhism', 'Other'], is_required: false, section: 'personal', sort_order: 6, is_active: true },
  { field_key: 'father_name', label: "Father's Full Name", field_type: 'text', is_required: true, placeholder: "Father's name", section: 'guardian', sort_order: 7, is_active: true },
  { field_key: 'father_phone', label: "Father's Contact Phone", field_type: 'text', is_required: false, validation_regex: '^01[3-9]\\d{8}$', placeholder: '01XXXXXXXXX', section: 'guardian', sort_order: 8, is_active: true },
  { field_key: 'father_nid', label: "Father's NID / Smart Card", field_type: 'text', is_required: false, section: 'guardian', sort_order: 9, is_active: true },
  { field_key: 'mother_name', label: "Mother's Full Name", field_type: 'text', is_required: true, placeholder: "Mother's name", section: 'guardian', sort_order: 10, is_active: true },
  { field_key: 'mother_phone', label: "Mother's Contact Phone", field_type: 'text', is_required: false, validation_regex: '^01[3-9]\\d{8}$', placeholder: '01XXXXXXXXX', section: 'guardian', sort_order: 11, is_active: true },
  { field_key: 'guardian_name', label: 'Emergency Guardian Name', field_type: 'text', is_required: false, section: 'guardian', sort_order: 12, is_active: true },
  { field_key: 'guardian_phone', label: 'Emergency Guardian Phone', field_type: 'text', is_required: false, validation_regex: '^01[3-9]\\d{8}$', section: 'guardian', sort_order: 13, is_active: true },
  { field_key: 'present_address', label: 'Present Address', field_type: 'textarea', is_required: true, placeholder: 'Village/Road, Upazila, District', section: 'address', sort_order: 14, is_active: true },
  { field_key: 'permanent_address', label: 'Permanent Address', field_type: 'textarea', is_required: false, placeholder: 'Permanent ancestral home address', section: 'address', sort_order: 15, is_active: true }
];

/**
 * GET /api/[domain]/staff/panel/students/fields
 * List modular fields configured for student info, guardians & address.
 */
export async function GET(request, context) {
  try {
    const auth = await verifyStaffPaymentAccess(request, context);
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    let res = await queryDb(`
      SELECT * FROM website_student_form_fields
      WHERE website_id = $1
      ORDER BY sort_order ASC, id ASC
    `, [auth.website.id]);

    if (res.rows.length === 0) {
      for (let i = 0; i < DEFAULT_STUDENT_FIELDS.length; i++) {
        const f = DEFAULT_STUDENT_FIELDS[i];
        try {
          await queryDb(`
            INSERT INTO website_student_form_fields (
              website_id, field_key, label, field_type, options, is_required,
              is_unique, validation_regex, placeholder, help_text, section,
              is_shown_in_id_card, sort_order, is_active
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            ON CONFLICT (website_id, field_key) DO NOTHING
          `, [
            auth.website.id,
            f.field_key.trim(),
            f.label.trim(),
            f.field_type || 'text',
            JSON.stringify(f.options || []),
            Boolean(f.is_required),
            Boolean(f.is_unique),
            f.validation_regex || null,
            f.placeholder || '',
            f.help_text || '',
            f.section || 'general',
            Boolean(f.is_shown_in_id_card),
            f.sort_order !== undefined ? f.sort_order : i + 1,
            Boolean(f.is_active !== false)
          ]);
        } catch {
          // ignore
        }
      }

      res = await queryDb(`
        SELECT * FROM website_student_form_fields
        WHERE website_id = $1
        ORDER BY sort_order ASC, id ASC
      `, [auth.website.id]);
    }

    const fields = res.rows.length > 0 ? res.rows : DEFAULT_STUDENT_FIELDS;

    // Group fields by section for frontend tabbed organization
    const sections = {
      personal: [],
      guardian: [],
      address: [],
      other: []
    };

    for (const f of fields) {
      const sec = f.section || 'personal';
      if (sections[sec]) {
        sections[sec].push(f);
      } else {
        if (!sections.other) sections.other = [];
        sections.other.push(f);
      }
    }

    return NextResponse.json({
      success: true,
      fields,
      sections,
      default_fields: DEFAULT_STUDENT_FIELDS,
      count: res.rows.length,
      is_customized: res.rows.length > 0
    });
  } catch (error) {
    console.error('Error in GET /staff/panel/students/fields:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/[domain]/staff/panel/students/fields
 * Create modular field or bulk initialize defaults.
 */
export async function POST(request, context) {
  try {
    const auth = await verifyStaffPaymentAccess(request, context);
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const body = await request.json().catch(() => ({}));
    const {
      action,
      fields: bulkFields,
      field_key,
      label,
      field_type = 'text',
      options = [],
      is_required = false,
      is_unique = false,
      validation_regex = null,
      placeholder = '',
      help_text = '',
      section = 'personal',
      is_shown_in_id_card = false,
      sort_order = 0,
      is_active = true
    } = body;

    // Bulk initialization from defaults
    if (action === 'initialize_defaults' || Array.isArray(bulkFields)) {
      const fieldsToInsert = Array.isArray(bulkFields) ? bulkFields : DEFAULT_STUDENT_FIELDS;
      const inserted = [];

      for (let i = 0; i < fieldsToInsert.length; i++) {
        const f = fieldsToInsert[i];
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
            section = EXCLUDED.section,
            placeholder = EXCLUDED.placeholder,
            help_text = EXCLUDED.help_text,
            is_active = EXCLUDED.is_active,
            updated_at = CURRENT_TIMESTAMP
          RETURNING *
        `, [
          auth.website.id,
          f.field_key.trim(),
          f.label.trim(),
          f.field_type || 'text',
          JSON.stringify(f.options || []),
          Boolean(f.is_required),
          Boolean(f.is_unique),
          f.validation_regex || null,
          f.placeholder || '',
          f.help_text || '',
          f.section || 'personal',
          Boolean(f.is_shown_in_id_card),
          f.sort_order !== undefined ? f.sort_order : i + 1,
          f.is_active !== undefined ? Boolean(f.is_active) : true
        ]);
        inserted.push(res.rows[0]);
      }

      return NextResponse.json({
        success: true,
        message: `Successfully initialized ${inserted.length} student modular form fields.`,
        fields: inserted
      });
    }

    // Single field insertion
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
      section || 'personal',
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
 * PUT /api/[domain]/staff/panel/students/fields
 * Update existing field attributes or toggle required status.
 */
export async function PUT(request, context) {
  try {
    const auth = await verifyStaffPaymentAccess(request, context);
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const body = await request.json().catch(() => ({}));
    const { id, field_key, label, field_type, options, is_required, is_unique, validation_regex, placeholder, help_text, section, is_shown_in_id_card, sort_order, is_active } = body;

    const parsedId = id && id !== 'undefined' && id !== 'null' && !isNaN(parseInt(id, 10))
      ? parseInt(id, 10)
      : null;

    if (!parsedId && (!field_key || field_key === 'undefined' || field_key === 'null')) {
      return NextResponse.json({ success: false, error: 'Valid Field ID or field_key is required.' }, { status: 400 });
    }

    let res;
    if (parsedId) {
      res = await queryDb(`
        UPDATE website_student_form_fields
        SET label = COALESCE($1, label),
            field_type = COALESCE($2, field_type),
            options = COALESCE($3, options),
            is_required = COALESCE($4, is_required),
            is_unique = COALESCE($5, is_unique),
            validation_regex = $6,
            placeholder = COALESCE($7, placeholder),
            help_text = COALESCE($8, help_text),
            section = COALESCE($9, section),
            is_shown_in_id_card = COALESCE($10, is_shown_in_id_card),
            sort_order = COALESCE($11, sort_order),
            is_active = COALESCE($12, is_active),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $13 AND website_id = $14
        RETURNING *
      `, [
        label?.trim() || null,
        field_type || null,
        options ? JSON.stringify(options) : null,
        is_required !== undefined ? Boolean(is_required) : null,
        is_unique !== undefined ? Boolean(is_unique) : null,
        validation_regex !== undefined ? validation_regex : null,
        placeholder !== undefined ? placeholder : null,
        help_text !== undefined ? help_text : null,
        section || null,
        is_shown_in_id_card !== undefined ? Boolean(is_shown_in_id_card) : null,
        sort_order !== undefined ? parseInt(sort_order, 10) : null,
        is_active !== undefined ? Boolean(is_active) : null,
        parsedId,
        auth.website.id
      ]);
    } else {
      res = await queryDb(`
        UPDATE website_student_form_fields
        SET label = COALESCE($1, label),
            field_type = COALESCE($2, field_type),
            options = COALESCE($3, options),
            is_required = COALESCE($4, is_required),
            is_unique = COALESCE($5, is_unique),
            validation_regex = $6,
            placeholder = COALESCE($7, placeholder),
            help_text = COALESCE($8, help_text),
            section = COALESCE($9, section),
            is_shown_in_id_card = COALESCE($10, is_shown_in_id_card),
            sort_order = COALESCE($11, sort_order),
            is_active = COALESCE($12, is_active),
            updated_at = CURRENT_TIMESTAMP
        WHERE field_key = $13 AND website_id = $14
        RETURNING *
      `, [
        label?.trim() || null,
        field_type || null,
        options ? JSON.stringify(options) : null,
        is_required !== undefined ? Boolean(is_required) : null,
        is_unique !== undefined ? Boolean(is_unique) : null,
        validation_regex !== undefined ? validation_regex : null,
        placeholder !== undefined ? placeholder : null,
        help_text !== undefined ? help_text : null,
        section || null,
        is_shown_in_id_card !== undefined ? Boolean(is_shown_in_id_card) : null,
        sort_order !== undefined ? parseInt(sort_order, 10) : null,
        is_active !== undefined ? Boolean(is_active) : null,
        field_key.trim(),
        auth.website.id
      ]);
    }

    if (res.rows.length === 0) {
      const targetKey = (field_key || label || 'custom_col')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');

      const insertRes = await queryDb(`
        INSERT INTO website_student_form_fields (
          website_id, field_key, label, field_type, options, is_required,
          is_unique, validation_regex, placeholder, help_text, section,
          is_shown_in_id_card, sort_order, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        ON CONFLICT (website_id, field_key) DO UPDATE
        SET is_required = EXCLUDED.is_required,
            is_active = EXCLUDED.is_active,
            updated_at = CURRENT_TIMESTAMP
        RETURNING *
      `, [
        auth.website.id,
        targetKey,
        label?.trim() || targetKey,
        field_type || 'text',
        JSON.stringify(options || []),
        is_required !== undefined ? Boolean(is_required) : false,
        is_unique !== undefined ? Boolean(is_unique) : false,
        validation_regex || null,
        placeholder || '',
        help_text || '',
        section || 'general',
        Boolean(is_shown_in_id_card),
        sort_order !== undefined ? parseInt(sort_order, 10) : 0,
        is_active !== undefined ? Boolean(is_active) : true
      ]);

      return NextResponse.json({
        success: true,
        message: 'Field updated and saved successfully.',
        field: insertRes.rows[0]
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Field updated successfully.',
      field: res.rows[0]
    });
  } catch (error) {
    console.error('Error in PUT /staff/panel/students/fields:', error);
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
    const fieldKey = searchParams.get('field_key');

    const parsedId = id && id !== 'undefined' && id !== 'null' && !isNaN(parseInt(id, 10))
      ? parseInt(id, 10)
      : null;

    if (parsedId) {
      await queryDb(`
        DELETE FROM website_student_form_fields
        WHERE id = $1 AND website_id = $2
      `, [parsedId, auth.website.id]);
    } else if (fieldKey && fieldKey !== 'undefined' && fieldKey !== 'null') {
      await queryDb(`
        DELETE FROM website_student_form_fields
        WHERE field_key = $1 AND website_id = $2
      `, [fieldKey.trim(), auth.website.id]);
    } else {
      return NextResponse.json({
        success: true,
        message: 'Field removed successfully.'
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Student modular form field deleted successfully.'
    });
  } catch (error) {
    console.error('Error in DELETE /staff/panel/students/fields:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

