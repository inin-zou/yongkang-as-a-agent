import { Profiler, StrictMode, type ReactNode } from 'react'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import IntroLab from './IntroLab'
import { sceneImages } from './sceneTextures'

const starts = [0, 3, 6, 9, 12.5, 15.4, 18.4, 21.4]
const numbers = ['01', '02', '03', '04', '05', '06', '07']
const labels = ['01 Depart', '02 Look', '03 Reach', '04 Cross', '05 Arrive', '06 Turn', '07 Continue', '08 Now']
const duration = 24
const offset = 6
const pinVh = 12
const lastStart = (predicate: (value: number) => boolean) => starts.reduce((last, value, index) => predicate(value) ? index : last, 0)
import { VIEW_W, VIEW_H } from './palette'

vi.hoisted(() => {
  window.scrollTo = () => {}
  window.matchMedia = (() => ({ matches: false, addListener() {}, removeListener() {} })) as unknown as typeof window.matchMedia
})

// jsdom cannot draw, but the timeline, ScrollTrigger and React lifecycle are real.
vi.mock('./pixelStretch', async importOriginal => ({
  ...await importOriginal<typeof import('./pixelStretch')>(),
  createStretchRenderer: () => null,
  rasterize: async () => document.createElement('canvas'),
}))

async function renderReady(ui: ReactNode) {
  const result = render(ui)
  await act(async () => {})
  return result
}

beforeEach(() => {
  vi.stubGlobal('Image', class { src = ''; decode() { return Promise.resolve() } })
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} })
  vi.stubGlobal('matchMedia', () => ({
    matches: false, addListener() {}, removeListener() {},
    addEventListener() {}, removeEventListener() {},
  }))
  vi.spyOn(window, 'scrollTo').mockImplementation((...args: unknown[]) => {
    const first = args[0]
    const top = typeof first === 'object' && first !== null ? (first as ScrollToOptions).top : args[1]
    Object.defineProperty(window, 'pageYOffset', { configurable: true, value: top ?? 0 })
  })
  window.scrollTo(0, 0)
})

afterEach(() => {
  cleanup()
  ScrollTrigger.getAll().forEach(trigger => trigger.kill())
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

it('maps the full pin distance linearly to the complete timeline, including backward scroll', async () => {
  const { container, unmount } = await renderReady(<StrictMode><IntroLab /></StrictMode>)
  const trigger = ScrollTrigger.getById('journey-intro')!
  expect(ScrollTrigger.getAll()).toHaveLength(1)
  const stage = container.querySelector<HTMLElement>('.intro-stage')!
  expect(trigger.pin).toBe(stage)
  expect(trigger.vars.scrub).toBe(true)
  expect(trigger.animation?.duration()).toBe(duration)
  expect(trigger.end - trigger.start).toBeCloseTo(window.innerHeight * pinVh, 1)
  for (const progress of [0, 0.22, 0.25, 0.299, 0.301, 0.45, 0.5, 0.6, 0.649, 0.651, 0.75, 0.8, 1, 0.651, 0.649, 0.301, 0.299, 0]) {
    act(() => {
      trigger.scroll(trigger.start + (trigger.end - trigger.start) * progress)
      trigger.update()
    })
    expect(Number(stage.dataset.time)).toBeCloseTo(progress * duration, 2)
    const visibleShot = numbers[Math.max(0, lastStart(start => progress * duration >= start))] ?? numbers.at(-1)
    for (const shot of numbers) {
      expect(container.querySelector(`.intro-shot${shot}`), `progress ${progress}, shot ${shot}, time ${stage.dataset.time}`).toHaveStyle({ visibility: shot === visibleShot ? 'visible' : 'hidden' })
    }
    expect(container.querySelector('.intro-end')).toHaveStyle({ visibility: progress * duration > 22.9 ? 'visible' : 'hidden' })
  }
  unmount()
  expect(ScrollTrigger.getAll()).toHaveLength(0)
  expect(document.querySelector('.pin-spacer')).toBeNull()
})

it('replaces the driver cleanly when toggling play and scroll', async () => {
  const { container } = await renderReady(<StrictMode><IntroLab /></StrictMode>)
  const initial = ScrollTrigger.getById('journey-intro')!
  act(() => {
    initial.scroll(initial.start + (initial.end - initial.start) * 0.75)
    initial.update()
  })
  fireEvent.click(screen.getByRole('button', { name: 'mode: scroll' }))
  expect(screen.getByText(labels[0])).toBeInTheDocument()
  expect(ScrollTrigger.getAll()).toHaveLength(0)
  expect(container.querySelector('.pin-spacer')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'mode: play' }))
  const trigger = ScrollTrigger.getById('journey-intro')!
  expect(ScrollTrigger.getAll()).toHaveLength(1)
  act(() => {
    trigger.scroll(trigger.start + (trigger.end - trigger.start) * 0.75)
    trigger.update()
  })
  expect(Number(container.querySelector<HTMLElement>('.intro-stage')!.dataset.time)).toBeCloseTo(duration * 0.75, 2)
  expect(screen.getByText(labels[lastStart(start => duration * 0.75 >= start)])).toBeInTheDocument()
})

