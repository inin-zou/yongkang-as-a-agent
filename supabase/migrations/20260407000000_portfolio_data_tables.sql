-- =============================================================================
-- 001_portfolio_tables.sql
-- Portfolio data tables: skills, hackathons, experience
-- =============================================================================

-- ---------------------------------------------------------------------------
-- TABLE: skills
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS skills (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug         text        UNIQUE NOT NULL,
  title        text        NOT NULL,
  skills       jsonb       NOT NULL,
  battle_tested jsonb      NOT NULL,
  sort_order   int         NOT NULL DEFAULT 0,
  created_at   timestamptz DEFAULT now()
);

ALTER TABLE skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_skills" ON skills
  FOR SELECT USING (true);

CREATE POLICY "authenticated_insert_skills" ON skills
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "authenticated_update_skills" ON skills
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "authenticated_delete_skills" ON skills
  FOR DELETE USING (auth.role() = 'authenticated');

-- ---------------------------------------------------------------------------
-- TABLE: hackathons
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS hackathons (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  date         text        NOT NULL,
  name         text        NOT NULL,
  city         text,
  country      text,
  lat          float8,
  lng          float8,
  is_remote    bool        NOT NULL DEFAULT false,
  project_name text        NOT NULL,
  project_slug text,
  project_url  text,
  result       text,
  solo         bool        NOT NULL DEFAULT false,
  domain       text        NOT NULL,
  created_at   timestamptz DEFAULT now()
);

ALTER TABLE hackathons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_hackathons" ON hackathons
  FOR SELECT USING (true);

CREATE POLICY "authenticated_insert_hackathons" ON hackathons
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "authenticated_update_hackathons" ON hackathons
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "authenticated_delete_hackathons" ON hackathons
  FOR DELETE USING (auth.role() = 'authenticated');

-- ---------------------------------------------------------------------------
-- TABLE: experience
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS experience (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  role            text        NOT NULL,
  company         text        NOT NULL,
  location        text        NOT NULL,
  start_date      text        NOT NULL,
  end_date        text,
  skill_assembled text        NOT NULL,
  highlights      jsonb       NOT NULL,
  note            text,
  sort_order      int         NOT NULL DEFAULT 0,
  created_at      timestamptz DEFAULT now()
);

ALTER TABLE experience ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_experience" ON experience
  FOR SELECT USING (true);

CREATE POLICY "authenticated_insert_experience" ON experience
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "authenticated_update_experience" ON experience
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "authenticated_delete_experience" ON experience
  FOR DELETE USING (auth.role() = 'authenticated');

-- =============================================================================
-- SEED DATA
-- =============================================================================

