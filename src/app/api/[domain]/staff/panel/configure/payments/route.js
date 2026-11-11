import { NextResponse } from "next/server";
import pool from "@/lib/database/db";

async function getWebsiteByDomain(client, domain) {
  const res = await client.query(
    `SELECT w.id, w.name, w.currency, w.creator_id 
     FROM websites w 
     WHERE LOWER(w.slug) = LOWER($1) 
        OR EXISTS (SELECT 1 FROM website_domains wd WHERE wd.website_id = w.id AND LOWER(wd.domain) = LOWER($1))
     LIMIT 1`,
    [domain]
  );
  if (res.rows.length === 0) throw new Error("Institution website not found.");
  return res.rows[0];
}

export async function GET(request, { params }) {
  const { domain } = await params;
  const client = await pool.connect();
  try {
    const website = await getWebsiteByDomain(client, domain);

    const [gatewaysRes, accountsRes, purposesRes, currenciesRes] = await Promise.all([
      client.query(`SELECT code, name, category, description, supported_currencies, credential_schema FROM website_payment_gateways WHERE is_active = TRUE ORDER BY id ASC`),
      client.query(
        `SELECT id, gateway_code, account_name, account_number, account_type, environment, currency,
                payout_details, available_balance, pending_escrow_balance, total_platform_fees_paid, is_active, is_default, created_at
         FROM website_payment_gateway_accounts
         WHERE website_id = $1
         ORDER BY is_default DESC, id ASC`,
        [website.id]
      ),
      client.query(
        `SELECT pa.id, pa.purpose, pa.hostel_id, pa.title, pa.gateway_account_id,
                pa.fallback_gateway_account_id, pa.is_active,
                ga.account_name AS primary_account_name, ga.gateway_code AS primary_gateway_code
         FROM website_payment_purpose_assignments pa
         LEFT JOIN website_payment_gateway_accounts ga ON ga.id = pa.gateway_account_id
         WHERE pa.website_id = $1
         ORDER BY pa.id ASC`,
        [website.id]
      ),
      client.query(`SELECT code, name, symbol, exchange_rate, is_base_currency, is_active FROM website_currencies WHERE website_id = $1 ORDER BY is_base_currency DESC, code ASC`, [website.id]),
    ]);

    return NextResponse.json({
      websiteCurrency: website.currency,
      gateways: gatewaysRes.rows,
      accounts: accountsRes.rows,
      purposeAssignments: purposesRes.rows,
      currencies: currenciesRes.rows,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  } finally {
    client.release();
  }
}

export async function POST(request, { params }) {
  const { domain } = await params;
  const client = await pool.connect();
  try {
    const website = await getWebsiteByDomain(client, domain);
    const body = await request.json();
    const { action } = body;

    await client.query("BEGIN");

    if (action === "SET_WEBSITE_CURRENCY") {
      const { currencyCode, symbol = "৳", exchangeRate = 1.0 } = body;
      await client.query(`UPDATE websites SET currency = $1 WHERE id = $2`, [currencyCode.toUpperCase(), website.id]);

      await client.query(
        `UPDATE website_currencies SET is_base_currency = FALSE WHERE website_id = $1`,
        [website.id]
      );
      await client.query(
        `INSERT INTO website_currencies (website_id, code, name, symbol, exchange_rate, is_base_currency, is_active)
         VALUES ($1, $2, $2, $3, $4, TRUE, TRUE)
         ON CONFLICT (website_id, code)
         DO UPDATE SET is_base_currency = TRUE, is_active = TRUE, exchange_rate = EXCLUDED.exchange_rate`,
        [website.id, currencyCode.toUpperCase(), symbol, exchangeRate]
      );

      await client.query("COMMIT");
      return NextResponse.json({ success: true, baseCurrency: currencyCode.toUpperCase() });
    }

    if (action === "ADD_MERCHANT_ACCOUNT") {
      const {
        gatewayCode,      
        accountName,      
        accountNumber,    
        accountType = "merchant_payout",
        currency = website.currency || "BDT",
        payoutDetails = {}, 
        purposes = [],      
        isDefault = false,
      } = body;

      const normalizedGatewayCode = gatewayCode === 'stripe_connect' || gatewayCode === 'stripe' ? 'paddle' : gatewayCode;

      if (!["surjopay", "paypal", "paddle"].includes(normalizedGatewayCode)) {
        throw new Error("Invalid gateway_code. Must be surjopay, paypal, or paddle.");
      }

      if (isDefault) {
        await client.query(`UPDATE website_payment_gateway_accounts SET is_default = FALSE WHERE website_id = $1`, [website.id]);
      }

      const accInsert = await client.query(
        `INSERT INTO website_payment_gateway_accounts (
           website_id, gateway_code, account_name, account_number, account_type,
           environment, currency, payout_details, credentials, is_active, is_default, is_verified
         ) VALUES ($1, $2, $3, $4, $5, 'live', $6, $7, $7, TRUE, $8, TRUE)
         RETURNING *`,
        [
          website.id,
          normalizedGatewayCode,
          accountName,
          accountNumber,
          accountType,
          currency.toUpperCase(),
          JSON.stringify(payoutDetails),
          Boolean(isDefault),
        ]
      );
      const newAccount = accInsert.rows[0];

      for (const purpose of purposes) {
        await client.query(
          `INSERT INTO website_payment_purpose_assignments (
             website_id, purpose, title, gateway_account_id, is_active
           ) VALUES ($1, $2, $3, $4, TRUE)
           ON CONFLICT (website_id, purpose, COALESCE(hostel_id, 0))
           DO UPDATE SET gateway_account_id = EXCLUDED.gateway_account_id, is_active = TRUE`,
          [website.id, purpose, `${purpose.replace("_", " ").toUpperCase()} Route`, newAccount.id]
        );
      }

      await client.query("COMMIT");
      return NextResponse.json({ success: true, account: newAccount });
    }

    if (action === "ASSIGN_PURPOSES") {
      const { assignments } = body; 

      for (const item of assignments) {
        await client.query(
          `INSERT INTO website_payment_purpose_assignments (
             website_id, purpose, hostel_id, title, gateway_account_id, fallback_gateway_account_id, is_active
           ) VALUES ($1, $2, $3, $4, $5, $6, TRUE)
           ON CONFLICT (website_id, purpose, COALESCE(hostel_id, 0))
           DO UPDATE SET
             gateway_account_id = EXCLUDED.gateway_account_id,
             fallback_gateway_account_id = EXCLUDED.fallback_gateway_account_id,
             is_active = TRUE`,
          [
            website.id,
            item.purpose,
            item.hostelId || null,
            item.title || `${item.purpose} Routing`,
            item.gatewayAccountId,
            item.fallbackGatewayAccountId || null,
          ]
        );
      }

      await client.query("COMMIT");
      return NextResponse.json({ success: true });
    }

    throw new Error("Unsupported action.");
  } catch (error) {
    await client.query("ROLLBACK");
    return NextResponse.json({ error: error.message }, { status: 400 });
  } finally {
    client.release();
  }
}