import { createIndex, countResourceNear, findNearestResource, indexTile, type ResourceKind } from './resourceIndex'
import {
  BED,
  BRIDGE,
  BUSH,
  CHEST,
  CLAIM_FIELD,
  CLAIM_HOUSE,
  CLAIM_MILL,
  CLAIM_NONE,
  CLAIM_PATH,
  CLAIM_PEN,
  DIRT,
  FENCE,
  FIELD,
  GOLD,
  GRASS,
  HOUSE,
  IRON,
  LOOT,
  MILL,
  MOUNTAIN,
  PATH,
  PLANK,
  ROAD,
  SAND,
  STONE,
  TRAIL,
  TREE,
  TUNNEL,
  WALL_STONE,
  WALL_WOOD,
  WATER,
  WHEAT,
  WORKBENCH,
  WORLD_SIZE,
  type TerrainCode,
  type WorldGrid,
} from './types'

function isPaved(t: number) {
  return t === TRAIL || t === PATH || t === ROAD
}

export function idx(grid: WorldGrid, x: number, y: number): number {
  return y * grid.width + x
}

export function inBounds(grid: WorldGrid, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < grid.width && y < grid.height
}

export function getTerrain(grid: WorldGrid, x: number, y: number): TerrainCode {
  return grid.terrain[y * grid.width + x]
}

export function setTerrain(grid: WorldGrid, x: number, y: number, value: TerrainCode, amount = 0) {
  const i = y * grid.width + x
  const before = grid.terrain[i]
  if (before !== value || grid.amount[i] !== amount) grid.dirty.push(i)
  grid.terrain[i] = value
  grid.amount[i] = amount
  if (before !== value) {
    if (isPaved(before) && !isPaved(value)) grid.roadTiles--
    else if (!isPaved(before) && isPaved(value)) grid.roadTiles++
    indexTile(grid.index, grid, x, y, value)
  }
}

export function getClaim(grid: WorldGrid, x: number, y: number): number {
  return grid.claim[y * grid.width + x]
}

export function setClaim(grid: WorldGrid, x: number, y: number, code: number) {
  grid.claim[y * grid.width + x] = code
}

export function claimArea(grid: WorldGrid, cx: number, cy: number, radius: number, code: number) {
  for (let x = cx - radius; x <= cx + radius; x++) {
    for (let y = cy - radius; y <= cy + radius; y++) {
      if (inBounds(grid, x, y)) setClaim(grid, x, y, code)
    }
  }
}

export function claimCells(grid: WorldGrid, cells: { x: number; y: number }[], code: number) {
  for (const c of cells) if (inBounds(grid, c.x, c.y)) setClaim(grid, c.x, c.y, code)
}

export function isBlockingWall(grid: WorldGrid, x: number, y: number): boolean {
  const t = grid.terrain[y * grid.width + x]
  return t === FENCE || t === HOUSE || t === WALL_WOOD || t === WALL_STONE || t === WATER || t === MOUNTAIN
}

export function isWater(grid: WorldGrid, x: number, y: number): boolean {
  return grid.terrain[y * grid.width + x] === WATER
}

export function isBuildableGround(grid: WorldGrid, x: number, y: number): boolean {
  const t = grid.terrain[y * grid.width + x]
  return t === GRASS || t === DIRT || t === SAND || t === TRAIL
}

export function touchesWater(grid: WorldGrid, x: number, y: number): boolean {
  if (x < 1 || y < 1 || x >= grid.width - 1 || y >= grid.height - 1) return false
  const w = grid.width
  return (
    grid.terrain[y * w + x + 1] === WATER ||
    grid.terrain[y * w + x - 1] === WATER ||
    grid.terrain[(y + 1) * w + x] === WATER ||
    grid.terrain[(y - 1) * w + x] === WATER
  )
}

export function findMillSite(grid: WorldGrid, baseX: number, baseY: number, maxRadius: number): { x: number; y: number } | null {
  return findNearest(grid, baseX, baseY, maxRadius, (x, y) => isBuildableGround(grid, x, y) && getClaim(grid, x, y) === CLAIM_NONE && touchesWater(grid, x, y))
}

