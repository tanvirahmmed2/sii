# Academic Hierarchy & System Module Implementation Plan

## 1. Overview
This implementation plan establishes a fully modular academic hierarchy for institutions on the SaaS platform, allowing each tenant institution to choose their preferred academic management workflow:
- **Preset 1 (`DEPT_SESSION_SEC`)**: Department > Session (Academic Year) > Section (optional)
- **Preset 2 (`CLASS_SEC`)**: (Session/Year) > Class > Section (optional)
- **Preset 3 (`DEPT_CLASS_SEC`)**: Department (Shift / Version / Group) > Class > Section (optional)
- **Preset 4 (`CUSTOM`)**: Granular toggle combination of departments, sessions, classes, and sections

In addition, this plan creates the new `/system` studio module in the Staff Panel (`src/app/[domain]/(staffs)/staff-panel/system/page.jsx`) replicating the full operational scope of `src/app/(creator)/creator/[id]/workspace/[domain]` with added interactive hierarchy management, domain status, branding controls, package/module visibility, and direct portal access.

---

## 2. Database Architecture & Migrations

### 2.1 Table: `website_academic_configs`
Stores the academic configuration and custom terminology for each tenant website.
```sql
CREATE TABLE IF NOT EXISTS website_academic_configs (
    id BIGSERIAL PRIMARY KEY,
    website_id BIGINT NOT NULL UNIQUE REFERENCES websites(id) ON DELETE CASCADE,
    hierarchy_type VARCHAR(50) NOT NULL DEFAULT 'CLASS_SEC'
        CHECK (hierarchy_type IN ('DEPT_SESSION_SEC', 'CLASS_SEC', 'DEPT_CLASS_SEC', 'CUSTOM')),
    use_department BOOLEAN NOT NULL DEFAULT FALSE,
    use_session BOOLEAN NOT NULL DEFAULT TRUE,
    use_class BOOLEAN NOT NULL DEFAULT TRUE,
    use_section BOOLEAN NOT NULL DEFAULT TRUE,
    require_department BOOLEAN NOT NULL DEFAULT FALSE,
    require_session BOOLEAN NOT NULL DEFAULT TRUE,
    require_class BOOLEAN NOT NULL DEFAULT TRUE,
    require_section BOOLEAN NOT NULL DEFAULT FALSE,
    labels JSONB NOT NULL DEFAULT '{
        "department": "Department",
        "session": "Academic Year",
        "class": "Class",
        "section": "Section"
    }'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_website_academic_configs_web 
ON website_academic_configs(website_id);
```

### 2.2 Table Adjustments: `website_classes`
Allow classes to optionally link to a department:
```sql
ALTER TABLE website_classes
  ADD COLUMN IF NOT EXISTS department_id BIGINT REFERENCES website_departments(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_ws_classes_dept 
ON website_classes(website_id, department_id);
```

### 2.3 Table Adjustments: `website_sections`
Allow sections to belong either to a class, or directly to a department and session:
```sql
ALTER TABLE website_sections
  ALTER COLUMN class_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS department_id BIGINT REFERENCES website_departments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS session_id BIGINT REFERENCES website_sessions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_ws_sections_hierarchy 
ON website_sections(website_id, department_id, session_id, class_id);
```

### 2.4 Table Adjustments: `website_sessions`
Remove the obsolete `is_current` column from `website_sessions` so sessions represent simple academic session spans (e.g. `2022-2023`, `2023-2024`):
```sql
ALTER TABLE website_sessions DROP COLUMN IF EXISTS is_current;
```

### 2.5 Synchronization with `psql/website_tables.psql`
- Update table definition of `website_sessions` to remove `is_current`.
- Append `website_academic_configs` DDL, indices, and triggers.
- Update `website_classes` and `website_sections` DDL and migration blocks.

---

## 3. Backend API Implementation

