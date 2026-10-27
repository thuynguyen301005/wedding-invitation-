import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { databaseUnavailable, enforceRateLimit, isAllowedOrigin, jsonError, readJson } from "@/lib/api";
import { sendRsvpNotification } from "@/lib/email";
import { getSupabase } from "@/lib/supabase";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!isAllowedOrigin(request)) return jsonError("Yêu cầu không hợp lệ.", 403);
  const unavailable = databaseUnavailable();
  if (unavailable) return unavailable;
  const body = await readJson(request);
  if (!body) return jsonError("Dữ liệu gửi lên không hợp lệ.", 400);
  if (body.website) return NextResponse.json({ ok: true });

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const attendance = body.attendanceStatus;
  const guestCount = body.guestCount;
  const message = typeof body.message === "string" ? body.message.trim() : "";
  const guestToken = body.guestToken;
  const idempotencyKey = body.idempotencyKey;
  const fields: Record<string, string> = {};
  if (!name || name.length > 100 || /[\r\n]/.test(name)) fields.name = "Vui lòng nhập họ tên (tối đa 100 ký tự).";
  if (attendance !== "yes" && attendance !== "no") fields.attendanceStatus = "Vui lòng chọn trạng thái tham dự.";
  if (
    attendance === "yes" &&
    (!Number.isInteger(guestCount) || Number(guestCount) < 1 || Number(guestCount) > 10)
  ) fields.guestCount = "Số người tham dự từ 1 đến 10.";
  if (message.length > 500) fields.message = "Lời nhắn tối đa 500 ký tự.";
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (typeof guestToken !== "string" || !uuidPattern.test(guestToken)) {
    fields.guestToken = "Không thể xác minh thiết bị. Vui lòng tải lại trang.";
  }
  if (typeof idempotencyKey !== "string" || !uuidPattern.test(idempotencyKey)) {
    fields.idempotencyKey = "Yêu cầu không hợp lệ. Vui lòng gửi lại.";
  }
  if (Object.keys(fields).length) return jsonError("Vui lòng kiểm tra lại thông tin.", 400, fields);
  if (typeof guestToken !== "string" || typeof idempotencyKey !== "string") {
    return jsonError("Yêu cầu không hợp lệ.", 400);
  }

  const deadline = process.env.RSVP_DEADLINE;
  if (deadline && Date.now() > new Date(deadline).getTime()) {
    return jsonError("Thời gian xác nhận đã kết thúc. Vui lòng liên hệ trực tiếp với cô dâu chú rể.", 410);
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
    console.error("rsvp_save_failed", error.code);
    return jsonError("Chưa thể lưu xác nhận. Vui lòng thử lại; nội dung của bạn vẫn được giữ.", 503);
  }

  const saved = data as {
    id: string;
    name: string;
    attendance_status: "yes" | "no";
    guest_count: number;
    message: string | null;
    confirmed_at: string;
    revision: number;
    notification_status: "pending" | "sent" | "failed" | "not_required";
    should_notify: boolean;
    updated: boolean;
    idempotent: boolean;
  };

  if (saved.should_notify && saved.notification_status === "pending") {
    await sendRsvpNotification(saved);
    const { data: current } = await supabase
      .from("rsvps")
      .select("notification_status")
      .eq("id", saved.id)
      .eq("revision", saved.revision)
      .maybeSingle();
    if (current) saved.notification_status = current.notification_status;
  }

  return NextResponse.json({
    saved: true,
    updated: saved.updated,
    notificationStatus: saved.notification_status,
    message:
      saved.attendance_status === "no" && saved.notification_status === "not_required"
        ? "Đã ghi nhận. Cảm ơn bạn đã báo; rất tiếc bạn không thể đến."
        : saved.updated
          ? "Đã cập nhật xác nhận của bạn."
          : saved.notification_status === "sent"
            ? "Đã ghi nhận xác nhận của bạn và đã gửi thông báo tới cô dâu chú rể."
            : "Đã ghi nhận xác nhận của bạn. Thông báo tới cô dâu chú rể đang được xử lý.",
  });
}
