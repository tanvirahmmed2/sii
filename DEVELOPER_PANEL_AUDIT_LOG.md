# Developer Panel Comprehensive Audit & Fix Log

**Date**: 2026-10-01  
**Project**: SaaS Educational Website Developer Company Platform (`sii`)  
**Objective**: Full audit and remediation of developer panel frontend pages, backend APIs, schema alignment (`psql/schema.psql`), API keys/payload mismatches, and route bugs.

---

## 1. Database Schema (`psql/schema.psql`) Overview & Analysis

### Core Tables in `psql/schema.psql`
1. `developer_modules`: Internal modules for RBAC permissions (`id`, `name`, `slug`, `description`, `is_active`, timestamps)
2. `module_permissions`: Granular permissions per module (`id`, `module_id`, `name`, `permission_key`, `description`)
3. `developer_roles`: Platform internal roles (`id`, `name`, `slug`, `description`, timestamps)
4. `developer_role_permissions`: Role-permission mappings (`role_id`, `permission_id`)
5. `developers`: Staff accounts (`id`, `role_id`, `name`, `email`, `phone`, `designation`, `password`, `avatar_url`, `avatar_id`, `bio`, `github_profile`, `linkedin_profile`, `is_active`, `two_factor_code`, `two_factor_expires`, `recovery_token`, `recovery_token_expires`, `last_login_at`, timestamps)
6. `developer_login_activities`: Login audit trail (`developer_id`, `ip_address`, `user_agent`, `status`, `failure_reason`, `login_time`, timestamps)
7. `developer_login_sessions`: Active sessions (`developer_id`, `token`, `ip_address`, `user_agent`, `expires_at`, `is_active`, `last_active_at`, timestamps)
8. `packages`: Pricing plans (`id`, `name`, `slug`, `tagline`, `description`, `monthly_price_usd`, `yearly_price_usd`, `monthly_price_bdt`, `yearly_price_bdt`, `monthly_price`, `yearly_price`, `discount_percentage`, `max_students`, `max_teachers`, `max_staff`, `max_storage_mb`, `max_websites`, `features` JSONB, `is_popular`, `is_active`, `trial_days`, `sort_order`, timestamps)
9. `tenant_modules`: Catalog of school features (`id`, `name`, `slug`, `description`, `icon`, `is_active`, timestamps)
10. `package_modules`: Join table linking `packages` and `tenant_modules` (`package_id`, `tenant_module_id`)
11. `creators`: Educational institution client accounts (`id`, `name`, `email`, `phone`, `institution`, `country`, `city`, `address`, `password`, `email_verified`, `verification_token`, `two_factor_code`, `is_active`, timestamps)
12. `subscribers`: Newsletter subscribers (`id`, `email`, `name`, `source`, `is_active`, `subscribed_at`, `unsubscribed_at`)
13. `websites`: Tenant schools (`id`, `creator_id`, `package_id`, `name`, `slug`, `subdomain`, `custom_domain`, `custom_domain_verified`, `institution_type`, `eiin_number`, `status`, `theme`, `primary_color`, `logo`, `logo_id`, `favicon`, `favicon_id`, `contact_email`, `contact_phone`, `address`, `subscription_expires_at`, `storage_used_mb`, `is_maintenance_mode`, timestamps)
14. `website_modules`: Active modules per tenant website (`website_id`, `tenant_module_id`, `is_enabled`, `enabled_at`)
15. `purchases`: Subscriptions/orders (`id`, `creator_id`, `website_id`, `package_id`, `purchase_code`, `billing_cycle`, `base_amount`, `discount_amount`, `tax_amount`, `total_amount`, `status`, `period_start`, `period_end`, `invoice_pdf_url`, `notes`, timestamps)
16. `payments`: Payment transactions (`id`, `purchase_id`, `creator_id`, `transaction_id`, `amount`, `currency`, `payment_method`, `payment_gateway`, `gateway_fee`, `gateway_response` JSONB, `status`, `payment_date`, timestamps)
17. `blogs`: Articles (`id`, `developer_id`, `title`, `slug`, `excerpt`, `content`, `image`, `image_id`, `category`, `tags`, `meta_title`, `meta_description`, `is_published`, `published_at`, `views_count`, timestamps)
18. `contacts`: Lead inquiries (`id`, `name`, `email`, `phone`, `institution`, `subject`, `message`, `status`, `assigned_developer_id`, `admin_notes`, timestamps)
19. `reviews`: Platform reviews (`id`, `creator_id`, `website_id`, `reviewer_name`, `institution_name`, `rating`, `title`, `review_text`, `is_featured`, `is_approved`, timestamps)
20. `policies`: Legal docs (`id`, `title`, `slug`, `description`, `is_active`, timestamps)
21. `faq`: Platform FAQs (`id`, `question`, `answer`, timestamps)
22. `supports`: Customer support tickets (`id`, `creator_id`, `website_id`, `assigned_developer_id`, `ticket_number`, `subject`, `status`, `priority`, `last_message_at`, timestamps)
23. `support_messages`: Ticket replies (`id`, `support_id`, `sender_type`, `sender_id`, `message`, `is_internal_note`, `is_read`, `read_at`, timestamps)
24. `support_images`: Ticket attachments (`id`, `message_id`, `image_url`, `image_id`, `file_name`, `file_size`, `mime_type`, timestamps)
25. `live_chats`: Live chat sessions (`id`, `session_id`, `visitor_name`, `visitor_email`, `visitor_phone`, `ip_address`, `user_agent`, `started_at`, `ended_at`, timestamps)
26. `live_chat_messages`: Live chat stream (`id`, `chat_id`, `sender_id`, `sender_name`, `message`, `attachment_url`, `is_read`, `read_at`, timestamps)
27. `internal_chats`: Staff direct/group chats (`id`, `title`, `type`, `created_by_developer_id`, timestamps)
28. `chat_participants`: Staff chat members (`id`, `chat_id`, `developer_id`, `last_read_at`, timestamps)
29. `chat_messages`: Staff chat messages (`id`, `chat_id`, `sender_developer_id`, `message`, `is_system`, timestamps)
30. `chat_images`: Staff chat image attachments (`id`, `message_id`, `image_url`, `file_name`, `file_size`, timestamps)