-- ---------------------------------------------------------------------------
-- skills seed (11 domains, sort_order 0–10)
-- ---------------------------------------------------------------------------
INSERT INTO skills (slug, title, skills, battle_tested, sort_order) VALUES
(
  'yongkang:model-finetune',
  'Model Fine-Tuning',
  '["LoRA","QLoRA","DPO","SFT","RAFT","PEFT","Weights & Biases"]',
  '["Ethos Studio (Voxtral LoRA)","Societe Generale"]',
  0
),
(
  'yongkang:agent-orchestration',
  'Agent Orchestration',
  '["LangChain","LangGraph","LlamaIndex","AutoGen","Dify","n8n","MCP Protocol"]',
  '["BuzzLab","OnTrack","Le Scribe Royal","Deep Search API","Musixtral"]',
  1
),
(
  'yongkang:ai-integration',
  'AI Integration',
  '["OpenAI","Anthropic Claude","Google Gemini","Mistral","ElevenLabs","HuggingFace","vLLM","Groq"]',
  '["Dianoia","SherlockOS","VideoStack","Deep Search API"]',
  2
),
(
  'yongkang:data-viz',
  'Data & Visualization',
  '["Tableau","Power BI","Matplotlib","Seaborn","Streamlit","Hadoop","Kafka","Spark","Airflow"]',
  '["CITIC Securities","Smart Gadget Home","HealthOdyssey"]',
  3
),
(
  'yongkang:ml-training',
  'ML Training',
  '["PyTorch","TensorFlow","scikit-learn","ONNX","Modal GPU","Transformers","Diffusion Models"]',
  '["ZenQ","EmoHunter","Genome Classification","Ethos Studio"]',
  4
),
(
  'yongkang:database-storage',
  'Database & Storage',
  '["Supabase","PostgreSQL","MongoDB","Qdrant","Weaviate","ElasticSearch","Redis","SQLite"]',
  '["Societe Generale","Wiggly","GitBeat","Dianoia","SherlockOS"]',
  5
),
(
  'yongkang:cloud-deploy',
  'Cloud & Deploy',
  '["AWS (EC2, S3, Lambda)","GCP (Vertex AI, Cloud Run)","Modal","Vercel","Fly.io","Replicate"]',
  '["OnTrack","Societe Generale","Rewind","EmoHunter"]',
  6
),
(
  'yongkang:devops',
  'DevOps',
  '["Docker","Kubernetes","GitHub Actions","CI/CD"]',
  '["Misogi Labs","Mozart AI","Musixtral"]',
  7
),
(
  'yongkang:backend',
  'Backend',
  '["Python","Go","TypeScript","Node.js","FastAPI","Chi Router","Express"]',
  '["CITIC Securities","Societe Generale","Misogi Labs","Mozart AI","Epiminds","Dianoia"]',
  8
),
(
  'yongkang:frontend',
  'Frontend',
  '["React","Next.js","Vue.js","Three.js","TailwindCSS","Framer Motion","GSAP"]',
  '["Wiggly","GitBeat","BuzzLab","YourPath","Portfolio"]',
  9
),
(
  'yongkang:product-design',
  'Product Design',
  '["Figma","UI/UX Design","Prototyping","Design Systems","User Research"]',
  '["Dianoia","EmoHunter","BuzzLab","Portfolio"]',
  10
);

