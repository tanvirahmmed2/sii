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
*(Continuously appended as each page and API is inspected)*

---

## 4. Remediation Progress & Verification
*(Continuously updated as fixes are applied)*
