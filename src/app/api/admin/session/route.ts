import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit, isAllowedOrigin, jsonError, readJson } from "@/lib/api";
import {
  createRsvpAdminSession,
  isRsvpAdminConfigured,
  RSVP_ADMIN_COOKIE,
  RSVP_ADMIN_SESSION_SECONDS,
  verifyRsvpAdminPassword,
  verifyRsvpAdminSession,
} from "@/lib/rsvp-admin-auth";

export const runtime = "nodejs";

function unauthorized() {
  return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401, headers: { "Cache-Control": "no-store" } });
}

export async function GET(request: NextRequest) {
  if (!isRsvpAdminConfigured()) {
    return jsonError("Trang quản lý chưa được cấu hình.", 503);
  }
  if (!verifyRsvpAdminSession(request.cookies.get(RSVP_ADMIN_COOKIE)?.value)) {
    return unauthorized();
  }
  return NextResponse.json(
    { authenticated: true },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: NextRequest) {
  if (!isAllowedOrigin(request)) return jsonError("Yêu cầu không hợp lệ.", 403);
  if (!isRsvpAdminConfigured()) {
    return jsonError("Trang quản lý chưa được cấu hình.", 503);
  }
  const rateLimit = await enforceRateLimit(request, "admin");
  if (rateLimit) return rateLimit;

  const body = await readJson(request);
  if (!body || typeof body.password !== "string") {
    return jsonError("Vui lòng nhập mật khẩu.", 400);
  }
  if (!verifyRsvpAdminPassword(body.password)) return unauthorized();

  const token = createRsvpAdminSession();
  if (!token) return jsonError("Không thể tạo phiên đăng nhập.", 503);

  const response = NextResponse.json(
    { authenticated: true },
    { headers: { "Cache-Control": "no-store" } },
  );
  response.cookies.set(RSVP_ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: RSVP_ADMIN_SESSION_SECONDS,
  });
  return response;
}

export async function DELETE(request: NextRequest) {
  if (!isAllowedOrigin(request)) return jsonError("Yêu cầu không hợp lệ.", 403);
  const response = NextResponse.json(
    { authenticated: false },
    { headers: { "Cache-Control": "no-store" } },
  );
  response.cookies.set(RSVP_ADMIN_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
  return response;
}
