import { useEffect, useRef, useState } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { VIEW_W, VIEW_H, SLICE_U } from './palette'
import { sceneImages, loadSceneImages } from './sceneTextures'
import { createStretchRenderer, rasterize, NOW_RULE_ROWS, sampleCollapseBand, splitEdges } from './pixelStretch'
import { EconomicsInk, TransformerInk, DeskInk, ContinueInk } from './StudyInk'
import './intro.css'

gsap.registerPlugin(ScrollTrigger, useGSAP)

type Lang = 'en' | 'zh'
// Short place/time markers, not narration. English is the default.
const captionsByLang: Record<Lang, string[]> = {
  en: ['1999 · Nanjing', '1999–2018 · Nanjing', '2018 · Leaving', 'Nanjing → Paris', '2019 · Paris', 'Economics → AI', '2026 · Paris'],
  zh: ['1999 · 南京', '1999–2018 · 南京', '2018 · 出发', '南京 → 巴黎', '2019 · 巴黎', '经济学 → AI', '2026 · 巴黎'],
}
const shotsByLang: Record<Lang, string[]> = {
  en: ['01 Depart', '02 Look', '03 Reach', '04 Cross', '05 Arrive', '06 Turn', '07 Continue', '08 Now'],
  zh: ['01 出发', '02 观看', '03 试探', '04 跨越', '05 抵达', '06 转向', '07 继续', '08 当下'],
}
// Play mode runs the 24-unit timeline in 15 s.
const PLAY_SPEED = 1.6
// Both authored layers contain solid blue around this shared scene-space joint.
const HIP = '688 324'
const shots = shotsByLang.en.slice(0, 7)
const captions = captionsByLang.en
const shotNumbers = [1, 2, 3, 4, 5, 6, 7]
const shotStarts = [0, 3, 6, 9, 12.5, 15.4, 18.4, 21.4]
const passageOffset = 6
const identityStart = 22.9
const motionQuery = '(prefers-reduced-motion: reduce)'

// Full-canvas pose images keep the authored crop and shared bottom anchor.
function PoseLayers({ from, to, className, still }: {
  from: string; to: string; className: string; still: boolean
}) {
  return <g className={className}>
    {!still && <g data-pose="from"><Environment src={from} /></g>}
    <g data-pose="to" opacity={still ? 1 : 0}><Environment src={to} /></g>
  </g>
}

function Environment({ src }: { src: string }) {
  return <image href={src} width={VIEW_W} height={VIEW_H} preserveAspectRatio="xMidYMid slice" />
}

function StaticCrossing() {
  // Mid split: original halves remain visible; Paris is still closed.
  const halfGap = VIEW_W * 0.3
  const centre = VIEW_W / 2
  return <>
    <defs>
      <clipPath id="intro-static-left"><rect width={centre - halfGap} height={VIEW_H} /></clipPath>
      <clipPath id="intro-static-right"><rect x={centre + halfGap} width={centre - halfGap} height={VIEW_H} /></clipPath>
      <clipPath id="intro-static-paris"><rect x={centre} width={0} height={VIEW_H} /></clipPath>
      {['left', 'right'].map((side, i) => <clipPath key={side} id={`intro-static-bands-${side}`}>
        <rect x={centre - halfGap + i * halfGap} width={halfGap} height={VIEW_H} />
      </clipPath>)}
    </defs>
    <g clipPath="url(#intro-static-left)"><g transform={`translate(${-halfGap} 0)`}><Environment src={sceneImages.nanjing} /></g></g>
    <g clipPath="url(#intro-static-right)"><g transform={`translate(${halfGap} 0)`}><Environment src={sceneImages.nanjing} /></g></g>
    {['left', 'right'].map((side, i) => <g key={side} clipPath={`url(#intro-static-bands-${side})`}>
      <g transform={`translate(${centre - halfGap + i * halfGap - (centre - 1 + i) * halfGap} 0) scale(${halfGap} 1)`}><Environment src={sceneImages.nanjing} /></g>
    </g>)}
    <g clipPath="url(#intro-static-paris)"><Environment src={sceneImages.paris} /></g>
  </>
}