it('renders every static keyframe and work links without a pin or canvas for reduced motion', async () => {
  vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener() {}, removeEventListener() {} }))
  const { container } = await renderReady(<IntroLab />)
  expect(container.querySelectorAll('figure')).toHaveLength(numbers.length)
  expect(container.querySelectorAll('figcaption')).toHaveLength(numbers.length)
  expect(container.querySelector('canvas')).toBeNull()
  expect(ScrollTrigger.getAll()).toHaveLength(0)
  expect(screen.queryByRole('button')).toBeNull()
  expect(screen.getByRole('link', { name: 'skip to work →' })).toHaveAttribute('href', '/files/soul')
})

it('updates the HUD while scrolling without committing React renders', async () => {
  const onRender = vi.fn()
  const { container } = await renderReady(<Profiler id="intro" onRender={onRender}><IntroLab /></Profiler>)
  onRender.mockClear()
  const trigger = ScrollTrigger.getById('journey-intro')!
  act(() => {
    trigger.scroll(trigger.start + (trigger.end - trigger.start) * 0.5)
    trigger.update()
  })
  expect(screen.getByText(labels[lastStart(start => duration * 0.5 >= start)])).toBeInTheDocument()
  const transform = (container.querySelector('.intro-caption-progress i') as HTMLElement).style.transform
  expect(Number(transform.slice(7, -1))).toBeCloseTo(0.5, 5)
  expect(onRender).not.toHaveBeenCalled()
})

it('reverses timed shot sets at exact timeline boundaries', async () => {
  const { container } = await renderReady(<IntroLab />)
  const timeline = ScrollTrigger.getById('journey-intro')!.animation!
  // Seek directly for exact boundaries: browser scroll positions round to pixels.
  for (const time of [...starts.flatMap(start => [Math.max(0, start - 0.001), start]), duration, ...[...starts].reverse().flatMap(start => [start, Math.max(0, start - 0.001)])]) {
    act(() => { timeline.time(time, false) })
    const expected = numbers[lastStart(start => time >= start)] ?? numbers.at(-1)
    for (const shot of numbers) {
      expect(container.querySelector(`.intro-shot${shot}`), `time ${time}, shot ${shot}`).toHaveStyle({
        visibility: shot === expected ? 'visible' : 'hidden',
      })
    }
  }
})

it('reverts the pin when reduced motion changes and recreates one driver when restored', async () => {
  let reduced = false
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query === 'all' || (query === '(prefers-reduced-motion: reduce)' && reduced),
    addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {},
  }))
  const { container, unmount } = await renderReady(<StrictMode><IntroLab /></StrictMode>)
  expect(ScrollTrigger.getAll()).toHaveLength(1)
  act(() => { reduced = true; gsap.matchMediaRefresh() })
  expect(container.querySelectorAll('figure')).toHaveLength(numbers.length)
  expect(container.querySelector('canvas, .pin-spacer')).toBeNull()
  expect(ScrollTrigger.getAll()).toHaveLength(0)
  await act(async () => { reduced = false; gsap.matchMediaRefresh() })
  expect(container.querySelector('.intro-stage')).not.toBeNull()
  expect(container.querySelectorAll('.pin-spacer')).toHaveLength(1)
  expect(ScrollTrigger.getAll()).toHaveLength(1)
  unmount()
  act(() => { reduced = true; gsap.matchMediaRefresh() })
  expect(ScrollTrigger.getAll()).toHaveLength(0)
})

it('keeps SVG material references unambiguous across all reduced-motion keyframes', async () => {
  vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener() {}, removeEventListener() {} }))
  const { container } = await renderReady(<IntroLab />)
  const ids = [...container.querySelectorAll('[id]')].map(element => element.id)
  expect(new Set(ids).size).toBe(ids.length)
  for (const element of container.querySelectorAll('[filter], [clip-path], [mask]')) {
    const reference = element.getAttribute('filter') ?? element.getAttribute('clip-path') ?? element.getAttribute('mask')!
    const id = reference.match(/^url\(#(.+)\)$/)?.[1]
    expect(ids, reference).toContain(id)
  }
})


