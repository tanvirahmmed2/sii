import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { resolveWebsiteFromRequest, hasTenantModuleAllowance } from 'src/lib/middleware/websiteResolver.js';
import { getStaffSession, hasStaffModulePermission } from 'src/lib/middleware/staff.js';
import { getOfficerSession } from 'src/lib/middleware/officer.js';

// Verify access for either staff or officer
async function verifyStaffOrOfficerAccess(request, context, action = 'view') {
  const website = await resolveWebsiteFromRequest(request, context);
  if (!website) {
    return { error: 'Educational institution portal not found.', status: 404, code: 'WEBSITE_NOT_FOUND' };
  }

  // 1. Check Tenant Subscription Package Allowance
  const hasAllowance = await hasTenantModuleAllowance(website, 'events');
  if (!hasAllowance) {
    return {
      error: "The 'events' module is not included in this institution's subscription plan.",
      status: 403,
      code: 'MODULE_NOT_SUBSCRIBED',
      website,
    };
  }

  // 2. Staff session
  try {
    const staffSession = await getStaffSession(request);
    if (staffSession) {
      const staffWebsiteId =
        staffSession?.website_id ||
        staffSession?.websiteId ||
        staffSession?.staff?.websiteId ||
        staffSession?.staff?.website_id;

      if (!staffWebsiteId || String(staffWebsiteId) === String(website.id)) {
        const hasPerm = hasStaffModulePermission(staffSession, 'events', action);
        if (!hasPerm) {
          return {
            error: `Forbidden: Insufficient privileges to ${action} events.`,
            status: 403,
            code: 'PERMISSION_DENIED',
            website,
            staffSession,
          };
        }

        return {
          website,
          userType: 'staff',
          user: staffSession.staff || staffSession.user,
          userId: staffSession.staff_id || staffSession.staffId || staffSession.staff?.id,
          userName: staffSession.staff?.name || staffSession.user?.name || 'Staff Member',
        };
      }
    }
  } catch (e) {
    console.warn('Error checking staff session:', e?.message);
  }

  // 3. Officer session
  try {
    const officerSession = await getOfficerSession(request);
    if (officerSession) {
      const officerWebsiteId =
        officerSession?.website_id ||
        officerSession?.websiteId ||
        officerSession?.officer?.websiteId ||
        officerSession?.officer?.website_id;

      if (!officerWebsiteId || String(officerWebsiteId) === String(website.id)) {
        return {
          website,
          userType: 'officer',
          user: officerSession.officer || officerSession.user,
          userId: officerSession.officer_id || officerSession.id,
          userName: officerSession.officer?.name || officerSession.user?.name || 'Officer',
        };
      }
    }
  } catch (e) {
    console.warn('Error checking officer session:', e?.message);
  }

  return { error: 'Unauthorized: Staff or Officer login required.', status: 401, code: 'UNAUTHORIZED' };
}

function slugify(text) {
  const base = String(text || '')
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || `event-${Date.now()}`;
}

