/**
 * WebGL2 world terrain renderer — crisp Minecraft-like pixel tiles.
 * Hard tile edges, per-tile noise, no soft blur / no animation.
 */

import { TILE_PX } from '@/lib/sim/tileArt'
import { paletteFloat32 } from './terrainColors'
import { seedNoise } from './noise'

/** Round up to a multiple of 4 (GPU row / texture alignment). */
function alignTexDim(n: number): number {
  return Math.max(4, (n + 3) & ~3)
}

const VERT = `#version 300 es
precision highp float;
layout(location=0) in vec2 a_pos;
out vec2 v_uv;
void main() {
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`

const FRAG = `#version 300 es
precision highp float;
precision highp usampler2D;

uniform usampler2D u_terrain;
uniform usampler2D u_amount;
uniform sampler2D u_palette; // 64x1 RGB
uniform vec2 u_worldSize;
uniform vec2 u_cam;       // world px top-left
uniform float u_visible;  // world px visible (square)
uniform float u_tilePx;
uniform float u_time;
uniform float u_season;   // 0 spring 1 summer 2 autumn 3 winter
uniform float u_hour;     // 0-23
uniform float u_dayNight; // 0/1
uniform float u_seed;

in vec2 v_uv;
out vec4 outColor;

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21) + u_seed * 0.001);
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

// Value noise
float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
  float s = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    s += a * vnoise(p);
    p *= 2.07;
    a *= 0.5;
  }
  return s;
}

uint sampleTerrain(ivec2 c) {
  ivec2 sz = ivec2(u_worldSize);
  c = clamp(c, ivec2(0), sz - 1);
  return texelFetch(u_terrain, c, 0).r;
}

uint sampleAmount(ivec2 c) {
  ivec2 sz = ivec2(u_worldSize);
  c = clamp(c, ivec2(0), sz - 1);
  return texelFetch(u_amount, c, 0).r;
}

vec3 paletteColor(uint id) {
  float u = (float(id) + 0.5) / 64.0;
  return texture(u_palette, vec2(u, 0.5)).rgb;
}

// Soft category — codes match types.ts
// 0 grasslike, 1 water, 2 rock, 3 built, 4 path, 5 canopy
float category(uint id) {
  if (id == 14u) return 1.0; // WATER
  if (id == 2u || id == 3u) return 5.0; // TREE / BUSH
  if (id == 1u || id == 4u || id == 25u || id == 26u || id == 27u) return 2.0; // stone/gold/iron/mountain/tunnel
  if (id == 15u || id == 16u || id == 22u || id == 23u) return 4.0; // path/bridge/trail/road
  // Built: HOUSE(6)=timber walls, PLANK(18)=oak floors, furniture, mills…
  if (id == 5u || id == 6u || id == 8u || id == 9u || id == 10u || id == 11u ||
      id == 13u || id == 18u || id == 21u || id == 24u ||
      id == 28u || id == 29u || id == 30u || id == 31u || id == 32u ||
      id == 33u || id == 34u || id == 35u || id == 36u) return 3.0;
  return 0.0;
}

vec3 wheatTint(uint amount) {
  if (amount >= 140u) return vec3(0.78, 0.62, 0.22);
  if (amount >= 45u) return vec3(0.32, 0.46, 0.22);
  return vec3(0.36, 0.26, 0.14);
}

// Minecraft-style tile face: hard cells + light 3×3 subpixels + rim shade.
vec3 tileColor(uint id, uint amount, ivec2 cell, vec2 f) {
  float n = hash21(vec2(cell) + u_seed * 0.01);
  float n2 = hash21(vec2(cell) * 1.7 + 19.0);
  float cat = category(id);
  vec3 c;

  if (id == 20u) {
    c = wheatTint(amount);
  } else if (id == 19u) {
    // FIELD — dark tilled soil (hard contrast vs grass)
    c = mix(vec3(0.28, 0.18, 0.10), vec3(0.34, 0.22, 0.12), n);
    float furrow = step(0.55, fract(f.y * 5.0));
    c *= mix(1.0, 0.78, furrow);
  } else if (id == 12u) {
    // DIRT — earthy grazed / bare soil (not meadow green)
    if (amount > 0u) {
      c = vec3(0.52, 0.38, 0.22);
    } else {
      c = mix(vec3(0.36, 0.30, 0.20), vec3(0.30, 0.42, 0.22), n * 0.55 + n2 * 0.2);
      c = mix(c, vec3(0.42, 0.32, 0.20), step(0.72, n) * 0.45);
    }
  } else if (id == 17u) {
    // SAND
    c = mix(vec3(0.78, 0.72, 0.52), vec3(0.70, 0.64, 0.44), n);
  } else if (id == 27u && amount >= 1u) {
    c = vec3(0.10, 0.08, 0.06);
  } else if (cat < 0.5) {
    // Grass — muted olive meadow
    vec3 a = vec3(0.30, 0.44, 0.22);
    vec3 b = vec3(0.34, 0.48, 0.24);
    vec3 d = vec3(0.24, 0.36, 0.18);
    vec3 dry = vec3(0.40, 0.42, 0.24);
    c = mix(a, b, step(0.5, n));
    c = mix(c, d, step(0.78, n2));
    c = mix(c, dry, step(0.92, n));
  } else if (cat > 4.5) {
    // Tree / bush canopy — readable dark green (not near-black)
    c = mix(vec3(0.14, 0.30, 0.14), vec3(0.20, 0.40, 0.16), n);
    if (id == 3u) c = mix(vec3(0.22, 0.40, 0.16), vec3(0.55, 0.22, 0.28), step(0.7, n2) * 0.35);
  } else if (cat > 0.5 && cat < 1.5) {
    c = paletteColor(id);
    c = mix(c, c * 1.12, step(0.55, n) * 0.35);
  } else if (cat > 3.5 && cat < 4.5) {
    // Path / trail / road — packed earth under ribbon overlay
    c = mix(vec3(0.30, 0.42, 0.22), vec3(0.36, 0.28, 0.18), n * 0.4);
  } else if (id == 6u || id == 10u) {
    // Timber wall — dark but readable at distance (not pure black)
    c = vec3(0.28, 0.18, 0.10);
    c = mix(c, vec3(0.36, 0.24, 0.12), step(0.5, n));
    float band = step(0.55, fract(f.y * 3.0));
    c *= mix(1.0, 0.82, band);
  } else if (id == 18u) {
    // Oak plank floor — warm boards vs walls
    c = vec3(0.78, 0.62, 0.38);
    c = mix(c, vec3(0.68, 0.52, 0.30), step(0.55, n));
    float seam = step(0.88, fract(f.y * 4.0));
    c *= mix(1.0, 0.8, seam);
  } else if (id == 13u) {
    // Bed — red blanket signal under overlay
    c = vec3(0.72, 0.28, 0.24);
  } else if (id == 28u) {
    c = vec3(0.42, 0.28, 0.14);
  } else if (id == 29u) {
    c = vec3(0.35, 0.32, 0.30);
    c = mix(c, vec3(0.85, 0.40, 0.12), step(0.65, n) * 0.45);
  } else if (id == 8u) {
    c = vec3(0.55, 0.38, 0.14);
  } else if (id == 9u) {
    c = vec3(0.60, 0.38, 0.18);
  } else if (id == 11u) {
    // Stone wall
    c = vec3(0.32, 0.30, 0.28);
    c = mix(c, vec3(0.40, 0.38, 0.36), step(0.55, n));
  } else {
    c = paletteColor(id);
    c = mix(c, c * 0.88, n * 0.25);
  }

  // Soft sub-pixel mottling (less Minecraft block noise)
  vec2 q = floor(f * float(${TILE_PX}));
  float pn = hash21(vec2(cell) * float(${TILE_PX}) + q);
  c += (pn - 0.5) * 0.028;

  // Soft bevel — top/left lighter, bottom/right darker (static, no anim)
  float rimL = smoothstep(0.0, 0.18, f.x) * smoothstep(0.0, 0.18, f.y);
  float rimD = smoothstep(1.0, 0.82, f.x) * 0.5 + smoothstep(1.0, 0.82, f.y) * 0.5;
  c *= mix(1.05, 0.92, clamp(rimD * (1.0 - rimL * 0.5), 0.0, 1.0));

  // Subtle tile seam (RW/DF readability without loud Minecraft grid)
  if (cat < 3.5 || cat > 4.5) {
    if (f.x < 0.03 || f.y < 0.03) c *= 0.92;
  }

  return clamp(c, 0.0, 1.0);
}

void main() {
  vec2 uv = vec2(v_uv.x, 1.0 - v_uv.y);
  vec2 worldPx = u_cam + uv * u_visible;
  vec2 tilePos = worldPx / u_tilePx;

  if (tilePos.x < 0.0 || tilePos.y < 0.0 ||
      tilePos.x >= u_worldSize.x || tilePos.y >= u_worldSize.y) {
    outColor = vec4(0.08, 0.09, 0.10, 1.0);
    return;
  }

  ivec2 cell = ivec2(floor(tilePos));
  vec2 f = fract(tilePos);
  uint id = sampleTerrain(cell);
  uint amount = sampleAmount(cell);
  vec3 col = tileColor(id, amount, cell, f);

  // Light season wash — tiles already carry seasonal colors.
  if (u_season < 0.5) col = mix(col, vec3(0.55, 0.75, 0.43), 0.015);
  else if (u_season < 1.5) col = mix(col, vec3(1.0, 0.86, 0.55), 0.015);
  else if (u_season < 2.5) col = mix(col, vec3(0.78, 0.5, 0.2), 0.02);
  else col = mix(col, vec3(0.73, 0.82, 0.89), 0.03);

  if (u_dayNight > 0.5) {
    float h = u_hour;
    float night = 0.0;
    float warm = 0.0;
    if (h < 6.0 || h >= 20.0) night = h < 6.0 ? smoothstep(6.0, 4.0, h) : smoothstep(20.0, 22.0, h);
    if (h >= 5.0 && h < 8.0) warm = 1.0 - abs(h - 6.5) / 1.5;
    if (h >= 17.0 && h < 20.0) warm = 1.0 - abs(h - 18.5) / 1.5;
    warm = clamp(warm, 0.0, 1.0);
    night = clamp(night, 0.0, 1.0);
    col = mix(col, col * vec3(1.1, 0.9, 0.72), warm * 0.22);
    col *= mix(1.0, 0.30, night * 0.85);
  }

  outColor = vec4(col, 1.0);
}
`

