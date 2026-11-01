import { NextRequest, NextResponse } from "next/server";
import { databaseUnavailable, enforceRateLimit, isAllowedOrigin, jsonError, readJson } from "@/lib/api";
import { getSupabase } from "@/lib/supabase";
import { parseWishSubmission } from "@/lib/wish-input";
import { containsProfanity } from "@/utils/checkProfanity";

export const runtime = "nodejs";

type WishRow = {
  id: string;
  sender_name: string;
  content: string;
  created_at: string;
};

type LegacyWishRow = {
  id: string;
  name: string;
  message: string;
  created_at: string;
};

function toPublicWish(wish: WishRow | LegacyWishRow) {
  return "sender_name" in wish
    ? {
        id: wish.id,
        senderName: wish.sender_name,
        content: wish.content,
        createdAt: wish.created_at,
      }
    : {
        id: wish.id,
        senderName: wish.name,
        content: wish.message,
        createdAt: wish.created_at,
      };
}

type PublicWish = ReturnType<typeof toPublicWish>;

function publicWishesResponse(wishes: PublicWish[]) {
  return NextResponse.json(
    { wishes },
    { headers: { "Cache-Control": "public, s-maxage=15, stale-while-revalidate=15" } },
  );
}

export async function GET() {
  const unavailable = databaseUnavailable();
  if (unavailable) return unavailable;
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("wishes")
    .select("id,sender_name,content,created_at")
    .eq("display_status", "visible")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error?.code === "42703") {
    const legacy = await supabase
      .from("wishes")
      .select("id,name,message,created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    if (legacy.error) {
      console.error("wishes_fetch_failed", legacy.error.code, legacy.error.message);
      return jsonError("Chưa thể tải lời chúc. Vui lòng thử lại sau.", 503);
    }
    return publicWishesResponse(((legacy.data as LegacyWishRow[] | null) || []).map(toPublicWish));
  }
  if (error) {
    console.error("wishes_fetch_failed", error.code, error.message, error.details, error.hint);
    return jsonError("Chưa thể tải lời chúc. Vui lòng thử lại sau.", 503);
  }
  return publicWishesResponse(((data as WishRow[] | null) || []).map(toPublicWish));
}

export async function POST(request: NextRequest) {
  if (!isAllowedOrigin(request)) return jsonError("Yêu cầu không hợp lệ.", 403);
  const unavailable = databaseUnavailable();
  if (unavailable) return unavailable;
  const body = await readJson(request);
  if (!body) return jsonError("Dữ liệu gửi lên không hợp lệ.", 400);
  if (body.website) return NextResponse.json({ ok: true });

  const parsed = parseWishSubmission(body);
  if ("fields" in parsed) return jsonError("Vui lòng kiểm tra lại thông tin.", 400, parsed.fields);
  const { name, content, guestToken } = parsed.value;

  if (containsProfanity(name) || containsProfanity(content)) {
    return jsonError("Nội dung không hợp lệ.", 400);
  }

  const rateLimit = await enforceRateLimit(request, "wish", guestToken);
  if (rateLimit) return rateLimit;

  const supabase = getSupabase();
  const schema = await supabase
    .from("wishes")
    .select("sender_name,content,display_status,guest_token")
    .limit(0);
  if (schema.error && schema.error.code !== "42703") {
    console.error("wish_schema_check_failed", schema.error.code, schema.error.message);
    return jsonError("Chưa thể gửi lời chúc. Vui lòng thử lại.", 503);
  }

  const saved = schema.error
    ? await supabase
        .from("wishes")
        .insert({ name, message: content })
        .select("id,name,message,created_at")
        .single()
    : await supabase
        .from("wishes")
        .insert({ sender_name: name, content, guest_token: guestToken })
        .select("id,sender_name,content,created_at")
        .single();
  if (saved.error) {
    console.error("wish_save_failed", saved.error.code, saved.error.message, saved.error.details, saved.error.hint);
    return jsonError("Chưa thể gửi lời chúc. Vui lòng thử lại.", 503);
  }
  const wish = saved.data as WishRow | LegacyWishRow;
  return NextResponse.json(
    { wish: toPublicWish(wish) },
    { status: 201 },
  );
}
