import { NextRequest, NextResponse } from "next/server";
import { databaseUnavailable } from "@/lib/api";
import { sendRsvpNotification, type RsvpForEmail } from "@/lib/email";
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
    console.error("email_retry_claim_failed", error.code);
    return NextResponse.json({ error: "Retry job unavailable" }, { status: 503 });
  }
  const notifications = (data || []) as RsvpForEmail[];
  await Promise.all(notifications.map((rsvp) => sendRsvpNotification(rsvp)));
  return NextResponse.json({ processed: notifications.length });
}
