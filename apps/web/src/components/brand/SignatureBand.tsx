import { signatureBand } from '@/styles/tokens';

export function SignatureBand() {
  return (
    <div aria-hidden="true" className="flex h-[3px] w-full" data-testid="signature-band">
      {signatureBand.map((hex) => (
        <span key={hex} className="flex-1" style={{ backgroundColor: hex }} />
      ))}
    </div>
  );
}
