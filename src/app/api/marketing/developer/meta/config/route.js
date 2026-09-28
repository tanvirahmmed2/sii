import { NextResponse } from 'next/server';
import { hasModulePermission } from '@/lib/middleware/developer';
import { getMetaConfigStatus } from '@/lib/meta/graph';

const META_PERMISSIONS = ['facebook-messages', 'instagram-messages', 'whatsapp-messages', 'chats', 'settings'];

/**
 * GET /api/developer/meta/config
 * Returns Meta channel configuration status
 */
export async function GET(request) {
  try {
    const auth = await hasModulePermission(request, META_PERMISSIONS);
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status });
    }

    const config = getMetaConfigStatus();
    return NextResponse.json({ success: true, config });
  } catch (error) {
    console.error('Failed to get Meta config status:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
  }
}
