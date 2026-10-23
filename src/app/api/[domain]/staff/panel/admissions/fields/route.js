import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { verifyStaffPaymentAccess } from 'src/lib/database/paymentGateways.js';
import { DEFAULT_ADMISSION_FIELDS } from 'src/lib/constants/admissionFields.js';

/**
 * GET /api/[domain]/staff/panel/admissions/fields?admission_id=...
 * Staff endpoint to list all modular form fields configured for a circular or institution.
 */
export async function GET(request, context) {
  try {
    const auth = await verifyStaffPaymentAccess(request, context);
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    const admissionIdParam = searchParams.get('admission_id');
    const admId = admissionIdParam ? parseInt(admissionIdParam, 10) : null;

    let sql = `
      SELECT * FROM website_admission_form_fields
      WHERE website_id = $1
    `;
    const params = [auth.website.id];

    if (admId) {
      sql += ` AND (admission_id = $2 OR admission_id IS NULL)`;
      params.push(admId);
    }
    sql += ` ORDER BY sort_order ASC, id ASC`;

    const res = await queryDb(sql, params);
    const fields = res.rows.length > 0 ? res.rows : DEFAULT_ADMISSION_FIELDS;

    // Group fields by section for frontend tabbed organization
    const sections = {
      personal: [],
      guardian: [],
      address: [],
      academic: [],
      general: []
    };

    for (const f of fields) {
      const sec = f.section || 'personal';
      if (sections[sec]) {
        sections[sec].push(f);
      } else {
        if (!sections.general) sections.general = [];
        sections.general.push(f);
      }
    }

    return NextResponse.json({
      success: true,
      fields,
      sections,
      default_fields: DEFAULT_ADMISSION_FIELDS,
      count: res.rows.length,
      is_customized: res.rows.length > 0
    });
  } catch (error) {
    console.error('Error in GET /staff/panel/admissions/fields:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/[domain]/staff/panel/admissions/fields
 * Creates a new modular field or initializes defaults for a circular.
 */
export async function POST(request, context) {
  try {
    const auth = await verifyStaffPaymentAccess(request, context);
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const body = await request.json().catch(() => ({}));
    const {
      admission_id,
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
      section = 'general',
      is_shown_in_id_card = false,
      sort_order = 0,
      is_active = true
    } = body;

    const admId = admission_id ? parseInt(admission_id, 10) : null;

    // Bulk initialization from defaults or template
    if (action === 'initialize_defaults' || Array.isArray(bulkFields)) {
      const fieldsToInsert = Array.isArray(bulkFields) ? bulkFields : DEFAULT_ADMISSION_FIELDS;
      const inserted = [];

      for (let i = 0; i < fieldsToInsert.length; i++) {
        const f = fieldsToInsert[i];
        const res = await queryDb(`
          INSERT INTO website_admission_form_fields (
            website_id, admission_id, field_key, label, field_type,
            options, is_required, is_unique, validation_regex, placeholder,
            help_text, section, is_shown_in_id_card, sort_order, is_active
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
          RETURNING *
        `, [
          auth.website.id,
          admId,
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
          f.is_active !== undefined ? Boolean(f.is_active) : true
        ]);
        inserted.push(res.rows[0]);
      }

      return NextResponse.json({
        success: true,
        message: `Successfully initialized ${inserted.length} modular form fields.`,
        fields: inserted
      });
    }

    // Single field insertion
    if (!field_key?.trim() || !label?.trim()) {
      return NextResponse.json({ success: false, error: 'Field key and label are required.' }, { status: 400 });
    }

    const cleanKey = field_key.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');

    const res = await queryDb(`
      INSERT INTO website_admission_form_fields (
        website_id, admission_id, field_key, label, field_type,
        options, is_required, is_unique, validation_regex, placeholder,
        help_text, section, is_shown_in_id_card, sort_order, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
    `, [
      auth.website.id,
      admId,
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
      message: 'Modular admission form field created successfully.',
      field: res.rows[0]
    });
  } catch (error) {
    console.error('Error in POST /staff/panel/admissions/fields:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * PUT /api/[domain]/staff/panel/admissions/fields
 * Updates an existing modular field.
 */
export async function PUT(request, context) {
  try {
    const auth = await verifyStaffPaymentAccess(request, context);
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const body = await request.json().catch(() => ({}));
    const { id, label, field_type, options, is_required, is_unique, validation_regex, placeholder, help_text, section, is_shown_in_id_card, sort_order, is_active } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Field ID is required.' }, { status: 400 });
    }

    const res = await queryDb(`
      UPDATE website_admission_form_fields
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
      parseInt(id, 10),
      auth.website.id
    ]);

    if (res.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Field not found or unauthorized.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Field updated successfully.',
      field: res.rows[0]
    });
  } catch (error) {
    console.error('Error in PUT /staff/panel/admissions/fields:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * DELETE /api/[domain]/staff/panel/admissions/fields?id=...
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
      DELETE FROM website_admission_form_fields
      WHERE id = $1 AND website_id = $2
    `, [parseInt(id, 10), auth.website.id]);

    return NextResponse.json({
      success: true,
      message: 'Modular admission form field deleted successfully.'
    });
  } catch (error) {
    console.error('Error in DELETE /staff/panel/admissions/fields:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
