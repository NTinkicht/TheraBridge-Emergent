import type { Config } from 'tailwindcss';
import plugin from 'tailwindcss/plugin';
import { colors, cssVariables, familySlots, familyThemeCss } from './src/styles/tokens';

const fam = Object.fromEntries(familySlots.map((slot) => [slot, `var(--fam-${slot})`]));

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: { ...colors, fam },
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
        serif: ['"IBM Plex Serif"', 'Georgia', 'serif'],
      },
      borderRadius: { card: '14px', control: '11px' },
      maxWidth: { content: '1140px' },
      width: { sidebar: '254px' },
    },
  },
  plugins: [plugin(({ addBase }) => addBase({ ':root': cssVariables, ...familyThemeCss }))],
} satisfies Config;
