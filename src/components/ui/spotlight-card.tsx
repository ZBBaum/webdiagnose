"use client";

import React, { useEffect, useRef, ReactNode } from 'react';

interface GlowCardProps {
  children: ReactNode;
  className?: string;
  id?: string;
  style?: React.CSSProperties;
}

const GlowCard: React.FC<GlowCardProps> = ({ children, className = '', id, style: styleProp }) => {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const syncPointer = (e: PointerEvent) => {
      const { clientX: x, clientY: y } = e;
      if (cardRef.current) {
        cardRef.current.style.setProperty('--x', x.toFixed(2));
        cardRef.current.style.setProperty('--xp', (x / window.innerWidth).toFixed(2));
        cardRef.current.style.setProperty('--y', y.toFixed(2));
        cardRef.current.style.setProperty('--yp', (y / window.innerHeight).toFixed(2));
      }
    };
    document.addEventListener('pointermove', syncPointer);
    return () => document.removeEventListener('pointermove', syncPointer);
  }, []);

  // Fixed SiteIQ blue hue (220 ≈ #2563eb), spread=0 so it never drifts to purple
  const inlineStyles = {
    '--base': 220,
    '--spread': 0,
    '--radius': '16',
    '--border': '1.5',
    '--backup-border': 'oklch(1 0 0 / 12%)',
    '--size': '300',
    '--outer': '1',
    '--border-size': 'calc(var(--border, 2) * 1px)',
    '--spotlight-size': 'calc(var(--size, 150) * 1px)',
    '--hue': 'calc(var(--base) + (var(--xp, 0) * var(--spread, 0)))',
    // Spotlight fill layer + dark card gradient layered together
    backgroundImage: `
      radial-gradient(
        var(--spotlight-size) var(--spotlight-size) at
        calc(var(--x, 0) * 1px)
        calc(var(--y, 0) * 1px),
        hsl(220 90% 60% / 0.07), transparent
      ),
      linear-gradient(160deg, #111111 0%, #1c1c1c 100%)
    `,
    backgroundSize: 'calc(100% + (2 * var(--border-size))) calc(100% + (2 * var(--border-size)))',
    backgroundPosition: '50% 50%',
    backgroundAttachment: 'fixed',
    border: 'var(--border-size) solid var(--backup-border)',
    borderRadius: '16px',
    position: 'relative' as const,
    touchAction: 'none' as const,
    overflow: 'hidden' as const,
  };

  const css = `
    .siteiq-glow-card::before,
    .siteiq-glow-card::after {
      pointer-events: none;
      content: "";
      position: absolute;
      inset: calc(var(--border-size) * -1);
      border: var(--border-size) solid transparent;
      border-radius: 16px;
      background-attachment: fixed;
      background-size: calc(100% + (2 * var(--border-size))) calc(100% + (2 * var(--border-size)));
      background-repeat: no-repeat;
      background-position: 50% 50%;
      mask: linear-gradient(transparent, transparent), linear-gradient(white, white);
      mask-clip: padding-box, border-box;
      mask-composite: intersect;
    }
    .siteiq-glow-card::before {
      background-image: radial-gradient(
        calc(var(--spotlight-size) * 0.75) calc(var(--spotlight-size) * 0.75) at
        calc(var(--x, 0) * 1px)
        calc(var(--y, 0) * 1px),
        hsl(220 90% 65% / 1), transparent 100%
      );
      filter: brightness(2);
    }
    .siteiq-glow-card::after {
      background-image: radial-gradient(
        calc(var(--spotlight-size) * 0.5) calc(var(--spotlight-size) * 0.5) at
        calc(var(--x, 0) * 1px)
        calc(var(--y, 0) * 1px),
        hsl(0 100% 100% / 0.12), transparent 100%
      );
    }
  `;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <div
        ref={cardRef}
        id={id}
        className={`siteiq-glow-card ${className}`}
        style={{ ...inlineStyles, ...styleProp }}
      >
        {children}
      </div>
    </>
  );
};

export { GlowCard };
