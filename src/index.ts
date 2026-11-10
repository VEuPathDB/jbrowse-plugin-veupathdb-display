import Plugin from '@jbrowse/core/Plugin'

import VeupathdbFeaturePanel from './VeupathdbFeaturePanel'
import { variantEffectColor } from './variantEffectColor'

import type PluginManager from '@jbrowse/core/PluginManager'
import type { FeaturePanelProps } from '@jbrowse/core/PluginManager'
import type { ComponentType } from 'react'

export default class VEuPathDBDisplayPlugin extends Plugin {
  name = 'VEuPathDBDisplay'

  install(pluginManager: PluginManager) {
    pluginManager.contributeToExtensionPoint(
      'Core-extraFeaturePanel',
      // the widget behind FeaturePanelProps.model is a BaseFeatureWidget, which has trackConfiguration
      () =>
        VeupathdbFeaturePanel as unknown as ComponentType<FeaturePanelProps>,
    )
  }

  configure(pluginManager: PluginManager) {
    pluginManager.jexl.addFunction(
      'veupathVariantEffectColor',
      variantEffectColor,
    )
  }
}
