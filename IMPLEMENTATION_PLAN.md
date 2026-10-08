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

---

## 6. Staff Role Elimination, Module Permissions, Sessions, Creator Staff Management & Tenant Branding

This phase transitions the platform from a hardcoded staff `role` column to dynamic granular module permissions (`staff_permissions`), establishes multi-device session management (`staff_sessions`), integrates staff administration into the Creator Workspace (`/creator/[id]/workspace/[domain]`), repairs tenant staff authentication APIs & frontend, and delivers custom tenant branding (dynamic favicons, titles, and monogram/logo loaders).

### 6.1 Database Architecture & Schema Modernization (`psql/website_tables.psql` & Live Neon Database)
1. **Drop Legacy `role` Column from `website_staffs`**:
   - `ALTER TABLE website_staffs DROP COLUMN IF EXISTS role;`
   - All authorization transitions to the dynamic module permission matrix.
2. **Create `staff_permissions` Table**:
   - Defines granular CRUD access for tenant modules (`sis`, `attendance`, `routine`, `notices`, `hostel`, `fees`, `exams`, `lms`, `accounting`, `staff-payroll`).
   - Columns: `id`, `website_id`, `staff_id`, `tenant_module_id`, `module_slug`, `can_view`, `can_create`, `can_edit`, `can_delete`, `created_at`, `updated_at`.
   - Constraints: `UNIQUE(staff_id, module_slug)`, Foreign Keys with `ON DELETE CASCADE` to `websites(id)`, `website_staffs(id)`, and `tenant_modules(id)`.
   - Trigger: `update_staff_permissions_updated_at`.
3. **Create `staff_sessions` Table**:
   - Tracks active sessions, devices, and tokens across tenant portals.
   - Columns: `id`, `website_id`, `staff_id`, `token`, `ip_address`, `user_agent`, `device_info`, `is_active`, `expires_at`, `last_active_at`, `created_at`, `updated_at`.
   - Constraints: `UNIQUE(token)`, Foreign Keys to `websites(id)` and `website_staffs(id)`.
   - Trigger: `update_staff_sessions_updated_at`.

### 6.2 Staff Middleware & Session Layer (`src/lib/middleware/staff.js` & `src/lib/middleware/developer.js`)
1. **`src/lib/middleware/staff.js`**:
   - `getStaffSession(request)`: Authenticates tenant staff via `fit-staff` cookie or Bearer token, validates against `staff_sessions` (`is_active = TRUE` and `expires_at > CURRENT_TIMESTAMP`), queries `website_staffs`, and loads active `staff_permissions` into a structured permissions map.
   - `createStaffSession({ websiteId, staffId, token, request, expiresAt })`: Issues a session record with IP and User Agent logging.
   - `revokeStaffSession(token)`: Soft-invalidates the specific session.
   - `revokeAllStaffSessions(staffId)`: Invalidates all active sessions for a staff member.
   - `hasStaffModulePermission(staffOrSession, moduleSlug, action = 'view')`: Validates specific action permission for a module.
2. **`src/lib/middleware/developer.js` Updates**:
   - Refactor `getStaffUser`, `isStaff`, `isCashier`, `isRegister`, `isGeneralStaff` to avoid querying nonexistent `staffs` table or `role` column, delegating cleanly to the new staff middleware.

### 6.3 Tenant Staff Auth APIs (`src/app/api/[domain]/staff/*`)
1. **`login/route.js`**:
   - Scopes queries strictly to `website_staffs` by `website_id` (resolved from domain).
   - Validates password using `comparePassword(password, staff.password)`.
   - Handles 2FA if enabled (`is_two_factor_enabled`).
   - On successful credentials, records session in `staff_sessions` and sets HTTP-only `fit-staff` cookie.
   - Returns staff profile along with active `permissions` and `allowedModules`.
2. **`register/route.js`**:
   - Accepts either `token` or `email` lookup in `website_staffs`.
   - Enforces password hashing and updates `address`, `password`, `is_registered = TRUE`, `is_active = TRUE`.
3. **`verify-2fa/route.js` & `resend-2fa/route.js`**:
   - Verifies OTP code in `website_staffs`, clears OTP, registers session in `staff_sessions`, and issues auth cookie.
4. **`recovery/route.js`**:
   - Issues recovery token in `website_staffs` and sends recovery email via Brevo.
   - Validates token on PUT and updates `password`.
5. **`me/route.js`**:
   - Returns current logged-in staff profile, active module permissions, and assigned experiences.
   - PUT allows updating profile information and changing password with current password verification.
6. **`logout/route.js`**:
   - Revokes session in `staff_sessions` and clears `fit-staff` cookie.
