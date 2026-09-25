import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAdminEdit } from '../../../hooks/useAdminEdit'
import { fetchTraffic } from '../../../lib/api/traffic'
import { queryKeys } from '../../../lib/queryKeys'
import type { TrafficCount, TrafficReport } from '../../../types'

const number = new Intl.NumberFormat('en')
const regions = new Intl.DisplayNames(['en'], { type: 'region' })

function countryName(code: string) {
  if (!code) return 'unknown'
  try { return regions.of(code.toUpperCase()) ?? code } catch { return code }
}

function crawlerKind(name: string) {
  if (/^(gptbot|chatgpt-user|oai-searchbot|claudebot|claude-user|claude-searchbot|anthropic-ai|perplexitybot|perplexity-user|google-extended|ccbot|bytespider|meta-externalagent|meta-externalfetcher|mistralai-user|cohere-ai|youbot|diffbot|applebot-extended)$/i.test(name)) return 'AI crawler'
  if (/^(googlebot|bingbot|duckduckbot|baiduspider|yandexbot|petalbot|applebot|amazonbot)$/i.test(name)) return 'Search engine'
  if (/^(linkedinbot|twitterbot|facebookexternalhit|slackbot|discordbot|telegrambot|whatsapp)$/i.test(name)) return 'Link preview'
  return 'Other crawler'
}

function PageLink({ path }: { path: string }) {
  // Only link site-relative paths; report values come from incoming requests.
  return /^\/(?![/\\])/.test(path) && !/[\\\s]/.test(path)
    ? <Link to={path}>{path}</Link>
    : <>{path || 'unknown'}</>
}

function Breakdown({ title, rows, label = key => key || 'unknown', pages = false }: {
  title: string
  rows: TrafficCount[]
  label?: (key: string) => string
  pages?: boolean
}) {
  return (
    <section className="admin-traffic-section">
      <h2>{title}</h2>
      {rows.length === 0 ? <p className="admin-traffic-meta">No data in this range.</p> : (
        <table className="admin-traffic-table" aria-label={title}>
          <thead><tr><th scope="col">{pages ? 'Path' : 'Name'}</th><th scope="col">Visitors</th><th scope="col">Views</th></tr></thead>
          <tbody>{rows.map(row => (
            <tr key={row.key}><th scope="row">{pages ? <PageLink path={row.key} /> : label(row.key)}</th><td>{number.format(row.visitors)}</td><td>{number.format(row.views)}</td></tr>
          ))}</tbody>
        </table>
      )}
    </section>
  )
}

function DailyChart({ daily, days }: { daily: TrafficReport['daily']; days: number }) {
  // Match the API's Europe/Paris calendar, using UTC arithmetic to avoid DST gaps.
  const parts = new Intl.DateTimeFormat('en', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date())
  const part = (type: string) => parts.find(value => value.type === type)!.value
  const end = Date.parse(`${part('year')}-${part('month')}-${part('day')}T00:00:00Z`)
  const byDate = new Map(daily.map(day => [day.date, day]))
  const series = Array.from({ length: days }, (_, index) => {
    const date = new Date(end - (days - index - 1) * 86400000).toISOString().slice(0, 10)
    return byDate.get(date) ?? { date, visitors: 0, views: 0 }
  })
  const max = Math.max(1, ...series.flatMap(day => [day.views, day.visitors]))
  const x = (index: number) => 8 + index / (days - 1) * 584
  const y = (value: number) => 100 - value / max * 88
  const points = (key: 'visitors' | 'views') => series.map((day, index) => `${x(index)},${y(day[key])}`).join(' ')

  return (
    <section className="admin-traffic-section">
      <h2>Daily traffic</h2>
      <p className="admin-traffic-meta admin-traffic-legend"><span>— Visitors</span><span>┄ Views</span><span>Europe/Paris · scale 0–{number.format(max)}</span></p>
      <svg className="admin-traffic-chart" viewBox="0 0 600 112" role="img" aria-label={`Daily visitors and views over ${days} days`}>
        <line className="admin-traffic-baseline" x1="8" y1="100" x2="592" y2="100" />
        <polyline className="admin-traffic-views" points={points('views')} />
        <polyline className="admin-traffic-visitors" points={points('visitors')} />
        {series.map((day, index) => (
          <g key={day.date}>
            <title>{`${day.date}: ${day.visitors} visitors, ${day.views} views`}</title>
            <circle className="admin-traffic-views" cx={x(index)} cy={y(day.views)} r="2" />
            <circle className="admin-traffic-visitors" cx={x(index)} cy={y(day.visitors)} r="2" />
          </g>
        ))}
      </svg>
      <div className="admin-traffic-meta admin-traffic-dates"><time>{series[0].date}</time><time>{series[days - 1].date}</time></div>
    </section>
  )
}

