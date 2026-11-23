import { NextResponse } from 'next/server';
import { validateSslcommerzPayment, processSuccessfulPayment } from 'src/lib/sslcommerz/gateway';
import { queryDb } from 'src/lib/database/db';

export async function POST(request: any) {
  try {
    let bodyData: Record<string, string> = {};

    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      formData.forEach((value: any, key: string) => {
        bodyData[key] = String(value);
      });
    } else {
      const rawText = await request.text();
      try {
        bodyData = JSON.parse(rawText);
      } catch {
        const params = new URLSearchParams(rawText);
        params.forEach((value, key) => {
          bodyData[key] = value;
        });
      }
    }

    const valId = bodyData.val_id;
    const tranId = bodyData.tran_id;
    const paymentId = bodyData.value_b ? Number(bodyData.value_b) : null;
    const purchaseId = bodyData.value_a ? Number(bodyData.value_a) : null;

    if (!valId) {
      return NextResponse.json({ success: false, error: 'val_id is required' }, { status: 400 });
    }

    const validation = await validateSslcommerzPayment(valId);

    if (!validation.isValid) {
      if (paymentId) {
        await queryDb(`UPDATE payments SET status = 'failed', gateway_response = $1 WHERE id = $2`, [
          JSON.stringify(validation.raw || bodyData),
          paymentId,
        ]);
      }
      return NextResponse.json({ success: false, message: 'Validation failed', status: validation.status }, { status: 400 });
    }

    let resolvedPaymentId = paymentId;
    if (!resolvedPaymentId && tranId) {
      const paySearch = await queryDb(`SELECT id FROM payments WHERE transaction_id = $1 LIMIT 1`, [tranId]);
      if (paySearch.rows.length > 0) {
        resolvedPaymentId = paySearch.rows[0].id;
      }
    }

    if (resolvedPaymentId) {
      await processSuccessfulPayment({
        paymentId: resolvedPaymentId,
        purchaseId: purchaseId || undefined,
        tranId: validation.tranId || tranId,
        valId,
        gatewayResponse: validation.raw || bodyData,
        paymentMethod: validation.cardType || 'sslcommerz',
      });
    }

    return NextResponse.json({ success: true, message: 'IPN processed successfully' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
