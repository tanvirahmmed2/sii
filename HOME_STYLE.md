# Disibin Visual Design Blueprint & Style Theme Specification
> **Target Audience:** AI Coding Assistants, Design Agents, and Frontend Engineers  
> **Purpose:** Comprehensive source of truth for the Disibin aesthetic design system, visual theme, styling rules, tokens, and UI patterns. Use this blueprint to build, style, or extend any page or component with 100% visual consistency.
> **Note:** This document governs **visual styling, aesthetics, layout rhythm, and design tokens**—not backend logic or database schemas.

---

## 1. Design Philosophy & Aesthetic Identity

Disibin’s design language is **"Enterprise High-Care Tech Minimalist"**—an elevated hybrid of Swiss architectural grid discipline, warm Scandinavian minimalism, and modern SaaS luxury.

### Core Visual Principles
1. **High Contrast, Curated Color Pacing:** Alternates between serene, breathable slate-white surfaces and bold, saturated thematic full-width blocks (Teal `#008080`, Energetic Orange `#db3600`, and Deep Slate `#0f172a`).
2. **Tactile Micro-Interactions:** Every card, button, and accordion has deliberate hover physics—subtle `y: -4px` lift, gentle scale (`1.03`), and glowing colored drop shadows (`shadow-primary/20`).
3. **Soft Geometry & Organic Curvature:** Heavy use of modern squircle-like radiuses (`rounded-2xl`, `rounded-3xl`, and `rounded-full`). Sharp corners (`rounded-none` or `rounded-xs`) are strictly avoided.
4. **Frosted Glass & Depth Layers:** Utilization of subtle hairline borders (`border-slate-100`, `border-white/10`) paired with 16px backdrop blur glassmorphism and soft radial dot patterns.
5. **Restrained Editorial Typography:** Distinct pairing of **Poppins** for crisp modern tech headings/actions, **Lora** for narrative breathing room, and **Jersey** for the distinctive brand wordmark.

---

## 2. Design Tokens & Color Palette

### 2.1 The Master Palette (Tailwind CSS v4 Variables)

```css
@theme {
  /* Primary Brand: Deep Architectural Teal */
  --color-primary: #008080;         /* Main brand color, active icons, primary CTA */
  --color-primary-light: #66b2b2;   /* Focus rings, soft borders, light accents */
  --color-primary-dark: #006666;    /* Dark teal hover states, gradient anchors */

  /* Secondary Accent: Radiant Fire Orange */
  --color-secondary: #db3600;       /* High-energy accents, special CTA, contrast blocks */
  --color-secondary-light: #e25e32; /* Lighter coral highlights */
  --color-secondary-dark: #992500;  /* Active / hover states for secondary CTA */

  /* Tertiary System: Glass & High-Contrast Tokens */
  --color-tertiary: rgba(255, 255, 255, 0.6); /* Frosted glass panel fill */
  --color-tertiary-light: #ffffff;             /* Pure white text & solid white */
  --color-tertiary-dark: #000000;              /* Pure black text */
}
```

### 2.2 Color Usage & Semantic Assignment Table

| Token / Color Class | Hex / Value | Semantic Role & Where to Use |
| :--- | :--- | :--- |
| `primary` | `#008080` | Brand logo, primary buttons, highlighted text words, active nav links, badge texts |
| `primary-light` | `#66b2b2` | Hover outlines, input focus rings (`focus-within:border-primary-light`) |
| `primary-dark` | `#006666` | Hover state for primary buttons (`hover:bg-primary-dark`) |
| `secondary` | `#db3600` | Secondary CTA buttons, key takeaway words ("Success"), testimonials section background |
| `secondary-light` | `#e25e32` | Secondary hover highlights |
| `secondary-dark` | `#992500` | Active secondary button state |
| `tertiary` | `rgba(255, 255, 255, 0.6)` | Fill for `.glass` cards and translucent stat pill chips |
| `bg-gray-100` | `#f3f4f6` | Global page root body canvas background (`<body className="bg-gray-100">`) |
| `bg-white` | `#ffffff` | Primary content cards, form containers, dropdowns, input backgrounds |
| `bg-slate-50` / `50/50` | `#f8fafc` | Input fill (`.input-style`), partner slider track, alternating table rows |
| `bg-slate-900` | `#0f172a` | High-contrast mid-section banners, dark CTAs, toast notification background |
| `text-slate-900` | `#0f172a` | H1, H2, and bold lead text on light canvas |
| `text-slate-700` / `600` | `#334155` / `#475569` | General body copy, paragraph descriptions, link defaults |
| `text-slate-500` / `400` | `#64748b` / `#94a3b8` | Subtitles, metadata labels, placeholder text, icon chevrons |