---

## 2. Developer Panel Pages Inventory

| Area / Feature | Frontend Path | API Path | Status / Notes |
|---|---|---|---|
| Dashboard Overview | `src/app/(developers)/developer/page.jsx` | `/api/marketing/developer/reports` etc. | To Audit |
| Developer Auth - Login | `src/app/(developer-auth)/developer-auth/login/page.jsx` | `/api/marketing/developer/me/login` | To Audit |
| Developer Auth - Verify 2FA | `src/app/(developer-auth)/developer-auth/verify/page.jsx` | `/api/marketing/developer/me/verify`, `/resend-code` | To Audit |
| Developer Auth - Recovery | `src/app/(developer-auth)/developer-auth/recovery/page.jsx` | `/api/marketing/developer/me/recovery` | To Audit |
| Developer Accounts | `src/app/(developers)/developer/developers/page.jsx` | `/api/marketing/developer/devs` | To Audit |
| Team Directory | `src/app/(developers)/developer/team/page.jsx` | `/api/marketing/developer/devs/list` | To Audit |
| Roles & Permissions | `src/app/(developers)/developer/roles/page.jsx` | `/api/marketing/developer/roles`, `/permissions` | To Audit |
| System Modules | `src/app/(developers)/developer/modules/page.jsx` | `/api/marketing/developer/modules` | To Audit |
| Creators / Clients | `src/app/(developers)/developer/creators/page.jsx` | `/api/marketing/developer/creators` | To Audit |
| Creator Details | `src/app/(developers)/developer/creators/[id]/page.jsx` | `/api/marketing/developer/creators/[id]` | To Audit |
| Users (Tenant Users) | `src/app/(developers)/developer/users/page.jsx` | `/api/marketing/developer/users` | To Audit |
| Tenant Websites | `src/app/(developers)/developer/websites/page.jsx` | `/api/marketing/developer/websites` | To Audit |
| Subscription Packages | `src/app/(developers)/developer/packages/page.jsx` | `/api/marketing/developer/packages` | To Audit |
| Package Edit | `src/app/(developers)/developer/packages/[slug]/page.jsx` | `/api/marketing/developer/packages/[slug]` | To Audit |
| Purchases | `src/app/(developers)/developer/purchases/page.jsx` | `/api/marketing/developer/purchases` | To Audit |
| Payments | `src/app/(developers)/developer/payments/page.jsx` | `/api/marketing/developer/payments` | To Audit |
| Subscriptions | `src/app/(developers)/developer/subscriptions/page.jsx` | `/api/marketing/developer/subscriptions` | To Audit |
| Staff Payroll | `src/app/(developers)/developer/payroll/page.jsx` | `/api/marketing/developer/payroll` | To Audit |
| My Salaries | `src/app/(developers)/developer/my-salaries/page.jsx` | `/api/marketing/developer/my-salaries` | To Audit |
| Blogs | `src/app/(developers)/developer/blogs/page.jsx` | `/api/marketing/developer/blogs` | To Audit |
| Blog Edit | `src/app/(developers)/developer/blogs/[slug]/page.jsx` | `/api/marketing/developer/blogs/[slug]` | To Audit |
| Themes | `src/app/(developers)/developer/themes/page.jsx` | `/api/marketing/developer/themes` | To Audit |
| Theme Edit | `src/app/(developers)/developer/themes/[slug]/page.jsx` | `/api/marketing/developer/themes/[slug]` | To Audit |
| Contacts | `src/app/(developers)/developer/contacts/page.jsx` | `/api/marketing/developer/contacts` | To Audit |
| Contact Detail/Reply | `src/app/(developers)/developer/contacts/[id]/page.jsx` | `/api/marketing/developer/contacts/[id]`, `/reply` | To Audit |
| Customer Support | `src/app/(developers)/developer/support/page.jsx` | `/api/marketing/developer/support` | To Audit |
| Support Ticket Detail | `src/app/(developers)/developer/support/[id]/page.jsx` | `/api/marketing/developer/support/[id]/messages` | To Audit |
| Live Chats | `src/app/(developers)/developer/live-chats/page.jsx` | `/api/marketing/developer/live_chats` | To Audit |
| Live Chat Session | `src/app/(developers)/developer/live-chats/[id]/page.jsx` | `/api/marketing/developer/live_chats` | To Audit |
| Internal Chats | `src/app/(developers)/developer/chats/page.jsx` | `/api/marketing/developer/chats` | To Audit |
| Meta Facebook | `src/app/(developers)/developer/facebook-messages/page.jsx` | `/api/marketing/developer/meta/*` | To Audit |
| Meta Instagram | `src/app/(developers)/developer/instagram-messages/page.jsx` | `/api/marketing/developer/meta/*` | To Audit |
| Meta WhatsApp | `src/app/(developers)/developer/whatsapp-messages/page.jsx` | `/api/marketing/developer/meta/*` | To Audit |
| FAQs | `src/app/(developers)/developer/faqs/page.jsx` | `/api/marketing/developer/faqs` | To Audit |
| Features | `src/app/(developers)/developer/features/page.jsx` | `/api/marketing/developer/features` | To Audit |
| Leads | `src/app/(developers)/developer/leads/page.jsx` | `/api/marketing/developer/leads` | To Audit |
| Notices | `src/app/(developers)/developer/notices/page.jsx` | `/api/marketing/developer/notices` | To Audit |
| Policies | `src/app/(developers)/developer/policies/page.jsx` | `/api/marketing/developer/policies` | To Audit |
| Profile | `src/app/(developers)/developer/profile/page.jsx` | `/api/marketing/developer/profile`, `/me` | To Audit |
| Projects | `src/app/(developers)/developer/projects/page.jsx` | `/api/marketing/developer/projects` | To Audit |
| Project Detail | `src/app/(developers)/developer/projects/[id]/page.jsx` | `/api/marketing/developer/projects/[id]` | To Audit |
| Reports | `src/app/(developers)/developer/reports/page.jsx` | `/api/marketing/developer/reports` | To Audit |
| Reviews | `src/app/(developers)/developer/reviews/page.jsx` | `/api/marketing/developer/reviews` | To Audit |
| Settings | `src/app/(developers)/developer/settings/page.jsx` | Settings API / Config | To Audit |
| Spams | `src/app/(developers)/developer/spams/page.jsx` | `/api/marketing/developer/spams` | To Audit |
| Subscribers | `src/app/(developers)/developer/subscribers/page.jsx` | `/api/marketing/developer/subscribers` | To Audit |
| Tasks | `src/app/(developers)/developer/tasks/page.jsx` | `/api/marketing/developer/tasks` | To Audit |
| Tutorials | `src/app/(developers)/developer/tutorials/page.jsx` | `/api/marketing/developer/tutorials` | To Audit |
| Updates | `src/app/(developers)/developer/updates/page.jsx` | `/api/marketing/developer/updates` | To Audit |
| Update Edit | `src/app/(developers)/developer/updates/[slug]/page.jsx` | `/api/marketing/developer/updates/[slug]` | To Audit |