export function makeRng(seed: number) {
  let s = seed >>> 0
  return () => {
    s ^= s << 13
    s ^= s >>> 17
    s ^= s << 5
    s >>>= 0
    return s / 4294967296
  }
}

export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

export function createWorldGrid(seed = 1): WorldGrid {
  const width = WORLD_SIZE
  const height = WORLD_SIZE
  const grid = {
    width,
    height,
    terrain: new Uint8Array(width * height),
    amount: new Uint16Array(width * height),
    ironDeposit: new Uint16Array(width * height),
    goldDeposit: new Uint16Array(width * height),
    claim: new Uint8Array(width * height),
    traffic: new Float32Array(width * height),
    walked: new Set<number>(),
    walkedList: [] as number[],
    walkedCursor: 0,
    crossing: new Map<number, number>(),
    dirty: [] as number[],
    roadTiles: 0,
  } as WorldGrid
  grid.index = createIndex(grid)

  const rng = makeRng(seed)
  const elevation = new Float32Array(width * height)
  const moisture = new Float32Array(width * height)
  const temperature = new Float32Array(width * height)

  // Multi-scale continental terrain. Large noise creates continents and basins;
  // smaller octaves create believable local relief instead of noisy random blobs.
  for (let y = 0; y < height; y++) {
    const lat = Math.abs(y / (height - 1) * 2 - 1)
    for (let x = 0; x < width; x++) {
      const i = y * width + x
      const continental = fbm(x / 230, y / 230, seed, 4)
      const regional = fbm(x / 95, y / 95, seed + 71, 4)
      const local = fbm(x / 28, y / 28, seed + 191, 3)
      elevation[i] = continental * 0.58 + regional * 0.30 + local * 0.12
      const rain = fbm(x / 180, y / 180, seed + 991, 4)
      const coastInfluence = 1 - Math.min(1, Math.abs(elevation[i] - 0.52) * 2.2)
      moisture[i] = clamp(rain * 0.78 + coastInfluence * 0.22, 0, 1)
      temperature[i] = clamp(1 - lat * 0.62 - elevation[i] * 0.24 + fbm(x / 300, y / 300, seed + 313, 2) * 0.12, 0, 1)
    }
  }

  // Shape the world in layers: sea, lakes, mountains, rivers, beaches, then biomes.
  const seaLevel = quantile(elevation, 0.17)
  const mountainLevel = quantile(elevation, 0.82)
  for (let i = 0; i < elevation.length; i++) {
    if (elevation[i] < seaLevel) grid.terrain[i] = WATER
    else if (elevation[i] > mountainLevel && moisture[i] < 0.9) grid.terrain[i] = MOUNTAIN
    else grid.terrain[i] = GRASS
  }

  // Lakes occupy coherent low basins, rather than circles stamped randomly.
  const lakeSeeds = Math.max(8, Math.floor(WORLD_SIZE / 90))
  for (let n = 0; n < lakeSeeds; n++) carveNaturalLake(grid, elevation, rng, seaLevel, n)

  // Rivers originate high up and follow the steepest available downhill path.
  // They merge into existing water and therefore naturally form watersheds.
  const riverCount = Math.max(7, Math.floor(WORLD_SIZE / 105))
  for (let n = 0; n < riverCount; n++) carveNaturalRiver(grid, elevation, moisture, rng, mountainLevel, seaLevel)

  applyBeaches(grid)
  paintNaturalBiomes(grid, elevation, moisture, temperature, seaLevel, mountainLevel)
  placeGeologicalResources(grid, elevation, moisture, temperature, rng, mountainLevel)

  // A final erosion-like smoothing removes isolated single tiles and makes terrain borders read
  // as landforms instead of pixel noise. It never changes the texture set, only terrain placement.
  softenTerrainBoundaries(grid)
  grid.dirty = []
  return grid
}

function hash01(x: number, y: number, seed: number): number {
  let n = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(seed | 0, 1442695041)
  n = Math.imul(n ^ (n >>> 13), 1274126177)
  n ^= n >>> 16
  return (n >>> 0) / 4294967296
}

