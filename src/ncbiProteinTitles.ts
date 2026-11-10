export const ESUMMARY_URL =
  'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi'
export const DEFAULT_TIMEOUT_MS = 8000

export type FetchImpl = (url: string, init?: RequestInit) => Promise<Response>

export interface ProteinTitle {
  uid: string
  title: string
}

interface EsummaryResponse {
  result?: Record<string, unknown> & { uids?: string[] }
  error?: string
}

export function proteinIds(value: unknown) {
  return String(value ?? '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
}

/**
 * NCBI esummary protein titles, as JBrowse 1 `nrdbGffDetails` fetched them
 * but without an API key. Rejects on HTTP error, malformed body or timeout.
 */
export async function fetchProteinTitles(
  ids: string[],
  {
    timeoutMs = DEFAULT_TIMEOUT_MS,
    fetchImpl = (url: string, init?: RequestInit) => fetch(url, init),
  }: { timeoutMs?: number; fetchImpl?: FetchImpl } = {},
): Promise<ProteinTitle[]> {
  const controller = new AbortController()
  const timer = setTimeout(() => {
    controller.abort()
  }, timeoutMs)
  try {
    const url = `${ESUMMARY_URL}?db=protein&retmode=json&id=${ids.map(encodeURIComponent).join(',')}`
    const res = await fetchImpl(url, { signal: controller.signal })
    if (!res.ok) {
      throw new Error(`NCBI esummary HTTP ${res.status}`)
    }
    const body = (await res.json()) as EsummaryResponse
    const uids = body.result?.uids
    if (!body.result || !Array.isArray(uids)) {
      throw new Error(body.error ?? 'NCBI esummary returned no result')
    }
    const result = body.result
    return uids.flatMap(uid => {
      const entry = result[uid] as
        { title?: unknown; error?: unknown } | undefined
      return entry && !entry.error && typeof entry.title === 'string'
        ? [{ uid, title: entry.title }]
        : []
    })
  } catch (e) {
    if (controller.signal.aborted) {
      throw new Error(`NCBI esummary timed out after ${timeoutMs} ms`)
    }
    throw e
  } finally {
    clearTimeout(timer)
  }
}
