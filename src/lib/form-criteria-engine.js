import { query } from './db.js';

const COMPARATORS = {
  eq: (a, b) => String(a ?? '').trim().toLowerCase() === String(b ?? '').trim().toLowerCase(),
  neq: (a, b) => String(a ?? '').trim().toLowerCase() !== String(b ?? '').trim().toLowerCase(),
  gte: (a, b) => Number(a) >= Number(b),
  lte: (a, b) => Number(a) <= Number(b),
  gt: (a, b) => Number(a) > Number(b),
  lt: (a, b) => Number(a) < Number(b),
  between: (a, b) => Array.isArray(b) && Number(a) >= Number(b[0]) && Number(a) <= Number(b[1]),
  in: (a, b) =>
    Array.isArray(b) &&
    b.map((x) => String(x).trim().toLowerCase()).includes(String(a ?? '').trim().toLowerCase()),
  not_in: (a, b) =>
    Array.isArray(b) &&
    !b.map((x) => String(x).trim().toLowerCase()).includes(String(a ?? '').trim().toLowerCase()),
};

/**
 * Recursively evaluates nested AND ("all") / OR ("any") criteria nodes
 */
export function evaluateCriteriaAST(node, contextData) {
  if (!node || typeof node !== 'object') return { passed: true, errors: [] };

  // AND Group
  if (Array.isArray(node.all)) {
    const errors = [];
    for (const child of node.all) {
      const res = evaluateCriteriaAST(child, contextData);
      if (!res.passed) {
        errors.push(...(res.errors.length ? res.errors : [node.msg || 'Eligibility criteria not met.']));
      }
    }
    return { passed: errors.length === 0, errors };
  }

  // OR Group
  if (Array.isArray(node.any)) {
    if (node.any.length === 0) return { passed: true, errors: [] };
    const anyPassed = node.any.some((child) => evaluateCriteriaAST(child, contextData).passed);
    return {
      passed: anyPassed,
      errors: anyPassed ? [] : [node.msg || 'You do not meet any of the qualifying eligibility conditions.'],
    };
  }

  // Leaf Rule: { field: "info.ssc_gpa", op: "gte", value: 4.50, msg: "Minimum SSC GPA is 4.50" }
  if (node.field && node.op) {
    const [scope, key] = node.field.includes('.') ? node.field.split('.') : ['info', node.field];
    const actualValue =
      contextData[scope]?.[key] !== undefined
        ? contextData[scope]?.[key]
        : (contextData.core?.[key] !== undefined ? contextData.core[key] : contextData.info?.[key]);
    const comparator = COMPARATORS[node.op];

    if (!comparator) return { passed: false, errors: [`Invalid operator: ${node.op}`] };
    if (actualValue === undefined || actualValue === null || actualValue === '') {
      return { passed: false, errors: [node.msg || `Missing required eligibility field: ${key}`] };
    }

    const passed = comparator(actualValue, node.value);
    return { passed, errors: passed ? [] : [node.msg || `Requirement failed for ${key}`] };
  }

  return { passed: true, errors: [] };
}

/**
 * Computes and saves the immutable form_schema_snapshot on website_admissions
 * Call this inside a transaction whenever staff creates or updates an admission circular.
 */