### 2.3 Brand Gradients
* **Footer Gradient:** `bg-linear-to-br from-primary to-primary-dark` (from `#008080` to `#006666`)
* **Heading Text Gradient:** `bg-linear-to-r from-slate-900 via-primary to-secondary bg-clip-text text-transparent`
* **Radial Ambient Glow:** `radial-gradient(circle, rgba(0,128,128,0.15) 0%, transparent 70%)`
* **Architectural Dot Mesh Overlay:** `radial-gradient(circle, #008080 1px, transparent 1px)` with `backgroundSize: '32px 32px'` and `opacity: 0.03`

---

## 3. Typography Architecture

### 3.1 Font Families

| Font Token | CSS Variable | Intended Role |
| :--- | :--- | :--- |
| `font-poppins` | `var(--font-poppins)` | **Core Workhorse:** Used for all modern headings, buttons, stats, cards, form labels, and nav elements. |
| `font-lora` | `var(--font-lora)` | **Editorial Baseline:** Attached at layout root to give elegant, humanistic serif cadence to longform body text. |
| `font-jersey` | `var(--font-jersey)` | **Brand Signature:** Exclusive to the main Navbar "Disibin" logotype (`text-3xl font-jersey -tracking-tighter font-semibold text-primary`). |
| `font-silkscreen` | `var(--font-silkscreen)` | **Retro / Tech Utility:** Available for technical badges or monospaced tech accents. |

### 3.2 Typographic Hierarchy & Styling Specs

```
H1 — Hero / Page Title
├── Font: font-poppins
├── Weight: font-semibold (600)
├── Size: text-4xl sm:text-6xl md:text-8xl (clamp / responsive)
├── Tracking: tracking-tight or tracking-tighter (-0.025em to -0.05em)
├── Line Height: leading-[1.05] or leading-tight
└── Color: text-slate-900 (often with key highlight word in text-primary or text-secondary)

H2 — Section Header
├── Font: font-poppins
├── Weight: font-semibold (600)
├── Size: text-3xl sm:text-5xl
├── Tracking: tracking-tight
└── Color: text-slate-900 (or text-white when over dark/teal sections)

H3 — Subsection & Card Group Titles
├── Font: font-poppins
├── Weight: font-semibold (600)
├── Size: text-xl sm:text-2xl
└── Color: text-slate-900

Eyebrow / Overline (Category Tag)
├── Font: font-poppins
├── Weight: font-semibold (600)
├── Size: text-xs (12px) or text-[10px]
├── Transform: uppercase
├── Tracking: tracking-[0.25em] or tracking-[0.3em] (extreme letter-spacing)
└── Color: text-slate-400, text-primary, or text-indigo-600

Large Stat / Metric Number
├── Font: font-poppins
├── Weight: font-semibold (600)
├── Size: text-5xl sm:text-6xl md:text-8xl
├── Tracking: tracking-tighter
└── Color: text-slate-900 with suffix in text-primary

Body Copy / Descriptions
├── Font: font-poppins (or default layout font-lora)
├── Size: text-sm (14px) or text-base (16px) or text-lg (18px for hero subtext)
├── Line Height: leading-relaxed (1.625)
└── Color: text-slate-600 or text-slate-500
```

---

## 4. Geometry, Elevation & Materiality

### 4.1 Corner Radius Scale
* **`rounded-full`**: Pill buttons (e.g. `AboutPage` CTAs), circular icon badges, status tags.
* **`rounded-3xl`**: Hero banners, floating mobile modals (`Sidebar.jsx`), career card wrappers, FAQ outer containers.
* **`rounded-2xl`**: Standard card radius (Services, Team cards, Stats cards, Newsletter form container).
* **`rounded-xl`**: Standard buttons, input elements, icon container boxes (`w-10 h-10 rounded-xl`).
* **`rounded-lg`**: Embedded preview images, submenu dropdown items.

