import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { siteUrl } from "@/config/wedding";
import { getSupabase } from "@/lib/supabase";

export const MAX_BODY_BYTES = 10 * 1024;

export function jsonError(message: string, status: number, fields?: Record<string, string>) {
  return NextResponse.json({ error: message, ...(fields ? { fields } : {}) }, { status });
}

export async function readJson(request: NextRequest): Promise<Record<string, unknown> | null> {
  if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) return null;
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_BODY_BYTES) return null;
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) return null;
  try {
    const value: unknown = JSON.parse(text);
    return value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

export function isAllowedOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  const allowed = process.env.ALLOWED_ORIGIN || siteUrl;
  return origin === allowed;
}

export function databaseUnavailable(): NextResponse | null {
  return (process.env.SUPABASE_URL && (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY))
    ? null
    : jsonError("Dịch vụ chưa được cấu hình. Vui lòng thử lại sau.", 503);
}

export function getClientKey(request: NextRequest): string {
  const proxyHeader = process.env.TRUST_PROXY_HEADER || "x-vercel-forwarded-for";
  const forwarded = request.headers.get(proxyHeader)?.split(",")[0]?.trim();
  const address = forwarded || (process.env.NODE_ENV === "development" ? "127.0.0.1" : "unknown");
  const salt = process.env.RATE_LIMIT_SALT;
  if (!salt) throw new Error("RATE_LIMIT_SALT is not configured");
  return createHash("sha256").update(`${salt}:${address}`).digest("hex");
}

export async function enforceRateLimit(
  request: NextRequest,
  bucket: "rsvp" | "wish",
  guestToken?: string,
): Promise<NextResponse | null> {
  if (!process.env.RATE_LIMIT_SALT) {
    return jsonError("Dịch vụ chưa được cấu hình. Vui lòng thử lại sau.", 503);
  }
  const ipHash = getClientKey(request);
  const limit = Number(
    process.env[bucket === "rsvp" ? "RATE_LIMIT_RSVP_PER_HOUR" : "RATE_LIMIT_WISH_PER_HOUR"] || 10,
  );
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("consume_rate_limit", {
    p_ip_hash: ipHash,
    p_bucket: bucket,
    p_ip_limit: Number.isInteger(limit) && limit > 0 ? limit : 10,
    p_guest_token: guestToken || null,
  });
  if (error) {
    console.error("rate_limit_unavailable", error.code);
    return jsonError("Không thể xử lý lúc này. Vui lòng thử lại sau.", 503);
  }
  if (!data?.allowed) {
    return NextResponse.json(
      { error: "Bạn gửi hơi nhanh, vui lòng thử lại sau vài phút.", retryAfter: data.retry_after },
      { status: 429, headers: { "Retry-After": String(data.retry_after || 3600) } },
    );
  }
  return null;
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
