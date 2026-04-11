## Context Rot Is Real, and Subagents Are the Fix

Working on multi-agent systems at Epiminds, I spent a lot of time thinking about why agents get worse the longer they run. The answer is context rot, and the most practical solution I've found is subagent-driven context isolation.

This post breaks down the problem, the architecture, and what I learned building production agent systems.

## The Problem: Your Agent Gets Dumber Over Time

Every LLM suffers from context rot. [Chroma's research](https://www.morphllm.com/context-rot) tested 18 frontier models (GPT-4.1, Claude Opus 4, Gemini 2.5 Pro, Qwen3-235B) and found that **every single one** gets measurably worse as input length increases.

Three mechanisms are at play:

1. **Lost-in-the-middle effect** — models attend well to the start and end of their context but poorly to the middle. Accuracy drops 30%+ when relevant info sits in positions 5-15 of a 20-document window.
2. **Attention dilution** — transformer attention is quadratic. At 100K tokens, the model tracks 10 billion pairwise relationships. Each new token dilutes attention on everything else.
3. **Distractor interference** — semantically similar but irrelevant content actively misleads the model. This is especially bad for coding agents that accumulate search results and backtracking noise.

The practical effect: [Cognition found](https://www.morphllm.com/context-rot) that by the time a coding agent finds the relevant code, the signal-to-noise ratio in its context is **2.5%**. Doubling task duration quadruples the failure rate.

```mermaid
graph LR
    A[Fresh Context<br/>High Accuracy] --> B[Growing Context<br/>Noise Accumulates]
    B --> C[Context Rot<br/>30%+ Accuracy Drop]
    C --> D[Agent Failure<br/>Hallucinations & Loops]
    style A fill:#69f0ae,color:#000
    style B fill:#ffd54f,color:#000
    style C fill:#ff6b9d,color:#000
    style D fill:#ff1744,color:#fff
```

## The Solution: Subagent Context Isolation

The key insight: **don't let one agent accumulate everything**. Delegate work to subagents that run in isolated context windows, do their job, and return only a summary to the parent.

This is the same principle behind [Claude Code's subagent architecture](https://docs.anthropic.com/en/docs/claude-code/sub-agents), [LangChain's Deep Agents](https://www.marktechpost.com/2026/03/15/langchain-releases-deep-agents-a-structured-runtime-for-planning-memory-and-context-isolation-in-multi-step-ai-agents/), and what we built at Epiminds. The parent orchestrator stays clean. The heavy lifting happens elsewhere.

```mermaid
graph TB
    subgraph "Orchestrator Context (Clean)"
        O[Orchestrator Agent]
        O -->|"Task: Analyze campaign"| S1
        O -->|"Task: Generate copy"| S2
        O -->|"Task: Research audience"| S3
        S1 -->|"Summary: 3 lines"| O
        S2 -->|"Summary: draft ready"| O
        S3 -->|"Summary: 5 segments"| O
    end
    
    subgraph "Subagent 1 Context (Isolated)"
        S1[Data Analyst Agent]
        S1D[60K tokens of raw data<br/>API responses, metrics,<br/>intermediate calculations]
    end
    
    subgraph "Subagent 2 Context (Isolated)"
        S2[Copywriter Agent]
        S2D[40K tokens of drafts<br/>brand guidelines, examples,<br/>revision history]
    end
    
    subgraph "Subagent 3 Context (Isolated)"
        S3[Research Agent]
        S3D[80K tokens of research<br/>competitor analysis, trends,<br/>audience data]
    end
    
    style O fill:#b388ff,color:#000
    style S1 fill:#4dd0e1,color:#000
    style S2 fill:#ff6b9d,color:#000
    style S3 fill:#69f0ae,color:#000
```

Without isolation, the orchestrator would hold 180K+ tokens of accumulated context. With isolation, it holds maybe 2K tokens of clean summaries. The quality difference is dramatic.

## How We Built This at Epiminds

At [Epiminds](https://epiminds.com/), we built a multi-agent marketing platform with 20+ specialized agents coordinating under a supervisor architecture. The core product, Lucy, manages campaigns end-to-end: reporting, pacing, creative analysis, budget optimization.

The framework follows a supervisor pattern similar to [AutoGen's GroupChat](https://arxiv.org/abs/2308.08155) and [VoltAgent's](https://voltagent.dev/) agent orchestration, but tuned for marketing workflows.

### The Supervisor Pattern

```mermaid
sequenceDiagram
    participant User
    participant Lucy as Lucy (Supervisor)
    participant DA as Data Analyst
    participant CW as Copywriter
    participant SA as Strategy Agent
    participant CA as Creative Analyst
    
    User->>Lucy: "Optimize Q2 campaign for Nike"
    
    Lucy->>DA: Analyze current performance
    Note right of DA: Own context: campaign data,<br/>metrics, benchmarks<br/>(isolated from others)
    DA-->>Lucy: Summary: CTR down 12%,<br/>mobile converting 2x desktop
    
    Lucy->>SA: Recommend budget reallocation
    Note right of SA: Own context: strategy rules,<br/>market data, DA's summary<br/>(not DA's raw data)
    SA-->>Lucy: Summary: shift 30% to mobile,<br/>cut display by 15%
    
    Lucy->>CW: Generate new mobile copy
    Note right of CW: Own context: brand voice,<br/>SA's recommendation<br/>(clean, focused)
    CW-->>Lucy: Summary: 3 variants ready
    
    Lucy->>CA: Score creative variants
    CA-->>Lucy: Summary: Variant B wins
    
    Lucy-->>User: Action plan + new creatives
```

Each agent gets only what it needs. The Data Analyst never sees brand guidelines. The Copywriter never sees raw API metrics. This isn't just about context window limits. It's about **signal quality**. A copywriter with 60K tokens of campaign metrics in its context writes worse copy, even if the window can hold it.

### Why Not Just Use a Bigger Context Window?

Because the problem isn't capacity. It's attention.

The [AgentRM paper](https://arxiv.org/html/2603.13110) identifies two failure modes in agent systems: scheduling failures (system unresponsiveness) and **context degradation** (agent "amnesia" from unbounded memory growth). Both get worse with larger windows, not better.

| Approach | Context Size | Signal Quality | Failure Rate |
|---|---|---|---|
| Single agent, 200K window | 200K tokens | Degrades over time | High after 35min |
| Multi-agent, shared context | 200K shared | Polluted by all agents | Medium-high |
| **Subagent isolation** | **2-5K per parent turn** | **Stays clean** | **Low** |

## The Pattern in Practice

Whether it's Epiminds' marketing agents, Claude Code's [subagent framework](https://docs.anthropic.com/en/docs/claude-code/sub-agents), or [AutoGen's v0.4 actor model](https://newsletter.victordibia.com/p/a-friendly-introduction-to-the-autogen), the pattern is the same:

```mermaid
flowchart TB
    subgraph "Anti-Pattern: Shared Context"
        direction TB
        A1[Agent A writes 10K tokens] --> SC[Shared Context<br/>grows unbounded]
        A2[Agent B writes 15K tokens] --> SC
        A3[Agent C writes 20K tokens] --> SC
        SC --> R1[All agents see<br/>everyone's noise]
        style SC fill:#ff6b9d,color:#000
        style R1 fill:#ff1744,color:#fff
    end
    
    subgraph "Pattern: Isolated Subagents"
        direction TB
        O2[Orchestrator<br/>clean context] -->|task| B1[Agent A<br/>isolated]
        O2 -->|task| B2[Agent B<br/>isolated]
        O2 -->|task| B3[Agent C<br/>isolated]
        B1 -->|summary| O2
        B2 -->|summary| O2
        B3 -->|summary| O2
        style O2 fill:#69f0ae,color:#000
        style B1 fill:#4dd0e1,color:#000
        style B2 fill:#b388ff,color:#000
        style B3 fill:#ffd54f,color:#000
    end
```

The rules are simple:

1. **Orchestrator holds summaries, not raw data.** It decides what to do, not how to do it.
2. **Each subagent gets a focused brief.** Include what it needs, exclude what it doesn't.
3. **Subagents return structured summaries.** Not their full chain-of-thought. Not intermediate results. A clean answer.
4. **Parallel when possible.** Independent tasks run concurrently. The orchestrator waits for all, then synthesizes.

## What This Means for Your Agent Architecture

If you're building multi-agent systems and your agents degrade after 10-15 turns of conversation, the fix isn't a bigger context window. It's isolation.

The [Intrinsic Memory Agents paper](https://arxiv.org/html/2508.08997v1) calls this "structured contextual memory" — each agent maintains memories specific to its role, ensuring heterogeneity rather than a shared soup of context.

Context engineering is becoming as important as prompt engineering. The question isn't "what do I put in the prompt?" It's "what do I keep out?"

---

*Built with this approach at [Epiminds](https://epiminds.com/) (marketing agent platform, $6.6M seed from Lightspeed). Currently applying similar patterns to [yongkang.dev](https://yongkang.dev) — where Claude Code's subagent-driven development helped ship this entire site.*

## References

- [Context Rot: Why LLMs Degrade as Context Grows](https://www.morphllm.com/context-rot) — Morph/Chroma research, 18 frontier models tested
- [AutoGen: Enabling Next-Gen LLM Applications via Multi-Agent Conversation](https://arxiv.org/abs/2308.08155) — Microsoft Research
- [LangChain Deep Agents: Context Isolation in Multi-Step AI Agents](https://www.marktechpost.com/2026/03/15/langchain-releases-deep-agents-a-structured-runtime-for-planning-memory-and-context-isolation-in-multi-step-ai-agents/) — MarkTechPost
- [Claude Code Subagents Documentation](https://docs.anthropic.com/en/docs/claude-code/sub-agents) — Anthropic
- [Context Management with Subagents in Claude Code](https://www.richsnapp.com/article/2025/10-05-context-management-with-subagents-in-claude-code) — RichSnapp
- [AgentRM: An OS-Inspired Resource Manager for LLM Agent Systems](https://arxiv.org/html/2603.13110)
- [Intrinsic Memory Agents: Heterogeneous Multi-Agent LLM Systems](https://arxiv.org/html/2508.08997v1)
- [Context Discipline and LLM Performance Degradation](https://arxiv.org/html/2601.11564v1)
- [AutoGen v0.4 Introduction](https://newsletter.victordibia.com/p/a-friendly-introduction-to-the-autogen) — Victor Dibia
- [Epiminds Case Study with VoltAgent](https://voltagent.dev/customers/mo-elkhidir/)
