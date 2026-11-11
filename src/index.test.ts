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
