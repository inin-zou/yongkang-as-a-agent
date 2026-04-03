import { useEffect, useRef } from 'react'
import * as THREE from 'three'

interface RibbonSceneProps {
  reducedMotion: boolean
  ribbonGroupRef?: React.MutableRefObject<THREE.Group | null>
  canvasRef?: React.RefObject<HTMLCanvasElement | null>
}

/* ---------- Performance tiers ---------- */
interface PerfConfig {
  particleCount: number
  pointsPerLine: number
  anomaly: boolean
  layers: Array<{
    color: THREE.Color
    count: number
    freqScale: number
    ampScale: number
    opacity: number
  }>
}

function getPerformanceConfig(): PerfConfig {
  const w = window.innerWidth

  const PRISM = {
    pink: new THREE.Color(0xff6b9d),
    coral: new THREE.Color(0xff8a65),
    teal: new THREE.Color(0x4dd0e1),
    mint: new THREE.Color(0x69f0ae),
    lavender: new THREE.Color(0xb388ff),
  }

  if (w < 480) {
    return {
      particleCount: 300,
      pointsPerLine: 100,
      anomaly: false,
      layers: [
        { color: PRISM.pink, count: 10, freqScale: 1.0, ampScale: 2.2, opacity: 0.10 },
        { color: PRISM.teal, count: 10, freqScale: 1.5, ampScale: 3.0, opacity: 0.10 },
      ],
    }
  }

  if (w < 768) {
    return {
      particleCount: 500,
      pointsPerLine: 200,
      anomaly: false,
      layers: [
        { color: PRISM.pink, count: 15, freqScale: 1.0, ampScale: 2.2, opacity: 0.10 },
        { color: PRISM.teal, count: 15, freqScale: 1.5, ampScale: 3.0, opacity: 0.10 },
        { color: PRISM.lavender, count: 15, freqScale: 1.4, ampScale: 3.2, opacity: 0.09 },
      ],
    }
  }

  return {
    particleCount: 2000,
    pointsPerLine: 400,
    anomaly: true,
    layers: [
      { color: PRISM.pink, count: 60, freqScale: 1.0, ampScale: 2.2, opacity: 0.10 },
      { color: PRISM.coral, count: 40, freqScale: 1.2, ampScale: 2.0, opacity: 0.08 },
      { color: PRISM.teal, count: 50, freqScale: 1.5, ampScale: 3.0, opacity: 0.10 },
      { color: PRISM.mint, count: 30, freqScale: 1.3, ampScale: 2.8, opacity: 0.07 },
      { color: PRISM.lavender, count: 40, freqScale: 1.4, ampScale: 3.2, opacity: 0.09 },
    ],
  }
}

/* ---------- Ribbon factory ---------- */
function buildRibbonLayer(
  color: THREE.Color,
  numLines: number,
  freqScale: number,
  ampScale: number,
  opacity: number,
  pointsPerLine: number,
): THREE.Line[] {
  const material = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
  const lines: THREE.Line[] = []
  for (let i = 0; i < numLines; i++) {
    const geo = new THREE.BufferGeometry()
    const positions = new Float32Array(pointsPerLine * 3)
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const line = new THREE.Line(geo, material)
    line.userData = {
      index: i,
      points: pointsPerLine,
      phaseOffset: (i / numLines) * Math.PI * 2,
      freqJitter: 1.0 + (i / numLines) * 0.05 * freqScale,
      amp: ampScale,
    }
    lines.push(line)
  }
  return lines
}

