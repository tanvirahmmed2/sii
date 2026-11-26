import { handleAudienceEmailGet, handleAudienceEmailPost } from 'src/lib/emails/emailRouteHandler';

export async function GET(request: any, context: any) {
  const params = await context?.params;
  return handleAudienceEmailGet(request, params?.audience);
}

export async function POST(request: any, context: any) {
  const params = await context?.params;
  return handleAudienceEmailPost(request, params?.audience);
}
