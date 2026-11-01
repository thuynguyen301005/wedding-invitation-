export function isRequestOriginAllowed(
  origin: string,
  allowedOrigins: string[],
  requestHosts: string[],
  requestProtocol: string,
): boolean {
  let parsedOrigin: URL;
  try {
    parsedOrigin = new URL(origin);
  } catch {
    return false;
  }
  if (parsedOrigin.protocol !== "http:" && parsedOrigin.protocol !== "https:") return false;

  const normalizedOrigin = parsedOrigin.origin.toLowerCase();
  if (
    allowedOrigins.some((allowedOrigin) => {
      try {
        return new URL(allowedOrigin).origin.toLowerCase() === normalizedOrigin;
      } catch {
        return false;
      }
    })
  ) {
    return true;
  }

  return (
    parsedOrigin.protocol === requestProtocol &&
    requestHosts.some((host) => host.trim().toLowerCase() === parsedOrigin.host.toLowerCase())
  );
}
