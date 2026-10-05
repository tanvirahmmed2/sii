# Creator Panel Design & Style Guide (`STYLE.md`)

This document serves as the design system specification and architectural styling report for the Creator Studio and Management Panel of the SaaS platform. It details all visual tokens, layout rules, typography guidelines, component patterns, anti-patterns, and multi-currency formatting standards.

---

## 1. 🏛️ Core Design Philosophy

The Creator Panel is designed as a **high-density, ultra-minimalist, professional workstation**. It eliminates decorative clutter, heavy animations, oversized radiuses, and redundant visual indicators in favor of clarity, performance, and immediate productivity.

### Core Tenets
1. **Zero Icons & Icon Containers**: No iconography (`react-icons`, SVGs, Lucide, Heroicons) or icon background container shapes (circles, square badges) are used. Actionable text, labels, and badges provide direct meaning without visual noise.
2. **Strict Typography Hierarchy**: No bold (`font-bold`), extra-bold (`font-extrabold`), or black (`font-black`) weights. All interface text is strictly formatted using `font-normal`, `font-medium`, and `font-semibold`.
3. **Subtle & Compact Radiuses**: No exaggerated border-radius styles (`rounded-xl`, `rounded-2xl`, `rounded-3xl`, `rounded-full`). All cards, inputs, and buttons use a subtle `rounded` (4px / 0.25rem) or `rounded-md` (6px).
4. **Full-Width Outer Shell (`w-full`)**: The outermost container of every page and layout expands across the full viewport width (`w-full`) without artificial max-width constraints (`max-w-6xl`, `max-w-7xl`, `mx-auto`).
5. **Absolute Currency Segregation**: Bangladeshi Taka (BDT, `৳`) and US Dollars (USD, `$`) are treated as independent fiscal units. They are never converted via formulas, added together, or represented under a single mixed figure.

---

## 2. 🎨 Color Palette & Design Tokens

The color palette is deliberately restrained, pairing neutral slate tones with high-contrast text and purposeful semantic alerts.

### 2.1 Neutral Gray / Slate Scale
| Tailwind Token | Hex Code | Usage |
| :--- | :--- | :--- |
| `bg-slate-50` | `#F8FAFC` | Page background, subtle row hover, neutral badges |
| `bg-white` | `#FFFFFF` | Card surface, table background, input background |
| `border-slate-100` | `#F1F5F9` | Subtle internal card divider, nested list separator |
| `border-slate-200` | `#E2E8F0` | Primary card border, table header separator, modal border |
| `border-slate-300` | `#CBD5E1` | Input border, secondary button border |
| `text-slate-400` | `#94A3B8` | Micro labels, mono subtitles, placeholder text |
| `text-slate-500` | `#64748B` | Secondary descriptions, timestamps, table column headers |
| `text-slate-600` | `#475569` | Explanatory copy, secondary button text |
| `text-slate-700` | `#334155` | Table cell data, active navigation links |
| `text-slate-800` | `#1E293B` | Base body text |
| `text-slate-900` | `#0F172A` | Page headings, primary values, active stat numbers |
| `bg-slate-900` | `#0F172A` | Primary action buttons, dark column auth accent |
| `hover:bg-slate-800` | `#1E293B` | Primary action button hover state |

### 2.2 Semantic Status Tokens
All badges and alerts use soft pastel backgrounds with tinted 1px borders and high-contrast text:

| Semantic State | Tailwind Classes | Example Contexts |
| :--- | :--- | :--- |
| **Active / Success** | `bg-emerald-50 text-emerald-700 border-emerald-200` | Paid invoice, verified account, active plan, live site |
| **Pending / Attention** | `bg-amber-50 text-amber-700 border-amber-200` | Pending order, unpaid invoice, awaiting developer reply |
| **Inactive / Terminated**| `bg-rose-50 text-rose-700 border-rose-200` | Expired package, cancelled subscription, validation error |
| **Neutral / Default** | `bg-slate-100 text-slate-600 border-slate-200` | Inactive plan, draft site, general category tag |

---

## 3. 📐 Layout Architecture & Spacing

### 3.1 Outer Layout Shell
The layout shell stretches from edge to edge to provide maximum workspace area for managing multi-tenant sites and billing ledgers.

```jsx
// Shell Container
<div className="min-h-screen w-full bg-slate-50 text-slate-800 flex">
  {/* Fixed Sidebar */}
  <CreatorSidebar />

  {/* Main Viewport Container */}
  <div className="flex-1 flex flex-col min-w-0 w-full">
    <CreatorNavbar />
    
    {/* Page Content: Full Width, No Max-Width Boundaries */}
    <main className="flex-1 p-4 sm:p-5 w-full space-y-4">
      {children}
    </main>
  </div>
</div>
```

