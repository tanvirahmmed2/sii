import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';
import { hasModulePermission } from 'src/lib/middleware/developer';

const PERMISSIONS = ['shareholders', 'roles', 'payroll', 'developers'];

export async function GET(request: any) {
  try {
    const auth = await hasModulePermission(request, PERMISSIONS);
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status || 403 });
    }

    const { searchParams } = new URL(request.url);
    const currency = (searchParams.get('currency') || 'BDT').toUpperCase();

    const shareholdersRes = await queryDb(`
      SELECT s.*,
             d.name AS linked_developer_name,
             d.email AS linked_developer_email,
             d.phone AS linked_developer_phone
      FROM shareholders s
      LEFT JOIN developers d ON s.developer_id = d.id
      ORDER BY s.share_percentage DESC, s.id ASC
    `);

    const netProfitRes = await queryDb(`
      SELECT 
        COALESCE(SUM(CASE WHEN flow_type = 'inflow' THEN amount ELSE -amount END), 0) AS net_profit,
        COALESCE(SUM(CASE WHEN flow_type = 'inflow' THEN amount ELSE 0 END), 0) AS total_inflow,
        COALESCE(SUM(CASE WHEN flow_type = 'outflow' THEN amount ELSE 0 END), 0) AS total_outflow
      FROM cashflows
      WHERE currency = $1
    `, [currency]);

    const netProfit = Number(netProfitRes.rows[0]?.net_profit || 0);
    const totalInflow = Number(netProfitRes.rows[0]?.total_inflow || 0);
    const totalOutflow = Number(netProfitRes.rows[0]?.total_outflow || 0);

    const withdrawalsRes = await queryDb(`
      SELECT w.*,
             s.name AS shareholder_name,
             s.email AS shareholder_email,
             d.name AS processed_by_name
      FROM withdraws w
      LEFT JOIN shareholders s ON w.shareholder_id = s.id
      LEFT JOIN developers d ON w.processed_by_developer_id = d.id
      WHERE w.shareholder_id IS NOT NULL OR w.withdraw_type = 'dividend'
      ORDER BY w.id DESC
      LIMIT 100
    `);

    const shareholders = (shareholdersRes.rows || []).map((s: any) => {
      const sharePct = Number(s.share_percentage || 0);
      const totalWithdrawn = Number(s.total_withdrawn || 0);
      const shareOfNetProfit = netProfit > 0 ? (netProfit * sharePct) / 100 : 0;
      const eligibleDividend = Math.max(0, shareOfNetProfit - totalWithdrawn);

      return {
        ...s,
        share_percentage: sharePct,
        total_withdrawn: totalWithdrawn,
        share_of_net_profit: shareOfNetProfit,
        eligible_dividend: eligibleDividend,
      };
    });

    const totalAllocatedPercentage = shareholders.reduce((acc: number, s: any) => acc + s.share_percentage, 0);
    const totalSharesAllocated = shareholders.reduce((acc: number, s: any) => acc + Number(s.total_shares || 0), 0);
    const totalDividendsDisbursed = shareholders.reduce((acc: number, s: any) => acc + s.total_withdrawn, 0);

    return NextResponse.json({
      success: true,
      shareholders,
      recentWithdrawals: withdrawalsRes.rows || [],
      stats: {
        totalShareholders: shareholders.length,
        activeShareholders: shareholders.filter((s: any) => s.is_active).length,
        totalAllocatedPercentage,
        unallocatedPercentage: Math.max(0, 100 - totalAllocatedPercentage),
        totalSharesAllocated,
        totalDividendsDisbursed,
        netProfit,
        totalInflow,
        totalOutflow,
        currency,
      },
    });
  } catch (error: any) {
    console.error('Shareholders GET error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: any) {
  try {
    const auth = await hasModulePermission(request, PERMISSIONS, 'create');
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status || 403 });
    }

    const body = await request.json().catch(() => ({}));
    const name = String(body.name || '').trim();
    const email = String(body.email || '').toLowerCase().trim();
    const phone = body.phone ? String(body.phone).trim() : null;
    const roleTitle = body.role_title ? String(body.role_title).trim() : 'Shareholder';
    const sharePercentage = Math.max(0, Math.min(100, Number(body.share_percentage) || 0));
    const totalShares = Math.max(0, parseInt(body.total_shares || '0', 10));
    const payoutMethod = String(body.payout_method || 'bank').toLowerCase();
    const accountDetails = body.account_details || {};
    const developerId = body.developer_id ? Number(body.developer_id) : null;
    const notes = body.notes ? String(body.notes).trim() : null;

    if (!name || !email) {
      return NextResponse.json({ success: false, error: 'Full name and email are required.' }, { status: 400 });
    }

    const existingRes = await queryDb('SELECT id FROM shareholders WHERE LOWER(email) = LOWER($1) LIMIT 1', [email]);
    if (existingRes.rows.length > 0) {
      return NextResponse.json({ success: false, error: 'A shareholder with this email already exists.' }, { status: 400 });
    }

    const currentAllocRes = await queryDb('SELECT COALESCE(SUM(share_percentage), 0) AS total FROM shareholders');
    const currentAlloc = Number(currentAllocRes.rows[0]?.total || 0);
    if (currentAlloc + sharePercentage > 100.0001) {
      return NextResponse.json({
        success: false,
        error: `Cannot allocate ${sharePercentage}%. Total allocated equity would exceed 100% (currently ${currentAlloc}% allocated).`,
      }, { status: 400 });
    }

    const insertRes = await queryDb(`
      INSERT INTO shareholders (
        name, email, phone, developer_id, role_title, share_percentage,
        total_shares, payout_method, account_details, is_active, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, $10)
      RETURNING *
    `, [
      name,
      email,
      phone,
      developerId,
      roleTitle,
      sharePercentage,
      totalShares,
      payoutMethod,
      JSON.stringify(accountDetails),
      notes,
    ]);

    return NextResponse.json({
      success: true,
      message: `Shareholder ${name} created with ${sharePercentage}% equity.`,
      shareholder: insertRes.rows[0],
    }, { status: 201 });
  } catch (error: any) {
    console.error('Shareholders POST error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: any) {
  try {
    const auth = await hasModulePermission(request, PERMISSIONS, 'edit');
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status || 403 });
    }

    const body = await request.json().catch(() => ({}));
    const id = Number(body.id);
    if (!id) {
      return NextResponse.json({ success: false, error: 'Shareholder ID is required' }, { status: 400 });
    }

    const existingRes = await queryDb('SELECT * FROM shareholders WHERE id = $1 LIMIT 1', [id]);
    if (existingRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Shareholder not found' }, { status: 404 });
    }

    const current = existingRes.rows[0];
    const name = body.name !== undefined ? String(body.name).trim() : current.name;
    const phone = body.phone !== undefined ? String(body.phone).trim() : current.phone;
    const roleTitle = body.role_title !== undefined ? String(body.role_title).trim() : current.role_title;
    const newSharePercentage = body.share_percentage !== undefined ? Number(body.share_percentage) : Number(current.share_percentage);
    const totalShares = body.total_shares !== undefined ? parseInt(body.total_shares, 10) : current.total_shares;
    const payoutMethod = body.payout_method !== undefined ? String(body.payout_method) : current.payout_method;
    const accountDetails = body.account_details !== undefined ? body.account_details : current.account_details;
    const isActive = body.is_active !== undefined ? Boolean(body.is_active) : current.is_active;
    const notes = body.notes !== undefined ? String(body.notes).trim() : current.notes;
    const developerId = body.developer_id !== undefined ? (body.developer_id ? Number(body.developer_id) : null) : current.developer_id;

    if (body.share_percentage !== undefined) {
      const otherAllocRes = await queryDb('SELECT COALESCE(SUM(share_percentage), 0) AS total FROM shareholders WHERE id != $1', [id]);
      const otherAlloc = Number(otherAllocRes.rows[0]?.total || 0);
      if (otherAlloc + newSharePercentage > 100.0001) {
        return NextResponse.json({
          success: false,
          error: `Cannot allocate ${newSharePercentage}%. Other shareholders hold ${otherAlloc}%, which would exceed 100%.`,
        }, { status: 400 });
      }
    }

    const updateRes = await queryDb(`
      UPDATE shareholders
      SET name = $1,
          phone = $2,
          role_title = $3,
          share_percentage = $4,
          total_shares = $5,
          payout_method = $6,
          account_details = $7,
          is_active = $8,
          notes = $9,
          developer_id = $10,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $11
      RETURNING *
    `, [
      name,
      phone,
      roleTitle,
      newSharePercentage,
      totalShares,
      payoutMethod,
      JSON.stringify(accountDetails),
      isActive,
      notes,
      developerId,
      id,
    ]);

    return NextResponse.json({
      success: true,
      message: 'Shareholder details updated successfully',
      shareholder: updateRes.rows[0],
    });
  } catch (error: any) {
    console.error('Shareholders PUT error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: any) {
  try {
    const auth = await hasModulePermission(request, PERMISSIONS, 'delete');
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status || 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = Number(searchParams.get('id'));
    if (!id) {
      return NextResponse.json({ success: false, error: 'Shareholder ID is required' }, { status: 400 });
    }

    const withRes = await queryDb('SELECT id FROM withdraws WHERE shareholder_id = $1 LIMIT 1', [id]);
    if (withRes.rows.length > 0) {
      await queryDb('UPDATE shareholders SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1', [id]);
      return NextResponse.json({
        success: true,
        message: 'Shareholder has withdrawal records; account was deactivated rather than hard deleted.',
      });
    }

    await queryDb('DELETE FROM shareholders WHERE id = $1', [id]);
    return NextResponse.json({ success: true, message: 'Shareholder removed successfully.' });
  } catch (error: any) {
    console.error('Shareholders DELETE error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