it('crossfades bitmap poses reversibly without polygon morphs', async () => {
  const { container } = await renderReady(<IntroLab />)
  const timeline = ScrollTrigger.getById('journey-intro')!.animation!
  expect(container.querySelector('polygon')).toBeNull()
  const touch = container.querySelector('.intro-hand03 [data-pose="to"]')!
  const reach = container.querySelector('.intro-hand05 [data-pose="to"]')!
  expect(touch).not.toBeNull()
  expect(reach).not.toBeNull()
  for (const [time, touchOpacity, reachOpacity] of [[0, 0, 0], [2.2, 1, 0], [8.8, 1, 1], [0, 0, 0]]) {
    act(() => { timeline.time(offset + time, false) })
    expect(Number(gsap.getProperty(touch, 'opacity'))).toBeCloseTo(touchOpacity)
    expect(Number(gsap.getProperty(reach, 'opacity'))).toBeCloseTo(reachOpacity)
  }
})

it('uses finished bitmap poses in static frames and layers the arch over the tower', async () => {
  vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener() {}, removeEventListener() {} }))
  const { container } = await renderReady(<IntroLab />)
  const sources = [...container.querySelectorAll('image')].map(image => image.getAttribute('href'))
  for (const file of ['01-bg', '01-leg', '01-body', '02-bg', '02-shoulder', '06-ai', '06-hands', '06-head', '07-study', '03-wall', '03-hand-touch', '04-nanjing', '04-paris', '04-hand-left', '04-hand-right', '05-sky-tower', '05-arch', '05-arm-reach']) {
    expect(sources).toContain(`/intro/shots/${file}.webp`)
  }
  expect(sources).not.toContain('/intro/shots/05-arm-rest.webp')
  const arrival = [...container.querySelectorAll('.intro-shot05 image')].map(image => image.getAttribute('href'))
  expect(arrival).toEqual(['/intro/shots/05-sky-tower.webp', '/intro/shots/05-arch.webp', '/intro/shots/05-arm-reach.webp'])
})

it('holds a level camera and visible contact through the cut in both directions', async () => {
  const { container } = await renderReady(<IntroLab />)
  const timeline = ScrollTrigger.getById('journey-intro')!.animation!
  const camera = container.querySelector('.intro-camera03')!
  for (const time of [2.6, 2.999, 4, 2.999, 2.6]) {
    act(() => { timeline.time(offset + time, false) })
    expect(Number(gsap.getProperty(camera, 'rotation'))).toBeCloseTo(0)
    expect(Number(gsap.getProperty(camera, 'scaleX'))).toBeCloseTo(1)
    expect(Number(gsap.getProperty(camera, 'opacity'))).toBe(1)
  }
})

it('enlarges contact about the fingertip while preserving its scene-space position', async () => {
  const { container } = await renderReady(<IntroLab />)
  const timeline = ScrollTrigger.getById('journey-intro')!.animation!
  const contact = container.querySelector('.intro-contact03')!
  const hand = container.querySelector('.intro-hand03')!
  for (const time of [2.6, 2.7, 2.999, 8, 2.7]) {
    act(() => { timeline.time(offset + time, false) })
    const scale = Number(gsap.getProperty(contact, 'scaleX'))
    const x = Number(gsap.getProperty(contact, 'x')) + (1300 + Number(gsap.getProperty(hand, 'x'))) * scale
    const y = Number(gsap.getProperty(contact, 'y')) + (280 + Number(gsap.getProperty(hand, 'y'))) * scale
    console.info(`Contact t=${time}: scale=${scale}, fingertip=(${x}, ${y}), scene=(${100 * x / VIEW_W}%, ${100 * y / VIEW_H}%)`)
    expect(scale).toBeGreaterThanOrEqual(0.72)
    expect(scale).toBeLessThanOrEqual(0.74)
    expect(x).toBeCloseTo(800)
    expect(y).toBeCloseTo(450)
  }
})