function smoothstep(t: number): number { return t * t * (3 - 2 * t) }

function valueNoise(x: number, y: number, seed: number): number {
  const x0 = Math.floor(x), y0 = Math.floor(y)
  const tx = smoothstep(x - x0), ty = smoothstep(y - y0)
  const a = hash01(x0, y0, seed), b = hash01(x0 + 1, y0, seed)
  const c = hash01(x0, y0 + 1, seed), d = hash01(x0 + 1, y0 + 1, seed)
  return (a + (b - a) * tx) * (1 - ty) + (c + (d - c) * tx) * ty
}

function fbm(x: number, y: number, seed: number, octaves: number): number {
  let value = 0, amplitude = 0.5, frequency = 1, total = 0
  for (let i = 0; i < octaves; i++) {
    value += valueNoise(x * frequency, y * frequency, seed + i * 1013) * amplitude
    total += amplitude
    amplitude *= 0.5
    frequency *= 2
  }
  return value / total
}

function quantile(values: Float32Array, q: number): number {
  const sample: number[] = []
  const stride = Math.max(1, Math.floor(values.length / 12000))
  for (let i = 0; i < values.length; i += stride) sample.push(values[i])
  sample.sort((a, b) => a - b)
  return sample[Math.floor((sample.length - 1) * q)]
}

function carveNaturalLake(grid: WorldGrid, elevation: Float32Array, rng: () => number, seaLevel: number, salt: number) {
  let bestI = -1, bestScore = Infinity
  const samples = 80
  for (let i = 0; i < samples; i++) {
    const x = 25 + Math.floor(rng() * (grid.width - 50))
    const y = 25 + Math.floor(rng() * (grid.height - 50))
    const idx0 = y * grid.width + x
    const e = elevation[idx0]
    if (e <= seaLevel + 0.035 || e >= 0.62) continue
    const score = e + (0.5 - fbm(x / 40, y / 40, salt + 400, 2)) * 0.03
    if (score < bestScore) { bestScore = score; bestI = idx0 }
  }
  if (bestI < 0) return
  const cx = bestI % grid.width, cy = Math.floor(bestI / grid.width)
  const threshold = elevation[bestI] + 0.018
  const queue: number[] = [bestI], seen = new Set<number>(queue)
  while (queue.length) {
    const i = queue.pop()!
    const x = i % grid.width, y = Math.floor(i / grid.width)
    if (elevation[i] > threshold || elevation[i] <= seaLevel) continue
    setTerrain(grid, x, y, WATER)
    for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]] as const) {
      const nx=x+dx, ny=y+dy
      if (!inBounds(grid,nx,ny)) continue
      const ni=ny*grid.width+nx
      if (!seen.has(ni) && elevation[ni] <= threshold) { seen.add(ni); queue.push(ni) }
    }
  }
  // Prevent tiny puddles from dominating the map.
  if (seen.size < 35) {
    for (const i of seen) grid.terrain[i] = GRASS
  }
  void cx; void cy
}

