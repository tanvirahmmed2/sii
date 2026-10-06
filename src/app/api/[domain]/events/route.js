import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator';
import { isAdmin, isRegister } from 'src/lib/middleware/developer';
import { uploadImage } from 'src/lib/database/cloudinary';

function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
}

// GET all events
export async function GET(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json({ success: false, error: 'Tenant website not found' }, { status: 404 });
    }
    const websiteId = website.id;

    const result = await queryDb(
      'SELECT * FROM website_events WHERE website_id = $1 ORDER BY event_date ASC',
      [websiteId]
    ).catch(() =>
      queryDb('SELECT * FROM events WHERE website_id = $1 ORDER BY event_date ASC', [websiteId]).catch(() =>
        queryDb('SELECT * FROM events ORDER BY event_date ASC')
      )
    );

    const events = await Promise.all(
      result.rows.map(async (ev) => {
        const s = ev.slug || slugify(ev.title) || String(ev.id);
        if (!ev.slug) {
          await queryDb('UPDATE website_events SET slug = $1 WHERE id = $2 AND (slug IS NULL OR slug = \'\')', [s, ev.id]).catch(() => {});
        }
        return { ...ev, slug: s };
      })
    );

    const res_data_306 = { events };
    return NextResponse.json({
      success: true,
      message: res_data_306?.message || 'Successfully fetched events',
      paylod: res_data_306,
      payload: res_data_306
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching events:', error);
    const res_err_661 = { error: 'Failed to retrieve events. Internal server error.' };
    return NextResponse.json({
      success: false,
      message: res_err_661?.error || res_err_661?.message || 'An error occurred',
      error: res_err_661?.error || 'Internal Server Error',
      paylod: null
    }, { status: 500 });
  }
}

// POST create event (Admin or Registrar)
export async function POST(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json({ success: false, error: 'Tenant website not found' }, { status: 404 });
    }
    const websiteId = website.id;

    const authenticated = (await isAdmin()) || (await isRegister());
    if (!authenticated) {
      const res_err_1158 = { error: 'Unauthorized. Admins or Registrars only.' };
      return NextResponse.json({
        success: false,
        message: res_err_1158?.error || res_err_1158?.message || 'An error occurred',
        error: res_err_1158?.error || 'Internal Server Error',
        paylod: null
      }, { status: 403 });
    }

    const { title, description, event_date, location, image, image_id, slug: customSlug } = await request.json();

    if (!title || !description || !event_date || !location) {
      const res_err_1629 = { error: 'Required fields (title, description, event_date, location) must be provided.' };
      return NextResponse.json({
        success: false,
        message: res_err_1629?.error || res_err_1629?.message || 'An error occurred',
        error: res_err_1629?.error || 'Internal Server Error',
        paylod: null
      }, { status: 400 });
    }

    let finalSlug = slugify(customSlug || title);
    if (!finalSlug) finalSlug = `event-${Date.now()}`;
    const checkSlug = await queryDb(
      'SELECT id FROM website_events WHERE website_id = $1 AND slug = $2',
      [websiteId, finalSlug]
    ).catch(() => queryDb('SELECT id FROM events WHERE slug = $1', [finalSlug]));

    if (checkSlug.rows.length > 0) {
      finalSlug = `${finalSlug}-${Date.now()}`;
    }

    let imageUrl = null;
    let imageId = null;

    if (image && image.startsWith('data:image')) {
      try {
        const uploadResult = await uploadImage(image, 'events');
        imageUrl = uploadResult.url;
        imageId = uploadResult.publicId;
      } catch (uploadErr) {
        console.error('Cloudinary event image upload failed:', uploadErr);
        return NextResponse.json({
          success: false,
          message: 'Failed to upload event poster image.',
          error: 'Cloudinary Upload Failed',
          paylod: null
        }, { status: 500 });
      }
    } else if (image) {
      imageUrl = image;
      imageId = image_id || null;
    }

    let result;
    try {
      result = await queryDb(
        `INSERT INTO website_events (website_id, title, slug, description, event_date, location, image, image_id) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
         RETURNING *`,
        [websiteId, title.trim(), finalSlug, description.trim(), event_date, location.trim(), imageUrl, imageId]
      );
    } catch {
      result = await queryDb(
        `INSERT INTO events (title, slug, description, event_date, location, image, image_id) 
         VALUES ($1, $2, $3, $4, $5, $6, $7) 
         RETURNING *`,
        [title.trim(), finalSlug, description.trim(), event_date, location.trim(), imageUrl, imageId]
      );
    }

    const res_data_1580 = { message: 'Event created successfully.', event: result.rows[0] };
    return NextResponse.json({
      success: true,
      message: res_data_1580?.message || 'Successfully created event',
      paylod: res_data_1580,
      payload: res_data_1580
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating event:', error);
    const res_err_2674 = { error: 'Failed to create event. Internal server error.' };
    return NextResponse.json({
      success: false,
      message: res_err_2674?.error || res_err_2674?.message || 'An error occurred',
      error: res_err_2674?.error || 'Internal Server Error',
      paylod: null
    }, { status: 500 });
  }
}

