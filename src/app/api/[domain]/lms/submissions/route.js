import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Submissions module disabled',
    paylod: { submissions: [] }
  });
}

export async function POST() {
  return NextResponse.json({
    success: false,
    error: 'Submissions module has been removed.'
  }, { status: 410 });
}
