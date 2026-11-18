# Enterprise Multi-Tenant Payment Gateway System Implementation Plan

## 1. Executive Summary & Architecture Overview

The Tenant Payment Gateway System enables educational institutions (tenants) operating under their custom domains (`[domain]`) to connect, manage, and process payments through their own merchant gateway accounts. 

### Supported Gateways (8 Providers)
1. **bKash Tokenized Checkout** (`bkash`): Direct tokenized MFS payments for Bangladesh.
2. **Easy Payment System** (`eps`): Electronic Payment System for local bank accounts and MFS in Bangladesh.
3. **SSLCommerz** (`sslcommerz`): Bangladeshi multi-channel payment gateway (cards, mobile banking, internet banking).
4. **Shurjopay** (`surjopay`): Bangladeshi payment aggregator for educational institutions and MFS.
5. **Sonali Bank e-Payment Gateway** (`sonali_gateway` / `sonali_payment`): Treasury and public educational fees processing.
6. **Stripe Connect & Direct** (`stripe` / `stripe_connect`): Global card processing and international multi-currency checkouts.
7. **PayPal Commerce Platform** (`paypal`): PayPal smart buttons, wallet, and international credit cards.
8. **Paddle Billing** (`paddle`): Merchant-of-record global tax-compliant checkout.

---

## 2. Core Functional Requirements

### 2.1 Credential Security & AES-256-GCM Encryption
- All sensitive merchant credentials (API keys, secret keys, passwords, private keys, webhook secrets) stored in `website_payment_gateway_accounts.credentials` must be encrypted at rest using AES-256-GCM.
- Encryption format: JSON payload containing `{ ciphertext, iv, auth_tag, v: 1 }`.
- Key management: Derives 256-bit key from `TENANT_GATEWAY_ENCRYPTION_KEY` or `JWT_SECRET`.
- Sensitive values are automatically masked (`••••••••••••`) when fetched by the staff panel. Unmasked secrets are never returned to client browsers.
- In-flight updates safely merge unchanged masked values without overwriting existing encrypted secrets.

### 2.2 Payment Purpose Routing (Universal vs. Task-Specific)
Tenants can route transactions in two modes:
1. **Universal Assignment (`all_fees`)**: Single primary gateway (and optional fallback) handling student tuition, admissions, exams, hostel fees, and library charges.
2. **Task-Specific Assignment**: Separate gateways assigned per fee category:
   - `admission_fees`: Admission circulars & form purchases.
   - `education_fees`: Monthly tuition, session fees, development charges.
   - `exam_fees`: Semester finals, admit card generation, board fees.
   - `residential_fees`: Hostel/hall seat rent and dining fees (with optional per-hostel override).
   - `other_fees`: Fines, library fees, certificates, extracurriculars.

### 2.3 Staff Panel Management & Gateway Account Inspection
- Staff panel (`/staff-panel/configure-payments` and `/staff-panel/settings`) provides:
  - Account listing with live/sandbox badge, currency, verification status, and balance.
  - Detailed gateway account drawer displaying transactions volume, fees paid, ledger balances, and last test ping.
  - Credential editor tailored dynamically to each of the 8 gateways.
  - Real-time "Test Connection" API validating credentials against provider endpoints.
  - Purpose routing matrix with toggle between Universal and Modular fee assignments.

### 2.4 Checkout & Transaction Execution
- Students / applicants initiate checkout for pending dues or admission applications.
- Dispatcher dynamically resolves tenant credentials, initiates remote payment session with the chosen gateway driver, and returns payment URL or token.
- Webhook/callback endpoints verify digital signatures, update `website_payment_transactions`, and settle corresponding student invoices / admission applications.

---

## 3. Database Schema Specifications

### 3.1 Gateway Catalog (`website_payment_gateways`)
Ensure all 8 gateways are registered in `website_payment_gateways` with proper schemas:
- `bkash`: `app_key`, `app_secret`, `username`, `password`.
- `eps`: `merchant_id`, `store_id`, `username`, `password`, `hash_key`.
- `sslcommerz`: `store_id`, `store_passwd`.
- `surjopay`: `merchant_username`, `merchant_password`, `merchant_prefix`.
- `sonali_gateway`: `portal_id`, `secret_key`, `merchant_id`.
- `stripe`: `publishable_key`, `secret_key`, `webhook_secret`, `account_id` (optional).
- `paypal`: `client_id`, `client_secret`, `webhook_id`.
- `paddle`: `vendor_id`, `api_key`, `client_token`, `webhook_secret`.

### 3.2 Merchant Accounts (`website_payment_gateway_accounts`)
- Fields: `id`, `website_id`, `gateway_code`, `account_name`, `account_number`, `environment` (`sandbox`/`live`), `currency`, `credentials` (encrypted JSONB), `payout_details`, `available_balance`, `is_active`, `is_default`, `is_verified`, `last_tested_at`.

