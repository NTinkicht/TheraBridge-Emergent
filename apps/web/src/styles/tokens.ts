// TheraBridge Direction B design tokens (Master Blueprint v2, sections 2.1-2.4). Single source for Tailwind and CSS variables.
export const colors = {
  brand: {
    deepNavy: '#052464',
    action: '#0F5692',
    actionOn: '#FFFFFF',
    cyan: '#0DA8B8',
    violet: '#7A4AB7',
    ink: '#14213D',
    familyTeal: '#0A7385',
    inkMuted: '#4B566B',
    actionHover: '#0B4577',
    actionTint: '#E8F0F8',
    familyTint: '#E3F3F5',
  },
  canvas: { clinical: '#F6F7F9', family: '#FAF8F5' },
  surface: { white: '#FFFFFF', subtle: '#F3F6F9' },
  border: { light: '#E4EAF3', strong: '#AABDD1' },
  status: {
    success: '#146A50',
    caution: '#945900',
    danger: '#AA343F',
    cautionSurface: '#FFF3DC',
    dangerSurface: '#FDECEA',
    // Complementary additions (design direction v1)
    successSurface: '#E3F2EC',
    info: '#1D5C99',
    infoSurface: '#E6EFF8',
  },
  // Specialty tags: always paired with a text label, never color alone.
  specialty: {
    speech: '#0F5692',
    speechTint: '#E8F0F8',
    ot: '#0B6E7A',
    otTint: '#DFF3F5',
    physio: '#4A4E9C',
    physioTint: '#ECEDF8',
    aba: '#7A4A1F',
    abaTint: '#F6EEE5',
    group: '#3E5F3A',
    groupTint: '#E8F1E6',
  },
  parent: {
    heading: '#14213D',
    bodyStrong: '#1A3354',
    muted: '#5C6E8A',
    tile: '#EDF2FA',
    instructionTile: '#F0F5FB',
    link: '#1F668A',
  },
  dark: {
    canvas: '#0D1226',
    surface: '#151B33',
    raised: '#1C2342',
    border: '#2A3256',
    ink: '#E9ECF5',
    inkMuted: '#AAB3CB',
    action: '#7DB3E8',
    family: '#5CCFDB',
    familySurface: '#13394A',
    parentTile: '#263346',
    parentInstructionTile: '#243241',
  },
} as const;

// Family themes map official light (2.2) and dark (2.3) values onto one set of semantic slots.
// border/warm/accentHover/success/caution are complementary additions (dark success/caution meet 4.5:1 on dark.raised).
export const familyThemes = {
  light: {
    canvas: '#FAF8F5', surface: '#FFFFFF', raised: '#FFFFFF', border: '#ECE6DC', ink: '#14213D', strong: '#1A3354',
    muted: '#5C6E8A', accent: '#0A7385', accentHover: '#085E6D', accentTint: '#E3F3F5', onAccent: '#FFFFFF',
    tile: '#EDF2FA', instruction: '#F0F5FB', link: '#1F668A', warm: '#F4EEE4', success: '#146A50', caution: '#945900', logoChip: 'transparent', focus: '#0A7385',
  },
  dark: {
    canvas: '#0D1226', surface: '#151B33', raised: '#1C2342', border: '#2A3256', ink: '#E9ECF5', strong: '#E9ECF5',
    muted: '#AAB3CB', accent: '#5CCFDB', accentHover: '#86DDE6', accentTint: '#13394A', onAccent: '#0D1226',
    tile: '#263346', instruction: '#243241', link: '#7DB3E8', warm: '#1C2342', success: '#6FD3A8', caution: '#F0B95C', logoChip: '#FFFFFF', focus: '#5CCFDB',
  },
} as const;

export const familySlots = Object.keys(familyThemes.light) as (keyof typeof familyThemes.light)[];

const familyVars = (mode: keyof typeof familyThemes) =>
  Object.fromEntries(familySlots.map((slot) => [`--fam-${slot}`, familyThemes[mode][slot]]));

