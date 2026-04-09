INSERT INTO pages (id, content) VALUES (
  'skill',
  '{"narrative": "Creative technologist assembling skills across domains. From enterprise RAG pipelines at Societe Generale to multi-agent orchestration at Misogi Labs, from 3D spatial intelligence to music AI at Mozart AI. Tested across 24 hackathons with 9 wins — every domain shift adds a new capability to the stack."}'
) ON CONFLICT (id) DO NOTHING;
