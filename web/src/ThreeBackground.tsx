import React, { useEffect, useState } from 'react'
import Background from './Background'

// Dynamically load @react-three/fiber at runtime. If it's not installed,
// fall back to the CSS Background component to avoid Vite import-analysis errors.
export default function ThreeBackground(): JSX.Element {
  const [loaded, setLoaded] = useState<boolean>(false)
  const [R3F, setR3F] = useState<any>(null)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        // Build the package name dynamically to avoid Vite's static import analysis
        const pkg = '@react-three' + '/fiber'
        // @vite-ignore ensures Vite doesn't attempt to pre-resolve this during dev transform
        const mod = await import(/* @vite-ignore */ pkg)
        // minimal runtime check for availability
        if (mounted) {
          setR3F(mod)
          setLoaded(true)
        }
      } catch (err) {
        // library not available — leave loaded=false and fall back
        console.warn('Three.js/react-three/fiber not available, using CSS background fallback')
        if (mounted) setLoaded(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  if (!loaded || !R3F) {
    return <Background />
  }

  const { Canvas, useFrame } = R3F

  // Simple in-file components using the dynamically imported primitives
  function FloatingTorus({ offset = 0, color = '#0ea5e9', pos = [0, 0, 0] as [number, number, number] }) {
    const ref = React.useRef<any>()
    useFrame((state: any, delta: number) => {
      if (ref.current) {
        ref.current.rotation.y += delta * (0.12 + offset * 0.05)
        ref.current.rotation.x = Math.sin(state.clock.elapsedTime * (0.1 + offset * 0.02)) * 0.2
      }
    })
    return (
      // @ts-ignore dynamic
      <mesh ref={ref} rotation={[0.6 + offset * 0.1, 0, 0]} position={pos}>
        {/* @ts-ignore dynamic */}
        <torusBufferGeometry args={[2.2 + offset * 0.6, 0.14 + offset * 0.02, 64, 200]} />
        {/* @ts-ignore dynamic */}
        <meshStandardMaterial color={color} emissive={'#023047'} metalness={0.25} roughness={0.2} />
      </mesh>
    )
  }

  function FloatingSpheres() {
    const refs = React.useRef<any[]>([])
    useFrame((state: any) => {
      refs.current.forEach((r, i) => {
        if (!r) return
        const t = state.clock.elapsedTime * (0.4 + i * 0.05)
        r.position.x = Math.sin(t + i) * (1.4 + i * 0.3)
        r.position.y = Math.cos(t * 0.9 + i) * (0.6 + i * 0.2)
      })
    })
    return (
      // @ts-ignore dynamic
      <group>
        {Array.from({ length: 6 }).map((_, i) => (
          // @ts-ignore dynamic
          <mesh key={i} ref={(el) => (refs.current[i] = el)} position={[Math.sin(i) * 1.5, Math.cos(i) * 0.7, -i * 0.6]}>
            {/* @ts-ignore dynamic */}
            <sphereBufferGeometry args={[0.06 + i * 0.01, 16, 16]} />
            {/* @ts-ignore dynamic */}
            <meshStandardMaterial color="#38bdf8" emissive="#0369a1" metalness={0.1} roughness={0.3} transparent opacity={0.9 - i * 0.08} />
          </mesh>
        ))}
      </group>
    )
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }} aria-hidden>
      {/* @ts-ignore dynamic */}
      <Canvas camera={{ position: [0, 0, 10], fov: 55 }} style={{ width: '100%', height: '100%' }}>
        {/* @ts-ignore dynamic */}
        <fog attach="fog" args={["#021025", 6, 18]} />
        {/* @ts-ignore dynamic */}
        <ambientLight intensity={0.55} />
        {/* @ts-ignore dynamic */}
        <directionalLight position={[5, 5, 6]} intensity={0.6} color="#a5f3fc" />
        <FloatingTorus offset={0} color="#0ea5e9" pos={[0, -0.2, 0]} />
        <FloatingTorus offset={1} color="#60a5fa" pos={[2.2, 0.8, -1.2]} />
        <FloatingTorus offset={-1} color="#38bdf8" pos={[-2.0, 0.6, -1.8]} />
        <FloatingSpheres />
      </Canvas>
    </div>
  )
}