function Scene({ shot, still = false }: { shot: number; still?: boolean }) {
  return <svg className={`intro-scene intro-shot0${shot}`} viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} aria-hidden="true">
    {shot === 1 && <g className="intro-camera01">
      <Environment src={sceneImages.departBackground} />
      <g className="intro-walk01">
        <g className="intro-leg01"><Environment src={sceneImages.departLeg} /></g>
        <g className="intro-body01"><Environment src={sceneImages.departBody} /></g>
      </g>
    </g>}
    {shot === 2 && <>
      <g className="intro-background02"><Environment src={sceneImages.lookBackground} /></g>
      <g className="intro-shoulder02"><Environment src={sceneImages.lookShoulder} /></g>
      <text className="intro-arrow02" x="1100" y="855" fontSize="80" fill="#242421">→</text>
    </>}
    {shot === 3 && <>
      {!still && <Environment src={sceneImages.nanjing} />}
      <g className="intro-camera03">
        <g className="intro-wall03"><Environment src={sceneImages.wall} /></g>
        <g className="intro-contact03">
          <PoseLayers from={sceneImages.reaching} to={sceneImages.touch} still={still} className="intro-hand03" />
        </g>
      </g>
    </>}
    {shot === 4 && <>
      {still && <StaticCrossing />}
      <g className="intro-hand04-left"><Environment src={sceneImages.leftHand} /></g>
      <g className="intro-hand04-right"><Environment src={sceneImages.rightHand} /></g>
    </>}
    {shot === 5 && <>
      <g className="intro-camera05">
        <g className="intro-tower05"><Environment src={sceneImages.arrivalSky} /></g>
        <g className="intro-arch05"><Environment src={sceneImages.arrivalArch} /></g>
        <PoseLayers from={sceneImages.arrivalRest} to={sceneImages.arrivalReach} still={still} className="intro-hand05" />
      </g>
    </>}
    {shot === 6 && <>
      <g className="intro-book06">
        {!still && <g className="intro-econ06" data-held-object="econ">
          <Environment src={sceneImages.studyEcon} /><DeskInk ai={false} /><EconomicsInk />
        </g>}
        <g className="intro-ai06" data-held-object="ai" opacity={still ? 1 : 0}>
          <Environment src={sceneImages.studyAI} /><DeskInk ai /><TransformerInk />
        </g>
      </g>
      <g className="intro-hands06"><g transform="translate(0 125)"><Environment src={sceneImages.studyHands} /></g></g>
      <g className="intro-head06"><g transform="translate(200 225) scale(.75)"><Environment src={sceneImages.studyHead} /></g></g>
    </>}
    {shot === 7 && <>
      <defs>
        <clipPath id="intro-half07-clip-left"><rect width={VIEW_W / 2} height={VIEW_H} /></clipPath>
        <clipPath id="intro-half07-clip-right"><rect x={VIEW_W / 2} width={VIEW_W / 2} height={VIEW_H} /></clipPath>
      </defs>
      {['left', 'right'].map(side => <g key={side} className={`intro-half07-${side}`}>
        <g clipPath={`url(#intro-half07-clip-${side})`}>
          <g className="intro-camera07"><Environment src={sceneImages.continueStudy} /><ContinueInk /></g>
        </g>
      </g>)}
    </>}
  </svg>
}

function NowRules() {
  return <svg className="intro-now-rules" viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} aria-hidden="true">
    {NOW_RULE_ROWS.map(row => <line className="intro-now-rule" key={row} x1="128" x2="1472"
      y1={sampleCollapseBand(row, 1).y * VIEW_H} y2={sampleCollapseBand(row, 1).y * VIEW_H} />)}
  </svg>
}

function EndCard() {
  return <div className="intro-identity"><h1>yongkang zou</h1><p>ai engineer. agents, voice, and music.</p><a href="/files/soul">explore my work →</a></div>
}

