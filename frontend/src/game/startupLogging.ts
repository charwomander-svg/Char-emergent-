type StartupLogDetails = Record<string, unknown> | undefined;

interface StartupLogOptions {
  details?: StartupLogDetails;
  once?: boolean;
}

const PREFIX = "[GhostMaze][Startup]";
const seenLogPhases = new Set<string>();

function shouldLog(phase: string, label: string, once?: boolean) {
  if (!once) return true;
  const key = `${phase}:${label}`;
  if (seenLogPhases.has(key)) return false;
  seenLogPhases.add(key);
  return true;
}

function normalizeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }
  return { value: error };
}

export function logStartupStart(label: string, options?: StartupLogOptions) {
  if (!shouldLog("START", label, options?.once)) return;
  if (options?.details) {
    console.log(`${PREFIX} START ${label}`, options.details);
    return;
  }
  console.log(`${PREFIX} START ${label}`);
}

export function logStartupSuccess(label: string, options?: StartupLogOptions) {
  if (!shouldLog("SUCCESS", label, options?.once)) return;
  if (options?.details) {
    console.log(`${PREFIX} SUCCESS ${label}`, options.details);
    return;
  }
  console.log(`${PREFIX} SUCCESS ${label}`);
}

export function logStartupError(
  label: string,
  error: unknown,
  options?: StartupLogOptions,
) {
  const payload = options?.details
    ? { ...options.details, error: normalizeError(error) }
    : { error: normalizeError(error) };
  console.error(`${PREFIX} ERROR ${label}`, payload);
}

export function withStartupLogging<T>(
  label: string,
  fn: () => T,
  options?: StartupLogOptions,
): T {
  logStartupStart(label, options);
  try {
    const result = fn();
    logStartupSuccess(label, options);
    return result;
  } catch (error) {
    logStartupError(label, error, options);
    throw error;
  }
}

export function createLoggedEffect(
  label: string,
  effect: () => void | (() => void),
  options?: StartupLogOptions,
) {
  return () =>
    withStartupLogging(label, () => {
      const cleanup = effect();
      if (typeof cleanup !== "function") return cleanup;
      return () => withStartupLogging(`${label}.cleanup`, cleanup, options);
    }, options);
}

export function createLoggedMemo<T>(
  label: string,
  factory: () => T,
  options?: StartupLogOptions,
) {
  return () => withStartupLogging(label, factory, options);
}

export function logStartupPromise<T>(
  label: string,
  promise: Promise<T>,
  options?: StartupLogOptions,
) {
  logStartupStart(`${label}.async`, options);
  return promise
    .then((result) => {
      logStartupSuccess(`${label}.async`, options);
      return result;
    })
    .catch((error) => {
      logStartupError(`${label}.async`, error, options);
      throw error;
    });
}

export function mapWithStartupLogging<T, R>(
  label: string,
  items: readonly T[],
  mapper: (item: T, index: number) => R,
  options?: StartupLogOptions,
) {
  return items.map((item, index) =>
    withStartupLogging(`${label}[${index}]`, () => mapper(item, index), {
      ...options,
      details: options?.details ? { ...options.details, index } : { index },
    }),
  );
}
