import {
  INTERPRO_COLORS,
  bindingSiteColor,
  gsnapIntronColor,
  gsnapIntronLineThickness,
  haplotypeColor,
  iedbColor,
  interproColor,
  postTranslationalModColor,
  processedTranscriptColor,
  signalpColor,
  strandColor,
} from './styling'

import type { FeatureLike } from './styling'

function feature(data: Record<string, unknown>, parent?: unknown): FeatureLike {
  return { get: (name: string) => data[name], parent }
}

describe('strandColor', () => {
  test.each([
    [1, 'plus'],
    ['1', 'plus'],
    ['+1', 'plus'],
    [-1, 'minus'],
    [0, 'minus'],
    [undefined, 'minus'],
  ])('strand %p is %s', (strand, expected) => {
    expect(strandColor(feature({ strand }), 'plus', 'minus')).toBe(expected)
  })

  describe('unstranded', () => {
    test.each([
      [1, 'plus'],
      ['+1', 'plus'],
      [-1, 'minus'],
      ['-1', 'minus'],
      [0, 'none'],
      ['0', 'none'],
      [undefined, 'none'],
      [null, 'none'],
    ])('strand %p is %s', (strand, expected) => {
      expect(strandColor(feature({ strand }), 'plus', 'minus', 'none')).toBe(
        expected,
      )
    })
  })
})

describe('processedTranscriptColor', () => {
  const TE = 'transposable_element_gene'
  const kinds: [string, Record<string, unknown>, string, string][] = [
    ['TE by type', { type: TE }, '#98AFC7', '#C798AF'],
    ['TE by soterm only', { type: 'gene', soterm: TE }, '#98AFC7', '#C798AF'],
    ['neither', { type: 'gene' }, '#000080', '#aa3311'],
    [
      'neither, other soterm',
      { type: 'protein_coding_gene', soterm: 'protein_coding' },
      '#000080',
      '#aa3311',
    ],
  ]
  const cases = kinds.flatMap(([kind, data, plus, minus]) => [
    [kind, 1, data, plus] as const,
    [kind, -1, data, minus] as const,
  ])

  test.each(cases)('%s, strand %p', (_, strand, data, expected) => {
    expect(processedTranscriptColor(feature({ ...data, strand }))).toBe(
      expected,
    )
  })

  test.each(cases)(
    '%s, strand %p, through a child',
    (_, strand, data, expected) => {
      const gene = feature({ ...data, strand })
      const mrna = feature({ type: 'mRNA', strand: -strand }, gene)
      const cds = feature({ type: 'CDS', strand: -strand }, mrna)
      expect(processedTranscriptColor(cds)).toBe(expected)
    },
  )

  test('a child of type transposable_element_gene does not colour itself', () => {
    const gene = feature({ type: 'gene', strand: 1 })
    expect(processedTranscriptColor(feature({ type: TE }, gene))).toBe(
      '#000080',
    )
  })

  test('a child takes its root ancestor colour (parent as a property)', () => {
    const gene = feature({ strand: -1, soterm: 'transposable_element_gene' })
    const mrna = feature({ strand: 1 }, gene)
    const exon = feature({ strand: 1 }, mrna)
    expect(processedTranscriptColor(exon)).toBe('#C798AF')
  })

  test('a child takes its ancestor colour (parent as a method)', () => {
    const gene = feature({ strand: 1, soterm: 'transposable_element_gene' })
    const mrna = { get: () => -1, parent: () => gene }
    expect(processedTranscriptColor(mrna)).toBe('#98AFC7')
  })

  describe('noncodingColor', () => {
    const NC = 'lightgrey'
    const withChildren = (data: Record<string, unknown>) => {
      const gene = feature(data)
      const transcript = feature({ type: 'ncRNA', strand: data.strand }, gene)
      return feature({ type: 'exon', strand: data.strand }, transcript)
    }
    const genes = ['ncRNA_gene', 'pseudogene'].flatMap(type => [
      [type, 1, '#000080'] as const,
      [type, -1, '#aa3311'] as const,
    ])

    test.each(genes)('%s, strand %p, with the argument', (type, strand) => {
      expect(processedTranscriptColor(feature({ type, strand }), NC)).toBe(NC)
    })

    test.each(genes)(
      '%s, strand %p, with the argument, through gene>transcript>exon',
      (type, strand) => {
        expect(
          processedTranscriptColor(withChildren({ type, strand }), NC),
        ).toBe(NC)
      },
    )

    test.each(genes)(
      '%s, strand %p, without the argument keeps the strand colour',
      (type, strand, expected) => {
        expect(processedTranscriptColor(feature({ type, strand }))).toBe(
          expected,
        )
        expect(processedTranscriptColor(withChildren({ type, strand }))).toBe(
          expected,
        )
      },
    )

    test.each([
      [
        'protein_coding_gene',
        { type: 'protein_coding_gene' },
        '#000080',
        '#aa3311',
      ],
      ['TE gene', { type: TE }, '#98AFC7', '#C798AF'],
      ['TE by soterm', { type: 'gene', soterm: TE }, '#98AFC7', '#C798AF'],
    ])('%s ignores the argument', (_, data, plus, minus) => {
      expect(
        processedTranscriptColor(feature({ ...data, strand: 1 }), NC),
      ).toBe(plus)
      expect(
        processedTranscriptColor(withChildren({ ...data, strand: -1 }), NC),
      ).toBe(minus)
    })

    test('an ncRNA_gene typed child under a coding gene does not take it', () => {
      const gene = feature({ type: 'protein_coding_gene', strand: 1 })
      expect(
        processedTranscriptColor(feature({ type: 'ncRNA_gene' }, gene), NC),
      ).toBe('#000080')
    })
  })
})

