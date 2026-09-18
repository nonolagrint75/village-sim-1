/**
 * Tiny assert helpers for the build data layer (no test runner required).
 */

export class BuildAssertError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BuildAssertError'
  }
}

export function assert(cond: unknown, message: string): asserts cond {
  if (!cond) throw new BuildAssertError(message)
}

export function assertEq<T>(actual: T, expected: T, label: string): void {
  if (actual !== expected) {
    throw new BuildAssertError(`${label}: expected ${String(expected)}, got ${String(actual)}`)
  }
}

export function assertOk(label: string, fn: () => void): void {
  try {
    fn()
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    throw new BuildAssertError(`${label} failed: ${msg}`)
  }
}
