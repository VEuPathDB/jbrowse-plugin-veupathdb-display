import Plugin from '@jbrowse/core/Plugin'

import VeupathdbFeaturePanel from './VeupathdbFeaturePanel'
import { linkDetails } from './linkDetails'
import {
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
import { variantEffectColor } from './variantEffectColor'

import type PluginManager from '@jbrowse/core/PluginManager'
import type { FeaturePanelProps } from '@jbrowse/core/PluginManager'
import type { ComponentType } from 'react'

export const JEXL_FUNCTIONS = {
  veupathVariantEffectColor: variantEffectColor,
  veupathStrandColor: strandColor,
  veupathProcessedTranscriptColor: processedTranscriptColor,
  veupathGsnapIntronColor: gsnapIntronColor,
  veupathGsnapIntronLineThickness: gsnapIntronLineThickness,
  veupathHaplotypeColor: haplotypeColor,
  veupathBindingSiteColor: bindingSiteColor,
  veupathInterproColor: interproColor,
  veupathSignalpColor: signalpColor,
  veupathIedbColor: iedbColor,
  veupathPostTranslationalModColor: postTranslationalModColor,
  veupathLinkDetails: linkDetails,
}

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
    for (const [name, fn] of Object.entries(JEXL_FUNCTIONS)) {
      pluginManager.jexl.addFunction(name, fn)
    }
  }
}
