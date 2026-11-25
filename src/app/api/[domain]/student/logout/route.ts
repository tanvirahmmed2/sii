import { NextResponse } from 'next/server';
import { clearStudentSessionCookie, revokeStudentLoginSession, getStudentCookieName } from 'src/lib/middleware/students';
export async function POST(request: any) {
    try {
        const cookieName = getStudentCookieName(request);
        const token = request.cookies?.get?.(cookieName)?.value;
        if (token) {
            await revokeStudentLoginSession(token);
        }
        const response = NextResponse.json({
            success: true,
            message: 'Logged out successfully.',
        });
        await clearStudentSessionCookie(response, request);
        return response;
    }
    catch (error: any) {
        console.error('Error logging out student:', error);
        return NextResponse.json({ success: false, error: 'Internal server error.' }, { status: 500 });
    }
}
