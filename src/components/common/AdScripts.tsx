'use client';

/**
 * AdScripts — Monetization Engine
 *
 * Loads ad network scripts for pop-under, banner, video, and push ads.
 * Toggleable via NEXT_PUBLIC_ADS_ENABLED env var.
 *
 * Supported networks (set their IDs in .env.local):
 *   PopAds       — NEXT_PUBLIC_POPADS_ID       (pop-under, $1-3 RPM)
 *   Adsterra     — NEXT_PUBLIC_ADSTERRA_ID      (banner + VAST, $0.5-5 RPM)
 *   PropellerAds — NEXT_PUBLIC_PROPELLERADS_ID  (push + pop, $0.5-3 RPM)
 *   IntelligenceAdx — NEXT_PUBLIC_INTELLIGENCEADX_ID (already in CSP)
 *
 * Usage: <AdScripts /> in root layout
 */

import { useEffect, useRef } from 'react';

// ═══ Config ═══
const ADS_ENABLED = process.env.NEXT_PUBLIC_ADS_ENABLED === 'true';

const POPADS_ID = process.env.NEXT_PUBLIC_POPADS_ID || '2b10b9f44e98bc3f6a9dfa669884297930bd0ae0';
const ADSTERRA_ID = process.env.NEXT_PUBLIC_ADSTERRA_ID || '';
const PROPELLERADS_ID = process.env.NEXT_PUBLIC_PROPELLERADS_ID || '';
const INTELLIGENCEADX_ID = process.env.NEXT_PUBLIC_INTELLIGENCEADX_ID || '';

// ═══ Pop-under trigger (PopAds with anti-adblock) ═══
// Site ID: 5310037 — updated 2026-07-01
function injectPopAds() {
  if (typeof window === 'undefined') return;
  const s = document.createElement('script');
  s.type = 'text/javascript';
  s.setAttribute('data-cfasync', 'false');
  s.innerHTML = `(function(){var a=window,z="c4e022087d618f715bc8450566cf5c61",l=[["siteId",150+86-896+5310697],["minBid",0],["popundersPerIP","0"],["delayBetween",0],["default",false],["defaultPerDay",0],["topmostLayer","auto"]],j=["d3d3LmludGVsbGlnZW5jZWFkeC5jb20vd3JpdmVzY3JpcHQubWluLmNzcw==","ZDJrbHg4N2Jnem5nY2UuY2xvdWRmcm9udC5uZXQvbm5mdEZVL3ludW1lcmFsLm1pbi5qcw==","d3d3Lnd2eGh4d250dXNsZHJ0LmNvbS9hcml2ZXNjcmlwdC5taW4uY3Nz","d3d3Lnd0dW1xbHdxaHcuY29tL0NSL3JudW1lcmFsLm1pbi5qcw=="],e=-1,s,b,d=function(){clearTimeout(b);e++;if(j[e]&&!(1808804666000<(new Date).getTime()&&1<e)){s=a.document.createElement("script");s.type="text/javascript";s.async=!0;var o=a.document.getElementsByTagName("script")[0];s.src="https://"+atob(j[e]);s.crossOrigin="anonymous";s.onerror=d;s.onload=function(){clearTimeout(b);a[z.slice(0,16)+z.slice(0,16)]||d()};b=setTimeout(d,5E3);o.parentNode.insertBefore(s,o)}};if(!a[z]){try{Object.freeze(a[z]=l)}catch(e){}d()}})();`;
  document.head.appendChild(s);
}

// ═══ Adsterra banner ═══
function injectAdsterraBanner(publisherId: string, containerId: string) {
  if (typeof window === 'undefined') return;
  const script = document.createElement('script');
  script.async = true;
  script.setAttribute('data-cfasync', 'false');
  script.src = `//www.highperformancedformats.com/${publisherId}/banner.js?container=${containerId}`;
  document.head.appendChild(script);
}

// ═══ PropellerAds push notifications ═══
function injectPropellerPush(publisherId: string) {
  if (typeof window === 'undefined') return;
  const script = document.createElement('script');
  script.async = true;
  script.src = `//go.propellerads.com/push/${publisherId}/push.js`;
  document.head.appendChild(script);
}

// ═══ Adsterra VAST video pre-roll ═══
function injectAdsterraVAST(publisherId: string, containerId: string) {
  if (typeof window === 'undefined') return;
  const script = document.createElement('script');
  script.async = true;
  script.setAttribute('data-cfasync', 'false');
  script.src = `//www.highperformancedformats.com/${publisherId}/vast.js?container=${containerId}`;
  document.head.appendChild(script);
}