export async function syncAdmissionFormSnapshot(client, websiteId, admissionId) {
  const runner = typeof client?.query === 'function'
    ? client
    : (typeof client === 'function' ? { query: client } : { query });
  const sql = `
    WITH resolved_fields AS (
      SELECT
        ff.id AS form_field_id,
        ff.target_scope,
        ff.field_key,
        ff.label,
        ff.field_type,
        ff.options,
        ff.validation_regex,
        ff.is_unique,
        ff.carry_over_to_student,
        COALESCE(afc.is_required, ff.is_required_in_admission, ff.is_required) AS is_required,
        COALESCE(afc.sort_order, 0) AS sort_order
      FROM website_form_fields ff
      LEFT JOIN website_admission_form_configs afc
        ON afc.form_field_id = ff.id AND afc.admission_id = $2
      WHERE ff.website_id = $1
        AND ff.is_visible_in_admission = TRUE
        AND (
          -- If circular has explicit mappings, use only those; otherwise use all tenant admission fields
          NOT EXISTS (SELECT 1 FROM website_admission_form_configs WHERE admission_id = $2)
          OR afc.id IS NOT NULL
        )
      ORDER BY COALESCE(afc.sort_order, 0) ASC, ff.id ASC
    )
    UPDATE website_admissions
    SET form_schema_snapshot = COALESCE((SELECT jsonb_agg(row_to_json(resolved_fields)) FROM resolved_fields), '[]'::jsonb)
    WHERE id = $2 AND website_id = $1
    RETURNING form_schema_snapshot;
  `;
  const res = await runner.query(sql, [websiteId, admissionId]);
  return res.rows[0]?.form_schema_snapshot || [];
}

/**
 * Validates either:
 *   - Public Candidate Application (`mode = 'admission'`)
 *   - Student Portal Onboarding (`mode = 'student'`)
 * Fetches schema & criteria in ONE single SQL query.
 */
