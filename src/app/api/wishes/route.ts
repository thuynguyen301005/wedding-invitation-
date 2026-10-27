import { NextRequest, NextResponse } from "next/server";
import { databaseUnavailable, enforceRateLimit, isAllowedOrigin, jsonError, readJson } from "@/lib/api";
import { getSupabase } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET() {
  const unavailable = databaseUnavailable();
  if (unavailable) return unavailable;
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("wishes")
    .select("id,name,message,created_at")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) {
    console.error("wishes_fetch_failed", error.code, error.message, error.details, error.hint);
    return jsonError("Chua the tai loi chuc. Vui long thu lai sau.", 503);
  }
  return NextResponse.json({
    wishes: (data || []).map((wish: any) => ({
      id: wish.id,
      name: wish.name,
      message: wish.message,
      createdAt: wish.created_at,
    })),
  });
}

export async function POST(request: NextRequest) {
  if (!isAllowedOrigin(request)) return jsonError("Yeu cau khong hop le.", 403);
  const unavailable = databaseUnavailable();
  if (unavailable) return unavailable;
  const body = await readJson(request);
  if (!body) return jsonError("Du lieu gui len khong hop le.", 400);
  if (body.website) return NextResponse.json({ ok: true });

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";

  const fields: Record<string, string> = {};
  if (!name || name.length > 100) fields.name = "Vui long nhap ten (toi da 100 ky tu).";
  if (!message || message.length > 500) fields.message = "Loi chuc can co noi dung (toi da 500 ky tu).";
  if (Object.keys(fields).length) return jsonError("Vui long kiem tra lai thong tin.", 400, fields);

  const rateLimit = await enforceRateLimit(request, "wish");
  if (rateLimit) return rateLimit;

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("wishes")
    .insert({ name, message })
    .select("id,name,message,created_at")
    .single();
  if (error) {
    console.error("wish_save_failed", error.code, error.message, error.details, error.hint);
    return jsonError("Chua the gui loi chuc. Vui long thu lai.", 503);
  }
  return NextResponse.json(
    {
      wish: {
        id: data.id,
        name: data.name,
        message: data.message,
        createdAt: data.created_at,
      },
    },
    { status: 201 },
  );
}