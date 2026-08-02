const globalScope = globalThis as typeof globalThis & {
  performance?: { now?: () => number };
  requestAnimationFrame?: (callback: (time: number) => void) => number;
  cancelAnimationFrame?: (handle: number) => void;
};

if (typeof globalScope.performance?.now !== "function") {
  globalScope.performance = {
    ...(globalScope.performance ?? {}),
    now: () => Date.now(),
  };
}

if (typeof globalScope.requestAnimationFrame !== "function") {
  globalScope.requestAnimationFrame = (callback) =>
    setTimeout(() => callback(globalScope.performance?.now?.() ?? Date.now()), 16) as unknown as number;
}

if (typeof globalScope.cancelAnimationFrame !== "function") {
  globalScope.cancelAnimationFrame = (handle) => clearTimeout(handle);
}

if (typeof Object.fromEntries !== "function") {
  Object.fromEntries = function fromEntries<T = unknown>(
    entries: Iterable<readonly [PropertyKey, T]>,
  ): { [k: string]: T } {
    const result: Record<PropertyKey, T> = {};
    for (const [key, value] of entries) {
      result[key] = value;
    }
    return result as { [k: string]: T };
  };
}