// GET: List events OR applicants for a given event
export async function GET(request, context) {
  try {
    const auth = await verifyStaffOrOfficerAccess(request, context);
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('event_id') || searchParams.get('id');
    const applicantsMode = searchParams.get('applicants') === 'true' || searchParams.get('view') === 'applicants';

    // 1. Fetch Applicants for a specific event
    if (applicantsMode && eventId) {
      const eventRes = await queryDb(
        `SELECT * FROM website_events WHERE id = $1 AND website_id = $2 LIMIT 1`,
        [eventId, auth.website.id]
      );

      if (eventRes.rowCount === 0) {
        return NextResponse.json({ success: false, error: 'Event not found.' }, { status: 404 });
      }

      const applicantsRes = await queryDb(
        `SELECT 
           ea.id AS applicant_id,
           ea.event_id,
           ea.student_id,
           ea.status,
           ea.applied_at,
           ea.notes,
           s.name AS student_name,
           s.registration_no,
           s.roll_no,
           s.image AS student_image,
           COALESCE(s.email, i.email) AS student_email,
           COALESCE(s.phone, i.number) AS student_phone,
           c.name AS class_name,
           sec.name AS section_name,
           ses.name AS session_name
         FROM website_events_applicants ea
         JOIN website_students s ON s.id = ea.student_id
         LEFT JOIN website_student_info i ON i.student_id = s.id
         LEFT JOIN website_classes c ON c.id = s.class_id
         LEFT JOIN website_sections sec ON sec.id = s.section_id
         LEFT JOIN website_sessions ses ON ses.id = s.session_id
         WHERE ea.website_id = $1 AND ea.event_id = $2
         ORDER BY ea.applied_at DESC, ea.id DESC`,
        [auth.website.id, eventId]
      );

      return NextResponse.json({
        success: true,
        event: eventRes.rows[0],
        applicants: applicantsRes.rows,
        total: applicantsRes.rowCount,
      });
    }

    // 2. Fetch Events List
    const search = searchParams.get('search')?.trim();
    const isApplicableFilter = searchParams.get('is_applicable');
    const statusFilter = searchParams.get('status');

    let query = `
      SELECT 
        e.*,
        COALESCE(e.interested_count, (SELECT COUNT(*)::int FROM website_events_interested wei WHERE wei.event_id = e.id), 0)::int AS interested_count,
        (SELECT COUNT(*)::int FROM website_events_applicants ea WHERE ea.event_id = e.id) AS total_applicants
      FROM website_events e
      WHERE e.website_id = $1
    `;
    const params = [auth.website.id];

    if (isApplicableFilter === 'true') {
      params.push(true);
      query += ` AND e.is_applicable = $${params.length}`;
    } else if (isApplicableFilter === 'false') {
      params.push(false);
      query += ` AND e.is_applicable = $${params.length}`;
    }

    if (statusFilter === 'active') {
      params.push(true);
      query += ` AND e.is_active = $${params.length}`;
    } else if (statusFilter === 'inactive') {
      params.push(false);
      query += ` AND e.is_active = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (e.title ILIKE $${params.length} OR e.location ILIKE $${params.length} OR e.description ILIKE $${params.length})`;
    }

    query += ` ORDER BY e.event_date DESC, e.id DESC`;

    const result = await queryDb(query, params);

    return NextResponse.json({
      success: true,
      events: result.rows,
      total: result.rowCount,
    });
  } catch (error) {
    console.error('Error in events GET API:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Create a new event
export async function POST(request, context) {
  try {
    const auth = await verifyStaffOrOfficerAccess(request, context, 'create');
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const body = await request.json().catch(() => ({}));
    const {
      title,
      slug,
      description,
      location,
      event_date,
      end_date,
      image,
      image_id,
      is_applicable = true,
      is_active = true,
    } = body;

    if (!title || !String(title).trim()) {
      return NextResponse.json({ success: false, error: 'Event title is required.' }, { status: 400 });
    }

    if (!event_date) {
      return NextResponse.json({ success: false, error: 'Event date is required.' }, { status: 400 });
    }

    let finalSlug = slug ? slugify(slug) : slugify(title);
    const slugCheck = await queryDb(
      `SELECT id FROM website_events WHERE website_id = $1 AND slug = $2 LIMIT 1`,
      [auth.website.id, finalSlug]
    );
    if (slugCheck.rowCount > 0) {
      finalSlug = `${finalSlug}-${Date.now().toString().slice(-4)}`;
    }

    const insertResult = await queryDb(
      `INSERT INTO website_events (
        website_id,
        title,
        slug,
        description,
        location,
        event_date,
        end_date,
        image,
        image_id,
        is_applicable,
        is_active,
        created_by_type,
        created_by_id,
        created_by_name
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
      ) RETURNING *`,
      [
        auth.website.id,
        String(title).trim(),
        finalSlug,
        description || '',
        location || '',
        event_date,
        end_date || null,
        image || null,
        image_id || null,
        Boolean(is_applicable),
        Boolean(is_active),
        auth.userType,
        auth.userId,
        auth.userName,
      ]
    );

    return NextResponse.json({
      success: true,
      message: 'Event created successfully.',
      event: insertResult.rows[0],
    });
  } catch (error) {
    console.error('Error in events POST API:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT: Update an existing event
export async function PUT(request, context) {
  try {
    const auth = await verifyStaffOrOfficerAccess(request, context, 'edit');
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const body = await request.json().catch(() => ({}));
    const {
      id,
      title,
      slug,
      description,
      location,
      event_date,
      end_date,
      image,
      image_id,
      is_applicable,
      is_active,
    } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Event ID is required for update.' }, { status: 400 });
    }

    const existingRes = await queryDb(
      `SELECT * FROM website_events WHERE id = $1 AND website_id = $2`,
      [id, auth.website.id]
    );

    if (existingRes.rowCount === 0) {
      return NextResponse.json({ success: false, error: 'Event not found.' }, { status: 404 });
    }

    const current = existingRes.rows[0];
    let finalSlug = slug ? slugify(slug) : current.slug;

    if (slug && finalSlug !== current.slug) {
      const slugCheck = await queryDb(
        `SELECT id FROM website_events WHERE website_id = $1 AND slug = $2 AND id != $3 LIMIT 1`,
        [auth.website.id, finalSlug, id]
      );
      if (slugCheck.rowCount > 0) {
        finalSlug = `${finalSlug}-${Date.now().toString().slice(-4)}`;
      }
    }

    const updateRes = await queryDb(
      `UPDATE website_events
       SET title = COALESCE($1, title),
           slug = $2,
           description = COALESCE($3, description),
           location = COALESCE($4, location),
           event_date = COALESCE($5, event_date),
           end_date = $6,
           image = COALESCE($7, image),
           image_id = COALESCE($8, image_id),
           is_applicable = COALESCE($9, is_applicable),
           is_active = COALESCE($10, is_active),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $11 AND website_id = $12
       RETURNING *`,
      [
        title ? String(title).trim() : null,
        finalSlug,
        description !== undefined ? description : null,
        location !== undefined ? location : null,
        event_date || null,
        end_date !== undefined ? end_date : current.end_date,
        image !== undefined ? image : null,
        image_id !== undefined ? image_id : null,
        is_applicable !== undefined ? Boolean(is_applicable) : null,
        is_active !== undefined ? Boolean(is_active) : null,
        id,
        auth.website.id,
      ]
    );

    return NextResponse.json({
      success: true,
      message: 'Event updated successfully.',
      event: updateRes.rows[0],
    });
  } catch (error) {
    console.error('Error in events PUT API:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE: Remove an event
export async function DELETE(request, context) {
  try {
    const auth = await verifyStaffOrOfficerAccess(request, context, 'delete');
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    const queryId = searchParams.get('id') || searchParams.get('event_id');
    const body = await request.json().catch(() => ({}));
    const id = queryId || body.id;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Event ID is required for deletion.' }, { status: 400 });
    }

    const deleteRes = await queryDb(
      `DELETE FROM website_events WHERE id = $1 AND website_id = $2 RETURNING id, title`,
      [id, auth.website.id]
    );

    if (deleteRes.rowCount === 0) {
      return NextResponse.json({ success: false, error: 'Event not found or already deleted.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `Event "${deleteRes.rows[0].title}" deleted successfully.`,
    });
  } catch (error) {
    console.error('Error in events DELETE API:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
