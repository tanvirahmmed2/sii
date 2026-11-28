import { NextResponse } from "next/server";
import crypto from "node:crypto";
import dns from "node:dns/promises";
import slugify from "slugify";
import pool, { queryDb } from "../../../../../lib/database/db";
import { getCreatorSession, invalidateWebsiteCache } from "../../../../../lib/middleware/creator";
import {
  BASE_DOMAIN,
  getBaseUrl,
  CUSTOM_DOMAIN_CNAME_TARGET,
  CUSTOM_DOMAIN_A_TARGET,
  JWT_SECRET,
} from "../../../../../lib/database/secret";
import { uploadImage, deleteImage, uploadPdf } from "../../../../../lib/database/cloudinary";
import {
  ensureLifecycleSynced,
  isSubscriptionActiveRecord,
  scheduleWebsiteDeletion,
  cancelWebsiteDeletion,
} from "../../../../../lib/database/websiteLifecycle";
import { checkDomainAvailability, checkCustomDomainAvailability } from "./check-domain/route";
import { buildAcademicConfigPayload } from "../../../../../lib/modules/academicConfig";

export const dynamic = "force-dynamic";

const DEFAULT_DAYS = [
  { name: "Sunday", day_order: 1, status: "on" },
  { name: "Monday", day_order: 2, status: "on" },
  { name: "Tuesday", day_order: 3, status: "on" },
  { name: "Wednesday", day_order: 4, status: "on" },
  { name: "Thursday", day_order: 5, status: "on" },
  { name: "Friday", day_order: 6, status: "off" },
  { name: "Saturday", day_order: 7, status: "off" },
];

function normalizeInstitutionType(type: any) {
  if (!type) return "School";
  const lower = String(type).trim().toLowerCase();
  switch (lower) {
    case "school":
      return "School";
    case "university":
      return "University";
    case "high-school":
    case "high school":
      return "High School";
    case "college":
      return "College";
    case "coaching academy":
    case "coaching-academy":
    case "coaching":
      return "Coaching Academy";
    case "madrasah":
      return "Madrasah / Religious Institute";
    case "private isntitution":
    case "private institution":
    case "private-institution":
      return "Private Institution";
    case "training institute":
    case "training-institute":
      return "Vocational & Training Institute";
    default:
      return String(type).trim();
  }
}

function buildCustomDomainChallengeToken(websiteId: number | string, cleanDomain: string): string {
  const secret = JWT_SECRET || "hiesci_dns_verification_secret_2026";
  const hmac = crypto
    .createHmac("sha256", secret)
    .update(`${websiteId}:${cleanDomain.toLowerCase().trim()}`)
    .digest("hex")
    .slice(0, 16);
  return `hiesci-verification-${hmac}`;
}

function buildCustomDomainDnsRecords(cleanDomain: string, token: string): any[] {
  const isApex = cleanDomain.split(".").length === 2;
  const dnsRecords: any[] = [];
  if (isApex) {
    dnsRecords.push({
      type: "A",
      name: "@",
      value: CUSTOM_DOMAIN_A_TARGET,
      ttl: "3600",
      description: "Apex root IP address pointing to platform edge network",
    });
    dnsRecords.push({
      type: "CNAME",
      name: "www",
      value: CUSTOM_DOMAIN_CNAME_TARGET,
      ttl: "3600",
      description: "WWW subdomain routing to platform host",
    });
  } else {
    const subHost = cleanDomain.split(".")[0];
    dnsRecords.push({
      type: "CNAME",
      name: subHost,
      value: CUSTOM_DOMAIN_CNAME_TARGET,
      ttl: "3600",
      description: "Canonical hostname pointing traffic to platform host",
    });
  }
  dnsRecords.push({
    type: "TXT",
    name: `_hiesci-challenge${isApex ? "" : "." + cleanDomain.split(".")[0]}`,
    value: token,
    ttl: "3600",
    description: "Domain ownership challenge verification record",
  });
  return dnsRecords;
}

async function verifyCustomDomainDnsLive(
  targetDomain: string,
  token: string,
  bypassInDev: boolean = false
): Promise<{ verified: boolean; detected: any; isLocalOrTest: boolean; canBypassInDev: boolean }> {
  const isApex = targetDomain.split(".").length === 2;
  const isDev = process.env.NODE_ENV !== "production";
  const isLocalOrTest =
    targetDomain.endsWith(".localhost") ||
    targetDomain.endsWith(".local") ||
    targetDomain.endsWith(".test") ||
    targetDomain.includes("localhost");

  let verified = false;
  const detected: any = { cname: [], txt: [], a: [] };

  if (isLocalOrTest || (isDev && bypassInDev)) {
    verified = true;
    return { verified, detected, isLocalOrTest, canBypassInDev: isDev && isLocalOrTest };
  }

  try {
    const cnames = await dns.resolveCname(targetDomain);
    detected.cname = cnames;
    if (
      cnames.some(
        (c: any) =>
          c.toLowerCase() === CUSTOM_DOMAIN_CNAME_TARGET.toLowerCase() ||
          c.toLowerCase().includes("hiesci") ||
          c.toLowerCase() === "domains.hiesci.com"
      )
    ) {
      verified = true;
    }
  } catch {}

  if (!verified) {
    try {
      const txtHost = `_hiesci-challenge.${targetDomain}`;
      const txtRecords = await dns.resolveTxt(txtHost).catch(() => dns.resolveTxt(targetDomain));
      detected.txt = txtRecords.flat();
      if (token && detected.txt.some((t: any) => t.includes(token))) {
        verified = true;
      }
    } catch {}
  }

  if (!verified && isApex) {
    try {
      const aRecords = await dns.resolve4(targetDomain);
      detected.a = aRecords;
      if (aRecords.includes(CUSTOM_DOMAIN_A_TARGET) || aRecords.includes("76.76.21.21")) {
        verified = true;
      }
    } catch {}
  }

  return { verified, detected, isLocalOrTest, canBypassInDev: isDev && isLocalOrTest };
}

async function resolveAssetUrlAndId(
  fileOrUrlVal: any,
  idVal: any,
  folder: string,
  isPdfFallback: boolean = false,
  rollbackTracker?: string[]
): Promise<{ url: string | null; publicId: string | null }> {
  const isBlobLike =
    fileOrUrlVal &&
    typeof fileOrUrlVal === "object" &&
    typeof fileOrUrlVal.arrayBuffer === "function";
  if (isBlobLike) {
    const fileName = String(fileOrUrlVal.name || "").toLowerCase();
    const isPdf = isPdfFallback && (fileOrUrlVal.type === "application/pdf" || fileName.endsWith(".pdf"));
    const up = isPdf ? await uploadPdf(fileOrUrlVal, folder) : await uploadImage(fileOrUrlVal, folder);
    const pubId = up.publicId || up.id || null;
    if (pubId && rollbackTracker) rollbackTracker.push(pubId);
    return {
      url: up.secure_url || up.url || null,
      publicId: pubId || String(idVal || "").trim() || null,
    };
  }
  const rawUrl = String(fileOrUrlVal || "").trim();
  const rawId = String(idVal || "").trim();
  if (!rawUrl) {
    return { url: null, publicId: rawId || null };
  }
  if (rawUrl.startsWith("data:")) {
    const isPdf = isPdfFallback || rawUrl.startsWith("data:application/pdf");
    const up = isPdf ? await uploadPdf(rawUrl, folder) : await uploadImage(rawUrl, folder);
    const pubId = up.publicId || up.id || rawId || null;
    if (pubId && rollbackTracker) rollbackTracker.push(pubId);
    return {
      url: up.secure_url || up.url || null,
      publicId: pubId,
    };
  }
  return { url: rawUrl, publicId: rawId || null };
}

function buildResolvedAcademicConfig(rawConfig: any) {
  return buildAcademicConfigPayload(rawConfig);
}

