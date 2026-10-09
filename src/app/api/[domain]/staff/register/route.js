import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ success: false, error: 'Staff self-registration is disabled. Staff accounts are provisioned exclusively by administration.' }, { status: 404 });
}

export async function POST() {
  return NextResponse.json({ success: false, error: 'Staff self-registration is disabled. Staff accounts are provisioned exclusively by administration.' }, { status: 404 });
}

export async function PUT() {
  return NextResponse.json({ success: false, error: 'Staff self-registration is disabled.' }, { status: 404 });
}