7. **`route.js`**:
   - Returns list of active public staff members for the tenant website.

### 6.4 Creator Workspace Staff Management (`/creator/[id]/workspace/[domain]`)
1. **API Endpoint (`src/app/api/marketing/creator/websites/staffs/route.js`)**:
   - `GET`: Lists all staff for the specified `website_id` with their module permissions and session count, alongside the available `tenant_modules`.
   - `POST`: Creator adds a new staff member with credentials, basic info, and initial module permissions (`can_view`, `can_create`, `can_edit`, `can_delete`).
   - `PUT`: Creator updates staff details, toggles `is_active`, or modifies module permissions.
   - `DELETE`: Creator deletes staff member or terminates all active sessions.
2. **Frontend Tab: "Staff & Permissions" in `src/app/(creator)/creator/[id]/workspace/[domain]/page.jsx`**:
   - Built strictly adhering to `STYLE.md` (no icons/SVGs, `rounded` 4px, `font-medium`/`font-semibold`, full-width `w-full`).
   - Features:
     - High-density Staff Roster with status badges (Active/Inactive, Registered/Pending).
     - Module Permissions Matrix viewer per staff member.
     - "Add Staff Member" modal with module permission checkboxes for all institutional modules (`sis`, `attendance`, `routine`, `notices`, `hostel`, `fees`, `exams`, `lms`, `accounting`, `staff-payroll`).
     - "Edit Permissions" drawer to toggle granular CRUD rights.
     - "Active Sessions" monitor with one-click "Revoke All Sessions".
     - Quick "Send Setup Invitation Link".

### 6.5 Tenant Branding: Dynamic Title, Favicons & Custom Tenant Loader
1. **Dynamic Metadata (`src/app/[domain]/layout.jsx`)**:
   - Sets dynamic `<title>` template: `${cleanName} - Academic Portal` / `%s | ${cleanName}`.
   - Injects `<link rel="icon">` (favicons) dynamically:
     ```javascript
     icons: {
       icon: website.favicon || website.logo || '/favicon.ico',
       shortcut: website.favicon || '/favicon.ico',
       apple: website.logo || website.favicon || '/favicon.ico',
     }
     ```
2. **Tenant Loader Component (`src/component/tenant/TenantLoader.jsx`)**:
   - Displays institution logo if `website.logo` is present.
   - If `logo` is absent, computes the short form / acronym / monogram (e.g. "Afit Academy" -> "AA", "Afit" -> "AF", "Oxford Cambridge International School" -> "OCIS") with dynamic brand color styling (`primary_color` & `secondary_color`).
   - Features smooth pulsing glow, spinner ring, institution name, and custom loading label.
3. **Tenant Loading Screen (`src/app/[domain]/loading.jsx`)**:
   - Replaces generic spinner with tenant-aware `TenantLoader`.

### 6.6 Staff Auth Frontend Pages (`src/app/[domain]/(auth)/auth/access/staff/*`)
1. **`login/page.jsx`**: Formatted with clean institution branding, email/password inputs, 2FA prompt, error handling, redirecting upon success to `/staff-panel`.
2. **`verify/page.jsx`**: Handles token verification from email invitations, setting up initial password and address.
3. **`recovery/page.jsx`**: Provides self-service password reset.

---

## 7. Architecture Plan: Modules Separation, Package Website Modules, Website Modules Permissions, Cookie Auth via `secret.js`, Folder Cleanups & Staff Panel

### 7.1 Database Table Separation Architecture
The platform establishes a strict architectural separation between SaaS platform modules, developer permissions, tenant website modules, package-bound module offerings, and staff module permissions:

1. **`modules` Table** (Main SaaS Website / Platform Developer Modules):
   - Migrated from `developer_modules`.
   - Represents internal SaaS platform feature modules (e.g., Billing, Subscriptions, Developer Roles, System Settings, Security).
   - Schema:
     ```sql
     CREATE TABLE IF NOT EXISTS modules (
         id BIGSERIAL PRIMARY KEY,
         name VARCHAR(100) UNIQUE NOT NULL,
         slug VARCHAR(100) UNIQUE NOT NULL,
         description TEXT,
         is_active BOOLEAN DEFAULT TRUE,
         created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
         updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
     );
     ```

2. **`modules_permissions` Table** (Granular Developer Permissions):
   - Migrated from `module_permissions`.
   - Granular permissions scoped to SaaS platform `modules`.
   - Schema:
     ```sql
     CREATE TABLE IF NOT EXISTS modules_permissions (
         id BIGSERIAL PRIMARY KEY,
         module_id BIGINT NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
         name VARCHAR(100) NOT NULL,
         permission_key VARCHAR(100) NOT NULL,
         description TEXT,
         created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
         UNIQUE(module_id, permission_key)
     );
     ```
   - `developer_role_permissions` references `modules_permissions(id)`.

