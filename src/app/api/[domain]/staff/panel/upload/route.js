import { NextResponse } from 'next/server';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator';
import { getStaffSession } from 'src/lib/middleware/staff';
import { isAdmin } from 'src/lib/middleware/developer';
import { uploadImage } from 'src/lib/database/cloudinary.js';

export async function POST(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json({ success: false, error: 'Educational institution portal not found.' }, { status: 404 });
    }

    const devAdmin = await isAdmin();
    const staffSession = await getStaffSession(request);

    if (!staffSession && !devAdmin) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Staff access required.' }, { status: 401 });
    }

    const staffWebsiteId = staffSession?.website_id || staffSession?.websiteId || staffSession?.staff?.websiteId || staffSession?.staff?.website_id;
    if (!devAdmin && staffSession && staffWebsiteId && String(staffWebsiteId) !== String(website.id)) {
      return NextResponse.json({ success: false, error: 'Forbidden: Cross-tenant access denied.' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') || formData.get('image');
    const folderName = formData.get('folder') || 'website_media';

    if (!file) {
      return NextResponse.json({ success: false, error: 'No image file provided in form data.' }, { status: 400 });
    }

    const targetFolder = `website_${website.id}/${folderName}`;
    const uploadRes = await uploadImage(file, targetFolder);

    return NextResponse.json({
      success: true,
      url: uploadRes.secure_url,
      image_url: uploadRes.secure_url,
      image_id: uploadRes.publicId,
      publicId: uploadRes.publicId,
      message: 'Image uploaded to Cloudinary successfully.'
    });
  } catch (error) {
    console.error('Error in /upload route:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to upload image to Cloudinary.'
    }, { status: 500 });
  }
}
