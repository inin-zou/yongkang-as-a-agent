// Post tags are edited as one comma-separated field.
export function parseTags(text: string): string[] {
  return text.split(',').map(tag => tag.trim()).filter(Boolean)
}

export function formatTags(tags?: string[]): string {
  return tags?.join(', ') ?? ''
}
