//! Optional WASM kernels for village-sim.
//! Not part of `npm run app` until built with wasm-pack.
//! ABI target: `src/lib/sim/kernels/backend.ts`.
//!
//!   wasm-pack build --target web --out-dir ../src/lib/sim/kernels/pkg

use wasm_bindgen::prelude::*;

/// Version probe — TS `tryLoadWasmKernels` can detect a live module.
#[wasm_bindgen]
pub fn kernel_version() -> String {
    "sim_core-0.1.0-stub".into()
}

/// Stub: always returns 0 expanded nodes. Real A* ports here later;
/// until then `pathfinding.ts` remains the authority.
#[wasm_bindgen]
pub fn find_path_flat(
    _terrain: &[u8],
    _traffic: &[f32],
    _width: u32,
    _height: u32,
    _sx: i32,
    _sy: i32,
    _tx: i32,
    _ty: i32,
    _node_cap: u32,
    _flags: u32,
    _boat_x: i32,
    _boat_y: i32,
) -> i32 {
    0
}
