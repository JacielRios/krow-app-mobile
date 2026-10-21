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

export function bookingFromLink(
  url: string,
  allowedOrigin: string | undefined,
): string | null {
  if (!rideFromLink(url, allowedOrigin)) return null;
  const values = new URL(url).searchParams.getAll('bookingId');
  return values.length === 1 &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      values[0],
    )
    ? values[0]
    : null;
}

export function isInvitationLink(
  url: string,
  allowedOrigin: string | undefined,
) {
  if (!rideFromLink(url, allowedOrigin)) return false;
  const params = new URL(url).searchParams;
  return (
    params.getAll('invite').length === 1 &&
    params.get('invite') === '1' &&
    !params.has('bookingId')
  );
}

export function invitationLink(
  rideId: string,
  allowedOrigin: string | undefined,
) {
  if (!allowedOrigin)
    throw new Error('No se ha configurado el enlace de KROW.');
  const url = new URL(`/rides/${rideId}`, allowedOrigin);
  if (rideFromLink(url.toString(), allowedOrigin) !== rideId)
    throw new Error('No pudimos identificar el viaje para compartir.');
  url.searchParams.set('invite', '1');
  return url.toString();
}