function compile(gl: WebGL2RenderingContext, type: number, src: string) {
  const sh = gl.createShader(type)
  if (!sh) throw new Error('createShader failed')
  gl.shaderSource(sh, src)
  gl.compileShader(sh)
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(sh) ?? 'unknown'
    gl.deleteShader(sh)
    throw new Error(`Shader compile: ${log}`)
  }
  return sh
}

function link(gl: WebGL2RenderingContext, vs: WebGLShader, fs: WebGLShader) {
  const prog = gl.createProgram()
  if (!prog) throw new Error('createProgram failed')
  gl.attachShader(prog, vs)
  gl.attachShader(prog, fs)
  gl.linkProgram(prog)
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(prog) ?? 'unknown'
    gl.deleteProgram(prog)
    throw new Error(`Program link: ${log}`)
  }
  return prog
}

export type WorldGlDrawParams = {
  camX: number
  camY: number
  zoom: number
  displaySize: number
  season: 'spring' | 'summer' | 'autumn' | 'winter'
  hour: number
  showDayNight: boolean
  timeMs: number
}

export class WorldGlRenderer {
  readonly canvas: HTMLCanvasElement
  private gl: WebGL2RenderingContext
  private program: WebGLProgram
  private vao: WebGLVertexArrayObject
  private terrainTex: WebGLTexture
  private amountTex: WebGLTexture
  private paletteTex: WebGLTexture
  private worldSize = 0
  private texSize = 0
  private terrainCpu: Uint8Array | null = null
  private amountCpu: Uint8Array | null = null // packed 0-255 from Uint16
  private seed = 1
  private locs: Record<string, WebGLUniformLocation | null> = {}

