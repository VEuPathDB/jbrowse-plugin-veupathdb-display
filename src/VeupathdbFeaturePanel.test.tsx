import React from 'react'

import { ConfigurationSchema } from '@jbrowse/core/configuration'
import { render, screen, waitFor } from '@testing-library/react'

import VeupathdbFeaturePanel from './VeupathdbFeaturePanel'

const TrackConf = ConfigurationSchema('TestTrack', {
  metadata: { type: 'frozen', defaultValue: {} },
})

function model(metadata: unknown) {
  return { trackConfiguration: TrackConf.create({ metadata }) }
}

const gene = {
  record: {
    type: 'gene',
    id: '{id}',
    tables: ['GeneTranscripts', 'GOTerms', 'PubMed'],
  },
}

afterEach(() => {
  jest.restoreAllMocks()
})

test('an undeclared track renders nothing', () => {
  const { container } = render(
    <VeupathdbFeaturePanel
      model={model({})}
      feature={{ id: 'G1' }}
      depth={0}
    />,
  )
  expect(container).toBeEmptyDOMElement()
})

test('a closed track (no configuration) renders nothing', () => {
  const { container } = render(
    <VeupathdbFeaturePanel model={{}} feature={{ id: 'G1' }} depth={0} />,
  )
  expect(container).toBeEmptyDOMElement()
})

test('subfeature cards get no panel', () => {
  const { container } = render(
    <VeupathdbFeaturePanel
      model={model({ veupathdb: gene })}
      feature={{ id: 'G1' }}
      depth={1}
    />,
  )
  expect(container).toBeEmptyDOMElement()
})

test('a declared record renders the embed-record iframe', () => {
  render(
    <VeupathdbFeaturePanel
      model={model({ veupathdb: gene })}
      feature={{ id: 'PF3D7_0100100' }}
      depth={0}
    />,
  )
  expect(screen.getByTitle('gene record')).toHaveAttribute(
    'src',
    '/a/app/embed-record/gene/PF3D7_0100100?tables=GeneTranscripts,GOTerms,PubMed',
  )
})

test('the unformatted feature is preferred for the id', () => {
  render(
    <VeupathdbFeaturePanel
      model={model({ veupathdb: gene })}
      feature={{ id: 'formatted' }}
      unformatted={{ id: 'raw' }}
      depth={0}
    />,
  )
  expect(screen.getByTitle('gene record').getAttribute('src')).toContain(
    '/gene/raw?',
  )
})

test('a missing id field shows a notice instead of an iframe', () => {
  render(
    <VeupathdbFeaturePanel
      model={model({ veupathdb: gene })}
      feature={{}}
      depth={0}
    />,
  )
  expect(screen.queryByTitle('gene record')).toBeNull()
  expect(screen.getByRole('note')).toHaveTextContent(
    'feature has no "id" field',
  )
})

test('an invalid declaration is reported, not thrown', () => {
  render(
    <VeupathdbFeaturePanel
      model={model({ veupathdb: { record: { type: 'gene' } } })}
      feature={{ id: 'G1' }}
      depth={0}
    />,
  )
  expect(screen.getByRole('note')).toHaveTextContent(
    'Invalid track declaration',
  )
})

describe('NCBI protein titles', () => {
  const nrdb = { veupathdb: { ncbiProteinTitles: { idField: 'id' } } }

  test('titles are shown on success', async () => {
    globalThis.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            result: { uids: ['42'], '42': { title: 'kinase [P. falciparum]' } },
          }),
      } as Response),
    )
    render(
      <VeupathdbFeaturePanel
        model={model(nrdb)}
        feature={{ id: '42' }}
        depth={0}
      />,
    )
    expect(screen.getByRole('note')).toHaveTextContent('Fetching titles')
    await waitFor(() => {
      expect(screen.getByText('kinase [P. falciparum]')).toBeInTheDocument()
    })
  })

  test('failure shows a notice and leaves the panel usable', async () => {
    globalThis.fetch = jest.fn(() =>
      Promise.reject(new TypeError('Failed to fetch')),
    )
    render(
      <VeupathdbFeaturePanel
        model={model(nrdb)}
        feature={{ id: '42' }}
        depth={0}
      />,
    )
    await waitFor(() => {
      expect(screen.getByRole('note')).toHaveTextContent(
        'NCBI titles unavailable (Failed to fetch); stored attributes are shown above.',
      )
    })
  })

  test('ids NCBI does not return are reported, found ones still shown', async () => {
    globalThis.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            result: { uids: ['42'], '42': { title: 'kinase' } },
          }),
      } as Response),
    )
    render(
      <VeupathdbFeaturePanel
        model={model(nrdb)}
        feature={{ id: '42,999999999999' }}
        depth={0}
      />,
    )
    await waitFor(() => {
      expect(screen.getByText('kinase')).toBeInTheDocument()
    })
    expect(screen.getByRole('note')).toHaveTextContent(
      'NCBI has no protein record for 999999999999; stored attributes are shown above.',
    )
  })

  test('no id shows a notice and makes no request', () => {
    const fetchMock = jest.fn()
    globalThis.fetch = fetchMock
    render(<VeupathdbFeaturePanel model={model(nrdb)} feature={{}} depth={0} />)
    expect(screen.getByRole('note')).toHaveTextContent('No protein id')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  test('both a record and titles may be declared on one track', async () => {
    globalThis.fetch = jest.fn(() => Promise.reject(new Error('x')))
    render(
      <VeupathdbFeaturePanel
        model={model({ veupathdb: { ...gene, ncbiProteinTitles: true } })}
        feature={{ id: '42' }}
        depth={0}
      />,
    )
    expect(screen.getByTitle('gene record')).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByRole('note')).toHaveTextContent('unavailable')
    })
  })
})
