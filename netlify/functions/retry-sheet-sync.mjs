export default async function retrySheetSync() {
  const siteUrl = process.env.URL || process.env.DEPLOY_PRIME_URL;
  const secret = process.env.CRON_SECRET;
  if (!siteUrl || !secret) {
    throw new Error("Netlify URL and CRON_SECRET must be configured for sheet synchronization retries.");
  }

  const response = await fetch(new URL("/api/cron/retry-sheet-sync", siteUrl), {
    headers: { authorization: `Bearer ${secret}` },
    signal: AbortSignal.timeout(9000),
  });
  if (!response.ok) {
    throw new Error(`Sheet sync retry endpoint returned ${response.status}.`);
  }

  const result = await response.json();
  console.log(`Processed ${result.processed} RSVP sheet sync attempts.`);
}

export const config = {
  schedule: "* * * * *",
};
