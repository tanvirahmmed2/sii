import { NextResponse } from 'next/server';
import { hasModulePermission } from 'src/lib/middleware/developer';
import { processSuccessfulPayment } from 'src/lib/sslcommerz/gateway';
import { queryDb } from 'src/lib/database/db';

export async function POST(request: any) {
  try {
    const auth = await hasModulePermission(request, 'payments');
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status || 403 });
    }

    const developerId = auth.developer?.id || auth.user?.id || null;
    const body = await request.json().catch(() => ({}));
    let paymentId = body.paymentId ? Number(body.paymentId) : null;
    const purchaseId = body.purchaseId ? Number(body.purchaseId) : null;
    const notes = body.notes || body.manual_payment_notes || 'Manual payment approved by developer';
    const paymentMethod = body.payment_method || body.paymentMethod || 'manual_cash';

    if (!paymentId && purchaseId) {
      const payRes = await queryDb(`SELECT id FROM payments WHERE purchase_id = $1 ORDER BY id DESC LIMIT 1`, [purchaseId]);
      if (payRes.rows.length > 0) {
        paymentId = payRes.rows[0].id;
      }
    }

    if (!paymentId) {
      return NextResponse.json({ success: false, error: 'paymentId or purchaseId is required' }, { status: 400 });
    }

    const manualTxn = `MANUAL-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const result = await processSuccessfulPayment({
      paymentId,
      purchaseId: purchaseId || undefined,
      tranId: manualTxn,
      valId: manualTxn,
      gatewayResponse: {
        approval_type: 'developer_manual_payment',
        developer_id: developerId,
        approved_at: new Date().toISOString(),
        notes,
      },
      processedByDeveloperId: developerId,
      paymentMethod,
      manualNotes: notes,
    });

    return NextResponse.json({
      success: true,
      message: 'Payment manually verified and subscription activated successfully',
      result,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