function carveNaturalRiver(grid: WorldGrid, elevation: Float32Array, moisture: Float32Array, rng: () => number, mountainLevel: number, seaLevel: number) {
  let x = 0, y = 0, best = -Infinity
  for (let i = 0; i < 100; i++) {
    const sx = 15 + Math.floor(rng() * (grid.width - 30))
    const sy = 15 + Math.floor(rng() * (grid.height - 30))
    const e = elevation[sy * grid.width + sx]
    const score = e + moisture[sy * grid.width + sx] * 0.08
    if (e > mountainLevel * 0.86 && score > best) { best = score; x=sx; y=sy }
  }
  const visited = new Set<number>()
  let width = 1
  for (let step = 0; step < grid.width * 1.8; step++) {
    if (!inBounds(grid,x,y)) break
    const i = y * grid.width + x
    if (visited.has(i)) break
    visited.add(i)
    const current = elevation[i]
    if (current <= seaLevel + 0.005 || getTerrain(grid,x,y) === WATER) break
    for (let dx=-width; dx<=width; dx++) for (let dy=-width; dy<=width; dy++) {
      if (dx*dx+dy*dy > width*width+1) continue
      const nx=x+dx, ny=y+dy
      if (inBounds(grid,nx,ny) && getTerrain(grid,nx,ny) !== MOUNTAIN) setTerrain(grid,nx,ny,WATER)
    }
    if (step > 45 && step % 70 === 0 && width < 3) width++
    let bestX=x,bestY=y,bestE=current + 0.002
    const candidates: {x:number,y:number,e:number}[] = []
    for (let dx=-1;dx<=1;dx++) for (let dy=-1;dy<=1;dy++) {
      if (!dx && !dy) continue
      const nx=x+dx,ny=y+dy
      if (!inBounds(grid,nx,ny)) continue
      candidates.push({x:nx,y:ny,e:elevation[ny*grid.width+nx]})
    }
    candidates.sort((a,b)=>a.e-b.e)
    const downhill=candidates.find(c=>c.e<bestE)
    if (downhill) { bestX=downhill.x; bestY=downhill.y }
    else {
      // At local minima, a river seeks the lowest nearby outlet rather than wandering forever.
      let fallback=candidates[0]
      for (const c of candidates) if (c.e < fallback.e) fallback=c
      bestX=fallback.x; bestY=fallback.y
    }
    x=bestX; y=bestY
  }
}

function applyBeaches(grid: WorldGrid) {
  const shore: number[] = []
  for (let y=1;y<grid.height-1;y++) for (let x=1;x<grid.width-1;x++) {
    if (getTerrain(grid,x,y)!==GRASS) continue
    let water=0
    for (let dx=-1;dx<=1;dx++) for (let dy=-1;dy<=1;dy++) if (getTerrain(grid,x+dx,y+dy)===WATER) water++
    if (water>=2) shore.push(y*grid.width+x)
  }
  for (const i of shore) grid.terrain[i]=SAND
}

function paintNaturalBiomes(grid: WorldGrid, elevation: Float32Array, moisture: Float32Array, temperature: Float32Array, seaLevel: number, mountainLevel: number) {
  for (let y=1;y<grid.height-1;y++) for (let x=1;x<grid.width-1;x++) {
    const i=y*grid.width+x
    if (grid.terrain[i]!==GRASS) continue
    const e=elevation[i], m=moisture[i], t=temperature[i]
    const treeChance = clamp((m-0.43)*1.55 + (t-0.25)*0.18 - Math.max(0,e-mountainLevel)*2, 0, 0.9)
    const bushChance = clamp(m*0.55 + (0.6-Math.abs(t-0.55))*0.25, 0, 0.75)
    const n=fbm(x/10,y/10,913,2)
    if (e < seaLevel + 0.012) continue
    if (n < treeChance * 0.72) setTerrain(grid,x,y,TREE,12)
    else if (n < treeChance + bushChance*0.18) setTerrain(grid,x,y,BUSH,8)
  }
}

function placeGeologicalResources(grid: WorldGrid, elevation: Float32Array, moisture: Float32Array, temperature: Float32Array, rng: () => number, mountainLevel: number) {
  // Stone is exposed at the surface; iron and gold are hidden geological deposits inside mountains.
  const w=grid.width
  for (let y=2;y<grid.height-2;y++) for (let x=2;x<grid.width-2;x++) {
    const i=y*w+x
    if (grid.terrain[i]!==GRASS) continue
    const e=elevation[i]
    const local=fbm(x/18,y/18,1201,3)
    if (e > mountainLevel-0.07 && local>0.57) setTerrain(grid,x,y,STONE,25+Math.floor(local*45))
    else if (moisture[i]>0.48 && temperature[i]>0.25 && rng()<0.018) setTerrain(grid,x,y,BUSH,8)

  }

  // Hidden geological deposits: iron and gold exist inside mountain rock only.
  // No ore tile is ever exposed on the surface. Miners have to dig through the mountain.
  for (let y=2;y<grid.height-2;y++) for (let x=2;x<grid.width-2;x++) {
    const i=y*w+x
    if (grid.terrain[i] !== MOUNTAIN) continue
    const oreNoise = fbm(x / 34, y / 34, 4401, 3)
    const veinNoise = fbm(x / 11, y / 11, 7717, 2)
    if (oreNoise > 0.66 && veinNoise > 0.48) grid.ironDeposit[i] = 8 + Math.floor(oreNoise * 28)
    if (oreNoise > 0.79 && veinNoise > 0.62 && rng() < 0.45) grid.goldDeposit[i] = 2 + Math.floor(oreNoise * 10)
  }
}

