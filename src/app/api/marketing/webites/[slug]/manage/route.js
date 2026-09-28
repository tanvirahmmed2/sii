import { NextResponse } from 'next/server';
import { resolveWebsiteFromRequest } from '@/lib/middleware/user';
import { queryDb } from '@/lib/db/pg';

export async function POST(request, context) {
  try {
    const params = await context.params;
    const slug = params.slug;

    const website = await resolveWebsiteFromRequest(request, slug);
    if (!website) {
      return NextResponse.json({ success: false, error: 'Website not found' }, { status: 404 });
    }

    const websiteId = website.id;
    const body = await request.json();
    const { action } = body;

    // 1. Add Product
    if (action === 'add_product') {
      const name = (body.title || body.name || '').trim();
      const productSlug = (body.slug || name.toLowerCase().replace(/[^a-z0-9]/g, '-')).trim();
      const description = (body.description || '').trim();
      const priceInCents = Number(body.price || body.price_in_cents || 0);

      const res = await queryDb(`
        INSERT INTO website_products (website_id, name, slug, description, price_in_cents, status, is_featured, is_digital)
        VALUES ($1, $2, $3, $4, $5, 'ACTIVE', TRUE, TRUE)
        RETURNING *
      `, [websiteId, name, productSlug, description, priceInCents]);

      return NextResponse.json({ success: true, product: res.rows[0] });
    }

    // 2. Delete Product
    if (action === 'delete_product') {
      await queryDb('DELETE FROM website_products WHERE id = $1 AND website_id = $2', [body.id, websiteId]);
      return NextResponse.json({ success: true, id: body.id });
    }

    // 3. Add Blog
    if (action === 'add_blog') {
      const title = (body.title || '').trim();
      const blogSlug = (body.slug || title.toLowerCase().replace(/[^a-z0-9]/g, '-')).trim();
      const content = body.description || body.content || '';
      const excerpt = body.excerpt || content.slice(0, 150);

      const res = await queryDb(`
        INSERT INTO website_blogs (website_id, title, slug, content, excerpt, is_published)
        VALUES ($1, $2, $3, $4, $5, TRUE)
        RETURNING *
      `, [websiteId, title, blogSlug, content, excerpt]);

      return NextResponse.json({ success: true, blog: res.rows[0] });
    }

    // 4. Delete Blog
    if (action === 'delete_blog') {
      await queryDb('DELETE FROM website_blogs WHERE id = $1 AND website_id = $2', [body.id, websiteId]);
      return NextResponse.json({ success: true, id: body.id });
    }

    // 5. Add Experience
    if (action === 'add_experience') {
      const roleTitle = (body.title || '').trim();
      const organization = (body.organization || '').trim();
      const location = (body.location || '').trim();
      const description = (body.description || '').trim();

      const res = await queryDb(`
        INSERT INTO website_experiences (website_id, role_title, organization, location, description, is_current)
        VALUES ($1, $2, $3, $4, $5, TRUE)
        RETURNING *
      `, [websiteId, roleTitle, organization, location, description]);

      return NextResponse.json({ success: true, experience: res.rows[0] });
    }

    // 6. Delete Experience
    if (action === 'delete_experience') {
      await queryDb('DELETE FROM website_experiences WHERE id = $1 AND website_id = $2', [body.id, websiteId]);
      return NextResponse.json({ success: true, id: body.id });
    }

    // 7. Add Gallery Item
    if (action === 'add_gallery') {
      const title = (body.title || '').trim();
      const imageUrl = (body.imageUrl || body.image_url || '').trim();
      const caption = (body.description || body.caption || '').trim();
      const category = (body.category || 'Portfolio').trim();

      const res = await queryDb(`
        INSERT INTO website_gallery (website_id, title, image_url, caption, category)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [websiteId, title, imageUrl, caption, category]);

      return NextResponse.json({ success: true, galleryItem: res.rows[0] });
    }

    // 8. Delete Gallery Item
    if (action === 'delete_gallery') {
      await queryDb('DELETE FROM website_gallery WHERE id = $1 AND website_id = $2', [body.id, websiteId]);
      return NextResponse.json({ success: true, id: body.id });
    }

    // 9. Update Appointment Status
    if (action === 'update_appointment_status') {
      const { id, status } = body;
      const res = await queryDb(`
        UPDATE website_appointments
        SET status = $1
        WHERE id = $2 AND website_id = $3
        RETURNING *
      `, [status, id, websiteId]);

      return NextResponse.json({ success: true, appointment: res.rows[0] });
    }

    // 10. Update Contact Status / Reply
    if (action === 'reply_contact') {
      const { id, reply } = body;
      const res = await queryDb(`
        UPDATE website_contact
        SET status = 'REPLIED', reply = $1, replied_at = CURRENT_TIMESTAMP
        WHERE id = $2 AND website_id = $3
        RETURNING *
      `, [reply, id, websiteId]);

      return NextResponse.json({ success: true, contact: res.rows[0] });
    }

    // 11. Toggle Module
    if (action === 'toggle_module') {
      const { moduleId, isEnabled } = body;
      await queryDb(`
        UPDATE website_modules
        SET is_enabled = $1
        WHERE id = $2 AND website_id = $3
      `, [Boolean(isEnabled), moduleId, websiteId]);

      return NextResponse.json({ success: true, moduleId, isEnabled });
    }

    return NextResponse.json({ success: false, error: `Invalid action: ${action}` }, { status: 400 });
  } catch (error) {
    console.error('Website manage API error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
