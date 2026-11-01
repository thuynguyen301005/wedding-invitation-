import { getSupabase } from "@/lib/supabase";

export type RsvpForSheet = {
  id: string;
  name: string;
  attendance_status: "yes" | "no";
  guest_count: number;
  message: string | null;
  confirmed_at: string;
  revision: number;
};

export type RsvpSheetSyncStatus = "sent" | "pending" | "failed";

type GoogleAppsScriptResponse = {
  ok?: boolean;
  code?: string;
  permanent?: boolean;
};

export async function syncRsvpToSheet(rsvp: RsvpForSheet): Promise<RsvpSheetSyncStatus> {
  return syncRsvpsToSheet([rsvp]);
}

export async function syncRsvpsToSheet(rsvps: RsvpForSheet[]): Promise<RsvpSheetSyncStatus> {
  if (rsvps.length === 0) return "sent";
  if (rsvps.length > 500) return "failed";

  const scriptUrl = process.env.SHEETS_SCRIPT_URL;
  const secret = process.env.SHEETS_SCRIPT_SECRET;
  if (!scriptUrl || !secret) {
    console.error("rsvp_sheet_sync_not_configured", {
      missing: [
        ...(!scriptUrl ? ["SHEETS_SCRIPT_URL"] : []),
        ...(!secret ? ["SHEETS_SCRIPT_SECRET"] : []),
      ],
    });
    await updateDeliveries(rsvps, false, true, "SHEET_CONFIG");
    return "failed";
  }

  let permanentFailure = false;
  let errorCode = "SHEET_TEMPORARY";
  try {
    const response = await fetch(scriptUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret,
        rsvps,
      }),
      redirect: "follow",
      signal: AbortSignal.timeout(20000),
    });
    const result = (await response.json().catch(() => ({}))) as GoogleAppsScriptResponse;
    if (response.ok && result.ok === true) {
      await updateDeliveries(rsvps, true, false, null);
      return "sent";
    }

    errorCode = result.code || `SHEET_SYNC_${response.status}`;
    permanentFailure =
      result.permanent === true ||
      (response.status >= 400 && response.status < 500 && response.status !== 429);
    console.error("rsvp_sheet_sync_rejected", {
      status: response.status,
      code: errorCode,
    });
  } catch (error) {
    errorCode = error instanceof Error && error.name === "TimeoutError" ? "SHEET_TIMEOUT" : "SHEET_NETWORK";
    console.error("rsvp_sheet_sync_error", errorCode);
  }
  await updateDeliveries(rsvps, false, permanentFailure, errorCode);
  return permanentFailure ? "failed" : "pending";
}

async function updateDeliveries(
  rsvps: RsvpForSheet[],
  sent: boolean,
  permanent: boolean,
  errorCode: string | null,
) {
  for (let index = 0; index < rsvps.length; index += 25) {
    await Promise.all(
      rsvps.slice(index, index + 25).map((rsvp) =>
        updateDelivery(rsvp.id, rsvp.revision, sent, permanent, errorCode),
      ),
    );
  }
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
    console.error("rsvp_sheet_status_update_failed", id, error.code);
  }
}