### 3.1 New Route: `/api/[domain]/staff/panel/academic-config`
- **GET**: Retrieves tenant's `website_academic_configs`. If none exists yet, automatically seeds default `CLASS_SEC` preset.
- **POST/PUT**: Upserts academic configuration using the parameterized raw SQL query:
```sql
INSERT INTO website_academic_configs (
    website_id,
    hierarchy_type,
    use_department,
    use_session,
    use_class,
    use_section,
    require_department,
    require_session,
    require_class,
    require_section,
    labels,
    updated_at
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, NOW())
ON CONFLICT (website_id) DO UPDATE SET
    hierarchy_type = EXCLUDED.hierarchy_type,
    use_department = EXCLUDED.use_department,
    use_session = EXCLUDED.use_session,
    use_class = EXCLUDED.use_class,
    use_section = EXCLUDED.use_section,
    require_department = EXCLUDED.require_department,
    require_session = EXCLUDED.require_session,
    require_class = EXCLUDED.require_class,
    require_section = EXCLUDED.require_section,
    labels = EXCLUDED.labels,
    updated_at = NOW()
RETURNING *;
```

### 3.2 Update Route: `/api/[domain]/staff/panel/sessions/route.js`
- Remove all references to `is_current` in queries, inserts, and updates.
- Order sessions by `id DESC` or `name ASC`.

### 3.3 Cleanup Auxiliary Routes Querying `is_current`
- Update `src/app/api/[domain]/exams/meta/route.js`
- Update `src/app/api/[domain]/fees/education/meta/route.js`
- Update `src/app/api/[domain]/staff/classrooms/meta/route.js`
- Update `src/app/api/[domain]/staff/panel/admissions/route.js`

### 3.4 New System Route: `/api/[domain]/staff/panel/system/route.js`
- Returns aggregated tenant system data:
  - Website metadata (name, type, EEIN, contact, address, currency)
  - Domains & DNS pointers
  - Package & enabled modules
  - Direct portal URLs
  - Academic hierarchy configuration

---

## 4. Frontend Staff Panel Implementation

### 4.1 New Page: `/staff-panel/system`
- Path: `src/app/[domain]/(staffs)/staff-panel/system/page.jsx` and `layout.jsx`.
- Incorporates features from `src/app/(creator)/creator/[id]/workspace/[domain]/page.jsx`:
  1. **Academic Hierarchy Studio**:
     - Visual cards for the 3 Presets (`DEPT_SESSION_SEC`, `CLASS_SEC`, `DEPT_CLASS_SEC`) + `CUSTOM`.
     - Direct toggle controls for `use_department`, `use_session`, `use_class`, `use_section`.
     - Requirement checkboxes for `require_department`, `require_session`, `require_class`, `require_section`.
     - Terminology customizer for custom labels.
  2. **Institutional Profile**:
     - Name, Institution Type, EEIN, Tagline, Mission, Vision, History, Contact Email, Phone, Address, Map URL, Social Media, Currency.
  3. **Domains & DNS Overview**:
     - Subdomain and custom domain records, DNS instructions.
  4. **Active Modules & Packages**:
     - Tenant subscription status, module roster, and feature states.
  5. **Appearance & Themes**:
     - Primary and secondary brand colors, logo and favicon upload, maintenance mode switch.
  6. **Direct Portals**:
     - Quick links to Student, Teacher, Staff, and Officer portals.

### 4.2 Sidebar Navigation: `staffNavData.js`
- Add `/system` to `src/component/website/bars/admin/staffNavData.js` under System / Configuration.

### 4.3 Clean Existing Academic Year Page
- Path: `src/app/[domain]/(staffs)/staff-panel/academic-year/page.jsx`.
- Remove `is_current` checkbox and badge indicators.

---

## 5. Verification & Quality Assurance
1. Execute PostgreSQL migration directly on the database.
2. Verify table definitions and constraints.
3. Run ESLint across all modified and newly created files.
4. Verify strict constraints:
   - 0 code comments.
   - 0 placeholder attributes.
   - 0 alert/confirm popups.
   - Clickable `file:///` links for all referenced files.