-- ---------------------------------------------------------------------------
-- hackathons seed (24 entries)
-- ---------------------------------------------------------------------------
INSERT INTO hackathons (date, name, city, country, lat, lng, is_remote, project_name, project_slug, project_url, result, solo, domain) VALUES
(
  '2026.03', 'TechEurope Stockholm',
  'Stockholm', 'Sweden', 59.33, 18.07,
  false,
  'Dianoia', 'dianoia', 'https://github.com/inin-zou/Dianoia',
  '3rd place (solo)', true,
  'Spatial Intelligence'
),
(
  '2026.03', 'Mistral Online',
  NULL, NULL, NULL, NULL,
  true,
  'Ethos Studio', NULL, 'https://github.com/aytoast/ser',
  NULL, false,
  'Emotion & Vision AI'
),
(
  '2026.02', 'HackEurope',
  'Paris', 'France', 48.86, 2.35,
  false,
  'YourPath', NULL, 'https://github.com/CodyAdam/your-path',
  NULL, false,
  'Creative AI'
),
(
  '2026.02', 'Gemini Hackathon',
  'Paris', 'France', 48.86, 2.35,
  false,
  'SherlockOS', NULL, 'https://github.com/inin-zou/SherlockOS',
  NULL, false,
  'Spatial Intelligence'
),
(
  '2026.02', 'TechEurope Paris',
  'Paris', 'France', 48.86, 2.35,
  false,
  'Rewind', NULL, 'https://github.com/inin-zou/Rewind',
  NULL, false,
  'Spatial Intelligence'
),
(
  '2025.12', 'Project ElevenLabs',
  'Paris', 'France', 48.86, 2.35,
  false,
  'VideoStack', NULL, 'https://github.com/VideoStack-PE/videostack-elevenlabs',
  '87K EUR early interest funding', false,
  'Creative AI'
),
(
  '2025.11', 'Junction',
  'Helsinki', 'Finland', 60.17, 24.94,
  false,
  'Lumina', NULL, 'https://github.com/cesp99/lumina-frontend',
  NULL, false,
  'Healthcare & Biotech'
),
(
  '2025.10', 'Entrepreneurs First',
  'Paris', 'France', 48.86, 2.35,
  false,
  'Deep Search API', NULL, 'https://github.com/Rodrigotari1/deep_research_ef',
  '1st place', false,
  'LLM Infrastructure'
),
(
  '2025.10', 'Big Berlin',
  'Berlin', 'Germany', 52.52, 13.41,
  false,
  'Wiggly', NULL, 'https://github.com/Konsequanzheng/wiggle',
  NULL, false,
  'Creative AI'
),
(
  '2025.09', 'Datacraft',
  'Versailles', 'France', 48.80, 2.12,
  false,
  'Le Scribe Royal', NULL, 'https://github.com/dorianlagadec/hackathoh-versailles',
  '3rd place', false,
  'LLM Infrastructure'
),
(
  '2025.09', 'Tech Europe Paris',
  'Paris', 'France', 48.86, 2.35,
  false,
  'GitBeat', NULL, 'https://github.com/imbjdd/gitbeat',
  'Community Win', false,
  'Music & Audio AI'
),
(
  '2025.09', 'Mistral AI MCP',
  NULL, NULL, NULL, NULL,
  true,
  'Musixtral', NULL, 'https://github.com/inin-zou/Musixtral',
  NULL, false,
  'Music & Audio AI'
),
(
  '2025.09', 'ShipItSunday',
  'Shanghai', 'China', 31.23, 121.47,
  false,
  'I Swear', NULL, 'https://github.com/inin-zou/damn-it',
  NULL, false,
  'Creative AI'
),
(
  '2025.08', 'Hack Nation MIT',
  NULL, NULL, NULL, NULL,
  true,
  'BuzzLab', NULL, 'https://github.com/inin-zou/BuzzLab',
  'Finalist (VC phase)', false,
  'Creative AI'
),
(
  '2025.08', 'Pond Speedrun',
  NULL, NULL, NULL, NULL,
  true,
  'EmoHunter', NULL, 'https://github.com/inin-zou/EmoHunter-Pond_Hackathon',
  '1st place ($50K funding)', false,
  'Emotion & Vision AI'
),
(
  '2025.07', 'AMD Hackathon',
  NULL, NULL, NULL, NULL,
  true,
  'vLLM speculative prefill', NULL, NULL,
  'Finalist', false,
  'LLM Infrastructure'
),
(
  '2025.06', 'RAISE Summit',
  'Paris', 'France', 48.86, 2.35,
  false,
  'ServeTheVibe', NULL, 'https://github.com/inin-zou/ServeTheVibe',
  '3rd place (solo)', true,
  'Music & Audio AI'
),
(
  '2025.06', 'Dify Paris',
  'Paris', 'France', 48.86, 2.35,
  false,
  'Dify AI Agent', NULL, NULL,
  '1st place (solo)', true,
  'LLM Infrastructure'
),
(
  '2025.05', 'Phagos',
  'Paris', 'France', 48.86, 2.35,
  false,
  'Genome Classification', NULL, 'https://github.com/inin-zou/Genome-Embedding-Classification',
  NULL, false,
  'Healthcare & Biotech'
),
(
  '2025.04', 'From RAG to Agentic AI',
  'Paris', 'France', 48.86, 2.35,
  false,
  'OnTrack', NULL, 'https://github.com/briacSck/ON-TRACKS-AI-Agents-Hackathon-',
  '2nd place', false,
  'LLM Infrastructure'
),
(
  '2025.02', 'GeoAI Hack',
  NULL, NULL, NULL, NULL,
  true,
  'InstaGeo', NULL, 'https://github.com/inin-zou/InstaGeo-E2E-Geospatial-ML',
  NULL, false,
  'Geospatial ML'
),
(
  '2025.02', 'Doctolib',
  'Paris', 'France', 48.86, 2.35,
  false,
  'HealthOdyssey', NULL, 'https://github.com/inin-zou/HealthOdyssey',
  NULL, false,
  'Healthcare & Biotech'
),
(
  '2024.11', 'Quantum Challenge',
  'Paris', 'France', 48.86, 2.35,
  false,
  'ZenQ', NULL, 'https://github.com/inin-zou/ZenQuantum',
  'Finalist (2nd phase)', false,
  'Quantum Computing'
),
(
  '2024.11', 'SpotOn Edge Device',
  'Paris', 'France', 48.86, 2.35,
  false,
  'Recipe Recommendation', NULL, 'https://github.com/Lucine1998/Recipe-Recommandation',
  NULL, false,
  'Creative AI'
);

