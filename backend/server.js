const express = require('express');
const cors = require('cors');
const env = require('./config/env');
const validateRoute = require('./routes/validateRoute');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Mount Routes
app.use('/api', validateRoute);

// Default Route
app.get('/', (req, res) => {
  res.json({
    name: 'Red Valley API Server',
    status: 'running',
    docs: 'POST /api/validate with Reddit post payload'
  });
});

// Start Server
app.listen(env.PORT, () => {
  console.log(`==================================================`);
  console.log(` 🛡️  RED VALLEY API SERVER STARTED`);
  console.log(` 🌐 Listening on: http://localhost:${env.PORT}`);
  console.log(` 🤖 LLM Provider Config: ${env.LLM_PROVIDER}`);
  console.log(`==================================================`);
});