### 4.2 Elevation & Shadow Token Hierarchy
* **Hairline Border Rule:** Every card uses a subtle border: `border border-slate-100` or `border border-slate-200`.
* **Resting Shadow:** `shadow-xs` or `shadow-sm` (`box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05)`).
* **Hover State Shadow:** `hover:shadow-md` or `hover:shadow-xl hover:shadow-primary/10`.
* **Primary Button Glow:** `shadow-md shadow-primary/20`.
* **Secondary / Dark Button Glow:** `shadow-xl shadow-slate-900/10`.

### 4.3 Glassmorphism (`.glass`) Specification
Used on stats counters, accordion cards, and floating panels:
```css
.glass {
  background: var(--color-tertiary); /* rgba(255, 255, 255, 0.6) */
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.75);
}
```

---

## 5. Motion, Physics & Animation System

Disibin relies heavily on **Framer Motion** for viewport scroll-triggered entrances and smooth micro-interactions.

### 5.1 Standard Framer Motion Variants

#### Staggered Container Variant:
```javascript
export const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.1,
    },
  },
};
```

#### Standard Rise-and-Fade Item Variant:
```javascript
export const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { 
      duration: 0.7, 
      ease: [0.22, 1, 0.36, 1] /* Custom smooth spring-like deceleration */ 
    },
  },
};
```

#### Card Hover Lift Micro-Interaction:
```javascript
<motion.div
  whileHover={{ y: -6, transition: { duration: 0.2 } }}
  whileTap={{ scale: 0.98 }}
>
```

#### Standard Viewport Trigger:
```javascript
<motion.section
  initial="hidden"
  whileInView="visible"
  viewport={{ once: false, amount: 0.2 }}
  variants={containerVariants}
>
```

### 5.2 CSS Keyframe Animations (Defined in `globals.css`)
* **`animate-fade-up`**: `fade-up 0.7s cubic-bezier(0.22, 1, 0.36, 1) both;`
* **`animate-fade-in`**: `fade-in 0.6s ease both;`
* **`animate-float`**: `float 4s ease-in-out infinite;`
* **`animate-pulse-glow`**: `pulse-glow 2.5s ease-in-out infinite;` (Gently pulses a teal shadow `0 0 32px 4px rgba(0, 128, 128, 0.2)`)
* **`animate-shimmer`**: `shimmer 3s linear infinite;`

---

## 6. Layout Rhythm & Alternating Section Architecture

The Disibin landing page structure follows an intentional **visual cadence** alternating between serene airy white backgrounds and saturated color blocks:

```
[ Navbar ] -> Clean, transparent, floating (h-12, rounded-2xl)
      ↓
[ 1. Hero Section ] -> Light canvas (bg-gray-100), massive typography, dual CTA buttons
      ↓
[ 2. Intro Statement ] -> Full-bleed DEEP TEAL BLOCK (bg-primary text-tertiary-light py-28)
      ↓
[ 3. Bio / Metrics Section ] -> Light canvas with 3 .glass stat cards with radial hover spotlight
      ↓
[ 4. Who We Are (About) ] -> Full-bleed DEEP TEAL BLOCK with dot-matrix overlay (bg-primary)
      ↓
[ 5. Webs (System Showcase) ] -> Light canvas, clean horizontal drag-to-scroll card sliders
      ↓
[ 6. Services ("What We Build") ] -> Light canvas, 4-column white cards with icon badges
      ↓
[ 7. Valued Partners ] -> Soft off-white carousel (bg-slate-50/50 border-y border-slate-100)
      ↓
[ 8. Reviews / Testimonials ] -> Full-bleed RADIANT ORANGE BLOCK (bg-secondary py-28)
      ↓
[ 9. Identity / Brand Icon ] -> Clean pure white spacer (bg-tertiary-light p-20)
      ↓
[ 10. Footer ] -> Full-bleed TEAL GRADIENT (from-primary to-primary-dark) + Newsletter input
```

> **Design Rule:** When designing new pages or sections, **never** stack 3 identical flat white sections together without inserting either a `.glass` component, an overline tag, or a high-contrast dark/teal transition block.

---

## 7. Component Styling Catalog (Copy-Paste Ready)

### 7.1 Buttons

#### A. Primary Brand Button (Teal)
```html
<Link
  href="/contact"
  className="inline-flex items-center justify-center bg-primary hover:bg-primary-dark text-white font-poppins font-semibold px-8 py-3.5 rounded-xl shadow-md shadow-primary/20 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
>
  Get Started
</Link>
```

