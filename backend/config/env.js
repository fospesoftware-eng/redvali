const path = require('path');
try {
  require('dotenv').config({ path: path.join(__dirname, '../.env') });
} catch (e) {
  // dotenv optional
}

module.exports = {
  PORT: process.env.PORT || 3000,
  LLM_PROVIDER: process.env.LLM_PROVIDER || 'auto', // 'openai' | 'ollama' | 'gemini' | 'auto' | 'builtin'
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  OPENAI_MODEL: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  OLLAMA_HOST: process.env.OLLAMA_HOST || 'http://localhost:11434',
  OLLAMA_MODEL: process.env.OLLAMA_MODEL || 'llama3',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  GEMINI_MODEL: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
  ENABLE_LIVE_WEB_SEARCH: process.env.ENABLE_LIVE_WEB_SEARCH !== 'false'
};