it.each([
  ['03', 0.45, 1.35],
  ['05', 6.85, 1.6],
] as const)('removes shot %s outgoing pose early and restores it on reverse seeks', async (shot, start, duration) => {
  const { container } = await renderReady(<IntroLab />)
  const timeline = ScrollTrigger.getById('journey-intro')!.animation!
  const group = container.querySelector(`.intro-hand${shot}`)!
  const from = group.querySelector('[data-pose="from"]')!
  const to = group.querySelector('[data-pose="to"]')!
  expect(from.parentElement).toBe(group)
  expect(to.parentElement).toBe(group)
  const endOut = start + duration * 0.35
  const endIn = start + duration * 0.5
  for (const time of [endOut, endIn, 7.5, 8, 10, 8, 7.5, endIn, endOut]) {
    act(() => { timeline.time(offset + time, false) })
    expect(Number(gsap.getProperty(from, 'opacity')), `t=${time}`).toBe(0)
    expect(from).toHaveStyle({ visibility: 'hidden' })
    if (time >= endIn) expect(Number(gsap.getProperty(to, 'opacity'))).toBe(1)
  }
  act(() => { timeline.time(offset + start + duration * 0.175, false) })
  expect(Number(gsap.getProperty(from, 'opacity'))).toBeCloseTo(0.875, 3)
  act(() => { timeline.time(offset + start, false) })
  expect(Number(gsap.getProperty(from, 'opacity'))).toBe(1)
  expect(from).toHaveStyle({ visibility: 'visible' })
  expect(Number(gsap.getProperty(to, 'opacity'))).toBe(0)
})

it('waits for the last pose to decode before pinning or enabling playback', async () => {
  const pending: (() => void)[] = []
  vi.stubGlobal('Image', class {
    src = ''
    decode() { return new Promise<void>(resolve => { pending.push(resolve) }) }
  })
  render(<IntroLab />)
  expect(pending).toHaveLength(Object.keys(sceneImages).length)
  expect(ScrollTrigger.getAll()).toHaveLength(0)
  expect(screen.getByRole('button', { name: /^mode:/ })).toBeDisabled()
  await act(async () => { pending.slice(0, -1).forEach(resolve => resolve()) })
  expect(ScrollTrigger.getAll()).toHaveLength(0)
  await act(async () => { pending.at(-1)!() })
  expect(ScrollTrigger.getAll()).toHaveLength(1)
  expect(screen.getByRole('button', { name: /^mode:/ })).toBeEnabled()
})

it('does not create a late pin after unmounting during decode', async () => {
  const pending: (() => void)[] = []
  vi.stubGlobal('Image', class {
    src = ''
    decode() { return new Promise<void>(resolve => { pending.push(resolve) }) }
  })
  const { unmount } = render(<StrictMode><IntroLab /></StrictMode>)
  unmount()
  await act(async () => { pending.forEach(resolve => resolve()) })
  expect(ScrollTrigger.getAll()).toHaveLength(0)
  expect(document.querySelector('.pin-spacer')).toBeNull()
})

it('keeps failed loads unpinned with an accessible way to skip', async () => {
  vi.stubGlobal('Image', class {
    src = ''
    decode() { return Promise.reject(new Error('decode failed')) }
  })
  await renderReady(<IntroLab />)
  expect(ScrollTrigger.getAll()).toHaveLength(0)
  expect(screen.getByRole('status')).toHaveTextContent('Images could not load')
  expect(screen.getByRole('link', { name: 'skip to work →' })).toHaveAttribute('href', '/files/soul')
})

it('restores contact, settling hands and parallax identically when scrubbing backward', async () => {
  const { container } = await renderReady(<IntroLab />)
  const timeline = ScrollTrigger.getById('journey-intro')!.animation!
  const selectors = ['.intro-contact03', '.intro-hand03', '.intro-hand04-left', '.intro-hand04-right', '.intro-arch05', '.intro-tower05', '.intro-hand05']
  const read = () => selectors.map(selector => {
    const element = container.querySelector(selector)!
    return ['x', 'y', 'scaleX', 'rotation', 'opacity'].map(property => gsap.getProperty(element, property))
  })
  const frames = new Map<number, ReturnType<typeof read>>()
  const times = [0, 1.65, 2.6, 2.999, 3, 3.1, 3.6, 6.5, 7.5, 8.8, 10]
  for (const time of times) {
    act(() => { timeline.time(offset + time, false) })
    frames.set(time, read())
  }
  for (const time of [...times].reverse()) {
    act(() => { timeline.time(offset + time, false) })
    expect(read(), `time ${time}`).toEqual(frames.get(time))
  }
  act(() => { timeline.time(offset + 2.6, false) })
  const contact = container.querySelector('.intro-contact03')!
  expect(Number(gsap.getProperty(contact, 'x')) + 1300 * Number(gsap.getProperty(contact, 'scaleX'))).toBeCloseTo(800)
})

