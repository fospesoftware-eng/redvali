const llmService = require('./llmService');

class ClaimExtractor {
  async extractClaims(postData) {
    const text = `${postData.title || ''}\n\n${postData.body || ''}`.trim();
    if (!text) {
      return {
        claims: [],
        verifiabilityScore: 50,
        summary: "No text content available to extract claims."
      };
    }

    // Try LLM extraction
    try {
      const systemPrompt = `You are a fact-checking claim extraction assistant. Extract concrete factual claims from the text. 
Identify statistical assertions, cause-and-effect claims, news claims, or historical assertions.
Return JSON with format:
{
  "claims": [
    {
      "statement": "string",
      "category": "statistic|news|scientific|anecdotal|opinion",
      "verifiability": "high|medium|low",
      "suspicionFlag": boolean,
      "reason": "string"
    }
  ],
  "verifiabilityScore": number (0-100),
  "summary": "string"
}`;
      const llmResult = await llmService.generateJSON(systemPrompt, `Title: ${postData.title}\nBody: ${postData.body}`);
      if (llmResult && Array.isArray(llmResult.claims)) {
        return llmResult;
      }
    } catch (err) {
      console.warn('[ClaimExtractor] LLM parse failed, falling back to NLP heuristics:', err.message);
    }

    // Fallback Heuristic NLP Claim Extractor
    return this.heuristicExtract(postData.title, postData.body);
  }

  heuristicExtract(title = '', body = '') {
    const combined = `${title}. ${body}`;
    const sentences = combined
      .split(/(?<=[.!?])\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 12);

    const claims = [];
    let verifiabilitySum = 50;

    const statRegex = /\b(\d+(?:\.\d+)?%|\$\d+|\d+\s*(?:million|billion|trillion|people|cases|deaths|dollars))\b/i;
    const absoluteRegex = /\b(always|never|every|none|proven|100%|secret|conspiracy|breakthrough|cure|miracle|guaranteed)\b/i;
    const sourceCiteRegex = /\b(according to|study|research|journal|report|dr\.|doctor|scientists|official|court|documents)\b/i;

    sentences.forEach((sentence) => {
      let isClaim = false;
      let category = 'general';
      let verifiability = 'medium';
      let suspicionFlag = false;
      let reason = 'General declarative statement';

      if (statRegex.test(sentence)) {
        isClaim = true;
        category = 'statistic';
        verifiability = 'high';
        reason = 'Contains quantitative metric or numerical data';
      } else if (sourceCiteRegex.test(sentence)) {
        isClaim = true;
        category = 'scientific/report';
        verifiability = 'high';
        reason = 'References external study, report, or authority source';
      } else if (sentence.length > 40 && (sentence.includes('that') || sentence.includes('because'))) {
        isClaim = true;
        category = 'factual assertion';
      }

      if (absoluteRegex.test(sentence)) {
        suspicionFlag = true;
        verifiability = 'low';
        reason += ' - Uses absolute/sensationalist language';
      }

      if (isClaim) {
        claims.push({
          statement: sentence.length > 140 ? sentence.substring(0, 137) + '...' : sentence,
          category,
          verifiability,
          suspicionFlag,
          reason
        });
      }
    });

    // Score calculation
    let verifiabilityScore = 70;
    if (claims.length === 0) {
      verifiabilityScore = 50;
    } else {
      const highCount = claims.filter(c => c.verifiability === 'high').length;
      const flaggedCount = claims.filter(c => c.suspicionFlag).length;
      verifiabilityScore = Math.min(100, Math.max(10, 60 + (highCount * 10) - (flaggedCount * 15)));
    }

    return {
      claims: claims.slice(0, 6),
      verifiabilityScore,
      summary: claims.length > 0 
        ? `Identified ${claims.length} extractable claim(s) from post.`
        : 'Post primarily contains personal opinions or casual commentary.'
    };
  }
}

module.exports = new ClaimExtractor();
