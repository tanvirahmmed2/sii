# Creator Panel Implementation Plan: Subscriptions, Multi-Subscription Workspaces & Official Invoicing

This document outlines the detailed architecture and changes implemented for the Creator Panel to support multi-subscription viewing, package-bound website creation with quota enforcement, and official printable subscription receipts in `lib/receipts`.

---

## 1. Database & Schema Architecture (`psql/schema.psql`)

### 1.1 Structural Changes
- **`websites` Table**:
  - Added `subscription_id BIGINT REFERENCES subscriptions(id) ON DELETE SET NULL`
  - Created index `idx_websites_subscription_id ON websites(subscription_id)`
  - Retained `package_id BIGINT REFERENCES packages(id)` for package definitions.
  - Enables exact 1-to-N mapping between a creator's specific purchased subscription instance and the websites provisioned under it.

### 1.2 Relationship Model
```
creators (1)
   ├── purchases (1..N) ── payments (1..N)
   ├── subscriptions (1..N) [points to package_id & purchase_id]
   └── websites (1..N) [points to package_id & subscription_id]
```

---

## 2. Official Subscription Receipt Engine (`src/lib/receipts/subscription_receipt.js`)

A dedicated receipt generator adhering to the design conventions of existing school document generators (`student_fee.js`, `admission_fee.js`), tailored for SaaS subscription transactions:

### 2.1 Displayed Information
1. **Platform / Issuer Details**:
   - Platform Name (`SITE_NAME` e.g., "Hiesci" / `COMPANY_NAME` "EduCraft Technologies Inc.")
   - Corporate Address (`SITE_ADDRESS`)
   - Official Phone / Contact (`SITE_CONTACT`)
   - Official Support Email (`SITE_MAIL`)
   - Platform Website URL (`COMPANY_URL`)
2. **Creator / Client (Billed To) Details**:
   - Creator Name (`creator.name`)
   - Institution Name (`creator.institution`)
   - Email (`creator.email`)
   - Phone (`creator.phone`)
   - Address (`creator.address`)
3. **Transaction & Invoicing Meta**:
   - Official Receipt / Invoice No (`payment.transaction_id || payment.id`)
   - Purchase / Order Code (`purchase.purchase_code`)
   - Transaction Date (`payment.payment_date || payment.created_at`)
   - Payment Gateway / Method (bKash, Paddle, Card, Developer Grant)
   - Status Badge (`PAID` / `PENDING`)
4. **Subscription Package Specification** (Excludes internal modules as requested; highlights essential academic quotas):
   - Package Name (`package.name`)
   - Tagline / Tier Description
   - Billing Cycle (`monthly`, `yearly`, `custom`)
   - Validity Period (`current_period_start` to `current_period_end`)
   - Website Limit (`max_websites`)
   - Teacher Capacity (`max_teachers`)
   - Student Capacity (`max_students`)
   - Cloud Storage Limit (`max_storage_mb` MB)
5. **Financial Breakdown**:
   - Base Amount
   - Total Paid / Settled
   - Currency (BDT / USD)
   - Amount in Words (dynamic number-to-words converter)
6. **Print & PDF Support**:
   - Standard `@media print` styling, crisp margins, high-contrast printing, stamp & signature section.
   - `printSubscriptionReceipt(paymentData, creatorData, packageData)` window opener.

---

## 3. API Updates

### 3.1 `src/app/api/marketing/creator/route.js`
- **GET**:
  - Fetches and aggregates **all** subscriptions for `creator_id` from `subscriptions s` joined with `packages p`, `purchases pu`, and `payments pay`.
  - Calculates per-subscription website counts: `(SELECT COUNT(*)::int FROM websites WHERE subscription_id = s.id OR (subscription_id IS NULL AND package_id = s.package_id))`.
  - Computes `activeSubscriptions` (where `status = 'active'` and `current_period_end > CURRENT_TIMESTAMP`).
  - Returns `subscriptions: [...]`, `activeSubscriptions: [...]`, and backwards-compatible `activeSubscription`.

