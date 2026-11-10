import React, { useEffect, useState } from 'react'

import BaseCard from '@jbrowse/core/BaseFeatureWidget/BaseFeatureDetail/BaseCard'
import { readConfObject } from '@jbrowse/core/configuration'
import { observer } from 'mobx-react'

import { parseDeclaration } from './declaration'
import { fetchProteinTitles, proteinIds } from './ncbiProteinTitles'
import { recordUrl } from './recordUrl'

import type {
  NcbiProteinTitlesDeclaration,
  RecordDeclaration,
} from './declaration'
import type { ProteinTitle } from './ncbiProteinTitles'
import type { FeatureFields } from './recordUrl'
import type { AnyConfigurationModel } from '@jbrowse/core/configuration'

export interface PanelProps {
  model: { trackConfiguration?: AnyConfigurationModel }
  feature: FeatureFields
  unformatted?: FeatureFields
  depth: number
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div role="note" style={{ padding: 8, fontStyle: 'italic' }}>
      {children}
    </div>
  )
}

function RecordIframe({
  record,
  feature,
}: {
  record: RecordDeclaration
  feature: FeatureFields
}) {
  let url: string
  try {
    url = recordUrl(record, feature)
  } catch (e) {
    return (
      <BaseCard title="Record details">
        <Notice>
          No {record.type} record id:{' '}
          {e instanceof Error ? e.message : String(e)}
        </Notice>
      </BaseCard>
    )
  }
  return (
    <BaseCard title="Record details">
      <iframe
        title={`${record.type} record`}
        src={url}
        style={{ width: '100%', height: 600, border: 'none' }}
      />
      <div style={{ padding: 4, fontSize: 'small' }}>
        <a href={url} target="_blank" rel="noreferrer">
          {url}
        </a>
      </div>
    </BaseCard>
  )
}

type TitlesState =
  | { status: 'loading' }
  | { status: 'done'; titles: ProteinTitle[] }
  | { status: 'error'; message: string }

function NcbiTitles({
  decl,
  feature,
}: {
  decl: NcbiProteinTitlesDeclaration
  feature: FeatureFields
}) {
  const ids = proteinIds(feature[decl.idField])
  const key = ids.join(',')
  const [state, setState] = useState<TitlesState>({ status: 'loading' })
  useEffect(() => {
    if (!key) {
      return
    }
    let live = true
    setState({ status: 'loading' })
    fetchProteinTitles(key.split(',')).then(
      titles => {
        if (live) {
          setState({ status: 'done', titles })
        }
      },
      (e: unknown) => {
        if (live) {
          setState({
            status: 'error',
            message: e instanceof Error ? e.message : String(e),
          })
        }
      },
    )
    return () => {
      live = false
    }
  }, [key])

  return (
    <BaseCard title="NCBI protein">
      {!key ? (
        <Notice>No protein id in field &quot;{decl.idField}&quot;</Notice>
      ) : state.status === 'loading' ? (
        <Notice>Fetching titles from NCBI…</Notice>
      ) : state.status === 'error' ? (
        <Notice>
          NCBI titles unavailable ({state.message}); stored attributes are shown
          above.
        </Notice>
      ) : (
        <TitlesTable ids={ids} titles={state.titles} />
      )}
    </BaseCard>
  )
}

function TitlesTable({
  ids,
  titles,
}: {
  ids: string[]
  titles: ProteinTitle[]
}) {
  const found = new Set(titles.map(t => t.uid))
  const missing = ids.filter(id => !found.has(id))
  return (
    <>
      {titles.length ? (
        <table>
          <tbody>
            {titles.map(({ uid, title }) => (
              <tr key={uid}>
                <td style={{ paddingRight: 8, verticalAlign: 'top' }}>
                  <a
                    href={`https://www.ncbi.nlm.nih.gov/protein/${uid}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {uid}
                  </a>
                </td>
                <td>{title}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
      {missing.length ? (
        <Notice>
          NCBI has no protein record for {missing.join(', ')}; stored attributes
          are shown above.
        </Notice>
      ) : null}
    </>
  )
}

/**
 * Extra content for the stock feature details, driven only by the track's
 * `metadata.veupathdb` declaration. Renders nothing for undeclared tracks.
 */
const VeupathdbFeaturePanel = observer(function VeupathdbFeaturePanel({
  model,
  feature,
  unformatted,
  depth,
}: PanelProps) {
  const conf = model.trackConfiguration
  if (depth !== 0 || !conf) {
    return null
  }
  let decl
  try {
    decl = parseDeclaration(readConfObject(conf, 'metadata'))
  } catch (e) {
    return (
      <BaseCard title="VEuPathDB">
        <Notice>
          Invalid track declaration:{' '}
          {e instanceof Error ? e.message : String(e)}
        </Notice>
      </BaseCard>
    )
  }
  if (!decl) {
    return null
  }
  const fields = unformatted ?? feature
  return (
    <>
      {decl.ncbiProteinTitles ? (
        <NcbiTitles decl={decl.ncbiProteinTitles} feature={fields} />
      ) : null}
      {decl.record ? (
        <RecordIframe record={decl.record} feature={fields} />
      ) : null}
    </>
  )
})

export default VeupathdbFeaturePanel
