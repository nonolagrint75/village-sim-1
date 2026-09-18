/**
 * Hybrid sim kernels backend.
 *
 * Strategy (see parent report): keep TypeScript as the orchestration layer
 * (behaviors, politics, cognition, UI). Isolate numeric hot loops behind this
 * ABI so a Rust/WASM module (`sim-core`) can replace them later without rewriting
 * 10k+ lines of emergent logic.
 *
 * CUDA: rejected for Electron — NVIDIA-only, native GPU process, poor packaging.
 * WebGPU: used for brain softmax batch probe (`brainGpu.ts`); climate/grid parallel still future.
 * Native Node addon: worse Electron worker story than WASM.
 *
 * WASM wiring (when rustc + wasm-pack available):
 *   1. cd sim-core && wasm-pack build --target web --out-dir ../src/lib/sim/kernels/pkg
 *      (overwrites the JS stub that keeps Vite resolution happy)
 *   2. Export kernel_version + find_path_flat from the real module (no SIM_CORE_STUB)
 *   3. Keep TS fallback forever for CI and non-WASM builds
 */

export type KernelBackendKind = 'typescript' | 'wasm'

export interface PathFlatInput {
  width: number
  height: number
  /** Uint8 terrain codes */
  terrain: Uint8Array
  /** Float32 traffic */
  traffic: Float32Array
  sx: number
  sy: number
  tx: number
  ty: number
  nodeCap: number
  /** Packed profile flags: amphibious, cargo, cart, avoidVeg as 0/1 */
  flags: number
  boatX: number
  boatY: number
}

export interface PathFlatResult {
  /** Cell indices along path (excluding start), or empty */
  path: Int32Array
  expanded: number
  reached: boolean
}

export interface KernelBackend {
  readonly kind: KernelBackendKind
  /** Optional: native A* over flat buffers. Null ⇒ use TS pathfinding.ts */
  findPathFlat?(input: PathFlatInput): PathFlatResult | null
}

const tsBackend: KernelBackend = {
  kind: 'typescript',
}

let active: KernelBackend = tsBackend

export function kernelBackend(): KernelBackend {
  return active
}

export function useTypescriptKernels(): void {
  active = tsBackend
}

/**
 * Attempt to load WASM kernels. Safe no-op until a real wasm-pack build replaces
 * the stub at `./pkg/sim_core.js`. Never require Rust/WASM to boot the app.
 *
 * Important: do not use a bare `import('./pkg/...')` to a missing file — Vite's
 * import-analysis fails at transform time even with `@vite-ignore`. The stub
 * (or a real wasm-pack output) must exist so resolution succeeds; runtime then
 * decides whether the module is a real build.
 */
export async function tryLoadWasmKernels(): Promise<KernelBackendKind> {
  try {
    const mod = (await import('./pkg/sim_core.js')) as {
      kernel_version?: () => unknown
      SIM_CORE_STUB?: boolean
      find_path_flat?: (input: PathFlatInput) => PathFlatResult | null
    }
    // Placeholder pkg keeps Vite happy; only promote when a real build is present.
    if (mod.SIM_CORE_STUB || typeof mod.kernel_version !== 'function') {
      active = tsBackend
      return 'typescript'
    }
    active = {
      kind: 'wasm',
      findPathFlat(input) {
        if (typeof mod.find_path_flat === 'function') {
          return mod.find_path_flat(input)
        }
        // Real module without A* yet → callers use TS findPath.
        return null
      },
    }
    return 'wasm'
  } catch {
    // Expected if pkg was deleted; fall back to TypeScript kernels.
  }
  active = tsBackend
  return 'typescript'
}
