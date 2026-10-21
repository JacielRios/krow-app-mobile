import { darkTheme, lightTheme } from '../src/shared/theme/themes';

function luminance(hex: string) {
  const values = hex
    .slice(1)
    .match(/.{2}/g)!
    .map(part => {
      const value = parseInt(part, 16) / 255;
      return value <= 0.04045
        ? value / 12.92
        : ((value + 0.055) / 1.055) ** 2.4;
    });
  return values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722;
}
function contrast(a: string, b: string) {
  const first = luminance(a),
    second = luminance(b);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

describe.each([
  ['light', lightTheme],
  ['dark', darkTheme],
] as const)('%s contrast', (_name, theme) => {
  test('normal text remains readable on all neutral surfaces', () => {
    const c = theme.colors;
    for (const surface of [c.background, c.surface, c.surfaceRaised]) {
      for (const text of [
        c.textPrimary,
        c.textSecondary,
        c.textMuted,
        ...Object.values(c.status),
      ]) {
        expect(contrast(text, surface)).toBeGreaterThanOrEqual(4.5);
      }
    }
  });
  test('filled action labels have readable contrast', () => {
    const c = theme.colors;
    for (const [text, fill] of [
      [c.onPrimary, c.primary],
      [c.onSecondary, c.textPrimary],
      [c.onDestructive, c.status.error],
    ]) {
      expect(contrast(text, fill)).toBeGreaterThanOrEqual(4.5);
    }
  });
  test('input boundaries remain visible on their surface', () => {
    expect(
      contrast(theme.colors.controlBorder, theme.colors.surface),
    ).toBeGreaterThanOrEqual(3);
  });
  test('tonal actions and selected rows retain readable labels', () => {
    const c = theme.colors;
    expect(contrast(c.primary, c.primarySoft)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(c.textPrimary, c.primarySoft)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(c.textSecondary, c.primarySoft)).toBeGreaterThanOrEqual(
      4.5,
    );
  });
});
