# Unified Panel Design & Style Guide (`PANEL_STYLE.md`)

This document serves as the design system specification and architectural styling standard for all administration, operations, and management panels across the platform:
- **Staff Administration Panel** (`/staff-panel/*`)
- **Faculty & Teacher Panel** (`/teacher/*`)
- **Student Workstation Portal** (`/student/*`)
- **Administrative Officer Panel** (`/officer/*`)
- **Creator Studio & Management** (`/creator/*`)
- **Developer Control Console** (`/developer/*`)

---

## 1. 🏛️ Core Design Philosophy

All panels are designed as **high-density, ultra-minimalist, high-productivity workstations**. They eliminate decorative clutter, heavy animations, oversized radiuses, and redundant visual indicators in favor of clarity, performance, and immediate productivity.

### Core Tenets
1. **No `max-w-*` on Main Pages (Edge-to-Edge `w-full`)**:
   The outermost container of every page and layout must expand across the full viewport width (`w-full`) without artificial max-width constraints (`max-w-3xl`, `max-w-4xl`, `max-w-5xl`, `max-w-6xl`, `max-w-7xl`, `mx-auto`). Workstations must maximize available screen real estate on desktop and widescreen displays.
2. **Strictly Restricted Iconography (Only 4 Permitted Icons)**:
   Decorative icons are strictly prohibited. When an icon is required for an action or navigation, **only four icon types** are permitted across all panels:
   - **Menu Icon** (`FiMenu`, `HiMenu`, `BiMenu`): For mobile sidebar / drawer toggling.
   - **Edit Icon** (`FiEdit`, `FiEdit2`, `BiEdit`): For edit / rename / modify actions.
   - **Delete Icon** (`FiTrash`, `FiTrash2`, `BiTrash`): For delete / remove / revoke actions.
   - **Setting Icon** (`FiSettings`, `BiCog`, `HiOutlineCog`): For configuration / preferences.
   - *All other actions* (Save, Back, Upload, Cancel, Date, Status, Categories, Badges) must use clear, descriptive text labels and typography rather than decorative icons.
3. **Strict Typography Hierarchy**:
   No `font-bold`, `font-extrabold`, or `font-black` in standard content, headers, or body text. All interface text is strictly formatted using `font-normal`, `font-medium`, and `font-semibold`.
4. **Subtle & Compact Radiuses**:
   No exaggerated border-radius styles (`rounded-2xl`, `rounded-3xl`, `rounded-full`). All cards, inputs, tables, and buttons use compact `rounded` (4px / 0.25rem), `rounded-md` (6px), or `rounded-lg` (8px).
5. **Absolute Currency Segregation**:
   Bangladeshi Taka (BDT, `৳`) and US Dollars (USD, `$`) are treated as independent fiscal units. They are never converted via formulas, added together, or represented under a single mixed figure.

---

## 2. 🎨 Color Theme & Design Tokens (`globals.css`)

All panel styling strictly adheres to the official design tokens and CSS variables defined in `src/app/globals.css`:

### 2.1 Brand Theme Tokens
| CSS Variable | Tailwind Token | Hex Code | Purpose / Usage in Panels |
| :--- | :--- | :--- | :--- |
| `--primary` | `primary` / `bg-primary` / `text-primary` | `#A2AB73` | **Primary Brand Color**: Primary buttons, active tabs, main badges, active indicators |
| `--primary-light` | `primary-light` / `bg-primary-light` | `#E0E7BE` | Soft backgrounds, active item hover states |
| `--primary-dark` | `primary-dark` / `hover:bg-primary-dark` | `#A1B34C` | Hover state for primary buttons and interactive accents |
| `--secondary` | `secondary` / `bg-secondary` / `text-secondary` | `#CC3A63` | **Secondary Accent Color**: Call-to-actions, alerts, highlight tags, secondary buttons |
| `--secondary-light`| `secondary-light` / `bg-secondary-light`| `#E48EA6` | Soft secondary badge backgrounds, subtle warning accents |
| `--secondary-dark` | `secondary-dark` / `hover:bg-secondary-dark`| `#CE063E` | Hover state for secondary action buttons |
| `--light` | `light` / `bg-light` | `#FFFFFF` | Light surface base |
| `--dark` | `dark` / `bg-dark` | `#000000` | Dark surface base |

### 2.2 Neutral Gray / Slate Scale (High-Density Contrast)
| Tailwind Token | Hex Code | Usage |
| :--- | :--- | :--- |
| `bg-slate-50` / `dark:bg-slate-950` | `#F8FAFC` / `#020617` | Page background, table row hover, neutral badges |
| `bg-white` / `dark:bg-slate-900` | `#FFFFFF` / `#0F172A` | Card surface, table background, input background |
| `border-slate-100` / `dark:border-slate-850` | `#F1F5F9` / `#1E293B` | Subtle internal card divider, nested list separator |
| `border-slate-200` / `dark:border-slate-800` | `#E2E8F0` / `#1E293B` | Primary card border, table header separator, modal border |
| `border-slate-300` / `dark:border-slate-700` | `#CBD5E1` / `#334155` | Input border, secondary button border |
| `text-slate-400` / `dark:text-slate-500` | `#94A3B8` / `#64748B` | Micro labels, mono subtitles, placeholder text |
| `text-slate-500` / `dark:text-slate-400` | `#64748B` / `#94A3B8` | Secondary descriptions, timestamps, table column headers |
| `text-slate-600` / `dark:text-slate-300` | `#475569` / `#CBD5E1` | Explanatory copy, secondary button text |
| `text-slate-700` / `dark:text-slate-200` | `#334155` / `#E2E8F0` | Table cell data, active navigation links |
| `text-slate-800` / `dark:text-slate-100` | `#1E293B` / `#F1F5F9` | Base body text |
| `text-slate-900` / `dark:text-white` | `#0F172A` / `#FFFFFF` | Page headings, primary values, active stat numbers |