### 3.2 `src/app/api/marketing/creator/subscriptions/route.js`
- **GET**: Returns complete list of all creator subscriptions with package details and website counts.
- **POST (`purchase_subscription`)**: Inserts into both `purchases` and `subscriptions` tables so that new subscriptions are immediately active and trackable.

### 3.3 `src/app/api/marketing/creator/websites/route.js`
- **POST (`create_website` / `setup_website`)**:
  - Accepts `subscriptionId` (and fallback `packageId`).
  - Checks if the selected subscription exists, belongs to the creator, and is active.
  - Queries `package.max_websites` for the specific subscription.
  - Counts existing websites provisioned under this subscription:
    ```sql
    SELECT COUNT(*)::int AS count FROM websites
    WHERE creator_id = $1 AND (subscription_id = $2 OR (subscription_id IS NULL AND package_id = $3))
    ```
  - Enforces quota: if `count >= max_websites`, returns a descriptive 403 error:
    `"Your subscription package "${packageName}" allows up to ${maxLimit} website(s). You have already created ${count}."`
  - Inserts `subscription_id` into `websites`.
  - Updates `subscriptions.website_id = newWebsite.id` if not set.

### 3.4 `src/app/api/marketing/creator/payments/route.js`
- Enriches payment records with linked creator info (`creators` table) and full package quota details (`packages` table) for complete receipt printing.

---

## 4. Frontend Route Implementations

### 4.1 `/creator/[id]/subscription` (`src/app/(creator)/creator/[id]/subscription/page.jsx`)
- Displays all purchased subscriptions (Active, Past Due, Expired).
- For each subscription:
  - Plan name, status badge, price & billing interval.
  - Validity dates, days remaining counter.
  - Quota breakdown: Websites used vs allowed (e.g., `0 of 1`), max teachers, max students, storage.
  - Action buttons:
    - "Create Website for this Plan" (navigates to `/creator/[id]/workspace/new?subscriptionId=...`).
    - "Workspace".
    - "View Receipt / Invoice" (links to `/creator/[id]/payments/[paymentId]`).
- Provisioned Websites section showing which subscription each website belongs to.

### 4.2 `/creator/[id]/workspace` (`src/app/(creator)/creator/[id]/workspace/page.jsx`)
- Prominent "Purchased Subscriptions & Allocations" banner showing all active purchased packages.
- Visual quota badges on each subscription card (e.g. `0 of 1 Websites Used`, `30 Max Teachers`).
- Modal / Workspace creation with subscription selector:
  - If multiple subscriptions exist, creator chooses which subscription to provision under.
  - Shows remaining quota per subscription.
  - Disables subscription options whose quota has been exhausted.
- Website list cards display associated subscription plan tag.

### 4.3 `/creator/[id]/workspace/new` (`src/app/(creator)/creator/[id]/workspace/new/page.jsx`)
- Supports `?subscriptionId=...` URL parameter to pre-select subscription.
- Displays subscription selector cards showing available slots and teacher/student quotas.
- Validates that the selected subscription has available website creation slots before submitting.

### 4.4 `/creator/[id]/payments/[paymentId]` (`src/app/(creator)/creator/[id]/payments/[paymentId]/page.jsx`)
- Implements the complete official receipt layout using `generateSubscriptionReceiptHTML`.
- "Print Receipt" button launches the official printable receipt directly via `printSubscriptionReceipt`.
- Features company/platform credentials, creator billing information, package details (name, websites, teachers, students), and formal payment status.

### 4.5 `/creator/[id]/payments` (`src/app/(creator)/creator/[id]/payments/page.jsx`)
- Adds direct "Print Receipt" action to the payment list table.

---

## 5. Verification & Testing
1. Test viewing `/creator/2/subscription` with existing Creator 2 subscriptions (Academia & Infinte Campus).
2. Test `/creator/2/workspace` and `/creator/2/workspace/new` with subscription selection and quota checks.
3. Test creating a website for a specific subscription and verify quota decrement.
4. Test viewing and printing official receipt for `/creator/2/payments/8`.
