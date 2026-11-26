import { handleAudienceEmailGet, handleAudienceEmailPost } from 'src/lib/emails/emailRouteHandler';

export async function GET(request: any) {
  const { searchParams } = new URL(request.url);
  return handleAudienceEmailGet(request, searchParams.get('audience'));
}

export async function POST(request: any) {
  const { searchParams } = new URL(request.url);
  const queryAudience = searchParams.get('audience');
  if (queryAudience) {
    return handleAudienceEmailPost(request, queryAudience);
  }
  const cloned = request.clone();
  const body = await cloned.json().catch(() => ({}));
  return handleAudienceEmailPost(request, body?.audience);
}
