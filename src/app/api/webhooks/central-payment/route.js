import { NextResponse } from "next/server";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const paymentId = searchParams.get("paymentId") || searchParams.get("internalTxId");
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");

  if (paymentId) {
    return NextResponse.redirect(`${appUrl}/creator/payments?status=legacy_gateway_deprecated`);
  }
  return NextResponse.json({
    success: false,
    message: "Central legacy payment gateways (shurjoPay, PayPal, Paddle) have been deprecated. The platform uses EPS gateway.",
  }, { status: 410 });
}

export async function POST(request) {
  return NextResponse.json({
    success: false,
    message: "Central legacy payment gateways (shurjoPay, PayPal, Paddle) have been deprecated. The platform uses EPS gateway.",
  }, { status: 410 });
}