#### B. Secondary Accent Button (Orange with Pulse Glow)
```html
<Link
  href="/about"
  className="inline-flex items-center gap-2 font-poppins font-semibold text-sm bg-secondary hover:bg-secondary-dark text-white px-8 py-3.5 rounded-xl shadow-md transition-all duration-300 animate-pulse-glow"
>
  About Us →
</Link>
```

#### C. Neutral Outline Button
```html
<Link
  href="/products"
  className="inline-flex items-center justify-center border border-slate-300 hover:border-primary text-slate-800 hover:text-primary font-poppins font-semibold px-8 py-3.5 rounded-xl transition-all duration-300"
>
  View Work
</Link>
```

#### D. High-Contrast Slate Pill Button (on Light Canvas)
```html
<Link
  href="/products"
  className="inline-flex items-center justify-center px-8 py-4 bg-slate-900 text-white font-semibold rounded-full hover:bg-primary transition-all duration-300 shadow-md"
>
  Explore Our Products
</Link>
```

#### E. White Pill Button (on Dark / Banner Canvas)
```html
<Link
  href="/career"
  className="inline-flex items-center justify-center px-10 py-5 bg-white text-slate-900 text-lg font-semibold rounded-full hover:bg-secondary hover:text-white transition-colors duration-300 shadow-xl"
>
  Join our team
</Link>
```

---

### 7.2 Form Controls & Inputs (`.input-style`)

All form fields must strictly adhere to the `.input-style` system rule:

```css
.input-style {
  width: 100%;
  padding: 0.875rem 1.25rem;
  border-radius: 1rem;
  background-color: #f8fafc; /* slate-50 */
  color: #0f172a;           /* slate-900 */
  font-size: 0.875rem;      /* 14px */
  line-height: 1.25rem;
  border: 1px solid #e2e8f0;/* slate-200 */
  outline: none;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.02);
}

.input-style:focus,
.input-style:focus-within {
  border-color: #66b2b2;   /* primary-light */
  box-shadow: 0 0 0 2px rgba(0, 128, 128, 0.2);
}

.input-style::placeholder {
  color: #94a3b8;           /* slate-400 */
}
```

#### React JSX Input Pattern:
```html
<input
  type="text"
  placeholder="Your Full Name"
  className="input-style focus:border-primary-light focus:ring-2 focus:ring-primary/20"
/>
```

---

### 7.3 Cards

#### A. Service / Feature Card (with Floating Icon Box)
```html
<div className="bg-white/80 backdrop-blur-md rounded-2xl p-6 border border-slate-100 shadow-xs hover:shadow-lg hover:shadow-primary/5 hover:border-primary/30 transition-all duration-300 flex flex-col justify-between group">
  <div className="space-y-4">
    <!-- Icon Container -->
    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors duration-300">
      <FiMonitor className="w-5 h-5" />
    </div>

    <div>
      <h4 className="font-poppins font-semibold text-slate-900 text-base mb-1.5 group-hover:text-primary transition-colors">
        Enterprise Web Apps
      </h4>
      <p className="text-slate-500 text-xs leading-relaxed font-poppins">
        Multi-tenant dashboards, secure transactions, and real-time data streaming.
      </p>
    </div>
  </div>

  <div className="pt-4 mt-4 border-t border-slate-100">
    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-0.5">Ideal For</span>
    <p className="text-slate-800 font-medium text-xs font-poppins">SaaS platforms and portals.</p>
  </div>
</div>
```

#### B. Numbered Product Card (with 16:9 Image Dock)
```html
<a href="/products/1" className="group flex flex-col no-underline bg-white overflow-hidden box-border h-full border border-slate-100 shadow-xs hover:shadow-md transition-all duration-300 rounded-2xl">
  <div className="p-6 flex flex-col gap-4 grow">
    <p className="text-[14px] font-semibold text-gray-500 m-0">01</p>
    <h3 className="text-xl font-semibold text-gray-900 group-hover:text-primary transition-colors m-0 font-poppins">
      Enterprise Resource Platform
    </h3>
    <p className="text-[16px] leading-normal text-gray-900 m-0 font-poppins line-clamp-3">
      Unified cloud-native architecture connecting finance, inventory, and analytics.
    </p>
  </div>

  <div className="relative w-full overflow-hidden px-4 flex items-end bg-emerald-50 aspect-video">
    <img 
      src="/product.jpg" 
      alt="Preview" 
      className="w-full aspect-video h-auto block object-cover rounded-t-lg transition-transform duration-500 group-hover:scale-105" 
    />
  </div>
</a>
```

