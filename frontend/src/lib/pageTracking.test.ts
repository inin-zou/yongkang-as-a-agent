import { describe, expect, it } from 'vitest'
import type { PageView } from './api/traffic'
import { createPageTracker, isTrackedHost } from './pageTracking'

describe('page tracking', () => {
  it('counts only the production hosts', () => {
    expect(isTrackedHost('yongkang.dev')).toBe(true)
    expect(isTrackedHost('www.yongkang.dev')).toBe(true)
    expect(isTrackedHost('localhost')).toBe(false)
    expect(isTrackedHost('yongkang-as-a-agent-git-main.vercel.app')).toBe(false)
  })

  it('sends the source once, on the landing view, and drops repeated paths', () => {
    const sent: PageView[] = []
    const track = createPageTracker(view => sent.push(view), 'https://lnkd.in/abc')
    track({ pathname: '/files/soul', search: '?utm_source=linkedin&utm_medium=social&utm_campaign=launch' })
    track({ pathname: '/files/soul', search: '?x=1' })
    track({ pathname: '/files/memory', search: '?utm_source=other' })
    expect(sent).toEqual([
      { path: '/files/soul', landing: true, referrer: 'https://lnkd.in/abc', utmSource: 'linkedin', utmMedium: 'social', utmCampaign: 'launch' },
      { path: '/files/memory', landing: false, referrer: '', utmSource: '', utmMedium: '', utmCampaign: '' },
    ])
  })
})