function softenTerrainBoundaries(grid: WorldGrid) {
  const changes: {x:number;y:number;t:TerrainCode}[]=[]
  for (let y=1;y<grid.height-1;y++) for (let x=1;x<grid.width-1;x++) {
    const t=getTerrain(grid,x,y)
    const counts=new Map<number,number>()
    for (let dx=-1;dx<=1;dx++) for (let dy=-1;dy<=1;dy++) {
      const n=getTerrain(grid,x+dx,y+dy); counts.set(n,(counts.get(n)||0)+1)
    }
    let best=t,bestN=counts.get(t)||0
    for (const [candidate,n] of counts) if (n>bestN) {best=candidate;bestN=n}
    if (bestN>=7 && t!==best && (t===TREE||t===BUSH||t===STONE||t===IRON||t===GOLD)) changes.push({x,y,t:best})
  }
  for (const c of changes) if (c.t!==WATER && c.t!==MOUNTAIN) setTerrain(grid,c.x,c.y,c.t,c.t===TREE?12:c.t===BUSH?8:0)
}

export function nearestResource(grid: WorldGrid, x: number, y: number, kind: ResourceKind, maxRadius: number) {
  return findNearestResource(grid.index, grid, x, y, kind, maxRadius)
}

export function resourceDensity(grid: WorldGrid, x: number, y: number, kind: ResourceKind, radius: number) {
  return countResourceNear(grid.index, grid, x, y, kind, radius)
}

/** Cheap local scan used for grazing — full-radius ring searches were a hot path. */
export function findNearbyTerrain(grid: WorldGrid, fromX: number, fromY: number, maxRadius: number, want: TerrainCode): { x: number; y: number } | null {
  const w = grid.width
  const h = grid.height
  const terrain = grid.terrain
  if (fromX >= 0 && fromY >= 0 && fromX < w && fromY < h && terrain[fromY * w + fromX] === want) {
    return { x: fromX, y: fromY }
  }
  for (let r = 1; r <= maxRadius; r++) {
    const minX = fromX - r
    const maxX = fromX + r
    const minY = fromY - r
    const maxY = fromY + r
    for (let x = minX; x <= maxX; x++) {
      if (x < 0 || x >= w) continue
      if (minY >= 0 && minY < h && terrain[minY * w + x] === want) return { x, y: minY }
      if (maxY >= 0 && maxY < h && r > 0 && terrain[maxY * w + x] === want) return { x, y: maxY }
    }
    for (let y = minY + 1; y < maxY; y++) {
      if (y < 0 || y >= h) continue
      if (minX >= 0 && minX < w && terrain[y * w + minX] === want) return { x: minX, y }
      if (maxX >= 0 && maxX < w && terrain[y * w + maxX] === want) return { x: maxX, y }
    }
  }
  return null
}

