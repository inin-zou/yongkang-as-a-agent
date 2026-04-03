import { useEffect, useRef } from 'react'

interface HalftoneCanvasProps {
  reducedMotion: boolean
}

/* ---------- Shaders ---------- */
const VS_SOURCE = /* glsl */ `
  attribute vec4 aVertexPosition;
  void main() {
    gl_Position = aVertexPosition;
  }
`

const FS_SOURCE = /* glsl */ `
  precision highp float;
  uniform vec2 u_resolution;
  uniform float u_time;

  vec3 permute(vec3 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }

  float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                        -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod(i, 289.0);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
                             + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy),
                             dot(x12.zw, x12.zw)), 0.0);
    m = m * m;
    m = m * m;
    vec3 x_ = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x_) - 0.5;
    vec3 ox = floor(x_ + 0.5);
    vec3 a0 = x_ - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
    vec3 g;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }

  void main() {
    vec2 st = gl_FragCoord.xy / u_resolution.xy;
    st.x *= u_resolution.x / u_resolution.y;

    float scale = 60.0;
    vec2 gridUv = st * scale;
    vec2 id = floor(gridUv);
    vec2 fractUv = fract(gridUv) - 0.5;

    float t = u_time * 0.15;
    float n1 = snoise(id * 0.08 + vec2(t, t * 0.3));
    float finalNoise = n1 * 0.5 + 0.5;
    float targetRadius = smoothstep(0.3, 0.7, finalNoise) * 0.42;
    float dist = length(fractUv);
    float edge = 0.06;
    float dotAlpha = 1.0 - smoothstep(targetRadius - edge, targetRadius + edge, dist);

    // Prismatic tint based on grid position
    float prismT = sin(st.x * 3.0 + u_time * 0.2) * 0.5 + 0.5;
    vec3 pink     = vec3(1.0, 0.42, 0.62);
    vec3 teal     = vec3(0.30, 0.82, 0.88);
    vec3 lavender = vec3(0.70, 0.53, 1.0);
    vec3 dotColor = mix(pink, teal, smoothstep(0.0, 0.5, prismT));
    dotColor      = mix(dotColor, lavender, smoothstep(0.5, 1.0, prismT));
    // Keep it subtle — blend with the base off-white
    dotColor = mix(vec3(0.91, 0.89, 0.86), dotColor, 0.3);

    gl_FragColor = vec4(dotColor, dotAlpha * 0.9);
  }
`

/* ---------- WebGL helpers ---------- */
function createShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type)
  if (!shader) return null
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('Shader compile error:', gl.getShaderInfoLog(shader))
    gl.deleteShader(shader)
    return null
  }
  return shader
}

/* ---------- Component ---------- */
export default function HalftoneCanvas({ reducedMotion }: HalftoneCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const gl = canvas.getContext('webgl', { antialias: false })
    if (!gl) return

    /* Resize */
    function resize() {
      const rect = canvas!.parentElement!.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      canvas!.width = rect.width * dpr
      canvas!.height = rect.height * dpr
      gl!.viewport(0, 0, canvas!.width, canvas!.height)
    }
    resize()
    window.addEventListener('resize', resize)

    /* Compile shaders + create program */
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, VS_SOURCE)
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, FS_SOURCE)
    if (!vertexShader || !fragmentShader) return

    const program = gl.createProgram()!
    gl.attachShader(program, vertexShader)
    gl.attachShader(program, fragmentShader)
    gl.linkProgram(program)

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program link error:', gl.getProgramInfoLog(program))
      return
    }

    /* Full-screen quad */
    const positionBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, 1, 1, 1, -1, -1, 1, -1]),
      gl.STATIC_DRAW,
    )

    const positionLocation = gl.getAttribLocation(program, 'aVertexPosition')
    const resolutionLocation = gl.getUniformLocation(program, 'u_resolution')
    const timeLocation = gl.getUniformLocation(program, 'u_time')

    /* Render */
    let animId: number

    function render(time: number) {
      const t = reducedMotion ? 0 : time * 0.001
      gl!.viewport(0, 0, canvas!.width, canvas!.height)
      gl!.clearColor(0, 0, 0, 0)
      gl!.clear(gl!.COLOR_BUFFER_BIT)
      gl!.useProgram(program)
      gl!.enableVertexAttribArray(positionLocation)
      gl!.bindBuffer(gl!.ARRAY_BUFFER, positionBuffer)
      gl!.vertexAttribPointer(positionLocation, 2, gl!.FLOAT, false, 0, 0)
      gl!.uniform2f(resolutionLocation, canvas!.width, canvas!.height)
      gl!.uniform1f(timeLocation, t)
      gl!.enable(gl!.BLEND)
      gl!.blendFunc(gl!.SRC_ALPHA, gl!.ONE_MINUS_SRC_ALPHA)
      gl!.drawArrays(gl!.TRIANGLE_STRIP, 0, 4)

      if (!reducedMotion) {
        animId = requestAnimationFrame(render)
      }
    }

    animId = requestAnimationFrame(render)

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
    }
  }, [reducedMotion])

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: '100%', display: 'block' }}
    />
  )
}
