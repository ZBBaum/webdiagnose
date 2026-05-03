'use client'

import { useEffect, useRef } from 'react'

export function RadarAnimation() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!

    // Start at 12 o'clock, sweep clockwise
    let angle = -Math.PI / 2
    const SPEED = (2 * Math.PI) / (2.5 * 60) // one revolution per 2.5s at ~60fps
    const TRAIL = (120 * Math.PI) / 180       // 120-degree fade trail
    const TRAIL_FRAC = TRAIL / (2 * Math.PI)  // ~0.333

    let dpr = 1, W = 0, H = 0

    const resize = () => {
      dpr = window.devicePixelRatio || 1
      W = canvas.offsetWidth
      H = canvas.offsetHeight
      canvas.width = W * dpr
      canvas.height = H * dpr
    }

    const draw = () => {
      const cx = W / 2
      const cy = H / 2
      // extend past all corners so arm always reaches the edge
      const maxR = Math.sqrt(cx * cx + cy * cy) + 2

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      // ── background ──────────────────────────────────────────────
      ctx.fillStyle = '#0a0a0f'
      ctx.fillRect(0, 0, W, H)

      // ── concentric circle grid (5% opacity) ─────────────────────
      ctx.lineWidth = 1
      for (let i = 1; i <= 5; i++) {
        ctx.beginPath()
        ctx.arc(cx, cy, (maxR * i) / 5, 0, Math.PI * 2)
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.05)'
        ctx.stroke()
      }

      // ── teal trail (conic gradient sector) ──────────────────────
      const grad = ctx.createConicGradient(angle - TRAIL, cx, cy)
      grad.addColorStop(0,                          'rgba(6, 182, 212, 0)')
      grad.addColorStop(TRAIL_FRAC * 0.45,          'rgba(6, 182, 212, 0.06)')
      grad.addColorStop(TRAIL_FRAC * 0.80,          'rgba(6, 182, 212, 0.22)')
      grad.addColorStop(TRAIL_FRAC,                 'rgba(6, 182, 212, 0.55)')
      grad.addColorStop(Math.min(TRAIL_FRAC + 0.004, 0.9999), 'rgba(6, 182, 212, 0)')
      grad.addColorStop(1,                          'rgba(6, 182, 212, 0)')

      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.arc(cx, cy, maxR, angle - TRAIL, angle)
      ctx.closePath()
      ctx.fillStyle = grad
      ctx.fill()

      // ── rotating arm ────────────────────────────────────────────
      ctx.save()
      ctx.shadowColor = '#06b6d4'
      ctx.shadowBlur = 10
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.lineTo(cx + maxR * Math.cos(angle), cy + maxR * Math.sin(angle))
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.9)'
      ctx.lineWidth = 1.5
      ctx.stroke()
      ctx.restore()

      // ── center glow dot ──────────────────────────────────────────
      ctx.save()
      ctx.shadowColor = '#06b6d4'
      ctx.shadowBlur = 28
      const dot = ctx.createRadialGradient(cx, cy, 0, cx, cy, 10)
      dot.addColorStop(0,   'rgba(6, 182, 212, 1)')
      dot.addColorStop(0.45,'rgba(6, 182, 212, 0.7)')
      dot.addColorStop(1,   'rgba(6, 182, 212, 0)')
      ctx.fillStyle = dot
      ctx.beginPath()
      ctx.arc(cx, cy, 10, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()

      angle += SPEED
    }

    let rafId: number
    const animate = () => {
      draw()
      rafId = requestAnimationFrame(animate)
    }

    resize()
    window.addEventListener('resize', resize)
    animate()

    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ background: '#0a0a0f' }}
    />
  )
}
