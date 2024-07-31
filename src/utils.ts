export type DeepPartial<T> = T extends object
  ? { [P in keyof T]?: DeepPartial<T[P]> }
  : T

export function deepMerge<T extends Record<string, unknown>>(
  target: T,
  source: DeepPartial<T>,
): T {
  const output = { ...target }

  for (const key in source) {
    if (Object.hasOwn(source, key)) {
      const sourceValue = source[key]

      if (key in target) {
        const targetValue = target[key]

        if (isObject(targetValue) && isObject(sourceValue)) {
          output[key] = deepMerge(
            targetValue as Record<string, unknown>,
            sourceValue as DeepPartial<Record<string, unknown>>,
          ) as T[typeof key]
        } else if (sourceValue !== undefined) {
          output[key] = sourceValue as T[typeof key]
        }
      } else {
        output[key] = sourceValue as T[typeof key]
      }
    }
  }

  return output
}

function isObject(item: unknown): item is Record<string, unknown> {
  return typeof item === 'object' && item !== null && !Array.isArray(item)
}
