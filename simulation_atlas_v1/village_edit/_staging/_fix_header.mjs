import fs from "fs"

const path = "src/lib/render/nature/shorePaint.ts"
const body = fs.readFileSync(path, "utf8")

const header = `/**
 * Continuous shore + dirt paint — multi-cell shared SDF strip.
 * Opaque land/cover color-lerp; neighbor overspill so coasts do not seam
 * on the tile grid (Stardew/Puny continuous water).
 */
import { DIRT, SAND, WATER } from "@/lib/sim/types"
import { fbm2, simplex2 } from "../noise"

export type AtlasColor = { color32: (key: string) => number | null }

function smoothstep(e0: number, e1: number, x: number): number {
  if (e1 <= e0) return x >= e1 ? 1 : 0
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)))
  return t * t * (3 - 2 * t)
}

export function rgbFromPacked(
  c: number | null,
  fallback: [number, number, number],
): [number, number, number] {
  if (c == null) return fallback
  return [c & 255, (c >>> 8) & 255, (c >>> 16) & 255]
}

function shoreWarp(wx: number, wy: number): number {
  return (
    fbm2(wx * 0.22, wy * 0.22, 5, 2.1, 0.55) * 1.55 +
    simplex2(wx * 0.85 + 8.3, wy * 0.85) * 0.85 +
    simplex2(wx * 1.9 - 3.1, wy * 1.9 + 1.7) * 0.45 +
    simplex2(wx * 3.4 + 2.2, wy * 3.4 - 1.1) * 0.22
  )
}

function isWaterCell(terrain: Uint8Array, worldW: number, x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= worldW || y >= worldW) return true
  return terrain[y * worldW + x] === WATER
}

function isDirtOrSand(c: number): boolean {
  return c === DIRT || c === SAND
}

`

if (body.startsWith("import ") || body.includes("function shoreWarp")) {
  console.log("header already present?")
  process.exit(0)
}
if (!body.startsWith("export function shoreSdf")) {
  console.error("unexpected body start:", body.slice(0, 80))
  process.exit(1)
}

// Ensure SHORE_PAD / DIRT_PAD constants exist (may have been wiped)
let next = header + body
if (!next.includes("const SHORE_PAD")) {
  next = next.replace(
    "export function paintOrganicShoreWater(",
    "const SHORE_PAD = 0.42\nconst DIRT_PAD = 0.4\n\nexport function paintOrganicShoreWater(",
  )
}

// Ensure temp canvas globals exist
if (!next.includes("let _shoreTmp")) {
  next = next.replace(
    "function shoreTmpCanvas",
    "let _shoreTmp: HTMLCanvasElement | null = null\nfunction shoreTmpCanvas",
  )
}
if (!next.includes("let _stripTmp")) {
  next = next.replace(
    "function stripCanvas",
    "let _stripTmp: HTMLCanvasElement | null = null\nfunction stripCanvas",
  )
}

fs.writeFileSync(path, next, "utf8")
console.log("header restored", fs.statSync(path).size)