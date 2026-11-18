# Easy Payment System (EPS) Central Payment Gateway Guide

This document details the architecture, integration points, database schema updates, and execution flow of the Easy Payment System (EPS) implemented exclusively for the main SaaS platform.

## 1. Scope and Boundary Isolation
- Exclusivity: EPS is configured strictly for the main platform (http://localhost:3000) for SaaS subscription packages (/packages, /creator/checkout, /creator/[id]/payments/[paymentId]/pay).
- Deprecated Gateways: Legacy central gateway variables (SHURJOPAY_*, PAYPAL_*, PADDLE_*) and their usages have been completely removed from the environment, secrets, and routes.
- Tenant Isolation: Tenant websites ([domain]) do not use this EPS configuration.

## 2. Environment Variables Configuration
Configured in .env:
- EPS_MODE: 'sandbox' or 'live'
- EPS_MERCHANT_ID
- EPS_STORE_ID
- EPS_USERNAME
- EPS_PASSWORD
- EPS_HASH_KEY
- EPS_API_URL
- EPS_RETURN_URL
- EPS_CANCEL_URL

## 3. Database Schema Updates
In payments table:
- processed_by_developer_id: BIGINT REFERENCES developers(id)
- manual_payment_notes: TEXT

## 4. Key Components and Files
- src/lib/eps/gateway.js: Core EPS client supporting sandbox simulation and live EPS API.
- src/app/api/webhooks/eps-ipn/route.js: Dedicated EPS IPN and callback verification endpoint.
- src/app/api/marketing/creator/payments/initiate/route.js: Generates unpaid purchase and unpaid payment.
- src/app/api/marketing/creator/payments/route.js: Confirms EPS payment and activates subscription.
- src/app/api/marketing/developer/payments/route.js: Handles developer manual payment entry and status changes.
- src/app/(creator)/creator/checkout/page.jsx: Supports /creator/checkout?[package_id], month/year selection, and redirects to /creator/[id]/payments/[paymentId]/pay.
- src/component/marketing/creator/PaymentGatewayCheckout.jsx: Multi-rail EPS checkout component supporting BDT (MFS + Bank) and Foreign Currencies (USD).
- src/component/marketing/developer/forms/PaymentForm.jsx: Developer manual payment recording form.
- src/app/(developers)/developer/payments/page.jsx: Developer payment portal with modal dialogs.
