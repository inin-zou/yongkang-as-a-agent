// Intro palette — paper, stone and brick from the storyboard; blue is the character.
export const P = {
  paper: '#F2EFE7',
  paperDeep: '#E6E2D7',
  ink: '#1E1E1C',
  stone1: '#D3CFC6',
  stone2: '#B4B0A7',
  stone3: '#8F8C85',
  stone4: '#62605B',
  stone5: '#3B3A37',
  red: '#9C3D33',
  redDeep: '#792E27',
  blue: '#2348C4',
  blueDeep: '#18348F',
  blueLight: '#3761DA',
} as const

// Scene coordinate space shared by every shot.
export const VIEW_W = 1600
export const VIEW_H = 900

// Horizontal position (0–1) where the hand touches the wall in shot 03 —
// shot 04 samples its vertical slice from the same place, so the touch causes the stretch.
export const SLICE_U = 0.5
