// Presentation only: stored titles and other surfaces retain their emoji.
export function stripLeadingEmoji(title: string): string {
  return title.replace(/^(?:\p{Extended_Pictographic}[\p{Extended_Pictographic}\p{Emoji_Modifier}\uFE0E\uFE0F\u200D]*\s*)+/u, '')
}