// `.theme-family-auto` follows <html data-family-theme>, which an inline script sets before first paint (no flash).
export const familyThemeCss: Record<string, Record<string, string>> = {
  '.theme-family-light, .theme-family-auto': familyVars('light'),
  '.theme-family-dark, html[data-family-theme="dark"] .theme-family-auto': familyVars('dark'),
};

// Semantic Tailwind colours reference RGB channels so opacity modifiers such
// as bg-brand-action/20 remain correct. The light palette is unchanged.
const rgb = (hex: string) => {
  const value = hex.replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(value)) throw new Error('Invalid design token');
  return [0, 2, 4].map(i => parseInt(value.slice(i, i + 2), 16)).join(' ');
};
export const themeColors = Object.fromEntries(Object.entries(colors).map(([group, entries]) => [
  group, Object.fromEntries(Object.keys(entries).map(name =>
    [name, `rgb(var(--tb-rgb-${group}-${name}) / <alpha-value>)`]))
])) as Record<keyof typeof colors, Record<string, string>>;

// Staff and family share the same semantic *neutral* colours. Family-specific
// --fam-* tokens retain their independent Direction B accents and palettes.
// This deliberately does not grant access to any clinical feature.
export const darkSemanticOverrides: Record<string, Record<string, string>> = {
  brand: {
    ink: '#E9ECF5', inkMuted: '#B7C2DA', action: '#7DB3E8', actionOn: '#0D1226',
    actionHover: '#A5CEEF', actionTint: '#1C3652', deepNavy: '#A7B9DA',
    familyTeal: '#5CCFDB', familyTint: '#13394A',
  },
  canvas: { clinical: '#0D1226', family: '#0D1226' },
  surface: { white: '#151B33', subtle: '#222A43' },
  border: { light: '#364360', strong: '#8799BB' },
  status: {
    success: '#83DBB8', successSurface: '#153F39',
    caution: '#FFD18A', cautionSurface: '#44351F',
    danger: '#FFA6AB', dangerSurface: '#482631',
    info: '#96C8F5', infoSurface: '#1B3856',
  },
  specialty: {
    speech: '#B1D5FA', speechTint: '#1C3555',
    ot: '#A2E6EB', otTint: '#194149',
    physio: '#C2BDFB', physioTint: '#302C55',
    aba: '#F3CCA6', abaTint: '#423323',
    group: '#B9DFB4', groupTint: '#263F31',
  },
  parent: {
    heading: '#E9ECF5', bodyStrong: '#E9ECF5', muted: '#B7C2DA',
    tile: '#263346', instructionTile: '#243241', link: '#96C8F5',
  },
};
const darkVariables = Object.fromEntries(Object.entries(darkSemanticOverrides).flatMap(
  ([group, entries]) => Object.entries(entries).flatMap(([name, hex]) => [
    [`--tb-${group}-${name}`, hex],
    [`--tb-rgb-${group}-${name}`, rgb(hex)],
  ])
));
export const appThemeCss = {
  'html[data-app-theme="dark"] .theme-clinical-auto, html[data-app-theme="dark"] .theme-family-auto':
    darkVariables,
};

// CSS variables retain their original hex slots for direct CSS consumers and
// expose RGB equivalents for alpha-aware Tailwind utilities.
export const semanticRgbVariables = Object.fromEntries(Object.entries(colors).flatMap(
  ([group, entries]) => Object.entries(entries).map(([name, hex]) =>
    [`--tb-rgb-${group}-${name}`, rgb(hex)])
));

// Approved typography (owner decision): Plus Jakarta Sans for headings; IBM Plex Sans for body, forms, data, tables, numbers.
export const typography = { display: 'Plus Jakarta Sans', body: 'IBM Plex Sans' } as const;

export const signatureBand = [colors.brand.deepNavy, colors.brand.action, colors.brand.cyan, colors.brand.violet] as const;

export const cssVariables: Record<string, string> = {
  ...semanticRgbVariables,
  ...Object.fromEntries(
    Object.entries(colors).flatMap(([group, values]) =>
      Object.entries(values).map(([name, hex]) => [`--tb-${group}-${name}`, hex]),
    ),
  ),
  '--font-display': `'${typography.display}'`,
  '--font-body': `'${typography.body}'`,
};
