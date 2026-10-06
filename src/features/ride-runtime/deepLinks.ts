export function rideFromLink(
  url: string,
  allowedOrigin: string | undefined,
): string | null {
  if (!allowedOrigin) return null;
  try {
    const link = new URL(url),
      origin = new URL(allowedOrigin);
    if (
      link.protocol !== 'https:' ||
      link.origin !== origin.origin ||
      link.username ||
      link.password
    )
      return null;
    const match =
      /^\/rides\/([0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\/?$/i.exec(
        link.pathname,
      );
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}
