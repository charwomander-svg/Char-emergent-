const objectCtor = Object as typeof Object & {
  entries?: <T>(record: Record<string, T>) => [string, T][];
  values?: <T>(record: Record<string, T>) => T[];
  fromEntries?: <T>(entries: Iterable<readonly [PropertyKey, T]>) => Record<string, T>;
};

if (!objectCtor.entries) {
  objectCtor.entries = function entries<T>(record: Record<string, T>): [string, T][] {
    const result: [string, T][] = [];
    for (const key in record) {
      if (Object.prototype.hasOwnProperty.call(record, key)) {
        result.push([key, record[key]]);
      }
    }
    return result;
  };
}

if (!objectCtor.values) {
  objectCtor.values = function values<T>(record: Record<string, T>): T[] {
    const result: T[] = [];
    for (const key in record) {
      if (Object.prototype.hasOwnProperty.call(record, key)) {
        result.push(record[key]);
      }
    }
    return result;
  };
}

if (!objectCtor.fromEntries) {
  objectCtor.fromEntries = function fromEntries<T>(
    entries: Iterable<readonly [PropertyKey, T]>,
  ): Record<string, T> {
    const result: Record<string, T> = {};
    for (const entry of entries) {
      const [key, value] = entry;
      result[String(key)] = value;
    }
    return result;
  };
}

if (!String.prototype.padStart) {
  Object.defineProperty(String.prototype, "padStart", {
    value(targetLength: number, padString?: string) {
      const input = String(this);
      const length = Number.isFinite(targetLength) ? Math.max(0, Math.floor(targetLength)) : 0;
      if (input.length >= length) return input;
      const filler = String(padString ?? " ") || " ";
      let padding = "";
      while (padding.length < length - input.length) {
        padding += filler;
      }
      return padding.slice(0, length - input.length) + input;
    },
    writable: true,
    configurable: true,
  });
}
