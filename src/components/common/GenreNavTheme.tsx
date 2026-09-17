'use client';

import { useEffect } from 'react';

/**
 * Mounted once per genre page. Pushes that genre's accent pair onto the
 * global --nav-acc/--nav-acc2 custom properties so the persistent Nav
 * (rendered outside this page's own subtree, so it can't inherit these
 * vars from a wrapper) re-themes itself while this page is active, and
 * reverts to the default gold/violet the moment it unmounts.
 */
export default function GenreNavTheme({ acc, acc2 }: { acc: string; acc2: string }) {
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--nav-acc', acc);
    root.style.setProperty('--nav-acc2', acc2);
    return () => {
      root.style.removeProperty('--nav-acc');
      root.style.removeProperty('--nav-acc2');
    };
  }, [acc, acc2]);

  return null;
}
