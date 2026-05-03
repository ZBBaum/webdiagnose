'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'

export function ShaderAnimation() {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<any>(null)

  useEffect(() => {
    if (!containerRef.current) return
    const container = containerRef.current

    const vertexShader = `void main() { gl_Position = vec4(position, 1.0); }`

    const fragmentShader = `
      precision highp float;
      uniform vec2 resolution;
      uniform float time;

      void main(void) {
        vec2 uv = (gl_FragCoord.xy * 2.0 - resolution.xy) / min(resolution.x, resolution.y);

        // speed 0.18 — one full ring cycle ~5.5s at 60fps
        // cycle = 1.0 (ring) + 0.035 (gap) where 0.035 ≈ 0.2 real seconds at this speed
        float phase = mod(time * 0.18, 1.035);
        float t = min(phase, 1.0);
        float inRing = step(phase, 1.0); // 1 during ring, 0 during 0.2s gap

        float ring = 0.007 / abs(t - length(uv) * 0.3);

        // Blend SiteIQ teal (#06b6d4) at ring start → blue (#2563eb) as it expands
        vec3 teal = vec3(0.024, 0.714, 0.831);
        vec3 blue = vec3(0.145, 0.388, 0.922);
        vec3 brandColor = mix(teal, blue, t);

        vec3 color = brandColor * ring * inRing;
        gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
      }
    `

    const camera = new THREE.Camera()
    camera.position.z = 1
    const scene = new THREE.Scene()
    const geometry = new THREE.PlaneGeometry(2, 2)
    const uniforms = { time: { value: 0.0 }, resolution: { value: new THREE.Vector2() } }
    const material = new THREE.ShaderMaterial({ uniforms, vertexShader, fragmentShader })
    scene.add(new THREE.Mesh(geometry, material))
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(window.devicePixelRatio)
    container.appendChild(renderer.domElement)

    const resize = () => {
      renderer.setSize(container.clientWidth, container.clientHeight)
      uniforms.resolution.value.set(renderer.domElement.width, renderer.domElement.height)
    }
    resize()
    window.addEventListener('resize', resize)

    let id: number
    const animate = () => {
      id = requestAnimationFrame(animate)
      uniforms.time.value += 0.016
      renderer.render(scene, camera)
      if (sceneRef.current) sceneRef.current.animationId = id
    }
    sceneRef.current = { renderer, animationId: 0 }
    animate()

    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(id)
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement)
      renderer.dispose()
      geometry.dispose()
      material.dispose()
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className='absolute inset-0 w-full h-full'
      style={{ background: '#000', overflow: 'hidden' }}
    />
  )
}