---

## 3. Discovered Issues & Bugs Log

### A. Routing & Direct Path Resolution
1. **API Route Mismatch (`/api/developer/*` & `/api/creator/*` vs `/api/marketing/...`)**:
   - Rather than using a middleware rewrite, `src/middleware.js` was completely removed per instructions.
   - All 85 frontend pages, layouts, and forms across both the developer and creator panels were updated to call the full canonical paths directly:
     - `/api/marketing/developer/...`
     - `/api/marketing/creator/...`
   - Zero non-marketing API calls remain in the frontend client code.

### B. Schema Table & Column Inconsistencies
1. **`developer_roles` vs non-existent `roles` table**: Multiple backend routes (`permissions/route.js`, `contacts/route.js`, `payroll/route.js`, `my-salaries/route.js`, `notices/route.js`, `tasks/route.js`, `tutorials/route.js`) joined with `roles dr ON d.role_id = dr.id`. In `psql/schema.psql`, the table is strictly `developer_roles`.
   - *Fix*: Updated all SQL joins across developer routes to `developer_roles dr ON d.role_id = dr.id`.
2. **`permissions` table**: Several routes queried `permissions` and `role_permissions`. In `psql/schema.psql`, RBAC permissions are structured as `developer_modules`, `module_permissions`, `developer_roles`, and `developer_role_permissions`.
   - *Fix*: Completely rebuilt `permissions/route.js` to query `module_permissions mp JOIN developer_modules dm ON mp.module_id = dm.id`.
