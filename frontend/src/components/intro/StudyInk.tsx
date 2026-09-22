// All readable content and chart/diagram marks are SVG, registered to blank bitmaps.
const frontier = 'M 20 20 C 125 30 225 122 265 285'

function BodyLines({ x, y, width, count }: { x: number; y: number; width: number; count: number }) {
  return <g opacity=".25">{Array.from({ length: count }, (_, i) =>
    <path key={i} d={`M ${x} ${y + i * 8} h ${width - (i % 4 === 3 ? 28 : 0)}`} />,
  )}</g>
}

export function EconomicsInk() {
  return <g className="intro-ink">
    <g transform="translate(444 180) rotate(-3)">
      <text className="intro-book-title" x="0" y="0" fontSize="25">Consumer Choice</text>
      <BodyLines x={0} y={26} width={250} count={8} />
      <g transform="translate(52 130)">
        <path d="M 0 0 V 208 H 244 m -8 -4 l 8 4 -8 4 M -4 8 L 0 0 4 8" />
        {[0, 1, 2].map(i => <path key={i} d={`M ${15 + i * 21} 18 C ${24 + i * 19} ${120 - i * 12} ${92 + i * 20} ${182 - i * 18} 220 ${183 - i * 24}`} />)}
        <text transform="translate(-18 72) rotate(-90)" fontSize="16">Utility</text>
        <text x="105" y="236" fontSize="16">Consumption</text>
      </g>
      <BodyLines x={8} y={405} width={255} count={8} />
    </g>
    <BodyLines x={798} y={102} width={315} count={3} />
    <g transform="translate(890 182) rotate(5)">
      <text className="intro-handwriting" x="8" y="28" fontSize="38">Pareto</text>
      <path d="M 8 38 Q 57 41 115 37" />
      <g transform="translate(15 115)">
        <path d="M 0 0 V 310 H 300 m -8 -4 l 8 4 -8 4 M -4 8 L 0 0 4 8" />
        <path d={frontier} />
        <path className="intro-pareto-trace" d={frontier} pathLength="1" />
        {[[44, 78], [83, 153], [118, 72], [150, 195], [227, 243], [221, 164], [172, 158]].map(([cx, cy]) => <circle key={cx} cx={cx} cy={cy} r="3.5" />)}
        <circle cx="191.72" cy="124.184" r="7" fill="#2348c4" />
        <text transform="translate(-15 140) rotate(-90)" className="intro-book-title" fontSize="20">Return</text>
        <text x="136" y="339" className="intro-book-title" fontSize="20">Risk</text>
        <text className="intro-handwriting intro-blue-ink" x="170" y="39" fontSize="25"><tspan x="170">Efficient</tspan><tspan x="170" dy="26"> Frontier</tspan></text>
        <path className="intro-blue-ink" d="M 197 73 Q 170 84 174 108 m -7 -5 l 7 5 5 -8" />
      </g>
    </g>
  </g>
}

function Block({ x, y, label }: { x: number; y: number; label: string }) {
  const lines = label === 'Masked Multi-Head Attention' ? ['Masked Multi-Head', 'Attention'] : [label]
  return <g data-diagram-box={label}>
    <rect className="intro-transformer-stroke" pathLength="1" x={x} y={y} width="224" height="42" rx="2" />
    {lines.map((line, i) => <text key={line} x={x + 112} y={y + (lines.length === 1 ? 27 : 17 + i * 17)} textAnchor="middle" fontFamily="monospace" fontSize="14">{line}</text>)}
  </g>
}

export function TransformerInk() {
  const encoder = ['Add & Norm', 'Feed Forward', 'Add & Norm', 'Multi-Head Attention']
  const decoder = ['Add & Norm', 'Feed Forward', 'Add & Norm', 'Multi-Head Attention', 'Add & Norm', 'Masked Multi-Head Attention']
  return <g className="intro-ink" transform="translate(442 204) rotate(-5)">
    <text className="intro-book-title" x="340" y="0" textAnchor="middle" fontSize="33">Attention Is All You Need</text>
    <path d="M 80 17 H 620" />
    <text className="intro-book-title" x="340" y="45" textAnchor="middle" fontSize="20">Vaswani et al. (2017)</text>
    <g transform="translate(80 88)">
      <text x="112" y="0" textAnchor="middle" fontSize="20">Encoder</text>
      <text x="442" y="0" textAnchor="middle" fontSize="20">Decoder</text>
      {encoder.map((label, i) => <Block key={i} x={0} y={128 + i * 55} label={label} />)}
      {decoder.map((label, i) => <Block key={i} x={330} y={18 + i * 55} label={label} />)}
      {[0, 1, 2].map(i => <path key={i} className="intro-transformer-stroke" pathLength="1" d={`M 112 ${183 + i * 55} v -13 m -4 5 l 4 -5 4 5`} />)}
      {[0, 1, 2, 3, 4].map(i => <path key={i} className="intro-transformer-stroke" pathLength="1" d={`M 442 ${73 + i * 55} v -13 m -4 5 l 4 -5 4 5`} />)}
      <path className="intro-transformer-stroke" pathLength="1" d="M 112 128 V 93 H 272 V 204 H 330 m -6 -4 l 6 4 -6 4" />
      <path className="intro-transformer-stroke" pathLength="1" d="M 112 365 V 335 m -4 5 l 4 -5 4 5 M 442 365 V 335 m -4 5 l 4 -5 4 5" />
      <text x="112" y="389" textAnchor="middle" fontSize="18">Inputs</text>
      <text x="442" y="389" textAnchor="middle" fontSize="18">Outputs (shifted right)</text>
    </g>
  </g>
}

