import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'

type Lang = 'en' | 'zh'
type SourceFile = 'tex' | 'cls'

// Published by `make cv` (cv/build.sh) into frontend/public/cv/.
const pdfPath = (lang: Lang) => `/cv/yongkang-zou-cv-${lang}.pdf`
const sourcePath = (lang: Lang, file: SourceFile) => `/cv/resume-${lang}.${file}`

// The dev server and the SPA rewrite answer missing files with index.html,
// so a 200 alone does not mean the file exists.
async function fetchPublished(path: string): Promise<Response | null> {
  try {
    const res = await fetch(`${path}?_t=${Date.now()}`)
    if (!res.ok || (res.headers.get('content-type') ?? '').includes('text/html')) return null
    return res
  } catch {
    return null
  }
}

export default function CvView() {
  const [lang, setLang] = useState<Lang>('en')
  const [showSource, setShowSource] = useState(false)
  const [sourceFile, setSourceFile] = useState<SourceFile>('tex')

  const pdf = useQuery({
    queryKey: ['cv-pdf', lang],
    queryFn: async () => (await fetchPublished(pdfPath(lang))) !== null,
  })
  const sourceQuery = useQuery({
    queryKey: ['cv-source', lang, sourceFile],
    queryFn: async () => { const res = await fetchPublished(sourcePath(lang, sourceFile)); return res ? res.text() : '' },
    enabled: showSource,
  })
  const available = pdf.isPending ? null : pdf.data === true
  const source = sourceQuery.isPending ? null : (sourceQuery.data ?? '')

  return (
    <div className="editor-page cv-page">
      <h1>CV</h1>

      <div className="cv-toolbar soul-mono">
        <span role="group" aria-label="Language">
          <button type="button" aria-pressed={lang === 'en'} onClick={() => setLang('en')}>EN</button>
          <span aria-hidden="true"> / </span>
          <button type="button" aria-pressed={lang === 'zh'} onClick={() => setLang('zh')}>中文</button>
        </span>
        {available && <a href={pdfPath(lang)} download>Download PDF ↓</a>}
        {available && <button type="button" aria-expanded={showSource} onClick={() => setShowSource(!showSource)}>
          {showSource ? 'View PDF' : 'View source (.tex)'}
        </button>}
      </div>

      {available === null && <p className="soul-mono" role="status">Loading…</p>}
      {available === false && <p role="status">This version of the CV has not been published yet.</p>}

      {available && !showSource && (
        <div className="cv-frame">
          <iframe src={`${pdfPath(lang)}#view=FitH`} title={`CV (${lang === 'en' ? 'English' : '中文'})`} />
          <p className="cv-fallback soul-mono">PDF not showing? <a href={pdfPath(lang)} target="_blank" rel="noreferrer">Open it in a new tab ↗</a></p>
        </div>
      )}

      {available && showSource && (
        <div className="cv-source">
          <div className="cv-source-tabs soul-mono" role="group" aria-label="Source file">
            <button type="button" aria-pressed={sourceFile === 'tex'} onClick={() => setSourceFile('tex')}>resume.tex</button>
            <button type="button" aria-pressed={sourceFile === 'cls'} onClick={() => setSourceFile('cls')}>resume.cls</button>
          </div>
          {source === null
            ? <p className="soul-mono" role="status">Loading…</p>
            : <pre><code>{source || `resume.${sourceFile} is not published.`}</code></pre>}
        </div>
      )}
    </div>
  )
}