### 2.3 Semantic Status & Categorical Badges
All badges use compact font (`text-[10px]` or `text-xs`), subtle tinted backgrounds, and 1px border:
| State | Tailwind Tokens |
| :--- | :--- |
| **Brand Primary** | `bg-primary/10 text-primary border border-primary/20` |
| **Brand Secondary / Accent** | `bg-secondary/10 text-secondary border border-secondary/20` |
| **Active / Success** | `bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800` |
| **Pending / Warning** | `bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800` |
| **Inactive / Danger** | `bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800` |
| **Neutral / Informational** | `bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700` |

---

## 3. 📐 Layout Architecture & Full-Width Rules

### 3.1 Outermost Container Rule
Every panel view must use `w-full` with NO max-width restrictions on the main page wrapper:

```jsx
// CORRECT: Full-Width Panel Page Container
<div className="w-full space-y-4">
  {/* Content stretches edge-to-edge across the screen */}
</div>

// INCORRECT (FORBIDDEN): Artificial max-width boundaries
<div className="w-full max-w-5xl mx-auto space-y-6"> // FORBIDDEN
<div className="max-w-7xl mx-auto">                   // FORBIDDEN
```

### 3.2 Spacing & Metrics
- **Page Spacing**: `space-y-4` or `space-y-5`
- **Card Padding**: `p-4` or `p-5`
- **Card Borders**: `border border-slate-200 dark:border-slate-800 rounded-md bg-white dark:bg-slate-900`
- **Form Input Sizes**: `w-full px-3 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-primary focus:border-primary`
- **Primary Buttons (Brand Theme)**: `px-3.5 py-1.5 rounded-md bg-primary hover:bg-primary-dark text-white text-xs font-medium cursor-pointer shadow-xs transition`
- **Secondary Buttons (Accent Theme)**: `px-3.5 py-1.5 rounded-md bg-secondary hover:bg-secondary-dark text-white text-xs font-medium cursor-pointer shadow-xs transition`
- **Secondary Neutral Buttons**: `px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-medium transition cursor-pointer`

---

## 4. 🎯 Icon Usage Rules

To maintain high density and zero visual noise, **only 4 icons are permitted**:

| Allowed Icon | Permitted React Icons | Exact Usage |
| :--- | :--- | :--- |
| **Menu** | `FiMenu`, `HiMenu`, `BiMenu` | Sidebar expand/collapse, mobile drawer toggle |
| **Edit** | `FiEdit`, `FiEdit2`, `BiEdit` | Inline table edit, article edit, item modify |
| **Delete** | `FiTrash2`, `FiTrash`, `BiTrash` | Delete article, delete row, remove item |
| **Setting** | `FiSettings`, `BiCog`, `HiOutlineCog` | Gear settings menu, configure preferences |

**Prohibited Icons in Panels**:
- Do NOT use calendar icons (`FiCalendar`) on date pickers — use native `<input type="date" />` and clear labels.
- Do NOT use tag icons (`FiTag`), star icons (`FiStar`), file icons (`FiFileText`), or upload icons (`FiUploadCloud`).
- Do NOT use back-arrow icons (`FiArrowLeft`) — use clean text links: `← Back to Articles` or `Back to List`.
- Do NOT use status icons (`FiCheckCircle`, `FiXCircle`) in alerts or cards — use clean typography and semantic border/background colors.

---

## 5. 🧩 Standard Page Structure & Component Patterns

### 5.1 Page Header with Actions
```jsx
<div className="w-full flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
  <div>
    <h1 className="text-base font-semibold text-slate-900 dark:text-white">Page Title</h1>
    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Descriptive subtitle for this workstation view.</p>
  </div>
  <div className="flex items-center gap-2">
    <button type="button" className="px-3 py-1.5 rounded bg-slate-900 text-white text-xs font-medium cursor-pointer">
      Save Changes
    </button>
    <button type="button" className="p-1.5 rounded border border-rose-200 text-rose-600 hover:bg-rose-50 cursor-pointer" title="Delete">
      <FiTrash2 className="text-sm" />
    </button>
  </div>
</div>
```

### 5.2 Full-Width Form Card
```jsx
<div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-4 sm:p-5 space-y-4">
  {/* Form fields spread across full width using responsive grid */}
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div className="space-y-1">
      <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Field Label *</label>
      <input type="text" className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden" />
    </div>
  </div>
</div>
```

---

## 6. 🚫 Anti-Patterns & Strict Constraints

| Disallowed Pattern | Reason | Required Solution |
| :--- | :--- | :--- |
| `max-w-* mx-auto` on page wrappers | Constrains workstation on wide screens | Always use `w-full` for the outer page container |
| Random icons (`FiImage`, `FiCalendar`, `FiCheck`) | Adds visual clutter and misaligns text | Use text labels, semantic badges, native form controls |
| `rounded-2xl` / `rounded-3xl` / `rounded-full` | Unprofessional, oversized for dense panels | Use `rounded` (4px) or `rounded-md` (6px) |
| `font-bold` / `font-extrabold` in panel views | Creates aggressive contrast imbalances | Use `font-semibold` for headers, `font-medium` for buttons |
| Hardcoded currency conversions | Flawed accounting | Isolate BDT (`৳`) and USD (`$`) completely |