export async function validateSubmissionPayload({
  clientOrPool = { query },
  websiteId,
  admissionId = null,
  applicantId = null,
  studentId = null,
  mode = 'admission',
  payload, // { core: { date_of_birth, gender, ... }, info: {}, guardians: {}, addresses: {} }
}) {
  const runner = typeof clientOrPool?.query === 'function'
    ? clientOrPool
    : (typeof clientOrPool === 'function' ? { query: clientOrPool } : { query });
  const errors = [];

  // 1. Single-Roundtrip Query for Circular Snapshot/Rules OR Student Form Fields
  const metaSql = `
    SELECT
      (
        SELECT row_to_json(a)
        FROM (
          SELECT id, status, start_date, end_date, capacity, criteria_rules, form_schema_snapshot
          FROM website_admissions
          WHERE id = $2 AND website_id = $1
        ) a
      ) AS circular,
      COALESCE((
        SELECT json_agg(row_to_json(ff))
        FROM (
          SELECT id AS form_field_id, target_scope, field_key, label, field_type,
                 options, validation_regex, is_unique, is_editable_by_student,
                 CASE
                   WHEN $3 = 'admission' THEN (is_required_in_admission OR is_required)
                   ELSE (is_required_in_student OR is_required)
                 END AS is_required
          FROM website_form_fields
          WHERE website_id = $1
            AND (
              ($3 = 'admission' AND is_visible_in_admission = TRUE) OR
              ($3 = 'student' AND is_visible_in_student = TRUE)
            )
          ORDER BY id ASC
        ) ff
      ), '[]'::json) AS live_fields;
  `;

  const metaRes = await runner.query(metaSql, [websiteId, admissionId, mode]);
  const { circular, live_fields: liveFields } = metaRes.rows[0];

  if (mode === 'admission') {
    if (!circular) return { valid: false, errors: ['Admission circular not found.'] };
    if (circular.status !== 'open') return { valid: false, errors: ['This admission circular is not currently open.'] };
  }

  // Use frozen circular snapshot if available in admission mode; otherwise fall back to live fields
  const activeFields =
    mode === 'admission' && Array.isArray(circular?.form_schema_snapshot) && circular.form_schema_snapshot.length > 0
      ? circular.form_schema_snapshot
      : (Array.isArray(liveFields) ? liveFields : []);

  // 2. Validate Dynamic Fields
  const uniqueChecks = [];

  for (const field of activeFields) {
    const bucket = payload[field.target_scope] || {};
    const rawVal = bucket[field.field_key];
    const isEmpty = rawVal === undefined || rawVal === null || String(rawVal).trim() === '';

    if (field.is_required && isEmpty) {
      errors.push(`${field.label} is required.`);
      continue;
    }
    if (isEmpty) continue;

    if (field.field_type === 'number' && Number.isNaN(Number(rawVal))) {
      errors.push(`${field.label} must be a valid number.`);
    }

    if (field.field_type === 'select' && Array.isArray(field.options) && field.options.length > 0) {
      const allowed = field.options.map((o) => (typeof o === 'object' && o !== null ? String(o.value ?? o.label) : String(o)));
      if (!allowed.includes(String(rawVal))) {
        errors.push(`${field.label} has an invalid option selected.`);
      }
    }

    if (field.validation_regex) {
      try {
        const re = new RegExp(field.validation_regex);
        if (!re.test(String(rawVal))) {
          errors.push(`${field.label} format is invalid.`);
        }
      } catch (_) {}
    }

    if (field.is_unique && field.target_scope === 'info') {
      uniqueChecks.push({ key: field.field_key, value: String(rawVal).trim(), label: field.label });
    }
  }

  // 3. Evaluate Admission Eligibility Criteria (Age + Recursive AST Rules)
  if (mode === 'admission' && circular?.criteria_rules) {
    const { age, rules } = circular.criteria_rules;
    const contextData = {
      core: { ...(payload.core || {}) },
      info: { ...(payload.info || {}) },
      guardians: { ...(payload.guardians || {}) },
      addresses: { ...(payload.addresses || {}) },
    };

    // Calculate candidate age in years
    if (payload.core?.date_of_birth) {
      const dob = new Date(payload.core.date_of_birth);
      const refDate = age?.as_of_date ? new Date(age.as_of_date) : new Date();
      const ageYears = (refDate - dob) / (365.25 * 24 * 60 * 60 * 1000);
      contextData.core.age_years = Number(ageYears.toFixed(2));

      if (age?.enabled) {
        if (age.min_years !== null && age.min_years !== undefined && ageYears < Number(age.min_years)) {
          errors.push(`Minimum age required is ${age.min_years} years.`);
        }
        if (age.max_years !== null && age.max_years !== undefined && ageYears > Number(age.max_years)) {
          errors.push(`Maximum age allowed is ${age.max_years} years.`);
        }
      }
    } else if (age?.enabled) {
      errors.push('Date of birth is required to verify age eligibility.');
    }

    // Evaluate nested AND / OR rules
    if (rules) {
      const astResult = evaluateCriteriaAST(rules, contextData);
      if (!astResult.passed) {
        errors.push(...astResult.errors);
      }
    }
  }

  // 4. Concurrency-Safe JSONB Uniqueness Check
  if (uniqueChecks.length > 0 && errors.length === 0) {
    for (const check of uniqueChecks) {
      // Acquire transaction advisory lock if running inside a transaction client
      await runner.query(
        `SELECT pg_advisory_xact_lock(hashtext($1::text || ':' || $2::text || ':' || $3::text))`,
        [websiteId, check.key, check.value]
      );

      const dupSql =
        mode === 'admission'
          ? `SELECT 1 FROM website_admission_applicant_info
             WHERE website_id = $1 AND data ->> $2 = $3 AND ($4::bigint IS NULL OR applicant_id != $4)
             LIMIT 1`
          : `SELECT 1 FROM website_student_info
             WHERE website_id = $1 AND data ->> $2 = $3 AND ($4::bigint IS NULL OR student_id != $4)
             LIMIT 1`;

      const dupParams =
        mode === 'admission'
          ? [websiteId, check.key, check.value, applicantId]
          : [websiteId, check.key, check.value, studentId];

      const dupRes = await runner.query(dupSql, dupParams);
      if (dupRes.rowCount > 0) {
        errors.push(`${check.label} "${check.value}" is already registered.`);
      }
    }
  }

  return { valid: errors.length === 0, errors, activeFields };
}