### 3.2 Spacing & Density Metrics
- **Outer Page Padding**: `p-4 sm:p-5`
- **Card Padding**: `p-3.5` to `p-4` (compact cards: `p-3`)
- **Vertical Rhythm**: `space-y-4` between major blocks; `space-y-2` inside cards
- **Grid Gaps**: `gap-3` on stat KPI rows, `gap-4` on multi-column split views
- **Form Input Padding**: `px-3 py-1.5` (compact), `px-3 py-2` (standard form fields)
- **Button Padding**: `px-3 py-1.5` (standard), `px-2 py-1` (inline table actions)

---

## 4. 🔤 Typography Specifications

The creator panel relies entirely on standard font weights with proportional scale:

| Level | Tailwind Classes | Purpose |
| :--- | :--- | :--- |
| **Page Title** | `text-base font-semibold text-slate-900` | Main view header (e.g. "Purchased Package & Billing History") |
| **Section Title** | `text-sm font-semibold text-slate-900` | Card header, modal header, table section title |
| **Card Subtitle** | `text-xs text-slate-500 mt-0.5` | Context description below headings |
| **Body / Table Cell** | `text-xs text-slate-800 font-normal` | Primary table content, settings descriptions |
| **Mono Numerical** | `font-mono text-xs font-medium` | Invoice IDs, currency values, countdowns, timestamps |
| **Micro Caption** | `text-[10px] uppercase font-semibold text-slate-400` | KPI card category tags, table column headers |
| **Badge Text** | `text-[9px] font-medium px-1.5 py-0.2 rounded border` | Status pills, plan tier tags |

---

## 5. 💳 Strict Multi-Currency Standards (USD vs BDT)

To eliminate financial calculation errors and confusing user representations, the platform enforces strict currency isolation:

1. **No Conversion Rate Formulas**: Currency values are never converted via an arbitrary rate (e.g. multiplying or dividing by `115`).
2. **Dedicated Gateway Isolation**:
   - **bKash** payments strictly debit `monthly_price_bdt` / `yearly_price_bdt` in BDT (`৳`).
   - **Paddle** payments strictly charge `monthly_price_usd` / `yearly_price_usd` in USD (`$`).
3. **Multi-Currency Totals Display**:
   - When a creator has made payments in both USD and BDT, the "Total Spent" / "Total Settled" metrics display both values on distinct lines or separate badges.
   - Example Display:
     ```
     Total Spent:
     $29.00 USD
     ৳3,500 BDT
     ```
   - Values are **never** combined into an invalid sum like `$3529.00`.
4. **Table Ledger Representation**:
   - Every invoice record explicitly outputs its currency symbol and 3-letter ISO code:
     - `৳3,500 BDT`
     - `$29.00 USD`

---

## 6. 🧩 Component Design Specifications

### 6.1 Action Buttons
```jsx
// Primary Action
<button className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs transition-colors cursor-pointer">
  Renew Subscription
</button>

// Secondary / Neutral Action
<button className="px-3 py-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium text-xs transition-colors cursor-pointer">
  Refresh
</button>

// Destructive Action
<button className="px-2 py-1 rounded border border-rose-200 text-rose-600 hover:bg-rose-50 font-medium text-xs transition-colors cursor-pointer">
  Revoke
</button>
```

### 6.2 Form Inputs & Controls
```jsx
// Text / Email / Number Input
<input
  type="text"
  className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
/>

// Select Dropdown
<select className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800">
  <option>Monthly Billing</option>
  <option>Yearly Billing</option>
</select>
```

### 6.3 Data Table Template
```jsx
<div className="bg-white border border-slate-200 rounded p-4 space-y-3">
  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
    <h2 className="text-sm font-semibold text-slate-900">Record History</h2>
  </div>
  <div className="overflow-x-auto">
    <table className="w-full text-left text-xs">
      <thead>
        <tr className="border-b border-slate-200 text-slate-500 text-[10px] uppercase font-semibold">
          <th className="pb-2">Reference</th>
          <th className="pb-2">Amount</th>
          <th className="pb-2">Gateway</th>
          <th className="pb-2">Status</th>
          <th className="pb-2 text-right">Actions</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100 font-normal text-slate-700">
        <tr className="hover:bg-slate-50">
          <td className="py-2.5 font-mono text-slate-900 font-medium">INV-3</td>
          <td className="py-2.5 font-mono text-slate-900 font-medium">৳3,500 BDT</td>
          <td className="py-2.5 text-slate-600">BKASH</td>
          <td className="py-2.5">
            <span className="text-[9px] font-medium px-1.5 py-0.2 rounded border bg-emerald-50 text-emerald-700 border-emerald-200">
              successful
            </span>
          </td>
          <td className="py-2.5 text-right">
            <Link href="..." className="text-slate-800 hover:underline font-medium">View Receipt</Link>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</div>
```

