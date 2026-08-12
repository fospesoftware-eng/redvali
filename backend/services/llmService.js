const env = require('../config/env');
const http = require('http');
const https = require('https');

/**
 * Unified LLM helper with sub-second failover and instant fallback
 */
class LLMService {
  /**
   * Send prompt to available LLM or fast fallback
   */
  async generateJSON(systemPrompt, userPrompt) {
    if (env.LLM_PROVIDER === 'builtin') {
      return null; // Instant heuristic fallback
    }

    // Fast Race Guard: Max 1.2s for LLM responses, otherwise instant heuristic fallback
    return Promise.race([
      this.executeLLMProviders(systemPrompt, userPrompt),
      new Promise(resolve => setTimeout(() => resolve(null), 1200))
    ]);
  }

  async executeLLMProviders(systemPrompt, userPrompt) {
    // Try OpenAI if Key Provided
    if (env.OPENAI_API_KEY && (env.LLM_PROVIDER === 'openai' || env.LLM_PROVIDER === 'auto')) {
      try {
        const res = await this.callOpenAI(systemPrompt, userPrompt);
        if (res) return res;
      } catch (err) {
        console.warn('[LLMService] OpenAI call failed, falling back:', err.message);
      }
    }

    // Try Gemini if Key Provided
    if (env.GEMINI_API_KEY && (env.LLM_PROVIDER === 'gemini' || env.LLM_PROVIDER === 'auto')) {
      try {
        const res = await this.callGemini(systemPrompt, userPrompt);
        if (res) return res;
      } catch (err) {
        console.warn('[LLMService] Gemini call failed, falling back:', err.message);
      }
    }

    // Try Ollama ONLY if explicitly requested or specified as provider
    if (env.LLM_PROVIDER === 'ollama') {
      try {
        const res = await this.callOllama(systemPrompt, userPrompt);
        if (res) return res;
      } catch (err) {
        console.warn('[LLMService] Ollama call failed:', err.message);
      }
    }

    return null; // Instant heuristic fallback
  }

  async callOpenAI(systemPrompt, userPrompt) {
    const data = JSON.stringify({
      model: env.OPENAI_MODEL,
      messages: [
        { role: 'system', content: systemPrompt + ' Respond strictly in valid JSON format.' },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2
    });

    const responseText = await this.httpRequest('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.OPENAI_API_KEY}`
      }
    }, data, 1000);

    const json = JSON.parse(responseText);
    const content = json.choices?.[0]?.message?.content;
    return content ? JSON.parse(content) : null;
  }

  async callGemini(systemPrompt, userPrompt) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${env.GEMINI_MODEL}:generateContent?key=${env.GEMINI_API_KEY}`;
    const data = JSON.stringify({
      contents: [
        {
          parts: [{ text: `${systemPrompt}\n\nRespond ONLY with JSON.\n\nInput:\n${userPrompt}` }]
        }
      ],
      generationConfig: {
        responseMimeType: "application/json"
      }
    });

    const responseText = await this.httpRequest(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, data, 1000);

    const json = JSON.parse(responseText);
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
    return text ? JSON.parse(text) : null;
  }

  async callOllama(systemPrompt, userPrompt) {
    const url = `${env.OLLAMA_HOST}/api/generate`;
    const data = JSON.stringify({
      model: env.OLLAMA_MODEL,
      prompt: `${systemPrompt}\n\nInput:\n${userPrompt}\n\nOutput valid JSON ONLY.`,
      format: 'json',
      stream: false
    });

    const responseText = await this.httpRequest(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, data, 800); // 800ms fast timeout

    const json = JSON.parse(responseText);
    return json.response ? JSON.parse(json.response) : null;
  }

  httpRequest(urlStr, options, bodyData, timeoutMs = 1000) {
    return new Promise((resolve, reject) => {
      const url = new URL(urlStr);
      const client = url.protocol === 'https:' ? https : http;

      const req = client.request(url, options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(body);
          } else {
            reject(new Error(`HTTP Status ${res.statusCode}: ${body}`));
          }
        });
      });

      req.on('error', reject);
      req.setTimeout(timeoutMs, () => {
        req.destroy();
        reject(new Error('HTTP request timeout'));
      });

      if (bodyData) req.write(bodyData);
      req.end();
    });
  }
}

module.exports = new LLMService();