/* ---------- Ribbon animation ---------- */
function updateRibbons(
  lines: THREE.Line[],
  baseFreq: number,
  envFreq: number,
  speed: number,
  elapsed: number,
  anomaly: boolean,
) {
  for (const line of lines) {
    const pos = (line.geometry.attributes.position as THREE.BufferAttribute).array as Float32Array
    const d = line.userData
    for (let j = 0; j < d.points; j++) {
      const x = (j / d.points) * 40 - 20
      const envelope = Math.sin(x * envFreq + elapsed * 0.2) * d.amp
      const carrierFreq = baseFreq * d.freqJitter
      let y = envelope * Math.sin(x * carrierFreq + d.phaseOffset + elapsed * speed)
      // Anomaly distortion near center
      if (anomaly) {
        const distToCenter = Math.abs(x + 2.0)
        if (distToCenter < 4.0) {
          const severity = 1.0 - distToCenter / 4.0
          const noise = Math.sin(x * 15.0 + elapsed * 10.0) * severity * 0.8
          y += noise
        }
      }
      pos[j * 3] = x
      pos[j * 3 + 1] = y
      pos[j * 3 + 2] = Math.cos(x + elapsed) * 0.5
    }
    line.geometry.attributes.position.needsUpdate = true
  }
}

/* ---------- Particle shaders ---------- */
const PARTICLE_VERTEX = /* glsl */ `
  attribute float lifetime;
  varying float vAlpha;
  varying vec3 vPosition;
  uniform float uTime;

  void main() {
    vec3 pos = position;
    float centerDist = abs(pos.x);
    float rise = fract(lifetime + uTime * 0.1) * 6.0;
    if (centerDist < 4.0) {
      pos.y += rise * (1.0 - centerDist / 4.0);
    }
    vAlpha = sin(fract(lifetime + uTime * 0.1) * 3.14159);
    vAlpha *= smoothstep(8.0, 0.0, centerDist);
    vPosition = pos;
    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = 2.0 * (10.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`

const PARTICLE_FRAGMENT = /* glsl */ `
  varying float vAlpha;
  varying vec3 vPosition;
  uniform float uTime;

  void main() {
    float dist = length(gl_PointCoord - vec2(0.5));
    if (dist > 0.5) discard;
    float glow = smoothstep(0.5, 0.0, dist);

    // Prismatic spectral ramp
    float t = sin(vPosition.x * 0.5 + uTime * 0.3) * 0.5 + 0.5;
    vec3 pink = vec3(1.0, 0.42, 0.62);
    vec3 coral = vec3(1.0, 0.54, 0.40);
    vec3 teal = vec3(0.30, 0.82, 0.88);
    vec3 mint = vec3(0.41, 0.94, 0.68);
    vec3 lavender = vec3(0.70, 0.53, 1.0);

    vec3 color = mix(pink, coral, smoothstep(0.0, 0.25, t));
    color = mix(color, teal, smoothstep(0.25, 0.5, t));
    color = mix(color, mint, smoothstep(0.5, 0.75, t));
    color = mix(color, lavender, smoothstep(0.75, 1.0, t));

    gl_FragColor = vec4(color, vAlpha * glow * 0.8);
  }
`

