---
name: red-valley-skill
description: Production-grade multi-vector scoring skill for evaluating Reddit community post engagement authenticity, trading scams, financial profit brags, synthetic AI content, and source credibility.
version: 3.0.0
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
│       Measures whether financial figures (MRR/ARR), trading profits ($33k+),│
│       growth advice, and external links are authentic vs false leads.       │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🚨 Critical Red-Flag Verification Rules

### 1. Trading Scams & Unverified Profit Brags
- **Patterns**: `$33,000+ Trading`, `$10k in 10 mins`, `exact system:`, `daily profit`, `win rate`, `automated trading bot`, `signals`.
- **Evaluation Rule**: Posts claiming rapid financial profits or "less than 10 minutes a day" without third-party audited proof (Stripe, Open Startup, Verified Broker) are **penalized by -55 to -70 points**.
- **Resulting Ratings**:
  - `💬 25% HIGH SPAM / COVERT FUNNEL`
  - `🎯 20% FALSE LEADS / MISLEADING`
  - `Overall Score: < 30 / 100` (`🚨 HIGH RISK / MISLEADING` - Red Badge `#ef4444`)

### 2. AI-Generated Trading & Marketing Scripts
- **Patterns**: Section headers like `Strategy`, `Risk Management`, `Daily net cumulative P&L`, `The System:`, `Setup:`.
- **Evaluation Rule**: Posts combining financial earnings assertions with ChatGPT structured section headers are flagged as **Synthetic Marketing Copy** (AI Index: **15 - 25 / 100**).

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

## 🔍 Specific Post Category Benchmark Examples

### 1. Trading Scam / Profit Brag Post (CRITICAL RISK)
- **Title**: *"I Made Over $33,000+ Trading Less Than 10 Minutes a Day Heres the Exact System:"*
- **Vector Profile**:
  - 📌 Claim Assertions: **25/100** (Unverified high earnings brag)
  - 🤖 AI Text Index: **25/100** (Structured ChatGPT marketing template)
  - 🔗 Source Credibility: **40/100** (Hidden course funnel)
  - 👤 Account Signals: **55/100** (Unverified trader profile)
  - **Result**: `💬 25% HIGH SPAM / COVERT FUNNEL` | `🎯 20% FALSE LEADS / MISLEADING`
  - **Overall Authenticity Index**: **28 / 100** (`🚨 HIGH RISK / MISLEADING`)

### 2. Genuine Help Seeking Post (HIGH TRUST)
- **Title**: *"I need some ideas on how to get to some money ASAP"*
- **Vector Profile**:
  - 📌 Claim Assertions: **85/100** (Zero false claims, seeking input)
  - 🤖 AI Text Index: **95/100** (Expressive human phrasing)
  - 🔗 Source Credibility: **80/100** (Clean internal discussion)
  - 👤 Account Signals: **85/100** (Organic handle)
  - **Result**: `💬 88% ORGANIC` | `🎯 84% GENUINE`

---

## 🤖 LLM Prompt System Template

```json
{
  "system_prompt": "You are the Red Valley Authenticity Validator. Evaluate the Reddit post across Community Engagement (0-100) and Lead Truthfulness (0-100). Identify trading scams, get-rich-quick claims, and synthetic AI marketing scripts. Return JSON formatted output with primaryScores, vectorBreakdown, and keyFlags."
}
```
