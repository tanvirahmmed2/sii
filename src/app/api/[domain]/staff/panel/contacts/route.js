import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator.js';
import { getStaffSession, isGeneralStaff } from 'src/lib/middleware/staff.js';

async function verifyContactsStaffAccess(request, context) {
  const website = await resolveWebsiteFromRequest(request, context);
  if (!website) {
    return { error: 'Educational institution portal not found.', status: 404 };
  }

  const staffSession = await getStaffSession(request);
  if (!staffSession) {
    return { error: 'Unauthorized: Staff credentials required.', status: 401 };
  }

  const staffWebsiteId =
    staffSession?.website_id ||
    staffSession?.websiteId ||
    staffSession?.staff?.websiteId ||
    staffSession?.staff?.website_id;

  if (staffWebsiteId && String(staffWebsiteId) !== String(website.id)) {
    return { error: 'Forbidden: Cross-tenant access denied.', status: 403 };
  }

  return { website, staffSession, allowed: true };
}

// GET: List contacts with filters and stats
export async function GET(request, context) {
  try {
    const auth = await verifyContactsStaffAccess(request, context);
    if (!auth.allowed) {
      return NextResponse.json({ success: false, message: auth.error }, { status: auth.status });
    }

    const { website } = auth;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'all';
    const starredOnly = searchParams.get('starred') === 'true';
    const search = searchParams.get('search')?.trim() || '';

    let whereConditions = [`wc.website_id = $1`];
    const params = [website.id];

    if (status && status !== 'all') {
      params.push(status);
      whereConditions.push(`wc.status = $${params.length}`);
    }

    if (starredOnly) {
      whereConditions.push(`wc.is_starred = TRUE`);
    }

    if (search) {
      params.push(`%${search}%`);
      whereConditions.push(`(
        wc.name ILIKE $${params.length} OR 
        wc.email ILIKE $${params.length} OR 
        wc.phone ILIKE $${params.length} OR 
        wc.subject ILIKE $${params.length} OR 
        wc.message ILIKE $${params.length}
      )`);
    }

    const query = `
      SELECT 
        wc.id,
        wc.name,
        wc.email,
        wc.phone,
        wc.subject,
        wc.message,
        wc.status,
        wc.is_starred,
        wc.created_at,
        wc.updated_at,
        COUNT(wcr.id)::int AS replies_count,
        MAX(wcr.created_at) AS last_replied_at
      FROM website_contacts wc
      LEFT JOIN website_contact_replies wcr ON wcr.contact_id = wc.id
      WHERE ${whereConditions.join(' AND ')}
      GROUP BY wc.id
      ORDER BY wc.created_at DESC
      LIMIT 200
    `;

    const result = await queryDb(query, params);

    // Summary statistics
    const statsRes = await queryDb(
      `SELECT 
        COUNT(*)::int AS total_count,
        COUNT(CASE WHEN status = 'new' THEN 1 END)::int AS new_count,
        COUNT(CASE WHEN status = 'read' THEN 1 END)::int AS read_count,
        COUNT(CASE WHEN status = 'replied' THEN 1 END)::int AS replied_count,
        COUNT(CASE WHEN status = 'closed' THEN 1 END)::int AS closed_count,
        COUNT(CASE WHEN is_starred = TRUE THEN 1 END)::int AS starred_count
       FROM website_contacts
       WHERE website_id = $1`,
      [website.id]
    );

    return NextResponse.json({
      success: true,
      contacts: result.rows,
      stats: statsRes.rows[0] || {},
    });
  } catch (error) {
    console.error('Error fetching contacts:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch contact inquiries.' }, { status: 500 });
  }
}

// POST: Create a contact inquiry (manual entry or internal logging)
export async function POST(request, context) {
  try {
    const auth = await verifyContactsStaffAccess(request, context);
    if (!auth.allowed) {
      return NextResponse.json({ success: false, message: auth.error }, { status: auth.status });
    }

    const { website } = auth;
    const body = await request.json();

    const name = body.name?.trim();
    const email = body.email?.trim();
    const phone = body.phone?.trim() || null;
    const subject = body.subject?.trim() || 'General Inquiry';
    const message = body.message?.trim();

    if (!name || !email || !message) {
      return NextResponse.json({ success: false, message: 'Name, email, and message are required.' }, { status: 400 });
    }

    const insertRes = await queryDb(
      `INSERT INTO website_contacts (website_id, name, email, phone, subject, message, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'new')
       RETURNING *`,
      [website.id, name, email, phone, subject, message]
    );

    return NextResponse.json({
      success: true,
      message: 'Contact inquiry recorded successfully.',
      contact: insertRes.rows[0],
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating contact:', error);
    return NextResponse.json({ success: false, message: 'Failed to create contact inquiry.' }, { status: 500 });
  }
}

// PATCH: Update contact status or toggle star
export async function PATCH(request, context) {
  try {
    const auth = await verifyContactsStaffAccess(request, context);
    if (!auth.allowed) {
      return NextResponse.json({ success: false, message: auth.error }, { status: auth.status });
    }

    const { website } = auth;
    const body = await request.json();
    const { id, status, is_starred } = body;

    if (!id) {
      return NextResponse.json({ success: false, message: 'Contact ID is required.' }, { status: 400 });
    }

    let updates = [];
    const params = [id, website.id];

    if (status !== undefined) {
      const cleanStatus = String(status).toLowerCase();
      if (!['new', 'read', 'replied', 'closed', 'spam'].includes(cleanStatus)) {
        return NextResponse.json({ success: false, message: 'Invalid status value.' }, { status: 400 });
      }
      params.push(cleanStatus);
      updates.push(`status = $${params.length}`);
    }

    if (is_starred !== undefined) {
      params.push(Boolean(is_starred));
      updates.push(`is_starred = $${params.length}`);
    }

    if (updates.length === 0) {
      return NextResponse.json({ success: false, message: 'No fields to update.' }, { status: 400 });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);

    const updateRes = await queryDb(
      `UPDATE website_contacts SET ${updates.join(', ')}
       WHERE id = $1 AND website_id = $2
       RETURNING *`,
      params
    );

    if (updateRes.rows.length === 0) {
      return NextResponse.json({ success: false, message: 'Contact inquiry not found.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Contact inquiry updated.',
      contact: updateRes.rows[0],
    });
  } catch (error) {
    console.error('Error updating contact:', error);
    return NextResponse.json({ success: false, message: 'Failed to update contact inquiry.' }, { status: 500 });
  }
}

// DELETE: Delete contact inquiry
export async function DELETE(request, context) {
  try {
    const auth = await verifyContactsStaffAccess(request, context);
    if (!auth.allowed) {
      return NextResponse.json({ success: false, message: auth.error }, { status: auth.status });
    }

    const { website } = auth;
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, message: 'Contact ID is required.' }, { status: 400 });
    }

    const deleteRes = await queryDb(
      `DELETE FROM website_contacts WHERE id = $1 AND website_id = $2 RETURNING id, name`,
      [id, website.id]
    );

    if (deleteRes.rows.length === 0) {
      return NextResponse.json({ success: false, message: 'Contact inquiry not found.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `Contact inquiry from "${deleteRes.rows[0].name}" deleted successfully.`,
    });
  } catch (error) {
    console.error('Error deleting contact:', error);
    return NextResponse.json({ success: false, message: 'Failed to delete contact inquiry.' }, { status: 500 });
  }
}