// ═══ IntelligenceAdx (full-stack) ═══
function injectIntelligenceAdx(publisherId: string) {
  if (typeof window === 'undefined') return;
  const script = document.createElement('script');
  script.async = true;
  script.src = `//www.intelligenceadx.com/tag/${publisherId}/tag.js`;
  document.head.appendChild(script);
}

// ═══ Anti-AdBlock detection ═══
function injectAntiAdblock() {
  if (typeof window === 'undefined') return;
  // Lightweight adblock detector — logs to console for analytics
  const testAd = document.createElement('div');
  testAd.className = 'adsbox';
  testAd.style.cssText = 'position:absolute;left:-9999px;height:1px;width:1px';
  document.body.appendChild(testAd);
  setTimeout(() => {
    const isBlocked = testAd.offsetHeight === 0 || testAd.offsetParent === null;
    if (isBlocked) {
      console.log('[Ads] AdBlocker detected');
      // Store for analytics
      try { localStorage.setItem('_ab', '1'); } catch {}
    }
  }, 200);
}

export default function AdScripts() {
  const fired = useRef(false);

  useEffect(() => {
    if (!ADS_ENABLED || fired.current) return;
    fired.current = true;

    // Small delay — let page content load first (better UX)
    const timer = setTimeout(() => {
      // Pop-under (PopAds handles its own frequency capping)
      if (POPADS_ID) {
        injectPopAds();
      }

      // Push notifications (PropellerAds)
      if (PROPELLERADS_ID) {
        injectPropellerPush(PROPELLERADS_ID);
      }

      // IntelligenceAdx full-stack
      if (INTELLIGENCEADX_ID) {
        injectIntelligenceAdx(INTELLIGENCEADX_ID);
      }

      // Anti-adblock detection
      injectAntiAdblock();
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  // Adsterra banners — render in dedicated containers
  useEffect(() => {
    if (!ADS_ENABLED || !ADSTERRA_ID) return;
    const timer = setTimeout(() => {
      // Banner container IDs match the ones rendered in the layout
      injectAdsterraBanner(ADSTERRA_ID, 'ad-banner-top');
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  return null;
}

// ═══ Banner Placeholder Component ═══
// Only renders when a banner-capable ad network (Adsterra) is configured.
// PopAds/Propeller are pop-under/push only — they don't fill banner containers.
// Without a real ad network, this would just be an empty transparent block.
const HAS_BANNER_NETWORK = !!ADSTERRA_ID || !!INTELLIGENCEADX_ID;

export function AdBanner({
  id,
  width = 728,
  height = 90,
  style = {},
  className = '',
}: {
  id: string;
  width?: number;
  height?: number;
  style?: React.CSSProperties;
  className?: string;
}) {
  if (!ADS_ENABLED || !HAS_BANNER_NETWORK) return null;

  return (
    <div
      id={id}
      className={className}
      style={{
        width: '100%',
        maxWidth: width,
        height,
        margin: '16px auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        borderRadius: 8,
        ...style,
      }}
    >
      {/* Ad network populates this container */}
    </div>
  );
}

// ═══ Video Pre-roll Container ═══
export function AdVideoPreroll({ containerId = 'ad-video-preroll' }: { containerId?: string }) {
  if (!ADS_ENABLED || !ADSTERRA_ID) return null;

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      injectAdsterraVAST(ADSTERRA_ID, containerId);
    }, 1500);
    return () => clearTimeout(timer);
  }, [containerId]);

  return (
    <div
      ref={containerRef}
      id={containerId}
      style={{
        width: '100%',
        maxWidth: 640,
        margin: '0 auto',
        minHeight: 1,
        display: 'none', // Hidden until ad loads
      }}
    />
  );
}

// ═══ Ad overlay with close button ═══
export function AdOverlay({ id }: { id: string }) {
  if (!ADS_ENABLED) return null;

  return (
    <div
      id={id}
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 998,
        maxHeight: 100,
        background: 'rgba(7,4,15,0.95)',
        borderTop: '1px solid rgba(255,255,255,0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <button
        onClick={() => {
          const el = document.getElementById(id);
          if (el) el.style.display = 'none';
        }}
        style={{
          position: 'absolute',
          top: -12,
          right: 8,
          width: 24,
          height: 24,
          borderRadius: '50%',
          border: 'none',
          background: '#FF4A4A',
          color: '#fff',
          fontSize: 14,
          cursor: 'pointer',
          zIndex: 1,
        }}
        aria-label="Close ad"
      >
        ×
      </button>
    </div>
  );
}
