import { NextRequest, NextResponse } from "next/server";
import { databaseUnavailable } from "@/lib/api";
import { syncRsvpToSheet, type RsvpForSheet } from "@/lib/rsvp-sheet";
import { getSupabase } from "@/lib/supabase";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const unavailable = databaseUnavailable();
  if (unavailable) return unavailable;
  const { data, error } = await getSupabase().rpc("claim_due_rsvp_notifications", {
    p_limit: 20,
  });
  if (error) {
    console.error("rsvp_sheet_retry_claim_failed", error.code);
    return NextResponse.json({ error: "Sheet sync retry job unavailable" }, { status: 503 });
  }
  const notifications = (data || []) as RsvpForSheet[];
  const results = await Promise.all(notifications.map((rsvp) => syncRsvpToSheet(rsvp)));
  const { data: cleanedRows, error: cleanupError } = await getSupabase().rpc("cleanup_expired_request_data", {
    p_limit: 5000,
  });
  if (cleanupError) {
    console.error("expired_request_data_cleanup_failed", cleanupError.code);
  }
  return NextResponse.json({
    processed: notifications.length,
    synced: results.filter((status) => status === "sent").length,
    cleanedRows: cleanupError ? null : cleanedRows,
  }, { status: cleanupError ? 503 : 200 });
}