function StaticIntro() {
  return <main className="intro-root intro-static">
    <nav className="intro-static-nav"><span>Nanjing → Paris</span><a className="intro-skip" href="/files/soul">skip to work <span className="intro-skip-arrow">→</span></a></nav>
    {shots.map((shot, index) => <figure key={shot}>
      <div className="intro-keyframe"><Scene shot={shotNumbers[index]} still /></div>
      <figcaption><span>{shot}</span><p>{captions[index]}</p></figcaption>
    </figure>)}
    <section className="intro-static-now"><NowRules /><EndCard /></section>
  </main>
}

function AnimatedIntro() {
  const rootRef = useRef<HTMLElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const nowCanvasRef = useRef<HTMLCanvasElement>(null)
  const settling = useRef({ gap: 0, reveal: 1, collapse: 0 })
  const renderRef = useRef<(() => void) | null>(null)
  const stretch = useRef({ gap: 0, reveal: 1 })
  const [ready, setReady] = useState(false)
  const [loadFailed, setLoadFailed] = useState(false)
  const [mode, setMode] = useState<'scroll' | 'play'>('scroll')
  const shotLabelRef = useRef<HTMLSpanElement>(null)
  const progressBarRef = useRef<HTMLElement>(null)
  const captionRef = useRef<HTMLParagraphElement>(null)
  const [lang, setLang] = useState<Lang>('en')
  const langRef = useRef<Lang>('en')
  const shotIndexRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current!
    const renderer = createStretchRenderer(canvas)
    const nowCanvas = nowCanvasRef.current!
    const nowRenderer = createStretchRenderer(nowCanvas)
    let version = 0
    let disposed = false
    const leftHalf = rootRef.current!.querySelector('.intro-half07-left')!
    const rightHalf = rootRef.current!.querySelector('.intro-half07-right')!
    const draw = () => {
      const width = nowCanvas.width || VIEW_W
      const edges = splitEdges(width, settling.current.gap)
      gsap.set(leftHalf, { x: edges.leftShift / width * VIEW_W })
      gsap.set(rightHalf, { x: edges.rightShift / width * VIEW_W })
      renderer?.render(stretch.current)
      nowRenderer?.render(settling.current)
    }
    renderRef.current = draw
    const images = loadSceneImages()
    let initialized = false
    const resize = async () => {
      const ticket = ++version
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const width = Math.max(1, Math.round(canvas.clientWidth * dpr))
      const height = Math.max(1, Math.round(canvas.clientHeight * dpr))
      try {
        const [nanjing, paris, study] = await images
        if (disposed || ticket !== version) return
        if (!renderer) {
          if (!disposed) setReady(true)
          return
        }
        const scenes = await Promise.all([rasterize(nanjing, width, height), rasterize(paris, width, height)])
        if (disposed || ticket !== version) return
        canvas.width = width
        canvas.height = height
        renderer.setScenes(...scenes)
        const studyTexture = await rasterize(study, width, height)
        if (disposed || ticket !== version) return
        // Match the settled 07 camera about its scene-space origin (1100, 750).
        const zoomed = document.createElement('canvas')
        zoomed.width = width
        zoomed.height = height
        const context = zoomed.getContext('2d')!
        context.translate(1100 / VIEW_W * width, 750 / VIEW_H * height)
        context.scale(1.025, 1.025)
        context.translate(-1100 / VIEW_W * width, -750 / VIEW_H * height)
        context.drawImage(studyTexture, 0, 0)
        nowCanvas.width = width
        nowCanvas.height = height
        nowRenderer?.setScenes(zoomed, zoomed)
        draw()
        canvas.style.opacity = '1'
        if (!initialized) { initialized = true; setReady(true) }
      } catch {
        // Keep the loading error readable; never start a partially decoded scene.
        if (!disposed && ticket === version) {
          canvas.style.opacity = '0'
          if (!initialized) setLoadFailed(true)
        }
      }
    }
    const observer = new ResizeObserver(() => { void resize() })
    observer.observe(canvas)
    void resize()
    return () => {
      disposed = true
      observer.disconnect()
      renderRef.current = null
      renderer?.dispose()
      nowRenderer?.dispose()
    }
  }, [])

  useGSAP(() => {
    if (!ready) return
    const stage = stageRef.current!
    const root = rootRef.current!
    // useGSAP owns the timeline and its trigger, reverting both on mode changes
    // and StrictMode remounts. Only children of the pinned stage are animated.
    Object.assign(stretch.current, { gap: 0, reveal: 1 })
    Object.assign(settling.current, { gap: 0, reveal: 1, collapse: 0 })
    const passage = gsap.timeline({ defaults: { ease: 'none' } })
    passage.addLabel('touch', 0).addLabel('crossing', 3).addLabel('arrival', 6.5)
    const crossfade = (selector: string, at: number, duration: number, driver = passage) => {
      gsap.set(`${selector} [data-pose="from"]`, { autoAlpha: 1 })
      gsap.set(`${selector} [data-pose="to"]`, { autoAlpha: 0 })
      // Both poses inherit the same motion group; retire the outgoing pose
      // early so its silhouette cannot linger behind the settled hand.
      driver.to(`${selector} [data-pose="from"]`, { autoAlpha: 0, duration: duration * 0.35, ease: 'power2.in' }, at)
      driver.to(`${selector} [data-pose="to"]`, { autoAlpha: 1, duration: duration * 0.5, ease: 'power2.inOut' }, at)
    }
    gsap.set('.intro-shot01', { autoAlpha: 1 })
    gsap.set('.intro-shot02, .intro-shot03', { autoAlpha: 0 })
    gsap.set('.intro-shot04, .intro-shot05, .intro-shot06, .intro-shot07, .intro-end', { autoAlpha: 0 })
    // The source crop already carries the ~10° tilt; do not tilt it twice.
    gsap.set('.intro-camera03', { rotation: -3, scale: 1.03, opacity: 1, svgOrigin: '800 450' })
    gsap.set('.intro-wall03', { opacity: 1 })
    gsap.set('.intro-contact03', { x: 0, y: 0, scale: 1, svgOrigin: '0 0' })
    gsap.set('.intro-camera05', { y: 35, scale: 1.08, svgOrigin: '800 450' })
    // Intent → extension → contact hold. Scene and hand share the camera.
    crossfade('.intro-hand03', 0.45, 1.35)
    gsap.set('.intro-hand03', { x: -30, y: 35, svgOrigin: '0 900' })
    passage.to('.intro-hand03', { x: -3, y: 0, duration: 1.1, ease: 'power2.inOut' }, 0.45)
    passage.to('.intro-hand03', { x: 0, duration: 0.25, ease: 'power3.out' }, 1.55)
    passage.to('.intro-camera03', { rotation: 0, scale: 1, duration: 1, ease: 'power3.out' }, 1.6)
    // Scale the authored fingertip (1300, 280) about its final wall contact
    // (SLICE_U * VIEW_W, 450), preserving that point as the hand grows.
    const contactScale = 0.73
    passage.to('.intro-contact03', { x: SLICE_U * VIEW_W - 1300 * contactScale, y: 450 - 280 * contactScale, scale: contactScale, duration: 0.8, ease: 'power3.inOut' }, 1.8)
    // Pull out into the exact level texture before the stretch pass takes over.
    passage.to('.intro-wall03', { opacity: 0, duration: 0.7 }, 1.9)
    // Camera is level before any pixels stretch; contact lasts until t=3.
    // Timed sets capture the baseline above and restore it on reverse seeks.
    // Keep these as timeline children, not directional onEnter callbacks.
    passage.set('.intro-shot03', { autoAlpha: 0 }, 'crossing')
    passage.set('.intro-shot04', { autoAlpha: 1 }, 'crossing')
    gsap.set('.intro-hand04-left', { x: 0, y: 150, opacity: 0 })
    gsap.set('.intro-hand04-right', { x: 0, y: 190, opacity: 0 })
    passage.fromTo('.intro-hand04-left', { y: 150, opacity: 0 }, { y: -8, opacity: 1, duration: 0.5, immediateRender: false, ease: 'power2.out' }, 3)
    passage.fromTo('.intro-hand04-right', { y: 190, opacity: 0 }, { y: -10, opacity: 1, duration: 0.6, immediateRender: false, ease: 'power2.out' }, 3.25)
    passage.to('.intro-hand04-left', { y: 0, duration: 0.2, ease: 'power3.out' }, 3.5)
    passage.to('.intro-hand04-right', { y: 0, duration: 0.2, ease: 'power3.out' }, 3.85)
    passage.to(stretch.current, { gap: 1.2, duration: 2.1 }, 3)
    passage.to(stretch.current, { reveal: 0, duration: 1.6 }, 4.9)
    passage.to('.intro-hand04-left', { x: -VIEW_W * 0.6, duration: 2.1 }, 3)
    passage.to('.intro-hand04-right', { x: VIEW_W * 0.6, duration: 2.1 }, 3)
    passage.set('.intro-shot04', { autoAlpha: 0 }, 'arrival')
    passage.set('.intro-shot05', { autoAlpha: 1 }, 'arrival')
    passage.to('.intro-camera05', { y: 0, scale: 1, duration: 2.5, ease: 'power2.out' }, 6.5)
    gsap.set('.intro-tower05', { y: 6 })
    gsap.set('.intro-arch05', { y: 24, scale: 1.025, svgOrigin: '800 0' })
    passage.to('.intro-tower05', { y: 0, duration: 2.5, ease: 'power2.out' }, 6.5)
    passage.to('.intro-arch05', { y: -12, scale: 1, duration: 2.5, ease: 'power2.out' }, 6.5)
    crossfade('.intro-hand05', 6.85, 1.6)
    gsap.set('.intro-hand05', { y: 30, rotation: -3, svgOrigin: '480 900' })
    passage.to('.intro-hand05', { y: 0, rotation: 0, duration: 1.6, ease: 'power2.inOut' }, 6.85)

    // Preserve the approved 03→04→05 choreography at local times 0–9.4.
    const timeline = gsap.timeline({ paused: true, defaults: { ease: 'none' } })
    timeline.addLabel('depart', 0).addLabel('look', 3).addLabel('touch', passageOffset)
      .addLabel('crossing', passageOffset + 3).addLabel('arrival', passageOffset + 6.5)
      .addLabel('turn', 15.4).addLabel('continue', 18.4).addLabel('identity', identityStart)
    gsap.set('.intro-camera01', { y: 0, scale: 1.06, svgOrigin: '800 450' })
    gsap.set('.intro-walk01', { x: -35, y: 12 })
    gsap.set('.intro-body01', { x: 0, y: 0, svgOrigin: HIP })
    gsap.set('.intro-leg01', { x: 0, y: 0, rotation: 12, scale: 0.92, svgOrigin: HIP })
    timeline.to('.intro-walk01', { x: 300, y: 0, duration: 1.25, ease: 'power2.inOut' }, 0.35)
    timeline.to('.intro-leg01', { rotation: -12, scale: 1.08, duration: 1.25, ease: 'power2.inOut' }, 0.35)
    timeline.to('.intro-camera01', { y: 65, scale: 1.18, duration: 1, ease: 'power2.inOut' }, 1.65)
    timeline.set('.intro-shot01', { autoAlpha: 0 }, 3)
    timeline.set('.intro-shot02', { autoAlpha: 1 }, 3)
    gsap.set('.intro-background02', { scale: 1, svgOrigin: '1120 500' })
    gsap.set('.intro-shoulder02', { scale: 1, svgOrigin: '0 900' })
    gsap.set('.intro-arrow02', { x: 0 })
    timeline.to('.intro-background02', { scale: 1.1, duration: 2.3, ease: 'power2.inOut' }, 3.3)
    timeline.to('.intro-shoulder02', { scale: 1.24, duration: 2.3, ease: 'power2.inOut' }, 3.3)
    timeline.to('.intro-arrow02', { x: 35, duration: 0.7, ease: 'power2.inOut' }, 4.7)
    timeline.set('.intro-shot02', { autoAlpha: 0 }, passageOffset)
    timeline.set('.intro-shot03', { autoAlpha: 1 }, passageOffset)
    timeline.add(passage, passageOffset)
    timeline.set('.intro-shot05', { autoAlpha: 0 }, 15.4)
    timeline.set('.intro-shot06', { autoAlpha: 1 }, 15.4)
    // One shared hand/head pair; camera and character registration stay fixed across the desk cut.
    gsap.set('.intro-hands06, .intro-head06', { x: 0, y: 0, rotation: 0, scale: 1 })
    gsap.set('.intro-econ06', { autoAlpha: 1 })
    gsap.set('.intro-ai06', { autoAlpha: 0 })
    gsap.set('.intro-pareto-trace, .intro-transformer-stroke', { strokeDasharray: 1, strokeDashoffset: 1 })
    timeline.to('.intro-pareto-trace', { strokeDashoffset: 0, duration: 0.8 }, 15.6)
    // Atomic match cut: no blend/empty interval. Outgoing is retired immediately,
    // within the first 35% rule; timeline sets restore both states when reversed.
    timeline.set('.intro-econ06', { autoAlpha: 0 }, 16.5)
    timeline.set('.intro-ai06', { autoAlpha: 1 }, 16.5)
    timeline.to('.intro-transformer-stroke', { strokeDashoffset: 0, duration: 0.26, stagger: 0.045 }, 16.6)
    timeline.set('.intro-shot06', { autoAlpha: 0 }, 18.4)
    timeline.set('.intro-shot07', { autoAlpha: 1 }, 18.4)
    gsap.set('.intro-camera07', { scale: 1, svgOrigin: '1100 750' })
    // Move the full wide composition and its ink together; hands stay on the keys.
    timeline.to('.intro-camera07', { scale: 1.025, duration: 1.25, ease: 'power2.inOut' }, 18.85)
    gsap.set('.intro-half07-left, .intro-half07-right', { x: 0 })
    gsap.set('.intro-now-surface', { autoAlpha: 0 })
    timeline.set('.intro-now-surface', { autoAlpha: 1 }, 21.4)
    timeline.to(settling.current, { gap: 1, duration: 1.2 }, 21.4)
    timeline.to(settling.current, { collapse: 1, duration: 1 }, 22.4)
    timeline.fromTo('.intro-end', { clipPath: 'inset(0 50% 0 50%)' },
      { clipPath: 'inset(0 0% 0 0%)', autoAlpha: 1, duration: 0.9 }, identityStart)
    timeline.to({}, { duration: 0.2 }, 23.8)
    const label = shotLabelRef.current!
    const bar = progressBarRef.current!
    const caption = captionRef.current!
    let lastShot = -1
    let lastCaptionVisibility = ''
    const updateFrame = () => {
      const progress = timeline.progress()
      const labelIndex = shotStarts.reduce((last, start, index) => timeline.time() >= start ? index : last, 0)
      const shotIndex = Math.min(labelIndex, shots.length - 1)
      renderRef.current?.()
      // DOM writes only; no layout reads or React commits on the frame path.
      bar.style.transform = `scaleX(${progress})`
      stage.dataset.time = timeline.time().toFixed(3)
      if (labelIndex !== lastShot) {
        label.textContent = shotsByLang[langRef.current][labelIndex]
        caption.textContent = captionsByLang[langRef.current][shotIndex]
        shotIndexRef.current = labelIndex
        lastShot = labelIndex
      }
      const visibility = timeline.time() >= identityStart ? 'hidden' : 'visible'
      if (visibility !== lastCaptionVisibility) {
        caption.style.visibility = visibility
        lastCaptionVisibility = visibility
      }
    }
    timeline.eventCallback('onUpdate', updateFrame)
    timeline.pause(0)
    if (mode === 'scroll') {
      const driver = ScrollTrigger.create({
        id: 'journey-intro', trigger: stage, pin: stage,
        start: 'top top', end: () => `+=${window.innerHeight * 12}`,
        pinSpacing: true, pinType: 'fixed', anticipatePin: 0,
        scrub: true, animation: timeline,
        onRefresh: updateFrame,
      })
      driver.refresh()
    } else {
      window.scrollTo({ top: root.offsetTop, behavior: 'instant' })
      timeline.timeScale(PLAY_SPEED).play(0)
    }
    // Initial seeks and refreshes can suppress callbacks; publish once after
    // setup so labels and the GPU also match a restored scroll position.
    updateFrame()
  }, { scope: rootRef, dependencies: [mode, ready], revertOnUpdate: true })

  return <main ref={rootRef} className={`intro-root intro-mode-${mode}`}>
    <div ref={stageRef} className="intro-stage">
      <div className="intro-art" aria-hidden="true" style={{ visibility: ready ? 'visible' : 'hidden' }}>
        <svg className="intro-scene intro-backdrop" viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}><Environment src={sceneImages.paris} /></svg>
        <canvas ref={canvasRef} className="intro-canvas" />
        <div className="intro-now-surface"><NowRules /><canvas ref={nowCanvasRef} className="intro-now-canvas" /></div>
        {shotNumbers.map(shot => <Scene key={shot} shot={shot} />)}
      </div>
      <p className="intro-loading" role="status" hidden={ready}>{loadFailed ? 'Images could not load. Reload to retry, or skip to work.' : 'Loading scenes…'}</p>
      <div className="intro-end"><EndCard /></div>
      <nav className="intro-hud" aria-label="Intro controls">
        <div className="intro-caption-unit">
          <div className="intro-caption-chip" lang={lang}>
            <span className="intro-hud-shot" ref={shotLabelRef}>{shots[0]}</span>
            <p ref={captionRef} className="intro-cap" lang={lang}>{captionsByLang.en[0]}</p>
            <span className="intro-caption-progress" aria-hidden="true"><i ref={progressBarRef} style={{ width: '100%', transform: 'scaleX(0)', transformOrigin: 'left center' }} /></span>
          </div>
        </div>
        <button type="button" disabled={!ready} onClick={() => {
          setMode(mode === 'scroll' ? 'play' : 'scroll')
        }}>{mode === 'scroll' ? 'mode: scroll' : 'mode: play'}</button>
        <button type="button" aria-label="Caption language" onClick={() => {
          const next: Lang = lang === 'en' ? 'zh' : 'en'
          langRef.current = next
          setLang(next)
          // Rewrite the visible caption immediately; the frame loop only writes on shot changes.
          const index = shotIndexRef.current
          if (shotLabelRef.current) shotLabelRef.current.textContent = shotsByLang[next][index]
          if (captionRef.current) captionRef.current.textContent = captionsByLang[next][Math.min(index, 6)]
        }}>{lang === 'en' ? 'EN / 中' : '中 / EN'}</button>
        <a className="intro-skip" href="/files/soul">skip to work <span className="intro-skip-arrow">→</span></a>
      </nav>
    </div>
  </main>
}

export default function IntroLab() {
  // Default to static content until the client-side media setup runs. React
  // state changes only with the preference; per-frame updates stay in refs.
  const [reduced, setReduced] = useState(true)
  useGSAP(() => {
    const media = gsap.matchMedia()
    media.add({ all: 'all', reduceMotion: motionQuery }, context => {
      setReduced(Boolean(context.conditions?.reduceMotion))
    })
    // Switching branches unmounts AnimatedIntro, whose useGSAP scope reverts
    // the pin/timeline and whose renderer effect disposes the WebGL resources.
    return () => media.revert()
  })
  return reduced ? <StaticIntro /> : <AnimatedIntro />
}
