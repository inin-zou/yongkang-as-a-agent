import type { Hackathon } from '../../../types'

export const clusterEvents: Hackathon[] = [
  ['Paris', 'France', 48.8566, 2.3522],
  ['Versailles', 'France', 48.8014, 2.1301],
  ['Berlin', 'Germany', 52.52, 13.405],
  ['Stockholm', 'Sweden', 59.3293, 18.0686],
  ['Helsinki', 'Finland', 60.1699, 24.9384],
  ['Shanghai', 'China', 31.2304, 121.4737],
  ['Beijing', 'China', 39.90, 116.40],
  ['Hangzhou', 'China', 30.27, 120.15],
].map(([city, country, lat, lng]) => ({
  city: String(city), country: String(country), coordinates: [Number(lat), Number(lng)],
  name: `${city} event`, date: '2026.01', projectName: 'Project', domain: 'AI',
}))
