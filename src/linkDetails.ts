import type { FeatureLike } from './styling'

// formatDetails hands callbacks the serialized feature, a plain object
// (core BaseFeatureWidget/formatDetails.ts applyFormatDetails), not a Feature.
type FeatureOrSerialized = FeatureLike | Record<string, unknown>

function attr(feature: FeatureOrSerialized, name: string): unknown {
  return typeof feature.get === 'function'
    ? (feature as FeatureLike).get(name)
    : (feature as Record<string, unknown>)[name]
}

function escapeHtml(text: string) {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

/**
 * scaffoldDetails, for a `formatDetails.feature` slot: one extra row, `label`,
 * linking `urlPrefix` + the feature's `field`, on features of `type` only.
 * Anything else gets `{}`, which leaves the stock panel as it is.
 */
export function linkDetails(
  feature: FeatureOrSerialized,
  type: string,
  label: string,
  urlPrefix: string,
  field: string,
): Record<string, string> {
  if (attr(feature, 'type') !== type) {
    return {}
  }
  const value = attr(feature, field.toLowerCase())
  if (value === undefined || value === null || value === '') {
    return {}
  }
  const text = String(value)
  const href = urlPrefix + encodeURIComponent(text)
  return {
    [label]: `<a href="${escapeHtml(href)}" target="_blank" rel="noopener">${escapeHtml(text)}</a>`,
  }
}