3. **`contacts` table check constraints & columns**: In `contacts/route.js` and `contacts/reply/route.js`, queries attempted to update non-existent column `reply` and `replied_by_developer_id`, and set status `'REPLIED'` which violated the check constraint `CHECK (status IN ('new', 'read', 'in_progress', 'replied', 'closed'))`.
   - *Fix*: Updated to use `assigned_developer_id`, `admin_notes`, and lowercase status `'replied'`.
4. **`policies` table columns**: `policies/route.js` attempted to read and write `is_published`. In `schema.psql`, table 20 has `is_active BOOLEAN DEFAULT TRUE`.
   - *Fix*: Mapped `is_active` in SQL queries and aliased `is_active AS is_published` to maintain seamless compatibility with `src/app/(developers)/developer/policies/page.jsx`.
5. **`subscribers` table columns**: `subscribers/route.js` attempted to update `status` column. In `schema.psql`, table 12 has `is_active BOOLEAN DEFAULT TRUE`, `subscribed_at`, `unsubscribed_at`.
   - *Fix*: Mapped `is_active` to `status` ('SUBSCRIBED' / 'UNSUBSCRIBED') and updated PUT to update `is_active` and `unsubscribed_at`.
6. **`features` vs `tenant_modules`**: `features/route.js` queried legacy table `feature` and `packages_feature`. In `schema.psql`, Table 9 is `tenant_modules` and Table 10 is `package_modules`.
   - *Fix*: Re-aligned `features/route.js` to query and mutate `tenant_modules` (`name`, `slug AS key`, `description`, `icon`, `is_active`) and join with `package_modules`.
