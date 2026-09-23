export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
type RequestOptions = {
  body?: unknown
  token?: string
  signal?: AbortSignal
  responseType?: 'json' | 'text' | 'blob' | 'none'
  /** Gemini endpoints return their own user-facing error messages. */
  errorFormat?: 'server'
}

/** All API calls share transport behavior; endpoint wrappers keep their public signatures. */
export async function request<T>(method: Method, path: string, options: RequestOptions = {}): Promise<T> {
  const { body, token, signal, responseType = 'json', errorFormat } = options
  const separator = path.includes('?') ? '&' : '?'
  const headers: Record<string, string> = {}
  const multipart = body instanceof FormData
  if (body !== undefined && !multipart) headers['Content-Type'] = 'application/json'
  if (token !== undefined) headers.Authorization = `Bearer ${token}`

  const res = await fetch(`/api${path}${separator}_t=${Date.now()}`, {
    // GET previously relied on fetch's default method.
    ...(method !== 'GET' ? { method } : { cache: 'no-store' as const }),
    ...(Object.keys(headers).length ? { headers } : {}),
    ...(body !== undefined ? { body: multipart ? body : JSON.stringify(body) } : {}),
    ...(signal ? { signal } : {}),
  })
  if (!res.ok) {
    // Preserve the original GET / mutation / Gemini message variants exactly.
    let message = `API error: ${res.status}${method === 'GET' ? ` ${res.statusText}` : ''}`
    if (errorFormat === 'server') {
      const error = await res.json().catch(() => ({ error: message }))
      message = error.error || message
    }
    throw new ApiError(res.status, message)
  }

  if (responseType === 'none') return undefined as T
  if (responseType === 'text') return await res.text() as T
  if (responseType === 'blob') return await res.blob() as T
  return res.json()
}