  constructor(canvas: HTMLCanvasElement) {
    const gl = canvas.getContext('webgl2', {
      alpha: false,
      antialias: false,
      desynchronized: true,
      powerPreference: 'high-performance',
    })
    if (!gl) throw new Error('WebGL2 unavailable')
    this.canvas = canvas
    this.gl = gl

    const vs = compile(gl, gl.VERTEX_SHADER, VERT)
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG)
    this.program = link(gl, vs, fs)
    gl.deleteShader(vs)
    gl.deleteShader(fs)

    const vao = gl.createVertexArray()
    if (!vao) throw new Error('vao')
    this.vao = vao
    gl.bindVertexArray(vao)
    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
    gl.enableVertexAttribArray(0)
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
    gl.bindVertexArray(null)

    this.terrainTex = gl.createTexture()!
    this.amountTex = gl.createTexture()!
    this.paletteTex = gl.createTexture()!

    // Palette 64×4 RGBA (power-of-two width, height multiple of 4; NEAREST)
    gl.bindTexture(gl.TEXTURE_2D, this.paletteTex)
    const pal = paletteFloat32()
    const palW = 64
    const palH = 4
    const rgba = new Uint8Array(palW * palH * 4)
    for (let row = 0; row < palH; row++) {
      for (let i = 0; i < palW; i++) {
        const o = (row * palW + i) * 4
        rgba[o] = Math.round(pal[i * 3] * 255)
        rgba[o + 1] = Math.round(pal[i * 3 + 1] * 255)
        rgba[o + 2] = Math.round(pal[i * 3 + 2] * 255)
        rgba[o + 3] = 255
      }
    }
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, palW, palH, 0, gl.RGBA, gl.UNSIGNED_BYTE, rgba)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

    const names = [
      'u_terrain',
      'u_amount',
      'u_palette',
      'u_worldSize',
      'u_cam',
      'u_visible',
      'u_tilePx',
      'u_time',
      'u_season',
      'u_hour',
      'u_dayNight',
      'u_seed',
    ]
    for (const n of names) this.locs[n] = gl.getUniformLocation(this.program, n)
  }

  setSeed(seed: number) {
    this.seed = seed
    seedNoise(seed)
  }

  private uploadR8(tex: WebGLTexture, data: Uint8Array, texSize: number) {
    const gl = this.gl
    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8UI, texSize, texSize, 0, gl.RED_INTEGER, gl.UNSIGNED_BYTE, data)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  }

  /** Pack sim amount into an aligned texSize×texSize buffer (world in top-left). */
  private packAmount(amount: Uint16Array, worldSize: number, texSize: number): Uint8Array {
    const out = new Uint8Array(texSize * texSize)
    for (let y = 0; y < worldSize; y++) {
      const srcRow = y * worldSize
      const dstRow = y * texSize
      for (let x = 0; x < worldSize; x++) {
        const a = amount[srcRow + x] >> 1
        out[dstRow + x] = a > 255 ? 255 : a
      }
    }
    return out
  }

  private packTerrain(terrain: Uint8Array, worldSize: number, texSize: number): Uint8Array {
    if (worldSize === texSize) return new Uint8Array(terrain)
    const out = new Uint8Array(texSize * texSize)
    for (let y = 0; y < worldSize; y++) {
      out.set(terrain.subarray(y * worldSize, y * worldSize + worldSize), y * texSize)
    }
    return out
  }

  /** Full world boot / reset. */
  setWorld(terrain: Uint8Array, amount: Uint16Array, size: number) {
    this.worldSize = size
    this.texSize = alignTexDim(size)
    this.terrainCpu = this.packTerrain(terrain, size, this.texSize)
    this.amountCpu = this.packAmount(amount, size, this.texSize)
    this.uploadR8(this.terrainTex, this.terrainCpu, this.texSize)
    this.uploadR8(this.amountTex, this.amountCpu, this.texSize)
  }

  /**
   * Incremental dirty update from worker.
   * Coalesce: never storm the GPU with hundreds of 1×1 texSubImage2D
   * (build stamps / floor floods). Prefer bbox row uploads or full tex.
   * See BUILD_BOTTLENECKS.md §2.B / §6.2.
   */
  patchDirty(indices: Uint32Array, terrain: Uint8Array, amount: Uint16Array) {
    if (!this.terrainCpu || !this.amountCpu || this.worldSize <= 0 || this.texSize <= 0) return
    const gl = this.gl
    const size = this.worldSize
    const texSize = this.texSize
    const n = indices.length
    if (n === 0) return

    let minX = size
    let maxX = 0
    let minY = size
    let maxY = 0
    for (let k = 0; k < n; k++) {
      const i = indices[k]
      const x = i % size
      const y = (i / size) | 0
      const ti = y * texSize + x
      this.terrainCpu[ti] = terrain[k]
      const a = amount[k] >> 1
      this.amountCpu[ti] = a > 255 ? 255 : a
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
    }

    // Large bursts (house floor stamp, multi-builder) → one full upload each.
    if (n >= 64) {
      this.uploadR8(this.terrainTex, this.terrainCpu, texSize)
      this.uploadR8(this.amountTex, this.amountCpu, texSize)
      return
    }

    const bw = maxX - minX + 1
    const bh = maxY - minY + 1
    // Sparse tiny edits: a few 1×1 is fine. Dense bbox of small n → row uploads.
    const useRows = n > 8 && bw * bh <= n * 4

    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1)
    if (!useRows) {
      for (let k = 0; k < n; k++) {
        const i = indices[k]
        const x = i % size
        const y = (i / size) | 0
        const ti = y * texSize + x
        gl.bindTexture(gl.TEXTURE_2D, this.terrainTex)
        gl.texSubImage2D(
          gl.TEXTURE_2D,
          0,
          x,
          y,
          1,
          1,
          gl.RED_INTEGER,
          gl.UNSIGNED_BYTE,
          this.terrainCpu.subarray(ti, ti + 1),
        )
        gl.bindTexture(gl.TEXTURE_2D, this.amountTex)
        gl.texSubImage2D(
          gl.TEXTURE_2D,
          0,
          x,
          y,
          1,
          1,
          gl.RED_INTEGER,
          gl.UNSIGNED_BYTE,
          this.amountCpu.subarray(ti, ti + 1),
        )
      }
      return
    }

    // Upload each dirty row of the bbox as one texSubImage2D (≤ bh*2 calls).
    for (let y = minY; y <= maxY; y++) {
      const ti = y * texSize + minX
      gl.bindTexture(gl.TEXTURE_2D, this.terrainTex)
      gl.texSubImage2D(
        gl.TEXTURE_2D,
        0,
        minX,
        y,
        bw,
        1,
        gl.RED_INTEGER,
        gl.UNSIGNED_BYTE,
        this.terrainCpu.subarray(ti, ti + bw),
      )
      gl.bindTexture(gl.TEXTURE_2D, this.amountTex)
      gl.texSubImage2D(
        gl.TEXTURE_2D,
        0,
        minX,
        y,
        bw,
        1,
        gl.RED_INTEGER,
        gl.UNSIGNED_BYTE,
        this.amountCpu.subarray(ti, ti + bw),
      )
    }
  }

  resize(w: number, h: number) {
    // Keep buffer size identical to the 2D overlay canvas; align to multiple of 4.
    const bw = alignTexDim(Math.max(1, Math.floor(w)))
    const bh = alignTexDim(Math.max(1, Math.floor(h)))
    if (this.canvas.width !== bw || this.canvas.height !== bh) {
      this.canvas.width = bw
      this.canvas.height = bh
    }
  }

  draw(p: WorldGlDrawParams) {
    if (this.worldSize <= 0) return
    const gl = this.gl
    const visible = p.displaySize / p.zoom
    gl.viewport(0, 0, this.canvas.width, this.canvas.height)
    gl.useProgram(this.program)
    gl.bindVertexArray(this.vao)

    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, this.terrainTex)
    gl.uniform1i(this.locs.u_terrain, 0)

    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, this.amountTex)
    gl.uniform1i(this.locs.u_amount, 1)

    gl.activeTexture(gl.TEXTURE2)
    gl.bindTexture(gl.TEXTURE_2D, this.paletteTex)
    gl.uniform1i(this.locs.u_palette, 2)

    gl.uniform2f(this.locs.u_worldSize, this.worldSize, this.worldSize)
    gl.uniform2f(this.locs.u_cam, p.camX, p.camY)
    gl.uniform1f(this.locs.u_visible, visible)
    gl.uniform1f(this.locs.u_tilePx, TILE_PX)
    gl.uniform1f(this.locs.u_time, p.timeMs)
    const seasonMap = { spring: 0, summer: 1, autumn: 2, winter: 3 }
    gl.uniform1f(this.locs.u_season, seasonMap[p.season] ?? 0)
    gl.uniform1f(this.locs.u_hour, p.hour)
    gl.uniform1f(this.locs.u_dayNight, p.showDayNight ? 1 : 0)
    gl.uniform1f(this.locs.u_seed, this.seed)

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
  }

  destroy() {
    const gl = this.gl
    gl.deleteProgram(this.program)
    gl.deleteVertexArray(this.vao)
    gl.deleteTexture(this.terrainTex)
    gl.deleteTexture(this.amountTex)
    gl.deleteTexture(this.paletteTex)
  }
}
