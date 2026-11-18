import fs from 'fs';

let env = fs.readFileSync('.env', 'utf8');

const marker = '# ============================================================================';
const idx = env.indexOf(marker);
if (idx !== -1) {
  env = env.substring(0, idx).trimEnd() + '\n\n';
}

const epsConfig = `EPS_MODE="sandbox"
EPS_MERCHANT_ID="EPS_MERCHANT_TEST_001"
EPS_STORE_ID="EPS_STORE_MAIN_01"
EPS_USERNAME="eps_test_user"
EPS_PASSWORD="eps_test_password_2026"
EPS_HASH_KEY="eps_secret_hash_key_super_secure_987654"
EPS_API_URL="https://sandbox.eps.com.bd"
EPS_RETURN_URL="http://localhost:3000/api/webhooks/eps-ipn"
EPS_CANCEL_URL="http://localhost:3000/creator"
`;

if (!env.includes('EPS_MODE')) {
  env += '\n' + epsConfig;
  fs.writeFileSync('.env', env, 'utf8');
}
