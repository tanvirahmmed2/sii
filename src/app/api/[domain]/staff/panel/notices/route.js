import { NextResponse } from 'next/server.js';
import { queryDb } from 'src/lib/database/db.js';
import { resolveWebsiteFromRequest, hasTenantModuleAllowance } from 'src/lib/middleware/websiteResolver.js';
import { getStaffSession, hasStaffModulePermission } from 'src/lib/middleware/staff.js';
import { getOfficerSession, hasOfficerModulePermission } from 'src/lib/middleware/officer.js';
import { getCreatorSession } from 'src/lib/middleware/creator.js';
import { uploadPdf, deletePdf } from 'src/lib/database/cloudinary.js';

/**
 * Robust Route Guard for Control Panel Notices
 * Allows:
 * 1. Authenticated Staff with 'notices' module permission
 * 2. Authenticated Officer with 'notices' module permission
 * 3. Authenticated Tenant Website Creator
 * Rejects unauthorized users, wrong tenant attempts, or missing module allowance.
 */
async function verifyNoticeControlAccess(request, context, action = 'view') {
  const website = await resolveWebsiteFromRequest(request, context);
  if (!website) {
    return { error: 'Educational institution portal not found.', status: 404, code: 'WEBSITE_NOT_FOUND' };
  }

  // 1. Verify tenant subscription package allowance for 'notices'
  const hasAllowance = await hasTenantModuleAllowance(website, 'notices');
  if (!hasAllowance) {
    return {
      error: "The 'notices' module is not included in this institution's subscription plan.",
      status: 403,
      code: 'MODULE_NOT_SUBSCRIBED',
      website,
    };
  }

  // 2. Check Staff Session
  try {
    const staffSession = await getStaffSession(request);
    if (staffSession) {
      const staffWebsiteId =
        staffSession?.website_id ||
        staffSession?.websiteId ||
        staffSession?.staff?.websiteId ||
        staffSession?.staff?.website_id;

      if (!staffWebsiteId || String(staffWebsiteId) === String(website.id)) {
        const hasPerm = hasStaffModulePermission(staffSession, 'notices', action);
        if (!hasPerm) {
          return {
            error: `Forbidden: You do not have permission to ${action} notices.`,
            status: 403,
            code: 'PERMISSION_DENIED',
            website,
          };
        }

        return {
          allowed: true,
          website,
          userType: 'staff',
          user: staffSession.staff || staffSession.user,
          staffId: staffSession.staff_id || staffSession.staffId || staffSession.staff?.id || null,
        };
      }
    }
  } catch (err) {
    console.warn('[Notices Guard] Staff check note:', err?.message);
  }

  // 3. Check Officer Session
  try {
    const officerSession = await getOfficerSession(request);
    if (officerSession) {
      const officerWebsiteId =
        officerSession?.website_id ||
        officerSession?.websiteId ||
        officerSession?.officer?.websiteId ||
        officerSession?.officer?.website_id;

      if (!officerWebsiteId || String(officerWebsiteId) === String(website.id)) {
        const hasPerm = hasOfficerModulePermission(officerSession, 'notices', action);
        if (!hasPerm) {
          return {
            error: `Forbidden: Officer role does not have permission to ${action} notices.`,
            status: 403,
            code: 'PERMISSION_DENIED',
            website,
          };
        }

        return {
          allowed: true,
          website,
          userType: 'officer',
          user: officerSession.officer || officerSession.user,
          staffId: null,
        };
      }
    }
  } catch (err) {
    console.warn('[Notices Guard] Officer check note:', err?.message);
  }

  // 4. Check Creator Session (Website Owner)
  try {
    const creatorSession = await getCreatorSession(request);
    if (creatorSession) {
      const creatorId = creatorSession.creator?.id || creatorSession.id || creatorSession.creatorId;
      if (creatorId && String(creatorId) === String(website.creator_id)) {
        return {
          allowed: true,
          website,
          userType: 'creator',
          user: creatorSession.creator || creatorSession,
          staffId: null,
        };
      }
    }
  } catch (err) {
    console.warn('[Notices Guard] Creator check note:', err?.message);
  }

  return {
    error: 'Unauthorized: Valid staff, officer, or administrator session required.',
    status: 401,
    code: 'UNAUTHORIZED',
  };
}

function slugify(text) {
  const base = String(text || '')
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || `notice-${Date.now()}`;
}

