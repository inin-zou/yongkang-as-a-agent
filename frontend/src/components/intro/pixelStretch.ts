// Split A at its configurable seam, translate both halves outward, and extend the cut
// columns horizontally. Scene B then opens from that seam (reveal 1 → 0).
export interface StretchState {
  gap: number
  centre?: number
  zoom?: number
  reveal: number
  // Optional gap-only bookend: 0 = sampled bands, 1 = paper section rules.
  collapse?: number
}

export const COLLAPSE_ROWS = 450
export const NOW_RULE_ROWS: readonly number[] = [87, 312, 367, 412]
export const NOW_PAPER = '#FAF9F6'
export const NOW_DIVIDER = '#DEDDD6'

export const COLLAPSE_ROW_PX = 2.5
export const COLLAPSE_SAMPLE_WINDOW = 0.04

// Odd subdivisions retain every original rule centre exactly.
export function collapseRowCount(cssHeight: number): number {
  return 90 * Math.max(1, 2 * Math.round((cssHeight / COLLAPSE_ROW_PX / 90 - 1) / 2) + 1)
}

export function sampleCollapseSource(row: number, side: 'left' | 'right'): number {
  const seed = ((row % 997) * 73 + 19) % 997
  const hash = ((seed * seed + 31) % 997) / 997
  return 0.5 + (side === 'left' ? -1 : 1) * COLLAPSE_SAMPLE_WINDOW * hash
}

// One backing-pixel boundary for both SVG translation and canvas coverage.
export function splitEdges(width: number, gap: number) {
  const left = gap <= 0 ? width / 2 : Math.floor(width * (1 - Math.min(1, gap)) / 2)
  const right = width - left
  return { left, right, leftShift: left - width / 2, rightShift: right - width / 2 }
}

// Normalized top-down coordinates, shared with the static page rules.
export function sampleCollapseBand(row: number, collapse: number, rows = COLLAPSE_ROWS) {
  const c = Math.max(0, Math.min(1, collapse))
  const originalRow = (row + 0.5) / (rows / 90) - 0.5
  const rule = [17, 62, 73, 82].includes(originalRow)
  return {
    y: (row + 0.5) / rows,
    thickness: (1 - c) / rows + (rule ? c / 900 : 0),
    opacity: rule ? 1 : 1 - c,
    rule,
  }
}

// The unstaggered per-pixel mapping shared by the shader and fallback.
// Cut samples are texel centres immediately beside the seam.
export function sampleStretch(x: number, gap: number, reveal: number, width = 1600, centre = 0.5, zoom = 1): { source: 'A' | 'B'; u: number } {
  if (reveal < 1 && Math.abs(x - centre) <= (1 - reveal) * Math.max(centre, 1 - centre)) return { source: 'B', u: x }
  let u = x
  if (gap > 0) {
    if (x < centre - gap / 2) u = x + gap / 2
    else if (x > centre + gap / 2) u = x - gap / 2
    else u = centre + (x < centre ? -0.5 : 0.5) / width
  }
  return { source: 'A', u: zoom === 1 ? u : centre + (u - centre) / zoom }
}

export interface StretchRenderer {
  setScenes(a: HTMLCanvasElement, b: HTMLCanvasElement): void
  render(s: StretchState): void
  dispose(): void
}

const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
varying highp vec2 vSplitUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  vSplitUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`

// Row stagger only shifts where each band *ends*; the band itself never bends or tapers.
const FRAG = `
precision mediump float;
varying vec2 vUv;
varying highp vec2 vSplitUv;
uniform sampler2D uA;
uniform sampler2D uB;
uniform float uGap;
uniform float uCentre;
uniform float uZoom;
uniform float uWidth;
uniform float uReveal;
uniform float uRows;
uniform float uStagger;
uniform float uCollapse;
uniform float uGapOnly;
uniform highp float uHeight;
uniform highp float uSplitRows;
uniform highp vec2 uEdges;