export function findNearbyShore(grid: WorldGrid, fromX: number, fromY: number, maxRadius: number): { x: number; y: number } | null {
  const w = grid.width
  const h = grid.height
  const terrain = grid.terrain
  const isShoreTile = (x: number, y: number) => {
    if (x < 1 || y < 1 || x >= w - 1 || y >= h - 1) return false
    if (terrain[y * w + x] === WATER) return false
    return (
      terrain[y * w + x + 1] === WATER ||
      terrain[y * w + x - 1] === WATER ||
      terrain[(y + 1) * w + x] === WATER ||
      terrain[(y - 1) * w + x] === WATER
    )
  }
  if (isShoreTile(fromX, fromY)) return { x: fromX, y: fromY }
  for (let r = 1; r <= maxRadius; r++) {
    const minX = fromX - r
    const maxX = fromX + r
    const minY = fromY - r
    const maxY = fromY + r
    for (let x = minX; x <= maxX; x++) {
      if (x < 0 || x >= w) continue
      if (minY >= 0 && minY < h && isShoreTile(x, minY)) return { x, y: minY }
      if (maxY >= 0 && maxY < h && r > 0 && isShoreTile(x, maxY)) return { x, y: maxY }
    }
    for (let y = minY + 1; y < maxY; y++) {
      if (y < 0 || y >= h) continue
      if (minX >= 0 && minX < w && isShoreTile(minX, y)) return { x: minX, y }
      if (maxX >= 0 && maxX < w && isShoreTile(maxX, y)) return { x: maxX, y }
    }
  }
  return null
}

export function findNearest(
  grid: WorldGrid,
  fromX: number,
  fromY: number,
  maxRadius: number,
  predicate: (x: number, y: number) => boolean,
): { x: number; y: number } | null {
  for (let r = 0; r <= maxRadius; r++) {
    const minX = fromX - r
    const maxX = fromX + r
    const minY = fromY - r
    const maxY = fromY + r
    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        if (r > 0 && x !== minX && x !== maxX && y !== minY && y !== maxY) continue
        if (!inBounds(grid, x, y)) continue
        if (predicate(x, y)) return { x, y }
      }
    }
  }
  return null
}

export function stepToward(x: number, y: number, tx: number, ty: number): { x: number; y: number } {
  return { x: x + Math.sign(tx - x), y: y + Math.sign(ty - y) }
}

export function distance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.hypot(x1 - x2, y1 - y2)
}

export function clampStructureCenter(grid: WorldGrid, cx: number, cy: number, radius: number): { x: number; y: number } {
  const margin = radius + 2
  return { x: clamp(cx, margin, grid.width - margin - 1), y: clamp(cy, margin, grid.height - margin - 1) }
}

export function isFootprintClear(grid: WorldGrid, cx: number, cy: number, radius: number): boolean {
  const pad = radius + 1
  if (cx - pad < 1 || cy - pad < 1 || cx + pad >= grid.width - 1 || cy + pad >= grid.height - 1) return false
  for (let x = cx - pad; x <= cx + pad; x++) {
    for (let y = cy - pad; y <= cy + pad; y++) {
      if (!isBuildableGround(grid, x, y)) return false
      if (getClaim(grid, x, y) !== CLAIM_NONE) return false
    }
  }
  return true
}

export function findBuildSite(grid: WorldGrid, baseX: number, baseY: number, radius: number, maxRadius: number): { x: number; y: number } | null {
  const spot = findNearest(grid, baseX, baseY, maxRadius, (x, y) => isFootprintClear(grid, x, y, radius))
  if (!spot) return null
  return clampStructureCenter(grid, spot.x, spot.y, radius)
}

export function scoreHousePlot(
  grid: WorldGrid,
  x: number,
  y: number,
  opts: {
    radius: number
    centreX: number
    centreY: number
    kin: { x: number; y: number }[]
    wantsKind: ResourceKind | null
    sociability: number
    caution: number
  },
): number {
  if (!isFootprintClear(grid, x, y, opts.radius)) return -Infinity

  let score = 0
  const dCentre = distance(x, y, opts.centreX, opts.centreY)
  score += (40 - Math.min(40, dCentre)) * (0.4 + opts.sociability)
  if (dCentre < 8) score -= (8 - dCentre) * 3

  for (const k of opts.kin) score += Math.max(0, 25 - distance(x, y, k.x, k.y)) * 1.2

  if (opts.wantsKind) score += resourceDensity(grid, x, y, opts.wantsKind, 10) * 1.4

  const onRoute = findNearest(grid, x, y, 5, (rx, ry) => {
    const t = getTerrain(grid, rx, ry)
    return t === ROAD || t === PATH || t === TRAIL
  })
  if (onRoute) score += 18

  let waterSides = 0
  for (const [dx, dy] of [
    [opts.radius + 2, 0],
    [-(opts.radius + 2), 0],
    [0, opts.radius + 2],
    [0, -(opts.radius + 2)],
  ] as const) {
    if (inBounds(grid, x + dx, y + dy) && getTerrain(grid, x + dx, y + dy) === WATER) waterSides++
  }
  score += waterSides * 14 * opts.caution

  return score
}

