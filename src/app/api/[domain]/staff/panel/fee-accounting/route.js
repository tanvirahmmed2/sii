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

// GET: Load fee heads, structures, waivers, invoices, ledgers, wallets, refunds
export async function GET(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const websiteId = auth.website.id;

    // 1. Fee Heads
    const headsRes = await queryDb(
      `SELECT * FROM website_fee_heads WHERE website_id = $1 ORDER BY category ASC, name ASC`,
      [websiteId]
    );

    // 2. Fee Structures
    const structuresRes = await queryDb(
      `SELECT fs.*, fh.name as head_name, c.name as class_name
       FROM website_fee_structures fs
       JOIN website_fee_heads fh ON fh.id = fs.head_id
       LEFT JOIN website_classes c ON c.id = fs.class_id
       WHERE fs.website_id = $1
       ORDER BY fs.created_at DESC`,
      [websiteId]
    );

    // 3. Recent Student Invoices (Limit 50)
    const invoicesRes = await queryDb(
      `SELECT inv.*, s.name as student_name, s.roll
       FROM website_student_invoices inv
       JOIN website_students s ON s.id = inv.student_id
       WHERE inv.website_id = $1
       ORDER BY inv.created_at DESC
       LIMIT 50`,
      [websiteId]
    );

    // 4. Refund Requests
    const refundsRes = await queryDb(
      `SELECT r.*, s.name as student_name
       FROM website_refund_requests r
       JOIN website_students s ON s.id = r.student_id
       WHERE r.website_id = $1
       ORDER BY r.created_at DESC
       LIMIT 30`,
      [websiteId]
    );

    // 5. Total Wallet Balances
    const walletRes = await queryDb(
      `SELECT COUNT(*) as total_wallets, COALESCE(SUM(balance), 0) as total_wallet_balance
       FROM website_student_wallets
       WHERE website_id = $1`,
      [websiteId]
    );

    return NextResponse.json({
      success: true,
      fee_heads: headsRes.rows || [],
      fee_structures: structuresRes.rows || [],
      invoices: invoicesRes.rows || [],
      refund_requests: refundsRes.rows || [],
      wallet_summary: walletRes.rows[0] || { total_wallets: 0, total_wallet_balance: 0 },
    });
  } catch (error) {
    console.error('Error in fee-accounting GET:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// POST: Create fee head, configure fee structure, apply waiver, generate invoices
export async function POST(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const body = await request.json();
    const { action } = body;
    const websiteId = auth.website.id;

    if (action === 'create_head') {
      const { name, code, category, is_taxable } = body;
      if (!name) {
        return NextResponse.json({ success: false, error: 'Fee head name is required' }, { status: 400 });
      }

      const res = await queryDb(
        `INSERT INTO website_fee_heads (website_id, name, code, category, is_taxable)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [websiteId, name.trim(), code || null, category || 'academic', Boolean(is_taxable)]
      );
      return NextResponse.json({ success: true, message: 'Fee head account created', head: res.rows[0] });
    }

    if (action === 'create_structure') {
      const { head_id, class_id, session_id, amount, frequency, due_day, fine_rule } = body;
      if (!head_id || !amount) {
        return NextResponse.json({ success: false, error: 'Head ID and amount are required' }, { status: 400 });
      }

      const res = await queryDb(
        `INSERT INTO website_fee_structures (website_id, head_id, class_id, session_id, amount, frequency, due_day, fine_rule)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [websiteId, head_id, class_id || null, session_id || null, parseFloat(amount), frequency || 'monthly', parseInt(due_day || 10, 10), JSON.stringify(fine_rule || {})]
      );
      return NextResponse.json({ success: true, message: 'Fee structure configured', structure: res.rows[0] });
    }

    if (action === 'create_waiver') {
      const { student_id, head_id, waiver_type, waiver_value, reason } = body;
      if (!student_id || !waiver_value) {
        return NextResponse.json({ success: false, error: 'Student ID and waiver value required' }, { status: 400 });
      }

      const res = await queryDb(
        `INSERT INTO website_fee_waivers (website_id, student_id, head_id, waiver_type, waiver_value, reason)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [websiteId, student_id, head_id || null, waiver_type || 'percentage', parseFloat(waiver_value), reason || 'Concession']
      );
      return NextResponse.json({ success: true, message: 'Fee waiver granted', waiver: res.rows[0] });
    }

    return NextResponse.json({ success: false, error: 'Invalid action specified' }, { status: 400 });
  } catch (error) {
    console.error('Error in fee-accounting POST:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// DELETE: Remove fee head or structure
export async function DELETE(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const { searchParams } = new URL(request.url);
    const headId = searchParams.get('head_id');
    const structureId = searchParams.get('structure_id');
    const websiteId = auth.website.id;

    if (headId) {
      await queryDb(`DELETE FROM website_fee_heads WHERE id = $1 AND website_id = $2`, [headId, websiteId]);
      return NextResponse.json({ success: true, message: 'Fee head deleted' });
    }

    if (structureId) {
      await queryDb(`DELETE FROM website_fee_structures WHERE id = $1 AND website_id = $2`, [structureId, websiteId]);
      return NextResponse.json({ success: true, message: 'Fee structure deleted' });
    }

    return NextResponse.json({ success: false, error: 'Target ID not provided' }, { status: 400 });
  } catch (error) {
    console.error('Error in fee-accounting DELETE:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
  }
}

