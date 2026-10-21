/** Presentation only: retain the original address for APIs and accessibility. */
export function placeLabel(
  address: string | null | undefined,
  fallback: string,
) {
  const full = address?.trim() ?? '';
  const coordinates =
    /^\(?\s*-?\d{1,3}(?:\.\d+)?\s*,\s*-?\d{1,3}(?:\.\d+)?\s*\)?$/;
  if (!full || coordinates.test(full) || !full.replace(/[,\s]/g, '')) {
    return {
      title: fallback,
      detail: 'Dirección no disponible',
      full,
      unavailable: true,
    };
  }
  const [title, ...parts] = full
    .split(',')
    .map(part => part.trim())
    .filter(Boolean);
  return { title, detail: parts.join(', '), full, unavailable: false };
}