export function DeskInk({ ai }: { ai: boolean }) {
  const notes = ai ? ['- scale', '- operationalize', '- alignment', '- real-world impact'] : ['- trade-off', '- opportunity cost', '- incentives', '- equilibrium']
  return <g className="intro-ink">
    {ai ? <>
      <g transform="translate(57 65) rotate(-13)" fill="#fff9ed">
        <text className="intro-book-title" x="0" y="0" fontSize="25"><tspan x="0">Designing</tspan><tspan x="0" dy="29"> Data-Intensive</tspan><tspan x="0" dy="29"> Applications</tspan></text>
        <text x="0" y="97" fontSize="18">Kleppmann</text>
      </g>
      <g transform="translate(70 253) rotate(-13)">
        <text className="intro-book-title" x="0" y="0" fontSize="26">Clean Code</text>
        <text transform="translate(-34 14) rotate(-90)" fontSize="13">Martin</text>
      </g>
      <g transform="translate(1415 235) rotate(10)">
        <text className="intro-handwriting" x="27" y="13" fontSize="25">Pareto</text>
        <path d="M 10 31 V 109 H 112 M 17 37 Q 81 40 103 103" />
        {[[29, 47], [58, 69], [88, 78], [42, 90]].map(([cx, cy]) => <circle key={cx} cx={cx} cy={cy} r="2" />)}
      </g>
    </> : <g transform="translate(52 79) rotate(-12)" fill="#fff9ed">
      <text className="intro-book-title" x="0" y="0" fontSize="25"><tspan x="0">Principles of</tspan><tspan x="0" dy="31"> Economics</tspan></text>
      <text x="0" y="76" fontSize="19">N. Gregory Mankiw</text>
    </g>}
    <g transform={`translate(${ai ? 1446 : 1350} 443) rotate(4)`} className="intro-handwriting">
      {notes.map((note, i) => <text key={note} x="0" y={i * 34} fontSize={ai ? 18 : 22} textLength={ai ? Math.min(note.length * 8, 139) : undefined} lengthAdjust="spacingAndGlyphs">{note}</text>)}
    </g>
  </g>
}

export function ContinueInk() {
  return <g className="intro-ink">
    <g className="intro-books07">
      <g transform="matrix(1 .065 0 1 94 453)">
        <text fontSize="25" fontWeight="600" x="0" y="0">Designing Machine Learning Systems</text>
        <text fontSize="18" x="611" y="0">Huyen</text>
      </g>
      <g transform="matrix(1 .02 0 1 173 571)">
        <text fontSize="43" fontWeight="600" x="0" y="0">Clean Code</text>
      </g>
      <text transform="translate(102 599) rotate(-90)" fontSize="19">Martin</text>
      <g transform="matrix(1 -.067 0 1 155 684)" fill="#fff9ed">
        <text className="intro-book-title" fontSize="29" x="0" y="0"><tspan x="0">Designing Data-Intensive</tspan><tspan x="0" dy="34"> Applications</tspan></text>
        <text fontSize="18" x="498" y="32">Kleppmann</text>
      </g>
    </g>
    <g transform="translate(1393 104) skewY(-6)">
      <text x="0" y="0" fontSize="27"><tspan x="0">Ideas</tspan><tspan x="0" dy="37"> Build</tspan><tspan x="0" dy="37"> A Kinder</tspan><tspan x="0" dy="37"> Tomorrow</tspan></text>
      <path d="M 0 134 H 151" />
    </g>
    <g transform="matrix(1 .035 -.85 .62 1017 771)" className="intro-handwriting">
      {['Learn', 'Build', 'Write', 'Repeat'].map((line, i) => <text key={line} x="0" y={i * 34} fontSize="34">{line}</text>)}
      <path d="M -4 113 Q 45 119 103 113" />
    </g>
    <text className="intro-continue-text" x="1080" y="233" fontSize="23" fill="#242421">i keep showing up.</text>
  </g>
}
