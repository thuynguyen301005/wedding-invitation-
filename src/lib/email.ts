import { getSupabase } from "@/lib/supabase";
import { wedding } from "@/config/wedding";

type RsvpForEmail = {
  id: string;
  name: string;
  attendance_status: "yes" | "no";
  guest_count: number;
  message: string | null;
  confirmed_at: string;
  revision: number;
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });
}

function safeHeader(value: string): string {
  return value.replace(/[\r\n]+/g, " ").trim();
}

function formatVietnamTime(value: string): string {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date(value));
}

export async function sendRsvpNotification(rsvp: RsvpForEmail): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.FROM_EMAIL;
  const recipients = process.env.COUPLE_EMAIL?.split(",").map((email) => email.trim()).filter(Boolean);
  if (!apiKey || !fromEmail || !recipients?.length) {
    await updateDelivery(rsvp.id, rsvp.revision, false, true, "EMAIL_CONFIG");
    return;
  }

  const bride = safeHeader(wedding.bride);
  const groom = safeHeader(wedding.groom);
  const attendance = rsvp.attendance_status === "yes" ? "Tham dự" : "Không thể tham dự";
  const label = rsvp.revision > 1 ? "Cập nhật" : "Mới";
  const subject = safeHeader(
    `[${label === "Mới" ? "RSVP" : "Cập nhật RSVP"}] ${rsvp.name} – ${attendance}${rsvp.attendance_status === "yes" ? ` (${rsvp.guest_count} người)` : ""}`,
  );
  const message = rsvp.message?.trim() || "Không có lời nhắn.";
  const text = [
    `${label} xác nhận tham dự`,
    `Tên khách: ${rsvp.name}`,
    `Trạng thái: ${attendance}`,
    `Số người: ${rsvp.guest_count}`,
    `Lời nhắn: ${message}`,
    `Thời điểm: ${formatVietnamTime(rsvp.confirmed_at)}`,
  ].join("\n");
  const html = `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#302b28"><h2>${escapeHtml(label)} xác nhận tham dự</h2><p><strong>Tên khách:</strong> ${escapeHtml(rsvp.name)}</p><p><strong>Trạng thái:</strong> ${escapeHtml(attendance)}</p><p><strong>Số người:</strong> ${rsvp.guest_count}</p><p><strong>Lời nhắn:</strong><br>${escapeHtml(message).replace(/\n/g, "<br>")}</p><p><strong>Thời điểm:</strong> ${escapeHtml(formatVietnamTime(rsvp.confirmed_at))}</p></div>`;

  let permanentFailure = false;
  let errorCode = "EMAIL_TEMPORARY";
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `rsvp-${rsvp.id}-revision-${rsvp.revision}`,
      },
      body: JSON.stringify({
        from: `${bride} & ${groom} <${fromEmail}>`,
        to: recipients,
        ...(process.env.REPLY_TO_EMAIL ? { reply_to: process.env.REPLY_TO_EMAIL } : {}),
        subject,
        text,
        html,
      }),
      signal: AbortSignal.timeout(5000),
    });
    if (response.ok) {
      await updateDelivery(rsvp.id, rsvp.revision, true, false, null);
      return;
    }
    const body = (await response.json().catch(() => ({}))) as { name?: string; statusCode?: number };
    errorCode = body.name || `RESEND_${response.status}`;
    permanentFailure =
      response.status !== 408 && response.status !== 429 && response.status < 500;
  } catch (error) {
    errorCode = error instanceof Error && error.name === "TimeoutError" ? "EMAIL_TIMEOUT" : "EMAIL_NETWORK";
  }
  await updateDelivery(rsvp.id, rsvp.revision, false, permanentFailure, errorCode);
}

async function updateDelivery(
  id: string,
  revision: number,
  sent: boolean,
  permanent: boolean,
  errorCode: string | null,
) {
  const { error } = await getSupabase().rpc("finish_rsvp_notification", {
    p_rsvp_id: id,
    p_revision: revision,
    p_sent: sent,
    p_permanent: permanent,
    p_error_code: errorCode,
  });
  if (error) {
    console.error("email_status_update_failed", id, error.code);
  }
}
