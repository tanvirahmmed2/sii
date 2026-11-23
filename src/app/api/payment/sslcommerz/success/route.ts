import { NextResponse } from 'next/server';
import { getBaseUrl } from 'src/lib/database/secret';
import { validateSslcommerzPayment, processSuccessfulPayment } from 'src/lib/sslcommerz/gateway';
import { queryDb } from 'src/lib/database/db';

export async function POST(request: any) {
  try {
    const origin = getBaseUrl(request);
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
      return NextResponse.redirect(`${origin}/creator/checkout?status=error&message=missing_val_id`, 303);
    }

    const validation = await validateSslcommerzPayment(valId);

    if (!validation.isValid) {
      if (paymentId) {
        await queryDb(`UPDATE payments SET status = 'failed', gateway_response = $1 WHERE id = $2`, [
          JSON.stringify(validation.raw || bodyData),
          paymentId,
        ]);
      }
      return NextResponse.redirect(`${origin}/creator/checkout?status=failed&tranId=${tranId || ''}`, 303);
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

    const targetCreatorId = bodyData.value_c || (resolvedPaymentId ? (await queryDb(`SELECT creator_id FROM payments WHERE id = $1 LIMIT 1`, [resolvedPaymentId])).rows[0]?.creator_id : null);
    if (targetCreatorId && resolvedPaymentId) {
      return NextResponse.redirect(
        `${origin}/creator/${targetCreatorId}/payments/${resolvedPaymentId}?status=success&tranId=${tranId || ''}`,
        303
      );
    }

    return NextResponse.redirect(
      `${origin}/creator/checkout?status=success&purchaseId=${purchaseId || ''}&paymentId=${resolvedPaymentId || ''}&tranId=${tranId || ''}`,
      303
    );
  } catch (err: any) {
    const origin = getBaseUrl(request);
    return NextResponse.redirect(`${origin}/creator/checkout?status=error&message=${encodeURIComponent(err.message)}`, 303);
  }
}