describe('gsnapIntronColor', () => {
  test.each([
    [4, 'rgb(219,219,255)'],
    [5, 'rgb(182,182,255)'],
    [16, 'rgb(182,182,255)'],
    [64, 'rgb(146,146,255)'],
    [256, 'rgb(109,109,255)'],
    [1024, 'rgb(73,73,255)'],
    [1025, 'rgb(36,36,255)'],
  ])('plus strand, totalscore %p', (totalscore, expected) => {
    expect(gsnapIntronColor(feature({ strand: 1, totalscore }))).toBe(expected)
  })

  test.each([
    ['4', 'rgb(255,219,219)'],
    ['16', 'rgb(255,182,182)'],
    ['64', 'rgb(255,146,146)'],
    ['256', 'rgb(255,109,109)'],
    ['1024', 'rgb(255,73,73)'],
    ['5000', 'rgb(255,36,36)'],
  ])('minus strand, totalscore %p', (totalscore, expected) => {
    expect(gsnapIntronColor(feature({ strand: -1, totalscore }))).toBe(expected)
  })

  test('unstranded is the plus ramp', () => {
    expect(gsnapIntronColor(feature({ totalscore: 3 }))).toBe(
      'rgb(219,219,255)',
    )
  })

  test('missing totalscore is the darkest bin', () => {
    expect(gsnapIntronColor(feature({ strand: -1 }))).toBe('rgb(255,36,36)')
  })
})

describe('gsnapIntronLineThickness', () => {
  test.each([
    [4096, 2],
    ['4097', 4],
    [16000, 4],
    [16001, 6],
    [undefined, 6],
  ])('totalscore %p is %p px', (totalscore, expected) => {
    expect(gsnapIntronLineThickness(feature({ totalscore }))).toBe(expected)
  })
})

describe('haplotypeColor', () => {
  test.each([
    ['Liberal', 'darkseagreen'],
    ['Conservative', 'darkgreen'],
    [undefined, 'darkgreen'],
  ])('boundary %p', (boundary, expected) => {
    expect(haplotypeColor(feature({ boundary }))).toBe(expected)
  })
})

