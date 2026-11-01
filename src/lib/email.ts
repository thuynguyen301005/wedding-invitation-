import { getSupabase } from "@/lib/supabase";
import { rsvpNotificationMessage } from "@/lib/email-content";

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

type GoogleAppsScriptResponse = {
  ok?: boolean;
  code?: string;
  permanent?: boolean;
};

export async function sendRsvpNotification(rsvp: RsvpForEmail): Promise<RsvpNotificationStatus> {
  const scriptUrl = process.env.GMAIL_SCRIPT_URL;
  const secret = process.env.GMAIL_SCRIPT_SECRET;
  if (!scriptUrl || !secret) {
    console.error("rsvp_email_not_configured", {
      missing: [
        ...(!scriptUrl ? ["GMAIL_SCRIPT_URL"] : []),
        ...(!secret ? ["GMAIL_SCRIPT_SECRET"] : []),
      ],
    });
    await updateDelivery(rsvp.id, rsvp.revision, false, true, "EMAIL_CONFIG");
    return "failed";
  }

  let permanentFailure = false;
  let errorCode = "EMAIL_TEMPORARY";
  try {
    const response = await fetch(scriptUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret,
        message: rsvpNotificationMessage,
      }),
      redirect: "follow",
      signal: AbortSignal.timeout(20000),
    });
    const result = (await response.json().catch(() => ({}))) as GoogleAppsScriptResponse;
    if (response.ok && result.ok === true) {
      await updateDelivery(rsvp.id, rsvp.revision, true, false, null);
      return "sent";
    }

    errorCode = result.code || `GMAIL_SCRIPT_${response.status}`;
    permanentFailure =
      result.permanent === true ||
      (response.status >= 400 && response.status < 500 && response.status !== 429);
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
