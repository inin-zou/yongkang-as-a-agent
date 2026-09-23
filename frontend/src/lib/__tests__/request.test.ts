import { afterEach, describe, expect, it, vi } from 'vitest'
import { request, ApiError } from '../api/request'
import { generateDraft, refineDraft, setPostArchived, fetchPostStats } from '../api'

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks() })

function respond(response = new Response('{"ok":true}', { status: 200 })) {
  const fetcher = vi.fn().mockImplementation(async () => response.clone())
  vi.stubGlobal('fetch', fetcher)
  vi.spyOn(Date, 'now').mockReturnValue(12345)
  return fetcher
}

describe('request', () => {
  it.each(['GET', 'POST', 'PUT', 'DELETE'] as const)('adds one cache-buster for %s and preserves existing parameters', async method => {
    const fetcher = respond()
    await request(method, '/posts?user=a%20b')
    expect(fetcher.mock.calls[0][0]).toBe('/api/posts?user=a%20b&_t=12345')
  })

  it('sends JSON and authorization and forwards the abort signal', async () => {
    const fetcher = respond()
    const signal = new AbortController().signal
    expect(await request('POST', '/admin/posts', { token: 'secret', body: { title: 'Hello' }, signal })).toEqual({ ok: true })
    expect(fetcher).toHaveBeenCalledWith('/api/admin/posts?_t=12345', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer secret' },
      body: '{"title":"Hello"}', signal,
    })
  })

  it('keeps no-store on GET only and does not add JSON headers without a body', async () => {
    const fetcher = respond()
    await request('GET', '/posts')
    expect(fetcher.mock.calls[0][1]).toMatchObject({ cache: 'no-store' })
    expect(fetcher.mock.calls[0][1].headers).toBeUndefined()
    await request('DELETE', '/admin/posts/one', { token: '' })
    expect(fetcher.mock.calls[1][1].cache).toBeUndefined()
    expect(fetcher.mock.calls[1][1].headers).toEqual({ Authorization: 'Bearer ' })
  })

  it.each([['GET', 'API error: 404 Not Found'], ['PUT', 'API error: 404']] as const)('preserves the %s error message and exposes status', async (method, message) => {
    respond(new Response('', { status: 404, statusText: 'Not Found' }))
    await expect(request(method, '/missing')).rejects.toMatchObject({ message, status: 404 })
    await expect(request(method, '/missing')).rejects.toBeInstanceOf(ApiError)
  })

  it('leaves multipart boundaries to fetch', async () => {
    const fetcher = respond()
    const body = new FormData()
    body.append('file', new Blob(['audio']), 'song.mp3')
    await request('POST', '/upload', { body, token: 'secret' })
    expect(fetcher.mock.calls[0][1].body).toBe(body)
    expect(fetcher.mock.calls[0][1].headers).toEqual({ Authorization: 'Bearer secret' })
  })

  it('does not try to parse responses from void endpoints', async () => {
    const fetcher = respond(new Response(null, { status: 204 }))
    await expect(setPostArchived('secret', 'one', true)).resolves.toBeUndefined()
    expect(fetcher.mock.calls[0][0]).toBe('/api/admin/posts/one/archive?_t=12345')
  })

  it('can read text and blobs without JSON parsing', async () => {
    respond(new Response('plain text'))
    await expect(request<string>('GET', '/text', { responseType: 'text' })).resolves.toBe('plain text')
    respond(new Response('binary data'))
    const blob = await request<Blob>('GET', '/blob', { responseType: 'blob' })
    expect(await blob.text()).toBe('binary data')
  })

  it.each([generateDraft, refineDraft])('preserves Gemini server errors and fallback errors', async endpoint => {
    const data = { title: 'Title', category: 'technical', roughIdea: 'Idea', existingContent: 'Content' }
    respond(new Response('{"error":"Gemini quota exceeded"}', { status: 429 }))
    await expect(endpoint('secret', data)).rejects.toThrow('Gemini quota exceeded')
    respond(new Response('not JSON', { status: 502 }))
    await expect(endpoint('secret', data)).rejects.toThrow(/^API error: 502$/)
  })

  it('keeps encoded usernames and the stats URL', async () => {
    const fetcher = respond()
    await fetchPostStats('music-song', 'a b')
    expect(fetcher.mock.calls[0][0]).toBe('/api/posts/music-song/stats?user=a%20b&_t=12345')
  })
})