it('steps shot 01 across the lens before tilting up, identically in reverse', async () => {
  const { container } = await renderReady(<IntroLab />)
  const timeline = ScrollTrigger.getById('journey-intro')!.animation!
  const leg = container.querySelector('.intro-leg01')!
  const camera = container.querySelector('.intro-camera01')!
  expect(leg).not.toBeNull()
  const read = () => [gsap.getProperty(leg, 'rotation'), gsap.getProperty(leg, 'scaleX'), gsap.getProperty(camera, 'y')]
  const frames = new Map()
  for (const time of [0, 0.5, 1.6, 2.8, 3]) {
    act(() => { timeline.time(time, false) })
    frames.set(time, read())
  }
  expect(Math.abs(Number(frames.get(1.6)[0]) - Number(frames.get(0)[0]))).toBeGreaterThan(15)
  expect(frames.get(1.6)[2]).toBe(frames.get(0)[2])
  expect(frames.get(2.8)[2]).not.toBe(frames.get(0)[2])
  for (const time of [3, 2.8, 1.6, 0.5, 0]) {
    act(() => { timeline.time(time, false) })
    expect(read()).toEqual(frames.get(time))
  }
})

it('pushes past shot 02 shoulder faster than the gate and reverses the arrow nudge', async () => {
  const { container } = await renderReady(<IntroLab />)
  const timeline = ScrollTrigger.getById('journey-intro')!.animation!
  const bg = container.querySelector('.intro-background02')!
  const shoulder = container.querySelector('.intro-shoulder02')!
  const arrow = container.querySelector('.intro-arrow02')!
  expect(shoulder).not.toBeNull()
  const read = () => [gsap.getProperty(bg, 'scaleX'), gsap.getProperty(shoulder, 'scaleX'), gsap.getProperty(arrow, 'x')]
  const frames = new Map()
  for (const time of [3, 3.4, 4.5, 5.8, 6]) {
    act(() => { timeline.time(time, false) })
    frames.set(time, read())
  }
  expect(Number(frames.get(5.8)[1])).toBeGreaterThan(Number(frames.get(5.8)[0]))
  expect(Number(frames.get(5.8)[2])).toBeGreaterThan(0)
  for (const time of [6, 5.8, 4.5, 3.4, 3]) {
    act(() => { timeline.time(time, false) })
    expect(read()).toEqual(frames.get(time))
  }
})

it('match-cuts exactly one held object with identical hands and head in either direction', async () => {
  const { container } = await renderReady(<IntroLab />)
  const timeline = ScrollTrigger.getById('journey-intro')!.animation!
  const objects = [...container.querySelectorAll('[data-held-object]')]
  expect(objects).toHaveLength(2)
  const hands = container.querySelector('.intro-hands06')!
  const head = container.querySelector('.intro-head06')!
  const read = () => [hands, head].map(node => ['x', 'y', 'rotation', 'scaleX', 'scaleY'].map(key => gsap.getProperty(node, key)))
  const initial = read()
  const characterMarkup = [hands.innerHTML, head.innerHTML]
  expect(container.querySelectorAll('.intro-hands06, .intro-head06')).toHaveLength(2)
  const times = [15.4, 16.499999, 16.5, 16.500001, 17, 18.399]
  for (let t = 15.4; t < 18.4; t += 0.025) times.push(Number(t.toFixed(6)))
  for (const t of [...times, ...[...times].reverse()]) {
    act(() => { timeline.time(t, false) })
    expect(objects.filter(node => Number(gsap.getProperty(node, 'opacity')) > 0), `t=${t}`).toHaveLength(1)
    expect(Number(gsap.getProperty(objects[t < 16.5 ? 0 : 1], 'opacity')), `requested=${t}, actual=${timeline.time()}`).toBe(1)
    expect(read()).toEqual(initial)
    expect([hands.innerHTML, head.innerHTML]).toEqual(characterMarkup)
  }
})

it('renders exact book titles and paper labels as SVG text', async () => {
  const { container } = await renderReady(<IntroLab />)
  const titles = (shot: string) => [...container.querySelectorAll(`${shot} text`)].map(node => node.textContent)
  for (const title of ['Principles of Economics', 'N. Gregory Mankiw', 'Consumer Choice', 'Utility', 'Consumption', 'Pareto', 'Return', 'Risk', 'Efficient Frontier', '- trade-off', '- opportunity cost', '- incentives', '- equilibrium', 'Attention Is All You Need', 'Vaswani et al. (2017)', 'Encoder', 'Decoder', 'Inputs', 'Outputs (shifted right)', 'Designing Data-Intensive Applications', 'Kleppmann', 'Clean Code', 'Martin', '- scale', '- operationalize', '- alignment', '- real-world impact']) {
    expect(titles('.intro-shot06')).toContain(title)
  }
  for (const title of ['Designing Data-Intensive Applications', 'Clean Code', 'Designing Machine Learning Systems']) expect(titles('.intro-shot07')).toContain(title)
  expect(titles('.intro-shot07').join(' ')).not.toContain('Principles of Economics')
  const spines = titles('.intro-half07-left').filter(title => ['Designing Machine Learning Systems', 'Clean Code', 'Designing Data-Intensive Applications'].includes(title!))
  expect(spines).toEqual(['Designing Machine Learning Systems', 'Clean Code', 'Designing Data-Intensive Applications'])
})

