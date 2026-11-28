import { NextResponse } from 'next/server';
import { ensureLifecycleSynced } from 'src/lib/database/websiteLifecycle';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = await ensureLifecycleSynced(true);
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export const POST = GET;
