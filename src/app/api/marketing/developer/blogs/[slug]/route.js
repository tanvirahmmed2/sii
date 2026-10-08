import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';
import { hasModulePermission } from 'src/lib/middleware/developer';
import { uploadToCloudinary, deleteFromCloudinary } from 'src/lib/database/cloudinary';

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
  b.views_count,
  b.is_published,
  b.published_at,
  b.created_at,
  b.updated_at,
  d.name AS author_name,
  d.email AS author_email,
  'developer' AS author_role,
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

async function getFullBlogByIdOrSlug(identifier) {
  const query = `
    SELECT ${BLOG_SELECT_FIELDS}
    FROM blogs b
    LEFT JOIN developers d ON b.developer_id = d.id
    WHERE b.slug = $1 OR b.id::text = $1
    LIMIT 1
  `;
  const res = await queryDb(query, [identifier]);
  return res.rows[0] || null;
}

async function syncBlogImages(blogId, existingImages = null, newFiles = []) {
  const newUploaded = [];

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

  if (Array.isArray(existingImages)) {
    const curRowsRes = await queryDb('SELECT * FROM blog_images WHERE blog_id = $1', [blogId]);
    const curRows = curRowsRes.rows;

    const keepIds = new Set(
      existingImages
        .map((img) => (typeof img === 'object' && img.id ? String(img.id) : null))
        .filter(Boolean)
    );

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

  for (let i = 0; i < newUploaded.length; i++) {
    const img = newUploaded[i];
    await queryDb(
      `INSERT INTO blog_images (blog_id, image, image_id, caption, is_primary, display_order)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [blogId, img.image, img.image_id || null, img.caption || null, Boolean(img.is_primary), img.display_order ?? (100 + i)]
    );
  }

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
// GET: Fetch a single blog by slug or ID
// ============================================================================
export async function GET(request, { params }) {
  try {
    const auth = await hasModulePermission(request, 'blogs');
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status || 401 });
    }

    const { slug } = await params;
    const cleanSlug = decodeURIComponent(slug || '').trim();

    const record = await getFullBlogByIdOrSlug(cleanSlug);
    if (!record) {
      return NextResponse.json({ success: false, error: 'Blog article not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, record, blog: record, ...record });
  } catch (error) {
    console.error('Developer blog GET error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ============================================================================
// PUT / PATCH: Update blog article by slug or ID
// ============================================================================
export async function PUT(request, { params }) {
  try {
    const auth = await hasModulePermission(request, 'blogs');
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status || 401 });
    }

    const { slug } = await params;
    const cleanSlugParam = decodeURIComponent(slug || '').trim();

    const existingRes = await queryDb(
      `SELECT * FROM blogs WHERE slug = $1 OR id::text = $1 LIMIT 1`,
      [cleanSlugParam]
    );
    if (existingRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Blog not found' }, { status: 404 });
    }

    const currentBlog = existingRes.rows[0];
    const blogId = currentBlog.id;

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
    let imagesPayload = null;

    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('multipart/form-data') || contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData();
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

    if (imagesPayload !== null || newFiles.length > 0) {
      await syncBlogImages(blogId, imagesPayload, newFiles);
    }

    const updatedBlog = await getFullBlogByIdOrSlug(String(blogId));

    return NextResponse.json({
      success: true,
      record: updatedBlog,
      blog: updatedBlog,
      message: 'Blog article updated successfully',
    });
  } catch (error) {
    console.error('Developer blog PUT error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ============================================================================
// DELETE: Delete single blog article by slug or ID
// ============================================================================
export async function DELETE(request, { params }) {
  try {
    const auth = await hasModulePermission(request, 'blogs');
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status || 401 });
    }

    const { slug } = await params;
    const cleanSlugParam = decodeURIComponent(slug || '').trim();

    const existingRes = await queryDb(
      `SELECT id FROM blogs WHERE slug = $1 OR id::text = $1 LIMIT 1`,
      [cleanSlugParam]
    );
    if (existingRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Blog not found' }, { status: 404 });
    }

    const blogId = existingRes.rows[0].id;

    // Clean up all Cloudinary assets associated with this blog
    const imagesRes = await queryDb('SELECT image_id FROM blog_images WHERE blog_id = $1', [blogId]);
    for (const row of imagesRes.rows) {
      if (row.image_id) {
        try {
          await deleteFromCloudinary(row.image_id);
        } catch (err) {
          console.warn('Cloudinary delete warning:', err.message);
        }
      }
    }

    await queryDb('DELETE FROM blogs WHERE id = $1', [blogId]);

    return NextResponse.json({ success: true, message: 'Blog article deleted successfully' });
  } catch (error) {
    console.error('Developer blog DELETE error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
