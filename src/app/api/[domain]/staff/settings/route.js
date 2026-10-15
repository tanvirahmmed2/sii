import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator';
import { getStaffSession } from 'src/lib/middleware/staff';
import { uploadImage, deleteImage } from 'src/lib/database/cloudinary';

// GET: Fetch all website configuration and metadata for staff workstation
export async function GET(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json(
        { success: false, error: 'Educational institution portal not found.' },
        { status: 404 }
      );
    }

    const staffSession = await getStaffSession(request);

    if (!staffSession) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Staff authentication required to view website settings.' },
        { status: 401 }
      );
    }

    const mergedSettings = {
      id: website.id,
      name: website.name || '',
      institution_type: website.institution_type || 'School',
      eiin_number: website.eiin_number || '',
      currency: website.currency || 'BDT',
      logo: website.logo || '',
      logo_id: website.logo_id || '',
      favicon: website.favicon || '',
      favicon_id: website.favicon_id || '',
      theme: website.theme || 'default',
      primary_color: website.primary_color || '#1e40af',
      secondary_color: website.secondary_color || '#0ea5e9',
      is_maintenance_mode: Boolean(website.is_maintenance_mode),
      maintenance_message: website.maintenance_message || 'Our campus portal is temporarily under scheduled maintenance. Please check back shortly.',
      status: website.status || 'active',
      subdomain: website.subdomain || '',
      custom_domain: website.custom_domain || '',
      contact_phone: website.contact_phone || '',
      contact_email: website.contact_email || '',
      address: website.address || '',
      map_url: '',
      motto: `Excellence in ${website.institution_type || 'Education'}`,
      mission: '',
      vision: '',
      history: '',
      facebook_url: website.facebook_url || '',
      twitter_url: website.twitter_url || '',
      instagram_url: website.instagram_url || '',
      youtube_url: website.youtube_url || '',
      linkedin_url: website.linkedin_url || '',
      updated_at: website.updated_at,
    };

    return NextResponse.json({
      success: true,
      settings: mergedSettings,
      payload: { settings: mergedSettings },
      paylod: { settings: mergedSettings },
    });
  } catch (error) {
    console.error('Error fetching website settings in staff API:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error fetching website settings.' },
      { status: 500 }
    );
  }
}

