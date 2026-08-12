---
name: red-valley-skill
description: AI analysis skill for evaluating Reddit community post engagement authenticity, factual lead truthfulness, synthetic AI content probability, and source credibility.
version: 1.0.0
---

# 🛡️ Red Valley Skill & Evaluation Prompts

This skill defines the authoritative multi-vector verification criteria used by the **Red Valley** backend and Chrome Extension to assess Reddit posts.

## 🎯 Evaluation Objectives

Every post is evaluated across **Two Primary Highlighted Scores** and supporting AI/account vectors:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. 💬 COMMUNITY ENGAGEMENT SCORE (0-100%)                                   │
│    Evaluates if the post is a genuine, organic community discussion vs      │
│    self-promotion plug, covert product advertisement, or engagement bait.  │
├─────────────────────────────────────────────────────────────────────────────┤
│ 2. 🎯 FACTUAL & LEAD TRUTHFULNESS SCORE (0-100%)                            │
│    Evaluates if claims, financial metrics (MRR/ARR), advice, links, and    │
│    leads are authentic vs false leads, fake revenue, or deceptive pitches.  │
├─────────────────────────────────────────────────────────────────────────────┤
│ 3. 🤖 AI SYNTHETIC CONTENT INDEX (0-100%)                                   │
│    Measures probability of AI language model generation vs human writing.  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 1. 💬 Community Engagement Authenticity Criteria

### High Engagement Authenticity (80 - 100%)
- **Organic Discussion**: User shares genuine personal experiences, asks transparent questions, or seeks constructive community feedback.
- **No Hidden Agenda**: Post does not link to low-trust landing pages, lead capture forms, or undisclosed affiliate products.
- **Relatable Tone**: Natural, informal conversational language with authentic Reddit idioms.

### Low Engagement / Spam Risk (< 50%)
- **Covert Self-Promotion**: Post frames a product pitch as a "vibe coded project", "launch story", or "free tool" to bypass subreddit self-promotion rules.
- **Lead Capture Trap**: Directs users to DMs ("DM me for access"), gated landing pages, or Discord channels for lead collection.
- **Engagement Bait**: Generic, controversial, or hyperbolic titles designed purely to farm upvotes and comments for account warming.

---

## 2. 🎯 Factual & Lead Truthfulness Criteria

### High Truthfulness (80 - 100%)
- **Verifiable Evidence**: Includes verifiable links (GitHub repos, official documentation, peer-reviewed research, trusted news domains).
- **Realistic Metrics**: Financial or growth figures (e.g. $500 MRR, 100 users over 6 months) align with standard early-stage benchmarks without unverified claims.

### False Lead / Deceptive Risk (< 50%)
- **Unverified Financial Bragging**: Claims rapid revenue (e.g. "$1,169 MRR in 10 days vibe coding") without public proof, open metrics, or third-party validation.
- **False Leads / Misleading Advice**: Promises guaranteed customer acquisition hacks, secret shortcuts, or deceptive marketing schemes.
- **Obfuscated Links**: Uses URL shorteners, redirect trackers, or domain parking sites.

---

## 3. 🤖 AI Synthetic Content Detection

### Key Indicators of AI Generation
- **Synthetic Vocabulary**: Heavy usage of LLM transition words: `delve`, `tapestry`, `moreover`, `furthermore`, `testament`, `pivotal`, `beacon`, `realm`, `multifaceted`.
- **Low Burstiness**: Extremely uniform sentence lengths and perfect grammatical structure without colloquial pauses.
- **Markdown Formatting**: Default LLM list layouts (bullet points with bold headers for every item).

---

## 4. LLM Analysis System Prompt Template

```json
{
  "system_prompt": "You are the Reddit Authenticity & Fact Check Validator. Analyze the Reddit post for Community Engagement Authenticity (0-100), Factual & Lead Truthfulness (0-100), and AI Text Probability (0.0-1.0). Return JSON containing engagementScore, leadTruthfulnessScore, aiProbability, keyFlags, and extractedClaims."
}
```
