export interface RecordDeclaration {
  type: string
  id: string
  tables: string[]
  baseUrl: string
}

export interface NcbiProteinTitlesDeclaration {
  idField: string
}

export interface VeupathdbDeclaration {
  record?: RecordDeclaration
  ncbiProteinTitles?: NcbiProteinTitlesDeclaration
}

export const DEFAULT_BASE_URL = '/a'

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function nonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.length > 0
}

function parseRecord(raw: unknown): RecordDeclaration {
  if (!isObject(raw) || !nonEmptyString(raw.type) || !nonEmptyString(raw.id)) {
    throw new Error('record needs a non-empty `type` and `id`')
  }
  const { tables = [], baseUrl = DEFAULT_BASE_URL } = raw
  if (!Array.isArray(tables) || !tables.every(nonEmptyString)) {
    throw new Error('record.tables must be an array of table names')
  }
  if (typeof baseUrl !== 'string') {
    throw new Error('record.baseUrl must be a string')
  }
  return { type: raw.type, id: raw.id, tables, baseUrl }
}

function parseNcbi(raw: unknown): NcbiProteinTitlesDeclaration {
  if (raw === true) {
    return { idField: 'id' }
  }
  if (!isObject(raw)) {
    throw new Error('ncbiProteinTitles must be true or { idField }')
  }
  const { idField = 'id' } = raw
  if (!nonEmptyString(idField)) {
    throw new Error('ncbiProteinTitles.idField must be a non-empty string')
  }
  return { idField }
}

/** The `veupathdb` block of a track's `metadata`, or undefined when absent. */
export function parseDeclaration(
  metadata: unknown,
): VeupathdbDeclaration | undefined {
  const raw = isObject(metadata) ? metadata.veupathdb : undefined
  if (raw === undefined) {
    return undefined
  }
  if (!isObject(raw)) {
    throw new Error('metadata.veupathdb must be an object')
  }
  return {
    record: raw.record === undefined ? undefined : parseRecord(raw.record),
    ncbiProteinTitles:
      raw.ncbiProteinTitles === undefined
        ? undefined
        : parseNcbi(raw.ncbiProteinTitles),
  }
}