-- ---------------------------------------------------------------------------
-- experience seed (6 entries, sort_order 0–5, oldest first)
-- ---------------------------------------------------------------------------
INSERT INTO experience (role, company, location, start_date, end_date, skill_assembled, highlights, note, sort_order) VALUES
(
  'Assistant Financial Analyst Intern',
  'CITIC Securities',
  'Beijing, China',
  '2022-07',
  '2022-09',
  'Analytical thinking and financial modeling — learned to evaluate companies through data, build DCF models, and present quantitative stories to senior stakeholders',
  '["Built DCF valuation models for equity research covering multiple sectors","Analyzed financial statements and market data to support investment recommendations","Created data visualizations and dashboards for senior analyst presentations","Developed proficiency in financial data analysis using Excel VBA and Python"]',
  NULL,
  0
),
(
  'Data Scientist Intern',
  'Smart Gadget Home',
  'Paris, France',
  '2023-07',
  '2023-09',
  'ML foundations and optimization — applied XGBoost and deep learning to real inventory problems, achieving 150% improvement in pricing',
  '["Developed pricing optimization model using XGBoost achieving 150% improvement over baseline","Applied deep learning techniques to inventory demand forecasting","Built data pipelines for cleaning and preprocessing e-commerce product data","Deployed ML models to production environment for real-time pricing recommendations"]',
  NULL,
  1
),
(
  'Data Scientist / AI Consultant Intern',
  'Societe Generale (via Alenia)',
  'Paris, France',
  '2024-04',
  '2024-10',
  'Enterprise AI and RAG systems — built production RAG chatbot with LangChain and ElasticSearch, learned to navigate corporate AI deployment',
  '["Built production RAG chatbot using LangChain and ElasticSearch for internal knowledge retrieval","Implemented hybrid search combining dense vector and sparse keyword retrieval for improved accuracy","Designed and deployed document ingestion pipeline processing thousands of internal documents","Navigated enterprise security and compliance requirements for AI system deployment"]',
  NULL,
  2
),
(
  'AI Engineer',
  'Misogi Labs',
  'Paris, France',
  '2025-05',
  '2025-09',
  'Multi-agent orchestration — developed molecule screening systems with PaperQA and LangGraph, coordinating AI workflows for drug discovery',
  '["Developed multi-agent molecule screening system using PaperQA and LangGraph for drug discovery","Orchestrated AI workflows coordinating literature search, molecular analysis, and candidate ranking","Integrated scientific paper retrieval with molecular property prediction models","Built automated pipelines for screening potential drug candidates against target criteria"]',
  NULL,
  3
),
(
  'AI Engineer',
  'Mozart AI',
  'Paris, France',
  '2025-10',
  '2026-01',
  'Creative AI and music engineering — built end-to-end agentic workflows for AI music video creation, bridging technical AI with artistic production',
  '["Built end-to-end agentic workflows for AI music video creation","Developed front-end audio interaction features for real-time music manipulation","Integrated multiple AI models for coordinated audio-visual content generation","Bridged technical AI engineering with artistic production requirements"]',
  NULL,
  4
),
(
  'AI Engineer',
  'Epiminds',
  'Stockholm, Sweden',
  '2026-02',
  '2026-03',
  'Marketing AI — applied AI agent techniques to content marketing automation',
  '["Applied AI agent techniques to automate content marketing workflows","Built marketing content generation pipelines using LLM-based agents"]',
  'Team restructured',
  5
);
