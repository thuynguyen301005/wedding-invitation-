import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { databaseUnavailable, enforceRateLimit, isAllowedOrigin, jsonError, readJson } from "@/lib/api";
import { getSupabase } from "@/lib/supabase";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!isAllowedOrigin(request)) return jsonError("YÃªu cáº§u khÃ´ng há»£p lá»‡.", 403);
  const unavailable = databaseUnavailable();
  if (unavailable) return unavailable;
  const body = await readJson(request);
  if (!body) return jsonError("Dá»¯ liá»‡u gá»­i lÃªn khÃ´ng há»£p lá»‡.", 400);
  if (body.website) return NextResponse.json({ ok: true });

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const attendance = body.attendanceStatus;
  const guestCount = body.guestCount;
  const message = typeof body.message === "string" ? body.message.trim() : "";
  const guestToken = body.guestToken;
  const idempotencyKey = body.idempotencyKey;
  const fields: Record<string, string> = {};
  if (!name || name.length > 100 || /[\r\n]/.test(name)) fields.name = "Vui lÃ²ng nháº­p há» tÃªn (tá»‘i Ä‘a 100 kÃ½ tá»±).";
  if (attendance !== "yes" && attendance !== "no") fields.attendanceStatus = "Vui lÃ²ng chá»n tráº¡ng thÃ¡i tham dá»±.";
  if (
    attendance === "yes" &&
    (!Number.isInteger(guestCount) || Number(guestCount) < 1 || Number(guestCount) > 10)
  ) fields.guestCount = "Sá»‘ ngÆ°á»i tham dá»± tá»« 1 Ä‘áº¿n 10.";
  if (message.length > 500) fields.message = "Lá»i nháº¯n tá»‘i Ä‘a 500 kÃ½ tá»±.";
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (typeof guestToken !== "string" || !uuidPattern.test(guestToken)) {
    fields.guestToken = "KhÃ´ng thá»ƒ xÃ¡c minh thiáº¿t bá»‹. Vui lÃ²ng táº£i láº¡i trang.";
  }
  if (typeof idempotencyKey !== "string" || !uuidPattern.test(idempotencyKey)) {
    fields.idempotencyKey = "YÃªu cáº§u khÃ´ng há»£p lá»‡. Vui lÃ²ng gá»­i láº¡i.";
  }
  if (Object.keys(fields).length) return jsonError("Vui lÃ²ng kiá»ƒm tra láº¡i thÃ´ng tin.", 400, fields);
  if (typeof guestToken !== "string" || typeof idempotencyKey !== "string") {
    return jsonError("YÃªu cáº§u khÃ´ng há»£p lá»‡.", 400);
  }

  const deadline = process.env.RSVP_DEADLINE;
  if (deadline && Date.now() > new Date(deadline).getTime()) {
    return jsonError("Thá»i gian xÃ¡c nháº­n Ä‘Ã£ káº¿t thÃºc. Vui lÃ²ng liÃªn há»‡ trá»±c tiáº¿p vá»›i cÃ´ dÃ¢u chÃº rá»ƒ.", 410);
  }
  const rateLimit = await enforceRateLimit(request, "rsvp", guestToken);
  if (rateLimit) return rateLimit;

  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("save_rsvp", {
    p_name: name,
    p_attendance_status: attendance,
    p_guest_count: attendance === "yes" ? guestCount : 0,
    p_message: message || null,
    p_guest_token: guestToken,
    p_idempotency_key: idempotencyKey,
    p_notify_on_decline: process.env.NOTIFY_ON_DECLINE === "true",
  });
  if (error) {
    console.error("rsvp_save_failed", error.code, error.message, error.details, error.hint);
    return jsonError("ChÆ°a thá»ƒ lÆ°u xÃ¡c nháº­n. Vui lÃ²ng thá»­ láº¡i; ná»™i dung cá»§a báº¡n váº«n Ä‘Æ°á»£c giá»¯.", 503);
  }

  const saved = data as {
    id: string;
    name: string;
    attendance_status: "yes" | "no";
    guest_count: number;
    message: string | null;
    confirmed_at: string;
    revision: number;
    updated: boolean;
    idempotent: boolean;
  };

  return NextResponse.json({
    saved: true,
    updated: saved.updated,
    message:
      saved.attendance_status === "no"
        ? "ÄÃ£ ghi nháº­n. Cáº£m Æ¡n báº¡n Ä‘Ã£ bÃ¡o; ráº¥t tiáº¿c báº¡n khÃ´ng thá»ƒ Ä‘áº¿n."
        : saved.updated
          ? "ÄÃ£ cáº­p nháº­t xÃ¡c nháº­n cá»§a báº¡n."
          : "ÄÃ£ ghi nháº­n xÃ¡c nháº­n cá»§a báº¡n.",
  });
}