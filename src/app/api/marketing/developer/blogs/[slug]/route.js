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
    .replace(/\-\-+/g, '-');
}

export async function GET(request, { params }) {
  try {
    const auth = await hasModulePermission(request, 'blogs');
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status || 401 });
    }

    const { slug } = await params;
    const cleanSlug = decodeURIComponent(slug || '').trim();

    const query = `
      SELECT 
        b.id,
        NULL::bigint AS app_id,
        b.title,
        b.slug,
        b.excerpt AS summary,
        b.excerpt,
        b.content,
        b.developer_id AS author_id,
        b.developer_id,
        b.image,
        b.image_id,
        b.category,
        b.tags,
        b.meta_title,
        b.meta_description,
        b.views_count,
        b.is_published,
        b.published_at,
        b.created_at,
        b.updated_at,
        d.name AS author_name,
        d.email AS author_email,
        COALESCE(dr.slug, 'developer') AS author_role,
        NULL::text AS app_title,
        NULL::text AS app_slug,
        (CASE 
           WHEN b.image IS NOT NULL THEN json_build_array(json_build_object('id', 1, 'image_url', b.image, 'image', b.image, 'image_id', b.image_id, 'title', b.title, 'alt_text', b.title))
           ELSE '[]'::json 
         END) AS images
      FROM blogs b
      LEFT JOIN developers d ON b.developer_id = d.id
      LEFT JOIN developer_roles dr ON d.role_id = dr.id
      WHERE b.slug = $1 OR b.id::text = $1
      LIMIT 1
    `;

    const res = await queryDb(query, [cleanSlug]).catch(() => ({ rows: [] }));
    if (res.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Blog not found' }, { status: 404 });
    }

    const record = res.rows[0];
    return NextResponse.json({ success: true, record, blog: record, ...record });
  } catch (error) {
    console.error('Developer blog GET error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const auth = await hasModulePermission(request, 'blogs');
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status || 401 });
    }

    const { slug } = await params;
    const cleanSlug = decodeURIComponent(slug || '').trim();

    // Verify existing record
    const existingRes = await queryDb(
      `SELECT * FROM blogs WHERE slug = $1 OR id::text = $1 LIMIT 1`,
      [cleanSlug]
    );
    if (existingRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Blog not found' }, { status: 404 });
    }

    const currentBlog = existingRes.rows[0];
    const blogId = currentBlog.id;

    let title = null;
    let summary = null;
    let content = null;
    let is_published = null;
    let imageFiles = [];
    let attachPublicId = null;
    let attachAssetId = null;
    let attachTitle = null;
    let attachSecureUrl = null;

    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('multipart/form-data') || contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData();
      if (formData.has('title')) title = (formData.get('title') || '').trim();
      if (formData.has('summary')) summary = formData.get('summary');
      if (formData.has('content')) content = formData.get('content');
      if (formData.has('is_published') || formData.has('is_active')) {
        const pubVal = formData.get('is_published') ?? formData.get('is_active');
        is_published = pubVal === 'true' || pubVal === true;
      }

      attachPublicId = formData.get('public_id');
      attachAssetId = formData.get('asset_id');
      attachTitle = formData.get('image_title') || formData.get('alt_text');
      attachSecureUrl = formData.get('secure_url');

      for (const [key, val] of formData.entries()) {
        if (val && typeof val === 'object' && typeof val.arrayBuffer === 'function' && val.size > 0) {
          imageFiles.push(val);
        }
      }
    } else {
      const body = await request.json().catch(() => ({}));
      const data = body.data || body;
      if (data.title !== undefined) title = data.title.trim();
      if (data.summary !== undefined) summary = data.summary;
      if (data.content !== undefined) content = data.content;
      if (data.is_published !== undefined || data.is_active !== undefined) {
        const val = data.is_published ?? data.is_active;
        is_published = Boolean(val);
      }
      attachPublicId = data.public_id || body.public_id;
      attachAssetId = data.asset_id || body.asset_id;
      attachTitle = data.image_title || data.alt_text || body.image_title;
      attachSecureUrl = data.secure_url || body.secure_url;
    }

    const newTitle = title !== null ? title : currentBlog.title;
    let newSlug = currentBlog.slug;
    if (title !== null && title !== currentBlog.title && title.trim()) {
      const baseSlug = slugify(newTitle) || 'article';
      newSlug = baseSlug;
      const slugCheck = await queryDb(
        'SELECT id FROM blogs WHERE slug = $1 AND id != $2 LIMIT 1',
        [newSlug, blogId]
      );
      if (slugCheck.rows.length > 0) {
        newSlug = `${baseSlug}-${Math.floor(1000 + Math.random() * 9000)}`;
      }
    }

    const newSummary = summary !== null ? (summary ? summary.trim() : null) : (currentBlog.excerpt || currentBlog.summary);
    const newContent = content !== null ? content.trim() : currentBlog.content;
    const newPublished = is_published !== null ? is_published : currentBlog.is_published;

    let updatedImageUrl = currentBlog.image || null;
    let updatedImageId = currentBlog.image_id || null;

    for (const file of imageFiles) {
      try {
        const uploadResult = await uploadToCloudinary(file, 'portfoliobuilder/blogs');
        if (uploadResult) {
          updatedImageUrl = uploadResult.url || uploadResult.id;
          updatedImageId = uploadResult.id;
          break;
        }
      } catch (err) {
        console.warn('Cloudinary upload warning:', err.message);
      }
    }

    if (attachSecureUrl || attachPublicId) {
      updatedImageUrl = attachSecureUrl || `https://res.cloudinary.com/${cloudinary.config().cloud_name}/image/upload/${attachPublicId}`;
      updatedImageId = attachAssetId || attachPublicId;
    }

    await queryDb('BEGIN');

    await queryDb(
      `UPDATE blogs 
       SET title = $1, slug = $2, excerpt = $3, content = $4,
           is_published = $5, image = $6, image_id = $7, updated_at = CURRENT_TIMESTAMP
       WHERE id = $8`,
      [newTitle, newSlug, newSummary, newContent, newPublished, updatedImageUrl, updatedImageId, blogId]
    );

    await queryDb('COMMIT');

    const updatedRes = await queryDb(
      `SELECT 
        b.id,
        NULL::bigint AS app_id,
        b.title,
        b.slug,
        b.excerpt AS summary,
        b.excerpt,
        b.content,
        b.developer_id AS author_id,
        b.developer_id,
        b.image,
        b.image_id,
        b.category,
        b.tags,
        b.meta_title,
        b.meta_description,
        b.views_count,
        b.is_published,
        b.published_at,
        b.created_at,
        b.updated_at,
        d.name AS author_name,
        d.email AS author_email,
        COALESCE(dr.slug, 'developer') AS author_role,
        NULL::text AS app_title,
        NULL::text AS app_slug,
        (CASE 
           WHEN b.image IS NOT NULL THEN json_build_array(json_build_object('id', 1, 'image_url', b.image, 'image', b.image, 'image_id', b.image_id, 'title', b.title, 'alt_text', b.title))
           ELSE '[]'::json 
         END) AS images
      FROM blogs b
      LEFT JOIN developers d ON b.developer_id = d.id
      LEFT JOIN developer_roles dr ON d.role_id = dr.id
      WHERE b.id = $1`,
      [blogId]
    ).catch(() => ({ rows: [] }));

    const record = updatedRes.rows[0];

    return NextResponse.json({
      success: true,
      record,
      blog: record,
      images: record?.images || [],
      ...record,
      message: 'Blog updated successfully',
    });
  } catch (error) {
    await queryDb('ROLLBACK').catch(() => {});
    console.error('Developer blog PUT error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const auth = await hasModulePermission(request, 'blogs');
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status || 401 });
    }

    const { slug } = await params;
    const cleanSlug = decodeURIComponent(slug || '').trim();

    const existingRes = await queryDb(
      `SELECT id, title, image, image_id FROM blogs WHERE slug = $1 OR id::text = $1 LIMIT 1`,
      [cleanSlug]
    );

    if (existingRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Blog not found' }, { status: 404 });
    }

    const blog = existingRes.rows[0];

    if (blog.image_id) {
      try {
        await deleteFromCloudinary(blog.image_id);
      } catch (_) {}
    }

    await queryDb('DELETE FROM blogs WHERE id = $1', [blog.id]);

    return NextResponse.json({
      success: true,
      message: `Blog "${blog.title}" deleted successfully`,
    });
  } catch (error) {
    console.error('Developer blog DELETE error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
