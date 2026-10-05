import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Assignments module disabled',
    paylod: { assignments: [] }
  });
}

export async function POST() {
  return NextResponse.json({
    success: false,
    error: 'Assignments module has been removed.'
  }, { status: 410 });
}