describe('bindingSiteColor', () => {
  test.each([
    ['1e-5', 'mediumblue'],
    ['5e-5', 'royalblue'],
    ['0.0001', 'dodgerblue'],
    ['0.001', 'skyblue'],
  ])('plus strand, score2 %p', (score2, expected) => {
    expect(bindingSiteColor(feature({ strand: 1, score2 }))).toBe(expected)
  })

  test.each([
    [1e-6, 'darkred'],
    [4e-5, 'crimson'],
    [9e-5, 'red'],
    [0.5, 'tomato'],
  ])('minus strand, score2 %p', (score2, expected) => {
    expect(bindingSiteColor(feature({ strand: -1, score2 }))).toBe(expected)
  })

  test('missing score2 is the weakest colour of the strand', () => {
    expect(bindingSiteColor(feature({ strand: 1 }))).toBe('skyblue')
    expect(bindingSiteColor(feature({ strand: -1 }))).toBe('tomato')
  })

  test('the GFF score column is not read', () => {
    expect(bindingSiteColor(feature({ strand: 1, score: 1e-9 }))).toBe(
      'skyblue',
    )
  })
})

describe('interproColor', () => {
  test.each(Object.entries(INTERPRO_COLORS))('%s', (source, expected) => {
    expect(interproColor(feature({ source }))).toBe(expected)
  })

  test('PRINTS is a valid stand-in for maize', () => {
    expect(interproColor(feature({ source: 'PRINTS' }))).toBe('#fbec5d')
  })

  test.each(['Prosite', 'toString', undefined])(
    'unknown source %p is black',
    source => {
      expect(interproColor(feature({ source }))).toBe('black')
    },
  )
})

describe('signalpColor', () => {
  test.each([
    [{ source: 'SignalP-4.1', type: 'n-region' }, 'sandybrown'],
    [{ source: 'SignalP-5.0', type: 'h-region' }, 'seagreen'],
    [{ source: 'SignalP-6.0', type: 'n-region' }, 'grey'],
    [{ type: 'h-region' }, 'blue'],
    [{ type: 'c-region' }, 'red'],
    [{ type: 'signal_peptide' }, 'red'],
    [{}, 'red'],
  ])('%p', (data, expected) => {
    expect(signalpColor(feature(data))).toBe(expected)
  })
})

describe('iedbColor', () => {
  test.each([
    [{ matchesfulllengthprotein: '1', mismatches: '2' }, 'rgba(30,130,76,1)'],
    [{ matchesfulllengthprotein: 1 }, 'rgba(30,130,76,1)'],
    [{ matchesfulllengthprotein: '0', mismatches: '0' }, 'rgba(30,130,76,0.5)'],
    [{ mismatches: 0 }, 'rgba(30,130,76,0.5)'],
    [{ matchesfulllengthprotein: '0', mismatches: '1' }, 'rgba(30,130,76,0.2)'],
    [{}, 'rgba(30,130,76,0.2)'],
  ])('%p', (data, expected) => {
    expect(iedbColor(feature(data))).toBe(expected)
  })

  test('the JBrowse 1 camelCase name is not read', () => {
    expect(iedbColor(feature({ matchesFullLengthProtein: '1' }))).toBe(
      'rgba(30,130,76,0.2)',
    )
  })
})

describe('postTranslationalModColor', () => {
  test.each([
    ['phosphorylation_site', 'dodgerblue'],
    ['Phosphorylation_Site', 'dodgerblue'],
    ['modified_L_cysteine', 'deepskyblue'],
    ['iodoacetamide_derivatized_residue', 'blueviolet'],
    ['modified_L_methionine', 'steelblue'],
    ['acetylation_site', 'blue'],
    [undefined, 'blue'],
  ])('modificationtype %p', (modificationtype, expected) => {
    expect(postTranslationalModColor(feature({ modificationtype }))).toBe(
      expected,
    )
  })
})
