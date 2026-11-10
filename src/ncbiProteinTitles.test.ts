import { fetchProteinTitles, proteinIds } from './ncbiProteinTitles'

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response)
}

describe('fetchProteinTitles', () => {
  test('success returns one title per uid, in order, with no api_key', async () => {
    const fetchImpl = jest.fn<Promise<Response>, [string, RequestInit?]>(() =>
      jsonResponse({
        result: {
          uids: ['124505927', '23498371'],
          '124505927': {
            title: 'erythrocyte membrane protein 1 [Plasmodium falciparum 3D7]',
          },
          '23498371': { title: 'hypothetical protein' },
        },
      }),
    )
    await expect(
      fetchProteinTitles(['124505927', '23498371'], { fetchImpl }),
    ).resolves.toEqual([
      {
        uid: '124505927',
        title: 'erythrocyte membrane protein 1 [Plasmodium falciparum 3D7]',
      },
      { uid: '23498371', title: 'hypothetical protein' },
    ])
    const url = fetchImpl.mock.calls[0]![0]
    expect(url).toBe(
      'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=protein&retmode=json&id=124505927,23498371',
    )
    expect(url).not.toContain('api_key')
  })

  test('unknown ids (empty uids, or a per-uid error) yield no titles', async () => {
    const empty = jest.fn(() =>
      jsonResponse({ header: {}, result: { uids: [] } }),
    )
    await expect(
      fetchProteinTitles(['999999999999'], { fetchImpl: empty }),
    ).resolves.toEqual([])
    const perUid = jest.fn(() =>
      jsonResponse({
        result: {
          uids: ['1', '2'],
          '1': { uid: '1', error: 'cannot get document summary' },
          '2': { title: 'kinase' },
        },
      }),
    )
    await expect(
      fetchProteinTitles(['1', '2'], { fetchImpl: perUid }),
    ).resolves.toEqual([{ uid: '2', title: 'kinase' }])
  })

  test('HTTP failure rejects', async () => {
    const fetchImpl = jest.fn(() => jsonResponse({}, 429))
    await expect(fetchProteinTitles(['1'], { fetchImpl })).rejects.toThrow(
      'NCBI esummary HTTP 429',
    )
  })

  test('network failure rejects', async () => {
    const fetchImpl = jest.fn(() =>
      Promise.reject(new TypeError('Failed to fetch')),
    )
    await expect(fetchProteinTitles(['1'], { fetchImpl })).rejects.toThrow(
      'Failed to fetch',
    )
  })

  test('an error body rejects with NCBI’s message', async () => {
    const fetchImpl = jest.fn(() => jsonResponse({ error: 'Invalid uid' }))
    await expect(fetchProteinTitles(['x'], { fetchImpl })).rejects.toThrow(
      'Invalid uid',
    )
  })

  test('timeout aborts the request and rejects', async () => {
    jest.useFakeTimers()
    try {
      const fetchImpl = jest.fn(
        (_url: string, init?: RequestInit) =>
          new Promise<Response>((_, reject) => {
            init?.signal?.addEventListener('abort', () => {
              reject(new DOMException('aborted', 'AbortError'))
            })
          }),
      )
      const p = fetchProteinTitles(['1'], { fetchImpl, timeoutMs: 50 })
      jest.advanceTimersByTime(50)
      await expect(p).rejects.toThrow('timed out after 50 ms')
    } finally {
      jest.useRealTimers()
    }
  })
})

describe('proteinIds', () => {
  test('splits comma lists and drops blanks', () => {
    expect(proteinIds('1, 2,,3')).toEqual(['1', '2', '3'])
    expect(proteinIds(undefined)).toEqual([])
    expect(proteinIds(124505927)).toEqual(['124505927'])
  })
})
