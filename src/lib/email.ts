import { getSupabase } from "@/lib/supabase";
import { rsvpNotificationMessage } from "@/lib/email-content";
import { rsvpNotificationRecipient } from "@/lib/email-recipient";

export type RsvpForEmail = {
  id: string;
  name: string;
  attendance_status: "yes" | "no";
  guest_count: number;
  message: string | null;
  confirmed_at: string;
  revision: number;
};

export type RsvpNotificationStatus = "sent" | "pending" | "failed";

export async function sendRsvpNotification(rsvp: RsvpForEmail): Promise<RsvpNotificationStatus> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.FROM_EMAIL;
  if (!apiKey || !fromEmail) {
    console.error("rsvp_email_not_configured", {
      missing: [
        ...(!apiKey ? ["RESEND_API_KEY"] : []),
        ...(!fromEmail ? ["FROM_EMAIL"] : []),
      ],
    });
    await updateDelivery(rsvp.id, rsvp.revision, false, true, "EMAIL_CONFIG");
    return "failed";
  }

  const subject = rsvpNotificationMessage;
  const text = rsvpNotificationMessage;
  const html = `<p>${rsvpNotificationMessage}</p>`;

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
        from: fromEmail,
        to: [rsvpNotificationRecipient],
        ...(process.env.REPLY_TO_EMAIL ? { reply_to: process.env.REPLY_TO_EMAIL } : {}),
        subject,
        text,
        html,
      }),
      signal: AbortSignal.timeout(5000),
    });
    if (response.ok) {
      await updateDelivery(rsvp.id, rsvp.revision, true, false, null);
      return "sent";
    }
    const body = (await response.json().catch(() => ({}))) as { name?: string; statusCode?: number };
    errorCode = body.name || `RESEND_${response.status}`;
    permanentFailure =
      response.status !== 408 && response.status !== 429 && response.status < 500;
    console.error("rsvp_email_provider_rejected", {
      status: response.status,
      code: errorCode,
    });
  } catch (error) {
    errorCode = error instanceof Error && error.name === "TimeoutError" ? "EMAIL_TIMEOUT" : "EMAIL_NETWORK";
    console.error("rsvp_email_delivery_error", errorCode);
  }
  await updateDelivery(rsvp.id, rsvp.revision, false, permanentFailure, errorCode);
  return permanentFailure ? "failed" : "pending";
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
