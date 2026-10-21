// Replaceable brand component. Assets are cropped (not redrawn) from assets/brand/original/TheraBridge-Logo-original.jpg.
type Variant = 'lockup' | 'symbol' | 'wordmark';

const ASSETS: Record<Variant, { file: string; ratio: number }> = {
  lockup: { file: 'therabridge-lockup', ratio: 793 / 646 },
  symbol: { file: 'therabridge-symbol', ratio: 758 / 402 },
  wordmark: { file: 'therabridge-wordmark', ratio: 779 / 140 },
};

export function BrandMark({ variant = 'symbol', height }: { variant?: Variant; height: number }) {
  const { file, ratio } = ASSETS[variant];
  return (
    <img
      src={`/brand/${file}@1x.png`}
      srcSet={`/brand/${file}@1x.png 1x, /brand/${file}@2x.png 2x`}
      alt={variant === 'symbol' ? '' : 'TheraBridge'}
      aria-hidden={variant === 'symbol' ? true : undefined}
      height={height}
      width={Math.round(height * ratio)}
      className="block shrink-0"
      data-testid={`brand-mark-${variant}`}
    />
  );
}
