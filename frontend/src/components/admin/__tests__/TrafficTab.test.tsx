import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import TrafficTab from '../tabs/TrafficTab'
import { fetchTraffic } from '../../../lib/api/traffic'
import type { TrafficReport } from '../../../types'

vi.mock('../../../lib/api/traffic', () => ({ fetchTraffic: vi.fn() }))
const auth = vi.hoisted(() => ({ isAdmin: true, token: 'test-token' }))
vi.mock('../../../hooks/useAdminEdit', () => ({ useAdminEdit: () => auth }))

const empty: TrafficReport = { days: 30, visitors: 0, views: 0, visits: 0, daily: [], referrers: [], campaigns: [], pages: [], countries: [], devices: [], bots: [], botPages: [] }
const report: TrafficReport = {
  ...empty, visitors: 12, views: 40, visits: 18,
  daily: [{ date: '2026-09-24', visitors: 4, views: 10 }, { date: '2026-09-26', visitors: 5, views: 15 }],
  referrers: [{ key: '', visitors: 8, views: 10 }],
  campaigns: [{ key: 'newsletter / email / launch', visitors: 4, views: 8 }],
  pages: [{ key: '/files/soul', visitors: 12, views: 40 }],
  countries: [{ key: 'FR', visitors: 8, views: 20 }, { key: 'US', visitors: 3, views: 15 }, { key: '', visitors: 1, views: 5 }],
  devices: [{ key: 'desktop', visitors: 12, views: 40 }],
  bots: [{ key: 'GPTBot', visitors: 0, views: 9 }, { key: 'Googlebot', visitors: 0, views: 6 }, { key: 'Slackbot', visitors: 0, views: 2 }],
  botPages: [{ bot: 'GPTBot', key: '/ai-page', visitors: 0, views: 9 }, { bot: 'Googlebot', key: '/search-page', visitors: 0, views: 6 }],
}
let client: QueryClient
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  // Paris is already on September 26; the API buckets by Paris calendar days.
  vi.setSystemTime(new Date('2026-09-25T23:30:00Z'))
  auth.token = 'test-token'
  vi.mocked(fetchTraffic).mockReset().mockResolvedValue(report)
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
})
afterEach(() => { cleanup(); client.clear(); vi.useRealTimers() })
function mount() {
  return render(<QueryClientProvider client={client}><MemoryRouter><TrafficTab /></MemoryRouter></QueryClientProvider>)
}

describe('TrafficTab', () => {
  it('renders report totals, readable breakdowns, links and grouped crawler categories', async () => {
    mount()
    expect(await screen.findByLabelText('Traffic summary')).toHaveTextContent('12 visitors40 views18 visits')
    expect(screen.getByText('direct / unknown')).toBeInTheDocument()
    const countries = screen.getByRole('table', { name: 'Countries' })
    for (const name of ['France', 'United States', 'unknown']) expect(within(countries).getByText(name)).toBeInTheDocument()
    expect(screen.getByText('newsletter / email / launch')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '/files/soul' })).toHaveAttribute('href', '/files/soul')
    const ai = screen.getByRole('group', { name: 'GPTBot' })
    expect(within(ai).getByText('AI crawler')).toBeInTheDocument()
    expect(within(ai).getByRole('link', { name: '/ai-page' })).toBeInTheDocument()
    expect(within(ai).queryByText('/search-page')).not.toBeInTheDocument()
    expect(screen.getByText('Search engine')).toBeInTheDocument()
    expect(screen.getByText('Link preview')).toBeInTheDocument()
    expect(screen.getByText(/lower bound.*CDN/)).toBeInTheDocument()
  })

  it('fills the whole Paris date range with zeroes between and around recorded days', async () => {
    mount()
    const chart = await screen.findByRole('img', { name: /Daily visitors and views/ })
    expect(chart.querySelectorAll('circle')).toHaveLength(60)
    expect(within(chart).getByText('2026-08-28: 0 visitors, 0 views')).toBeInTheDocument()
    expect(within(chart).getByText('2026-09-25: 0 visitors, 0 views')).toBeInTheDocument()
    expect(within(chart).getByText('2026-09-26: 5 visitors, 15 views')).toBeInTheDocument()
  })

  it('fetches 30 days by default and switches to 7, 90 and back to 30', async () => {
    mount()
    await screen.findByLabelText('Traffic summary')
    expect(fetchTraffic).toHaveBeenCalledWith('test-token', 30)
    for (const days of [7, 90, 30]) {
      fireEvent.click(screen.getByRole('button', { name: `${days} days` }))
      await waitFor(() => expect(fetchTraffic).toHaveBeenLastCalledWith('test-token', days))
      expect(screen.getByRole('button', { name: `${days} days` })).toHaveAttribute('aria-pressed', 'true')
    }
  })

  it('shows an intentional zero state and hides empty campaigns', async () => {
    vi.mocked(fetchTraffic).mockResolvedValue(empty)
    mount()
    expect(await screen.findByText(/No traffic recorded/)).toBeInTheDocument()
    expect(screen.getByLabelText('Traffic summary')).toHaveTextContent('0 visitors0 views0 visits')
    expect(screen.getByRole('img', { name: /Daily visitors and views/ })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /Campaigns/ })).not.toBeInTheDocument()
  })

  it('keeps crawler-only traffic visible', async () => {
    vi.mocked(fetchTraffic).mockResolvedValue({ ...empty, bots: report.bots, botPages: report.botPages })
    mount()
    expect(await screen.findByRole('group', { name: 'GPTBot' })).toBeInTheDocument()
    expect(screen.queryByText(/No traffic recorded/)).not.toBeInTheDocument()
  })

  it('shows loading and lets an error be retried', async () => {
    vi.mocked(fetchTraffic).mockRejectedValueOnce(new Error('Unavailable'))
    mount()
    expect(screen.getByRole('status')).toHaveTextContent(/Loading/)
    expect(await screen.findByRole('alert')).toHaveTextContent(/Could not load traffic/)
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByLabelText('Traffic summary')).toHaveTextContent('12 visitors')
  })

  it('does not request traffic without a token', () => {
    auth.token = ''
    mount()
    expect(fetchTraffic).not.toHaveBeenCalled()
  })
})
