import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { RSVP_ADMIN_COOKIE, verifyRsvpAdminSession } from "@/lib/rsvp-admin-auth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  if (!verifyRsvpAdminSession(request.cookies.get(RSVP_ADMIN_COOKIE)?.value)) {
    return NextResponse.json(
      { error: "Chưa đăng nhập." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  const { data, error } = await getSupabase()
    .from("rsvps")
    .select("id,name,attendance_status,guest_count,message,confirmed_at,created_at,notification_status")
    .order("confirmed_at", { ascending: false })
    .limit(500);

  if (error) {
    console.error("admin_rsvps_fetch_failed", error.code);
    return NextResponse.json(
      { error: "Chưa thể tải danh sách xác nhận." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.json(
    { rsvps: data || [] },
    { headers: { "Cache-Control": "no-store, private" } },
  );
}
