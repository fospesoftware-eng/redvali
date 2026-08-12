const express = require('express');
const router = express.Router();
const scoringEngine = require('../services/scoringEngine');

/**
 * POST /api/validate
 * Accepts Reddit post extraction payload and returns authenticity evaluation.
 */
router.post('/validate', async (req, res) => {
  try {
    const postData = req.body;
    if (!postData || (!postData.title && !postData.body)) {
      return res.status(400).json({
        error: 'Invalid payload. "title" or "body" is required.'
      });
    }

    const report = await scoringEngine.evaluatePost(postData);
    return res.json(report);
  } catch (err) {
    console.error('[validateRoute] Evaluation error:', err);
    return res.status(500).json({
      error: 'Failed to process post evaluation.',
      details: err.message
    });
  }
});

/**
 * GET /api/health
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Reddit Validator Backend API',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
