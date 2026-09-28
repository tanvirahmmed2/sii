import { query } from '@/lib/db/pg';
import { hasModulePermission } from '@/lib/middleware/developer';
import cloudinary, { uploadToCloudinary, deleteFromCloudinary } from '@/lib/db/cloudinary';

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
}

function parseModuleIds(input) {
  if (!input) return [];
  if (Array.isArray(input)) {
    return input
      .map((id) => (typeof id === 'object' && id !== null ? Number(id.id) : Number(id)))
      .filter((id) => !isNaN(id) && id > 0);
  }
  if (typeof input === 'string') {
    try {
      const parsed = JSON.parse(input);
      if (Array.isArray(parsed)) return parseModuleIds(parsed);
    } catch (_) {}
    return input
      .split(',')
      .map((s) => Number(s.trim()))
      .filter((id) => !isNaN(id) && id > 0);
  }
  return [];
}

export async function GET(req) {
  try {
    const auth = await hasModulePermission(req, 'apps');
    if (!auth.success) {
      return Response.json({ error: auth.message }, { status: auth.status || 403 });
    }

    const url = new URL(req.url);
    const appId = url.searchParams.get('id');
    const search = url.searchParams.get('search') || url.searchParams.get('q');
    const status = url.searchParams.get('status');
    const listCloudinary = url.searchParams.get('cloudinary_assets');
    const getWebsiteModules =
      url.searchParams.get('website_modules') === 'true' || url.searchParams.get('modules') === 'true';

    // Endpoint to retrieve selectable canonical website modules
    if (getWebsiteModules) {
      const modRes = await query(
        'SELECT id, name, slug, description FROM website_modules WHERE (website_id IS NULL OR is_enabled = true) AND is_active = true ORDER BY id ASC'
      );
      return Response.json(
        {
          success: true,
          modules: modRes.rows || [],
          website_modules: modRes.rows || [],
        },
        { status: 200 }
      );
    }

    if (listCloudinary === 'true') {
      try {
        const cloudRes = await cloudinary.api.resources({
          type: 'upload',
          max_results: 40,
        });
        const assets = (cloudRes.resources || []).map((r) => ({
          public_id: r.public_id,
          asset_id: r.asset_id,
          format: r.format,
          secure_url: r.secure_url,
        }));
        return Response.json({ success: true, assets }, { status: 200 });
      } catch (err) {
        return Response.json({ error: err.message }, { status: 500 });
      }
    }

    let sql = `
      SELECT 
        a.id,
        a.title,
        a.slug,
        a.description,
        a.short_description,
        a.is_published,
        a.created_at,
        a.updated_at,
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', ai.id,
                'app_id', ai.app_id,
                'image', ai.image,
                'image_id', ai.image_id,
                'title', ai.title,
                'created_at', ai.created_at
              ) ORDER BY ai.id ASC
            )
            FROM apps_images ai
            WHERE ai.app_id = a.id
          ),
          '[]'::json
        ) AS images,
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', wm.id,
                'name', wm.name,
                'slug', wm.slug,
                'description', wm.description,
                'is_active', am.is_active
              ) ORDER BY wm.id ASC
            )
            FROM app_modules am
            JOIN website_modules wm ON am.website_module_id = wm.id
            WHERE am.app_id = a.id
          ),
          '[]'::json
        ) AS modules,
        COALESCE(
          (
            SELECT array_agg(am.website_module_id ORDER BY am.website_module_id ASC)
            FROM app_modules am
            WHERE am.app_id = a.id
          ),
          ARRAY[]::integer[]
        ) AS website_module_ids
      FROM apps a
    `;
    let params = [];
    let whereClauses = [];

    if (appId) {
      whereClauses.push(`a.id = $${params.length + 1}`);
      params.push(parseInt(appId, 10));
    }

    if (status === 'published') {
      whereClauses.push(`a.is_published = true`);
    } else if (status === 'draft') {
      whereClauses.push(`a.is_published = false`);
    }

    if (search && search.trim()) {
      const searchParam = `%${search.trim().toLowerCase()}%`;
      whereClauses.push(`(LOWER(a.title) LIKE $${params.length + 1} OR LOWER(COALESCE(a.short_description, '')) LIKE $${params.length + 1} OR LOWER(COALESCE(a.description, '')) LIKE $${params.length + 1})`);
      params.push(searchParam);
    }

    if (whereClauses.length > 0) {
      sql += ' WHERE ' + whereClauses.join(' AND ');
    }

    sql += ` ORDER BY a.id DESC`;
    const result = await query(sql, params);
    const mappedRows = result.rows || [];

    if (appId) {
      const record = mappedRows[0] || null;
      return Response.json({
        success: true,
        record,
        ...record,
      }, { status: 200 });
    }

    return Response.json({
      success: true,
      records: mappedRows,
      table: 'apps',
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching apps:', error);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const auth = await hasModulePermission(req, 'apps');
    if (!auth.success) {
      return Response.json({ error: auth.message }, { status: auth.status || 403 });
    }

    let title = '';
    let description = '';
    let short_description = '';
    let is_published = true;
    let websiteModuleIds = [];
    let imageFiles = [];
    let attachPublicId = null;
    let attachAssetId = null;
    let attachTitle = null;

    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('multipart/form-data') || contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await req.formData();
      title = (formData.get('title') || formData.get('name') || '').trim();
      description = formData.get('description') || '';
      short_description = formData.get('short_description') || '';
      const isActiveVal = formData.get('is_published') ?? formData.get('is_active');
      is_published = isActiveVal === 'false' ? false : true;

      const rawModIds = formData.getAll && formData.getAll('website_module_ids').length
        ? formData.getAll('website_module_ids')
        : (formData.get('website_module_ids') || formData.get('module_ids'));
      websiteModuleIds = parseModuleIds(rawModIds);

      attachPublicId = formData.get('public_id');
      attachAssetId = formData.get('asset_id');
      attachTitle = formData.get('image_title');

      for (const [key, val] of formData.entries()) {
        if (val && typeof val === 'object' && typeof val.arrayBuffer === 'function' && val.size > 0) {
          imageFiles.push(val);
        }
      }
    } else {
      const body = await req.json().catch(() => ({}));
      title = (body.title || body.name || '').trim();
      description = body.description || '';
      short_description = body.short_description || '';
      is_published = body.is_published !== false && body.is_active !== false;
      websiteModuleIds = parseModuleIds(body.website_module_ids ?? body.module_ids ?? body.modules);
      attachPublicId = body.public_id;
      attachAssetId = body.asset_id;
      attachTitle = body.image_title || body.title;
    }

    if (!title) {
      title = 'Untitled App';
    }

    const baseSlug = slugify(title) || 'app';
    let slug = baseSlug;

    const checkSlug = await query('SELECT id FROM apps WHERE slug = $1 LIMIT 1', [slug]);
    if (checkSlug.rows.length > 0) {
      slug = `${baseSlug}-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    await query('BEGIN');

    const appResult = await query(
      `INSERT INTO apps (
        title, slug, description, short_description, is_published
      ) VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [title, slug, description, short_description, is_published]
    );

    const app = appResult.rows[0];

    // Link website modules in app_modules junction table
    if (websiteModuleIds.length > 0) {
      for (const modId of websiteModuleIds) {
        await query(
          `INSERT INTO app_modules (app_id, website_module_id, is_active)
           VALUES ($1, $2, TRUE)
           ON CONFLICT (app_id, website_module_id) DO UPDATE SET is_active = TRUE`,
          [app.id, modId]
        );
      }
    }

    for (const imgFile of imageFiles) {
      const uploadResult = await uploadToCloudinary(imgFile, 'portfoliobuilder/apps');
      if (uploadResult) {
        await query(
          `INSERT INTO apps_images (app_id, image, image_id, title)
           VALUES ($1, $2, $3, $4)`,
          [app.id, uploadResult.url || uploadResult.id, uploadResult.id, imgFile.name || title]
        );
      }
    }

    if (attachPublicId) {
      await query(
        `INSERT INTO apps_images (app_id, image, image_id, title)
         VALUES ($1, $2, $3, $4)`,
        [app.id, attachPublicId, attachAssetId || attachPublicId, attachTitle || title]
      );
    }

    await query('COMMIT');

    const fullAppRes = await query(
      `SELECT a.*, 
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', ai.id,
                'app_id', ai.app_id,
                'image', ai.image,
                'image_id', ai.image_id,
                'title', ai.title,
                'created_at', ai.created_at
              ) ORDER BY ai.id ASC
            )
            FROM apps_images ai
            WHERE ai.app_id = a.id
          ),
          '[]'::json
        ) AS images,
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', wm.id,
                'name', wm.name,
                'slug', wm.slug,
                'description', wm.description,
                'is_active', am.is_active
              ) ORDER BY wm.id ASC
            )
            FROM app_modules am
            JOIN website_modules wm ON am.website_module_id = wm.id
            WHERE am.app_id = a.id
          ),
          '[]'::json
        ) AS modules,
        COALESCE(
          (
            SELECT array_agg(am.website_module_id ORDER BY am.website_module_id ASC)
            FROM app_modules am
            WHERE am.app_id = a.id
          ),
          ARRAY[]::integer[]
        ) AS website_module_ids
       FROM apps a
       WHERE a.id = $1`,
      [app.id]
    );

    const record = fullAppRes.rows[0] || {
      ...app,
      images: [],
      modules: [],
      website_module_ids: websiteModuleIds,
    };

    return Response.json(
      {
        success: true,
        message: 'Application created successfully.',
        record,
        ...record,
      },
      { status: 201 }
    );
  } catch (error) {
    await query('ROLLBACK');
    console.error('Error creating app:', error);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const auth = await hasModulePermission(req, 'apps');
    if (!auth.success) {
      return Response.json({ error: auth.message }, { status: auth.status || 403 });
    }

    let id = null;
    let title = null;
    let description = null;
    let short_description = null;
    let is_published = null;
    let hasModuleIdsPayload = false;
    let websiteModuleIds = [];
    let imageFiles = [];
    let attachPublicId = null;
    let attachAssetId = null;
    let attachTitle = null;

    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('multipart/form-data') || contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await req.formData();
      id = formData.get('id') || formData.get('app_id');
      if (formData.has('title') || formData.has('name')) {
        title = (formData.get('title') || formData.get('name') || '').trim();
      }
      if (formData.has('description')) description = formData.get('description');
      if (formData.has('short_description')) short_description = formData.get('short_description');
      if (formData.has('is_published') || formData.has('is_active')) {
        const val = formData.get('is_published') ?? formData.get('is_active');
        is_published = val === 'true' || val === true;
      }
      if (formData.has('website_module_ids') || formData.has('module_ids')) {
        hasModuleIdsPayload = true;
        const raw = formData.getAll && formData.getAll('website_module_ids').length
          ? formData.getAll('website_module_ids')
          : (formData.get('website_module_ids') || formData.get('module_ids'));
        websiteModuleIds = parseModuleIds(raw);
      }
      attachPublicId = formData.get('public_id');
      attachAssetId = formData.get('asset_id');
      attachTitle = formData.get('image_title');

      for (const [key, val] of formData.entries()) {
        if (val && typeof val === 'object' && typeof val.arrayBuffer === 'function' && val.size > 0) {
          imageFiles.push(val);
        }
      }
    } else {
      const body = await req.json().catch(() => ({}));
      id = body.id || body.app_id;
      const data = body.data || body;
      if (data.title !== undefined || data.name !== undefined) {
        title = (data.title || data.name || '').trim();
      }
      if (data.description !== undefined) description = data.description;
      if (data.short_description !== undefined) short_description = data.short_description;
      if (data.is_published !== undefined || data.is_active !== undefined) {
        const val = data.is_published ?? data.is_active;
        is_published = Boolean(val);
      }
      if (
        data.website_module_ids !== undefined ||
        data.module_ids !== undefined ||
        data.modules !== undefined ||
        body.website_module_ids !== undefined ||
        body.module_ids !== undefined
      ) {
        hasModuleIdsPayload = true;
        websiteModuleIds = parseModuleIds(
          data.website_module_ids ?? data.module_ids ?? data.modules ?? body.website_module_ids ?? body.module_ids
        );
      }
      attachPublicId = data.public_id || body.public_id;
      attachAssetId = data.asset_id || body.asset_id;
      attachTitle = data.image_title || body.image_title || data.title;
    }

    if (!id) {
      return Response.json({ error: 'App ID is required' }, { status: 400 });
    }

    const appId = parseInt(id, 10);

    await query('BEGIN');

    // Update metadata if provided
    if (title !== null || description !== null || short_description !== null || is_published !== null) {
      const currentRes = await query('SELECT * FROM apps WHERE id = $1', [appId]);
      if (currentRes.rows.length === 0) {
        await query('ROLLBACK');
        return Response.json({ error: 'Application not found' }, { status: 404 });
      }
      const current = currentRes.rows[0];

      const newTitle = title !== null ? title : current.title;
      let newSlug = current.slug;
      if (title !== null && title !== current.title && title.trim()) {
        const baseSlug = slugify(newTitle) || 'app';
        newSlug = baseSlug;
        const check = await query('SELECT id FROM apps WHERE slug = $1 AND id != $2 LIMIT 1', [newSlug, appId]);
        if (check.rows.length > 0) {
          newSlug = `${baseSlug}-${Math.floor(1000 + Math.random() * 9000)}`;
        }
      }
      const newDesc = description !== null ? description : current.description;
      const newShortDesc = short_description !== null ? short_description : current.short_description;
      const newPublished = is_published !== null ? is_published : current.is_published;

      await query(
        `UPDATE apps
         SET title = $1, slug = $2, short_description = $3, description = $4, is_published = $5, updated_at = CURRENT_TIMESTAMP
         WHERE id = $6`,
        [newTitle, newSlug, newShortDesc, newDesc, newPublished, appId]
      );
    }

    // Synchronize website modules in app_modules if provided
    if (hasModuleIdsPayload) {
      await query('DELETE FROM app_modules WHERE app_id = $1', [appId]);
      for (const modId of websiteModuleIds) {
        await query(
          `INSERT INTO app_modules (app_id, website_module_id, is_active)
           VALUES ($1, $2, TRUE)
           ON CONFLICT (app_id, website_module_id) DO UPDATE SET is_active = TRUE`,
          [appId, modId]
        );
      }
    }

    // Upload & attach any new images
    for (const file of imageFiles) {
      const uploadResult = await uploadToCloudinary(file, 'portfoliobuilder/apps');
      if (uploadResult) {
        await query(
          `INSERT INTO apps_images (app_id, image, image_id, title)
           VALUES ($1, $2, $3, $4)`,
          [appId, uploadResult.url || uploadResult.id, uploadResult.id, file.name || 'App Screenshot']
        );
      }
    }

    // Attach existing Cloudinary asset if specified
    if (attachPublicId) {
      await query(
        `INSERT INTO apps_images (app_id, image, image_id, title)
         VALUES ($1, $2, $3, $4)`,
        [appId, attachPublicId, attachAssetId || attachPublicId, attachTitle || 'Cloudinary Image']
      );
    }

    await query('COMMIT');

    const updatedRes = await query(
      `SELECT a.*, 
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', ai.id,
                'app_id', ai.app_id,
                'image', ai.image,
                'image_id', ai.image_id,
                'title', ai.title,
                'created_at', ai.created_at
              ) ORDER BY ai.id ASC
            )
            FROM apps_images ai
            WHERE ai.app_id = a.id
          ),
          '[]'::json
        ) AS images,
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', wm.id,
                'name', wm.name,
                'slug', wm.slug,
                'description', wm.description,
                'is_active', am.is_active
              ) ORDER BY wm.id ASC
            )
            FROM app_modules am
            JOIN website_modules wm ON am.website_module_id = wm.id
            WHERE am.app_id = a.id
          ),
          '[]'::json
        ) AS modules,
        COALESCE(
          (
            SELECT array_agg(am.website_module_id ORDER BY am.website_module_id ASC)
            FROM app_modules am
            WHERE am.app_id = a.id
          ),
          ARRAY[]::integer[]
        ) AS website_module_ids
       FROM apps a
       WHERE a.id = $1`,
      [appId]
    );

    const record = updatedRes.rows[0] || null;

    return Response.json({
      success: true,
      message: 'Application updated successfully.',
      record,
      images: record?.images || [],
      modules: record?.modules || [],
      website_module_ids: record?.website_module_ids || [],
      ...record,
    }, { status: 200 });
  } catch (error) {
    await query('ROLLBACK');
    console.error('Error updating app:', error);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const auth = await hasModulePermission(req, 'apps');
    if (!auth.success) {
      return Response.json({ error: auth.message }, { status: auth.status || 403 });
    }

    const url = new URL(req.url);
    let id = url.searchParams.get('id') || url.searchParams.get('app_id');
    let imageId = url.searchParams.get('image_id');

    if (!id && !imageId) {
      const body = await req.json().catch(() => ({}));
      id = body.id || body.app_id;
      imageId = body.image_id;
    }

    if (imageId) {
      const imgRow = await query('SELECT image, image_id FROM apps_images WHERE id = $1', [imageId]);
      if (imgRow.rows.length > 0) {
        const publicId = imgRow.rows[0].image_id || imgRow.rows[0].image;
        if (publicId) {
          try {
            await deleteFromCloudinary(publicId);
          } catch (err) {
            console.warn('Cloudinary delete image error:', err.message);
          }
        }
        await query('DELETE FROM apps_images WHERE id = $1', [imageId]);
      }
      return Response.json({ success: true, message: 'Image deleted from Cloudinary and database.' }, { status: 200 });
    }

    if (!id) {
      return Response.json({ error: 'App ID or Image ID is required for deletion.' }, { status: 400 });
    }

    const appId = parseInt(id, 10);
    const imgRows = await query('SELECT image, image_id FROM apps_images WHERE app_id = $1', [appId]);
    for (const r of imgRows.rows) {
      const publicId = r.image_id || r.image;
      if (publicId) {
        try {
          await deleteFromCloudinary(publicId);
        } catch (_) {}
      }
    }

    // Safely delete/unlink foreign keys before deleting from apps
    await query('DELETE FROM apps_images WHERE app_id = $1', [appId]);
    await query('DELETE FROM app_modules WHERE app_id = $1', [appId]);
    await query('UPDATE packages SET app_id = NULL WHERE app_id = $1', [appId]).catch(() => {});
    await query('UPDATE blogs SET app_id = NULL WHERE app_id = $1', [appId]).catch(() => {});
    await query('DELETE FROM apps WHERE id = $1', [appId]);

    return Response.json({ success: true, message: 'App and associated Cloudinary assets deleted.' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting:', error);
    return Response.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
