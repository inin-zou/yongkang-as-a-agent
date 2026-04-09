import TurndownService from 'turndown'
import { marked } from 'marked'

const turndown = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-',
})

// Preserve iframe embeds (YouTube etc.) as raw HTML
turndown.addRule('iframe', {
  filter: 'iframe',
  replacement: (_content, node) => {
    const el = node as HTMLElement
    // Find parent wrapper div if it exists (responsive container)
    const parent = el.parentElement
    if (parent && parent.tagName === 'DIV' && parent.getAttribute('style')?.includes('padding-bottom')) {
      return '\n\n' + parent.outerHTML + '\n\n'
    }
    return '\n\n' + el.outerHTML + '\n\n'
  },
})

// Preserve video tags as raw HTML
turndown.addRule('video', {
  filter: 'video',
  replacement: (_content, node) => '\n\n' + (node as HTMLElement).outerHTML + '\n\n',
})

// Preserve img tags with style attributes as raw HTML (styled images from AI)
turndown.addRule('styledImg', {
  filter: (node) => node.nodeName === 'IMG' && !!node.getAttribute('style'),
  replacement: (_content, node) => '\n\n' + (node as HTMLElement).outerHTML + '\n\n',
})

// Skip the wrapper div around iframes (handled by iframe rule)
turndown.addRule('iframeWrapper', {
  filter: (node) =>
    node.nodeName === 'DIV' &&
    !!node.getAttribute('style')?.includes('padding-bottom') &&
    !!node.querySelector('iframe'),
  replacement: (_content, node) => '\n\n' + (node as HTMLElement).outerHTML + '\n\n',
})

export function htmlToMarkdown(html: string): string {
  return turndown.turndown(html).trim()
}

export function markdownToHtml(md: string): string {
  const raw = marked.parse(md, { async: false }) as string
  // marked wraps everything in <p>, but we want clean output
  return raw.trim()
}