it('draws the Pareto stroke before the cut and Transformer strokes after it reversibly', async () => {
  const { container } = await renderReady(<IntroLab />)
  const timeline = ScrollTrigger.getById('journey-intro')!.animation!
  const pareto = container.querySelector('.intro-pareto-trace')!
  const strokes = [...container.querySelectorAll('.intro-transformer-stroke')]
  expect(strokes.length).toBeGreaterThan(10)
  const read = () => [pareto, ...strokes].map(node => gsap.getProperty(node, 'strokeDashoffset'))
  const states = new Map<number, ReturnType<typeof read>>()
  for (const t of [15.4, 16, 16.49, 16.5, 17, 18.2]) {
    act(() => { timeline.time(t, false) }); states.set(t, read())
  }
  expect(Number(states.get(15.4)![0])).toBe(1)
  expect(Number(states.get(16.49)![0])).toBe(0)
  expect(states.get(18.2)!.map(Number).every(value => value === 0)).toBe(true)
  for (const t of [18.2, 17, 16.5, 16.49, 16, 15.4]) {
    act(() => { timeline.time(t, false) }); expect(read()).toEqual(states.get(t))
  }
})

it('shows only the AI held paper in reduced motion', async () => {
  vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener() {}, removeEventListener() {} }))
  const { container } = await renderReady(<IntroLab />)
  expect(container.querySelectorAll('[data-held-object]')).toHaveLength(1)
  expect(container.querySelector('[data-held-object]')).toHaveAttribute('data-held-object', 'ai')
})

it('holds the wider shot 07, keeps ink registered during its push, and shows dark SVG copy throughout', async () => {
  const { container } = await renderReady(<IntroLab />)
  const timeline = ScrollTrigger.getById('journey-intro')!.animation!
  const camera = container.querySelector('.intro-camera07')!
  const text = container.querySelector('.intro-continue-text')!
  expect(text.tagName.toLowerCase()).toBe('text')
  expect(text).toHaveTextContent('i keep showing up.')
  expect(camera.contains(container.querySelector('.intro-books07'))).toBe(true)
  const values = new Map<number, unknown>()
  for (const time of [18.4, 18.7, 19.3, 20.2, 20.6, 21.399]) {
    act(() => { timeline.time(time, false) })
    expect(Number(gsap.getProperty(text, 'opacity'))).toBe(1)
    values.set(time, gsap.getProperty(camera, 'scaleX'))
  }
  expect(values.get(18.4)).toBe(values.get(18.7))
  expect(Number(values.get(20.2))).toBeGreaterThan(1)
  for (const time of [...values.keys()].reverse()) {
    act(() => { timeline.time(time, false) })
    expect(gsap.getProperty(camera, 'scaleX')).toEqual(values.get(time))
  }
  const copy = camera.textContent!
  for (const title of ['Huyen', 'Martin', 'Kleppmann', 'Ideas Build A Kinder Tomorrow', 'Learn', 'Build', 'Write', 'Repeat']) expect(copy).toContain(title)
})

it('fits every Transformer label inside its box with fixed monospace metrics', async () => {
  const { container } = await renderReady(<IntroLab />)
  const boxes = [...container.querySelectorAll('[data-diagram-box]')]
  expect(boxes).toHaveLength(10)
  for (const box of boxes) {
    const rect = box.querySelector('rect')!
    const labels = [...box.querySelectorAll('text')]
    expect(labels.length).toBeGreaterThan(0)
    for (const label of labels) {
      expect(label).toHaveAttribute('font-family', 'monospace')
      const size = Number(label.getAttribute('font-size'))
      // SVG monospace advances are 0.6em; use a conservative 0.65em bound.
      expect(label.textContent!.length * size * 0.65).toBeLessThanOrEqual(Number(rect.getAttribute('width')) - 16)
      const baseline = Number(label.getAttribute('y')) - Number(rect.getAttribute('y'))
      expect(baseline - size).toBeGreaterThanOrEqual(3)
      expect(baseline + size * 0.25).toBeLessThanOrEqual(Number(rect.getAttribute('height')) - 3)
    }
  }
})

