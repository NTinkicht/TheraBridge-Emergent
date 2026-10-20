// TheraBridge Direction B design tokens (Master Blueprint v2, sections 2.1-2.4). Single source for Tailwind and CSS variables.
export const colors = {
  brand: {
    deepNavy: '#052464',
    action: '#0F5692',
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
// border/warm/accentHover (light) and accentHover (dark) are complementary additions.
export const familyThemes = {
  light: {
    canvas: '#FAF8F5', surface: '#FFFFFF', raised: '#FFFFFF', border: '#ECE6DC', ink: '#14213D', strong: '#1A3354',
    muted: '#5C6E8A', accent: '#0A7385', accentHover: '#085E6D', accentTint: '#E3F3F5', onAccent: '#FFFFFF',
    tile: '#EDF2FA', instruction: '#F0F5FB', link: '#1F668A', warm: '#F4EEE4',
  },
  dark: {
    canvas: '#0D1226', surface: '#151B33', raised: '#1C2342', border: '#2A3256', ink: '#E9ECF5', strong: '#E9ECF5',
    muted: '#AAB3CB', accent: '#5CCFDB', accentHover: '#86DDE6', accentTint: '#13394A', onAccent: '#0D1226',
    tile: '#263346', instruction: '#243241', link: '#7DB3E8', warm: '#1C2342',
  },
} as const;

export const familySlots = Object.keys(familyThemes.light) as (keyof typeof familyThemes.light)[];

export const familyThemeCss: Record<string, Record<string, string>> = Object.fromEntries(
  (Object.keys(familyThemes) as (keyof typeof familyThemes)[]).map((mode) => [
    `.theme-family-${mode}`,
    Object.fromEntries(familySlots.map((slot) => [`--fam-${slot}`, familyThemes[mode][slot]])),
  ]),
);

export const signatureBand = [colors.brand.deepNavy, colors.brand.action, colors.brand.cyan, colors.brand.violet] as const;

export const cssVariables: Record<string, string> = Object.fromEntries(
  Object.entries(colors).flatMap(([group, values]) =>
    Object.entries(values).map(([name, hex]) => [`--tb-${group}-${name}`, hex]),
  ),
);
