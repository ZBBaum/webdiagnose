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
      #define TWO_PI 6.2831853072
      #define PI 3.14159265359

      precision highp float;
      uniform vec2 resolution;
      uniform float time;

      void main(void) {
        vec2 uv = (gl_FragCoord.xy * 2.0 - resolution.xy) / min(resolution.x, resolution.y);
        float t = time * 0.05;
        float lineWidth = 0.006;

        vec3 color = vec3(0.0);
        for(int j = 0; j < 1; j++){
          for(int i = 0; i < 5; i++){
            color[j] += lineWidth / abs(fract(t - 0.01*float(j) + float(i)*0.05) * 5.0 - length(uv) + mod(uv.x+uv.y, 0.2));
          }
        }

        gl_FragColor = vec4(color[0] * 0.1, color[0] * 0.5, color[0], 1.0);
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
      uniforms.time.value = (uniforms.time.value + 0.018) % 100.0
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