#### C. Glassmorphic Metric Stat Card (with Spotlight Hover)
```html
<div className="group relative w-full p-8 rounded-2xl glass shadow-sm hover:shadow-xl hover:shadow-primary/10 transition-all duration-300 cursor-default overflow-hidden">
  <!-- Radial Glow on Hover -->
  <div
    aria-hidden="true"
    className="pointer-events-none absolute -top-10 -left-10 w-40 h-40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700"
    style={{ background: 'radial-gradient(circle, rgba(0,128,128,0.15) 0%, transparent 70%)' }}
  />

  <p className="text-5xl sm:text-6xl font-semibold text-slate-900 group-hover:text-primary transition-colors duration-300 mb-2 font-poppins">
    120+
  </p>
  <p className="text-sm font-semibold text-slate-700 mb-1 font-poppins">Businesses Served</p>
  <p className="text-xs text-slate-400 font-poppins">across industries worldwide</p>
</div>
```

#### D. FAQ Glass Accordion Card
```html
<div className="glass rounded-2xl overflow-hidden shadow-sm transition-all duration-300 hover:shadow-md">
  <button className="w-full text-left px-6 py-5 flex justify-between items-center gap-4 group focus:outline-none cursor-pointer">
    <span className="font-poppins font-semibold text-base text-slate-900 group-hover:text-primary transition-colors">
      How do we handle system migrations?
    </span>
    <FiChevronDown className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-transform duration-200" />
  </button>
  <div className="px-6 pb-6 text-slate-600 text-sm sm:text-base leading-relaxed border-t border-slate-100/80 pt-4 font-poppins">
    We execute phased zero-downtime database cutovers with rollback safety checks.
  </div>
</div>
```

---

### 7.4 Global Toast System (`react-hot-toast`)

When triggering toast alerts or status messages, follow the exact Disibin styling token:
```javascript
toast.success('Your message has been dispatched successfully!', {
  position: 'top-center',
  style: {
    borderRadius: '12px',
    background: '#0f172a', /* slate-900 */
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: '500',
    fontFamily: 'var(--font-poppins), sans-serif',
    boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.3)',
  },
});
```

---

## 8. Iconography Rules

* **Icon Set:** Standardized on `react-icons/fi` (Feather Icons) for clean, geometric 1.5–2px stroke weights.
* **Social & Brand Icons:** `react-icons/fa` (FontAwesome).
* **Hamburger / Navigation Toggles:** `react-icons/ci` (`CiMenuBurger`, `CiMenuFries`).
* **Icon Treatment in Cards:** Place inside a square squircle container (`w-10 h-10 rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors duration-300`).

---

## 9. AI Developer Cheatsheet: "Do's" and "Don'ts"

### ✅ MUST DO:
* **Always** use `text-primary` (`#008080`) or `text-secondary` (`#db3600`) for focal text highlights inside headings.
* **Always** use `font-poppins font-semibold` on titles, headers, badges, and action triggers.
* **Always** use `rounded-xl`, `rounded-2xl`, or `rounded-3xl` for modern rounded geometry.
* **Always** wrap interactive buttons and cards with subtle Framer Motion hover effects (`whileHover={{ y: -4 }}`).
* **Always** use `.input-style` for text inputs, select dropdowns, and textareas.
* **Always** use `border border-slate-100` or `border border-slate-200` to define surface boundaries with subtle elegance.
* **Always** maintain alternating section pacing (Light -> Teal -> Light -> Orange -> Light -> Dark).

### ❌ DO NOT:
* **Never** use generic bootstrap/tailwind primary blues (`bg-blue-600`), greens (`bg-green-600`), or reds (`bg-red-600`). Use strictly `--color-primary` (`#008080`) and `--color-secondary` (`#db3600`).
* **Never** create sharp-cornered boxes (`rounded-none` or `rounded-xs`).
* **Never** use heavy black borders (`border-black` or `border-slate-800` on light backgrounds).
* **Never** use raw default browser fonts without specifying `font-poppins` or `font-lora`.
* **Never** create flat walls of unstyled text without overline tags (`text-xs uppercase tracking-[0.25em]`).
* **Never** make static, unresponsive cards without hover elevations.
