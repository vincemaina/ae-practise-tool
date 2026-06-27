import { useCallback, useEffect, useState } from 'react';

/** Minimal hash router (no dep): `#/` = list, `#/q/<slug>` = solve. Gives
 *  back-button support + shareable links without pulling in react-router. */
function current(): string {
  return window.location.hash.replace(/^#/, '') || '/';
}

export function useRoute(): { path: string; navigate: (to: string) => void } {
  const [path, setPath] = useState<string>(current);

  useEffect(() => {
    const onHash = () => setPath(current());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const navigate = useCallback((to: string) => {
    setPath(to); // update synchronously so the view switches immediately
    if (current() !== to) window.location.hash = to;
    try {
      window.scrollTo({ top: 0 });
    } catch {
      // jsdom doesn't implement scrollTo
    }
  }, []);

  return { path, navigate };
}
