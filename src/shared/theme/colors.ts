export const colors = {
  // ── Brand ──────────────────────────────────────────────────────────────
  primary: '#002C6F',        // Azul institucional KROW
  primaryLight: '#4B7BDE',   // Botones primarios
  primaryDark: '#001A4D',    // Gradientes / headers oscuros
  accent: '#3B82F6',         // CTA vibrante (más luminoso)

  // ── Surfaces ───────────────────────────────────────────────────────────
  background: '#F7F8FC',     // Fondo general gris cálido
  surface: '#FFFFFF',        // Cards y contenedores
  surfaceElevated: '#FFFFFF',// Cards con sombra
  surfaceDark: '#0A1929',    // Fondo oscuro tipo Uber

  // ── Text ───────────────────────────────────────────────────────────────
  text: {
    primary: '#0F172A',      // Casi negro, alta legibilidad
    secondary: '#64748B',    // Gris medio
    tertiary: '#94A3B8',     // Gris claro para metadata
    inverse: '#FFFFFF',
    placeholder: '#94A3B8',
    muted: '#CBD5E1',
  },

  // ── Borders ────────────────────────────────────────────────────────────
  border: {
    default: '#E2E8F0',
    active: '#002C6F',
    light: '#F1F5F9',
  },

  // ── Status ─────────────────────────────────────────────────────────────
  status: {
    error: '#EF4444',
    errorLight: '#FEF2F2',
    success: '#22C55E',
    successLight: '#F0FDF4',
    warning: '#F59E0B',
    warningLight: '#FFFBEB',
    info: '#3B82F6',
    infoLight: '#EFF6FF',
  },

  // ── Legacy (retrocompatibilidad) ───────────────────────────────────────
  error: '#EF4444',

  // ── Map ────────────────────────────────────────────────────────────────
  map: {
    background: '#E8EAED',
    route: '#3B82F6',
    polyineOuter: '#FFFFFF',
    marker: '#002C6F',
  },

  // ── Gradientes (para usar en StyleSheet como fallback) ────────────────
  gradient: {
    headerStart: '#001A4D',
    headerEnd: '#002C6F',
    heroStart: '#002C6F',
    heroEnd: '#1E40AF',
  },

  // ── Avatares coloridos ─────────────────────────────────────────────────
  avatarColors: [
    '#3B82F6', // blue
    '#8B5CF6', // purple
    '#EC4899', // pink
    '#F59E0B', // amber
    '#22C55E', // green
    '#06B6D4', // cyan
    '#EF4444', // red
    '#6366F1', // indigo
  ],
} as const;
