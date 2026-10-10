import { NextResponse } from 'next/server';
import { getOfficerSession } from 'src/lib/middleware/officer.js';

export async function GET(request) {
  try {
    const session = await getOfficerSession(request);

    if (!session || !session.officer) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Active officer session not found.' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      officer: session.officer,
      permissions: session.permissions,
      allowedModules: session.allowedModules,
      payload: {
        officer: session.officer,
        permissions: session.permissions,
        allowedModules: session.allowedModules,
      },
      paylod: {
        officer: session.officer,
        permissions: session.permissions,
        allowedModules: session.allowedModules,
      },
    });
  } catch (error) {
    console.error('Error in officer /me route:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error retrieving profile.' },
      { status: 500 }
    );
  }
}