/* ---------- Component ---------- */
export default function RibbonScene({ reducedMotion, ribbonGroupRef, canvasRef }: RibbonSceneProps) {
  const internalCanvasRef = useRef<HTMLCanvasElement>(null)
  const activeCanvas = canvasRef ?? internalCanvasRef

  useEffect(() => {
    const canvas = activeCanvas.current
    if (!canvas) return

    const config = getPerformanceConfig()

    /* ---- Renderer ---- */
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

    /* ---- Scene + Camera ---- */
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x1a1a1a)

    const frustumSize = 12
    const aspect = window.innerWidth / window.innerHeight
    const camera = new THREE.OrthographicCamera(
      (frustumSize * aspect) / -2,
      (frustumSize * aspect) / 2,
      frustumSize / 2,
      frustumSize / -2,
      0.1,
      1000,
    )
    camera.position.z = 10

    /* ---- Ribbon group ---- */
    const ribbonGroup = new THREE.Group()
    scene.add(ribbonGroup)
    if (ribbonGroupRef) {
      ribbonGroupRef.current = ribbonGroup
    }

    // Build layers
    const allRibbonSets: Array<{ lines: THREE.Line[]; baseFreq: number; envFreq: number; speed: number }> = []
    const freqConfigs = [
      { baseFreq: 5.0, envFreq: 0.30, speed: 1.5 },
      { baseFreq: 4.5, envFreq: 0.28, speed: 1.3 },
      { baseFreq: 4.0, envFreq: 0.25, speed: 1.0 },
      { baseFreq: 4.2, envFreq: 0.27, speed: 1.1 },
      { baseFreq: 3.8, envFreq: 0.23, speed: 0.9 },
    ]

    config.layers.forEach((layer, idx) => {
      const lines = buildRibbonLayer(
        layer.color,
        layer.count,
        layer.freqScale,
        layer.ampScale,
        layer.opacity,
        config.pointsPerLine,
      )
      lines.forEach((l) => ribbonGroup.add(l))
      const fc = freqConfigs[idx % freqConfigs.length]
      allRibbonSets.push({ lines, ...fc })
    })

    /* ---- Particles ---- */
    const particleGeo = new THREE.BufferGeometry()
    const particlePositions = new Float32Array(config.particleCount * 3)
    const particleLifetimes = new Float32Array(config.particleCount)

    for (let i = 0; i < config.particleCount; i++) {
      particlePositions[i * 3] = (Math.random() - 0.5) * 40
      particlePositions[i * 3 + 1] = (Math.random() - 0.5) * 2 - 2
      particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 2
      particleLifetimes[i] = Math.random()
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3))
    particleGeo.setAttribute('lifetime', new THREE.BufferAttribute(particleLifetimes, 1))

    const particleMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
      },
      vertexShader: PARTICLE_VERTEX,
      fragmentShader: PARTICLE_FRAGMENT,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })

    const pointCloud = new THREE.Points(particleGeo, particleMaterial)
    scene.add(pointCloud)

    /* ---- Resize handler ---- */
    const handleResize = () => {
      const newAspect = window.innerWidth / window.innerHeight
      camera.left = (frustumSize * newAspect) / -2
      camera.right = (frustumSize * newAspect) / 2
      camera.top = frustumSize / 2
      camera.bottom = frustumSize / -2
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
    }
    window.addEventListener('resize', handleResize)

    /* ---- Animation loop ---- */
    const clock = new THREE.Clock()
    let animationId: number

    function animate() {
      animationId = requestAnimationFrame(animate)
      const elapsed = clock.getElapsedTime()

      if (!reducedMotion) {
        for (const set of allRibbonSets) {
          updateRibbons(set.lines, set.baseFreq, set.envFreq, set.speed, elapsed, config.anomaly)
        }
        particleMaterial.uniforms.uTime.value = elapsed
      }

      renderer.render(scene, camera)
    }

    // If reduced motion, render one static frame then stop
    if (reducedMotion) {
      for (const set of allRibbonSets) {
        updateRibbons(set.lines, set.baseFreq, set.envFreq, 0, 0, false)
      }
      renderer.render(scene, camera)
    } else {
      animate()
    }

    /* ---- Cleanup ---- */
    return () => {
      cancelAnimationFrame(animationId)
      window.removeEventListener('resize', handleResize)

      // Dispose all Three.js resources
      ribbonGroup.traverse((obj) => {
        if (obj instanceof THREE.Line || obj instanceof THREE.Points) {
          obj.geometry.dispose()
          if (obj.material instanceof THREE.Material) obj.material.dispose()
        }
      })
      pointCloud.geometry.dispose()
      particleMaterial.dispose()

      renderer.dispose()
      renderer.forceContextLoss()

      if (ribbonGroupRef) {
        ribbonGroupRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reducedMotion])

  return (
    <canvas
      ref={activeCanvas as React.RefObject<HTMLCanvasElement>}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 0,
      }}
    />
  )
}