// PUT: Update all website information and institutional settings
export async function PUT(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json(
        { success: false, error: 'Educational institution portal not found.' },
        { status: 404 }
      );
    }

    const staffSession = await getStaffSession(request);

    if (!staffSession) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Staff authentication required to update website settings.' },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const data = body.data || body;

    // Handle Cloudinary upload / removal for Logo
    let finalLogo = data.logo !== undefined ? (data.logo ? String(data.logo).trim() : null) : undefined;
    let finalLogoId = data.logo_id !== undefined ? (data.logo_id ? String(data.logo_id).trim() : null) : undefined;

    if (data.remove_logo || (data.logo === '' && website.logo_id)) {
      if (website.logo_id) {
        try {
          await deleteImage(website.logo_id);
        } catch (e) {
          console.warn('Could not delete old logo from Cloudinary:', e.message);
        }
      }
      finalLogo = null;
      finalLogoId = null;
    } else if (data.logo && typeof data.logo === 'string' && data.logo.startsWith('data:image/')) {
      try {
        if (website.logo_id) {
          try {
            await deleteImage(website.logo_id);
          } catch (e) {
            console.warn('Could not delete old logo before replacement:', e.message);
          }
        }
        const uploadRes = await uploadImage(data.logo, `school/${website.id}/branding`);
        finalLogo = uploadRes.url;
        finalLogoId = uploadRes.publicId;
      } catch (uploadErr) {
        console.error('Failed to upload logo to Cloudinary:', uploadErr);
        return NextResponse.json({ success: false, error: `Failed to upload logo to Cloudinary: ${uploadErr.message}` }, { status: 500 });
      }
    }

    // Handle Cloudinary upload / removal for Favicon
    let finalFavicon = data.favicon !== undefined ? (data.favicon ? String(data.favicon).trim() : null) : undefined;
    let finalFaviconId = data.favicon_id !== undefined ? (data.favicon_id ? String(data.favicon_id).trim() : null) : undefined;

    if (data.remove_favicon || (data.favicon === '' && website.favicon_id)) {
      if (website.favicon_id) {
        try {
          await deleteImage(website.favicon_id);
        } catch (e) {
          console.warn('Could not delete old favicon from Cloudinary:', e.message);
        }
      }
      finalFavicon = null;
      finalFaviconId = null;
    } else if (data.favicon && typeof data.favicon === 'string' && (data.favicon.startsWith('data:image/') || data.favicon.startsWith('data:application/'))) {
      try {
        if (website.favicon_id) {
          try {
            await deleteImage(website.favicon_id);
          } catch (e) {
            console.warn('Could not delete old favicon before replacement:', e.message);
          }
        }
        const uploadRes = await uploadImage(data.favicon, `school/${website.id}/branding`);
        finalFavicon = uploadRes.url;
        finalFaviconId = uploadRes.publicId;
      } catch (uploadErr) {
        console.error('Failed to upload favicon to Cloudinary:', uploadErr);
        return NextResponse.json({ success: false, error: `Failed to upload favicon to Cloudinary: ${uploadErr.message}` }, { status: 500 });
      }
    }

    // Update websites table
    const webRes = await queryDb(
      `UPDATE websites
       SET name = COALESCE($1, name),
           institution_type = COALESCE($2, institution_type),
           eiin_number = COALESCE($3, eiin_number),
           currency = COALESCE($4, currency),
           logo = CASE WHEN $5::boolean THEN $6 ELSE logo END,
           logo_id = CASE WHEN $5::boolean THEN $7 ELSE logo_id END,
           favicon = CASE WHEN $8::boolean THEN $9 ELSE favicon END,
           favicon_id = CASE WHEN $8::boolean THEN $10 ELSE favicon_id END,
           theme = COALESCE($11, theme),
           primary_color = COALESCE($12, primary_color),
           secondary_color = COALESCE($13, secondary_color),
           contact_email = COALESCE($14, contact_email),
           contact_phone = COALESCE($15, contact_phone),
           address = COALESCE($16, address),
           is_maintenance_mode = COALESCE($17, is_maintenance_mode),
           maintenance_message = COALESCE($18, maintenance_message),
           facebook_url = COALESCE($19, facebook_url),
           twitter_url = COALESCE($20, twitter_url),
           instagram_url = COALESCE($21, instagram_url),
           youtube_url = COALESCE($22, youtube_url),
           linkedin_url = COALESCE($23, linkedin_url),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $24
       RETURNING *`,
      [
        data.name !== undefined ? String(data.name).trim() : null,
        data.institution_type !== undefined ? String(data.institution_type).trim() : null,
        data.eiin_number !== undefined ? String(data.eiin_number).trim() : null,
        data.currency !== undefined ? String(data.currency).trim().toUpperCase() : null,
        finalLogo !== undefined,
        finalLogo || null,
        finalLogoId || null,
        finalFavicon !== undefined,
        finalFavicon || null,
        finalFaviconId || null,
        data.theme !== undefined ? String(data.theme).trim() : null,
        data.primary_color !== undefined ? String(data.primary_color).trim() : null,
        data.secondary_color !== undefined ? String(data.secondary_color).trim() : null,
        data.contact_email !== undefined ? String(data.contact_email).trim() : null,
        data.contact_phone !== undefined ? String(data.contact_phone).trim() : null,
        data.address !== undefined ? String(data.address).trim() : null,
        data.is_maintenance_mode !== undefined ? Boolean(data.is_maintenance_mode) : null,
        data.maintenance_message !== undefined ? String(data.maintenance_message).trim() : null,
        data.facebook_url !== undefined ? String(data.facebook_url).trim() : null,
        data.twitter_url !== undefined ? String(data.twitter_url).trim() : null,
        data.instagram_url !== undefined ? String(data.instagram_url).trim() : null,
        data.youtube_url !== undefined ? String(data.youtube_url).trim() : null,
        data.linkedin_url !== undefined ? String(data.linkedin_url).trim() : null,
        website.id,
      ]
    );

    const updatedWebsite = webRes.rows[0];

    const merged = {
      ...updatedWebsite,
      school_name: updatedWebsite.name,
      logo_url: updatedWebsite.logo,
      meta_title: `${updatedWebsite.name} - Academic Excellence & Growth`,
      meta_description: `Official portal for ${updatedWebsite.name}.`,
    };

    return NextResponse.json({
      success: true,
      message: 'Website all information updated successfully.',
      settings: merged,
      payload: { settings: merged },
      paylod: { settings: merged },
    });
  } catch (error) {
    console.error('Error updating website settings via staff route:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error updating website settings.' },
      { status: 500 }
    );
  }
}
