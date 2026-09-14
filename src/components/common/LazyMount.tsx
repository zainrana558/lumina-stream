'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * Defers mounting `children` until the wrapper scrolls near the viewport.
 *
 * `loading="lazy"` on an <Image> only defers the network fetch — the DOM
 * node, its layout, and its paint cost (box-shadows, blur placeholders,
 * etc.) still happen immediately on mount. The homepage renders ~16 content
 * rows × 12 cards each (~190 Card components) on first paint; Lighthouse
 * traced most of that cost to Rendering/Style & Layout, not script
 * execution. This defers the actual mount of below-the-fold rows instead,
 * with a generous rootMargin so nothing visibly pops in while scrolling.
 */
export default function LazyMount({
  children,
  minHeight = 320,
}: {
  children: ReactNode;
  minHeight?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (visible) return;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '600px 0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [visible]);

  return (
    <div ref={ref} style={visible ? undefined : { minHeight }}>
      {visible ? children : null}
    </div>
  );
}
