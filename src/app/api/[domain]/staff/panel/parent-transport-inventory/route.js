import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator.js';
import { getStaffSession } from 'src/lib/middleware/staff.js';

async function verifyStaffAccess(request, context) {
  const website = await resolveWebsiteFromRequest(request, context);
  if (!website) {
    return { error: 'Educational institution portal not found.', status: 404 };
  }
  const staffSession = await getStaffSession(request);
  if (!staffSession) {
    return { error: 'Unauthorized: Staff access required.', status: 401 };
  }

  const staffWebsiteId =
    staffSession?.website_id ||
    staffSession?.websiteId ||
    staffSession?.staff?.websiteId ||
    staffSession?.staff?.website_id;

  if (staffWebsiteId && String(staffWebsiteId) !== String(website.id)) {
    return { error: 'Forbidden: Cross-tenant access denied.', status: 403 };
  }

  return { website, staffSession };
}

// GET: Load parents, siblings links, transit routes, vehicles, inventory items, stock
export async function GET(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const websiteId = auth.website.id;

    // 1. Parents & Sibling Links
    const parentsRes = await queryDb(
      `SELECT p.*, 
              (SELECT COUNT(*) FROM website_parent_student_links l WHERE l.parent_id = p.id) AS linked_children_count
       FROM website_parents p
       WHERE p.website_id = $1
       ORDER BY p.created_at DESC`,
      [websiteId]
    );

    // 2. Transport Routes & Vehicles
    const routesRes = await queryDb(
      `SELECT r.*, 
              (SELECT COUNT(*) FROM website_transport_allocations a WHERE a.route_id = r.id) AS student_passengers
       FROM website_transport_routes r
       WHERE r.website_id = $1
       ORDER BY r.route_name ASC`,
      [websiteId]
    );

    const vehiclesRes = await queryDb(
      `SELECT v.*, r.route_name
       FROM website_transport_vehicles v
       LEFT JOIN website_transport_routes r ON r.id = v.route_id
       WHERE v.website_id = $1
       ORDER BY v.vehicle_no ASC`,
      [websiteId]
    );

    // 3. Inventory Items & Current Stock Balance
    const inventoryRes = await queryDb(
      `SELECT i.*, 
              COALESCE(
                (SELECT SUM(CASE WHEN s.transaction_type IN ('purchase_in', 'adjustment_return') THEN s.quantity ELSE -s.quantity END) 
                 FROM website_inventory_stocks s WHERE s.item_id = i.id), 0
              ) AS current_stock
       FROM website_inventory_items i
       WHERE i.website_id = $1
       ORDER BY i.name ASC`,
      [websiteId]
    );

    return NextResponse.json({
      success: true,
      parents: parentsRes.rows || [],
      routes: routesRes.rows || [],
      vehicles: vehiclesRes.rows || [],
      inventory_items: inventoryRes.rows || [],
    });
  } catch (error) {
    console.error('Error in parent-transport-inventory GET:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// POST: Register parent, add transit route, add inventory item
export async function POST(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const body = await request.json();
    const { action } = body;
    const websiteId = auth.website.id;

    if (action === 'create_parent') {
      const { name, email, phone, occupation, nid_number } = body;
      if (!name || !phone) {
        return NextResponse.json({ success: false, error: 'Name and phone are required' }, { status: 400 });
      }

      const res = await queryDb(
        `INSERT INTO website_parents (website_id, name, email, phone, occupation, nid_number)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [websiteId, name.trim(), email || null, phone.trim(), occupation || null, nid_number || null]
      );
      return NextResponse.json({ success: true, message: 'Parent account registered', parent: res.rows[0] });
    }

    if (action === 'create_route') {
      const { route_name, start_location, end_location, fare_amount, description } = body;
      if (!route_name || !start_location || !end_location) {
        return NextResponse.json({ success: false, error: 'Route name, start, and end locations required' }, { status: 400 });
      }

      const res = await queryDb(
        `INSERT INTO website_transport_routes (website_id, route_name, start_location, end_location, fare_amount, description)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [websiteId, route_name.trim(), start_location.trim(), end_location.trim(), parseFloat(fare_amount || 0), description || null]
      );
      return NextResponse.json({ success: true, message: 'Transit route created', route: res.rows[0] });
    }

    if (action === 'create_inventory_item') {
      const { name, item_code, category, unit, unit_price, min_stock_alert, description, initial_stock } = body;
      if (!name) {
        return NextResponse.json({ success: false, error: 'Item name is required' }, { status: 400 });
      }

      const res = await queryDb(
        `INSERT INTO website_inventory_items (website_id, name, item_code, category, unit, unit_price, min_stock_alert, description)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [websiteId, name.trim(), item_code || null, category || 'stationery', unit || 'pcs', parseFloat(unit_price || 0), parseInt(min_stock_alert || 5, 10), description || null]
      );

      // Add initial stock if provided
      if (initial_stock && parseInt(initial_stock, 10) > 0) {
        await queryDb(
          `INSERT INTO website_inventory_stocks (website_id, item_id, transaction_type, quantity, unit_cost, notes)
           VALUES ($1, $2, 'purchase_in', $3, $4, 'Initial stock entry')`,
          [websiteId, res.rows[0].id, parseInt(initial_stock, 10), parseFloat(unit_price || 0)]
        );
      }

      return NextResponse.json({ success: true, message: 'Inventory item cataloged', item: res.rows[0] });
    }

    return NextResponse.json({ success: false, error: 'Invalid action specified' }, { status: 400 });
  } catch (error) {
    console.error('Error in parent-transport-inventory POST:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// DELETE: Remove parent, route, or item
export async function DELETE(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const { searchParams } = new URL(request.url);
    const parentId = searchParams.get('parent_id');
    const routeId = searchParams.get('route_id');
    const itemId = searchParams.get('item_id');
    const websiteId = auth.website.id;

    if (parentId) {
      await queryDb(`DELETE FROM website_parents WHERE id = $1 AND website_id = $2`, [parentId, websiteId]);
      return NextResponse.json({ success: true, message: 'Parent deleted' });
    }

    if (routeId) {
      await queryDb(`DELETE FROM website_transport_routes WHERE id = $1 AND website_id = $2`, [routeId, websiteId]);
      return NextResponse.json({ success: true, message: 'Route deleted' });
    }

    if (itemId) {
      await queryDb(`DELETE FROM website_inventory_items WHERE id = $1 AND website_id = $2`, [itemId, websiteId]);
      return NextResponse.json({ success: true, message: 'Item deleted' });
    }

    return NextResponse.json({ success: false, error: 'Target ID not provided' }, { status: 400 });
  } catch (error) {
    console.error('Error in parent-transport-inventory DELETE:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
  }
}

