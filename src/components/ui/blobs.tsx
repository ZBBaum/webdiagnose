'use client'

import type React from 'react'

export function AnimatedBlobs() {
  const blobStyle = {
    '--border-radius': '115% 140% 145% 110% / 125% 140% 110% 125%',
    '--border-width': '5vmin',
    aspectRatio: '1',
    display: 'block',
    gridArea: 'stack',
    backgroundSize: 'calc(100% + var(--border-width) * 2)',
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'center',
    border: 'var(--border-width) solid transparent',
    borderRadius: 'var(--border-radius)',
    maskImage: 'linear-gradient(transparent, transparent), linear-gradient(black, white)',
    maskClip: 'padding-box, border-box',
    maskComposite: 'intersect',
    mixBlendMode: 'screen' as const,
    height: '62vmin',
    filter: 'blur(0.6vmin)',
  } as React.CSSProperties

  const blobs = [
    { backgroundColor: '#2563eb', backgroundImage: 'linear-gradient(#2563eb, #06b6d4, #2563eb)', transform: 'rotate(30deg) scale(1.03)' },
    { backgroundColor: '#06b6d4', backgroundImage: 'linear-gradient(#06b6d4, #2563eb, #06b6d4)', transform: 'rotate(60deg) scale(0.95)' },
    { backgroundColor: '#1d4ed8', backgroundImage: 'linear-gradient(#1d4ed8, #06b6d4, #1d4ed8)', transform: 'rotate(90deg) scale(0.97)' },
    { backgroundColor: '#0891b2', backgroundImage: 'linear-gradient(#0891b2, #2563eb, #0891b2)', transform: 'rotate(120deg) scale(1.02)' },
  ]

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center overflow-hidden"
      style={{ background: '#0a0a0f' }}
    >
      <div style={{ filter: 'drop-shadow(0 0 14px rgba(6,182,212,0.3))', gridTemplateAreas: "'stack'" }} className="grid">
        <div
          className="grid relative"
          style={{
            gridTemplateAreas: "'stack'",
            gridArea: 'stack',
            animation: 'spin 5s linear infinite',
          }}
        >
          {blobs.map((blob, index) => (
            <span key={index} style={{ ...blobStyle, ...blob }} />
          ))}
        </div>
      </div>
    </div>
  )
}