### 3.3 Purpose Assignments (`website_payment_purpose_assignments`)
- Fields: `id`, `website_id`, `purpose`, `title`, `hostel_id`, `gateway_account_id`, `fallback_gateway_account_id`, `allow_student_portal`, `allow_public_checkout`, `is_active`.

### 3.4 Transaction Ledger (`website_payment_transactions`)
- Fields: `id`, `website_id`, `gateway_account_id`, `gateway_code`, `purpose`, `invoice_ref`, `student_id`, `payer_name`, `gross_amount`, `platform_commission_amount`, `merchant_net_amount`, `currency`, `status`, `transaction_id`, `gateway_reference`, `paid_at`.

---

## 4. Library Architecture (`src/lib/tenant-gateways/`)

- `crypto.js`: AES-256-GCM encryption, decryption, credential masking, secret merging.
- `bkash.js`: bKash Tokenized Checkout (Grant Token, Create Payment, Execute Payment, Query Payment).
- `eps.js`: Easy Payment System (Session Init, Hash Generation, Payment Verification).
- `sslcommerz.js`: SSLCommerz (Session Init, Validation API, IPN Check).
- `surjopay.js`: Shurjopay v2 (Authentication Token, Secret Verification, Decrypt/Verify Response).
- `sonali.js`: Sonali Bank e-Payment Gateway (Portal Check, Hash Signature, IPN Verification).
- `stripe.js`: Stripe Checkout Sessions & Webhook Signature Verification.
- `paypal.js`: PayPal REST API v2 (OAuth2 Token, Create Order, Capture Order).
- `paddle.js`: Paddle Billing API v2 (Create Transaction, Webhook Signature Check).
- `dispatcher.js`: Central orchestrator resolving institution gateway, decrypting credentials, dispatching execution, and handling unified callback/webhook processing.

---

## 5. API Routes Specification

1. `GET /api/[domain]/staff/panel/configure/payments`:
   - Returns gateway catalog (8 providers), existing accounts (with masked credentials), purpose routing matrix, website currencies, and summary metrics.
2. `POST /api/[domain]/staff/panel/configure/payments`:
   - Actions: `ADD_MERCHANT_ACCOUNT`, `UPDATE_MERCHANT_ACCOUNT`, `DELETE_MERCHANT_ACCOUNT`, `TEST_CONNECTION`, `ASSIGN_PURPOSES`, `SET_WEBSITE_CURRENCY`.
3. `POST /api/[domain]/pay/process`:
   - Accepts invoice reference, purpose, amount, and payer details.
   - Resolves assigned gateway, initializes checkout via gateway driver, records transaction, and returns checkout URL.
4. `GET/POST /api/[domain]/pay/callback`:
   - User redirect landing page verifying transaction result and displaying receipt.
5. `POST /api/[domain]/pay/webhook`:
   - Server-to-server IPN listener settling student invoices and logging transaction status.

---

## 6. Frontend Component Architecture

1. `src/component/payment/TenantPaymentCheckoutModal.jsx`:
   - Modern, responsive payment modal for students/parents paying school fees.
   - Selects available gateways (bKash, SSLCommerz, Sonali, Stripe, PayPal, etc.) based on task routing.
   - Direct redirect or embedded tokenized flow.
2. `src/app/[domain]/(staffs)/staff-panel/configure-payments/page.jsx`:
   - Redesigned for all 8 gateways with dynamic field renderers.
   - Masked credentials toggle, environment switcher (sandbox/live).
   - "Test Connection" button with live status indicator.
   - Tab for Universal vs. Task-Specific Routing (`education_fees`, `exam_fees`, `admission_fees`, `residential_fees`, `other_fees`).
   - Account detail drawer showing ledger metrics, currency, and verification timestamp.

---

## 7. Implementation Roadmap & Milestones

1. **Phase 1: Database Migration**:
   - Seed and update all 8 gateways in `website_payment_gateways`.
   - Ensure foreign keys and indexes are optimized.
2. **Phase 2: Encryption & Security Engine**:
   - Implement `src/lib/tenant-gateways/crypto.js` with AES-256-GCM.
3. **Phase 3: Gateway Drivers & Dispatcher**:
   - Build individual drivers for bKash, EPS, SSLCommerz, Shurjopay, Sonali Bank, Stripe, PayPal, Paddle.
   - Build `dispatcher.js` for payment initiation and verification.
4. **Phase 4: Staff Panel Backend API**:
   - Update `/api/[domain]/staff/panel/configure/payments/route.js` for encryption, validation, test pings, and CRUD.
5. **Phase 5: Staff Panel Frontend**:
   - Update configure-payments page to support all 8 gateways, masked secrets, test connections, and purpose routing.
6. **Phase 6: Public Checkout API & Frontend Modal**:
   - Connect `/api/[domain]/pay/process`, callback, and webhook endpoints.
   - Build `TenantPaymentCheckoutModal.jsx`.
7. **Phase 7: Verification & Compliance**:
   - Zero comments, zero placeholders, zero alerts/confirms.
   - Full Babel parsing and end-to-end integration test.
