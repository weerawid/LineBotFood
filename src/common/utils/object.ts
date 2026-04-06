export function removeUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  ) as Partial<T>;
}

export function toBodyInit(data: unknown): BodyInit | undefined {
  if (data === undefined || data === null) return undefined;

  if (typeof data === "string" || data instanceof Buffer) {
    return data;
  }

  if (typeof data === "object") {
    return JSON.stringify(data);
  }

  return String(data);
}