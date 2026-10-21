'use client';

import { useEffect, useState } from 'react';

// Client clock, available only after mount so server and client render identical markup (no date hydration mismatch).
export function useNow(): Date | null {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
  }, []);
  return now;
}
