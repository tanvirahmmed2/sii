import { NextResponse } from 'next/server';
import { clearTeacherSessionCookie } from 'src/lib/middleware/teacher';
export async function POST(request: any) {
    try {
        const response = NextResponse.json({
            success: true,
            message: 'Logged out successfully.',
        });
        await clearTeacherSessionCookie(response, request);
        return response;
    }
    catch (error: any) {
        console.error('Error during teacher logout:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error during logout.' }, { status: 500 });
    }
}
