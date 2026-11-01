import { NextRequest, NextResponse } from "next/server";
import { RSVP_ADMIN_COOKIE, verifyRsvpAdminSession } from "@/lib/rsvp-admin-auth";

export async function GET(request: NextRequest) {
  if (!verifyRsvpAdminSession(request.cookies.get(RSVP_ADMIN_COOKIE)?.value)) {
    return NextResponse.json(
      { error: "Chưa đăng nhập." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  const sheetUrl = process.env.RSVP_SHEET_URL;
  if (!sheetUrl) {
    return NextResponse.json(
      { error: "Chưa cấu hình liên kết Google Sheet." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.json(
    { sheetUrl },
    { headers: { "Cache-Control": "no-store, private" } },
  );
}