3. **`website_modules` Table** (Tenant Website Modules Catalog):
   - Migrated from `tenant_modules`.
   - Master catalog of educational tenant modules available for institutional websites (e.g., SIS, Attendance, Class Routine, Notices, Hostel, Student Fees, Exams & Grades, LMS, Accounting, Staff Payroll).
   - Schema:
     ```sql
     CREATE TABLE IF NOT EXISTS website_modules (
         id BIGSERIAL PRIMARY KEY,
         name VARCHAR(100) UNIQUE NOT NULL,
         slug VARCHAR(100) UNIQUE NOT NULL,
         description TEXT,
         icon VARCHAR(100),
         is_active BOOLEAN DEFAULT TRUE,
         created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
         updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
     );
     ```

4. **`package_website_modules` Table** (Package-bound Website Modules):
   - Migrated from `package_modules`.
   - Defines which educational tenant `website_modules` are included in each subscription package plan.
   - Schema:
     ```sql
     CREATE TABLE IF NOT EXISTS package_website_modules (
         id BIGSERIAL PRIMARY KEY,
         package_id BIGINT NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
         website_module_id BIGINT NOT NULL REFERENCES website_modules(id) ON DELETE CASCADE,
         created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
         UNIQUE(package_id, website_module_id)
     );
     ```

5. **`website_modules_permissions` Table** (Staff Permissions for Website Modules):
   - Migrated from `staff_permissions`.
   - Granular CRUD access rights for institutional staff members on a tenant website.
   - **Enforcement Rule**: A permission can only be granted to a staff member if that module is enabled for the website via its subscription package (`package_website_modules`).
   - Schema:
     ```sql
     CREATE TABLE IF NOT EXISTS website_modules_permissions (
         id BIGSERIAL PRIMARY KEY,
         website_id BIGINT NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
         staff_id BIGINT NOT NULL REFERENCES website_staffs(id) ON DELETE CASCADE,
         website_module_id BIGINT NOT NULL REFERENCES website_modules(id) ON DELETE CASCADE,
         can_view BOOLEAN DEFAULT TRUE,
         can_create BOOLEAN DEFAULT FALSE,
         can_edit BOOLEAN DEFAULT FALSE,
         can_delete BOOLEAN DEFAULT FALSE,
         created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
         updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
         UNIQUE(staff_id, website_module_id)
     );
     ```

### 7.2 Directory Cleanups & Deletions
1. **Remove Admin Auth Folder**:
   - Delete `src/app/[domain]/(auth)/auth/access/admin/` completely.
   - Remove "System Admin" option card from `src/app/[domain]/(auth)/auth/access/page.jsx`.
2. **Remove Staff Self-Registration**:
   - Delete `src/app/[domain]/(auth)/auth/access/staff/register/` completely.
   - Remove "First time logging in? Setup your account here" link from `src/app/[domain]/(auth)/auth/access/staff/login/page.jsx`.
   - Staff can only be invited/created by the Creator from the Creator Workspace.

### 7.3 Staff Cookie Authentication via `src/lib/database/secret.js`
1. Use `STAFF_TOKEN` exported in `src/lib/database/secret.js` (`'hiesci-staff'`).
2. Update `src/lib/middleware/staff.js`:
   - Import `STAFF_TOKEN` from `src/lib/database/secret.js`.
   - `export const STAFF_COOKIE_NAME = STAFF_TOKEN;`
   - Read cookies in `getStaffSession(request)` using `STAFF_TOKEN`.
3. In `/api/[domain]/staff/login` and `/api/[domain]/staff/verify-2fa`:
   - Store auth token in HTTP-only cookie using `STAFF_COOKIE_NAME` (`STAFF_TOKEN`).
4. In `/api/[domain]/staff/logout`:
   - Clear cookie using `STAFF_COOKIE_NAME` (`STAFF_TOKEN`).

### 7.4 Staff Panel Routing (`/[domain]/staff-panel`)
1. Ensure the tenant staff portal is accessible at `/[domain]/staff-panel`:
   - Directory: `src/app/[domain]/(staffs)/staff-panel`
2. Update layout `src/app/[domain]/(staffs)/staff-panel/layout.jsx`:
   - Check authentication using `getStaffSession(request)`.
   - If unauthenticated or staff does not belong to the website, redirect to `/auth/access/staff/login`.
   - Verify staff permissions and only display navigation items for modules that are:
     a) Included in the website's subscription package (`package_website_modules`), and
     b) Permitted for the staff member (`website_modules_permissions.can_view = TRUE`).
