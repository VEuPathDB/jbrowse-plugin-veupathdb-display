import {
  NON_SYNONYMOUS_COLOR,
  OTHER_COLOR,
  SYNONYMOUS_COLOR,
  TRUNCATING_COLOR,
  variantEffectColor,
} from './variantEffectColor'

function feature(info: Record<string, unknown> | undefined) {
  return { get: (name: string) => (name === 'INFO' ? info : undefined) }
}

const ann = (...effects: string[]) =>
  feature({ ANN: effects.map(e => `A|${e}|MODERATE|PF3D7_0100100`) })

describe('variantEffectColor', () => {
  test.each([
    'stop_gained',
    'stop_lost',
    'start_lost',
    'frameshift_variant',
    'splice_acceptor_variant',
    'splice_donor_variant',
    'exon_loss_variant',
    'transcript_ablation',
  ])('%s is truncating', effect => {
    expect(variantEffectColor(ann(effect))).toBe(TRUNCATING_COLOR)
  })

  test.each([
    'missense_variant',
    'inframe_insertion',
    'inframe_deletion',
    'disruptive_inframe_deletion',
    'protein_altering_variant',
    'rare_amino_acid_variant',
    'initiator_codon_variant',
  ])('%s is non-synonymous', effect => {
    expect(variantEffectColor(ann(effect))).toBe(NON_SYNONYMOUS_COLOR)
  })

  test.each(['synonymous_variant', 'stop_retained_variant', 'start_retained'])(
    '%s is synonymous',
    effect => {
      expect(variantEffectColor(ann(effect))).toBe(SYNONYMOUS_COLOR)
    },
  )

  test.each(['intron_variant', 'upstream_gene_variant', 'intergenic_region'])(
    '%s is other',
    effect => {
      expect(variantEffectColor(ann(effect))).toBe(OTHER_COLOR)
    },
  )

  test('compound effect classifies by its most severe term', () => {
    expect(
      variantEffectColor(ann('missense_variant&splice_region_variant')),
    ).toBe(NON_SYNONYMOUS_COLOR)
    expect(
      variantEffectColor(ann('splice_region_variant&synonymous_variant')),
    ).toBe(SYNONYMOUS_COLOR)
  })

  test('every entry is scanned, not just the first', () => {
    expect(
      variantEffectColor(
        ann('upstream_gene_variant', 'synonymous_variant', 'stop_gained'),
      ),
    ).toBe(TRUNCATING_COLOR)
    expect(
      variantEffectColor(ann('synonymous_variant', 'missense_variant')),
    ).toBe(NON_SYNONYMOUS_COLOR)
  })

  test('only the effect column is matched', () => {
    expect(
      variantEffectColor(
        feature({ ANN: ['A|intron_variant|HIGH|stop_gained'] }),
      ),
    ).toBe(OTHER_COLOR)
  })

  test('an unparsed comma-joined ANN string is split into entries', () => {
    expect(
      variantEffectColor(
        feature({ ANN: 'A|intron_variant|MODIFIER|G,A|stop_lost|HIGH|G' }),
      ),
    ).toBe(TRUNCATING_COLOR)
  })

  test.each([
    ['no INFO', undefined],
    ['no ANN', {}],
    ['empty ANN', { ANN: [] }],
  ])('%s is other', (_, info) => {
    expect(variantEffectColor(feature(info))).toBe(OTHER_COLOR)
  })
})
