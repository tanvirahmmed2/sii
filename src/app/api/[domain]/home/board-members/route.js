import { GET as handleGet } from '../../board-members/route.js';

export async function GET(request, context) {
  return handleGet(request, context);
}
