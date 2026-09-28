import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { SCHOOL_NAME, LOGO_URL, META_TITLE, META_DESCRIPTION } from '@/lib/secret';

// GET Public Website Settings
export async function GET() {
  try {
    const res = await query('SELECT * FROM website_settings ORDER BY id ASC LIMIT 1');

    if (res.rows.length === 0) {
      return NextResponse.json({
        success: true,
        paylod: {
          settings: {
            school_name: SCHOOL_NAME,
            logo_url: LOGO_URL,
            meta_title: META_TITLE,
            meta_description: META_DESCRIPTION,
            contact_phone: '',
            contact_email: '',
            address: '',
            map_url: '',
            motto: '',
            mission: '',
            vission: '',
            history: '',
            facebook_url: '',
            twitter_url: '',
            instagram_url: '',
            youtube_url: ''
          }
        }
      });
    }

    const s = res.rows[0];
    return NextResponse.json({
      success: true,
      paylod: {
        settings: {
          ...s,
          school_name: SCHOOL_NAME,
          logo_url: LOGO_URL,
          meta_title: META_TITLE,
          meta_description: META_DESCRIPTION
        }
      }
    });
  } catch (error) {
    console.error('Error fetching website settings:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
