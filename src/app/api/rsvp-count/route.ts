import { NextResponse } from "next/server";
import { wedding } from "@/config/wedding";
import { databaseUnavailable } from "@/lib/api";
import { getSupabase } from "@/lib/supabase";

export async function GET() {
  const unavailable = databaseUnavailable();
  if (unavailable) return unavailable;
  if (!wedding.showRsvpCount && process.env.SHOW_RSVP_COUNT !== "true") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const { data, error } = await getSupabase().rpc("public_rsvp_count");
  if (error) {
    console.error("rsvp_count_failed", error.code);
    return NextResponse.json({ error: "Unavailable" }, { status: 503 });
  }
  return NextResponse.json({ count: data });
}
