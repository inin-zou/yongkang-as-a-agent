// music_tracks.original holds the original artist of a cover. Empty (or the
// legacy "true") marks the owner's own song; legacy "false" a cover with no artist.
function originalArtist(original?: string): string | null {
  const value = original?.trim() ?? ''
  if (!value || value === 'true') return null
  return value === 'false' ? '' : value
}

/** Track page: "Cover · original by keshi" or "Original song". */
export function trackCredit(original?: string): string {
  const artist = originalArtist(original)
  if (artist === null) return 'Original song'
  return artist ? `Cover · original by ${artist}` : 'Cover'
}

/** Track list suffix: "cover of keshi", or null for an original song. */
export function trackListCredit(original?: string): string | null {
  const artist = originalArtist(original)
  if (artist === null) return null
  return artist ? `cover of ${artist}` : 'cover'
}