export default function TrafficTab() {
  const [days, setDays] = useState(30)
  const { isAdmin, token } = useAdminEdit()
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: queryKeys.adminTraffic(days),
    queryFn: () => fetchTraffic(token, days),
    enabled: isAdmin && !!token,
  })

  return (
    <div className="admin-traffic">
      <div className="admin-traffic-range" role="group" aria-label="Traffic date range">
        <span className="admin-traffic-meta">Last</span>
        {[7, 30, 90].map(range => <button key={range} className="admin-btn" aria-pressed={days === range} onClick={() => setDays(range)}>{range} days</button>)}
      </div>
      {!isAdmin || !token ? <p className="admin-traffic-meta">Sign in to view traffic.</p>
        : isPending ? <p className="admin-traffic-meta" role="status">Loading traffic…</p>
        : isError ? <div role="alert"><p className="admin-error">Could not load traffic. Please try again.</p><button className="admin-btn" onClick={() => void refetch()}>Try again</button></div>
        : data && <>
          <dl className="admin-traffic-summary" aria-label="Traffic summary">
            <div><dd>{number.format(data.visitors)}</dd><dt> visitors</dt></div>
            <div><dd>{number.format(data.views)}</dd><dt> views</dt></div>
            <div><dd>{number.format(data.visits)}</dd><dt> visits</dt></div>
          </dl>
          <p className="admin-traffic-meta">Visitors are unique per day · visits are landing views · crawlers counted separately.</p>
          {data.views === 0 && !data.bots?.length && <div className="admin-traffic-empty" role="status"><h2>No traffic recorded yet</h2><p className="admin-traffic-meta">No visits or crawler requests in the last {days} days. New activity will appear here as it arrives.</p></div>}
          <DailyChart daily={data.daily ?? []} days={days} />
          <Breakdown title="Sources" rows={data.referrers ?? []} label={key => key || 'direct / unknown'} />
          {!!data.campaigns?.length && <Breakdown title="Campaigns (UTM)" rows={data.campaigns} />}
          <Breakdown title="Top pages" rows={data.pages ?? []} pages />
          <Breakdown title="Countries" rows={data.countries ?? []} label={countryName} />
          <Breakdown title="Devices" rows={data.devices ?? []} />
          <section className="admin-traffic-section">
            <h2>Crawlers</h2>
            <p className="admin-traffic-meta">Crawler counts are a lower bound: CDN cache hits aren't seen.</p>
            {!data.bots?.length ? <p className="admin-traffic-meta">No crawler requests in this range.</p> : data.bots.map(bot => {
              const kind = crawlerKind(bot.key)
              const pages = (data.botPages ?? []).filter(page => page.bot === bot.key)
              return <div className="admin-traffic-bot" key={bot.key} role="group" aria-label={bot.key}>
                <div className="admin-traffic-bot-heading"><h3>{bot.key}</h3><span className={`admin-traffic-meta${kind === 'AI crawler' ? ' admin-traffic-ai' : ''}`}>{kind}</span><span className="admin-traffic-meta">{number.format(bot.views)} views</span></div>
                {pages.length > 0 ? <table className="admin-traffic-table" aria-label={`${bot.key} pages`}>
                  <thead><tr><th scope="col">Path</th><th scope="col">Views</th></tr></thead>
                  <tbody>{pages.map(page => <tr key={page.key}><th scope="row"><PageLink path={page.key} /></th><td>{number.format(page.views)}</td></tr>)}</tbody>
                </table> : <p className="admin-traffic-meta">No page breakdown available.</p>}
              </div>
            })}
          </section>
        </>}
    </div>
  )
}