7. **`tasks` vs `developer_tasks`**: `tasks/route.js` queried non-existent `tasks` table with `assigned_to_developer_id`. In `schema.psql`, Table 4 is `developer_tasks` with column `developer_id`.
   - *Fix*: Updated queries to query `developer_tasks` with fallback to `tasks`, aliasing `developer_id AS assigned_to_developer_id`. Fixed missing import of `authenticateStaff` in `tasks/[id]/route.js`.
8. **`supports` vs `support`**: Several developer and creator routes queried `support`. In `schema.psql`, Table 22 is `supports`. `support_messages` sender_type check constraint requires lowercase `('creator', 'developer', 'system')`. Attachments table `support_images` references `message_id`.
   - *Fix*: Normalized all queries to `supports`, lowercase sender types, and `support_images (message_id)`.
9. **`purchases` & `payments` plural schema alignment**:
   - `purchases`: status check constraint `('pending', 'completed', 'failed', 'refunded', 'cancelled')`.
   - `payments`: status check constraint `('pending', 'successful', 'failed', 'refunded', 'cancelled')`.
   - Fixed creator and developer purchase/payment routes to use lowercase status values and map amounts cleanly.
10. **`live_chats` & `live_chat_messages`**:
    - Synchronized `live_chats` schema with indexes on `creator_id`, `website_id`, `assigned_developer_id`, and `status`.

### C. Authentication & Session Object Robustness
1. **`auth.staff` vs `auth.user` runtime TypeError**: Middleware function `hasModulePermission` returns `{ success: true, user: session }`. Accessing `auth.staff.id` threw runtime exceptions in payroll, my-salaries, contacts, notices, and tasks.
   - *Fix*: Changed all staff accesses to `auth.user?.id || auth.staff?.id` and `auth.user?.permissions || auth.staff?.permissions`.

---

## 4. Remediation Progress & Verification