it('keeps shot 01 background covering the viewport throughout its upward tilt', async () => {
  const { container } = await renderReady(<IntroLab />)
  const timeline = ScrollTrigger.getById('journey-intro')!.animation!
  const camera = container.querySelector('.intro-camera01')!
  for (const time of [0, 1.65, 2, 2.65, 2.999]) {
    act(() => { timeline.time(time, false) })
    const scale = Number(gsap.getProperty(camera, 'scaleY'))
    const y = Number(gsap.getProperty(camera, 'y'))
    expect(camera).toHaveAttribute('data-svg-origin', '800 450')
    // Scale around the scene centre provides top/bottom overscan.
    expect(y + (1 - scale) * VIEW_H / 2).toBeLessThanOrEqual(0)
    expect(y + (1 + scale) * VIEW_H / 2).toBeGreaterThanOrEqual(VIEW_H)
  }
})

it.each([
  [0, '01 Depart', '1999 · Nanjing'],
  [3, '02 Look', '1999–2018 · Nanjing'],
  [6, '03 Reach', '2018 · Leaving'],
  [9, '04 Cross', 'Nanjing → Paris'],
  [12.5, '05 Arrive', '2019 · Paris'],
  [15.4, '06 Turn', 'Economics → AI'],
  [18.4, '07 Continue', '2026 · Paris'],
] as const)('restores shot label and caption at boundary %s in either direction', async (time, label, caption) => {
  const { container } = await renderReady(<IntroLab />)
  const timeline = ScrollTrigger.getById('journey-intro')!.animation!
  for (const from of [0, 22]) {
    act(() => { timeline.time(from, false); timeline.time(time, false) })
    expect(container.querySelector('.intro-hud-shot')).toHaveTextContent(label)
    expect(container.querySelector('.intro-cap')).toHaveTextContent(caption)
    expect(container.querySelector('.intro-cap')).toHaveStyle({ visibility: 'visible' })
  }
})

it.each(['01-leg', '02-shoulder', '06-ai', '06-hands', '07-study'])(
  'waits specifically for %s to decode before creating the driver',
  async file => {
    let finish!: () => void
    vi.stubGlobal('Image', class {
      src = ''
      decode() {
        return this.src.endsWith(file + '.webp')
          ? new Promise<void>(resolve => { finish = resolve })
          : Promise.resolve()
      }
    })
    await renderReady(<IntroLab />)
    expect(ScrollTrigger.getAll()).toHaveLength(0)
    expect(screen.getByRole('button', { name: /^mode:/ })).toBeDisabled()
    await act(async () => { finish() })
    expect(ScrollTrigger.getAll()).toHaveLength(1)
    expect(screen.getByRole('button', { name: /^mode:/ })).toBeEnabled()
  },
)

it('keeps body and leg hips within two scene units throughout the step', async () => {
  const { container } = await renderReady(<IntroLab />)
  const timeline = ScrollTrigger.getById('journey-intro')!.animation!
  const position = (element: Element) => {
    let [x, y] = [688, 324]
    for (let node: Element | null = element; node && node.tagName.toLowerCase() !== 'svg'; node = node.parentElement) {
      const origin = (node.getAttribute('data-svg-origin') ?? '0 0').split(' ').map(Number)
      const get = (property: string) => Number(gsap.getProperty(node!, property))
      const angle = get('rotation') * Math.PI / 180
      const dx = (x - origin[0]) * get('scaleX')
      const dy = (y - origin[1]) * get('scaleY')
      ;[x, y] = [origin[0] + dx * Math.cos(angle) - dy * Math.sin(angle) + get('x'),
        origin[1] + dx * Math.sin(angle) + dy * Math.cos(angle) + get('y')]
    }
    return [x, y]
  }
  for (let sample = 0; sample <= 60; sample++) {
    const t = sample / 20
    act(() => { timeline.time(t, false) })
    const body = position(container.querySelector('.intro-body01')!)
    const leg = position(container.querySelector('.intro-leg01')!)
    expect(Math.hypot(body[0] - leg[0], body[1] - leg[1]), `t=${t}, body=${body}, leg=${leg}`).toBeLessThanOrEqual(2)
    if ([0, 0.5, 1, 1.6, 3].includes(t)) console.info(`Hip t=${t}: body=(${body}), leg=(${leg})`)
  }
})

it('shows a mid split with both halves remaining and Paris still closed', async () => {
  vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener() {}, removeEventListener() {} }))
  const { container } = await renderReady(<IntroLab />)
  const window = container.querySelector('#intro-static-paris rect')!
  const x = Number(window.getAttribute('x'))
  const width = Number(window.getAttribute('width'))
  expect(x).toBeGreaterThan(0)
  expect(x + width).toBeLessThan(VIEW_W)
  expect(x + width / 2).toBe(VIEW_W / 2)
  expect(width).toBe(0)
  const left = container.querySelector('#intro-static-left rect')!
  const right = container.querySelector('#intro-static-right rect')!
  expect(Number(left.getAttribute('width'))).toBe(320)
  expect(Number(right.getAttribute('x'))).toBe(1280)
  expect(Number(right.getAttribute('width'))).toBe(320)
})

