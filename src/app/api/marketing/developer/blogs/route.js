import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';
import { hasModulePermission } from 'src/lib/middleware/developer';
import cloudinary, { uploadToCloudinary, deleteFromCloudinary } from 'src/lib/database/cloudinary';

function slugify(text) {
  return (text || '')
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function generateUniqueSlug(text, excludeId = null) {
  const baseSlug = slugify(text) || 'article';
  let candidate = baseSlug;
  let counter = 1;

  while (true) {
    let checkQuery = 'SELECT id FROM blogs WHERE slug = $1';
    const params = [candidate];
    if (excludeId) {
      checkQuery += ' AND id != $2';
      params.push(excludeId);
    }
    checkQuery += ' LIMIT 1';

    const checkRes = await queryDb(checkQuery, params);
    if (checkRes.rows.length === 0) {
      return candidate;
    }
    candidate = `${baseSlug}-${counter++}`;
  }
}

function parseTags(tagsInput) {
  if (Array.isArray(tagsInput)) {
    return tagsInput.map((t) => String(t).trim()).filter(Boolean);
  }
  if (typeof tagsInput === 'string') {
    return tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
  }
  return [];
}

const BLOG_SELECT_FIELDS = `
  b.id,
  b.developer_id,
  b.title,
  b.slug,
  b.excerpt,
  b.excerpt AS summary,
  b.content,
  b.category,
  b.meta_title,
  b.meta_description,
  b.is_published,
  b.published_at,
  b.views_count,
  b.created_at,
  b.updated_at,
  d.name AS author_name,
  d.email AS author_email,
  COALESCE(dr.slug, 'developer') AS author_role,
  COALESCE(
    (
      SELECT json_agg(
        json_build_object(
          'id', bi.id,
          'blog_id', bi.blog_id,
          'image', bi.image,
          'image_id', bi.image_id,
          'caption', bi.caption,
          'is_primary', bi.is_primary,
          'display_order', bi.display_order,
          'created_at', bi.created_at
        ) ORDER BY bi.is_primary DESC, bi.display_order ASC, bi.id ASC
      )
      FROM blog_images bi
      WHERE bi.blog_id = b.id
    ),
    '[]'::json
  ) AS images,
  (
    SELECT bi.image
    FROM blog_images bi
    WHERE bi.blog_id = b.id
    ORDER BY bi.is_primary DESC, bi.display_order ASC, bi.id ASC
    LIMIT 1
  ) AS image,
  (
    SELECT bi.image_id
    FROM blog_images bi
    WHERE bi.blog_id = b.id
    ORDER BY bi.is_primary DESC, bi.display_order ASC, bi.id ASC
    LIMIT 1
  ) AS image_id
`;

async function getFullBlog(blogId) {
  const query = `
    SELECT ${BLOG_SELECT_FIELDS}
    FROM blogs b
    LEFT JOIN developers d ON b.developer_id = d.id
    LEFT JOIN developer_roles dr ON d.role_id = dr.id
    WHERE b.id = $1
    LIMIT 1
  `;
  const res = await queryDb(query, [blogId]);
  return res.rows[0] || null;
}

/**
 * Synchronize images for a blog: handles newly uploaded files,
 * library selections, order/primary updates, and deletions.
 */
async function syncBlogImages(blogId, existingImages = null, newFiles = []) {
  const newUploaded = [];

  // 1. Upload new image files
  if (Array.isArray(newFiles) && newFiles.length > 0) {
    for (const file of newFiles) {
      if (file && typeof file === 'object' && typeof file.arrayBuffer === 'function' && file.size > 0) {
        try {
          const res = await uploadToCloudinary(file, 'saas/blogs');
          if (res) {
            newUploaded.push({
              image: res.url || res.secure_url || res.id,
              image_id: res.id || res.public_id,
              caption: null,
              is_primary: false,
            });
          }
        } catch (e) {
          console.warn('Failed to upload file to Cloudinary:', e.message);
        }
      }
    }
  }

  // 2. If existingImages array was provided, sync with current database records
  if (Array.isArray(existingImages)) {
    const curRowsRes = await queryDb('SELECT * FROM blog_images WHERE blog_id = $1', [blogId]);
    const curRows = curRowsRes.rows;

    const keepIds = new Set(
      existingImages
        .map((img) => (typeof img === 'object' && img.id ? String(img.id) : null))
        .filter(Boolean)
    );

    // Delete any currently stored images that are omitted from existingImages
    for (const cur of curRows) {
      if (!keepIds.has(String(cur.id))) {
        await queryDb('DELETE FROM blog_images WHERE id = $1', [cur.id]);
        if (cur.image_id) {
          try {
            await deleteFromCloudinary(cur.image_id);
          } catch (e) {}
        }
      }
    }

    // Update kept images or stage new library items
    for (let i = 0; i < existingImages.length; i++) {
      const item = existingImages[i];
      if (item && item.id) {
        await queryDb(
          `UPDATE blog_images
           SET is_primary = $1,
               caption = $2,
               display_order = $3
           WHERE id = $4 AND blog_id = $5`,
          [Boolean(item.is_primary), item.caption || null, item.display_order ?? i, item.id, blogId]
        );
      } else if (item && item.image && !item.id) {
        // Fresh image object added from Cloudinary library
        newUploaded.push({
          image: item.image || item.secure_url,
          image_id: item.image_id || item.public_id || null,
          caption: item.caption || null,
          is_primary: Boolean(item.is_primary),
          display_order: item.display_order ?? (existingImages.length + i),
        });
      }
    }
  }

  // 3. Insert newly uploaded or added images
  for (let i = 0; i < newUploaded.length; i++) {
    const img = newUploaded[i];
    await queryDb(
      `INSERT INTO blog_images (blog_id, image, image_id, caption, is_primary, display_order)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [blogId, img.image, img.image_id || null, img.caption || null, Boolean(img.is_primary), img.display_order ?? (100 + i)]
    );
  }

  // 4. Ensure at least one image is primary if images exist
  const checkCurrent = await queryDb(
    'SELECT id, is_primary FROM blog_images WHERE blog_id = $1 ORDER BY is_primary DESC, display_order ASC, id ASC',
    [blogId]
  );
  if (checkCurrent.rows.length > 0) {
    const hasPrimary = checkCurrent.rows.some((r) => r.is_primary);
    if (!hasPrimary) {
      await queryDb('UPDATE blog_images SET is_primary = TRUE WHERE id = $1', [checkCurrent.rows[0].id]);
    }
  }
}

// ============================================================================
// GET: List blogs or get single blog by ID / slug
// ============================================================================
export async function GET(request) {
  try {
    const auth = await hasModulePermission(request, 'blogs');
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message || 'Unauthorized' }, { status: auth.status || 401 });
    }

    const { searchParams } = new URL(request.url);
    const blogId = searchParams.get('id');
    const slug = searchParams.get('slug');
    const status = searchParams.get('status');
    const search = searchParams.get('search') || searchParams.get('q');
    const category = searchParams.get('category');
    const listCloudinary = searchParams.get('cloudinary_assets');

    // Return Cloudinary asset library for media picker
    if (listCloudinary === 'true') {
      try {
        const cloudRes = await cloudinary.api.resources({
          type: 'upload',
          max_results: 50,
        });
        const assets = (cloudRes.resources || []).map((r) => ({
          public_id: r.public_id,
          asset_id: r.asset_id,
          format: r.format,
          secure_url: r.secure_url,
        }));
        return NextResponse.json({ success: true, assets }, { status: 200 });
      } catch (err) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
      }
    }

    let query = `
      SELECT ${BLOG_SELECT_FIELDS}
      FROM blogs b
      LEFT JOIN developers d ON b.developer_id = d.id
      LEFT JOIN developer_roles dr ON d.role_id = dr.id
    `;

    const conditions = [];
    const params = [];
    let idx = 1;

    if (blogId) {
      conditions.push(`b.id = $${idx++}`);
      params.push(Number(blogId));
    }
    if (slug) {
      conditions.push(`b.slug = $${idx++}`);
      params.push(slug.trim());
    }
    if (status === 'published') {
      conditions.push(`b.is_published = TRUE`);
    } else if (status === 'draft') {
      conditions.push(`b.is_published = FALSE`);
    }
    if (category && category.trim()) {
      conditions.push(`LOWER(b.category) = $${idx++}`);
      params.push(category.trim().toLowerCase());
    }
    if (search && search.trim()) {
      conditions.push(`(
        LOWER(b.title) LIKE $${idx} OR 
        LOWER(COALESCE(b.excerpt, '')) LIKE $${idx} OR 
        LOWER(COALESCE(b.category, '')) LIKE $${idx}
      )`);
      params.push(`%${search.trim().toLowerCase()}%`);
      idx++;
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += ` ORDER BY b.created_at DESC, b.id DESC`;

    const res = await queryDb(query, params).catch(() => ({ rows: [] }));

    if (blogId || slug) {
      const record = res.rows[0] || null;
      if (!record) {
        return NextResponse.json({ success: false, error: 'Blog not found.' }, { status: 404 });
      }
      return NextResponse.json({ success: true, record, blog: record, ...record });
    }

    // Categories list for filters
    const catRes = await queryDb(
      'SELECT DISTINCT category FROM blogs WHERE category IS NOT NULL AND category != \'\' ORDER BY category ASC'
    ).catch(() => ({ rows: [] }));

    return NextResponse.json({
      success: true,
      table: 'blogs',
      records: res.rows,
      blogs: res.rows,
      categories: catRes.rows.map((r) => r.category),
    });
  } catch (error) {
    console.error('Developer blogs GET error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ============================================================================
// POST: Create a new blog article
// ============================================================================
export async function POST(request) {
  try {
    const auth = await hasModulePermission(request, 'blogs');
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message || 'Unauthorized' }, { status: auth.status || 401 });
    }

    let title = '';
    let excerpt = '';
    let content = '';
    let category = '';
    let tagsInput = [];
    let meta_title = '';
    let meta_description = '';
    let is_published = false;
    let published_at = null;
    let newFiles = [];
    let initialImages = [];

    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('multipart/form-data') || contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData();
      title = (formData.get('title') || '').trim();
      excerpt = (formData.get('excerpt') ?? formData.get('summary') ?? '').trim();
      content = (formData.get('content') || '').trim();
      category = (formData.get('category') || '').trim();
      meta_title = (formData.get('meta_title') || '').trim();
      meta_description = (formData.get('meta_description') || '').trim();

      const pubVal = formData.get('is_published') ?? formData.get('is_active');
      if (pubVal !== null && pubVal !== undefined) {
        is_published = pubVal === 'true' || pubVal === true || pubVal === '1';
      }

      if (formData.has('published_at') && formData.get('published_at')) {
        published_at = new Date(formData.get('published_at')).toISOString();
      }

      // Collect multiple uploaded image files
      const collectedFiles = [
        ...formData.getAll('files'),
        ...formData.getAll('imageFiles'),
        formData.get('file'),
      ].filter((f) => f && typeof f === 'object' && typeof f.arrayBuffer === 'function' && f.size > 0);
      newFiles = collectedFiles;

      // Collect any library images (passed as JSON string)
      const rawImages = formData.get('images') || formData.get('existing_images');
      if (rawImages && typeof rawImages === 'string') {
        try {
          const parsed = JSON.parse(rawImages);
          if (Array.isArray(parsed)) initialImages = parsed;
        } catch (e) {
          if (rawImages.startsWith('http')) {
            initialImages.push({ image: rawImages, is_primary: true });
          }
        }
      }
    } else {
      const body = await request.json().catch(() => ({}));
      const data = body.data || body;
      title = (data.title || '').trim();
      excerpt = (data.excerpt ?? data.summary ?? '').trim();
      content = (data.content || '').trim();
      category = (data.category || '').trim();
      meta_title = (data.meta_title || '').trim();
      meta_description = (data.meta_description || '').trim();
      if (data.is_published !== undefined) {
        is_published = Boolean(data.is_published);
      }
      if (data.published_at) {
        published_at = new Date(data.published_at).toISOString();
      }
      if (Array.isArray(data.images)) {
        initialImages = data.images;
      } else if (data.image) {
        initialImages = [{ image: data.image, image_id: data.image_id || null, is_primary: true }];
      }
    }

    if (!title) {
      return NextResponse.json({ success: false, error: 'Article title is required.' }, { status: 400 });
    }
    if (!content) {
      return NextResponse.json({ success: false, error: 'Article body content is required.' }, { status: 400 });
    }

    // API strictly generates unique slug from article title
    const slug = await generateUniqueSlug(title);

    const developerId = auth.user?.id || auth.staff?.id || null;
    const finalPublishedAt = is_published ? (published_at || new Date().toISOString()) : null;

    const insertRes = await queryDb(
      `INSERT INTO blogs (
        developer_id,
        title,
        slug,
        excerpt,
        content,
        category,
        meta_title,
        meta_description,
        is_published,
        published_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id`,
      [
        developerId,
        title,
        slug,
        excerpt || null,
        content,
        category || null,
        meta_title || null,
        meta_description || null,
        is_published,
        finalPublishedAt,
      ]
    );

    const newBlogId = insertRes.rows[0].id;

    // Sync / insert images into blog_images
    await syncBlogImages(newBlogId, initialImages, newFiles);

    const newBlog = await getFullBlog(newBlogId);

    return NextResponse.json(
      {
        success: true,
        record: newBlog,
        blog: newBlog,
        message: 'Blog article created successfully.',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Blog POST error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to create blog' }, { status: 400 });
  }
}

// ============================================================================
// PUT: Update an existing blog article
// ============================================================================
export async function PUT(request) {
  try {
    const auth = await hasModulePermission(request, 'blogs');
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message || 'Unauthorized' }, { status: auth.status || 401 });
    }

    let id = null;
    let title = null;
    let excerpt = null;
    let content = null;
    let category = null;
    let tagsInput = null;
    let meta_title = null;
    let meta_description = null;
    let is_published = null;
    let published_at = null;
    let newFiles = [];
    let imagesPayload = null; // null if untouched, array if provided

    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('multipart/form-data') || contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData();
      id = formData.get('id') || formData.get('blog_id');
      if (formData.has('title')) title = (formData.get('title') || '').trim();
      if (formData.has('excerpt') || formData.has('summary')) {
        excerpt = (formData.get('excerpt') ?? formData.get('summary') ?? '').trim();
      }
      if (formData.has('content')) content = (formData.get('content') || '').trim();
      if (formData.has('category')) category = (formData.get('category') || '').trim();
      if (formData.has('meta_title')) meta_title = (formData.get('meta_title') || '').trim();
      if (formData.has('meta_description')) meta_description = (formData.get('meta_description') || '').trim();

      if (formData.has('is_published') || formData.has('is_active')) {
        const pubVal = formData.get('is_published') ?? formData.get('is_active');
        is_published = pubVal === 'true' || pubVal === true || pubVal === '1';
      }

      if (formData.has('published_at')) {
        const val = formData.get('published_at');
        published_at = val ? new Date(val).toISOString() : null;
      }

      const collectedFiles = [
        ...formData.getAll('files'),
        ...formData.getAll('imageFiles'),
        formData.get('file'),
      ].filter((f) => f && typeof f === 'object' && typeof f.arrayBuffer === 'function' && f.size > 0);
      newFiles = collectedFiles;

      const rawImages = formData.get('images') || formData.get('existing_images');
      if (rawImages) {
        try {
          imagesPayload = typeof rawImages === 'string' ? JSON.parse(rawImages) : rawImages;
        } catch (e) {
          imagesPayload = [];
        }
      }
    } else {
      const body = await request.json().catch(() => ({}));
      const data = body.data || body;
      id = body.id || data.id;
      if (data.title !== undefined) title = (data.title || '').trim();
      if (data.excerpt !== undefined || data.summary !== undefined) {
        excerpt = (data.excerpt ?? data.summary ?? '').trim();
      }
      if (data.content !== undefined) content = (data.content || '').trim();
      if (data.category !== undefined) category = (data.category || '').trim();
      if (data.meta_title !== undefined) meta_title = (data.meta_title || '').trim();
      if (data.meta_description !== undefined) meta_description = (data.meta_description || '').trim();
      if (data.is_published !== undefined || data.is_active !== undefined) {
        const val = data.is_published ?? data.is_active;
        is_published = Boolean(val);
      }
      if (data.published_at !== undefined) {
        published_at = data.published_at ? new Date(data.published_at).toISOString() : null;
      }
      if (data.images !== undefined) {
        imagesPayload = Array.isArray(data.images) ? data.images : [];
      }
    }

    if (!id) {
      return NextResponse.json({ success: false, error: 'Valid blog ID is required.' }, { status: 400 });
    }

    const blogId = Number(id);
    const existingRes = await queryDb('SELECT * FROM blogs WHERE id = $1 LIMIT 1', [blogId]);
    if (existingRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Blog article not found.' }, { status: 404 });
    }

    const currentBlog = existingRes.rows[0];

    const finalTitle = title !== null ? title : currentBlog.title;
    if (!finalTitle) {
      return NextResponse.json({ success: false, error: 'Article title cannot be empty.' }, { status: 400 });
    }

    let finalSlug = currentBlog.slug;
    if (title !== null && title.trim() !== '' && title.trim() !== currentBlog.title) {
      finalSlug = await generateUniqueSlug(title.trim(), blogId);
    } else if (!finalSlug) {
      finalSlug = await generateUniqueSlug(finalTitle, blogId);
    }

    const finalExcerpt = excerpt !== null ? (excerpt || null) : currentBlog.excerpt;
    const finalContent = content !== null ? content : currentBlog.content;
    const finalCategory = category !== null ? (category || null) : currentBlog.category;
    const finalMetaTitle = meta_title !== null ? (meta_title || null) : currentBlog.meta_title;
    const finalMetaDescription = meta_description !== null ? (meta_description || null) : currentBlog.meta_description;
    const finalPublished = is_published !== null ? is_published : currentBlog.is_published;

    let finalPublishedAt = currentBlog.published_at;
    if (published_at !== null) {
      finalPublishedAt = published_at;
    } else if (finalPublished && !currentBlog.published_at) {
      finalPublishedAt = new Date().toISOString();
    } else if (!finalPublished) {
      finalPublishedAt = null;
    }

    await queryDb(
      `UPDATE blogs
       SET title = $1,
           slug = $2,
           excerpt = $3,
           content = $4,
           category = $5,
           meta_title = $6,
           meta_description = $7,
           is_published = $8,
           published_at = $9,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $10`,
      [
        finalTitle,
        finalSlug,
        finalExcerpt,
        finalContent,
        finalCategory,
        finalMetaTitle,
        finalMetaDescription,
        finalPublished,
        finalPublishedAt,
        blogId,
      ]
    );

    // Sync images if imagesPayload or new files provided
    if (imagesPayload !== null || newFiles.length > 0) {
      await syncBlogImages(blogId, imagesPayload, newFiles);
    }

    const updatedBlog = await getFullBlog(blogId);

    return NextResponse.json({
      success: true,
      record: updatedBlog,
      blog: updatedBlog,
      message: 'Blog article updated successfully.',
    });
  } catch (error) {
    console.error('Blog PUT error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to update blog' }, { status: 400 });
  }
}

// ============================================================================
// DELETE: Delete a blog article OR delete a specific image
// ============================================================================
export async function DELETE(request) {
  try {
    const auth = await hasModulePermission(request, 'blogs');
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message || 'Unauthorized' }, { status: auth.status || 401 });
    }

    const { searchParams } = new URL(request.url);
    const blogImageId = searchParams.get('image_id') || searchParams.get('blog_image_id');
    const blogId = searchParams.get('id');
    const slug = searchParams.get('slug');

    // 1. Specific image deletion
    if (blogImageId) {
      const imgRes = await queryDb('SELECT * FROM blog_images WHERE id = $1 LIMIT 1', [Number(blogImageId)]);
      if (imgRes.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Image not found' }, { status: 404 });
      }
      const img = imgRes.rows[0];
      if (img.image_id) {
        try {
          await deleteFromCloudinary(img.image_id);
        } catch (e) {}
      }
      await queryDb('DELETE FROM blog_images WHERE id = $1', [img.id]);

      // If removed image was primary, set another as primary
      if (img.is_primary) {
        await queryDb(`
          UPDATE blog_images
          SET is_primary = TRUE
          WHERE id = (
            SELECT id FROM blog_images WHERE blog_id = $1 ORDER BY display_order ASC, id ASC LIMIT 1
          )
        `, [img.blog_id]);
      }
      return NextResponse.json({ success: true, message: 'Image deleted successfully' });
    }

    // 2. Full blog deletion
    if (!blogId && !slug) {
      return NextResponse.json({ success: false, error: 'Blog ID or slug is required.' }, { status: 400 });
    }

    const checkRes = blogId
      ? await queryDb('SELECT id FROM blogs WHERE id = $1', [Number(blogId)])
      : await queryDb('SELECT id FROM blogs WHERE slug = $1', [slug.trim()]);

    if (checkRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Blog not found.' }, { status: 404 });
    }

    const targetBlog = checkRes.rows[0];

    // Clean up all Cloudinary assets associated with this blog
    const imagesRes = await queryDb('SELECT image_id FROM blog_images WHERE blog_id = $1', [targetBlog.id]);
    for (const row of imagesRes.rows) {
      if (row.image_id) {
        try {
          await deleteFromCloudinary(row.image_id);
        } catch (err) {
          console.warn('Cloudinary delete warning:', err.message);
        }
      }
    }

    // Cascades deletion to blog_images
    await queryDb('DELETE FROM blogs WHERE id = $1', [targetBlog.id]);

    return NextResponse.json({ success: true, message: 'Blog article and media deleted successfully.' });
  } catch (error) {
    console.error('Blog DELETE error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
