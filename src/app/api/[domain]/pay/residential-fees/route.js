import { NextResponse } from 'next/server';
import { queryDb, pool } from 'src/lib/database/db';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator';
import { fetchAssignedGatewaysForPurpose } from 'src/lib/database/paymentGateways';

export const dynamic = 'force-dynamic';

/**
 * GET /api/[domain]/pay/residential-fees
 * Look up student hall seat rent and residential fees using website_hall_fee_payments.
 */
export async function GET(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json({ success: false, error: 'Institution not found.' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const identifier = (searchParams.get('identifier') || '').trim();

    // Fetch assigned gateways specifically for residential fees
    const sanitizedGateways = await fetchAssignedGatewaysForPurpose(website.id, 'residential_fees');

    if (!identifier) {
      return NextResponse.json({
        success: true,
        message: 'Provide Student ID or Roll No to check dormitory and hall seat dues.',
        available_gateways: sanitizedGateways
      });
    }

    const maskEmail = (email) => {
      if (!email || typeof email !== 'string') return null;
      const parts = email.split('@');
      if (parts.length !== 2) return '***@***';
      const name = parts[0];
      const host = parts[1];
      if (name.length <= 2) return `${name.charAt(0)}*@${host}`;
      return `${name.slice(0, 2)}****${name.slice(-1)}@${host}`;
    };

    const maskPhone = (phone) => {
      if (!phone || typeof phone !== 'string') return null;
      const clean = phone.trim();
      if (clean.length <= 4) return '****';
      return `${clean.slice(0, 3)}*****${clean.slice(-3)}`;
    };

    const studentRes = await queryDb(`
      SELECT s.id, s.registration_no, s.roll_no, s.student_unique_id,
             COALESCE(i.name, s.name, 'Student') AS name,
             COALESCE(i.email, s.email) AS raw_email,
             COALESCE(i.phone, s.number) AS raw_phone,
             c.name AS class_name, c.id AS class_id
      FROM website_students s
      LEFT JOIN website_student_information i ON i.student_id = s.id
      LEFT JOIN website_classes c ON c.id = s.class_id
      WHERE s.website_id = $1
        AND (
          s.student_unique_id = $2 OR
          s.roll_no = $2 OR
          s.registration_no = $2 OR
          i.email = $2 OR
          s.email = $2 OR
          i.phone = $2 OR
          s.number = $2
        )
      LIMIT 1
    `, [website.id, identifier]);

    if (studentRes.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: `No student record found matching "${identifier}".`,
        available_gateways: sanitizedGateways
      }, { status: 404 });
    }

    const row = studentRes.rows[0];
    const student = {
      id: row.id,
      name: row.name,
      student_unique_id: row.student_unique_id,
      roll_no: row.roll_no,
      registration_no: row.registration_no,
      class_name: row.class_name,
      masked_email: maskEmail(row.raw_email),
      masked_phone: maskPhone(row.raw_phone)
    };

    // Query website_hall_fee_payments
    const feeRes = await queryDb(`
      SELECT p.id, p.invoice_no, p.title, p.month_name, p.amount, p.fine_amount,
             p.paid_amount, p.currency, p.due_date, p.payment_status,
             h.name AS hall_name, r.room_number, s.seat_number,
             (p.amount + p.fine_amount - p.paid_amount) AS net_due
      FROM website_hall_fee_payments p
      LEFT JOIN website_halls h ON h.id = p.hall_id
      LEFT JOIN website_hall_rooms r ON r.id = p.room_id
      LEFT JOIN website_hall_room_seats s ON s.id = p.seat_id
      WHERE p.website_id = $1 AND p.student_id = $2
        AND p.payment_status IN ('unpaid', 'partially_paid')
      ORDER BY p.id ASC
    `, [website.id, student.id]);

    let residentialDues = feeRes.rows.map(r => ({
      ...r,
      category: 'residential_fees',
      category_label: 'Hall & Residential Fee',
      amount: parseFloat(r.amount),
      fine_amount: parseFloat(r.fine_amount || 0),
      paid_amount: parseFloat(r.paid_amount || 0),
      net_due: parseFloat(r.net_due)
    }));

    // If no existing invoice, check active hall seat allocation
    if (residentialDues.length === 0) {
      const allocRes = await queryDb(`
        SELECT a.id, a.fee_monthly, h.name AS hall_name, r.room_number, s.seat_number
        FROM website_hall_seat_allocations a
        JOIN website_halls h ON h.id = a.hall_id
        JOIN website_hall_rooms r ON r.id = a.room_id
        JOIN website_hall_room_seats s ON s.id = a.seat_id
        WHERE a.website_id = $1 AND a.student_id = $2 AND a.status = 'active'
        LIMIT 1
      `, [website.id, student.id]);

      if (allocRes.rows.length > 0) {
        const alloc = allocRes.rows[0];
        const rent = parseFloat(alloc.fee_monthly) || 0;
        if (rent > 0) {
          const currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
          residentialDues.push({
            id: `alloc-${alloc.id}`,
            allocation_id: alloc.id,
            category: 'residential_fees',
            category_label: 'Hall Seat Monthly Rent',
            invoice_no: `INV-HALL-${student.registration_no || student.id}-${Date.now().toString().slice(-4)}`,
            title: `Hall Seat Rent — ${alloc.hall_name} (Room ${alloc.room_number}, Seat ${alloc.seat_number})`,
            month_name: currentMonth,
            hall_name: alloc.hall_name,
            room_number: alloc.room_number,
            seat_number: alloc.seat_number,
            amount: rent,
            fine_amount: 0.00,
            paid_amount: 0.00,
            net_due: rent,
            currency: 'BDT',
            due_date: new Date().toISOString().split('T')[0],
            payment_status: 'unpaid'
          });
        }
      }
    }

    const totalDue = residentialDues.reduce((acc, curr) => acc + (curr.net_due || 0), 0);

    return NextResponse.json({
      success: true,
      student,
      dues: { residential: residentialDues },
      summary: {
        total_unpaid_items: residentialDues.length,
        total_due_amount: totalDue,
        currency: 'BDT'
      },
      available_gateways: sanitizedGateways
    });
  } catch (error) {
    console.error('Error in GET /pay/residential-fees:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/[domain]/pay/residential-fees
 * Settle dormitory seat rent in website_hall_fee_payments.
 */
export async function POST(request, context) {
  const client = await pool.connect();
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json({ success: false, error: 'Institution not found.' }, { status: 404 });
    }

    const body = await request.json();
    const { invoice_id, gateway_code, gateway_account_id, payment_details = {} } = body;

    if (!invoice_id) {
      return NextResponse.json({ success: false, error: 'Missing invoice ID.' }, { status: 400 });
    }
    if (!gateway_code) {
      return NextResponse.json({ success: false, error: 'Please choose a payment gateway.' }, { status: 400 });
    }

    const gw = gateway_code.toLowerCase();

    await client.query('BEGIN');

    let inv = null;
    let dueAmount = 0;
    const txnId = `TXN-${gw.toUpperCase()}-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    const payerPhone = payment_details.account_number || payment_details.phone || null;

    // Case 1: Existing invoice in website_hall_fee_payments
    if (!String(invoice_id).startsWith('alloc-')) {
      const invRes = await client.query(`
        SELECT p.*, s.student_unique_id, s.full_name, s.email, s.mobile_number,
               h.name AS hall_name, r.room_number, st.seat_number
        FROM website_hall_fee_payments p
        JOIN website_students s ON s.id = p.student_id
        LEFT JOIN website_halls h ON h.id = p.hall_id
        LEFT JOIN website_hall_rooms r ON r.id = p.room_id
        LEFT JOIN website_hall_room_seats st ON st.id = p.seat_id
        WHERE p.id = $1 AND p.website_id = $2
        FOR UPDATE OF p
      `, [invoice_id, website.id]);

      if (invRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json({ success: false, error: 'Hall fee invoice not found.' }, { status: 404 });
      }

      inv = invRes.rows[0];
      if (inv.payment_status === 'paid') {
        await client.query('ROLLBACK');
        return NextResponse.json({ success: false, error: 'This hall invoice has already been settled.' }, { status: 400 });
      }

      dueAmount = parseFloat(inv.amount) + parseFloat(inv.fine_amount || 0) - parseFloat(inv.paid_amount || 0);

      await client.query(`
        UPDATE website_hall_fee_payments
        SET payment_status = 'paid',
            paid_amount = amount + fine_amount,
            payment_method = 'online',
            gateway_code = $1,
            transaction_id = $2,
            paid_date = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
      `, [gw, txnId, inv.id]);
    }
    // Case 2: Dynamic allocation invoice creation
    else {
      const allocId = parseInt(String(invoice_id).replace('alloc-', ''), 10);
      const allocRes = await client.query(`
        SELECT a.*, s.student_unique_id, s.full_name, s.email, s.mobile_number,
               h.name AS hall_name, r.room_number, st.seat_number
        FROM website_hall_seat_allocations a
        JOIN website_students s ON s.id = a.student_id
        JOIN website_halls h ON h.id = a.hall_id
        JOIN website_hall_rooms r ON r.id = a.room_id
        JOIN website_hall_room_seats st ON st.id = a.seat_id
        WHERE a.id = $1 AND a.website_id = $2 AND a.status = 'active'
      `, [allocId, website.id]);

      if (allocRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json({ success: false, error: 'Active hall seat allocation not found.' }, { status: 404 });
      }

      const alloc = allocRes.rows[0];
      dueAmount = parseFloat(alloc.fee_monthly) || 0;
      const currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
      const generatedInv = `INV-HALL-${alloc.student_unique_id || alloc.student_id}-${Date.now().toString().slice(-4)}`;

      const insertRes = await client.query(`
        INSERT INTO website_hall_fee_payments (
          website_id, allocation_id, student_id, hall_id, room_id, seat_id,
          invoice_no, title, month_name, amount, fine_amount, paid_amount,
          currency, due_date, payment_status, payment_method, gateway_code,
          transaction_id, paid_date
        ) VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9, $10, 0.00, $10,
          'BDT', CURRENT_DATE, 'paid', 'online', $11,
          $12, CURRENT_TIMESTAMP
        ) RETURNING *
      `, [
        website.id, alloc.id, alloc.student_id, alloc.hall_id, alloc.room_id, alloc.seat_id,
        generatedInv, `Hall Seat Rent — ${alloc.hall_name}`, currentMonth, dueAmount,
        gw, txnId
      ]);

      inv = {
        ...insertRes.rows[0],
        student_unique_id: alloc.student_unique_id,
        full_name: alloc.full_name,
        email: alloc.email,
        mobile_number: alloc.mobile_number,
        hall_name: alloc.hall_name,
        room_number: alloc.room_number,
        seat_number: alloc.seat_number
      };
    }

    let finalAccountId = gateway_account_id || null;
    if (!finalAccountId) {
      const assigned = await fetchAssignedGatewaysForPurpose(website.id, 'residential_fees', { hostelId: inv?.hall_id });
      const match = assigned.find(g => g.code === gw);
      if (match) finalAccountId = match.id;
    }

    // Record in transaction audit
    await client.query(`
      INSERT INTO website_payment_transactions (
        website_id, gateway_account_id, gateway_code, purpose, invoice_ref,
        student_id, payer_name, payer_email, payer_phone, amount,
        currency, status, transaction_id, gateway_reference, notes
      ) VALUES (
        $1, $2, $3, 'residential_fees', $4,
        $5, $6, $7, $8, $9,
        $10, 'completed', $11, $12, $13
      )
    `, [
      website.id, finalAccountId, gw, inv.invoice_no,
      inv.student_id, inv.full_name, inv.email, payerPhone || inv.mobile_number, dueAmount,
      inv.currency || 'BDT', txnId, `ONLINE-GATEWAY-${gw.toUpperCase()}`,
      `Paid hall seat rent for ${inv.hall_name || 'Hostel'} Seat`
    ]);

    await client.query('COMMIT');

    return NextResponse.json({
      success: true,
      message: 'Hall seat rent payment settled successfully!',
      transaction_id: txnId,
      receipt: {
        invoice_no: inv.invoice_no,
        title: inv.title || 'Hall & Residential Fee',
        payer_name: inv.full_name,
        student_id: inv.student_unique_id,
        amount: dueAmount,
        currency: inv.currency || 'BDT',
        transaction_id: txnId,
        payment_date: new Date().toISOString()
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error in POST /pay/residential-fees:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}
