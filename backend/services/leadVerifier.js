/**
 * Evaluates Community Engagement Authenticity vs Covert Self-Promotion
 * & Factual Lead Truthfulness vs False Leads / Exaggerated Claims / Trading Scams
 */
class LeadVerifier {
  verifyLeadsAndEngagement(postData) {
    const text = `${postData.title || ''}\n\n${postData.body || ''}`;
    const links = postData.links || [];
    
    const engagementFlags = [];
    const leadFlags = [];

    let engagementScore = 80;
    let leadTruthfulnessScore = 75;

    // 1. Unverified High-Profit / Trading Earnings Brag ($33,000+, $10k in 10 mins, etc.)
    const tradingScamRegex = /\b(made over|made|earned|profit|gained)\s*\$?\d{1,3}(?:,\d{3})*|\$\d+\+?\s*(?:trading|crypto|fx|options|forex|stock|per day|a day|in \d+ mins|less than \d+ minutes)/i;
    const titleScamMatch = text.match(tradingScamRegex) || postData.title.match(/\$\d+[\d,]*\+?/);
    const tradingContext = /\b(trading|trader|crypto|options|scalping|forex|p&l|pnl|strategy|indicator|win rate|exact system|daily profit)\b/i.test(text);

    if (titleScamMatch && tradingContext) {
      leadTruthfulnessScore -= 55;
      leadFlags.push('⚠️ Unverified High Earnings Brag: Claims rapid trading/financial profits ($33,000+ assertion without third-party audit)');
    }

    // 2. "Heres the Exact System:" / Course / Signals Funnel Pitch
    const exactSystemRegex = /\b(heres the exact system|exact strategy|secret formula|blueprint|exact setup|heres how i|my exact system|free course|join my discord|dm for signals)[:!]?/i;
    if (exactSystemRegex.test(text) || (tradingContext && postData.title.trim().endsWith(':'))) {
      engagementScore -= 50;
      engagementFlags.push('🚨 Covert Funnel Pitch: Uses "Exact System" teaser layout to lure users into trading courses/signals DMs');
    }

    // 3. Sensationalized "Less Than 10 Minutes a Day" Low-Effort Claims
    const lowEffortClaim = /\b(less than \d+ minutes|10 minutes a day|5 mins a day|automated bot|passive income|guaranteed profit|zero risk|no effort)\b/i;
    if (lowEffortClaim.test(text)) {
      leadTruthfulnessScore -= 30;
      leadFlags.push('⚠️ Sensationalized "Less Than 10 Mins a Day" Low-Effort Profit Promise');
    }

    // 4. Check for Standard Covert Self-Promotion & Lead Capture
    const selfPromoRegex = /\b(dm me|pm me|link in bio|check out my|launching my|built a tool|my app|vibe coded|waitlist|pre-launch)\b/i;
    if (selfPromoRegex.test(text) && !exactSystemRegex.test(text)) {
      engagementScore -= 25;
      engagementFlags.push('Contains self-promotional plug or product launch pitch');
    }

    const dmTrapRegex = /\b(dm me for|send me a message for|drop a comment and i'll send|comment below to get)\b/i;
    if (dmTrapRegex.test(text)) {
      engagementScore -= 30;
      engagementFlags.push('DM Lead Trap: Asks users to comment/DM to receive links or resources');
    }

    // 5. Standard MRR Brag check
    const mrrBragRegex = /\$(\d{1,3}(?:,\d{3})*|\d+)\s*(?:mrr|arr|per month|\/mo|in \d+ (?:days|weeks|months))/i;
    const matchMrr = text.match(mrrBragRegex);
    if (matchMrr && !titleScamMatch) {
      const claimedAmountStr = matchMrr[1].replace(/,/g, '');
      const hasProofLink = links.some(url => /stripe\.com|open\.spotify|github\.com|indiehackers\.com/i.test(url));
      
      if (!hasProofLink) {
        leadTruthfulnessScore -= 35;
        leadFlags.push(`Unverified Financial Metric: Claims $${claimedAmountStr} MRR without public proof link or open metrics`);
      } else {
        leadTruthfulnessScore += 10;
        leadFlags.push('Financial claim supported by third-party verification or open metric link');
      }
    }

    // Organic Community Discussion Indicators (Boosts)
    const questionRegex = /\?(?=\s|$)/g;
    const questionMatches = text.match(questionRegex) || [];
    if (questionMatches.length >= 2 && text.length > 100 && !selfPromoRegex.test(text) && !tradingContext) {
      engagementScore += 15;
      engagementFlags.push('Organic community question asking for discussion & genuine advice');
    }

    const finalEngagementScore = Math.max(10, Math.min(100, engagementScore));
    const finalLeadTruthfulnessScore = Math.max(10, Math.min(100, leadTruthfulnessScore));

    return {
      engagementScore: finalEngagementScore,
      leadTruthfulnessScore: finalLeadTruthfulnessScore,
      engagementTrust: finalEngagementScore >= 75 ? 'ORGANIC COMMUNITY' : finalEngagementScore >= 50 ? 'MODERATE PROMO' : 'HIGH SPAM / COVERT FUNNEL',
      leadTrust: finalLeadTruthfulnessScore >= 75 ? 'GENUINE CONTENT' : finalLeadTruthfulnessScore >= 50 ? 'UNVERIFIED CLAIMS' : 'FALSE LEADS / MISLEADING',
      engagementFlags,
      leadFlags
    };
  }
}

module.exports = new LeadVerifier();