/**
 * Parses both multipart/form-data (with file upload) and application/json requests
 */
async function parseNoticeRequest(request) {
  const contentType = request.headers.get('content-type') || '';
  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData();
    const data = {};
    for (const [key, value] of formData.entries()) {
      if (key === 'pdf' || key === 'file' || key === 'document' || key === 'pdfFile') {
        data.pdfFile = value;
      } else {
        data[key] = value;
      }
    }
    return data;
  }
  return await request.json().catch(() => ({}));
}

// ============================================================================
// GET: List all notices for this tenant website (with search, category, status)
// ============================================================================
export async function GET(request, context) {
  try {
    const auth = await verifyNoticeControlAccess(request, context, 'view');
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim();
    const status = searchParams.get('status');
    const audience = searchParams.get('audience')?.trim();

    let sql = `
      SELECT id,
             website_id,
             title,
             slug,
             pdf_url,
             pdf_id,
             file_name,
             file_size,
             drive_url,
             COALESCE(pdf_url, drive_url) AS file_url,
             description,
             target_audience,
             is_pinned,
             published_date,
             expiry_date,
             views_count,
             is_active,
             created_by_staff_id,
             created_at,
             updated_at
      FROM website_notices 
      WHERE website_id = $1
    `;
    const params = [auth.website.id];

    if (status === 'active') {
      params.push(true);
      sql += ` AND is_active = $${params.length}`;
    } else if (status === 'inactive') {
      params.push(false);
      sql += ` AND is_active = $${params.length}`;
    }

    if (audience && audience !== 'all') {
      params.push(audience);
      sql += ` AND LOWER(target_audience) = LOWER($${params.length})`;
    }

    if (search) {
      params.push(`%${search}%`);
      sql += ` AND (title ILIKE $${params.length} OR slug ILIKE $${params.length} OR description ILIKE $${params.length})`;
    }

    sql += ` ORDER BY is_pinned DESC, published_date DESC, id DESC`;

    const result = await queryDb(sql, params);

    return NextResponse.json({
      success: true,
      notices: result.rows,
      total: result.rowCount,
    });
  } catch (error) {
    console.error('[Control Notices GET Error]:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ============================================================================
// POST: Create a new notice (supports PDF upload to Cloudinary + Drive URL)
// ============================================================================
export async function POST(request, context) {
  try {
    const auth = await verifyNoticeControlAccess(request, context, 'create');
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const payload = await parseNoticeRequest(request);
    const {
      title,
      description = '',
      target_audience = 'All',
      published_date,
      expiry_date,
      drive_url = '',
      pdf_url: directPdfUrl = '',
      is_pinned = false,
      is_active = true,
      pdfFile,
    } = payload;

    if (!title || !String(title).trim()) {
      return NextResponse.json({ success: false, error: 'Notice title is required.' }, { status: 400 });
    }

    let finalPdfUrl = directPdfUrl ? String(directPdfUrl).trim() : null;
    let finalPdfId = null;
    let finalFileName = null;
    let finalFileSize = 0;
    let finalDriveUrl = drive_url ? String(drive_url).trim() : null;

    // Handle Cloudinary PDF Upload
    if (pdfFile && typeof pdfFile === 'object' && pdfFile.size > 0) {
      // Validate file size (max 25MB)
      const MAX_SIZE = 25 * 1024 * 1024;
      if (pdfFile.size > MAX_SIZE) {
        return NextResponse.json(
          { success: false, error: 'PDF file size must not exceed 25MB.' },
          { status: 400 }
        );
      }

      try {
        const folder = `school_${auth.website.id}/notices`;
        const uploadResult = await uploadPdf(pdfFile, folder);
        if (uploadResult?.secure_url) {
          finalPdfUrl = uploadResult.secure_url;
          finalPdfId = uploadResult.publicId || null;
          finalFileName = pdfFile.name || uploadResult.original_filename || 'document.pdf';
          finalFileSize = uploadResult.bytes || pdfFile.size || 0;
          if (!finalDriveUrl) {
            finalDriveUrl = uploadResult.secure_url;
          }
        }
      } catch (uploadErr) {
        console.error('[Cloudinary Notice PDF Upload Error]:', uploadErr);
        return NextResponse.json(
          { success: false, error: `Cloudinary PDF upload failed: ${uploadErr.message || uploadErr}` },
          { status: 500 }
        );
      }
    } else if (finalPdfUrl && !finalDriveUrl) {
      finalDriveUrl = finalPdfUrl;
    } else if (finalDriveUrl && !finalPdfUrl) {
      finalPdfUrl = finalDriveUrl;
    }

    let finalSlug = slugify(title);

    // Verify unique slug for this website, append suffix if exists
    const slugExists = await queryDb(
      `SELECT id FROM website_notices WHERE website_id = $1 AND slug = $2 LIMIT 1`,
      [auth.website.id, finalSlug]
    );

    if (slugExists.rowCount > 0) {
      finalSlug = `${finalSlug}-${Date.now().toString().slice(-4)}`;
    }

    const insertResult = await queryDb(
      `INSERT INTO website_notices 
        (website_id, title, slug, pdf_url, pdf_id, file_name, file_size, drive_url,
         description, target_audience, is_pinned, published_date, expiry_date,
         is_active, created_by_staff_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, COALESCE($12::DATE, CURRENT_DATE), $13::DATE, $14, $15)
       RETURNING *`,
      [
        auth.website.id,
        String(title).trim(),
        finalSlug,
        finalPdfUrl,
        finalPdfId,
        finalFileName,
        finalFileSize,
        finalDriveUrl,
        description || '',
        target_audience ? String(target_audience).trim() : 'All',
        Boolean(is_pinned === true || is_pinned === 'true' || is_pinned === 1 || is_pinned === '1'),
        published_date || null,
        expiry_date || null,
        Boolean(is_active === true || is_active === 'true' || is_active === 1 || is_active === '1'),
        auth.staffId || null,
      ]
    );

    return NextResponse.json({
      success: true,
      message: 'Notice published successfully.',
      notice: insertResult.rows[0],
    });
  } catch (error) {
    console.error('[Control Notices POST Error]:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ============================================================================
// PUT: Update an existing notice (supports replacing PDF in Cloudinary)
// ============================================================================
export async function PUT(request, context) {
  try {
    const auth = await verifyNoticeControlAccess(request, context, 'edit');
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const payload = await parseNoticeRequest(request);
    const {
      id,
      title,
      description,
      target_audience,
      published_date,
      expiry_date,
      drive_url,
      pdf_url: directPdfUrl,
      is_pinned,
      is_active,
      remove_pdf,
      pdfFile,
    } = payload;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Notice ID is required for update.' }, { status: 400 });
    }

    // Verify existence within tenant
    const existingRes = await queryDb(
      `SELECT * FROM website_notices WHERE id = $1 AND website_id = $2`,
      [id, auth.website.id]
    );

    if (existingRes.rowCount === 0) {
      return NextResponse.json({ success: false, error: 'Notice not found or unauthorized.' }, { status: 404 });
    }

    const existingNotice = existingRes.rows[0];

    let finalPdfUrl = existingNotice.pdf_url;
    let finalPdfId = existingNotice.pdf_id;
    let finalFileName = existingNotice.file_name;
    let finalFileSize = existingNotice.file_size;
    let finalDriveUrl = drive_url !== undefined ? (drive_url ? String(drive_url).trim() : null) : existingNotice.drive_url;

    // Handle Remove PDF flag
    if (remove_pdf === true || remove_pdf === 'true') {
      if (existingNotice.pdf_id) {
        await deletePdf(existingNotice.pdf_id).catch((err) =>
          console.warn('[Cloudinary Delete Old PDF Note]:', err?.message)
        );
      }
      finalPdfUrl = null;
      finalPdfId = null;
      finalFileName = null;
      finalFileSize = 0;
      if (finalDriveUrl === existingNotice.pdf_url) {
        finalDriveUrl = null;
      }
    }

    // Handle New PDF Upload
    if (pdfFile && typeof pdfFile === 'object' && pdfFile.size > 0) {
      const MAX_SIZE = 25 * 1024 * 1024;
      if (pdfFile.size > MAX_SIZE) {
        return NextResponse.json(
          { success: false, error: 'PDF file size must not exceed 25MB.' },
          { status: 400 }
        );
      }

      try {
        const folder = `school_${auth.website.id}/notices`;
        const uploadResult = await uploadPdf(pdfFile, folder);

        // Delete previous Cloudinary asset if replaced
        if (existingNotice.pdf_id && existingNotice.pdf_id !== uploadResult.publicId) {
          await deletePdf(existingNotice.pdf_id).catch((err) =>
            console.warn('[Cloudinary Delete Old PDF Note]:', err?.message)
          );
        }

        finalPdfUrl = uploadResult.secure_url;
        finalPdfId = uploadResult.publicId || null;
        finalFileName = pdfFile.name || uploadResult.original_filename || 'document.pdf';
        finalFileSize = uploadResult.bytes || pdfFile.size || 0;
        if (!finalDriveUrl) {
          finalDriveUrl = uploadResult.secure_url;
        }
      } catch (uploadErr) {
        console.error('[Cloudinary Notice PDF Upload Error]:', uploadErr);
        return NextResponse.json(
          { success: false, error: `Cloudinary PDF upload failed: ${uploadErr.message || uploadErr}` },
          { status: 500 }
        );
      }
    } else if (directPdfUrl !== undefined && directPdfUrl !== existingNotice.pdf_url) {
      finalPdfUrl = directPdfUrl ? String(directPdfUrl).trim() : null;
    }

    let finalSlug = existingNotice.slug;
    if (title && String(title).trim() && String(title).trim() !== existingNotice.title) {
      const generatedSlug = slugify(title);
      if (generatedSlug !== existingNotice.slug) {
        finalSlug = generatedSlug;
        const slugCollision = await queryDb(
          `SELECT id FROM website_notices WHERE website_id = $1 AND slug = $2 AND id != $3`,
          [auth.website.id, finalSlug, id]
        );
        if (slugCollision.rowCount > 0) {
          finalSlug = `${finalSlug}-${Date.now().toString().slice(-4)}`;
        }
      }
    }

    const updateResult = await queryDb(
      `UPDATE website_notices
       SET title = COALESCE($1, title),
           slug = $2,
           pdf_url = $3,
           pdf_id = $4,
           file_name = $5,
           file_size = $6,
           drive_url = $7,
           description = COALESCE($8, description),
           target_audience = COALESCE($9, target_audience),
           is_pinned = COALESCE($10, is_pinned),
           published_date = COALESCE($11::DATE, published_date),
           expiry_date = $12::DATE,
           is_active = COALESCE($13, is_active),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $14 AND website_id = $15
       RETURNING *`,
      [
        title ? String(title).trim() : null,
        finalSlug,
        finalPdfUrl,
        finalPdfId,
        finalFileName,
        finalFileSize,
        finalDriveUrl,
        description !== undefined ? description : null,
        target_audience ? String(target_audience).trim() : null,
        is_pinned !== undefined ? Boolean(is_pinned === true || is_pinned === 'true' || is_pinned === 1 || is_pinned === '1') : null,
        published_date || null,
        expiry_date || null,
        is_active !== undefined ? Boolean(is_active === true || is_active === 'true' || is_active === 1 || is_active === '1') : null,
        id,
        auth.website.id,
      ]
    );

    return NextResponse.json({
      success: true,
      message: 'Notice updated successfully.',
      notice: updateResult.rows[0],
    });
  } catch (error) {
    console.error('[Control Notices PUT Error]:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ============================================================================
// DELETE: Delete a notice & clean up Cloudinary PDF asset
// ============================================================================
export async function DELETE(request, context) {
  try {
    const auth = await verifyNoticeControlAccess(request, context, 'delete');
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    const queryId = searchParams.get('id');
    const body = await request.json().catch(() => ({}));
    const id = queryId || body.id;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Notice ID is required for deletion.' }, { status: 400 });
    }

    const existingRes = await queryDb(
      `SELECT id, title, pdf_id FROM website_notices WHERE id = $1 AND website_id = $2`,
      [id, auth.website.id]
    );

    if (existingRes.rowCount === 0) {
      return NextResponse.json({ success: false, error: 'Notice not found or already deleted.' }, { status: 404 });
    }

    const existingNotice = existingRes.rows[0];

    // Delete PDF file from Cloudinary if stored
    if (existingNotice.pdf_id) {
      await deletePdf(existingNotice.pdf_id).catch((err) =>
        console.warn('[Cloudinary PDF Cleanup on Delete Note]:', err?.message)
      );
    }

    await queryDb(
      `DELETE FROM website_notices WHERE id = $1 AND website_id = $2`,
      [id, auth.website.id]
    );

    return NextResponse.json({
      success: true,
      message: `Notice "${existingNotice.title}" deleted successfully.`,
    });
  } catch (error) {
    console.error('[Control Notices DELETE Error]:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
