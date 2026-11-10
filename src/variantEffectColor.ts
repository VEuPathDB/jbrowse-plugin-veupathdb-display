export const TRUNCATING_COLOR = '#b71c1c'
export const NON_SYNONYMOUS_COLOR = '#7b3294'
export const SYNONYMOUS_COLOR = '#43a047'
export const OTHER_COLOR = '#2c7bb6'

const TRUNCATING =
  /stop_gained|stop_lost|start_lost|frameshift|splice_acceptor|splice_donor|exon_loss|transcript_ablation/
const NON_SYNONYMOUS =
  /missense|inframe_insertion|inframe_deletion|protein_altering|rare_amino_acid|initiator_codon/
const SYNONYMOUS = /synonymous_variant|stop_retained|start_retained/

interface FeatureLike {
  get(name: string): unknown
}

function annEntries(feature: FeatureLike): unknown[] {
  const info = feature.get('INFO') as Record<string, unknown> | undefined
  const ann = info?.ANN
  if (Array.isArray(ann)) {
    return ann
  }
  return typeof ann === 'string' ? ann.split(',') : []
}

/**
 * Port of JBrowse 1 `variantEffectColorFxn`: every snpEff ANN entry is scanned
 * and the most severe effect class wins, so compound effects
 * (`missense_variant&splice_region_variant`) classify by their worst term.
 */
export function variantEffectColor(feature: FeatureLike) {
  const effects = annEntries(feature)
    .map(entry => String(entry).split('|')[1] ?? '')
    .join('&')
  if (TRUNCATING.test(effects)) {
    return TRUNCATING_COLOR
  }
  if (NON_SYNONYMOUS.test(effects)) {
    return NON_SYNONYMOUS_COLOR
  }
  if (SYNONYMOUS.test(effects)) {
    return SYNONYMOUS_COLOR
  }
  return OTHER_COLOR
}
