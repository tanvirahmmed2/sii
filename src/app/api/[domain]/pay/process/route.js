import { NextResponse } from "next/server";
import pool from "@/lib/database/db";
import { initiatePayment } from "@/lib/tenant-gateways/dispatcher.js";

export async function POST(request, { params }) {
  const { domain } = await params;
  const client = await pool.connect();

  try {
    const body = await request.json();
    const {
      purpose = "education_fees",
      invoiceRef,
      studentId = null,
      hostelId = null,
      amount,
      payerName,
      payerEmail,
      payerPhone,
      preferredGateway = null,
      currency = null
    } = body;

    if (!amount || Number(amount) <= 0) {
      return NextResponse.json({ error: "Valid payment amount is required." }, { status: 400 });
    }

    await client.query("BEGIN");

    const webRes = await client.query(
      `SELECT w.id, w.name, w.currency, w.creator_id 
       FROM websites w 
       WHERE LOWER(w.slug) = LOWER($1) 
          OR EXISTS (SELECT 1 FROM website_domains wd WHERE wd.website_id = w.id AND LOWER(wd.domain) = LOWER($1))
       LIMIT 1`,
      [domain]
    );
    if (webRes.rows.length === 0) {
      throw new Error("Target educational institution not found.");
    }
    const website = webRes.rows[0];

    const paymentResult = await initiatePayment({
      client,
      websiteId: website.id,
      domain,
      purpose,
      invoiceRef,
      studentId,
      amount: Number(amount),
      currency: currency || website.currency || "BDT",
      payerName: payerName || "Student / Guardian",
      payerEmail: payerEmail || null,
      payerPhone: payerPhone || null,
      hostelId,
      preferredGateway
    });

    await client.query("COMMIT");

    return NextResponse.json({
      success: true,
      transactionRecordId: paymentResult.transactionRecordId,
      invoiceRef: paymentResult.invoiceRef,
      gateway: paymentResult.gateway,
      currency: paymentResult.currency,
      grossAmount: paymentResult.amount,
      checkoutUrl: paymentResult.checkoutUrl,
      paymentData: paymentResult.paymentData
    });
  } catch (error) {
    await client.query("ROLLBACK");
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}