it('pushes both hands outward as the centre opens and reverses the push', async () => {
  const { container } = await renderReady(<IntroLab />)
  const timeline = ScrollTrigger.getById('journey-intro')!.animation!
  const left = container.querySelector('.intro-hand04-left')!
  const right = container.querySelector('.intro-hand04-right')!
  act(() => { timeline.time(10.3, false) })
  const initial = [Number(gsap.getProperty(left, 'x')), Number(gsap.getProperty(right, 'x'))]
  act(() => { timeline.time(12.4, false) })
  expect(Number(gsap.getProperty(left, 'x'))).toBeLessThan(initial[0] - 10)
  expect(Number(gsap.getProperty(right, 'x'))).toBeGreaterThan(initial[1] + 10)
  act(() => { timeline.time(10.3, false) })
  expect([Number(gsap.getProperty(left, 'x')), Number(gsap.getProperty(right, 'x'))]).toEqual(initial)
})

it('switches captions between English (default) and Chinese', async () => {
  const { container } = await renderReady(<IntroLab />)
  const timeline = ScrollTrigger.getById('journey-intro')!.animation!
  act(() => { timeline.time(9, false) })
  expect(container.querySelector('.intro-cap')).toHaveTextContent('Nanjing → Paris')
  fireEvent.click(screen.getByRole('button', { name: 'Caption language' }))
  expect(container.querySelector('.intro-cap')).toHaveTextContent('南京 → 巴黎')
  expect(container.querySelector('.intro-hud-shot')).toHaveTextContent('04 跨越')
  act(() => { timeline.time(12.5, false) })
  expect(container.querySelector('.intro-cap')).toHaveTextContent('2019 · 巴黎')
})


it('splits the complete inked frame and reverses every settling boundary', async () => {
  const { container } = await renderReady(<IntroLab />)
  const timeline = ScrollTrigger.getById('journey-intro')!.animation!
  const halves = ['left', 'right'].map(side => container.querySelector(`.intro-half07-${side}`)!)
  for (const half of halves) {
    expect(half).not.toBeNull()
    expect(half).toHaveTextContent('Clean Code')
    expect(half).toHaveTextContent('i keep showing up.')
    expect(half).toHaveTextContent('Repeat')
  }
  const sample = (t: number) => {
    act(() => { timeline.time(t, false) })
    return halves.map(half => Number(gsap.getProperty(half, 'x')))
  }
  const times = [21.399, 21.4, 21.401, 22, 22.599, 22.6, 22.601, 23.399, 23.4, 23.401, 24]
  const collapseTween = (timeline as gsap.core.Timeline).getChildren().find(child => 'targets' in child &&
    (child as gsap.core.Tween).targets().some(target => typeof target === 'object' && target !== null && 'collapse' in target)) as gsap.core.Tween
  const state = collapseTween.targets()[0] as { gap: number; collapse: number }
  const states = times.map(t => { sample(t); return { ...state } })
  const forward = times.map(sample)
  expect(forward[1]).toEqual([0, 0])
  expect(forward[3][0]).toBeLessThan(0)
  expect(forward[3][0]).toBe(-forward[3][1])
  expect(forward[5]).toEqual([-800, 800])
  for (let i = times.length - 1; i >= 0; i--) {
    expect(sample(times[i])).toEqual(forward[i])
    expect(state).toEqual(states[i])
  }
  sample(21.4)
  expect(state).toMatchObject({ gap: 0, collapse: 0 })
  sample(22.6)
  expect(state.gap).toBe(1)
  expect(state.collapse).toBeCloseTo(0.2)
  sample(23.4)
  expect(state.collapse).toBe(1)
  for (const t of [21.4, 22.6, 22.9]) {
    sample(t)
    expect(container.querySelector('.intro-end')).toHaveStyle({ visibility: 'hidden' })
  }
  sample(23.8)
  expect(container.querySelector('.intro-end')).toHaveStyle({ opacity: '1' })
  expect(container.querySelector('.intro-cap')).toHaveStyle({ visibility: 'hidden' })
  expect(container.querySelector('.intro-hud-shot')).toHaveTextContent('08 Now')
})

it('includes four section rules with the static identity on paper', async () => {
  vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener() {}, removeEventListener() {} }))
  const { container } = await renderReady(<IntroLab />)
  expect(container.querySelectorAll('.intro-now-rule')).toHaveLength(4)
  expect(container.querySelector('.intro-static-now')).toHaveTextContent('yongkang zou')
})
