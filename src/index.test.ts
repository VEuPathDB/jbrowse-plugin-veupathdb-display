import PluginManager from '@jbrowse/core/PluginManager'

import SimpleFeature, {
  buildJexlContext,
} from '@jbrowse/core/util/simpleFeature'

import VEuPathDBDisplayPlugin, { JEXL_FUNCTIONS } from './index'
import VeupathdbFeaturePanel from './VeupathdbFeaturePanel'
import { SYNONYMOUS_COLOR } from './variantEffectColor'

function setup() {
  const pm = new PluginManager([new VEuPathDBDisplayPlugin()])
  pm.createPluggableElements()
  pm.configure()
  return pm
}

test('plugin is named VEuPathDBDisplay', () => {
  expect(new VEuPathDBDisplayPlugin().name).toBe('VEuPathDBDisplay')
})

test('the feature panel is contributed to Core-extraFeaturePanel', () => {
  const pm = setup()
  const panels = pm.evaluateExtensionPoint('Core-extraFeaturePanel', [], {
    model: {} as never,
    feature: {} as never,
    depth: 0,
  })
  expect(panels).toContain(VeupathdbFeaturePanel)
})

test('veupathVariantEffectColor is a jexl function', () => {
  const pm = setup()
  const feature = {
    get: (n: string) =>
      n === 'INFO' ? { ANN: ['A|synonymous_variant|LOW|G'] } : undefined,
  }
  expect(pm.jexl.eval('veupathVariantEffectColor(feature)', { feature })).toBe(
    SYNONYMOUS_COLOR,
  )
})

test.each(Object.keys(JEXL_FUNCTIONS))('%s is a jexl function', name => {
  expect(setup().jexl._grammar.functions[name]).toBe(
    JEXL_FUNCTIONS[name as keyof typeof JEXL_FUNCTIONS],
  )
})

test('veupathStrandColor takes its colours as arguments', () => {
  const feature = new SimpleFeature({
    id: 'est',
    data: { refName: 'ctgA', start: 0, end: 10, strand: -1 },
  })
  expect(
    setup().jexl.eval(
      "veupathStrandColor(feature, 'deepskyblue', 'pink')",
      buildJexlContext({ feature }),
    ),
  ).toBe('pink')
})

test('veupathProcessedTranscriptColor passes noncodingColor through jexl', () => {
  const gene = new SimpleFeature({
    id: 'nc',
    data: {
      refName: 'ctgA',
      start: 0,
      end: 100,
      strand: -1,
      type: 'pseudogene',
      subfeatures: [{ start: 0, end: 100, strand: -1, type: 'transcript' }],
    },
  })
  const transcript = gene.children()![0]!
  const pm = setup()
  expect(
    pm.jexl.eval(
      "veupathProcessedTranscriptColor(feature, 'lightgrey')",
      buildJexlContext({ feature: transcript }),
    ),
  ).toBe('lightgrey')
  expect(
    pm.jexl.eval(
      'veupathProcessedTranscriptColor(feature)',
      buildJexlContext({ feature: transcript }),
    ),
  ).toBe('#aa3311')
})

test('veupathProcessedTranscriptColor walks a proxied feature to its gene', () => {
  const gene = new SimpleFeature({
    id: 'gene',
    data: {
      refName: 'ctgA',
      start: 0,
      end: 100,
      strand: 1,
      soterm: 'transposable_element_gene',
      subfeatures: [{ start: 0, end: 100, strand: 1, type: 'mRNA' }],
    },
  })
  const mrna = gene.children()![0]!
  expect(
    setup().jexl.eval(
      'veupathProcessedTranscriptColor(feature)',
      buildJexlContext({ feature: mrna }),
    ),
  ).toBe('#98AFC7')
})

test('veupathStrandColor takes an unstranded colour through jexl', () => {
  const pm = setup()
  const colour = (strand: number) =>
    pm.jexl.eval(
      "veupathStrandColor(feature, 'orange', 'darkseagreen', 'red')",
      buildJexlContext({
        feature: new SimpleFeature({
          id: `s${strand}`,
          data: { refName: 'ctgA', start: 0, end: 10, strand },
        }),
      }),
    )
  expect([colour(1), colour(-1), colour(0)]).toEqual([
    'orange',
    'darkseagreen',
    'red',
  ])
})

test('veupathLinkDetails links only the matching type through jexl', () => {
  const pm = setup()
  const details = (type: string) =>
    pm.jexl.eval(
      "veupathLinkDetails(feature, 'scaffold', 'NCBI', 'https://www.ncbi.nlm.nih.gov/nuccore/', 'name')",
      // formatDetails passes the serialized feature
      {
        feature: new SimpleFeature({
          id: type,
          data: { refName: 'ctgA', start: 0, end: 10, type, name: 'NW_1.1' },
        }).toJSON(),
      },
    )
  expect(details('scaffold')).toEqual({
    NCBI: '<a href="https://www.ncbi.nlm.nih.gov/nuccore/NW_1.1" target="_blank" rel="noopener">NW_1.1</a>',
  })
  expect(details('gap')).toEqual({})
})
