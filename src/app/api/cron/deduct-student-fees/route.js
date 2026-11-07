import { NextResponse } from "next/server";
import pool from "@/lib/database/db";
import { executePerStudentFeeDeduction } from "@/lib/database/centralGateways";

export async function POST(request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized cron invocation" }, { status: 401 });
  }

  const client = await pool.connect();
  const results = [];

  try {
    const dueSubs = await client.query(
      `SELECT s.website_id
       FROM subscriptions s
       JOIN packages p ON p.id = s.package_id
       WHERE s.status = 'active'
         AND p.charge_model IN ('per_student', 'hybrid')
         AND (s.next_student_fee_deduction_at IS NULL OR s.next_student_fee_deduction_at <= NOW())`
    );

    for (const row of dueSubs.rows) {
      try {
        await client.query("BEGIN");
        const res = await executePerStudentFeeDeduction(client, {
          websiteId: row.website_id,
          triggerReason: "per_student_cycle",
        });
        await client.query("COMMIT");
        results.push(res);
      } catch (err) {
        await client.query("ROLLBACK");
        results.push({ websiteId: row.website_id, error: err.message });
      }
    }

    return NextResponse.json({
      success: true,
      processedCount: results.length,
      results,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}