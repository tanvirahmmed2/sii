import { GET as handleGet } from "../../board-members/route";
export async function GET(request: any, context: any) {
    return handleGet(request, context);
}