highp float splitHash(highp float row) {
  highp float seed = mod(mod(row, 997.0) * 73.0 + 19.0, 997.0);
  return mod(seed * seed + 31.0, 997.0) / 997.0;
}

float hash(float n) { return fract(sin(n * 127.1) * 43758.5453); }

vec4 sceneA(vec2 uv) {
  if (uZoom == 1.0) return texture2D(uA, uv);
  return texture2D(uA, vec2(uCentre, 0.5) + (uv - vec2(uCentre, 0.5)) / uZoom);
}

void main() {
  vec2 uv = vUv;
  if (uGapOnly > 0.5) {
    // Real SVG halves own everything outside the seam, including all ink.
    if (vSplitUv.x < uEdges.x || vSplitUv.x >= uEdges.y) { gl_FragColor = vec4(0.0); return; }
    highp float y = 1.0 - vSplitUv.y;
    highp float row = min(uSplitRows - 1.0, floor(y * uSplitRows));
    highp float centre = (row + 0.5) / uSplitRows;
    highp float originalRow = (row + 0.5) / (uSplitRows / 90.0) - 0.5;
    bool rule = abs(originalRow - 17.0) < 0.001 || abs(originalRow - 62.0) < 0.001 || abs(originalRow - 73.0) < 0.001 || abs(originalRow - 82.0) < 0.001;
    highp float thickness = (1.0 - uCollapse) / uSplitRows + (rule ? uCollapse / 900.0 : 0.0);
    highp float coverage = clamp((thickness * 0.5 - abs(y - centre)) * uHeight + 0.5, 0.0, 1.0);
    if (uCollapse <= 0.0) coverage = 1.0;
    if (thickness <= 0.0) coverage = 0.0;
    highp float cut = 0.5 + (vSplitUv.x < 0.5 ? -1.0 : 1.0) * ${COLLAPSE_SAMPLE_WINDOW} * splitHash(row);
    vec3 paper = vec3(250.0, 249.0, 246.0) / 255.0;
    vec3 divider = vec3(222.0, 221.0, 214.0) / 255.0;
    vec3 ink = texture2D(uA, vec2(cut, 1.0 - centre)).rgb;
    if (rule) ink = mix(ink, divider, uCollapse);
    // Settle horizontally inward to the page margins; y never moves.
    highp float extent = mix((uEdges.y - uEdges.x) * 0.5, 0.42, uCollapse);
    if (abs(vSplitUv.x - 0.5) > extent) coverage = 0.0;
    gl_FragColor = vec4(mix(paper, ink, coverage * (rule ? 1.0 : 1.0 - uCollapse)), 1.0);
    return;
  }
  float row = floor(uv.y * uRows);
  float grow = clamp(uGap * 5.0, 0.0, 1.0);
  // Only boundaries stagger. Original halves translate rigidly; y never changes.
  float halfGap = uGap * 0.5 + hash(row) * uStagger * grow;
  float open = clamp((1.0 - uReveal) * 5.0, 0.0, 1.0) * clamp(uReveal * 5.0, 0.0, 1.0);
  float opening = (1.0 - uReveal) * max(uCentre, 1.0 - uCentre) + (hash(row + 71.0) - 0.5) * uStagger * open;

  vec4 col;
  if (uReveal <= 0.0 || (uReveal < 1.0 && abs(uv.x - uCentre) <= opening)) {
    col = texture2D(uB, uv);
  } else if (uGap <= 0.0) {
    col = sceneA(uv);
  } else if (uv.x < uCentre - halfGap) {
    col = sceneA(vec2(uv.x + uGap * 0.5, uv.y));
  } else if (uv.x > uCentre + halfGap) {
    col = sceneA(vec2(uv.x - uGap * 0.5, uv.y));
  } else {
    float cut = uCentre + (uv.x < uCentre ? -0.5 : 0.5) / uWidth;
    col = sceneA(vec2(cut, uv.y));
  }
  gl_FragColor = col;
}`

function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader {
  const sh = gl.createShader(type)!
  gl.shaderSource(sh, src)
  gl.compileShader(sh)
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(sh) ?? 'shader compile failed')
  }
  return sh
}

function createGL(canvas: HTMLCanvasElement): StretchRenderer | null {
  const gl = canvas.getContext('webgl', { antialias: false, premultipliedAlpha: false })
  if (!gl) return null

  const prog = gl.createProgram()!
  gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT))
  gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG))
  gl.linkProgram(prog)
  gl.useProgram(prog)

  const buf = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buf)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
  const aPos = gl.getAttribLocation(prog, 'aPos')
  gl.enableVertexAttribArray(aPos)
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)

  const u = (name: string) => gl.getUniformLocation(prog, name)
  const uGap = u('uGap'), uReveal = u('uReveal')
  const uGapOnly = u('uGapOnly'), uCollapse = u('uCollapse'), uHeight = u('uHeight')
  gl.uniform1i(u('uA'), 0)
  gl.uniform1i(u('uB'), 1)
  gl.uniform1f(u('uStagger'), 0.025)

  const makeTex = (unit: number) => {
    const t = gl.createTexture()!
    gl.activeTexture(gl.TEXTURE0 + unit)
    gl.bindTexture(gl.TEXTURE_2D, t)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
    return t
  }
  const texA = makeTex(0)
  const texB = makeTex(1)
  let ready = false

  return {
    setScenes(a, b) {
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, texA)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, a)
      gl.activeTexture(gl.TEXTURE1)
      gl.bindTexture(gl.TEXTURE_2D, texB)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, b)
      gl.viewport(0, 0, canvas.width, canvas.height)
      gl.uniform1f(u('uWidth'), a.width)
      // ~5 CSS px per row regardless of screen size
      gl.uniform1f(u('uRows'), (canvas.clientHeight || 900) / 5)
      ready = true
    },
    render(s) {
      if (!ready) return
      gl.uniform1f(u('uCentre'), s.centre ?? 0.5)
      gl.uniform1f(u('uZoom'), s.zoom ?? 1)
      gl.uniform1f(uGap, s.gap)
      gl.uniform1f(uReveal, s.reveal)
      gl.uniform1f(uGapOnly, s.collapse === undefined ? 0 : 1)
      gl.uniform1f(uCollapse, s.collapse ?? 0)
      gl.uniform1f(uHeight, canvas.height)
      if (s.collapse !== undefined) {
        const edges = splitEdges(canvas.width, s.gap)
        gl.uniform2f(u('uEdges'), edges.left / canvas.width, edges.right / canvas.width)
        gl.uniform1f(u('uSplitRows'), collapseRowCount(canvas.clientHeight || 900))
      }
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    },
    dispose() {
      gl.deleteTexture(texA)
      gl.deleteTexture(texB)
      gl.deleteBuffer(buf)
      gl.deleteProgram(prog)
    },
  }
}

// Same effect without WebGL: stretch a one-pixel column with drawImage.
function create2D(canvas: HTMLCanvasElement): StretchRenderer | null {
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  let A: HTMLCanvasElement | null = null
  let B: HTMLCanvasElement | null = null
  return {
    setScenes(a, b) { A = a; B = b },
    render(s) {
      if (!A || !B) return
      const w = canvas.width, h = canvas.height
      ctx.clearRect(0, 0, w, h)
      if (s.collapse !== undefined) {
        const c = Math.max(0, Math.min(1, s.collapse))
        const edges = splitEdges(w, s.gap)
        const gap = edges.right - edges.left
        const rows = collapseRowCount(canvas.clientHeight || 900)
        ctx.fillStyle = NOW_PAPER
        ctx.fillRect((w - gap) / 2, 0, gap, h)
        const extent = (1 - c) * gap / 2 + c * 0.42 * w
        ctx.save()
        ctx.beginPath()
        ctx.rect((w - gap) / 2, 0, gap, h)
        ctx.clip()
        ctx.imageSmoothingEnabled = false
        for (let row = 0; row < rows; row++) {
          const band = sampleCollapseBand(row, c, rows)
          const height = band.thickness * h
          if (height <= 0) continue
          const y = band.y * h - height / 2
          ctx.globalAlpha = band.opacity
          for (let side = 0; side < 2; side++) {
            ctx.drawImage(A, Math.floor(sampleCollapseSource(row, side === 0 ? 'left' : 'right') * A.width), Math.floor(band.y * A.height), 1, 1,
              w / 2 - extent + side * extent, y, extent, height)
          }
          if (band.rule) {
            ctx.globalAlpha = c
            ctx.fillStyle = NOW_DIVIDER
            ctx.fillRect(w / 2 - extent, y, extent * 2, height)
          }
        }
        ctx.restore()
        return
      }
      const centre = s.centre ?? 0.5
      const zoom = s.zoom ?? 1
      const seam = centre * w
      const shift = s.gap * w / 2
      // Zoom about the seam before translating either half. Crop from the
      // original texture, so resizing never accumulates raster transforms.
      const sourceX = (x: number) => (centre + (x / w - centre) / zoom) * A!.width
      const sourceY = (y: number) => (0.5 + (y / h - 0.5) / zoom) * A!.height
      const drawA = (left: number, right: number, offset: number) => {
        ctx.drawImage(A!, sourceX(left + offset), sourceY(0), (right - left) / w * A!.width / zoom, A!.height / zoom,
          left, 0, right - left, h)
      }
      if (seam - shift > 0) drawA(0, seam - shift, shift)
      if (seam + shift < w) drawA(seam + shift, w, -shift)
      const rows = Math.max(1, (canvas.clientHeight || 900) / 5)
      const hash = (n: number) => { const v = Math.sin(n * 127.1) * 43758.5453; return v - Math.floor(v) }
      const grow = Math.min(1, s.gap * 5)
      const open = Math.min(1, (1 - s.reveal) * 5) * Math.min(1, s.reveal * 5)
      ctx.imageSmoothingEnabled = false
      for (let y = 0; y < h; y++) {
        const row = Math.floor((1 - (y + 0.5) / h) * rows)
        const halfGap = shift + hash(row) * 0.025 * w * grow
        if (s.gap > 0) {
          for (const side of [-1, 1]) {
            const left = side < 0 ? Math.max(0, seam - halfGap) : seam
            const right = side < 0 ? seam : Math.min(w, seam + halfGap)
            const cut = centre * A.width + side * 0.5 / zoom
            ctx.drawImage(A, Math.floor(cut), sourceY(y), 1, A.height / h / zoom, left, y, right - left, 1)
          }
        }
        const opening = Math.max(0, ((1 - s.reveal) * Math.max(centre, 1 - centre) + (hash(row + 71) - 0.5) * 0.025 * open) * w)
        const left = Math.max(0, seam - opening), right = Math.min(w, seam + opening)
        if (s.reveal < 1 && right > left) ctx.drawImage(B, left / w * B.width, y / h * B.height, (right - left) / w * B.width, B.height / h, left, y, right - left, 1)
      }
    },
    dispose() {},
  }
}

export function createStretchRenderer(canvas: HTMLCanvasElement): StretchRenderer | null {
  try {
    return createGL(canvas) ?? create2D(canvas)
  } catch {
    return create2D(canvas)
  }
}

// Rasterize a decoded image or URL, cropped like `object-fit: cover`.
export async function rasterize(source: HTMLImageElement | string, w: number, h: number): Promise<HTMLCanvasElement> {
  const img = typeof source === 'string' ? new Image() : source
  if (typeof source === 'string') img.src = source
  if (!img.complete || !img.naturalWidth) await img.decode()
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')!
  const s = Math.max(w / img.naturalWidth, h / img.naturalHeight)
  const dw = img.naturalWidth * s, dh = img.naturalHeight * s
  ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh)
  return c
}
