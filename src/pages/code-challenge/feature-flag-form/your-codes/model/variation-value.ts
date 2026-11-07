import type { FlagType } from './constants'

/**
 * Variation values are edited as raw text (one input works for every type)
 * and converted to the real JSON value only when building the output.
 */

const NUMBER_PATTERN = /^-?\d+(\.\d+)?([eE][+-]?\d+)?$/

/** Returns an error message, or `null` when `raw` is a valid value for `type`. */
export function validateVariationValue(
  type: FlagType,
  raw: string,
): string | null {
  const value = raw.trim()
  switch (type) {
    case 'boolean':
      return value === 'true' || value === 'false'
        ? null
        : 'Must be true or false'
    case 'number':
      return NUMBER_PATTERN.test(value)
        ? null
        : 'Must be a number (e.g. 42 or 0.5)'
    case 'json':
      if (!value) return 'JSON value is required'
      try {
        JSON.parse(value)
        return null
      } catch {
        return 'Must be valid JSON (e.g. {"color": "red"})'
      }
    case 'string':
      return null
  }
}

/** Converts the raw text to its typed value. Invalid input is kept as a string so the preview never crashes. */
export function parseVariationValue(type: FlagType, raw: string): unknown {
  const value = raw.trim()
  switch (type) {
    case 'boolean':
      return value === 'true' ? true : value === 'false' ? false : raw
    case 'number':
      return NUMBER_PATTERN.test(value) ? Number(value) : raw
    case 'json':
      try {
        return JSON.parse(value)
      } catch {
        return raw
      }
    case 'string':
      return raw
  }
}

/** Sensible starting value for the n-th variation of a given type. */
export function defaultVariationValue(type: FlagType, index: number): string {
  switch (type) {
    case 'boolean':
      return index % 2 === 0 ? 'true' : 'false'
    case 'number':
      return String(index + 1)
    case 'string':
      return String.fromCharCode(65 + (index % 26)) // A, B, C...
    case 'json':
      return JSON.stringify({ variant: index + 1 })
  }
}
