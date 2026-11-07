import fs from 'fs';

let env = fs.readFileSync('.env', 'utf8');

const marker = '# ============================================================================';
const idx = env.indexOf(marker);
if (idx !== -1) {
  env = env.substring(0, idx).trimEnd() + '\n\n';
}

const newGatewayConfig = `# ============================================================================
# 1. SHURJOPAY (Master Gateway for BDT & Intl Cards -> BDT Settlement)
# ============================================================================
SHURJOPAY_ENGINE_URL="https://engine.shurjopayment.com"
SHURJOPAY_USERNAME="sp_live_username"
SHURJOPAY_PASSWORD="sp_live_password"
SHURJOPAY_PREFIX="SII"
SHURJOPAY_RETURN_URL="https://educraft.io/api/webhooks/central-payment?gateway=surjopay"
SHURJOPAY_CANCEL_URL="https://educraft.io/payment/cancel"

# ============================================================================
# 2. PAYPAL COMMERCE / REST API (Global USD Checkout & Split Payouts)
# ============================================================================
PAYPAL_API_URL="https://api-m.paypal.com"
PAYPAL_CLIENT_ID="your_paypal_client_id"
PAYPAL_CLIENT_SECRET="your_paypal_client_secret"
PAYPAL_PARTNER_ATTRIBUTION_ID="your_bn_code_optional"
PAYPAL_WEBHOOK_ID="your_paypal_webhook_id"

# ============================================================================
# 3. PADDLE BILLING (Global USD / Multi-Currency Cards & Tax Compliance)
# ============================================================================
PADDLE_API_KEY="padd_live_..."
PADDLE_ENVIRONMENT="sandbox"
PADDLE_CLIENT_TOKEN=""
PADDLE_WEBHOOK_SECRET="padd_wsec_..."

# ============================================================================
# 4. SYSTEM URLS & CRON SECURITY
# ============================================================================
NEXT_PUBLIC_APP_URL="https://educraft.io"
CRON_SECRET="super_secret_cron_token_for_per_student_deductions"
`;

env += newGatewayConfig;
fs.writeFileSync('.env', env, 'utf8');
console.log('.env updated successfully with Paddle config');

