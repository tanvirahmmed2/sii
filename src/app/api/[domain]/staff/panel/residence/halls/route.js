import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { verifyResidenceStaffAccess } from 'src/lib/middleware/residence-auth.js';

// GET: List all halls with capacity & occupancy stats, or fetch a single hall
export async function GET(request, context) {
  try {
    const auth = await verifyResidenceStaffAccess(request, context, 'view');
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { website } = auth;
    const { searchParams } = new URL(request.url);
    const hallId = searchParams.get('id');
    const search = searchParams.get('search')?.trim();
    const gender = searchParams.get('gender');
    const status = searchParams.get('status'); // 'all', 'active', 'inactive'

    if (hallId) {
      const singleRes = await queryDb(
        `SELECT h.*,
                COUNT(DISTINCT r.id)::int AS total_rooms,
                COUNT(DISTINCT s.id)::int AS total_seats,
                COUNT(DISTINCT CASE WHEN s.status = 'allocated' THEN s.id END)::int AS allocated_seats,
                COUNT(DISTINCT CASE WHEN s.status = 'available' THEN s.id END)::int AS available_seats
         FROM website_halls h
         LEFT JOIN website_hall_rooms r ON h.id = r.hall_id
         LEFT JOIN website_hall_room_seats s ON h.id = s.hall_id
         WHERE h.website_id = $1 AND h.id = $2
         GROUP BY h.id`,
        [website.id, hallId]
      );

      if (singleRes.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Hall not found.' }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        payload: { hall: singleRes.rows[0] },
      });
    }

    const conditions = ['h.website_id = $1'];
    const values = [website.id];
    let pIdx = 2;

    if (gender && gender !== 'all') {
      conditions.push(`h.gender = $${pIdx++}`);
      values.push(gender);
    }

    if (status === 'active') {
      conditions.push(`h.is_active = TRUE`);
    } else if (status === 'inactive') {
      conditions.push(`h.is_active = FALSE`);
    }

    if (search) {
      conditions.push(`(h.name ILIKE $${pIdx} OR h.code ILIKE $${pIdx} OR h.provost_name ILIKE $${pIdx} OR h.location ILIKE $${pIdx})`);
      values.push(`%${search}%`);
      pIdx++;
    }

    const whereClause = conditions.join(' AND ');

    const hallsRes = await queryDb(
      `SELECT h.*,
              COUNT(DISTINCT r.id)::int AS total_rooms,
              COUNT(DISTINCT s.id)::int AS total_seats,
              COUNT(DISTINCT CASE WHEN s.status = 'allocated' THEN s.id END)::int AS allocated_seats,
              COUNT(DISTINCT CASE WHEN s.status = 'available' THEN s.id END)::int AS available_seats
       FROM website_halls h
       LEFT JOIN website_hall_rooms r ON h.id = r.hall_id
       LEFT JOIN website_hall_room_seats s ON h.id = s.hall_id
       WHERE ${whereClause}
       GROUP BY h.id
       ORDER BY h.name ASC`,
      values
    );

    // Summary KPIs
    const statsRes = await queryDb(
      `SELECT
         COUNT(DISTINCT h.id)::int AS total_halls,
         COUNT(DISTINCT r.id)::int AS total_rooms,
         COUNT(DISTINCT s.id)::int AS total_seats,
         COUNT(DISTINCT CASE WHEN s.status = 'allocated' THEN s.id END)::int AS total_allocated,
         COUNT(DISTINCT CASE WHEN s.status = 'available' THEN s.id END)::int AS total_available
       FROM website_halls h
       LEFT JOIN website_hall_rooms r ON h.id = r.hall_id
       LEFT JOIN website_hall_room_seats s ON h.id = s.hall_id
       WHERE h.website_id = $1`,
      [website.id]
    );

    return NextResponse.json({
      success: true,
      payload: {
        halls: hallsRes.rows,
        stats: statsRes.rows[0] || {},
      },
    });
  } catch (error) {
    console.error('Error fetching halls:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch hall records.' }, { status: 500 });
  }
}

