import type { PageView } from './api/traffic'

/** Only the production site counts; localhost and preview deployments don't. */
export function isTrackedHost(hostname: string): boolean {
  return hostname === 'yongkang.dev' || hostname === 'www.yongkang.dev'
}

type Location = { pathname: string; search: string }

/**
 * Turns router locations into page views. The first view of a page load is the
 * landing view and carries the referrer and UTM tags; later SPA navigations
 * carry neither, and repeats of the same path (hash or query changes) are dropped.
 */
export function createPageTracker(send: (view: PageView) => void, referrer: string) {
  let lastPath = ''
  let landed = false
  return (location: Location) => {
    if (location.pathname === lastPath) return
    lastPath = location.pathname
    const landing = !landed
    landed = true
    const params = new URLSearchParams(landing ? location.search : '')
    send({
      path: location.pathname,
      landing,
      referrer: landing ? referrer : '',
      utmSource: params.get('utm_source') ?? '',
      utmMedium: params.get('utm_medium') ?? '',
      utmCampaign: params.get('utm_campaign') ?? '',
    })
  }
}
