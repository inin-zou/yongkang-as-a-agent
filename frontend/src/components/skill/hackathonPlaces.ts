import type { Hackathon } from '../../types'

export interface HackathonPlace {
  id: string
  city: string
  country: string
  isRemote: boolean
  events: Hackathon[]
  wins: number
}

export function groupHackathonPlaces(hackathons: Hackathon[]): HackathonPlace[] {
  const groups = new Map<string, HackathonPlace>()
  for (const event of hackathons) {
    const isRemote = !!event.isRemote
    const city = isRemote ? 'Online' : event.city?.trim() || 'Location unlisted'
    const country = isRemote ? '' : event.country?.trim() || ''
    const id = isRemote ? 'remote' : JSON.stringify([city.toLowerCase(), country.toLowerCase()])
    const place = groups.get(id) ?? { id, city, country, isRemote, events: [], wins: 0 }
    place.events.push(event)
    if (event.result && !/finalist/i.test(event.result)) place.wins++
    groups.set(id, place)
  }
  return [...groups.values()]
    .sort((a, b) => Number(a.isRemote) - Number(b.isRemote) || a.city.localeCompare(b.city) || a.country.localeCompare(b.country))
    .map(place => ({ ...place, events: [...place.events].sort((a, b) => b.date.localeCompare(a.date)) }))
}