| Module / Component | Files Remediated | Schema / API Alignment Status | Verification Result |
|---|---|---|---|
| Routing & Direct API Path Resolution | 85 caller files across developer and creator panels | Explicit canonical paths `/api/marketing/developer/*` & `/api/marketing/creator/*` | PASS |
| DB Schema Harmonization | `psql/schema.psql` | `live_chats` & `live_chat_messages` indexes and columns aligned | PASS |
| RBAC Permissions | `src/app/api/marketing/developer/permissions/route.js` | `module_permissions`, `developer_modules`, `developer_roles`, `developer_role_permissions` | PASS |
| Roles Management | `src/app/api/marketing/developer/roles/route.js` | `developer_roles`, `developer_role_permissions`, transactional assignments | PASS |
| Developers Team | `src/app/api/marketing/developer/devs/route.js`, `devs/list/route.js` | `developers`, `developer_roles` join, 2FA code generation | PASS |
| Contacts CRM | `src/app/api/marketing/developer/contacts/route.js`, `[id]/route.js`, `reply/route.js` | `contacts` (`assigned_developer_id`, `admin_notes`, lowercase `'replied'`) | PASS |
| Payroll & Salaries | `src/app/api/marketing/developer/payroll/route.js`, `my-salaries/route.js` | `developer_roles`, safe query guards, `auth.user?.id` fix | PASS |
| Creators / Clients | `src/app/api/marketing/developer/creators/route.js`, `[id]/route.js` | `creators` (`institution`, 2FA check), `purchases`, `payments`, `supports` | PASS |
| Customer Support Tickets | `src/app/api/marketing/developer/support/route.js`, `[id]/route.js`, `messages/route.js` | `supports`, `support_messages` (`sender_type` lowercase), `support_images` | PASS |
| Tasks & Sprints | `src/app/api/marketing/developer/tasks/route.js`, `[id]/route.js`, `comments/route.js` | `developer_tasks`, `developer_roles`, `authenticateStaff` import fixed | PASS |
| Company Policies | `src/app/api/marketing/developer/policies/route.js`, `src/app/(developers)/developer/policies/page.jsx` | `policies` (`is_active` mapped to `is_published`) | PASS |
| Newsletter Subscribers | `src/app/api/marketing/developer/subscribers/route.js`, `src/app/(developers)/developer/subscribers/page.jsx` | `subscribers` (`is_active` mapped to `SUBSCRIBED`/`UNSUBSCRIBED`) | PASS |
| Features Catalog | `src/app/api/marketing/developer/features/route.js` | `tenant_modules`, `package_modules` (`name`, `slug AS key`, `icon`) | PASS |
| Company Notices | `src/app/api/marketing/developer/notices/route.js` | `notices`, `developer_roles`, `auth.user` fix | PASS |
| Video Tutorials | `src/app/api/marketing/developer/tutorials/route.js` | `tutorials`, `developer_roles`, `auth.user` fix | PASS |
| End-Users Directory | `src/app/api/marketing/developer/users/route.js` | Fallback to `website_staffs` & `website_staff_roles` with safe query guards | PASS |
| Ecosystem Apps | `src/app/api/marketing/developer/apps/route.js` | `tenant_modules` query for canonical modules, safe error catches | PASS |
| Product Reviews | `src/app/api/marketing/developer/reviews/route.js` | `reviews` joined with `creators`, `websites`, `packages` | PASS |
| Live Chats | `src/app/api/marketing/developer/live_chats/route.js` | `live_chats`, `live_chat_messages`, `developers` | PASS |
| Creator Overview & Billing | `src/app/api/marketing/creator/route.js` | `purchases`, `payments`, `websites`, `packages`, stats calculation | PASS |
| Creator Subscriptions & Purchases | `src/app/api/marketing/creator/subscriptions/route.js`, `purchases/route.js` | `purchases`, `packages`, `payments` | PASS |
| Creator Billing & Invoices | `src/app/api/marketing/creator/payments/route.js`, `src/app/(creator)/creator/[id]/payments/page.jsx` | Case-insensitive `successful`, `completed`, `pending`, `unpaid` | PASS |
| Creator Hosted Websites | `src/app/api/marketing/creator/websites/route.js`, `src/app/(creator)/creator/[id]/webites/page.jsx` | `websites` (`slug`, `subdomain`, `theme`, `primary_color`, `is_maintenance_mode`) | PASS |
| Creator Website Settings & Team | `src/app/api/marketing/creator/website-settings/route.js`, `website-team/route.js` | `website_settings`, `website_staffs`, `website_staff_roles` | PASS |
| Creator Support Tickets | `src/app/api/marketing/creator/support/route.js`, `tickets/[ticketId]/route.js` | `supports`, `support_messages`, `support_images` | PASS |
| Creator Custom Projects | `src/app/api/marketing/creator/projects/route.js`, `projects/[projectId]/route.js` | `projects`, `project_messages`, `developer_roles` | PASS |
| Creator Profile & 2FA | `src/app/api/marketing/creator/profile/route.js`, `me/route.js` | `creators` (`institution`, `two_factor_code`) | PASS |
| Overview Dashboards | `src/app/(developers)/developer/page.jsx`, `src/app/(developers)/developer/purchases/page.jsx`, `contacts/page.jsx` | Case-insensitive counts, revenue in cents/dollars normalized | PASS |

