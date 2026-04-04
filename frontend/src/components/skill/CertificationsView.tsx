import '../../styles/skill.css'

export default function CertificationsView() {
  return (
    <div className="editor-page">
      <div className="editor-meta">Credentials + academic background</div>
      <h1 className="editor-title">Certifications</h1>
      <div className="editor-content">
        <p className="editor-label">Education</p>

        <div className="cert-entry">
          <div className="cert-degree">M.S. Artificial Intelligence</div>
          <div className="cert-institution">Université Paris Dauphine-PSL</div>
          <div className="cert-year">2024 — 2025</div>
        </div>

        <div className="cert-entry">
          <div className="cert-degree">M.S. Applied Mathematics</div>
          <div className="cert-institution">Université Paris-Saclay</div>
          <div className="cert-year">2023 — 2024</div>
        </div>

        <div className="cert-entry">
          <div className="cert-degree">B.S. Applied Mathematics</div>
          <div className="cert-institution">Université Toulouse III - Paul Sabatier</div>
          <div className="cert-year">2020 — 2023</div>
        </div>

        <div className="editor-divider" />

        <p className="editor-label">Certifications</p>

        <div className="cert-entry">
          <div className="cert-degree">Machine Learning in Production (MLOps)</div>
          <div className="cert-institution">DeepLearning.AI / Coursera</div>
          <div className="cert-year">2024</div>
        </div>

        <div className="cert-entry">
          <div className="cert-degree">AI Agents</div>
          <div className="cert-institution">HuggingFace</div>
          <div className="cert-year">2025</div>
        </div>

        <div className="editor-divider" />

        <p className="editor-label">Awards</p>

        <div className="cert-entry">
          <div className="cert-degree">Chemistry Olympiad — Provincial 2nd Prize</div>
          <div className="cert-institution">National Competition</div>
          <div className="cert-year">2017</div>
        </div>
      </div>
    </div>
  )
}
