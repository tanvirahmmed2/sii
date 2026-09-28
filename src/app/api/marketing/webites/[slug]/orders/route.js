import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { resolveWebsiteFromRequest } from '@/lib/middleware/user';
import { queryDb } from '@/lib/db/pg';

export async function POST(request, context) {
  try {
    const params = await context.params;
    const slug = params.slug;

    const website = await resolveWebsiteFromRequest(request, slug);
    if (!website) {
      return NextResponse.json({ success: false, error: 'Website not found' }, { status: 404 });
    }

    const websiteId = website.id;
    const body = await request.json();

    const customerName = (body.customerName || 'Customer').trim();
    const customerEmail = (body.customerEmail || '').trim().toLowerCase();
    const items = Array.isArray(body.items) ? body.items : [];

    if (!customerEmail || items.length === 0) {
      return NextResponse.json({ success: false, error: 'Customer email and at least one item are required.' }, { status: 400 });
    }

    // Calculate total price in cents
    const totalAmountInCents = items.reduce(
      (sum, item) => sum + (Number(item.price || item.price_in_cents || 0) * Number(item.quantity || 1)),
      0
    );

    const orderNumber = 'ORD-' + Math.floor(100000 + Math.random() * 900000);
    const txnId = 'txn_' + crypto.randomBytes(8).toString('hex');

    // Insert purchase order
    const oRes = await queryDb(`
      INSERT INTO website_purchase (website_id, order_number, customer_name, customer_email, total_amount_in_cents, currency, status, payment_status, items)
      VALUES ($1, $2, $3, $4, $5, 'USD', 'COMPLETED', 'PAID', $6)
      RETURNING *
    `, [websiteId, orderNumber, customerName, customerEmail, totalAmountInCents, JSON.stringify(items)]);

    const order = oRes.rows[0];

    // Insert purchase payment record
    await queryDb(`
      INSERT INTO website_purchase_payments (purchase_id, website_id, amount_in_cents, currency, payment_method, transaction_id, status)
      VALUES ($1, $2, $3, 'USD', 'CARD', $4, 'SUCCESS')
    `, [order.id, websiteId, totalAmountInCents, txnId]);

    return NextResponse.json({ success: true, order });
  } catch (error) {
    console.error('Website order checkout error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
