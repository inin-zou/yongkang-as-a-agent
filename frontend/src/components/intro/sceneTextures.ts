// Generated raster environments shared by the live scenes and static keyframes.
export const sceneImages = {
  continueStudy: '/intro/shots/07-study.webp',
  studyEcon: '/intro/shots/06-economics.webp',
  studyAI: '/intro/shots/06-ai.webp', // One flat blank sheet; all ink is SVG.
  studyHands: '/intro/shots/06-hands.webp',
  studyHead: '/intro/shots/06-head.webp',
  lookBackground: '/intro/shots/02-bg.webp',
  lookShoulder: '/intro/shots/02-shoulder.webp',
  departBackground: '/intro/shots/01-bg.webp',
  departLeg: '/intro/shots/01-leg.webp',
  departBody: '/intro/shots/01-body.webp',
  wall: '/intro/shots/03-wall.webp',
  touch: '/intro/shots/03-hand-touch.webp',
  reaching: '/intro/shots/03-hand-reach.webp',
  nanjing: '/intro/shots/04-nanjing.webp', // Qinhuai colours cross the authored 36% slice.
  paris: '/intro/shots/04-paris.webp', // Bridge and tower centred for the outward reveal.
  leftHand: '/intro/shots/04-hand-left.webp',
  rightHand: '/intro/shots/04-hand-right.webp',
  arrivalSky: '/intro/shots/05-sky-tower.webp',
  arrivalArch: '/intro/shots/05-arch.webp',
  arrivalReach: '/intro/shots/05-arm-reach.webp',
  arrivalRest: '/intro/shots/05-arm-rest.webp',
} as const

// Decode every SVG pose and environment before the timeline can advance.
export type DecodedScenes = Record<keyof typeof sceneImages, HTMLImageElement>
export async function loadSceneImages(): Promise<DecodedScenes> {
  const images = await Promise.all(Object.entries(sceneImages).map(async ([key, src]) => {
    const image = new Image()
    image.src = src
    await image.decode()
    return [key, image] as const
  }))
  return Object.fromEntries(images) as DecodedScenes
}