export function findBestHousePlot(
  grid: WorldGrid,
  baseX: number,
  baseY: number,
  maxRadius: number,
  opts: Parameters<typeof scoreHousePlot>[3],
): { x: number; y: number } | null {
  let best: { x: number; y: number } | null = null
  let bestScore = -Infinity
  for (let r = opts.radius + 2; r <= maxRadius; r += 4) {
    for (let a = 0; a < 10; a++) {
      const angle = (a / 10) * Math.PI * 2 + r * 0.3
      const x = Math.round(baseX + Math.cos(angle) * r)
      const y = Math.round(baseY + Math.sin(angle) * r)
      if (!inBounds(grid, x, y)) continue
      const c = clampStructureCenter(grid, x, y, opts.radius)
      const score = scoreHousePlot(grid, c.x, c.y, opts)
      if (score > bestScore) {
        bestScore = score
        best = c
      }
    }
    if (best && r > maxRadius * 0.5) break
  }
  return best
}

export function bridgeNearby(grid: WorldGrid, x: number, y: number, radius: number): boolean {
  return findNearest(grid, x, y, radius, (bx, by) => getTerrain(grid, bx, by) === BRIDGE) !== null
}

export function singleDoorWallCells(grid: WorldGrid, cx: number, cy: number, radius: number): { x: number; y: number }[] {
  const cells: { x: number; y: number }[] = []
  for (let x = cx - radius; x <= cx + radius; x++) {
    for (let y = cy - radius; y <= cy + radius; y++) {
      const onPerimeter = x === cx - radius || x === cx + radius || y === cy - radius || y === cy + radius
      if (!onPerimeter) continue
      if (x === cx && y === cy + radius) continue
      if (!inBounds(grid, x, y)) continue
      cells.push({ x, y })
    }
  }
  return cells
}

export function fieldCells(grid: WorldGrid, cx: number, cy: number, radius: number): { x: number; y: number }[] {
  const cells: { x: number; y: number }[] = []
  for (let x = cx - radius; x <= cx + radius; x++) {
    for (let y = cy - radius; y <= cy + radius; y++) {
      if (inBounds(grid, x, y)) cells.push({ x, y })
    }
  }
  return cells
}

export function randomWalkableTile(grid: WorldGrid, rng: () => number): { x: number; y: number } {
  for (let attempt = 0; attempt < 400; attempt++) {
    const x = Math.floor(rng() * grid.width)
    const y = Math.floor(rng() * grid.height)
    if (!isBlockingWall(grid, x, y)) return { x, y }
  }
  return { x: Math.floor(grid.width / 2), y: Math.floor(grid.height / 2) }
}

export function randomWalkableTileNear(grid: WorldGrid, rng: () => number, baseX: number, baseY: number, spread: number): { x: number; y: number } {
  for (let attempt = 0; attempt < 80; attempt++) {
    const x = clamp(baseX + Math.floor((rng() - 0.5) * spread * 2), 0, grid.width - 1)
    const y = clamp(baseY + Math.floor((rng() - 0.5) * spread * 2), 0, grid.height - 1)
    if (!isBlockingWall(grid, x, y)) return { x, y }
  }
  return randomWalkableTile(grid, rng)
}

export {
  GRASS,
  STONE,
  TREE,
  BUSH,
  GOLD,
  IRON,
  MOUNTAIN,
  TUNNEL,
  FENCE,
  HOUSE,
  LOOT,
  CHEST,
  WORKBENCH,
  WALL_WOOD,
  WALL_STONE,
  DIRT,
  BED,
  WATER,
  PATH,
  BRIDGE,
  SAND,
  PLANK,
  FIELD,
  WHEAT,
  MILL,
  TRAIL,
  ROAD,
}
export type { WorldGrid }
