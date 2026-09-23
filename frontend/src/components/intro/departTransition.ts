import { VIEW_W, VIEW_H } from './palette'
import { rasterize } from './pixelStretch'
import type { DecodedScenes } from './sceneTextures'

// Shared by the live GSAP pose and the frozen transition source.
export const DEPART_END = {
  hip: [688, 324] as const,
  cameraOrigin: [800, 450] as const,
  camera: { y: 65, scale: 1.18 },
  walk: { x: 300, y: 0 },
  leg: { rotation: -12, scale: 1.08 },
}
export const DEPART_SPLIT = { start: 2.65, reveal: 3.25, end: 4, centre: 0.13, zoom: 1.2 }

export async function composeDepartTransition(images: DecodedScenes, width: number, height: number, arrow: SVGTextElement) {
  const keys = ['departBackground', 'departLeg', 'departBody', 'lookBackground', 'lookShoulder'] as const
  const layers = Object.fromEntries(await Promise.all(keys.map(async key => {
    const canvas = await rasterize(images[key], VIEW_W, VIEW_H)
    return [key, `<image href="${canvas.toDataURL()}" width="${VIEW_W}" height="${VIEW_H}"/>`]
  })))
  const { camera, cameraOrigin: [cx, cy], hip: [hx, hy], walk, leg } = DEPART_END
  const depart = `<g transform="translate(0 ${camera.y}) translate(${cx} ${cy}) scale(${camera.scale}) translate(${-cx} ${-cy})">
    ${layers.departBackground}<g transform="translate(${walk.x} ${walk.y})">
      <g transform="translate(${hx} ${hy}) rotate(${leg.rotation}) scale(${leg.scale}) translate(${-hx} ${-hy})">${layers.departLeg}</g>
      ${layers.departBody}</g></g>`
  const texture = (content: string) => rasterize('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${VIEW_W}" height="${VIEW_H}" viewBox="0 0 ${VIEW_W} ${VIEW_H}">${content}</svg>`,
  ), width, height)
  const [a, b] = await Promise.all([texture(depart), texture(layers.lookBackground + layers.lookShoulder)])
  // Draw with the document's loaded font: an SVG decoded as an image cannot
  // access the page's webfonts. Ignore the live arrow nudge during resize.
  const style = getComputedStyle(arrow)
  const context = b.getContext('2d')!
  context.save()
  context.scale(width / VIEW_W, height / VIEW_H)
  context.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`
  context.fillStyle = style.fill
  context.textBaseline = 'alphabetic'
  context.fillText(arrow.textContent ?? '', Number(arrow.getAttribute('x')), Number(arrow.getAttribute('y')))
  context.restore()
  return [a, b] as const
}
