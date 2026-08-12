<p align="center">
  <img src="assets/logo.png" alt="Red Valley Logo" width="120">
</p>

# 🛡️ Red Valley

**Red Valley** is a full-stack Chrome Extension (Manifest V3) and multi-vector Backend Analysis API designed to evaluate the authenticity, claim verifiability, AI content probability, source credibility, and author trust signals of posts on Reddit.

---

## 🏗️ Architecture

```
Chrome Extension (Manifest V3)
       ↓
Reddit DOM Extraction (sh-reddit / post containers / old.reddit)
       ↓
Content Extraction Payload
       ↓
Backend API Server (Node.js / Express)
       ↓
 ┌────────────────────────────────────────────────────────┐
 │ 1. Claim Extractor (LLM / NLP entity & stat parser)    │
 │ 2. AI Content Detector (Stylistic & Burstiness NLP)    │
 │ 3. Source & Link Verifier (Domain trust & HTTPS)       │
 │ 4. Image & Media Analyzer (Stock / AI media markers)   │
 │ 5. Author Account Signal Analyzer (Karma ratio / age)  │
 └────────────────────────────────────────────────────────┘
       ↓
Evidence / Scoring Engine (Weighted 0-100 Authenticity Score)
       ↓
Reddit DOM UI Overlay & Extension Popup
```

---

## 🚀 Getting Started

### 1. Start Backend API Server

```bash
cd backend
npm install
npm start
```
The server will start on `http://localhost:3000`.

#### LLM Configuration Options
You can configure your choice of checking LLM or zero-dependency offline fallback:
- **OpenAI**: Set `OPENAI_API_KEY` in `backend/.env`.
- **Local Ollama**: Set `LLM_PROVIDER=ollama` and ensure `ollama run llama3` is active at `http://localhost:11434`.
- **Google Gemini**: Set `GEMINI_API_KEY` in `backend/.env`.
- **Zero-Dependency Built-In**: Out-of-the-box heuristic fallback engine if no keys are provided.

---

### 2. Load Chrome Extension

1. Open Chrome and navigate to `chrome://extensions/`.
2. Toggle **Developer mode** in the top right corner.
3. Click **Load unpacked**.
4. Select the `extension/` directory inside this repository.
5. Open [Reddit](https://reddit.com). You will see the **🛡️ Verify** badge injected next to post headers!

---

## 📊 Evaluation Vector Breakdown

| Vector | Weight | Description |
| :--- | :---: | :--- |
| **Claim Verifiability** | 30% | Extracts factual, statistical, or news claims and scores verifiability. |
| **AI Content Probability** | 25% | Measures perplexity, burstiness, synthetic phrasing ("delve", "tapestry"), and LLM patterns. |
| **Source Credibility** | 20% | Analyzes external link domains against trusted research indexes (.gov, Reuters, Nature) vs obfuscated link shorteners. |
| **Image & Media Analysis** | 15% | Inspects attachments for AI generation markers, stock photo watermarks, and meme templates. |
| **Account Signals** | 10% | Assesses author karma ratio, post vs comment activity, and brand new burner account penalties. |

---

## 🧪 Running Tests

To verify the scoring engine locally:
```bash
cd backend
npm test
```
