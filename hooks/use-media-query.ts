'use client';

import { useLayoutEffect, useState } from 'react';

/**
 * Subscribes to `window.matchMedia`.
 *
 * The initial value matches SSR and the first client paint (both assume
 * {@link initialMatches}) so hydration never differs. The real breakpoint is applied
 * in `useLayoutEffect` before browser paint when possible.
 */
export function useMediaQuery(query: string, initialMatches = false): boolean {
  const [matches, setMatches] = useState(initialMatches);

  useLayoutEffect(() => {
    const mq = window.matchMedia(query);
    const apply = () => setMatches(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [query]);

  return matches;
}
