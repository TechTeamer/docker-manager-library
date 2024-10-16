type Primitive = string | number | boolean | null | undefined

export type DeepPartial<T> = T extends Primitive
  ? T
  : T extends (infer U)[]
    ? DeepPartial<U>[]
    : T extends object
      ? { [P in keyof T]?: DeepPartial<T[P]> }
      : T

export function deepMerge<T>(target: T, source: DeepPartial<T>): T {
  if (Array.isArray(target) && Array.isArray(source)) {
    return mergeArrays(target, source) as T
  }

  if (isObject(target) && isObject(source)) {
    return mergeObjects(
      target,
      source as DeepPartial<T & Record<string, unknown>>,
    )
  }

  return source as T
}

function mergeObjects<T extends Record<string, unknown>>(
  target: T,
  source: DeepPartial<T>,
): T {
  const output = { ...target }

  for (const key in source) {
    if (Object.hasOwn(source, key)) {
      const sourceValue = source[key]
      const targetValue = target[key]

      if (isObject(targetValue) && isObject(sourceValue)) {
        output[key] = deepMerge(
          targetValue,
          sourceValue as DeepPartial<typeof targetValue>,
        ) as T[typeof key]
      } else if (Array.isArray(targetValue) && Array.isArray(sourceValue)) {
        output[key] = mergeArrays(
          targetValue,
          sourceValue as DeepPartial<typeof targetValue>,
        ) as T[typeof key]
      } else if (sourceValue !== undefined) {
        output[key] = sourceValue as T[typeof key]
      }
    }
  }

  return output
}

function mergeArrays<T>(target: T[], source: DeepPartial<T>[]): T[] {
  const result = [...target]

  for (const sourceItem of source) {
    if (isObject(sourceItem)) {
      const newItem = {} as T
      result.push(deepMerge(newItem, sourceItem as DeepPartial<T>))
    } else {
      result.push(sourceItem as T)
    }
  }

  return result
}

function isObject(item: unknown): item is Record<string, unknown> {
  return typeof item === 'object' && item !== null && !Array.isArray(item)
}
