import { Link } from 'react-router-dom'
import SoulReveal from './SoulReveal'

export default function SoulJourney() {
  return <article className="soul-journey">
    <SoulReveal><header className="soul-hero">
      <h1>Still becoming.</h1>
      <p className="soul-lead">From Nanjing to Paris. From economics through software to artificial intelligence. The work keeps changing the way I think.</p>
    </header></SoulReveal>
    <SoulReveal><ol className="soul-journey-steps">
      <li><h2>Economics</h2><p>Learning to ask about choices and systems.</p></li>
      <li><h2>Engineering</h2><p>Turning those questions into working software.</p></li>
      <li><h2>AI</h2><p>Building with voice, spatial intelligence, and music.</p></li>
    </ol></SoulReveal>
    <SoulReveal><div className="soul-bottom-blocks">
      <p>Reading, experimenting, and showing up again.</p>
      <p className="soul-journey-links"><Link to="/files/skill/experience">Experience &amp; education ↗</Link> <Link to="/files/contact">Contact ↗</Link> <Link to="/lab/intro">Watch the story →</Link></p>
    </div></SoulReveal>
  </article>
}
