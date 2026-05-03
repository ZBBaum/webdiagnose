"use client"

import { useEffect, useRef } from "react"
import * as THREE from "three"

export function ShaderAnimation() {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<{
    camera: THREE.Camera
    scene: THREE.Scene
    renderer: THREE.WebGLRenderer
    uniforms: { time: { value: number }; resolution: { value: THREE.Vector2 } }
    animationId: number
  } | null>(null)

  useEffect(() => {
    if (!containerRef.current) return
    const container = containerRef.current

    const vertexShader = `
      void main() {
        gl_Position = vec4(position, 1.0);
      }
    `

    const fragmentShader = `
      precision highp float;
      uniform vec2 resolution;
      uniform float time;

      void main(void) {
        vec2 uv = (gl_FragCoord.xy * 2.0 - resolution.xy) / min(resolution.x, resolution.y);
        float t = time * 0.05;
        float lineWidth = 0.0025;

        // Ring animation — cyan channel weights (#06b6d4 palette)
        vec3 rings = vec3(0.0);
        for(int j = 0; j < 3; j++){
          for(int i = 0; i < 5; i++){
            rings[j] += lineWidth * float(i * i) / abs(
              fract(t - 0.01 * float(j) + float(i) * 0.01) * 5.0
              - length(uv)
              + mod(uv.x + uv.y, 0.2)
            );
          }
        }
        vec3 ringColor = vec3(rings[0] * 0.08, rings[1] * 0.75, rings[2] * 0.95);

        // Radial gradient: dark navy center → SiteIQ blue (#2563eb) edges
        float dist = length(uv);
        float fade = smoothstep(0.0, 1.75, dist);
        vec3 bgCenter = vec3(0.008, 0.02, 0.09);  // #020517 — near-black navy
        vec3 bgEdge   = vec3(0.145, 0.388, 0.922); // #2563eb — SiteIQ blue
        vec3 bg = mix(bgCenter, bgEdge, fade);

        // Rings add on top of gradient
        gl_FragColor = vec4(clamp(bg + ringColor, 0.0, 1.0), 1.0);
      }
    `

    const camera = new THREE.Camera()
    camera.position.z = 1

    const scene = new THREE.Scene()
    const geometry = new THREE.PlaneGeometry(2, 2)

    const uniforms = {
      time: { value: 10.0 }, // start mid-animation so rings are visible on frame 1
      resolution: { value: new THREE.Vector2() },
    }

    const material = new THREE.ShaderMaterial({ uniforms, vertexShader, fragmentShader })
    scene.add(new THREE.Mesh(geometry, material))

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setClearColor(new THREE.Color("#020517")) // matches bgCenter
    container.appendChild(renderer.domElement)

    const onWindowResize = () => {
      const width = container.clientWidth
      const height = container.clientHeight
      renderer.setSize(width, height)
      uniforms.resolution.value.x = renderer.domElement.width
      uniforms.resolution.value.y = renderer.domElement.height
    }

    onWindowResize()
    window.addEventListener("resize", onWindowResize, false)

    // Render one frame immediately — eliminates the black flash before rAF fires
    renderer.render(scene, camera)

    sceneRef.current = { camera, scene, renderer, uniforms, animationId: 0 }

    const animate = () => {
      const animationId = requestAnimationFrame(animate)
      uniforms.time.value += 0.05
      renderer.render(scene, camera)
      if (sceneRef.current) sceneRef.current.animationId = animationId
    }
    animate()

    return () => {
      window.removeEventListener("resize", onWindowResize)
      if (sceneRef.current) {
        cancelAnimationFrame(sceneRef.current.animationId)
        if (container && sceneRef.current.renderer.domElement.parentNode === container) {
          container.removeChild(sceneRef.current.renderer.domElement)
        }
        sceneRef.current.renderer.dispose()
        geometry.dispose()
        material.dispose()
      }
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 w-full h-full"
      style={{
        // CSS fallback gradient matches shader output — no black flash before WebGL loads
        background: "radial-gradient(circle at center, #020517 0%, #0c1a4a 50%, #2563eb 100%)",
        overflow: "hidden",
      }}
    />
  )
}
