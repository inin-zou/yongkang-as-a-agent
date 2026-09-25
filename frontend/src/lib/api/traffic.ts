import type { TrafficReport } from '../../types/index'
import { request } from './request'

export type PageView = {
  path: string
  landing: boolean
  referrer: string
  utmSource: string
  utmMedium: string
  utmCampaign: string
}

export function trackPageView(view: PageView): Promise<void> {
  return request<void>('POST', '/track', { body: view, responseType: 'none' })
}

export function fetchTraffic(token: string, days: number): Promise<TrafficReport> {
  return request<TrafficReport>('GET', `/admin/traffic?days=${days}`, { token })
}
