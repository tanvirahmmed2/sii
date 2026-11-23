import { NextResponse } from 'next/server';
import { getBaseUrl } from 'src/lib/database/secret';
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

    const tranId = bodyData.tran_id;
    const paymentId = bodyData.value_b ? Number(bodyData.value_b) : null;
    const errorMsg = bodyData.error || bodyData.failedreason || 'Payment failed';

    if (paymentId) {
      await queryDb(
        `UPDATE payments SET status = 'failed', gateway_response = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
        [JSON.stringify(bodyData), paymentId]
      );
    } else if (tranId) {
      await queryDb(
        `UPDATE payments SET status = 'failed', gateway_response = $1, updated_at = CURRENT_TIMESTAMP WHERE transaction_id = $2`,
        [JSON.stringify(bodyData), tranId]
      );
    }

    const targetCreatorId = bodyData.value_c || (paymentId ? (await queryDb(`SELECT creator_id FROM payments WHERE id = $1 LIMIT 1`, [paymentId])).rows[0]?.creator_id : null);
    if (targetCreatorId && paymentId) {
      return NextResponse.redirect(
        `${origin}/creator/${targetCreatorId}/payments/${paymentId}/pay?status=failed&tranId=${tranId || ''}&error=${encodeURIComponent(errorMsg)}`,
        303
      );
    }

    return NextResponse.redirect(
      `${origin}/creator/checkout?status=failed&tranId=${tranId || ''}&error=${encodeURIComponent(errorMsg)}`,
      303
    );
  } catch (err: any) {
    const origin = getBaseUrl(request);
    return NextResponse.redirect(`${origin}/creator/checkout?status=error&message=${encodeURIComponent(err.message)}`, 303);
  }
}
