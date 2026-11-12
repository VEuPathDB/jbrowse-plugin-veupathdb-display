// Ports of the JBrowse 1 functions.conf styling callbacks. Comparisons go
// through Number()/String() so a GFF3 attribute string compares exactly as
// JBrowse 1's loose `==` and `<=` did.

export interface FeatureLike {
  get(name: string): unknown
  parent?: unknown
}

// A jexl callback sees a proxied feature whose `parent` is a property; a raw
// SimpleFeature has a `parent()` method.
function parentOf(feature: FeatureLike): FeatureLike | undefined {
  const { parent } = feature
  const value: unknown =
    typeof parent === 'function'
      ? (parent as () => unknown).call(feature)
      : parent
  return value && typeof value === 'object' ? (value as FeatureLike) : undefined
}

function isPlusStrand(feature: FeatureLike) {
  return Number(feature.get('strand')) === 1
}

function num(feature: FeatureLike, name: string) {
  return Number(feature.get(name))
}

function str(feature: FeatureLike, name: string) {
  return String(feature.get(name))
}

/**
 * processedTranscriptBorderColor, processedApolloTranscriptColor, estColor, estBorderColor, nrdbColor, orfColor, piggyBacColor, scaffoldColor.
 * `unstranded` colours strand 0 or absent; omitted, those paint `minus` as before.
 */
export function strandColor(
  feature: FeatureLike,
  plus: string,
  minus: string,
  unstranded?: string,
) {
  const strand = Number(feature.get('strand'))
  if (strand === 1) {
    return plus
  }
  if (strand === -1 || unstranded === undefined) {
    return minus
  }
  return unstranded
}

const TRANSPOSABLE_ELEMENT_GENE = 'transposable_element_gene'
const NONCODING_GENE_TYPES = new Set(['ncRNA_gene', 'pseudogene'])

/**
 * processedTranscriptColor, plus geneTranscriptType + unprocessedTranscriptColor
 * when `noncodingColor` is given; `soterm` is kept for GFFs that carry it
 */
export function processedTranscriptColor(
  feature: FeatureLike,
  noncodingColor?: string,
): string {
  const parent = parentOf(feature)
  if (parent) {
    return processedTranscriptColor(parent, noncodingColor)
  }
  const type = feature.get('type')
  if (
    noncodingColor &&
    typeof type === 'string' &&
    NONCODING_GENE_TYPES.has(type)
  ) {
    return noncodingColor
  }
  if (
    type === TRANSPOSABLE_ELEMENT_GENE ||
    feature.get('soterm') === TRANSPOSABLE_ELEMENT_GENE
  ) {
    return strandColor(feature, '#98AFC7', '#C798AF')
  }
  return strandColor(feature, '#000080', '#aa3311')
}

/** gsnapIntronColorFromStrandAndScore */
export function gsnapIntronColor(feature: FeatureLike) {
  const sum = num(feature, 'totalscore')
  const cuts = [4, 16, 64, 256, 1024]
  const bin = cuts.findIndex(cut => sum <= cut)
  const v = [219, 182, 146, 109, 73, 36][bin === -1 ? cuts.length : bin]
  return Number(feature.get('strand')) === -1
    ? `rgb(255,${v},${v})`
    : `rgb(${v},${v},255)`
}

/** gsnapIntronLineThickness: px, for a link's strokeWidth */
export function gsnapIntronLineThickness(feature: FeatureLike) {
  const sum = num(feature, 'totalscore')
  if (sum <= 4096) {
    return 2
  }
  if (sum <= 16000) {
    return 4
  }
  return 6
}

/** haplotypeColorFxn -> haplotypeColor */
export function haplotypeColor(feature: FeatureLike) {
  return str(feature, 'boundary') === 'Liberal' ? 'darkseagreen' : 'darkgreen'
}

/** colorForBindingSitesByPvalueFxn -> colorForBindingSitesByPvalue; v5 reads GFF3 `Score=` as `score2` */
export function bindingSiteColor(feature: FeatureLike) {
  const pvalue = num(feature, 'score2')
  const [strongest, strong, weak, weakest] = isPlusStrand(feature)
    ? ['mediumblue', 'royalblue', 'dodgerblue', 'skyblue']
    : ['darkred', 'crimson', 'red', 'tomato']
  if (pvalue <= 1e-5) {
    return strongest
  }
  if (pvalue <= 5e-5) {
    return strong
  }
  if (pvalue <= 1e-4) {
    return weak
  }
  return weakest
}

// JBrowse 1 returned 'maize', not a CSS colour; Crayola maize stands in.
export const INTERPRO_COLORS: Record<string, string> = {
  CDD: 'dodgerblue',
  Coils: 'purple',
  FunFam: 'darkblue',
  Gene3D: 'red',
  Hamap: 'violet',
  MobiDBLite: 'maroon',
  NCBIfam: 'slategray',
  PANTHER: 'lightgray',
  Pfam: 'blue',
  PIRSF: 'orange',
  PIRSR: 'gold',
  PRINTS: '#fbec5d',
  ProSitePatterns: 'brown',
  ProSiteProfiles: 'khaki',
  SFLD: 'mediumseagreen',
  SMART: 'cyan',
  SUPERFAMILY: 'seagreen',
}

/** interproColorFxn */
export function interproColor(feature: FeatureLike) {
  const source = feature.get('source')
  return typeof source === 'string' && Object.hasOwn(INTERPRO_COLORS, source)
    ? INTERPRO_COLORS[source]!
    : 'black'
}

/** signalpColorFxn */
export function signalpColor(feature: FeatureLike) {
  const source = feature.get('source')
  if (source === 'SignalP-4.1') {
    return 'sandybrown'
  }
  if (source === 'SignalP-5.0') {
    return 'seagreen'
  }
  const type = feature.get('type')
  if (type === 'n-region') {
    return 'grey'
  }
  if (type === 'h-region') {
    return 'blue'
  }
  return 'red'
}

/** iedbColorFxn -> iedbColor */
export function iedbColor(feature: FeatureLike) {
  if (str(feature, 'matchesfulllengthprotein') === '1') {
    return 'rgba(30,130,76,1)'
  }
  if (str(feature, 'mismatches') === '0') {
    return 'rgba(30,130,76,0.5)'
  }
  return 'rgba(30,130,76,0.2)'
}

/** unifiedPostTranslationalModColor */
export function postTranslationalModColor(feature: FeatureLike) {
  const ontology = str(feature, 'modificationtype')
  if (/phosphorylation_site/i.test(ontology)) {
    return 'dodgerblue'
  }
  if (/modified_L_cysteine/i.test(ontology)) {
    return 'deepskyblue'
  }
  if (/iodoacetamide_derivatized_residue/i.test(ontology)) {
    return 'blueviolet'
  }
  if (/modified_L_methionine/i.test(ontology)) {
    return 'steelblue'
  }
  return 'blue'
}
