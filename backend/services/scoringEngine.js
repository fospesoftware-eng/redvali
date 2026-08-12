const claimExtractor = require('./claimExtractor');
const aiTextDetector = require('./aiTextDetector');
const sourceVerifier = require('./sourceVerifier');
const imageAnalyzer = require('./imageAnalyzer');
const accountAnalyzer = require('./accountAnalyzer');
const leadVerifier = require('./leadVerifier');

class ScoringEngine {
  async evaluatePost(postData) {
    // Execute all evaluation modules
    const [claimsResult, aiResult, sourceResult, imageResult, accountResult] = await Promise.all([
      claimExtractor.extractClaims(postData),
      aiTextDetector.detect(postData),
      Promise.resolve(sourceVerifier.verifySources(postData)),
      Promise.resolve(imageAnalyzer.analyze(postData)),
      Promise.resolve(accountAnalyzer.analyze(postData))
    ]);

    // Lead & Engagement Specific Analysis
    const leadResult = leadVerifier.verifyLeadsAndEngagement(postData);

    // Score 1: 💬 Community Engagement Score (0-100)
    // Combines leadResult.engagementScore (60%) + account trust (20%) + organic indicators (20%)
    const engagementScore = Math.round(
      (leadResult.engagementScore * 0.60) +
      (accountResult.accountScore * 0.20) +
      (aiResult.aiScore * 0.20)
    );

    // Score 2: 🎯 Factual & Lead Truthfulness Score (0-100)
    // Combines leadResult.leadTruthfulnessScore (40%) + claims verifiability (30%) + source trust (30%)
    const leadTruthfulnessScore = Math.round(
      (leadResult.leadTruthfulnessScore * 0.40) +
      (claimsResult.verifiabilityScore * 0.30) +
      (sourceResult.sourceScore * 0.30)
    );

    // Overall Combined Score (Average of the two highlighted primary scores)
    const overallScore = Math.round((engagementScore + leadTruthfulnessScore) / 2);

    let trustRating = 'MODERATE';
    let badgeColor = '#3b82f6';

    if (overallScore >= 80) {
      trustRating = 'HIGH TRUST';
      badgeColor = '#10b981'; // Green
    } else if (overallScore >= 60) {
      trustRating = 'MODERATE TRUST';
      badgeColor = '#3b82f6'; // Blue
    } else if (overallScore >= 40) {
      trustRating = 'SUSPICIOUS / UNVERIFIED';
      badgeColor = '#f97316'; // Orange
    } else {
      trustRating = 'HIGH RISK / MISLEADING';
      badgeColor = '#ef4444'; // Red
    }

    // Collect Key Flags
    const keyFlags = [];
    leadResult.engagementFlags.forEach(f => keyFlags.push({ type: 'warning', text: f }));
    leadResult.leadFlags.forEach(f => keyFlags.push({ type: 'danger', text: f }));

    if (aiResult.isLikelyAI) {
      keyFlags.push({ type: 'danger', text: 'Text displays strong AI language model generation markers' });
    }
    if (sourceResult.suspiciousCount > 0) {
      keyFlags.push({ type: 'danger', text: `${sourceResult.suspiciousCount} suspicious or obfuscated link(s) detected` });
    }
    if (sourceResult.trustedCount > 0) {
      keyFlags.push({ type: 'success', text: `Contains references to ${sourceResult.trustedCount} high-credibility external domain(s)` });
    }

    return {
      postId: postData.id || `post_${Date.now()}`,
      title: postData.title,
      overallScore,
      trustRating,
      badgeColor,
      evaluatedAt: new Date().toISOString(),

      // TWO PRIMARY HIGHLIGHTED SCORES
      primaryScores: {
        communityEngagement: {
          score: engagementScore,
          rating: leadResult.engagementTrust,
          summary: leadResult.engagementFlags.length > 0 ? leadResult.engagementFlags.join(', ') : 'Organic community post with natural discussion signals'
        },
        leadTruthfulness: {
          score: leadTruthfulnessScore,
          rating: leadResult.leadTrust,
          summary: leadResult.leadFlags.length > 0 ? leadResult.leadFlags.join(', ') : 'Content claims appear factual without obvious false leads'
        }
      },

      vectorBreakdown: {
        claims: {
          score: claimsResult.verifiabilityScore,
          summary: claimsResult.summary,
          extractedClaims: claimsResult.claims
        },
        aiText: {
          score: aiResult.aiScore,
          aiProbability: aiResult.aiProbability,
          isLikelyAI: aiResult.isLikelyAI,
          indicators: aiResult.indicators,
          explanation: aiResult.explanation
        },
        sources: {
          score: sourceResult.sourceScore,
          summary: sourceResult.summary,
          linkDetails: sourceResult.details
        },
        imageMedia: {
          score: imageResult.imageScore,
          hasImages: imageResult.hasImages,
          summary: imageResult.summary,
          flags: imageResult.flags
        },
        account: {
          score: accountResult.accountScore,
          trustLevel: accountResult.trustLevel,
          summary: accountResult.summary,
          details: accountResult.details
        }
      },
      keyFlags
    };
  }
}

module.exports = new ScoringEngine();
