/**
 * Utility functions for object operations
 */

/**
 * Checks if a string value is empty, null, or undefined
 */
export function isEmptyValue(value: string | undefined | null): boolean {
  return !value || value.trim() === ''
}

/**
 * Checks if an object is empty, null, or undefined
 */
export function isEmptyObject(obj: any): boolean {
  return !obj || (typeof obj === 'object' && Object.keys(obj).length === 0)
}

/**
 * Performs a shallow comparison of two objects to check if they are equal
 * This is more efficient than JSON.stringify for simple objects
 */
export function shallowEqual<T extends Record<string, any>>(obj1: T | null, obj2: T | null): boolean {
  if (obj1 === obj2) return true
  if (!obj1 || !obj2) return false

  const keys1 = Object.keys(obj1)
  const keys2 = Object.keys(obj2)

  if (keys1.length !== keys2.length) return false

  for (const key of keys1) {
    if (obj1[key] !== obj2[key]) return false
  }

  return true
}

/**
 * Performs a deep comparison of two objects to check if they are equal
 * Handles nested objects and arrays
 */
export function deepEqual<T>(obj1: T, obj2: T): boolean {
  if (obj1 === obj2) return true

  if (obj1 === null || obj2 === null) return obj1 === obj2
  if (obj1 === undefined || obj2 === undefined) return obj1 === obj2

  if (typeof obj1 !== typeof obj2) return false

  if (typeof obj1 !== 'object') return obj1 === obj2

  if (Array.isArray(obj1) !== Array.isArray(obj2)) return false

  if (Array.isArray(obj1)) {
    const arr1 = obj1 as Array<unknown>
    const arr2 = obj2 as Array<unknown>

    if (arr1.length !== arr2.length) return false

    for (let i = 0; i < arr1.length; i++) {
      if (!deepEqual(arr1[i], arr2[i])) return false
    }

    return true
  }

  const keys1 = Object.keys(obj1 as object)
  const keys2 = Object.keys(obj2 as object)

  if (keys1.length !== keys2.length) return false

  for (const key of keys1) {
    if (!keys2.includes(key)) return false
    if (!deepEqual((obj1 as any)[key], (obj2 as any)[key])) return false
  }

  return true
}
