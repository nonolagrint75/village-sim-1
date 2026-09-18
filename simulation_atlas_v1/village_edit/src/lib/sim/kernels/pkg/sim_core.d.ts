import type { PathFlatInput, PathFlatResult } from '../backend'

/** True while this file is the JS placeholder (not a wasm-pack build). */
export declare const SIM_CORE_STUB: true | undefined

export declare function kernel_version(): string

export declare function find_path_flat(input: PathFlatInput): PathFlatResult | null
