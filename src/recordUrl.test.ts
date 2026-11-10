import { parseDeclaration } from './declaration'
import { MissingFieldError, expandTemplate, recordUrl } from './recordUrl'

function record(veupathdb: unknown) {
  const decl = parseDeclaration({ veupathdb })
  if (!decl?.record) {
    throw new Error('no record')
  }
  return decl.record
}

describe('recordUrl: the three JBrowse 1 cases', () => {
  test('junction', () => {
    const r = record({
      record: { type: 'junction', id: '{id}', tables: ['SampleInfo'] },
    })
    expect(recordUrl(r, { id: 'Pf3D7_01_v3:1001-1500+', start: 1000 })).toBe(
      '/a/app/embed-record/junction/Pf3D7_01_v3%3A1001-1500%2B?tables=SampleInfo',
    )
  })

  test('gene, clicked on the gene or on one of its transcripts', () => {
    const r = record({
      record: {
        type: 'gene',
        id: '{parent|id}',
        tables: ['GeneTranscripts', 'GOTerms', 'PubMed'],
      },
    })
    const url =
      '/a/app/embed-record/gene/PF3D7_0100100?tables=GeneTranscripts,GOTerms,PubMed'
    expect(recordUrl(r, { id: 'PF3D7_0100100' })).toBe(url)
    expect(
      recordUrl(r, { id: 'PF3D7_0100100.1', parent: 'PF3D7_0100100' }),
    ).toBe(url)
  })

  test('variant id is rebuilt from refName and the 1-based position', () => {
    const r = record({
      record: {
        type: 'variation',
        id: 'Variant_{refName}_{position}',
        tables: ['PredictedEffects'],
      },
    })
    expect(recordUrl(r, { refName: 'Pf3D7_01_v3', start: 100417 })).toBe(
      '/a/app/embed-record/variation/Variant_Pf3D7_01_v3_100418?tables=PredictedEffects',
    )
  })
})

describe('recordUrl', () => {
  test('baseUrl overrides the same-origin default, trailing slash ignored', () => {
    const r = record({
      record: {
        type: 'gene',
        id: '{id}',
        baseUrl: 'https://plasmodb.org/plasmo/',
      },
    })
    expect(recordUrl(r, { id: 'G1' })).toBe(
      'https://plasmodb.org/plasmo/app/embed-record/gene/G1',
    )
  })

  test('no tables means no query string', () => {
    expect(
      recordUrl(record({ record: { type: 'gene', id: '{id}' } }), { id: 'G1' }),
    ).toBe('/a/app/embed-record/gene/G1')
  })
})

describe('expandTemplate', () => {
  test('a missing field is reported by name', () => {
    expect(() => expandTemplate('{gene_id}', { id: 'x' })).toThrow(
      new MissingFieldError('gene_id'),
    )
  })

  test('position needs a numeric start', () => {
    expect(() => expandTemplate('{position}', {})).toThrow(
      new MissingFieldError('start'),
    )
  })

  test('a fallback chain reports every name when none is present', () => {
    expect(() => expandTemplate('{parent|id}', {})).toThrow(
      new MissingFieldError('parent|id'),
    )
  })

  test('literal text is kept', () => {
    expect(expandTemplate('x_{a}_y', { a: 1 })).toBe('x_1_y')
  })
})

describe('parseDeclaration', () => {
  test('no metadata or no veupathdb block is undefined', () => {
    expect(parseDeclaration(undefined)).toBeUndefined()
    expect(parseDeclaration({ other: 1 })).toBeUndefined()
  })

  test('defaults', () => {
    expect(
      parseDeclaration({
        veupathdb: {
          record: { type: 'gene', id: '{id}' },
          ncbiProteinTitles: true,
        },
      }),
    ).toEqual({
      record: { type: 'gene', id: '{id}', tables: [], baseUrl: '/a' },
      ncbiProteinTitles: { idField: 'id' },
    })
  })

  test.each([
    ['non-object block', 'gene'],
    ['record without id', { record: { type: 'gene' } }],
    [
      'tables not an array',
      { record: { type: 'gene', id: '{id}', tables: 'GOTerms' } },
    ],
    ['bad baseUrl', { record: { type: 'gene', id: '{id}', baseUrl: 1 } }],
    ['bad ncbi', { ncbiProteinTitles: 'yes' }],
    ['empty idField', { ncbiProteinTitles: { idField: '' } }],
  ])('%s is rejected', (_, veupathdb) => {
    expect(() => parseDeclaration({ veupathdb })).toThrow()
  })
})
