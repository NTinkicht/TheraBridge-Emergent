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

export const signatureBand = [colors.brand.deepNavy, colors.brand.action, colors.brand.cyan, colors.brand.violet] as const;

export const cssVariables: Record<string, string> = Object.fromEntries(
  Object.entries(colors).flatMap(([group, values]) =>
    Object.entries(values).map(([name, hex]) => [`--tb-${group}-${name}`, hex]),
  ),
);