3. Update login page redirection to `/staff-panel`.

### 7.5 API & Creator Workspace Staff Management Updates
1. `src/app/api/marketing/creator/websites/staffs/route.js`:
   - Query available modules for the website strictly through its active subscription package:
     `SELECT wm.* FROM website_modules wm JOIN package_website_modules pwm ON pwm.website_module_id = wm.id WHERE pwm.package_id = $website_package_id`.
   - When updating staff permissions, validate that `website_module_id` belongs to the package.
   - Upsert into `website_modules_permissions`.
2. Developer Packages & Features APIs:
   - Update queries referencing `package_modules` and `tenant_modules` to use `package_website_modules` and `website_modules`.
3. Tenant Staff APIs:
   - Update `/api/[domain]/staff/login`, `/api/[domain]/staff/verify-2fa`, `/api/[domain]/staff/me` to join `website_modules_permissions` with `website_modules`.

---

## 8. Architectural Execution & Verification Summary (Completed)

### 8.1 Database Migration & Verification
- **Dropped `developer_roles` & `developer_role_permissions`**: Eliminated developer role table concept.
- **Created `module_permissions`**: Direct mapping `(developer_id, module_id)` with granular action flags (`can_view`, `can_create`, `can_edit`, `can_delete`), `UNIQUE(developer_id, module_id)`.
- **Created `package_modules` & View `package_website_modules`**: Direct link `(package_id, website_module_id)`, `UNIQUE(package_id, website_module_id)`.
- **Created `website_modules_permissions`**: Scoped link `(website_id, staff_id, website_module_id)`, `UNIQUE(staff_id, website_module_id)`.
- **Live Neon DB Row Counts**:
  - `modules`: 37 rows
  - `module_permissions`: 74 rows (active developer permissions)
  - `website_modules`: 12 rows (educational tenant modules)
  - `package_modules`: 48 rows (package-module allocations)
  - `website_modules_permissions`: Active tenant staff permissions
  - `staff_sessions`: Active session management table

### 8.2 Frontend & Routing Updates
- **Renamed Directory**: `src/app/[domain]/(staffs)/staffs-panel` -> `src/app/[domain]/(staffs)/staff-panel`.
- **Guarded Layout (`staff-panel/layout.jsx`)**: Authenticates staff via `getStaffSession()` with developer admin fallback. Redirects unauthenticated users to `/auth/access/staff/login`.
- **Staff Sidebar (`Sidebar.jsx`)**: Replaced all `/admin/...` links with `/staff-panel/...`. Added module permission filtering through `allowedModules`.
- **Staff Navbar (`Navbar.jsx`)**: Displays staff profile, provides logout clearing `STAFF_COOKIE_NAME` (`hiesci-staff`), redirects to `/auth/access/staff/login`.
- **Removed Folders**:
  - `src/app/[domain]/(auth)/auth/access/admin`
  - `src/app/[domain]/(auth)/auth/access/staff/register`
- **Updated Access Page (`auth/access/page.jsx`)**: Removed "System Admin" card, leaving Teacher and Staff.
- **Updated Staff Login (`auth/access/staff/login/page.jsx`)**: Removed self-registration link; redirects to `/staff-panel`.
- **Creator Workspace (`creator/[id]/workspace/[domain]/page.jsx`)**: Updated "Staff Management Panel" direct portal link to `/staff-panel`.

### 8.3 Cookie Authentication
- **Cookie Name**: Strictly utilizes `STAFF_TOKEN` from `src/lib/database/secret.js` (`'hiesci-staff'`).
- **Middleware (`src/lib/middleware/staff.js`)**: Decodes session, queries `staff_sessions`, verifies package inclusion via `package_website_modules` and permissions via `website_modules_permissions`.
- **API Endpoints Updated**:
  - `src/app/api/[domain]/staff/login/route.js`
  - `src/app/api/[domain]/staff/verify-2fa/route.js`
  - `src/app/api/[domain]/staff/logout/route.js`
  - `src/app/api/[domain]/staff/me/route.js`
  - `src/app/api/marketing/creator/websites/staffs/route.js`
  - `src/app/api/marketing/developer/devs/route.js`
  - `src/app/api/marketing/developer/devs/list/route.js`
  - `src/app/api/marketing/developer/permissions/route.js`
  - `src/app/api/marketing/developer/packages/route.js`
  - `src/app/api/marketing/developer/packages/[slug]/route.js`
  - `src/app/api/marketing/developer/features/route.js`
  - `src/app/api/marketing/packages/route.js`