---

## 7. 📄 Page Inventory & Implementation Matrix

| Route | Page Name | Primary Outermost Div | Features |
| :--- | :--- | :--- | :--- |
| `/creator/[id]` | Overview | `w-full space-y-4` | 4-stat KPI row with currency isolation, quick links grid, recent transactions |
| `/creator/[id]/purchases` | Purchases & Billing | `w-full space-y-4` | Active plan countdown card, interactive payment renewal modal (bKash/Paddle), full purchases table |
| `/creator/[id]/workspace` | Websites | `w-full space-y-4` | Deployed sites table, DNS domain indicator, site create/edit modal |
| `/creator/[id]/subscription` | Subscription Tier | `w-full space-y-4` | Plan details, website limit usage, team permission matrix |
| `/creator/[id]/payments` | Invoices List | `w-full space-y-4` | Total Settled KPI (isolated USD & BDT), search filter, invoices ledger |
| `/creator/[id]/payments/[id]` | Invoice Receipt | `w-full space-y-4` | Printable receipt voucher, transaction metadata, payment verification |
| `/creator/[id]/tickets` | Support Helpdesk | `w-full space-y-4` | Ticket status table, category filtering, new ticket submission form |
| `/creator/[id]/tickets/[id]` | Ticket Thread | `w-full space-y-4` | Text message stream, reply composer, status badges |
| `/creator/[id]/projects` | Custom Projects | `w-full space-y-4` | Feature requests list, quote statuses, new project request modal |
| `/creator/[id]/projects/[id]` | Project Details | `w-full space-y-4` | Discussion stream with developer team, milestones |
| `/creator/[id]/profile` | Creator Profile | `w-full space-y-4` | Organization, phone, email, country, and city settings form |
| `/creator/[id]/settings` | Security & Sessions | `w-full space-y-4` | Active device logins table with remote revoke, password reset, 2FA toggle |
| `/creator/[id]/reviews` | Testimonials | `w-full space-y-4` | Platform rating, review submission, edit/delete actions |
| `/creator/[id]/updates` | Changelog | `w-full space-y-4` | Version release feed, technical change summaries |
| `/creator/login` | Sign In | `w-full ...` | Text-only password visibility toggle, 2FA prompt, auto-redirect |
| `/creator/register` | Registration | `w-full ...` | Simplified onboarding form, zero icon fields |
| `/creator/recovery` | Password Recovery | `w-full ...` | 3-step recovery flow (email &rarr; OTP &rarr; reset) |
| `/creator/verify` | Account Activation | `w-full ...` | URL auto-validation, 6-digit code entry, resend handler |
| `/creator/checkout` | Order Checkout | `w-full space-y-4` | Package invoice generator, billing cycle selector |

---

## 8. 🚫 Anti-Patterns & Strict Constraints

| Disallowed Pattern | Reason | Required Solution |
| :--- | :--- | :--- |
| `react-icons/*` or `<svg>` | Adds visual weight and breaks typography alignment | Use descriptive, clean text labels and status pills |
| `font-bold` / `font-extrabold` | Causes heavy contrast imbalance in dense layouts | Use `font-normal`, `font-medium`, or `font-semibold` |
| `rounded-2xl` / `rounded-3xl` / `rounded-full` | Looks oversized and informal for workstation interfaces | Use `rounded` (4px) or `rounded-md` (6px) |
| `max-w-6xl mx-auto` on pages | Constrains workspace on widescreen monitors | Use `w-full` with responsive horizontal padding |
| Summing BDT with USD (e.g. `29 + 3500 = $3529`) | Invalid fiscal math; misleads creator billing | Calculate `totalSpentUsd` and `totalSpentBdt` separately |
| Hardcoded conversion formulas (e.g. `* 115`) | Flawed accounting; rate discrepancies | Direct pricing: bKash uses BDT price, Paddle uses USD price |

---
*Maintained by the Antigravity Engineering Team.*
