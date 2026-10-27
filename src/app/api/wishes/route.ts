import { NextRequest, NextResponse } from "next/server";
import { wedding } from "@/config/wedding";
import { databaseUnavailable, enforceRateLimit, getClientKey, isAllowedOrigin, jsonError, readJson } from "@/lib/api";
import { getSupabase } from "@/lib/supabase";

export const runtime = "nodejs";

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("vi")
    .replace(/đ/g, "d")
    .replace(/(.)\1+/g, "$1")
    .replace(/[^a-z0-9]/g, "");
}

function containsBlockedKeyword(content: string): boolean {
  const normalizedContent = normalize(content);
  const configured = [
    ...wedding.blockedKeywords,
    ...(process.env.BLOCKED_KEYWORDS || "").split(","),
  ].map(normalize).filter(Boolean);
  return configured.some((keyword) => normalizedContent.includes(keyword));
}

export async function GET(request: NextRequest) {
  const unavailable = databaseUnavailable();
  if (unavailable) return unavailable;
  const cursor = request.nextUrl.searchParams.get("cursor");
  const supabase = getSupabase();
  let query = supabase
    .from("wishes")
    .select("id,sender_name,content,created_at")
    .eq("display_status", "visible")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(21);
  if (cursor) {
    const { data: cursorRow, error: cursorError } = await supabase
      .from("wishes")
      .select("created_at,id")
      .eq("id", cursor)
      .eq("display_status", "visible")
      .maybeSingle();
    if (cursorError || !cursorRow) return jsonError("Không thể tải lời chúc.", 400);
    query = query.or(
      `created_at.lt.${cursorRow.created_at},and(created_at.eq.${cursorRow.created_at},id.lt.${cursorRow.id})`,
    );
  }
  const { data, error } = await query;
  if (error) {
    console.error("wishes_fetch_failed", error.code);
    return jsonError("Chưa thể tải lời chúc. Vui lòng thử lại sau.", 503);
  }
  const hasMore = data.length > 20;
  const items = data.slice(0, 20);
  return NextResponse.json({
    wishes: items.map((wish) => ({
      id: wish.id,
      senderName: wish.sender_name,
      content: wish.content,
      createdAt: wish.created_at,
    })),
    nextCursor: hasMore ? items[items.length - 1]?.id : null,
  });
}

export async function POST(request: NextRequest) {
  if (!isAllowedOrigin(request)) return jsonError("Yêu cầu không hợp lệ.", 403);
  const unavailable = databaseUnavailable();
  if (unavailable) return unavailable;
  const body = await readJson(request);
  if (!body) return jsonError("Dữ liệu gửi lên không hợp lệ.", 400);
  if (body.website) return NextResponse.json({ ok: true });

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const content = typeof body.content === "string" ? body.content.trim() : "";
  const guestToken = body.guestToken;
  const fields: Record<string, string> = {};
  if (!name || name.length > 100) fields.name = "Vui lòng nhập tên (tối đa 100 ký tự).";
  if (!content || content.length > 500) fields.content = "Lời chúc cần có nội dung (tối đa 500 ký tự).";
  if (
    typeof guestToken !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(guestToken)
  ) {
    fields.guestToken = "Không thể xác minh thiết bị. Vui lòng tải lại trang.";
  }
  if (Object.keys(fields).length) return jsonError("Vui lòng kiểm tra lại thông tin.", 400, fields);
  if (typeof guestToken !== "string") return jsonError("Yêu cầu không hợp lệ.", 400);
  if (/https?:\/\/|www\.|[\w.+-]+@[\w.-]+\.[a-z]{2,}|\+?\d[\d\s().-]{7,}\d/i.test(content)) {
    return jsonError("Vui lòng không thêm đường dẫn hoặc thông tin liên hệ vào lời chúc.", 400, {
      content: "Vui lòng không thêm đường dẫn hoặc thông tin liên hệ.",
    });
  }
  if (containsBlockedKeyword(content)) {
    return jsonError("Lời chúc chưa thể đăng. Vui lòng kiểm tra lại nội dung.", 400, {
      content: "Vui lòng kiểm tra lại nội dung.",
    });
  }
  const rateLimit = await enforceRateLimit(request, "wish", guestToken);
  if (rateLimit) return rateLimit;

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("wishes")
    .insert({
      sender_name: name,
      content,
      display_status: "visible",
      guest_token: guestToken,
      ip_hash: getClientKey(request),
    })
    .select("id,sender_name,content,created_at")
    .single();
  if (error) {
    console.error("wish_save_failed", error.code);
    return jsonError("Chưa thể gửi lời chúc. Vui lòng thử lại.", 503);
  }
  return NextResponse.json(
    {
      wish: {
        id: data.id,
        senderName: data.sender_name,
        content: data.content,
        createdAt: data.created_at,
      },
    },
    { status: 201 },
  );
}
