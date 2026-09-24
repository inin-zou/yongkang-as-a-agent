import { describe, expect, it } from 'vitest'
import { stripLeadingEmoji } from '../stripLeadingEmoji'

describe('stripLeadingEmoji', () => {
  it.each([
    ['🥉{Tech:Europe} Stockholm Hackathon', '{Tech:Europe} Stockholm Hackathon'],
    ['🏆 🥉  Winning entry', 'Winning entry'],
    ['❤️‍🔥  A title', 'A title'],
    ['👩🏽‍💻 Coding', 'Coding'],
    ['Plain title 🥉', 'Plain title 🥉'],
    ['2026 results', '2026 results'],
    ['', ''],
    ['🥉', ''],
  ])('formats %s as %s', (title, expected) => {
    expect(stripLeadingEmoji(title)).toBe(expected)
  })
})