// POST: Create a new hall
export async function POST(request, context) {
  try {
    const auth = await verifyResidenceStaffAccess(request, context, 'create');
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { website } = auth;
    const body = await request.json();
    const {
      name,
      code,
      gender = 'male',
      provost_name,
      contact_number,
      email,
      location,
      description,
      total_floors = 1,
      is_active = true,
    } = body;

    if (!name?.trim()) {
      return NextResponse.json({ success: false, error: 'Hall name is required.' }, { status: 400 });
    }

    const cleanName = name.trim();

    // Check duplicate name within this website
    const dupCheck = await queryDb(
      `SELECT id FROM website_halls WHERE website_id = $1 AND LOWER(name) = LOWER($2) LIMIT 1`,
      [website.id, cleanName]
    );
    if (dupCheck.rows.length > 0) {
      return NextResponse.json({ success: false, error: `A hall named "${cleanName}" already exists.` }, { status: 409 });
    }

    const insertRes = await queryDb(
      `INSERT INTO website_halls (
          website_id, name, code, gender, provost_name,
          contact_number, email, location, description,
          total_floors, is_active
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        website.id,
        cleanName,
        code?.trim() || null,
        gender || 'male',
        provost_name?.trim() || null,
        contact_number?.trim() || null,
        email?.trim() || null,
        location?.trim() || null,
        description?.trim() || null,
        parseInt(total_floors, 10) || 1,
        Boolean(is_active),
      ]
    );

    return NextResponse.json({
      success: true,
      message: 'Hall created successfully.',
      payload: { hall: insertRes.rows[0] },
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating hall:', error);
    return NextResponse.json({ success: false, error: 'Failed to create hall.' }, { status: 500 });
  }
}

// PUT: Update an existing hall
export async function PUT(request, context) {
  try {
    const auth = await verifyResidenceStaffAccess(request, context, 'update');
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { website } = auth;
    const body = await request.json();
    const {
      id,
      name,
      code,
      gender,
      provost_name,
      contact_number,
      email,
      location,
      description,
      total_floors,
      is_active,
    } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Hall ID is required.' }, { status: 400 });
    }

    const hallCheck = await queryDb(
      `SELECT id FROM website_halls WHERE website_id = $1 AND id = $2 LIMIT 1`,
      [website.id, id]
    );
    if (hallCheck.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Hall record not found.' }, { status: 404 });
    }

    if (name?.trim()) {
      const dupCheck = await queryDb(
        `SELECT id FROM website_halls WHERE website_id = $1 AND LOWER(name) = LOWER($2) AND id != $3 LIMIT 1`,
        [website.id, name.trim(), id]
      );
      if (dupCheck.rows.length > 0) {
        return NextResponse.json({ success: false, error: `A hall named "${name.trim()}" already exists.` }, { status: 409 });
      }
    }

    const updateRes = await queryDb(
      `UPDATE website_halls
       SET name = COALESCE($1, name),
           code = COALESCE($2, code),
           gender = COALESCE($3, gender),
           provost_name = COALESCE($4, provost_name),
           contact_number = COALESCE($5, contact_number),
           email = COALESCE($6, email),
           location = COALESCE($7, location),
           description = COALESCE($8, description),
           total_floors = COALESCE($9, total_floors),
           is_active = COALESCE($10, is_active),
           updated_at = CURRENT_TIMESTAMP
       WHERE website_id = $11 AND id = $12
       RETURNING *`,
      [
        name?.trim() || null,
        code !== undefined ? code?.trim() || null : null,
        gender || null,
        provost_name !== undefined ? provost_name?.trim() || null : null,
        contact_number !== undefined ? contact_number?.trim() || null : null,
        email !== undefined ? email?.trim() || null : null,
        location !== undefined ? location?.trim() || null : null,
        description !== undefined ? description?.trim() || null : null,
        total_floors !== undefined ? parseInt(total_floors, 10) : null,
        is_active !== undefined ? Boolean(is_active) : null,
        website.id,
        id,
      ]
    );

    return NextResponse.json({
      success: true,
      message: 'Hall updated successfully.',
      payload: { hall: updateRes.rows[0] },
    });
  } catch (error) {
    console.error('Error updating hall:', error);
    return NextResponse.json({ success: false, error: 'Failed to update hall.' }, { status: 500 });
  }
}

// DELETE: Delete a hall
export async function DELETE(request, context) {
  try {
    const auth = await verifyResidenceStaffAccess(request, context, 'delete');
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { website } = auth;
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Hall ID is required.' }, { status: 400 });
    }

    // Check if there are active allocations in this hall
    const activeAlloc = await queryDb(
      `SELECT id FROM website_hall_seat_allocations WHERE website_id = $1 AND hall_id = $2 AND status = 'active' LIMIT 1`,
      [website.id, id]
    );
    if (activeAlloc.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete hall with active student seat allocations. Please vacate students first.' },
        { status: 409 }
      );
    }

    const delRes = await queryDb(
      `DELETE FROM website_halls WHERE website_id = $1 AND id = $2 RETURNING id, name`,
      [website.id, id]
    );

    if (delRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Hall not found.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `Hall "${delRes.rows[0].name}" deleted successfully.`,
      payload: { deletedId: delRes.rows[0].id },
    });
  } catch (error) {
    console.error('Error deleting hall:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete hall.' }, { status: 500 });
  }
}
