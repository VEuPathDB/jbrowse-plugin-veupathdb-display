import { linkDetails } from './linkDetails'

import type { FeatureLike } from './styling'

function feature(data: Record<string, unknown>): FeatureLike {
  return { get: (name: string) => data[name] }
}

const NCBI = 'https://www.ncbi.nlm.nih.gov/nuccore/'

function details(data: Record<string, unknown>, field = 'name') {
  return linkDetails(feature(data), 'scaffold', 'NCBI', NCBI, field)
}

describe('linkDetails', () => {
  it('reads a serialized feature, as formatDetails passes it', () => {
    expect(
      linkDetails(
        { uniqueId: 'u', type: 'scaffold', name: 'NW_9.1' },
        'scaffold',
        'NCBI',
        NCBI,
        'name',
      ),
    ).toEqual({
      NCBI: '<a href="https://www.ncbi.nlm.nih.gov/nuccore/NW_9.1" target="_blank" rel="noopener">NW_9.1</a>',
    })
    expect(
      linkDetails({ type: 'gap', name: 'g' }, 'scaffold', 'NCBI', NCBI, 'name'),
    ).toEqual({})
  })

  it('links a feature of the matching type', () => {
    expect(details({ type: 'scaffold', name: 'NW_001234.1' })).toEqual({
      NCBI: '<a href="https://www.ncbi.nlm.nih.gov/nuccore/NW_001234.1" target="_blank" rel="noopener">NW_001234.1</a>',
    })
  })

  it('reads the field lowercased, as v5 stores GFF3 attributes', () => {
    expect(details({ type: 'scaffold', name: 'NW_1' }, 'Name')).toHaveProperty(
      'NCBI',
    )
  })

  it('returns nothing for another type', () => {
    expect(details({ type: 'gap', name: 'gap_1' })).toEqual({})
  })

  it('returns nothing when the field is absent or empty', () => {
    expect(details({ type: 'scaffold' })).toEqual({})
    expect(details({ type: 'scaffold', name: '' })).toEqual({})
  })

  it('URI-encodes the value and escapes it as text', () => {
    expect(details({ type: 'scaffold', name: 'a b/<c>&"d"' })).toEqual({
      NCBI:
        '<a href="https://www.ncbi.nlm.nih.gov/nuccore/a%20b%2F%3Cc%3E%26%22d%22" target="_blank" rel="noopener">' +
        'a b/&lt;c&gt;&amp;&quot;d&quot;</a>',
    })
  })

  it('escapes a quote in the prefix', () => {
    const out = linkDetails(
      feature({ type: 'scaffold', name: 'x' }),
      'scaffold',
      'L',
      'https://e.org/?q="',
      'name',
    )
    expect(out.L).toContain('href="https://e.org/?q=&quot;x"')
  })

  it('stringifies a non-string value', () => {
    expect(details({ type: 'scaffold', name: 42 })).toEqual({
      NCBI: '<a href="https://www.ncbi.nlm.nih.gov/nuccore/42" target="_blank" rel="noopener">42</a>',
    })
  })
})
