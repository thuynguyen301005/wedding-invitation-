"use server";

import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendRsvpEmail(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  const message = String(formData.get("message") || "").trim();

  if (!name) {
    return { success: false, error: "Vui lòng nhập tên." };
  }

  try {
    const { error } = await resend.emails.send({
      from: "onboarding@resend.dev",
      to: "minhanh01205@gmail.com",
      subject: `💌 ${name} đã xác nhận tham gia`,
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#302b28">
          <h2> RSVP mới từ khách mời</h2>
          <p><strong>Tên khách:</strong> ${escapeHtml(name)}</p>
          <p><strong>Lời nhắn:</strong><br>${escapeHtml(message || "Không có lời nhắn.")}</p>
        </div>
      `,
    });

    if (error) {
      return { success: false, error: error.message || "Gửi email thất bại." };
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Gửi email thất bại." };
  }
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>\"']/g, (c) => {
    const map: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
    return map[c];
  });
}