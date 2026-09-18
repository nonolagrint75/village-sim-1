/**
 * Softmax / Boltzmann selection — CPU fast path + optional WebGPU probe.
 * No @webgpu/types required; GPU is best-effort in Electron workers.
 */

export type SoftmaxBackend = 'cpu' | 'webgpu'

export type SoftmaxSelectResult = {
  index: number
  backend: SoftmaxBackend
}

let gpuAvailable = false

/** Reusable weight buffer — avoid alloc per chooseTask. */
let weightBuf = new Float64Array(64)

function ensureWeights(n: number): Float64Array {
  if (weightBuf.length < n) {
    let cap = weightBuf.length
    while (cap < n) cap *= 2
    weightBuf = new Float64Array(cap)
  }
  return weightBuf
}

/**
 * Softmax sample: P(i) ∝ exp(u_i / T). Numerically stable (subtract max).
 * Always CPU today — adapter probe ≠ compute shader; never claim webgpu until a real kernel ships.
 */
export function batchSoftmaxSelect(
  utilities: ArrayLike<number>,
  temperature: number,
  rng: () => number,
): SoftmaxSelectResult {
  const n = utilities.length
  if (n <= 0) return { index: -1, backend: 'cpu' }
  if (n === 1) return { index: 0, backend: 'cpu' }

  const t = Math.max(0.08, temperature)
  let maxU = -Infinity
  for (let i = 0; i < n; i++) {
    const u = utilities[i]!
    if (u > maxU) maxU = u
  }

  const weights = ensureWeights(n)
  let sum = 0
  for (let i = 0; i < n; i++) {
    const w = Math.exp((utilities[i]! - maxU) / t)
    weights[i] = w
    sum += w
  }
  if (!(sum > 0) || !Number.isFinite(sum)) {
    let best = 0
    for (let i = 1; i < n; i++) if (utilities[i]! > utilities[best]!) best = i
    return { index: best, backend: 'cpu' }
  }

  let r = rng() * sum
  for (let i = 0; i < n; i++) {
    r -= weights[i]!
    if (r <= 0) return { index: i, backend: 'cpu' }
  }
  return { index: n - 1, backend: 'cpu' }
}

/**
 * Multi-agent layout: [a0o0, a0o1, …, a1o0, …]
 * Samples one index per agent into outIndices.
 */
export function batchSoftmaxSelectMany(
  utilities: Float32Array,
  optionCounts: Int32Array,
  temperatures: Float32Array,
  rng: () => number,
  outIndices: Int32Array,
): SoftmaxBackend {
  let offset = 0
  for (let a = 0; a < optionCounts.length; a++) {
    const n = optionCounts[a]!
    const slice = utilities.subarray(offset, offset + n)
    const pick = batchSoftmaxSelect(slice, temperatures[a] ?? 1, rng)
    outIndices[a] = pick.index
    offset += n
  }
  return 'cpu'
}

/** Adapter probe status — `kind` stays cpu until a real softmax kernel exists. */
export function brainGpuStatus(): { available: boolean; kind: SoftmaxBackend } {
  return { available: gpuAvailable, kind: 'cpu' }
}

/** Probe once — safe no-op if navigator.gpu missing (no WebGPU types needed). */
export async function tryInitBrainGpu(): Promise<boolean> {
  try {
    const nav = globalThis.navigator as { gpu?: { requestAdapter(): Promise<unknown> } } | undefined
    if (!nav?.gpu) {
      gpuAvailable = false
      return false
    }
    const adapter = await nav.gpu.requestAdapter()
    gpuAvailable = !!adapter
    return gpuAvailable
  } catch {
    gpuAvailable = false
    return false
  }
}

export function resetBrainGpu(): void {
  gpuAvailable = false
}
