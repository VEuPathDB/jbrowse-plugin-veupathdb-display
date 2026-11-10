import type { RecordDeclaration } from './declaration'

export type FeatureFields = Record<string, unknown>

export class MissingFieldError extends Error {
  constructor(public field: string) {
    super(`feature has no "${field}" field`)
  }
}

function fieldValue(feature: FeatureFields, name: string) {
  if (name === 'position') {
    const { start } = feature
    if (typeof start !== 'number') {
      throw new MissingFieldError('start')
    }
    return String(start + 1)
  }
  const value = feature[name]
  if (value === undefined || value === null || value === '') {
    throw new MissingFieldError(name)
  }
  return String(value)
}

function firstPresent(feature: FeatureFields, names: string[]) {
  if (names.length === 1) {
    return fieldValue(feature, names[0]!)
  }
  for (const name of names) {
    try {
      return fieldValue(feature, name)
    } catch (e) {
      if (!(e instanceof MissingFieldError)) {
        throw e
      }
    }
  }
  throw new MissingFieldError(names.join('|'))
}

/**
 * Expand `{field}` placeholders from the feature's (lowercase) fields;
 * `{a|b}` takes the first present. `{position}` is the 1-based start, so
 * `Variant_{refName}_{position}` rebuilds a variant id from a VCF locus.
 */
export function expandTemplate(template: string, feature: FeatureFields) {
  return template.replace(/\{(\w+(?:\|\w+)*)\}/g, (_, names: string) =>
    firstPresent(feature, names.split('|')),
  )
}

export function recordUrl(record: RecordDeclaration, feature: FeatureFields) {
  const id = expandTemplate(record.id, feature)
  const base = record.baseUrl.replace(/\/+$/, '')
  const path = `${base}/app/embed-record/${encodeURIComponent(record.type)}/${encodeURIComponent(id)}`
  return record.tables.length
    ? `${path}?tables=${record.tables.map(encodeURIComponent).join(',')}`
    : path
}
