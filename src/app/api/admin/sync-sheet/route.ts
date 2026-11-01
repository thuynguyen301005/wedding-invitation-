import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { RSVP_ADMIN_COOKIE, verifyRsvpAdminSession } from "@/lib/rsvp-admin-auth";
import { syncRsvpsToSheet, type RsvpForSheet } from "@/lib/rsvp-sheet";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  if (!verifyRsvpAdminSession(request.cookies.get(RSVP_ADMIN_COOKIE)?.value)) {
    return NextResponse.json(
      { error: "Chưa đăng nhập." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  const { data, error } = await getSupabase()
    .from("rsvps")
    .select("id,name,attendance_status,guest_count,message,confirmed_at,revision")
    .order("confirmed_at", { ascending: false })
    .limit(500);

  if (error) {
    console.error("admin_rsvp_sheet_backfill_fetch_failed", error.code);
    return NextResponse.json(
      { error: "Chưa thể tải danh sách RSVP để đồng bộ." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  const rsvps = (data || []) as RsvpForSheet[];
  const status = await syncRsvpsToSheet(rsvps);
  if (status !== "sent") {
    return NextResponse.json(
      {
        error:
          status === "pending"
            ? "Sheet chưa phản hồi kịp. Hệ thống sẽ thử lại sau."
            : "Chưa thể đồng bộ. Kiểm tra cấu hình Apps Script và thử lại.",
        synced: false,
      },
      { status: status === "pending" ? 503 : 502, headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.json(
    { synced: true, count: rsvps.length },
    { headers: { "Cache-Control": "no-store" } },
  );
}