export async function GET(request: any) {
  try {
    await ensureLifecycleSynced();
    const sessionCreator = await getCreatorSession(request);
    const { searchParams } = new URL(request.url);
    const creatorIdParam = searchParams.get("creatorId");
    const websiteIdParam = searchParams.get("id");
    const domainParam =
      searchParams.get("domain") ||
      searchParams.get("subdomain") ||
      searchParams.get("slug") ||
      searchParams.get("website");
    const checkDomainParam = searchParams.get("checkDomain");

    if (checkDomainParam) {
      const type = searchParams.get("type") || "";
      if (type === "custom") {
        const checkRes = await checkCustomDomainAvailability(checkDomainParam, websiteIdParam, request);
        return NextResponse.json({
          success: true,
          baseDomain: BASE_DOMAIN,
          baseUrl: getBaseUrl(request),
          ...checkRes,
        });
      }
      const checkRes = await checkDomainAvailability(checkDomainParam, websiteIdParam, request);
      return NextResponse.json({
        success: true,
        baseUrl: getBaseUrl(request),
        ...checkRes,
      });
    }

    const creatorId = creatorIdParam ? Number(creatorIdParam) : Number(sessionCreator?.id);
    if (!creatorId) {
      return NextResponse.json({ success: false, error: "Unauthorized or missing creator ID" }, { status: 401 });
    }
    if (sessionCreator && Number(sessionCreator.id) !== creatorId) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const dynamicBaseUrl = getBaseUrl(request);
    const targetIdentifier = websiteIdParam || domainParam;

    if (targetIdentifier && targetIdentifier !== "new") {
      const cleanIdent = String(targetIdentifier).trim().toLowerCase();
      const isNum = /^[0-9]+$/.test(cleanIdent);
      const singleRes = await queryDb(
        `SELECT w.*, 
                w.name AS site_title,
                COALESCE(NULLIF(wi.other_details->>'tagline', ''), 'Excellence in ' || COALESCE(w.institution_type, 'Education')) AS tagline,
                COALESCE(NULLIF(wi.other_details->>'motto', ''), NULLIF(wi.other_details->>'tagline', ''), 'Excellence in ' || COALESCE(w.institution_type, 'Education')) AS motto,
                COALESCE(wi.other_details->>'mission', '') AS mission,
                COALESCE(wi.other_details->>'vision', '') AS vision,
                COALESCE(wi.other_details->>'history', '') AS history,
                COALESCE(wi.other_details->>'map_url', '') AS map_url,
                COALESCE(w.facebook_url, '') AS facebook_url,
                COALESCE(w.twitter_url, '') AS twitter_url,
                COALESCE(w.instagram_url, '') AS instagram_url,
                COALESCE(w.youtube_url, '') AS youtube_url,
                COALESCE(w.linkedin_url, '') AS linkedin_url,
                p.id AS package_id,
                p.name AS package_name,
                p.slug AS package_slug,
                p.short_description AS package_short_description,
                p.description AS package_description,
                p.tagline AS package_tagline,
                p.bdt_per_month AS package_bdt_per_month,
                p.usd_per_month AS package_usd_per_month,
                p.eur_per_month AS package_eur_per_month,
                p.gbp_per_month AS package_gbp_per_month,
                p.aud_per_month AS package_aud_per_month,
                p.cad_per_month AS package_cad_per_month,
                p.discount_percentage AS package_discount_percentage,
                p.max_students AS package_max_students,
                p.max_teachers AS package_max_teachers,
                p.max_staff AS package_max_staff,
                p.max_storage_mb AS package_max_storage_mb,
                p.is_available_student_panel AS package_is_available_student_panel,
                p.is_available_teacher_panel AS package_is_available_teacher_panel,
                p.is_available_custom_domain AS package_is_available_custom_domain,
                p.features AS package_features,
                p.grace_period AS package_grace_period,
                s.id AS subscription_id,
                s.status AS subscription_status,
                s.billing_cycle AS subscription_billing_cycle,
                s.current_period_end AS subscription_period_end,
                (CASE WHEN LOWER(COALESCE(s.status, '')) = 'active' AND (s.current_period_end IS NULL OR s.current_period_end > CURRENT_TIMESTAMP) THEN TRUE ELSE FALSE END) AS subscription_is_active,
                (CASE WHEN LOWER(COALESCE(s.status, '')) = 'active' AND (s.current_period_end IS NULL OR s.current_period_end > CURRENT_TIMESTAMP) THEN COALESCE(w.is_maintenance_mode, FALSE) ELSE TRUE END) AS effective_maintenance_mode,
                (CASE WHEN w.status = 'active' AND NOT COALESCE(w.is_maintenance_mode, FALSE) AND LOWER(COALESCE(s.status, '')) = 'active' AND (s.current_period_end IS NULL OR s.current_period_end > CURRENT_TIMESTAMP) THEN true ELSE false END) AS is_published,
                COALESCE(
                  (SELECT wd.domain FROM website_domains wd WHERE wd.website_id = w.id AND wd.domain_type = 'subdomain' LIMIT 1),
                  (SELECT wd.domain FROM website_domains wd WHERE wd.website_id = w.id AND wd.is_primary = TRUE LIMIT 1),
                  w.slug
                ) AS subdomain,
                (SELECT wd.domain FROM website_domains wd WHERE wd.website_id = w.id AND wd.domain_type = 'custom_domain' LIMIT 1) AS custom_domain,
                (SELECT COALESCE(wd.is_verified, FALSE) FROM website_domains wd WHERE wd.website_id = w.id AND wd.domain_type = 'custom_domain' LIMIT 1) AS custom_domain_verified,
                (SELECT row_to_json(wd.*) FROM website_domains wd WHERE wd.website_id = w.id AND wd.domain_type = 'custom_domain' LIMIT 1) AS custom_domain_record,
                (SELECT row_to_json(wi.*) FROM website_information wi WHERE wi.website_id = w.id LIMIT 1) AS website_information,
                (SELECT row_to_json(wac.*) FROM website_academic_configs wac WHERE wac.website_id = w.id LIMIT 1) AS academic_config,
                (SELECT json_agg(wd.*) FROM website_domains wd WHERE wd.website_id = w.id) AS domains
         FROM websites w
         LEFT JOIN website_information wi ON wi.website_id = w.id
         LEFT JOIN subscriptions s ON w.subscription_id = s.id
         LEFT JOIN packages p ON s.package_id = p.id
         WHERE w.creator_id = $1 
           AND (
             ($2 = true AND w.id = $3::bigint) OR
             LOWER(w.slug) = LOWER($4) OR
             EXISTS (
               SELECT 1 FROM website_domains wd 
               WHERE wd.website_id = w.id 
                 AND (
                   LOWER(wd.domain) = LOWER($4) 
                   OR LOWER(COALESCE(wd.domain_name, '')) = LOWER($4)
                   OR LOWER(wd.domain) LIKE LOWER($5)
                 )
             )
           )
         LIMIT 1`,
        [creatorId, isNum, isNum ? Number(cleanIdent) : -1, cleanIdent, `${cleanIdent}.%`]
      );

      if (singleRes.rows.length === 0) {
        return NextResponse.json({ success: false, error: "Website not found" }, { status: 404 });
      }

      const site = singleRes.rows[0];
      let allowedHomeModules: any[] = [];
      let allowedControlModules: any[] = [];

      if (site.package_id) {
        const [hmRes, cmRes] = await Promise.all([
          queryDb(
            `SELECT hm.id, hm.name, hm.path, hm.category, hm.description, hm.icon, hm.is_active, hm.display_order
             FROM package_home_modules phm
             JOIN website_home_modules hm ON hm.id = phm.home_module_id
             WHERE phm.package_id = $1 AND hm.is_active = TRUE
             ORDER BY hm.display_order ASC, hm.id ASC`,
            [site.package_id]
          ).catch(() => ({ rows: [] })),
          queryDb(
            `SELECT cm.id, cm.name, cm.path, cm.category, cm.description, cm.icon, cm.is_active, cm.display_order
             FROM package_control_modules pcm
             JOIN website_control_modules cm ON cm.id = pcm.control_module_id
             WHERE pcm.package_id = $1 AND cm.is_active = TRUE
             ORDER BY cm.display_order ASC, cm.id ASC`,
            [site.package_id]
          ).catch(() => ({ rows: [] })),
        ]);
        allowedHomeModules = hmRes.rows || [];
        allowedControlModules = cmRes.rows || [];
      }

      if (allowedHomeModules.length === 0) {
        const allHmRes = await queryDb(
          `SELECT hm.id, hm.name, hm.path, hm.category, hm.description, hm.icon, hm.is_active, hm.display_order
           FROM website_home_modules hm
           WHERE hm.is_active = TRUE
           ORDER BY hm.display_order ASC, hm.id ASC`
        ).catch(() => ({ rows: [] }));
        allowedHomeModules = allHmRes.rows || [];
      }

      if (allowedControlModules.length === 0) {
        const allCmRes = await queryDb(
          `SELECT cm.id, cm.name, cm.path, cm.category, cm.description, cm.icon, cm.is_active, cm.display_order
           FROM website_control_modules cm
           WHERE cm.is_active = TRUE
           ORDER BY cm.display_order ASC, cm.id ASC`
        ).catch(() => ({ rows: [] }));
        allowedControlModules = allCmRes.rows || [];
      }

      site.package = {
        id: site.package_id,
        name: site.package_name,
        slug: site.package_slug,
        short_description: site.package_short_description,
        description: site.package_description,
        tagline: site.package_tagline,
        bdt_per_month: site.package_bdt_per_month,
        usd_per_month: site.package_usd_per_month,
        discount_percentage: site.package_discount_percentage,
        max_students: site.package_max_students,
        max_teachers: site.package_max_teachers,
        max_staff: site.package_max_staff,
        max_storage_mb: site.package_max_storage_mb,
        is_available_student_panel: site.package_is_available_student_panel ?? true,
        is_available_teacher_panel: site.package_is_available_teacher_panel ?? true,
        is_available_custom_domain: site.package_is_available_custom_domain ?? false,
        features: site.package_features || [],
        grace_period: site.package_grace_period,
        subscription_id: site.subscription_id,
        subscription_status: site.subscription_status,
        subscription_billing_cycle: site.subscription_billing_cycle,
        subscription_period_end: site.subscription_period_end,
      };
      site.allowed_home_modules = allowedHomeModules;
      site.allowed_control_modules = allowedControlModules;
      site.is_available_student_panel = site.package.is_available_student_panel;
      site.is_available_teacher_panel = site.package.is_available_teacher_panel;
      site.is_available_custom_domain = site.package.is_available_custom_domain;
      site.is_maintenance_mode = Boolean(site.effective_maintenance_mode ?? site.is_maintenance_mode);
      delete site.effective_maintenance_mode;

      return NextResponse.json({
        success: true,
        baseDomain: BASE_DOMAIN || "localhost:3000",
        baseUrl: dynamicBaseUrl,
        cnameTarget: CUSTOM_DOMAIN_CNAME_TARGET,
        aTarget: CUSTOM_DOMAIN_A_TARGET,
        website: site,
      });
    }

    const res = await queryDb(
      `SELECT w.*, 
              w.name AS site_title,
              COALESCE(NULLIF(wi.other_details->>'tagline', ''), 'Excellence in ' || COALESCE(w.institution_type, 'Education')) AS tagline,
              p.name AS package_name,
              p.slug AS package_slug,
              s.id AS subscription_id,
              s.status AS subscription_status,
              s.billing_cycle AS subscription_billing_cycle,
              s.current_period_end AS subscription_period_end,
              (CASE WHEN LOWER(COALESCE(s.status, '')) = 'active' AND (s.current_period_end IS NULL OR s.current_period_end > CURRENT_TIMESTAMP) THEN TRUE ELSE FALSE END) AS subscription_is_active,
              (CASE WHEN LOWER(COALESCE(s.status, '')) = 'active' AND (s.current_period_end IS NULL OR s.current_period_end > CURRENT_TIMESTAMP) THEN COALESCE(w.is_maintenance_mode, FALSE) ELSE TRUE END) AS is_maintenance_mode,
              (CASE WHEN w.status = 'active' AND NOT COALESCE(w.is_maintenance_mode, FALSE) AND LOWER(COALESCE(s.status, '')) = 'active' AND (s.current_period_end IS NULL OR s.current_period_end > CURRENT_TIMESTAMP) THEN true ELSE false END) AS is_published,
              COALESCE(
                (SELECT wd.domain FROM website_domains wd WHERE wd.website_id = w.id AND wd.domain_type = 'subdomain' LIMIT 1),
                (SELECT wd.domain FROM website_domains wd WHERE wd.website_id = w.id AND wd.is_primary = TRUE LIMIT 1),
                w.slug
              ) AS subdomain,
              (SELECT wd.domain FROM website_domains wd WHERE wd.website_id = w.id AND wd.domain_type = 'custom_domain' LIMIT 1) AS custom_domain,
              (SELECT COALESCE(wd.is_verified, FALSE) FROM website_domains wd WHERE wd.website_id = w.id AND wd.domain_type = 'custom_domain' LIMIT 1) AS custom_domain_verified,
              (SELECT row_to_json(wd.*) FROM website_domains wd WHERE wd.website_id = w.id AND wd.domain_type = 'custom_domain' LIMIT 1) AS custom_domain_record,
              (SELECT row_to_json(wi.*) FROM website_information wi WHERE wi.website_id = w.id LIMIT 1) AS website_information,
              (SELECT row_to_json(wac.*) FROM website_academic_configs wac WHERE wac.website_id = w.id LIMIT 1) AS academic_config
       FROM websites w
       LEFT JOIN website_information wi ON wi.website_id = w.id
       LEFT JOIN subscriptions s ON w.subscription_id = s.id
       LEFT JOIN packages p ON s.package_id = p.id
       WHERE w.creator_id = $1
       ORDER BY w.id DESC`,
      [creatorId]
    ).catch(() => ({ rows: [] }));

    return NextResponse.json({
      success: true,
      baseDomain: BASE_DOMAIN || "localhost:3000",
      baseUrl: dynamicBaseUrl,
      websites: res.rows,
    });
  } catch (error: any) {
    console.error("Websites GET API error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function handleWebsitesAction(body: any, sessionCreator: any, request: any = null) {
  const { action } = body;
  const creatorId = Number(body.creatorId || sessionCreator?.id);

  if (action === "check_domain") {
    const domainToCheck = body.domain || body.subdomain || body.customDomain || "";
    const websiteId = body.websiteId || body.id || null;
    const isCustom = body.type === "custom" || Boolean(body.customDomain);
    if (isCustom) {
      const checkRes = await checkCustomDomainAvailability(domainToCheck, websiteId, request);
      return NextResponse.json({
        success: true,
        baseDomain: BASE_DOMAIN,
        baseUrl: getBaseUrl(request),
        ...checkRes,
      });
    }
    const checkRes = await checkDomainAvailability(domainToCheck, websiteId, request);
    return NextResponse.json({
      success: true,
      baseUrl: getBaseUrl(request),
      ...checkRes,
    });
  }

  if (!creatorId) {
    return NextResponse.json({ success: false, error: "Unauthorized: Creator ID required" }, { status: 401 });
  }
  if (sessionCreator && Number(sessionCreator.id) !== creatorId) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const baseDomain = BASE_DOMAIN || "localhost:3000";

  if (action === "upload_document" || action === "upload_pdf" || action === "upload_verification") {
    const fileInput = body.file || body.pdf || body.image || body.data;
    if (!fileInput) {
      return NextResponse.json({ success: false, error: "Document or image data is required." }, { status: 400 });
    }
    const docType = String(body.documentType || "verification").replace(/[^a-zA-Z0-9_-]/g, "_");
    const folder = `school/verification/${creatorId}/${docType}`;
    const oldPublicId = body.oldPublicId || body.old_public_id || null;
    if (oldPublicId) {
      await deleteImage(String(oldPublicId)).catch(() => {});
    }
    try {
      const uploadRes = await uploadImage(fileInput, folder);
      return NextResponse.json({
        success: true,
        message: "Verification asset uploaded successfully to Cloudinary.",
        url: uploadRes.secure_url || uploadRes.url,
        publicId: uploadRes.publicId || uploadRes.id,
        id: uploadRes.publicId || uploadRes.id,
        format: uploadRes.format,
        bytes: uploadRes.bytes,
        originalFilename: uploadRes.original_filename || body.fileName || "document",
      });
    } catch (upErr: any) {
      console.error("Cloudinary document upload error:", upErr);
      return NextResponse.json(
        { success: false, error: `Failed to upload asset to Cloudinary: ${upErr.message}` },
        { status: 500 }
      );
    }
  }

  if (action === "delete_uploaded_asset" || action === "remove_verification_doc") {
    const publicId = String(body.publicId || body.public_id || "").trim();
    if (!publicId) {
      return NextResponse.json({ success: false, error: "publicId is required." }, { status: 400 });
    }
    try {
      await deleteImage(publicId);
      return NextResponse.json({ success: true, message: "Uploaded asset deleted from Cloudinary." });
    } catch (err: any) {
      return NextResponse.json({ success: false, error: err.message || "Failed to delete asset." }, { status: 500 });
    }
  }

  if (action === "create_website" || action === "setup_website" || !action) {
    if ((body.customDomain && String(body.customDomain).trim()) || (body.custom_domain && String(body.custom_domain).trim())) {
      return NextResponse.json(
        {
          success: false,
          error: "Custom domains cannot be added during website creation. Claim an available subdomain now and verify & add custom domains later in Edit Website.",
        },
        { status: 400 }
      );
    }

    const name = String(body.name || body.websiteName || "").trim();
    const contactEmail = String(body.mail || body.email || body.contactEmail || body.contact_email || "").trim();
    const contactPhone = String(body.contactNumber || body.contact_number || body.phone || body.contactPhone || body.contact_phone || "").trim();
    const address = String(body.address || "").trim();

    if (!name || !contactEmail || !contactPhone || !address) {
      return NextResponse.json(
        { success: false, error: "Institution name, contact email, contact phone, and campus address are required." },
        { status: 400 }
      );
    }

    const rawInstitutionType = body.institutionType || body.institution_type || body.type || "school";
    const institutionType = normalizeInstitutionType(rawInstitutionType);
    const eiinNumber = String(body.eeinNumber || body.eein_number || body.eiinNumber || body.eiin_number || "").trim();

    const creatorNid = String(body.creatorNid || body.creator_nid || "").trim();
    if (!creatorNid) {
      return NextResponse.json(
        { success: false, error: "Creator National ID (NID) number is required for verification." },
        { status: 400 }
      );
    }

    const rawNidFront = body.nid_front_file || body.creatorNidFrontImage || body.creator_nid_front_image || "";
    const rawNidFrontId = body.creatorNidFrontImageId || body.creator_nid_front_image_id || "";
    const rawNidBack = body.nid_back_file || body.creatorNidBackImage || body.creator_nid_back_image || "";
    const rawNidBackId = body.creatorNidBackImageId || body.creator_nid_back_image_id || "";

    const hasNidFront =
      (typeof rawNidFront === "object" && rawNidFront !== null && typeof rawNidFront.arrayBuffer === "function") ||
      Boolean(String(rawNidFront).trim());
    const hasNidBack =
      (typeof rawNidBack === "object" && rawNidBack !== null && typeof rawNidBack.arrayBuffer === "function") ||
      Boolean(String(rawNidBack).trim());

    if (!hasNidFront || !hasNidBack) {
      return NextResponse.json(
        { success: false, error: "Both Creator NID Front image and NID Back image are required for verification." },
        { status: 400 }
      );
    }

    const rawDomain = String(body.subdomain || body.domain || "").trim();
    if (!rawDomain) {
      return NextResponse.json({ success: false, error: "An available subdomain is required." }, { status: 400 });
    }
    const domainValidation = await checkDomainAvailability(rawDomain, null, request);
    if (!domainValidation.available) {
      return NextResponse.json(
        {
          success: false,
          error: domainValidation.error || "Requested subdomain is not available. Please choose another prefix.",
        },
        { status: 400 }
      );
    }

    const cleanSubdomain = domainValidation.domain;
    const fullSubdomain = domainValidation.fullDomain || `${cleanSubdomain}.${baseDomain}`;
    const slug = cleanSubdomain;

    const academicConfig = buildResolvedAcademicConfig(body.academicConfig || body.academic_config || {});
    const rawAcademics = body.academics || {};

    const cleanSessions: Array<{ name: string; status: string }> = Array.isArray(rawAcademics.sessions)
      ? rawAcademics.sessions
          .map((s: any) => ({
            name: String(s?.name || s || "").trim(),
            status: ["active", "inactive", "archived", "upcoming"].includes(String(s?.status || "").toLowerCase())
              ? String(s.status).toLowerCase()
              : "active",
          }))
          .filter((s: any) => Boolean(s.name))
      : [];

    const cleanDepartments: Array<any> = Array.isArray(rawAcademics.departments)
      ? rawAcademics.departments
          .map((d: any, idx: number) => ({
            key: String(d?.key || d?.name || idx).trim(),
            name: String(d?.name || "").trim(),
            code: String(d?.code || "").trim().toUpperCase() || null,
            description: String(d?.description || "").trim() || null,
            order_no: Number(d?.order_no ?? idx + 1) || idx + 1,
            motto: String(d?.motto || "").trim() || null,
            summary: String(d?.summary || "").trim() || null,
            expected_cost: d?.expected_cost !== undefined && d?.expected_cost !== "" ? Number(d.expected_cost) || 0 : 0,
            head_name: String(d?.head_name || "").trim() || null,
            head_title: String(d?.head_title || "").trim() || null,
            head_designation: String(d?.head_designation || "Head of Department").trim(),
            head_email: String(d?.head_email || "").trim() || null,
            head_phone: String(d?.head_phone || "").trim() || null,
          }))
          .filter((d: any) => Boolean(d.name))
      : [];

    const rawClassesList: Array<any> = Array.isArray(rawAcademics.classes)
      ? rawAcademics.classes
          .map((c: any, idx: number) => ({
            key: String(c?.key || c?.name || idx).trim(),
            name: String(c?.name || "").trim(),
            code: String(c?.code || "").trim().toUpperCase(),
            department_key: String(c?.department_key || c?.department_name || "").trim() || null,
            max_seats: Math.max(1, parseInt(c?.max_seats ?? c?.capacity ?? "40", 10) || 40),
            description: String(c?.description || "").trim() || null,
          }))
          .filter((c: any) => Boolean(c.name))
      : [];
    const seenClassNames = new Set<string>();
    const cleanClasses: Array<any> = rawClassesList.filter((c: any) => {
      const k = c.name.toLowerCase();
      if (seenClassNames.has(k)) return false;
      seenClassNames.add(k);
      return true;
    });

    const cleanSections: Array<any> = Array.isArray(rawAcademics.sections)
      ? rawAcademics.sections
          .map((s: any) => ({
            name: String(s?.name || "").trim(),
            class_key: String(s?.class_key || s?.class_name || "").trim() || null,
            department_key: String(s?.department_key || s?.department_name || "").trim() || null,
            session_name: String(s?.session_name || "").trim() || null,
            capacity: Math.max(1, parseInt(s?.capacity ?? "40", 10) || 40),
            room_number: String(s?.room_number || "").trim() || null,
          }))
          .filter((s: any) => Boolean(s.name))
      : [];

    const validSubjectTypes = ["Theory", "Practical", "Both", "Optional"];
    const cleanSubjects: Array<any> = Array.isArray(rawAcademics.subjects)
      ? rawAcademics.subjects
          .map((sub: any) => ({
            name: String(sub?.name || "").trim(),
            code: String(sub?.code || "").trim().toUpperCase(),
            class_key: String(sub?.class_key || sub?.class_name || "").trim() || null,
            type: validSubjectTypes.includes(String(sub?.type)) ? String(sub.type) : "Theory",
            full_marks: Math.max(1, parseFloat(sub?.full_marks ?? "100") || 100),
            pass_marks: Math.max(0, parseFloat(sub?.pass_marks ?? "33") || 33),
            is_optional: Boolean(sub?.is_optional || sub?.type === "Optional"),
            description: String(sub?.description || "").trim() || null,
          }))
          .filter((sub: any) => Boolean(sub.name))
      : [];

    const cleanDays: Array<{ name: string; day_order: number; status: string }> =
      Array.isArray(rawAcademics.days) && rawAcademics.days.length > 0
        ? rawAcademics.days
            .map((d: any, idx: number) => ({
              name: String(d?.name || "").trim(),
              day_order: Math.min(7, Math.max(1, parseInt(d?.day_order ?? String(idx + 1), 10) || idx + 1)),
              status: d?.status === "off" ? "off" : "on",
            }))
            .filter((d: any) => Boolean(d.name))
        : DEFAULT_DAYS;

    const cleanPeriods: Array<any> = Array.isArray(rawAcademics.periods)
      ? rawAcademics.periods
          .map((p: any) => ({
            name: String(p?.name || "").trim(),
            start_time: String(p?.start_time || "09:00").trim(),
            end_time: String(p?.end_time || "09:45").trim(),
            is_break: Boolean(p?.is_break),
          }))
          .filter((p: any) => Boolean(p.name))
      : [];

    const cleanRoutines: Array<any> = Array.isArray(rawAcademics.routines)
      ? rawAcademics.routines
          .map((r: any) => ({
            day_name: String(r?.day_name || "").trim(),
            period_name: String(r?.period_name || "").trim(),
            class_key: String(r?.class_key || r?.class_name || "").trim(),
            subject_name: String(r?.subject_name || "").trim(),
            section_name: String(r?.section_name || "").trim() || null,
            session_name: String(r?.session_name || "").trim() || null,
            room_number: String(r?.room_number || "").trim() || null,
          }))
          .filter((r: any) => r.day_name && r.period_name && r.class_key && r.subject_name)
      : [];

    if (academicConfig.use_session && academicConfig.require_session && cleanSessions.length === 0) {
      return NextResponse.json(
        { success: false, error: `At least one ${academicConfig.labels.session} must be configured in Academic Hierarchy.` },
        { status: 400 }
      );
    }
    if (academicConfig.use_department && academicConfig.require_department && cleanDepartments.length === 0) {
      return NextResponse.json(
        { success: false, error: `At least one ${academicConfig.labels.department} must be configured for your chosen Academic Hierarchy.` },
        { status: 400 }
      );
    }
    if (academicConfig.use_class && academicConfig.require_class && cleanClasses.length === 0) {
      return NextResponse.json(
        { success: false, error: `At least one ${academicConfig.labels.class} must be configured for your chosen Academic Hierarchy.` },
        { status: 400 }
      );
    }
    if (academicConfig.use_section && academicConfig.require_section && cleanSections.length === 0) {
      return NextResponse.json(
        { success: false, error: `At least one ${academicConfig.labels.section} must be configured for your chosen Academic Hierarchy.` },
        { status: 400 }
      );
    }

    const requestedSubId = Number(body.subscriptionId || body.subscription_id || 0);
    let chosenSub: any = null;

    if (requestedSubId > 0) {
      const subRes = await queryDb(
        `SELECT s.*, p.name AS package_name, 1 AS max_websites, p.id AS pkg_id
         FROM subscriptions s
         JOIN packages p ON s.package_id = p.id
         WHERE s.id = $1 AND s.creator_id = $2
         LIMIT 1`,
        [requestedSubId, creatorId]
      );
      if (subRes.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: "The selected subscription does not exist or does not belong to your account." },
          { status: 404 }
        );
      }
      chosenSub = subRes.rows[0];
      const isActiveStatus = ["completed", "active"].includes(String(chosenSub.status || "").toLowerCase());
      const isPeriodValid = !chosenSub.current_period_end || new Date(chosenSub.current_period_end) > new Date();
      if (!isActiveStatus || !isPeriodValid) {
        return NextResponse.json(
          {
            success: false,
            error: `Selected subscription (${chosenSub.package_name}) is inactive or expired. Please renew your subscription to create websites.`,
          },
          { status: 403 }
        );
      }
      const countRes = await queryDb(
        `SELECT COUNT(*)::int AS count FROM websites WHERE creator_id = $1 AND subscription_id = $2`,
        [creatorId, chosenSub.id]
      );
      const usedCount = countRes.rows[0].count;
      const maxLimit = Number(chosenSub.max_websites || 1);
      if (usedCount >= maxLimit) {
        return NextResponse.json(
          {
            success: false,
            error: `Your subscription for "${chosenSub.package_name}" allows a maximum of ${maxLimit} website(s). You have already created ${usedCount} website(s) for this subscription.`,
          },
          { status: 403 }
        );
      }
    } else {
      const allActiveSubsRes = await queryDb(
        `SELECT s.*, p.name AS package_name, 1 AS max_websites, p.id AS pkg_id,
                (SELECT COUNT(*)::int FROM websites w WHERE w.creator_id = $1 AND w.subscription_id = s.id) AS current_count
         FROM subscriptions s
         JOIN packages p ON s.package_id = p.id
         WHERE s.creator_id = $1
           AND s.status IN ('completed', 'active')
           AND (s.current_period_end IS NULL OR s.current_period_end > CURRENT_TIMESTAMP)
         ORDER BY s.id DESC`,
        [creatorId]
      );
      const availableSub = allActiveSubsRes.rows.find((s: any) => Number(s.current_count) < Number(s.max_websites || 1));
      if (!availableSub) {
        return NextResponse.json(
          {
            success: false,
            error:
              allActiveSubsRes.rows.length === 0
                ? "An active package subscription is required to create a website. Please purchase a package first."
                : "All your active subscriptions have reached their website creation limits. Please upgrade or purchase an additional package.",
          },
          { status: 403 }
        );
      }
      chosenSub = availableSub;
    }

    const primaryColor = body.primaryColor || body.primary_color || body.themeConfig?.primaryColor || "#1e40af";
    const secondaryColor = body.secondaryColor || body.secondary_color || body.themeConfig?.secondaryColor || "#0ea5e9";
    const themeName = body.theme || body.themeConfig?.mode || "default";
    const currency = String(body.currency || "BDT").trim().toUpperCase();
    const isMaintenanceMode = Boolean(
      body.is_maintenance_mode !== undefined ? body.is_maintenance_mode : body.isMaintenanceMode || false
    );
    const maintenanceMessage = String(
      body.maintenance_message ||
        body.maintenanceMessage ||
        "Our campus portal is temporarily under scheduled maintenance. Please check back shortly."
    ).trim();

    const facebookUrl = String(body.facebook_url || body.facebookUrl || "").trim() || null;
    const twitterUrl = String(body.twitter_url || body.twitterUrl || "").trim() || null;
    const instagramUrl = String(body.instagram_url || body.instagramUrl || "").trim() || null;
    const youtubeUrl = String(body.youtube_url || body.youtubeUrl || "").trim() || null;
    const linkedinUrl = String(body.linkedin_url || body.linkedinUrl || "").trim() || null;

    const uploadedPublicIdsToRollback: string[] = [];
    let logoAsset = { url: null as string | null, publicId: null as string | null };
    let faviconAsset = { url: null as string | null, publicId: null as string | null };
    let nidFrontAsset = { url: null as string | null, publicId: null as string | null };
    let nidBackAsset = { url: null as string | null, publicId: null as string | null };
    let eiinImageAsset = { url: null as string | null, publicId: null as string | null };
    let ugcAsset = { url: null as string | null, publicId: null as string | null };
    let additionalCertAsset = { url: null as string | null, publicId: null as string | null };

    const verificationFolder = `school/verification/${creatorId}`;
    try {
      logoAsset = await resolveAssetUrlAndId(
        body.logo_file || body.logo,
        body.logo_id,
        "website_logos",
        false,
        uploadedPublicIdsToRollback
      );
      faviconAsset = await resolveAssetUrlAndId(
        body.favicon_file || body.favicon,
        body.favicon_id,
        "website_favicons",
        false,
        uploadedPublicIdsToRollback
      );
      nidFrontAsset = await resolveAssetUrlAndId(
        rawNidFront,
        rawNidFrontId,
        `${verificationFolder}/nid_front`,
        false,
        uploadedPublicIdsToRollback
      );
      nidBackAsset = await resolveAssetUrlAndId(
        rawNidBack,
        rawNidBackId,
        `${verificationFolder}/nid_back`,
        false,
        uploadedPublicIdsToRollback
      );
      eiinImageAsset = await resolveAssetUrlAndId(
        body.eiin_certificate_file ||
          body.eiinCertificateImage ||
          body.eiin_certificate_image ||
          body.eiinCertificateUrl ||
          body.eiin_certificate_url,
        body.eiinCertificateImageId || body.eiin_certificate_image_id,
        `${verificationFolder}/eiin_certificate`,
        true,
        uploadedPublicIdsToRollback
      );
      ugcAsset = await resolveAssetUrlAndId(
        body.ugc_certificate_file || body.ugcCertificate || body.ugc_certificate,
        body.ugcCertificateId || body.ugc_certificate_id,
        `${verificationFolder}/ugc_certificate`,
        true,
        uploadedPublicIdsToRollback
      );
      additionalCertAsset = await resolveAssetUrlAndId(
        body.additional_certificate_file || body.additionalCertificate || body.additional_certificate,
        body.additionalCertificateId || body.additional_certificate_id,
        `${verificationFolder}/additional_certificate`,
        true,
        uploadedPublicIdsToRollback
      );
    } catch (uploadErr: any) {
      await Promise.allSettled(uploadedPublicIdsToRollback.map((pid) => deleteImage(pid)));
      return NextResponse.json(
        { success: false, error: `Failed to upload verification files: ${uploadErr?.message || "Upload error"}` },
        { status: 500 }
      );
    }

    const eiinCertificate = String(body.eiinCertificate || body.eiin_certificate || "").trim() || null;
    const verificationAddress = String(body.verificationAddress || body.verification_address || address || "").trim() || null;
    const otherDetailsObj =
      typeof body.otherDetails === "object" && body.otherDetails !== null
        ? body.otherDetails
        : typeof body.other_details === "object" && body.other_details !== null
        ? body.other_details
        : {};
    const otherDetailsJson = JSON.stringify({
      ...otherDetailsObj,
      tagline: String(body.tagline || "").trim() || null,
    });

    const client = await pool.connect();
    let newWebsite: any = null;

    try {
      await client.query("BEGIN");

      const siteInsert = await client.query(
        `INSERT INTO websites (
           creator_id, subscription_id, name, slug, institution_type, eiin_number,
           status, theme, primary_color, secondary_color,
           contact_email, contact_phone, address,
           facebook_url, twitter_url, instagram_url, youtube_url, linkedin_url,
           currency, logo, logo_id, favicon, favicon_id,
           storage_used_mb, is_maintenance_mode, maintenance_message, subscription_expires_at
         ) VALUES (
           $1, $2, $3, $4, $5, $6,
           'active', $7, $8, $9,
           $10, $11, $12,
           $13, $14, $15, $16, $17,
           $18, $19, $20, $21, $22,
           15, $23, $24, $25
         ) RETURNING *`,
        [
          creatorId,
          chosenSub.id,
          name,
          slug,
          institutionType,
          eiinNumber || null,
          themeName,
          primaryColor,
          secondaryColor,
          contactEmail,
          contactPhone,
          address,
          facebookUrl,
          twitterUrl,
          instagramUrl,
          youtubeUrl,
          linkedinUrl,
          currency,
          logoAsset.url,
          logoAsset.publicId,
          faviconAsset.url,
          faviconAsset.publicId,
          isMaintenanceMode,
          maintenanceMessage,
          chosenSub.current_period_end || null,
        ]
      );
      newWebsite = siteInsert.rows[0];

      await client.query(
        `INSERT INTO website_domains (
           website_id, domain_type, domain, domain_name, is_primary, is_verified,
           dns_record_type, dns_record_value, ssl_status, verified_at
         ) VALUES ($1, 'subdomain', $2, $2, TRUE, TRUE, 'CNAME', $3, 'active', CURRENT_TIMESTAMP)`,
        [newWebsite.id, cleanSubdomain, CUSTOM_DOMAIN_CNAME_TARGET]
      );

      await client.query(
        `INSERT INTO website_information (
           website_id,
           creator_nid,
           creator_nid_url,
           creator_nid_front_image,
           creator_nid_front_image_id,
           creator_nid_back_image,
           creator_nid_back_image_id,
           eiin_certificate,
           eiin_certificate_url,
           eiin_certificate_image,
           eiin_certificate_image_id,
           ugc_certificate,
           ugc_certificate_id,
           additional_certificate,
           additional_certificate_id,
           address,
           other_details,
           verification_status
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17::jsonb, 'pending')
         ON CONFLICT (website_id) DO UPDATE SET
           creator_nid = EXCLUDED.creator_nid,
           creator_nid_url = EXCLUDED.creator_nid_url,
           creator_nid_front_image = EXCLUDED.creator_nid_front_image,
           creator_nid_front_image_id = EXCLUDED.creator_nid_front_image_id,
           creator_nid_back_image = EXCLUDED.creator_nid_back_image,
           creator_nid_back_image_id = EXCLUDED.creator_nid_back_image_id,
           eiin_certificate = EXCLUDED.eiin_certificate,
           eiin_certificate_url = EXCLUDED.eiin_certificate_url,
           eiin_certificate_image = EXCLUDED.eiin_certificate_image,
           eiin_certificate_image_id = EXCLUDED.eiin_certificate_image_id,
           ugc_certificate = EXCLUDED.ugc_certificate,
           ugc_certificate_id = EXCLUDED.ugc_certificate_id,
           additional_certificate = EXCLUDED.additional_certificate,
           additional_certificate_id = EXCLUDED.additional_certificate_id,
           address = EXCLUDED.address,
           other_details = EXCLUDED.other_details,
           updated_at = CURRENT_TIMESTAMP`,
        [
          newWebsite.id,
          creatorNid,
          nidFrontAsset.url,
          nidFrontAsset.url,
          nidFrontAsset.publicId,
          nidBackAsset.url,
          nidBackAsset.publicId,
          eiinCertificate,
          eiinImageAsset.url,
          eiinImageAsset.url,
          eiinImageAsset.publicId,
          ugcAsset.url,
          ugcAsset.publicId,
          additionalCertAsset.url,
          additionalCertAsset.publicId,
          verificationAddress,
          otherDetailsJson,
        ]
      );

      await client.query(
        `UPDATE subscriptions SET website_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND website_id IS NULL`,
        [newWebsite.id, chosenSub.id]
      );

      await client.query(
        `INSERT INTO website_academic_configs (
           website_id, hierarchy_type, primary_col,
           use_department, use_session, use_class, use_section,
           require_department, require_session, require_class, require_section,
           labels, updated_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb, NOW())
         ON CONFLICT (website_id) DO UPDATE SET
           hierarchy_type = EXCLUDED.hierarchy_type,
           primary_col = EXCLUDED.primary_col,
           use_department = EXCLUDED.use_department,
           use_session = EXCLUDED.use_session,
           use_class = EXCLUDED.use_class,
           use_section = EXCLUDED.use_section,
           require_department = EXCLUDED.require_department,
           require_session = EXCLUDED.require_session,
           require_class = EXCLUDED.require_class,
           require_section = EXCLUDED.require_section,
           labels = EXCLUDED.labels,
           updated_at = NOW()`,
        [
          newWebsite.id,
          academicConfig.hierarchy_type,
          academicConfig.primary_col,
          academicConfig.use_department,
          academicConfig.use_session,
          academicConfig.use_class,
          academicConfig.use_section,
          academicConfig.require_department,
          academicConfig.require_session,
          academicConfig.require_class,
          academicConfig.require_section,
          JSON.stringify(academicConfig.labels),
        ]
      );

      const sessionMap = new Map<string, number>();
      for (const s of cleanSessions) {
        const sRes = await client.query(
          `INSERT INTO website_sessions (website_id, name, status)
           VALUES ($1, $2, $3)
           ON CONFLICT (website_id, name) DO UPDATE SET status = EXCLUDED.status
           RETURNING id, name`,
          [newWebsite.id, s.name, s.status]
        );
        if (sRes.rows[0]) {
          sessionMap.set(s.name.toLowerCase(), Number(sRes.rows[0].id));
        }
      }

      const deptMap = new Map<string, number>();
      const usedDeptSlugs = new Set<string>();
      for (let i = 0; i < cleanDepartments.length; i++) {
        const d = cleanDepartments[i];
        const baseDeptSlug = slugify(d.name, { lower: true, strict: true, trim: true }) || `dept-${i + 1}`;
        let uniqueDeptSlug = baseDeptSlug;
        let suffix = 2;
        while (usedDeptSlugs.has(uniqueDeptSlug)) {
          uniqueDeptSlug = `${baseDeptSlug}-${suffix++}`;
        }
        usedDeptSlugs.add(uniqueDeptSlug);

        const dRes = await client.query(
          `INSERT INTO website_departments (
             website_id, name, slug, code, description, order_no, is_active
           ) VALUES ($1, $2, $3, $4, $5, $6, TRUE)
           RETURNING id`,
          [newWebsite.id, d.name, uniqueDeptSlug, d.code, d.description, d.order_no]
        );
        const deptId = Number(dRes.rows[0].id);
        deptMap.set(d.key.toLowerCase(), deptId);
        deptMap.set(d.name.toLowerCase(), deptId);

        if (d.motto || d.summary || d.expected_cost > 0 || d.description) {
          await client.query(
            `INSERT INTO website_department_information (
               website_id, department_id, motto, summary, description, expected_cost
             ) VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (website_id, department_id) DO NOTHING`,
            [newWebsite.id, deptId, d.motto, d.summary, d.description, d.expected_cost]
          );
        }

        if (d.head_name) {
          await client.query(
            `INSERT INTO website_dept_heads (
               website_id, department_id, name, title, designation, email, phone, order_no, is_active
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE)
             ON CONFLICT (website_id, department_id) DO NOTHING`,
            [newWebsite.id, deptId, d.head_name, d.head_title, d.head_designation, d.head_email, d.head_phone, d.order_no]
          );
        }
      }

      const classMap = new Map<string, number>();
      const usedClassCodes = new Set<string>();
      for (let i = 0; i < cleanClasses.length; i++) {
        const c = cleanClasses[i];
        const cleanPart = c.name.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 8) || String(i + 1);
        let finalCode = c.code || `CLS-${cleanPart}`;
        let cSuffix = 2;
        while (usedClassCodes.has(finalCode)) {
          finalCode = `${c.code || `CLS-${cleanPart}`}-${cSuffix++}`;
        }
        usedClassCodes.add(finalCode);

        const cRes = await client.query(
          `INSERT INTO website_classes (website_id, name, code, max_seats, description)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (website_id, name) DO UPDATE SET max_seats = EXCLUDED.max_seats
           RETURNING id`,
          [newWebsite.id, c.name, finalCode, c.max_seats, c.description]
        );
        const classId = Number(cRes.rows[0].id);
        classMap.set(c.key.toLowerCase(), classId);
        classMap.set(c.name.toLowerCase(), classId);
      }

      const sectionMap = new Map<string, number>();
      for (const sec of cleanSections) {
        const secRes = await client.query(
          `INSERT INTO website_sections (website_id, name, capacity, room_number)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (website_id, name) DO UPDATE SET capacity = EXCLUDED.capacity
           RETURNING id`,
          [newWebsite.id, sec.name, sec.capacity, sec.room_number]
        );
        const secId = Number(secRes.rows[0].id);
        sectionMap.set(sec.name.toLowerCase(), secId);
      }

      const classSubjectMap = new Map<string, number>();
      for (let i = 0; i < cleanSubjects.length; i++) {
        const sub = cleanSubjects[i];
        const classId = sub.class_key ? classMap.get(sub.class_key.toLowerCase()) || null : null;
        const autoCode = sub.code || `${sub.name.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 4) || "SUB"}-${101 + i}`;

        const subRes = await client.query(
          `INSERT INTO website_subjects (website_id, class_id, name, code, type, description)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING id`,
          [newWebsite.id, classId, sub.name, autoCode, sub.type, sub.description]
        );
        const subjectId = Number(subRes.rows[0].id);

        if (classId) {
          const csRes = await client.query(
            `INSERT INTO website_class_subjects (website_id, class_id, subject_id, full_marks, pass_marks, is_optional)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (website_id, class_id, subject_id) DO UPDATE SET
               full_marks = EXCLUDED.full_marks,
               pass_marks = EXCLUDED.pass_marks,
               is_optional = EXCLUDED.is_optional
             RETURNING id`,
            [newWebsite.id, classId, subjectId, sub.full_marks, sub.pass_marks, sub.is_optional]
          );
          if (csRes.rows[0]) {
            classSubjectMap.set(`${classId}:${sub.name.toLowerCase()}`, Number(csRes.rows[0].id));
          }
        }
      }

      const dayMap = new Map<string, number>();
      const activeDayIds: number[] = [];
      for (const d of cleanDays) {
        const dRes = await client.query(
          `INSERT INTO website_days (website_id, name, day_order, status)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (website_id, name) DO UPDATE SET day_order = EXCLUDED.day_order, status = EXCLUDED.status
           RETURNING id, status`,
          [newWebsite.id, d.name, d.day_order, d.status]
        );
        const dayId = Number(dRes.rows[0].id);
        dayMap.set(d.name.toLowerCase(), dayId);
        if (dRes.rows[0].status === "on") {
          activeDayIds.push(dayId);
        }
      }

      const periodMap = new Map<string, number>();
      for (const p of cleanPeriods) {
        for (const dayId of activeDayIds) {
          const pRes = await client.query(
            `INSERT INTO website_periods (website_id, day_id, name, start_time, end_time, is_break)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (website_id, day_id, name) DO UPDATE SET
               start_time = EXCLUDED.start_time,
               end_time = EXCLUDED.end_time,
               is_break = EXCLUDED.is_break
             RETURNING id`,
            [newWebsite.id, dayId, p.name, p.start_time, p.end_time, p.is_break]
          );
          if (pRes.rows[0]) {
            periodMap.set(`${dayId}:${p.name.toLowerCase()}`, Number(pRes.rows[0].id));
          }
        }
      }

      const defaultSessionId = cleanSessions.length > 0 ? sessionMap.get(cleanSessions[0].name.toLowerCase()) || null : null;
      for (const r of cleanRoutines) {
        const dayId = dayMap.get(r.day_name.toLowerCase());
        const classId = classMap.get(r.class_key.toLowerCase());
        if (!dayId || !classId) continue;
        const periodId = periodMap.get(`${dayId}:${r.period_name.toLowerCase()}`);
        const csId = classSubjectMap.get(`${classId}:${r.subject_name.toLowerCase()}`);
        if (!periodId || !csId) continue;
        const secId = r.section_name
          ? sectionMap.get(`${classId}:${r.section_name.toLowerCase()}`) || sectionMap.get(r.section_name.toLowerCase()) || null
          : null;
        const sessId = r.session_name ? sessionMap.get(r.session_name.toLowerCase()) || defaultSessionId : defaultSessionId;
        await client.query(
          `INSERT INTO website_period_class_subjects (
             website_id, period_id, class_subject_id, section_id, session_id, room_number
           ) VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT DO NOTHING`,
          [newWebsite.id, periodId, csId, secId, sessId, r.room_number]
        );
      }

      await seedWebsiteDefaults(
        newWebsite.id,
        newWebsite.name,
        { primaryColor, secondaryColor, theme: themeName },
        {
          contactEmail,
          contactPhone,
          address,
          institutionType,
          eiinNumber,
          tagline: body.tagline || `Excellence in ${institutionType} Education`,
        },
        client
      );

      await client.query("COMMIT");
    } catch (txError: any) {
      await client.query("ROLLBACK").catch(() => {});
      await Promise.allSettled(uploadedPublicIdsToRollback.map((pid) => deleteImage(pid)));
      throw txError;
    } finally {
      client.release();
    }

    await invalidateWebsiteCache(cleanSubdomain).catch(() => {});
    await invalidateWebsiteCache(newWebsite.id).catch(() => {});

    return NextResponse.json({
      success: true,
      message: `Website "${newWebsite.name}" has been created successfully!`,
      website: {
        ...newWebsite,
        subdomain: cleanSubdomain,
        custom_domain: null,
        is_published: true,
      },
      baseDomain,
      fullDomain: fullSubdomain,
      subdomain: cleanSubdomain,
      customDomain: null,
    });
  }

  if (action === "upload_branding") {
    const websiteId = Number(body.websiteId || body.id);
    const type = body.type;
    const imageInput = body.image || body.file || body.data;
    if (!websiteId || !type || !imageInput) {
      return NextResponse.json(
        { success: false, error: "websiteId, type (logo or favicon), and image data are required." },
        { status: 400 }
      );
    }
    const siteRes = await queryDb(
      `SELECT id, creator_id, logo, logo_id, favicon, favicon_id FROM websites WHERE id = $1 AND creator_id = $2 LIMIT 1`,
      [websiteId, creatorId]
    );
    if (siteRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: "Website not found or unauthorized." }, { status: 404 });
    }
    const currentSite = siteRes.rows[0];
    const folder = type === "logo" ? "website_logos" : "website_favicons";
    const oldPublicId = type === "logo" ? currentSite.logo_id : currentSite.favicon_id;
    if (oldPublicId) {
      await deleteImage(oldPublicId).catch(() => {});
    }
    let uploadRes;
    try {
      uploadRes = await uploadImage(imageInput, folder);
    } catch (upErr: any) {
      console.error(`Cloudinary ${type} upload error:`, upErr);
      return NextResponse.json(
        { success: false, error: `Failed to upload ${type} to Cloudinary: ${upErr.message}` },
        { status: 500 }
      );
    }
    const colUrl = type === "logo" ? "logo" : "favicon";
    const colId = type === "logo" ? "logo_id" : "favicon_id";
    const updRes = await queryDb(
      `UPDATE websites
       SET ${colUrl} = $1, ${colId} = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3 AND creator_id = $4
       RETURNING *`,
      [uploadRes.url, uploadRes.publicId, websiteId, creatorId]
    );
    await invalidateWebsiteCache(websiteId);
    return NextResponse.json({
      success: true,
      message: `${type === "logo" ? "Logo" : "Favicon"} uploaded successfully.`,
      url: uploadRes.url,
      publicId: uploadRes.publicId,
      website: updRes.rows[0],
    });
  }

  if (action === "remove_branding") {
    const websiteId = Number(body.websiteId || body.id);
    const type = body.type;
    if (!websiteId || !type) {
      return NextResponse.json({ success: false, error: "websiteId and type are required." }, { status: 400 });
    }
    const siteRes = await queryDb(
      `SELECT id, creator_id, logo, logo_id, favicon, favicon_id FROM websites WHERE id = $1 AND creator_id = $2 LIMIT 1`,
      [websiteId, creatorId]
    );
    if (siteRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: "Website not found or unauthorized." }, { status: 404 });
    }
    const currentSite = siteRes.rows[0];
    const oldPublicId = type === "logo" ? currentSite.logo_id : currentSite.favicon_id;
    if (oldPublicId) {
      await deleteImage(oldPublicId).catch(() => {});
    }
    const colUrl = type === "logo" ? "logo" : "favicon";
    const colId = type === "logo" ? "logo_id" : "favicon_id";
    const updRes = await queryDb(
      `UPDATE websites
       SET ${colUrl} = NULL, ${colId} = NULL, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND creator_id = $2
       RETURNING *`,
      [websiteId, creatorId]
    );
    await invalidateWebsiteCache(websiteId);
    return NextResponse.json({
      success: true,
      message: `${type === "logo" ? "Logo" : "Favicon"} removed successfully.`,
      website: updRes.rows[0],
    });
  }

  if (action === "update_website") {
    const id = Number(body.id || body.websiteId);
    if (!id) {
      return NextResponse.json({ success: false, error: "Website ID is required." }, { status: 400 });
    }

    const ownershipCheck = await queryDb(
      `SELECT w.id, w.slug, w.logo_id, w.favicon_id, w.status, w.subscription_id,
              s.status AS sub_status, s.current_period_end AS sub_period_end
       FROM websites w
       LEFT JOIN subscriptions s ON s.id = w.subscription_id
       WHERE w.id = $1 AND w.creator_id = $2
       LIMIT 1`,
      [id, creatorId]
    );
    if (ownershipCheck.rows.length === 0) {
      return NextResponse.json({ success: false, error: "Website not found or unauthorized." }, { status: 404 });
    }
    const currentSite = ownershipCheck.rows[0];

    if (body.custom_domain !== undefined || body.customDomain !== undefined) {
      const rawCustom = String(body.custom_domain !== undefined ? body.custom_domain : body.customDomain || "")
        .trim()
        .toLowerCase()
        .replace(/^https?:\/\//, "")
        .replace(/\/.*$/, "")
        .replace(/:\d+$/, "");
      if (rawCustom) {
        const existingVerified = await queryDb(
          `SELECT id FROM website_domains WHERE website_id = $1 AND domain_type = 'custom_domain' AND LOWER(domain) = LOWER($2) AND is_verified = TRUE LIMIT 1`,
          [id, rawCustom]
        );
        if (existingVerified.rows.length === 0) {
          return NextResponse.json(
            {
              success: false,
              error: "Custom domains must be DNS-verified in the Domains & DNS section before attaching.",
            },
            { status: 400 }
          );
        }
      }
    }

    const updates: any[] = [];
    const values: any[] = [];
    let idx = 1;

    if (body.name !== undefined) {
      updates.push(`name = $${idx++}`);
      values.push(String(body.name).trim());
    }
    if (body.institution_type !== undefined || body.institutionType !== undefined) {
      const rawType = body.institution_type || body.institutionType;
      updates.push(`institution_type = $${idx++}`);
      values.push(normalizeInstitutionType(rawType));
    }
    if (body.eiin_number !== undefined || body.eein_number !== undefined || body.eiinNumber !== undefined) {
      const eiinVal = body.eiin_number !== undefined ? body.eiin_number : body.eein_number !== undefined ? body.eein_number : body.eiinNumber;
      updates.push(`eiin_number = $${idx++}`);
      values.push(eiinVal ? String(eiinVal).trim() : null);
    }
    if (body.contact_email !== undefined || body.email !== undefined || body.mail !== undefined) {
      const emailVal = body.contact_email ?? body.email ?? body.mail;
      updates.push(`contact_email = $${idx++}`);
      values.push(emailVal ? String(emailVal).trim() : null);
    }
    if (body.contact_phone !== undefined || body.phone !== undefined || body.contactNumber !== undefined) {
      const phoneVal = body.contact_phone ?? body.phone ?? body.contactNumber;
      updates.push(`contact_phone = $${idx++}`);
      values.push(phoneVal ? String(phoneVal).trim() : null);
    }
    if (body.address !== undefined) {
      updates.push(`address = $${idx++}`);
      values.push(body.address ? String(body.address).trim() : null);
    }
    if (body.facebook_url !== undefined || body.facebookUrl !== undefined) {
      const fbVal = body.facebook_url !== undefined ? body.facebook_url : body.facebookUrl;
      updates.push(`facebook_url = $${idx++}`);
      values.push(fbVal ? String(fbVal).trim() : null);
    }
    if (body.twitter_url !== undefined || body.twitterUrl !== undefined) {
      const twVal = body.twitter_url !== undefined ? body.twitter_url : body.twitterUrl;
      updates.push(`twitter_url = $${idx++}`);
      values.push(twVal ? String(twVal).trim() : null);
    }
    if (body.instagram_url !== undefined || body.instagramUrl !== undefined) {
      const igVal = body.instagram_url !== undefined ? body.instagram_url : body.instagramUrl;
      updates.push(`instagram_url = $${idx++}`);
      values.push(igVal ? String(igVal).trim() : null);
    }
    if (body.youtube_url !== undefined || body.youtubeUrl !== undefined) {
      const ytVal = body.youtube_url !== undefined ? body.youtube_url : body.youtubeUrl;
      updates.push(`youtube_url = $${idx++}`);
      values.push(ytVal ? String(ytVal).trim() : null);
    }
    if (body.linkedin_url !== undefined || body.linkedinUrl !== undefined) {
      const liVal = body.linkedin_url !== undefined ? body.linkedin_url : body.linkedinUrl;
      updates.push(`linkedin_url = $${idx++}`);
      values.push(liVal ? String(liVal).trim() : null);
    }
    if (body.subdomain !== undefined) {
      const rawSub = String(body.subdomain).trim().toLowerCase();
      if (rawSub) {
        const valRes = await checkDomainAvailability(rawSub, id, request);
        if (!valRes.available) {
          return NextResponse.json({ success: false, error: valRes.error }, { status: 400 });
        }
        updates.push(`slug = $${idx++}`);
        values.push(valRes.domain);
        const existingSubDomain = await queryDb(
          `SELECT id FROM website_domains WHERE website_id = $1 AND domain_type = 'subdomain' LIMIT 1`,
          [id]
        );
        if (existingSubDomain.rows.length > 0) {
          await queryDb(
            `UPDATE website_domains SET domain = $1, domain_name = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
            [valRes.domain, existingSubDomain.rows[0].id]
          ).catch(() => {});
        } else {
          await queryDb(
            `INSERT INTO website_domains (website_id, domain_type, domain, domain_name, is_primary, is_verified, dns_record_type, dns_record_value)
             VALUES ($1, 'subdomain', $2, $2, TRUE, TRUE, 'CNAME', $3)
             ON CONFLICT (domain) DO UPDATE SET is_primary = TRUE, updated_at = CURRENT_TIMESTAMP`,
            [id, valRes.domain, CUSTOM_DOMAIN_CNAME_TARGET]
          ).catch(() => {});
        }
        if (currentSite.slug && currentSite.slug !== valRes.domain) {
          await invalidateWebsiteCache(currentSite.slug).catch(() => {});
        }
      }
    }

    const hasKycUpdate =
      body.creator_nid !== undefined ||
      body.creatorNid !== undefined ||
      body.nid_front_file !== undefined ||
      body.creator_nid_front_image !== undefined ||
      body.creatorNidFrontImage !== undefined ||
      body.creator_nid_url !== undefined ||
      body.creatorNidUrl !== undefined ||
      body.nid_back_file !== undefined ||
      body.creator_nid_back_image !== undefined ||
      body.creatorNidBackImage !== undefined ||
      body.eiin_certificate !== undefined ||
      body.eiinCertificate !== undefined ||
      body.eiin_certificate_file !== undefined ||
      body.eiin_certificate_image !== undefined ||
      body.eiinCertificateImage !== undefined ||
      body.eiin_certificate_url !== undefined ||
      body.eiinCertificateUrl !== undefined ||
      body.ugc_certificate_file !== undefined ||
      body.ugc_certificate !== undefined ||
      body.ugcCertificate !== undefined ||
      body.additional_certificate_file !== undefined ||
      body.additional_certificate !== undefined ||
      body.additionalCertificate !== undefined ||
      body.verification_address !== undefined ||
      body.verificationAddress !== undefined ||
      body.other_details !== undefined ||
      body.otherDetails !== undefined ||
      body.principal_name !== undefined ||
      body.board_affiliation !== undefined ||
      body.notes !== undefined;

    const hasInfoOrNarrativeUpdate =
      hasKycUpdate ||
      body.tagline !== undefined ||
      body.motto !== undefined ||
      body.mission !== undefined ||
      body.vision !== undefined ||
      body.history !== undefined ||
      body.map_url !== undefined ||
      body.mapUrl !== undefined;

    if (hasInfoOrNarrativeUpdate) {
      const existingInfoRes = await queryDb(`SELECT * FROM website_information WHERE website_id = $1 LIMIT 1`, [id]);
      const existingInfo = existingInfoRes.rows[0] || {};
      if (hasKycUpdate && ["approved", "verified"].includes(String(existingInfo.verification_status || "").toLowerCase())) {
        return NextResponse.json(
          {
            success: false,
            error: "Verification & KYC information has been approved by a platform developer and cannot be modified.",
          },
          { status: 403 }
        );
      }
      const existingOther =
        typeof existingInfo.other_details === "object" && existingInfo.other_details !== null
          ? existingInfo.other_details
          : {};
      const incomingOther =
        typeof (body.other_details ?? body.otherDetails) === "object" && (body.other_details ?? body.otherDetails) !== null
          ? body.other_details ?? body.otherDetails
          : {};
      const mergedOther: Record<string, any> = { ...existingOther, ...incomingOther };
      if (body.tagline !== undefined) mergedOther.tagline = String(body.tagline).trim();
      if (body.motto !== undefined) mergedOther.motto = String(body.motto).trim();
      if (body.mission !== undefined) mergedOther.mission = String(body.mission).trim();
      if (body.vision !== undefined) mergedOther.vision = String(body.vision).trim();
      if (body.history !== undefined) mergedOther.history = String(body.history).trim();
      if (body.map_url !== undefined || body.mapUrl !== undefined) {
        mergedOther.map_url = String(body.map_url ?? body.mapUrl ?? "").trim();
      }
      if (body.principal_name !== undefined) mergedOther.principal_name = String(body.principal_name).trim();
      if (body.board_affiliation !== undefined) mergedOther.board_affiliation = String(body.board_affiliation).trim();
      if (body.notes !== undefined) mergedOther.notes = String(body.notes).trim();

      const cNid = body.creator_nid ?? body.creatorNid;
      const fFolder = `school/verification/${creatorId}`;
      const nidFrontInput = body.nid_front_file ?? body.creator_nid_front_image ?? body.creatorNidFrontImage ?? body.creator_nid_url ?? body.creatorNidUrl;
      const nidFrontUp =
        nidFrontInput !== undefined
          ? await resolveAssetUrlAndId(
              nidFrontInput,
              body.creator_nid_front_image_id ?? body.creatorNidFrontImageId,
              `${fFolder}/nid_front`,
              false
            )
          : { url: null, publicId: null };
      if (nidFrontUp.publicId && existingInfo.creator_nid_front_image_id && nidFrontUp.publicId !== existingInfo.creator_nid_front_image_id) {
        await deleteImage(existingInfo.creator_nid_front_image_id).catch(() => {});
      }

      const nidBackInput = body.nid_back_file ?? body.creator_nid_back_image ?? body.creatorNidBackImage;
      const nidBackUp =
        nidBackInput !== undefined
          ? await resolveAssetUrlAndId(
              nidBackInput,
              body.creator_nid_back_image_id ?? body.creatorNidBackImageId,
              `${fFolder}/nid_back`,
              false
            )
          : { url: null, publicId: null };
      if (nidBackUp.publicId && existingInfo.creator_nid_back_image_id && nidBackUp.publicId !== existingInfo.creator_nid_back_image_id) {
        await deleteImage(existingInfo.creator_nid_back_image_id).catch(() => {});
      }

      const eCert = body.eiin_certificate ?? body.eiinCertificate;
      const eiinInput = body.eiin_certificate_file ?? body.eiin_certificate_image ?? body.eiinCertificateImage ?? body.eiin_certificate_url ?? body.eiinCertificateUrl;
      const eiinUp =
        eiinInput !== undefined
          ? await resolveAssetUrlAndId(
              eiinInput,
              body.eiin_certificate_image_id ?? body.eiinCertificateImageId,
              `${fFolder}/eiin_certificate`,
              true
            )
          : { url: null, publicId: null };
      if (eiinUp.publicId && existingInfo.eiin_certificate_image_id && eiinUp.publicId !== existingInfo.eiin_certificate_image_id) {
        await deleteImage(existingInfo.eiin_certificate_image_id).catch(() => {});
      }

      const ugcInput = body.ugc_certificate_file ?? body.ugc_certificate ?? body.ugcCertificate;
      const ugcUp =
        ugcInput !== undefined
          ? await resolveAssetUrlAndId(
              ugcInput,
              body.ugc_certificate_id ?? body.ugcCertificateId,
              `${fFolder}/ugc_certificate`,
              true
            )
          : { url: null, publicId: null };
      if (ugcUp.publicId && existingInfo.ugc_certificate_id && ugcUp.publicId !== existingInfo.ugc_certificate_id) {
        await deleteImage(existingInfo.ugc_certificate_id).catch(() => {});
      }

      const addInput = body.additional_certificate_file ?? body.additional_certificate ?? body.additionalCertificate;
      const addUp =
        addInput !== undefined
          ? await resolveAssetUrlAndId(
              addInput,
              body.additional_certificate_id ?? body.additionalCertificateId,
              `${fFolder}/additional_certificate`,
              true
            )
          : { url: null, publicId: null };
      if (addUp.publicId && existingInfo.additional_certificate_id && addUp.publicId !== existingInfo.additional_certificate_id) {
        await deleteImage(existingInfo.additional_certificate_id).catch(() => {});
      }

      const vAddr = body.verification_address ?? body.verificationAddress;

      await queryDb(
        `INSERT INTO website_information (
           website_id, creator_nid, creator_nid_url,
           creator_nid_front_image, creator_nid_front_image_id,
           creator_nid_back_image, creator_nid_back_image_id,
           eiin_certificate, eiin_certificate_url,
           eiin_certificate_image, eiin_certificate_image_id,
           ugc_certificate, ugc_certificate_id,
           additional_certificate, additional_certificate_id,
           address, other_details
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17::jsonb)
         ON CONFLICT (website_id) DO UPDATE SET
           creator_nid = COALESCE(EXCLUDED.creator_nid, website_information.creator_nid),
           creator_nid_url = COALESCE(EXCLUDED.creator_nid_url, website_information.creator_nid_url),
           creator_nid_front_image = COALESCE(EXCLUDED.creator_nid_front_image, website_information.creator_nid_front_image),
           creator_nid_front_image_id = COALESCE(EXCLUDED.creator_nid_front_image_id, website_information.creator_nid_front_image_id),
           creator_nid_back_image = COALESCE(EXCLUDED.creator_nid_back_image, website_information.creator_nid_back_image),
           creator_nid_back_image_id = COALESCE(EXCLUDED.creator_nid_back_image_id, website_information.creator_nid_back_image_id),
           eiin_certificate = COALESCE(EXCLUDED.eiin_certificate, website_information.eiin_certificate),
           eiin_certificate_url = COALESCE(EXCLUDED.eiin_certificate_url, website_information.eiin_certificate_url),
           eiin_certificate_image = COALESCE(EXCLUDED.eiin_certificate_image, website_information.eiin_certificate_image),
           eiin_certificate_image_id = COALESCE(EXCLUDED.eiin_certificate_image_id, website_information.eiin_certificate_image_id),
           ugc_certificate = COALESCE(EXCLUDED.ugc_certificate, website_information.ugc_certificate),
           ugc_certificate_id = COALESCE(EXCLUDED.ugc_certificate_id, website_information.ugc_certificate_id),
           additional_certificate = COALESCE(EXCLUDED.additional_certificate, website_information.additional_certificate),
           additional_certificate_id = COALESCE(EXCLUDED.additional_certificate_id, website_information.additional_certificate_id),
           address = COALESCE(EXCLUDED.address, website_information.address),
           other_details = EXCLUDED.other_details,
           updated_at = CURRENT_TIMESTAMP`,
        [
          id,
          cNid !== undefined ? (String(cNid).trim() || null) : null,
          nidFrontUp.url,
          nidFrontUp.url,
          nidFrontUp.publicId,
          nidBackUp.url,
          nidBackUp.publicId,
          eCert !== undefined ? (String(eCert).trim() || null) : null,
          eiinUp.url,
          eiinUp.url,
          eiinUp.publicId,
          ugcUp.url,
          ugcUp.publicId,
          addUp.url,
          addUp.publicId,
          vAddr !== undefined ? (String(vAddr).trim() || null) : null,
          JSON.stringify(mergedOther),
        ]
      ).catch(() => {});
    }

    const finalPrimaryColor =
      body.primary_color || body.primaryColor || (typeof body.theme_config === "object" ? body.theme_config?.primaryColor : undefined);
    if (finalPrimaryColor !== undefined) {
      updates.push(`primary_color = $${idx++}`);
      values.push(finalPrimaryColor);
    }
    const finalSecondaryColor =
      body.secondary_color || body.secondaryColor || (typeof body.theme_config === "object" ? body.theme_config?.secondaryColor : undefined);
    if (finalSecondaryColor !== undefined) {
      updates.push(`secondary_color = $${idx++}`);
      values.push(finalSecondaryColor);
    }
    const finalTheme =
      body.theme || (typeof body.theme_config === "object" ? body.theme_config?.mode || body.theme_config?.theme : undefined);
    if (finalTheme !== undefined) {
      updates.push(`theme = $${idx++}`);
      values.push(finalTheme);
    }

    if (body.removeLogo || body.logo === "" || body.logo === null) {
      if (currentSite.logo_id) {
        await deleteImage(currentSite.logo_id).catch(() => {});
      }
      updates.push(`logo = NULL`);
      updates.push(`logo_id = NULL`);
    } else if (body.logo !== undefined) {
      const logoInput = String(body.logo).trim();
      if (logoInput.startsWith("data:image")) {
        if (currentSite.logo_id) {
          await deleteImage(currentSite.logo_id).catch(() => {});
        }
        try {
          const uploadRes = await uploadImage(logoInput, "website_logos");
          updates.push(`logo = $${idx++}`);
          values.push(uploadRes.url);
          updates.push(`logo_id = $${idx++}`);
          values.push(uploadRes.publicId);
        } catch (logoErr: any) {
          console.error("Cloudinary logo upload error during website update:", logoErr);
        }
      } else if (logoInput) {
        if (body.logo_id !== undefined && body.logo_id !== currentSite.logo_id && currentSite.logo_id) {
          await deleteImage(currentSite.logo_id).catch(() => {});
        }
        updates.push(`logo = $${idx++}`);
        values.push(logoInput);
        if (body.logo_id !== undefined) {
          updates.push(`logo_id = $${idx++}`);
          values.push(body.logo_id);
        }
      }
    }

    if (body.removeFavicon || body.favicon === "" || body.favicon === null) {
      if (currentSite.favicon_id) {
        await deleteImage(currentSite.favicon_id).catch(() => {});
      }
      updates.push(`favicon = NULL`);
      updates.push(`favicon_id = NULL`);
    } else if (body.favicon !== undefined) {
      const faviconInput = String(body.favicon).trim();
      if (faviconInput.startsWith("data:image") || faviconInput.startsWith("data:")) {
        if (currentSite.favicon_id) {
          await deleteImage(currentSite.favicon_id).catch(() => {});
        }
        try {
          const uploadRes = await uploadImage(faviconInput, "website_favicons");
          updates.push(`favicon = $${idx++}`);
          values.push(uploadRes.url);
          updates.push(`favicon_id = $${idx++}`);
          values.push(uploadRes.publicId);
        } catch (favErr: any) {
          console.error("Cloudinary favicon upload error during website update:", favErr);
        }
      } else if (faviconInput) {
        if (body.favicon_id !== undefined && body.favicon_id !== currentSite.favicon_id && currentSite.favicon_id) {
          await deleteImage(currentSite.favicon_id).catch(() => {});
        }
        updates.push(`favicon = $${idx++}`);
        values.push(faviconInput);
        if (body.favicon_id !== undefined) {
          updates.push(`favicon_id = $${idx++}`);
          values.push(body.favicon_id);
        }
      }
    }

    if (body.currency !== undefined) {
      updates.push(`currency = $${idx++}`);
      values.push(String(body.currency).trim().toUpperCase());
    }
    if (body.maintenance_message !== undefined) {
      updates.push(`maintenance_message = $${idx++}`);
      values.push(String(body.maintenance_message).trim());
    }

    let finalMaintenanceMode = undefined;
    if (body.is_maintenance_mode !== undefined) {
      finalMaintenanceMode = Boolean(body.is_maintenance_mode);
    } else if (body.is_published !== undefined) {
      finalMaintenanceMode = !Boolean(body.is_published);
    }
    if (finalMaintenanceMode === false) {
      const subActive =
        Boolean(currentSite.subscription_id) &&
        isSubscriptionActiveRecord({ status: currentSite.sub_status, current_period_end: currentSite.sub_period_end });
      if (!subActive) {
        return NextResponse.json(
          {
            success: false,
            error: "Maintenance mode cannot be turned off while the website subscription is inactive, suspended, or expired.",
          },
          { status: 403 }
        );
      }
      if (String(currentSite.status || "").toLowerCase() !== "active") {
        return NextResponse.json(
          {
            success: false,
            error: `Website status is "${currentSite.status}". Maintenance mode cannot be disabled until activated.`,
          },
          { status: 403 }
        );
      }
    }
    if (finalMaintenanceMode !== undefined) {
      updates.push(`is_maintenance_mode = $${idx++}`);
      values.push(finalMaintenanceMode);
    }

    if (updates.length > 0) {
      values.push(id, creatorId);
      const res = await queryDb(
        `UPDATE websites SET ${updates.join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE id = $${idx++} AND creator_id = $${idx++} RETURNING *`,
        values
      );
      if (res.rows.length === 0) {
        return NextResponse.json({ success: false, error: "Website not found or unauthorized." }, { status: 404 });
      }
      await invalidateWebsiteCache(id);
    }

    const refreshed = await queryDb(
      `SELECT w.*, 
              w.name AS site_title,
              COALESCE(NULLIF(wi.other_details->>'tagline', ''), 'Excellence in ' || COALESCE(w.institution_type, 'Education')) AS tagline,
              COALESCE(NULLIF(wi.other_details->>'motto', ''), NULLIF(wi.other_details->>'tagline', ''), 'Excellence in ' || COALESCE(w.institution_type, 'Education')) AS motto,
              COALESCE(wi.other_details->>'mission', '') AS mission,
              COALESCE(wi.other_details->>'vision', '') AS vision,
              COALESCE(wi.other_details->>'history', '') AS history,
              COALESCE(wi.other_details->>'map_url', '') AS map_url,
              COALESCE(w.facebook_url, '') AS facebook_url,
              COALESCE(w.twitter_url, '') AS twitter_url,
              COALESCE(w.instagram_url, '') AS instagram_url,
              COALESCE(w.youtube_url, '') AS youtube_url,
              COALESCE(w.linkedin_url, '') AS linkedin_url,
              s.status AS subscription_status,
              s.billing_cycle AS subscription_billing_cycle,
              s.current_period_end AS subscription_period_end,
              (CASE WHEN LOWER(COALESCE(s.status, '')) = 'active' AND (s.current_period_end IS NULL OR s.current_period_end > CURRENT_TIMESTAMP) THEN TRUE ELSE FALSE END) AS subscription_is_active,
              COALESCE(
                (SELECT wd.domain FROM website_domains wd WHERE wd.website_id = w.id AND wd.domain_type = 'subdomain' LIMIT 1),
                w.slug
              ) AS subdomain,
              (SELECT wd.domain FROM website_domains wd WHERE wd.website_id = w.id AND wd.domain_type = 'custom_domain' LIMIT 1) AS custom_domain,
              (SELECT COALESCE(wd.is_verified, FALSE) FROM website_domains wd WHERE wd.website_id = w.id AND wd.domain_type = 'custom_domain' LIMIT 1) AS custom_domain_verified,
              (SELECT row_to_json(wd.*) FROM website_domains wd WHERE wd.website_id = w.id AND wd.domain_type = 'custom_domain' LIMIT 1) AS custom_domain_record,
              (SELECT row_to_json(wi.*) FROM website_information wi WHERE wi.website_id = w.id LIMIT 1) AS website_information,
              (SELECT row_to_json(wac.*) FROM website_academic_configs wac WHERE wac.website_id = w.id LIMIT 1) AS academic_config,
              (SELECT json_agg(wd.*) FROM website_domains wd WHERE wd.website_id = w.id) AS domains,
              (CASE WHEN w.status = 'active' AND NOT COALESCE(w.is_maintenance_mode, FALSE) AND LOWER(COALESCE(s.status, '')) = 'active' AND (s.current_period_end IS NULL OR s.current_period_end > CURRENT_TIMESTAMP) THEN true ELSE false END) AS is_published
       FROM websites w
       LEFT JOIN website_information wi ON wi.website_id = w.id
       LEFT JOIN subscriptions s ON s.id = w.subscription_id
       WHERE w.id = $1 AND w.creator_id = $2
       LIMIT 1`,
      [id, creatorId]
    );
    const updated = refreshed.rows[0] || {};
    return NextResponse.json({
      success: true,
      message: "Website updated successfully.",
      website: {
        ...updated,
        is_published: updated.status === "active" && !updated.is_maintenance_mode,
        theme_config: {
          primaryColor: updated.primary_color || "#1e40af",
          secondaryColor: updated.secondary_color || "#0ea5e9",
          mode: updated.theme || "default",
        },
      },
    });
  }

  if (action === "prepare_custom_domain_dns") {
    const id = Number(body.id || body.websiteId);
    if (!id) {
      return NextResponse.json({ success: false, error: "Website ID is required." }, { status: 400 });
    }
    const pkgCheck = await queryDb(
      `SELECT p.id, p.name, p.is_available_custom_domain
       FROM websites w
       LEFT JOIN subscriptions s ON w.subscription_id = s.id
       LEFT JOIN packages p ON s.package_id = p.id
       WHERE w.id = $1 AND w.creator_id = $2
       LIMIT 1`,
      [id, creatorId]
    );
    const sitePkg = pkgCheck.rows[0];
    if (!sitePkg || sitePkg.is_available_custom_domain !== true) {
      return NextResponse.json(
        {
          success: false,
          error: `Custom domain addition is not included in your current subscription package ("${sitePkg?.name || "Current Plan"}"). Please upgrade your package to connect a custom domain.`,
        },
        { status: 403 }
      );
    }

    const rawDomain = String(body.custom_domain || body.domain || "").trim().toLowerCase();
    const cleanDomain = rawDomain
      .replace(/^https?:\/\//, "")
      .replace(/\/.*$/, "")
      .replace(/:\d+$/, "")
      .trim();

    const valRes = await checkCustomDomainAvailability(cleanDomain, id, request);
    if (!valRes.available) {
      return NextResponse.json(
        { success: false, error: valRes.error || "Invalid or unavailable custom domain." },
        { status: 400 }
      );
    }

    const token = buildCustomDomainChallengeToken(id, cleanDomain);
    const dnsRecords = buildCustomDomainDnsRecords(cleanDomain, token);

    return NextResponse.json({
      success: true,
      custom_domain: cleanDomain,
      verification_token: token,
      dns_records: dnsRecords,
      message: `Configure these DNS records for "${cleanDomain}", then click Verify DNS before adding it.`,
    });
  }

  if (action === "verify_dns" || action === "verify_custom_domain") {
    const id = Number(body.id || body.websiteId);
    if (!id) {
      return NextResponse.json({ success: false, error: "Website ID is required." }, { status: 400 });
    }
    const pkgCheck = await queryDb(
      `SELECT p.id, p.name, p.is_available_custom_domain
       FROM websites w
       LEFT JOIN subscriptions s ON w.subscription_id = s.id
       LEFT JOIN packages p ON s.package_id = p.id
       WHERE w.id = $1 AND w.creator_id = $2
       LIMIT 1`,
      [id, creatorId]
    );
    if (!pkgCheck.rows[0] || pkgCheck.rows[0].is_available_custom_domain !== true) {
      return NextResponse.json(
        { success: false, error: "Custom domain connection is not included in your subscription package." },
        { status: 403 }
      );
    }

    const domRes = await queryDb(
      `SELECT * FROM website_domains WHERE website_id = $1 AND domain_type = 'custom_domain' LIMIT 1`,
      [id]
    );

    const rawCandidate = String(body.custom_domain || body.domain || domRes.rows[0]?.domain || "").trim().toLowerCase();
    const targetDomain = rawCandidate
      .replace(/^https?:\/\//, "")
      .replace(/\/.*$/, "")
      .replace(/:\d+$/, "")
      .trim();

    if (!targetDomain) {
      return NextResponse.json({ success: false, error: "Please enter a custom domain to verify." }, { status: 400 });
    }

    const valRes = await checkCustomDomainAvailability(targetDomain, id, request);
    if (!valRes.available) {
      return NextResponse.json(
        { success: false, error: valRes.error || "Custom domain is unavailable." },
        { status: 400 }
      );
    }

    const token = domRes.rows[0]?.domain === targetDomain && domRes.rows[0]?.verification_token
      ? domRes.rows[0].verification_token
      : buildCustomDomainChallengeToken(id, targetDomain);
    const dnsRecords = buildCustomDomainDnsRecords(targetDomain, token);
    const check = await verifyCustomDomainDnsLive(targetDomain, token, Boolean(body.bypassInDev));

    if (check.verified && domRes.rows[0] && domRes.rows[0].domain === targetDomain) {
      await queryDb(
        `UPDATE website_domains
         SET is_verified = TRUE, ssl_status = 'active', verified_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [domRes.rows[0].id]
      );
    }

    return NextResponse.json({
      success: true,
      verified: check.verified,
      custom_domain: targetDomain,
      verification_token: token,
      dns_records: dnsRecords,
      detected: check.detected,
      canBypassInDev: check.canBypassInDev,
      custom_domain_verified: check.verified,
      message: check.verified
        ? `DNS records successfully verified for "${targetDomain}". Click "Add & Activate Custom Domain" to attach it.`
        : `DNS records for "${targetDomain}" were not detected yet. Add the CNAME/TXT records and try again after DNS propagation.`,
    });
  }

  if (action === "connect_custom_domain" || action === "confirm_custom_domain" || action === "add_custom_domain") {
    const id = Number(body.id || body.websiteId);
    if (!id) {
      return NextResponse.json({ success: false, error: "Website ID is required." }, { status: 400 });
    }
    const pkgCheck = await queryDb(
      `SELECT p.id, p.name, p.is_available_custom_domain
       FROM websites w
       LEFT JOIN subscriptions s ON w.subscription_id = s.id
       LEFT JOIN packages p ON s.package_id = p.id
       WHERE w.id = $1 AND w.creator_id = $2
       LIMIT 1`,
      [id, creatorId]
    );
    const sitePkg = pkgCheck.rows[0];
    if (!sitePkg || sitePkg.is_available_custom_domain !== true) {
      return NextResponse.json(
        {
          success: false,
          error: `Custom domain addition is not included in your current subscription package ("${sitePkg?.name || "Current Plan"}"). Please upgrade your plan to connect a custom domain.`,
        },
        { status: 403 }
      );
    }

    const domRes = await queryDb(
      `SELECT * FROM website_domains WHERE website_id = $1 AND domain_type = 'custom_domain' LIMIT 1`,
      [id]
    );
    const rawDomain = String(body.custom_domain || body.domain || domRes.rows[0]?.domain || "").trim().toLowerCase();
    const cleanDomain = rawDomain
      .replace(/^https?:\/\//, "")
      .replace(/\/.*$/, "")
      .replace(/:\d+$/, "")
      .trim();

    if (!cleanDomain) {
      return NextResponse.json({ success: false, error: "Custom domain is required." }, { status: 400 });
    }

    const valRes = await checkCustomDomainAvailability(cleanDomain, id, request);
    if (!valRes.available) {
      return NextResponse.json(
        { success: false, error: valRes.error || "Invalid or unavailable custom domain." },
        { status: 400 }
      );
    }

    const token =
      domRes.rows[0]?.domain === cleanDomain && domRes.rows[0]?.verification_token
        ? domRes.rows[0].verification_token
        : buildCustomDomainChallengeToken(id, cleanDomain);
    const dnsRecords = buildCustomDomainDnsRecords(cleanDomain, token);

    const dnsCheck = await verifyCustomDomainDnsLive(cleanDomain, token, Boolean(body.bypassInDev));
    if (!dnsCheck.verified) {
      return NextResponse.json(
        {
          success: false,
          verified: false,
          detected: dnsCheck.detected,
          dns_records: dnsRecords,
          verification_token: token,
          canBypassInDev: dnsCheck.canBypassInDev,
          error: `DNS verification failed for "${cleanDomain}". Configure the required DNS records and verify DNS before adding this custom domain.`,
        },
        { status: 400 }
      );
    }

    await queryDb(`UPDATE website_domains SET is_primary = FALSE WHERE website_id = $1`, [id]);

    let savedDomain;
    if (domRes.rows.length > 0) {
      const upd = await queryDb(
        `UPDATE website_domains
         SET domain = $1,
             domain_name = $1,
             is_verified = TRUE,
             is_primary = TRUE,
             verification_token = $2,
             dns_record_type = 'CNAME',
             dns_record_value = $3,
             dns_records = $4::jsonb,
             ssl_status = 'active',
             verified_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $5
         RETURNING *`,
        [cleanDomain, token, CUSTOM_DOMAIN_CNAME_TARGET, JSON.stringify(dnsRecords), domRes.rows[0].id]
      );
      savedDomain = upd.rows[0];
    } else {
      const ins = await queryDb(
        `INSERT INTO website_domains (
           website_id, domain_type, domain, domain_name, is_primary, is_verified,
           verification_token, dns_record_type, dns_record_value, dns_records, ssl_status, verified_at
         ) VALUES (
           $1, 'custom_domain', $2, $2, TRUE, TRUE,
           $3, 'CNAME', $4, $5::jsonb, 'active', CURRENT_TIMESTAMP
         ) RETURNING *`,
        [id, cleanDomain, token, CUSTOM_DOMAIN_CNAME_TARGET, JSON.stringify(dnsRecords)]
      );
      savedDomain = ins.rows[0];
    }

    await invalidateWebsiteCache(id);
    return NextResponse.json({
      success: true,
      verified: true,
      message: `Domain "${cleanDomain}" passed DNS verification and is now live as your primary custom domain.`,
      domain: savedDomain,
      dns_records: dnsRecords,
      custom_domain: cleanDomain,
      custom_domain_verified: true,
    });
  }

  if (action === "disconnect_custom_domain") {
    const id = Number(body.id || body.websiteId);
    if (!id) {
      return NextResponse.json({ success: false, error: "Website ID is required." }, { status: 400 });
    }
    await queryDb(`DELETE FROM website_domains WHERE website_id = $1 AND domain_type = 'custom_domain'`, [id]);
    await queryDb(`UPDATE website_domains SET is_primary = TRUE WHERE website_id = $1 AND domain_type = 'subdomain'`, [id]);
    await invalidateWebsiteCache(id);
    return NextResponse.json({
      success: true,
      message: "Custom domain removed successfully. Traffic reverted to default subdomain.",
    });
  }

  if (action === "delete_website" || action === "schedule_deletion") {
    const id = Number(body.id || body.websiteId);
    if (!id) {
      return NextResponse.json({ success: false, error: "Website ID required." }, { status: 400 });
    }
    try {
      const scheduled = await scheduleWebsiteDeletion(id, "creator", creatorId);
      if (!scheduled) {
        return NextResponse.json({ success: false, error: "Website not found or unauthorized." }, { status: 404 });
      }
      return NextResponse.json({
        success: true,
        scheduled: true,
        id,
        name: scheduled.name,
        deletion_scheduled_at: scheduled.deletion_scheduled_at,
        website: scheduled,
        message: `Website "${scheduled.name}" has been scheduled for permanent deletion in 30 days (${new Date(scheduled.deletion_scheduled_at).toLocaleDateString()}). You can cancel anytime before then.`,
      });
    } catch (err: any) {
      return NextResponse.json({ success: false, error: err.message || "Failed to schedule deletion." }, { status: 500 });
    }
  }

  if (action === "cancel_delete_website" || action === "cancel_deletion") {
    const id = Number(body.id || body.websiteId);
    if (!id) {
      return NextResponse.json({ success: false, error: "Website ID required." }, { status: 400 });
    }
    try {
      const cancelled = await cancelWebsiteDeletion(id, creatorId);
      if (!cancelled) {
        return NextResponse.json({ success: false, error: "Website not found or unauthorized." }, { status: 404 });
      }
      return NextResponse.json({
        success: true,
        id,
        name: cancelled.name,
        website: cancelled,
        message: `Scheduled deletion for "${cancelled.name}" has been cancelled.`,
      });
    } catch (err: any) {
      return NextResponse.json({ success: false, error: err.message || "Failed to cancel deletion." }, { status: 500 });
    }
  }

  return NextResponse.json({ success: false, error: `Unknown websites action: ${action}` }, { status: 400 });
}

export async function POST(request: any) {
  try {
    const sessionCreator = await getCreatorSession(request);
    const contentType = request.headers.get("content-type") || "";
    let body: any;
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const payloadRaw = formData.get("payload");
      const parsedPayload =
        typeof payloadRaw === "string" && payloadRaw.trim() ? JSON.parse(payloadRaw) : {};
      body = { ...parsedPayload };
      for (const [k, v] of formData.entries()) {
        if (k === "payload") continue;
        if (typeof v === "object" && v !== null && typeof (v as any).arrayBuffer === "function") {
          if ((v as any).size > 0) {
            body[k] = v;
          }
        } else if (body[k] === undefined) {
          body[k] = v;
        }
      }
    } else {
      body = await request.json();
    }
    return await handleWebsitesAction(body, sessionCreator, request);
  } catch (error: any) {
    console.error("Websites POST API error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function seedWebsiteDefaults(
  websiteId: any,
  websiteName: any,
  themeConfig: any = {},
  extraSettings: any = {},
  dbClient: any = null
) {
  try {
    const noticeSlug = `welcome-to-${websiteId}`;
    const noticeTitle = `Welcome to ${websiteName}`;
    const noticeDesc = `We take immense pride in announcing the launch of our digital campus portal for ${websiteName}. Students and parents can access admission notices, timetables, and academic records seamlessly.`;

    if (dbClient) {
      await dbClient.query("SAVEPOINT seed_defaults_sp");
      try {
        await dbClient.query(
          `INSERT INTO website_notices (website_id, title, slug, description, published_date, is_active)
           VALUES ($1, $2, $3, $4, CURRENT_DATE, TRUE)
           ON CONFLICT (website_id, slug) DO NOTHING`,
          [websiteId, noticeTitle, noticeSlug, noticeDesc]
        );
        await dbClient.query("RELEASE SAVEPOINT seed_defaults_sp");
      } catch (innerErr) {
        await dbClient.query("ROLLBACK TO SAVEPOINT seed_defaults_sp");
        console.error("Warning seeding default welcome notice:", innerErr);
      }
    } else {
      await queryDb(
        `INSERT INTO website_notices (website_id, title, slug, description, published_date, is_active)
         VALUES ($1, $2, $3, $4, CURRENT_DATE, TRUE)
         ON CONFLICT (website_id, slug) DO NOTHING`,
        [websiteId, noticeTitle, noticeSlug, noticeDesc]
      ).catch((innerErr) => console.error("Warning seeding default welcome notice:", innerErr));
    }
  } catch (err: any) {
    console.error("Error seeding website defaults:", err);
  }
}
