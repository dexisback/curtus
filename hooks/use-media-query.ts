'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

/**
 * Subscribes to `window.matchMedia`. Falls back gracefully before mount.
 */
export function useMediaQuery(query: string, initialValue = false): boolean {
  const getMatches = useCallback(() => {
    if (typeof window === 'undefined') return initialValue;
    return window.matchMedia(query).matches;
  }, [query, initialValue]);

  const [matches, setMatches] = useState(getMatches);

  useEffect(() => {
    const mq = window.matchMedia(query);
    const apply = () => setMatches(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [query]);

  return useMemo(() => matches, [matches]);
}
