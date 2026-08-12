---
name: red-valley-skill
description: Authoritative multi-vector scoring skill for evaluating Reddit community post engagement authenticity, factual lead truthfulness, synthetic AI content probability, and source credibility.
version: 2.0.0
---

# 🛡️ Red Valley Authoritative Multi-Vector Verification Skill

This skill defines the production-ready multi-vector evaluation engine used by **Red Valley** to assess Reddit posts.

---

## 📊 Dual Primary Highlighted Scores

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 💬 1. COMMUNITY ENGAGEMENT AUTHENTICITY SCORE (0-100%)                      │
│       Measures whether a post is a genuine, organic community discussion     │
│       versus a covert self-promotion plug, DM lead trap, or upvote bait.   │
├─────────────────────────────────────────────────────────────────────────────┤
│ 🎯 2. FACTUAL & LEAD TRUTHFULNESS SCORE (0-100%)                            │
│       Measures whether financial figures (MRR/ARR), achievement claims,      │
│       growth advice, and external links are authentic vs false leads.       │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🧩 The 4 Underlying Vector Engine Specifications

| Vector Name | Icon | Weight | Scale Range | Evaluation Factors |
|---|:---:|:---:|:---:|---|
| **Factual Claim Assertions** | 📌 | 30% | 0 - 100 | Statistical assertions, financial revenue claims ($MRR), verifiability, subjectivity vs objectivity. |
| **AI Synthetic Text Index** | 🤖 | 25% | 0 - 100 | LLM vocabulary frequency, sentence length burstiness, markdown formatting, Reddit colloquialisms. |
| **Link & Source Credibility** | 🔗 | 25% | 0 - 100 | Domain TLD trust (.gov/.edu/github = high, bit.ly/t.me/typeform = low), DM trap detection without links. |
| **Author Account Signals** | 👤 | 20% | 0 - 100 | Handle syntax (custom organic vs throwaway `Ad_1234`), karma post-to-comment ratio, account age. |

---

## 📈 Score Rating Scale Definitions

| Score Range | Trust Level | Badge Color | Primary Rating Tag | Description |
|:---:|:---:|:---:|:---:|---|
| **80 - 100%** | **HIGH TRUST** | `#10b981` (Green) | `ORGANIC` / `GENUINE` | Transparent community post with verifiable claims and natural language. |
| **60 - 79%** | **MODERATE** | `#3b82f6` (Blue) | `MODERATE` | Standard discussion post with minor unverified claims or personal opinion. |
| **40 - 59%** | **SUSPICIOUS** | `#f97316` (Orange) | `COVERT PLUG` / `UNVERIFIED` | Disguised self-promotion, unverified revenue brag, or DM lead trap. |
| **0 - 39%** | **CRITICAL RISK** | `#ef4444` (Red) | `FALSE LEAD` / `SPAM` | Misleading claim, obfuscated phishing link, or synthetic LLM marketing bot. |

---

## 🔍 Specific Post Category Heuristics

### 1. Question / Help Seeking Posts
- **Title Examples**: *"I need some ideas on how to get to some money ASAP"*, *"How do I find early adopters?"*
- **Vector Profile**:
  - 📌 Claim Assertions: **85/100** (Zero false claims, seeking input)
  - 🤖 AI Text Index: **95/100** (Expressive human phrasing with `ASAP`, `!!!`)
  - 🔗 Source Credibility: **80/100** (Clean internal discussion)
  - 👤 Account Signals: **85/100** (Organic handle `Real_dranksipper`)
  - **Result**: `💬 88% ORGANIC` | `🎯 84% GENUINE`

### 2. Milestone / Personal Experience Posts
- **Title Examples**: *"After 36 technical interviews, I finally bagged an offer"*, *"Built my first app"*
- **Vector Profile**:
  - 📌 Claim Assertions: **75/100** (Personal milestone assertion)
  - 🤖 AI Text Index: **92/100** (Natural human experience narrative)
  - 🔗 Source Credibility: **75/100** (Image attachment proof)
  - 👤 Account Signals: **85/100** (Established handle `deathmachine1407`)
  - **Result**: `💬 84% ORGANIC` | `🎯 78% GENUINE`

### 3. Covert Product Plug / Lead Traps
- **Title Examples**: *"Funding 5 builders with $500 in AI credits + our time to launch a micro SaaS"*
- **Vector Profile**:
  - 📌 Claim Assertions: **50/100** (Unverified credit giveaway / lead magnet)
  - 🤖 AI Text Index: **65/100** (Marketing copy phrasing)
  - 🔗 Source Credibility: **45/100** (Gated signup / DM lead capture)
  - 👤 Account Signals: **75/100** (Self-promo account profile)
  - **Result**: `💬 52% COVERT PLUG` | `🎯 48% UNVERIFIED LEAD`

---

## 🤖 LLM Prompt System Template

```json
{
  "system_prompt": "You are the Red Valley Authenticity Validator. Evaluate the Reddit post across Community Engagement (0-100) and Lead Truthfulness (0-100). Calculate AI Synthetic Probability (0.0-1.0), Source Domain Credibility (0-100), and Account Risk. Return JSON formatted output with primaryScores, vectorBreakdown, and keyFlags."
}
```
