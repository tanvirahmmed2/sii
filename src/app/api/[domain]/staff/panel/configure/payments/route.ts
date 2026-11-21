import { NextResponse } from "next/server";
import pool from "@/lib/database/db";
import { encryptCredentials, decryptCredentials, maskCredentials, mergeCredentials } from "@/lib/tenant-gateways/crypto";
import { testGatewayAccount } from "@/lib/tenant-gateways/dispatcher";
const VALID_GATEWAYS = [
    "bkash",
    "eps",
    "sslcommerz",
    "surjopay",
    "sonali_gateway",
    "sonali_payment",
    "stripe",
    "stripe_connect",
    "paypal",
    "paddle"
];
const FEE_PURPOSES = [
    { code: "all_fees", label: "All Institutional Fees (Universal Default)", description: "Universal routing for student tuition, exam, admission and institutional dues" },
    { code: "education_fees", label: "Education / Tuition Fees", description: "Monthly school and college tuition, session charges, laboratory fees" },
    { code: "exam_fees", label: "Examination & Admit Card Fees", description: "Term exams, semester finals, practical assessments, board registration" },
    { code: "admission_fees", label: "Admission Circular & Application Fees", description: "Online admission form purchase, applicant registration, entrance tests" },
    { code: "residential_fees", label: "Residential Hall & Hostel Fees", description: "Dormitory rent, dining charges, utility fees, seat allocations" },
    { code: "other_fees", label: "Other & Miscellaneous Dues", description: "Library dues, ID card reissuance, certificates, extracurricular activities" }
];
async function getWebsiteByDomain(client: any, domain: any) {
    const res = await client.query(`SELECT w.id, w.name, w.currency, w.creator_id 
     FROM websites w 
     WHERE LOWER(w.slug) = LOWER($1) 
        OR EXISTS (SELECT 1 FROM website_domains wd WHERE wd.website_id = w.id AND LOWER(wd.domain) = LOWER($1))
     LIMIT 1`, [domain]);
    if (res.rows.length === 0)
        throw new Error("Institution website not found.");
    return res.rows[0];
}
function normalizeGatewayCode(code: any) {
    const c = String(code || "").toLowerCase();
    if (c === "stripe_connect")
        return "stripe";
    if (c === "sonali_payment")
        return "sonali_gateway";
    return c;
}
export async function GET(request: any, { params }: any) {
    const { domain } = await params;
    const client = await pool.connect();
    try {
        const website = await getWebsiteByDomain(client, domain);
        const [gatewaysRes, accountsRes, purposesRes, currenciesRes, hostelsRes] = await Promise.all([
            client.query(`SELECT code, name, category, description, supported_currencies, credential_schema, logo_icon, website_url 
         FROM website_payment_gateways 
         WHERE is_active = TRUE 
         ORDER BY id ASC`),
            client.query(`SELECT id, gateway_code, account_name, account_number, account_type, environment, currency,
                credentials, payout_details, available_balance, pending_escrow_balance, total_platform_fees_paid,
                is_active, is_default, is_verified, notes, created_at, updated_at
         FROM website_payment_gateway_accounts
         WHERE website_id = $1
         ORDER BY is_default DESC, id ASC`, [website.id]),
            client.query(`SELECT pa.id, pa.purpose, pa.hostel_id, pa.title, pa.description, pa.gateway_account_id,
                pa.fallback_gateway_account_id, pa.is_active, pa.allow_student_portal, pa.allow_public_checkout,
                ga.account_name AS primary_account_name, ga.gateway_code AS primary_gateway_code,
                fga.account_name AS fallback_account_name, fga.gateway_code AS fallback_gateway_code
         FROM website_payment_purpose_assignments pa
         LEFT JOIN website_payment_gateway_accounts ga ON ga.id = pa.gateway_account_id
         LEFT JOIN website_payment_gateway_accounts fga ON fga.id = pa.fallback_gateway_account_id
         WHERE pa.website_id = $1
         ORDER BY pa.id ASC`, [website.id]),
            client.query(`SELECT code, name, symbol, exchange_rate, is_base_currency, is_active 
         FROM website_currencies 
         WHERE website_id = $1 
         ORDER BY is_base_currency DESC, code ASC`, [website.id]),
            client.query(`SELECT id, name, code, capacity FROM website_hostels WHERE website_id = $1 ORDER BY name ASC`, [website.id]).catch(() => ({ rows: [] }))
        ]);
        const gatewayMap = new Map();
        gatewaysRes.rows.forEach((gw: any) => gatewayMap.set(gw.code, gw));
        const maskedAccounts = accountsRes.rows.map((acc: any) => {
            const gw = gatewayMap.get(acc.gateway_code);
            const schema = gw?.credential_schema || [];
            const masked = maskCredentials(acc.credentials, schema);
            return {
                ...acc,
                credentials: masked
            };
        });
        const totalAccounts = maskedAccounts.length;
        const activeAccounts = maskedAccounts.filter((a: any) => a.is_active).length;
        const sandboxAccounts = maskedAccounts.filter((a: any) => a.environment === "sandbox").length;
        const liveAccounts = maskedAccounts.filter((a: any) => a.environment === "live").length;
        const assignedRoutes = purposesRes.rows.filter((p: any) => p.gateway_account_id && p.is_active).length;
        return NextResponse.json({
            success: true,
            websiteCurrency: website.currency || "BDT",
            gateways: gatewaysRes.rows,
            accounts: maskedAccounts,
            purposeAssignments: purposesRes.rows,
            assignments: purposesRes.rows,
            currencies: currenciesRes.rows,
            feePurposes: FEE_PURPOSES,
            fee_purposes: FEE_PURPOSES,
            hostels: hostelsRes.rows,
            metrics: {
                totalAccounts,
                activeAccounts,
                sandboxAccounts,
                liveAccounts,
                assignedRoutes,
                totalRoutes: FEE_PURPOSES.length
            }
        });
    }
    catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
    finally {
        client.release();
    }
}
export async function POST(request: any, { params }: any) {
    const { domain } = await params;
    const client = await pool.connect();
    try {
        const website = await getWebsiteByDomain(client, domain);
        const body = await request.json();
        const { action } = body;
        if (action === "TEST_CONNECTION") {
            const { gatewayCode, credentials = {}, environment = "sandbox", accountId = null } = body;
            const normalizedCode = normalizeGatewayCode(gatewayCode);
            if (!VALID_GATEWAYS.includes(normalizedCode)) {
                return NextResponse.json({ success: false, error: `Unsupported gateway: ${gatewayCode}` }, { status: 400 });
            }
            let testCreds = credentials;
            if (accountId) {
                const accRes = await client.query(`SELECT credentials FROM website_payment_gateway_accounts WHERE id = $1 AND website_id = $2`, [accountId, website.id]);
                if (accRes.rows.length > 0) {
                    const existing = decryptCredentials(accRes.rows[0].credentials);
                    testCreds = mergeCredentials(existing, credentials);
                }
            }
            const result = await testGatewayAccount(normalizedCode, testCreds, environment);
            return NextResponse.json(result);
        }
        await client.query("BEGIN");
        if (action === "SET_WEBSITE_CURRENCY") {
            const { currencyCode, symbol = "৳", exchangeRate = 1.0 } = body;
            const cleanCode = String(currencyCode || "BDT").toUpperCase();
            await client.query(`UPDATE websites SET currency = $1 WHERE id = $2`, [cleanCode, website.id]);
            await client.query(`UPDATE website_currencies SET is_base_currency = FALSE WHERE website_id = $1`, [website.id]);
            await client.query(`INSERT INTO website_currencies (website_id, code, name, symbol, exchange_rate, is_base_currency, is_active)
         VALUES ($1, $2, $2, $3, $4, TRUE, TRUE)
         ON CONFLICT (website_id, code)
         DO UPDATE SET is_base_currency = TRUE, is_active = TRUE, exchange_rate = EXCLUDED.exchange_rate`, [website.id, cleanCode, symbol, exchangeRate]);
            await client.query("COMMIT");
            return NextResponse.json({ success: true, baseCurrency: cleanCode });
        }
        if (action === "ADD_MERCHANT_ACCOUNT" || action === "SAVE_MERCHANT_ACCOUNT") {
            const { gatewayCode, accountName, accountNumber = "", accountType = "merchant_payout", environment = "sandbox", currency = website.currency || "BDT", credentials = {}, payoutDetails = {}, purposes = [], isDefault = false, notes = "" } = body;
            const normalizedCode = normalizeGatewayCode(gatewayCode);
            if (!VALID_GATEWAYS.includes(normalizedCode)) {
                throw new Error(`Unsupported gateway code: ${gatewayCode}`);
            }
            if (!accountName || !accountName.trim()) {
                throw new Error("Account name is required.");
            }
            if (isDefault) {
                await client.query(`UPDATE website_payment_gateway_accounts SET is_default = FALSE WHERE website_id = $1`, [website.id]);
            }
            const encryptedCreds = encryptCredentials(credentials);
            const accInsert = await client.query(`INSERT INTO website_payment_gateway_accounts (
           website_id, gateway_code, account_name, account_number, account_type,
           environment, currency, payout_details, credentials, is_active, is_default, is_verified, notes
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE, $10, TRUE, $11)
         RETURNING *`, [
                website.id,
                normalizedCode,
                accountName.trim(),
                accountNumber ? accountNumber.trim() : null,
                accountType,
                environment === "live" ? "live" : "sandbox",
                currency.toUpperCase(),
                JSON.stringify(payoutDetails),
                JSON.stringify(encryptedCreds),
                Boolean(isDefault),
                notes || null
            ]);
            const newAccount = accInsert.rows[0];
            if (Array.isArray(purposes) && purposes.length > 0) {
                for (const purpose of purposes) {
                    await client.query(`INSERT INTO website_payment_purpose_assignments (
               website_id, purpose, title, gateway_account_id, is_active
             ) VALUES ($1, $2, $3, $4, TRUE)
             ON CONFLICT (website_id, purpose, COALESCE(hostel_id, 0))
             DO UPDATE SET gateway_account_id = EXCLUDED.gateway_account_id, is_active = TRUE`, [website.id, purpose, `${purpose.replace(/_/g, " ").toUpperCase()} Route`, newAccount.id]);
                }
            }
            await client.query("COMMIT");
            return NextResponse.json({
                success: true,
                account: {
                    ...newAccount,
                    credentials: maskCredentials(credentials)
                }
            });
        }
        if (action === "UPDATE_MERCHANT_ACCOUNT") {
            const { accountId, gatewayCode, accountName, accountNumber, accountType = "merchant_payout", environment, currency, credentials = {}, payoutDetails = {}, isActive = true, isDefault = false, notes = "" } = body;
            if (!accountId)
                throw new Error("Account ID is required for update.");
            const existingRes = await client.query(`SELECT * FROM website_payment_gateway_accounts WHERE id = $1 AND website_id = $2`, [accountId, website.id]);
            if (existingRes.rows.length === 0)
                throw new Error("Gateway account not found.");
            const existing = existingRes.rows[0];
            const mergedPlainCreds = mergeCredentials(existing.credentials, credentials);
            const encryptedCreds = encryptCredentials(mergedPlainCreds);
            if (isDefault) {
                await client.query(`UPDATE website_payment_gateway_accounts SET is_default = FALSE WHERE website_id = $1`, [website.id]);
            }
            const normalizedCode = gatewayCode ? normalizeGatewayCode(gatewayCode) : existing.gateway_code;
            const updateRes = await client.query(`UPDATE website_payment_gateway_accounts
         SET gateway_code = $1,
             account_name = $2,
             account_number = $3,
             account_type = $4,
             environment = $5,
             currency = $6,
             credentials = $7,
             payout_details = $8,
             is_active = $9,
             is_default = $10,
             notes = $11,
             updated_at = NOW()
         WHERE id = $12 AND website_id = $13
         RETURNING *`, [
                normalizedCode,
                accountName ? accountName.trim() : existing.account_name,
                accountNumber !== undefined ? (accountNumber ? accountNumber.trim() : null) : existing.account_number,
                accountType || existing.account_type,
                environment ? (environment === "live" ? "live" : "sandbox") : existing.environment,
                currency ? currency.toUpperCase() : existing.currency,
                JSON.stringify(encryptedCreds),
                payoutDetails ? JSON.stringify(payoutDetails) : existing.payout_details,
                isActive !== undefined ? Boolean(isActive) : existing.is_active,
                Boolean(isDefault),
                notes !== undefined ? notes : existing.notes,
                accountId,
                website.id
            ]);
            await client.query("COMMIT");
            return NextResponse.json({
                success: true,
                account: {
                    ...updateRes.rows[0],
                    credentials: maskCredentials(mergedPlainCreds)
                }
            });
        }
        if (action === "DELETE_MERCHANT_ACCOUNT") {
            const { accountId } = body;
            if (!accountId)
                throw new Error("Account ID is required.");
            const txCheck = await client.query(`SELECT id FROM website_payment_transactions WHERE gateway_account_id = $1 AND status = 'pending' LIMIT 1`, [accountId]);
            if (txCheck.rows.length > 0) {
                throw new Error("Cannot delete account with pending transactions. Deactivate it instead.");
            }
            await client.query(`UPDATE website_payment_purpose_assignments 
         SET gateway_account_id = NULL 
         WHERE gateway_account_id = $1 AND website_id = $2`, [accountId, website.id]);
            await client.query(`UPDATE website_payment_purpose_assignments 
         SET fallback_gateway_account_id = NULL 
         WHERE fallback_gateway_account_id = $1 AND website_id = $2`, [accountId, website.id]);
            await client.query(`DELETE FROM website_payment_gateway_accounts WHERE id = $1 AND website_id = $2`, [accountId, website.id]);
            await client.query("COMMIT");
            return NextResponse.json({ success: true, deletedAccountId: accountId });
        }
        if (action === "ASSIGN_PURPOSES") {
            const { assignments = [] } = body;
            for (const item of assignments) {
                const gwAccId = item.gatewayAccountId || item.gateway_account_id ? Number(item.gatewayAccountId || item.gateway_account_id) : null;
                const fallbackAccId = item.fallbackGatewayAccountId || item.fallback_gateway_account_id ? Number(item.fallbackGatewayAccountId || item.fallback_gateway_account_id) : null;
                const hostelId = item.hostelId || item.hostel_id ? Number(item.hostelId || item.hostel_id) : null;
                await client.query(`INSERT INTO website_payment_purpose_assignments (
             website_id, purpose, hostel_id, title, description,
             gateway_account_id, fallback_gateway_account_id,
             is_active, allow_student_portal, allow_public_checkout
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           ON CONFLICT (website_id, purpose, COALESCE(hostel_id, 0))
           DO UPDATE SET
             title = EXCLUDED.title,
             description = EXCLUDED.description,
             gateway_account_id = EXCLUDED.gateway_account_id,
             fallback_gateway_account_id = EXCLUDED.fallback_gateway_account_id,
             is_active = EXCLUDED.is_active,
             allow_student_portal = EXCLUDED.allow_student_portal,
             allow_public_checkout = EXCLUDED.allow_public_checkout,
             updated_at = NOW()`, [
                    website.id,
                    item.purpose,
                    hostelId,
                    item.title || `${item.purpose} Route`,
                    item.description || null,
                    gwAccId,
                    fallbackAccId,
                    item.is_active !== undefined ? Boolean(item.is_active) : true,
                    item.allow_student_portal !== undefined ? Boolean(item.allow_student_portal) : true,
                    item.allow_public_checkout !== undefined ? Boolean(item.allow_public_checkout) : true
                ]);
            }
            await client.query("COMMIT");
            return NextResponse.json({ success: true });
        }
        throw new Error("Unsupported action.");
    }
    catch (error: any) {
        await client.query("ROLLBACK");
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
    finally {
        client.release();
    }
}
