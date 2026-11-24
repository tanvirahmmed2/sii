import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';
import { hasModulePermission } from 'src/lib/middleware/developer';
export async function GET(request: any) {
    try {
        const auth = await hasModulePermission(request, 'payments');
        if (!auth.success) {
            return NextResponse.json({ success: false, error: auth.message }, { status: auth.status || 403 });
        }
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        if (id) {
            const singleRes = await queryDb(`SELECT pay.*, 
                (pay.amount * 100)::bigint AS amount_in_cents,
                c.name AS creator_name, 
                c.email AS creator_email,
                p.name AS package_name, 
                COALESCE(pay.billing_cycle, pu.billing_cycle, 'monthly') AS billing_interval,
                pu.status AS subscription_status,
                pu.period_end AS current_period_end,
                pu.status AS purchase_status,
                pu.notes AS purchase_notes,
                d.name AS developer_name,
                d.email AS developer_email
         FROM payments pay
         LEFT JOIN creators c ON pay.creator_id = c.id
         LEFT JOIN purchases pu ON pay.purchase_id = pu.id
         LEFT JOIN packages p ON COALESCE(pay.package_id, pu.package_id) = p.id
         LEFT JOIN developers d ON pay.processed_by_developer_id = d.id
         WHERE pay.id = $1
         LIMIT 1`, [Number(id)]);

            const txRes = await queryDb(
              `SELECT * FROM payment_transactions WHERE payment_id = $1 ORDER BY id DESC`,
              [Number(id)]
            ).catch(() => ({ rows: [] }));

            return NextResponse.json({
                success: true,
                record: singleRes.rows[0] || null,
                transactions: txRes.rows,
            });
        }
        const res = await queryDb(`SELECT pay.*, 
              (pay.amount * 100)::bigint AS amount_in_cents,
              c.name AS creator_name, 
              c.email AS creator_email,
              p.name AS package_name, 
              COALESCE(pay.billing_cycle, pu.billing_cycle, 'monthly') AS billing_interval,
              pu.status AS subscription_status,
              pu.period_end AS current_period_end,
              pu.status AS purchase_status,
              d.name AS developer_name,
              d.email AS developer_email
       FROM payments pay
       LEFT JOIN creators c ON pay.creator_id = c.id
       LEFT JOIN purchases pu ON pay.purchase_id = pu.id
       LEFT JOIN packages p ON COALESCE(pay.package_id, pu.package_id) = p.id
       LEFT JOIN developers d ON pay.processed_by_developer_id = d.id
       ORDER BY pay.id DESC`).catch(() => ({ rows: [] }));
        return NextResponse.json({ success: true, table: 'payments', records: res.rows });
    }
    catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
export async function POST(request: any) {
    try {
        const auth = await hasModulePermission(request, 'payments');
        if (!auth.success) {
            return NextResponse.json({ success: false, error: auth.message }, { status: auth.status || 403 });
        }
        const developerId = auth.developer?.id || auth.user?.id || null;
        const body = await request.json();
        const action = body.action || '';
        const data = body.data || body;
        if (action === 'manual_payment' || data.is_manual) {
            const creatorId = Number(data.creator_id);
            const packageId = Number(data.package_id);
            const billingCycle = String(data.billing_cycle || 'monthly').toLowerCase();
            const amount = Number(data.amount || 0);
            const currency = String(data.currency || 'BDT').toUpperCase();
            const paymentMethod = String(data.payment_method || 'manual_cash');
            const transactionId = data.transaction_id || `MANUAL-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
            const manualNotes = data.manual_payment_notes || data.notes || 'Manual payment taken by developer';
            const isPaid = String(data.status || 'successful').toLowerCase() === 'successful' || String(data.status || '').toLowerCase() === 'completed';
            if (!creatorId || !packageId) {
                return NextResponse.json({ success: false, error: 'creator_id and package_id are required' }, { status: 400 });
            }
            const isYearly = billingCycle === 'yearly';
            const durationDays = isYearly ? 365 : 30;
            const purchaseCode = `MAN-PUR-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
            await queryDb('BEGIN');
            try {
                let purchaseId = data.purchase_id ? Number(data.purchase_id) : null;
                if (!purchaseId) {
                    const purInsert = await queryDb(`INSERT INTO purchases (
               creator_id, package_id, purchase_code, billing_cycle,
               base_amount, discount_amount, tax_amount, total_amount, status,
               period_start, period_end, notes
             ) VALUES (
               $1, $2, $3, $4,
               $5, 0.00, 0.00, $5, $6,
               CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + ($7 || ' days')::interval, $8
             ) RETURNING id`, [
                        creatorId,
                        packageId,
                        purchaseCode,
                        billingCycle,
                        amount,
                        isPaid ? 'completed' : 'pending',
                        durationDays,
                        manualNotes,
                    ]);
                    purchaseId = purInsert.rows[0].id;
                }
                else if (isPaid) {
                    await queryDb(`UPDATE purchases
             SET status = 'completed',
                 period_start = CURRENT_TIMESTAMP,
                 period_end = CURRENT_TIMESTAMP + ($1 || ' days')::interval,
                 total_amount = $2,
                 notes = $3,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $4`, [durationDays, amount, manualNotes, purchaseId]);
                }
                const payInsert = await queryDb(`INSERT INTO payments (
             purchase_id, creator_id, transaction_id, amount, currency,
             payment_method, payment_gateway, status, processed_by_developer_id,
             manual_payment_notes, payment_date
           ) VALUES (
             $1, $2, $3, $4, $5,
             $6, 'manual', $7, $8,
             $9, CURRENT_TIMESTAMP
           ) RETURNING *`, [
                    purchaseId,
                    creatorId,
                    transactionId,
                    amount,
                    currency,
                    paymentMethod,
                    isPaid ? 'successful' : 'pending',
                    developerId,
                    manualNotes,
                ]);
                if (isPaid) {
                    const existingSub = await queryDb(`SELECT id FROM subscriptions WHERE creator_id = $1 AND package_id = $2 ORDER BY id DESC LIMIT 1`, [creatorId, packageId]);
                    if (existingSub.rows.length > 0) {
                        await queryDb(`UPDATE subscriptions 
               SET status = 'active',
                   billing_cycle = $1,
                   purchase_id = $2,
                   current_period_start = CURRENT_TIMESTAMP,
                   current_period_end = CURRENT_TIMESTAMP + ($3 || ' days')::interval,
                   updated_at = CURRENT_TIMESTAMP
               WHERE id = $4`, [billingCycle, purchaseId, durationDays, existingSub.rows[0].id]);
                    }
                    else {
                        await queryDb(`INSERT INTO subscriptions (
                 creator_id, package_id, purchase_id, status,
                 billing_cycle, current_period_start, current_period_end
               ) VALUES (
                 $1, $2, $3, 'active',
                 $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + ($5 || ' days')::interval
               )`, [creatorId, packageId, purchaseId, billingCycle, durationDays]);
                    }
                }
                await queryDb('COMMIT');
                return NextResponse.json({
                    success: true,
                    message: 'Manual payment recorded successfully and subscription activated.',
                    record: payInsert.rows[0],
                });
            }
            catch (err: any) {
                await queryDb('ROLLBACK');
                throw err;
            }
        }
        const keys = Object.keys(data).filter((k: any) => k !== 'id' && k !== 'action' && k !== 'creator_name' && k !== 'package_name' && k !== 'developer_name' && k !== 'developer_email');
        if (!data.processed_by_developer_id && developerId) {
            keys.push('processed_by_developer_id');
            data.processed_by_developer_id = developerId;
        }
        const values = keys.map((k: any) => (typeof data[k] === 'object' && data[k] !== null ? JSON.stringify(data[k]) : data[k]));
        const placeholders = keys.map((_: any, i: any) => '$' + (i + 1));
        const res = await queryDb(`INSERT INTO payments (${keys.map((k: any) => `"${k}"`).join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`, values);
        return NextResponse.json({ success: true, record: res.rows[0] });
    }
    catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}
export async function PUT(request: any) {
    try {
        const auth = await hasModulePermission(request, 'payments');
        if (!auth.success) {
            return NextResponse.json({ success: false, error: auth.message }, { status: auth.status || 403 });
        }
        const developerId = auth.developer?.id || auth.user?.id || null;
        const body = await request.json();
        const id = Number(body.id || body.data?.id);
        if (!id)
            return NextResponse.json({ success: false, error: 'Payment ID is required' }, { status: 400 });
        const data = body.data || body;
        const requestedStatus = (data.status || '').toLowerCase();
        const existingRes = await queryDb('SELECT * FROM payments WHERE id = $1 LIMIT 1', [id]);
        const existing = existingRes.rows[0];
        if (!existing) {
            return NextResponse.json({ success: false, error: 'Payment record not found' }, { status: 404 });
        }
        let completedPurchase = null;
        const isBecomingPaid = (requestedStatus === 'successful' || requestedStatus === 'completed' || requestedStatus === 'paid') && existing.status !== 'successful';
        await queryDb('BEGIN');
        try {
            if (isBecomingPaid) {
                let pu = null;
                if (existing.purchase_id) {
                    const puRes = await queryDb('SELECT * FROM purchases WHERE id = $1', [existing.purchase_id]);
                    pu = puRes.rows[0];
                }
                const resolvedPkgId = existing.package_id || pu?.package_id;
                const resolvedBillingCycle = existing.billing_cycle || pu?.billing_cycle || 'monthly';
                const isYearly = String(resolvedBillingCycle).toLowerCase() === 'yearly';
                const durationDays = isYearly ? 365 : 30;

                if (existing.purchase_id) {
                    const updatedPuRes = await queryDb(`UPDATE purchases 
           SET status = 'completed', 
               period_start = CURRENT_TIMESTAMP, 
               period_end = CURRENT_TIMESTAMP + ($1 || ' days')::interval, 
               updated_at = CURRENT_TIMESTAMP 
           WHERE id = $2 
           RETURNING *`, [durationDays, existing.purchase_id]);
                    completedPurchase = updatedPuRes.rows[0];
                }

                await queryDb(
                  `INSERT INTO payment_transactions (
                    payment_id, creator_id, transaction_id, amount, currency,
                    payment_gateway, payment_method, processed_by_developer_id,
                    manual_payment_notes, status, paid_at
                  ) VALUES (
                    $1, $2, $3, $4, $5,
                    'manual', $6, $7,
                    $8, 'successful', CURRENT_TIMESTAMP
                  )`,
                  [
                    id,
                    existing.creator_id,
                    existing.transaction_id || `MANUAL-${Date.now()}`,
                    Number(existing.amount || 0),
                    (existing.currency || 'BDT').toUpperCase(),
                    existing.payment_method || 'manual_cash',
                    developerId,
                    body.manual_payment_notes || existing.manual_payment_notes || 'Manual approval by developer',
                  ]
                );

                if (resolvedPkgId && existing.creator_id) {
                    const subRes = await queryDb(`SELECT id FROM subscriptions WHERE creator_id = $1 AND package_id = $2 ORDER BY id DESC LIMIT 1`, [existing.creator_id, resolvedPkgId]);
                    if (subRes.rows.length > 0) {
                        await queryDb(`UPDATE subscriptions 
               SET status = 'active',
                   billing_cycle = $1,
                   payment_id = $2,
                   purchase_id = $3,
                   current_period_start = CURRENT_TIMESTAMP,
                   current_period_end = CURRENT_TIMESTAMP + ($4 || ' days')::interval,
                   updated_at = CURRENT_TIMESTAMP
               WHERE id = $5`, [resolvedBillingCycle, id, existing.purchase_id || null, durationDays, subRes.rows[0].id]);
                    }
                    else {
                        await queryDb(`INSERT INTO subscriptions (
                 creator_id, package_id, payment_id, purchase_id, status,
                 billing_cycle, current_period_start, current_period_end
               ) VALUES (
                 $1, $2, $3, $4, 'active',
                 $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + ($6 || ' days')::interval
               )`, [existing.creator_id, resolvedPkgId, id, existing.purchase_id || null, resolvedBillingCycle, durationDays]);
                    }
                }

                const payAmount = Number(existing.amount || 0);
                const payCurrency = (existing.currency || 'BDT').toUpperCase();
                const balRes = await queryDb(`SELECT available_balance FROM platform_balances WHERE currency = $1 LIMIT 1`, [payCurrency]);
                const prevBal = balRes.rows.length > 0 ? Number(balRes.rows[0].available_balance) : 0;
                const newBal = prevBal + payAmount;

                await queryDb(
                  `INSERT INTO platform_balances (currency, total_revenue, available_balance, pending_balance, total_withdrawn)
                   VALUES ($1, $2, $2, 0.00, 0.00)
                   ON CONFLICT (currency) DO UPDATE 
                   SET total_revenue = platform_balances.total_revenue + EXCLUDED.total_revenue,
                       available_balance = platform_balances.available_balance + EXCLUDED.available_balance,
                       updated_at = CURRENT_TIMESTAMP`,
                  [payCurrency, payAmount]
                );

                await queryDb(
                  `INSERT INTO cashflows (
                    title, category, flow_type, amount, currency, balance_after,
                    reference_type, reference_id, creator_id, developer_id,
                    payment_method, metadata
                  ) VALUES (
                    $1, 'subscription', 'inflow', $2, $3, $4,
                    'payment', $5, $6, $7,
                    $8, $9
                  )`,
                  [
                    `Manual Approval for Payment #${id}`,
                    payAmount,
                    payCurrency,
                    newBal,
                    id,
                    existing.creator_id,
                    developerId,
                    'manual_cash',
                    JSON.stringify({
                      payment_id: id,
                      purchase_id: existing.purchase_id,
                      notes: body.manual_payment_notes || 'Manual approval by developer',
                    }),
                  ]
                );
            }
            const updateData = { ...data };
            delete updateData.id;
            delete updateData.action;
            delete updateData.creator_name;
            delete updateData.package_name;
            delete updateData.amount_in_cents;
            delete updateData.developer_name;
            delete updateData.developer_email;
            if (isBecomingPaid) {
                updateData.status = 'successful';
                if (developerId)
                    updateData.processed_by_developer_id = developerId;
                if (!updateData.payment_date)
                    updateData.payment_date = new Date().toISOString();
            }
            if (body.manual_payment_notes) {
                updateData.manual_payment_notes = body.manual_payment_notes;
            }
            const keys = Object.keys(updateData);
            if (keys.length === 0) {
                await queryDb('COMMIT');
                return NextResponse.json({ success: true, record: existing, purchase: completedPurchase });
            }
            const values = keys.map((k: any) => typeof updateData[k] === 'object' && updateData[k] !== null ? JSON.stringify(updateData[k]) : updateData[k]);
            const setClauses = keys.map((k: any, i: any) => `"${k}" = $${i + 1}`);
            values.push(id);
            const res = await queryDb(`UPDATE payments SET ${setClauses.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${values.length} RETURNING *`, values);
            await queryDb('COMMIT');
            return NextResponse.json({
                success: true,
                message: isBecomingPaid ? 'Payment marked as successful and subscription activated!' : 'Payment updated successfully.',
                record: res.rows[0],
                purchase: completedPurchase,
            });
        }
        catch (err: any) {
            await queryDb('ROLLBACK');
            throw err;
        }
    }
    catch (error: any) {
        console.error('Developer payment update error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}
export async function DELETE(request: any) {
    try {
        const auth = await hasModulePermission(request, 'payments');
        if (!auth.success) {
            return NextResponse.json({ success: false, error: auth.message }, { status: auth.status || 403 });
        }
        const { searchParams } = new URL(request.url);
        let id = searchParams.get('id');
        if (!id) {
            const body = await request.json().catch(() => ({}));
            id = body.id;
        }
        if (!id)
            return NextResponse.json({ success: false, error: 'ID is required' }, { status: 400 });
        await queryDb('DELETE FROM payments WHERE id = $1', [id]);
        return NextResponse.json({ success: true });
    }
    catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
