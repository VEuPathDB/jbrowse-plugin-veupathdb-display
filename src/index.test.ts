import PluginManager from '@jbrowse/core/PluginManager'

import VEuPathDBDisplayPlugin from './index'
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
