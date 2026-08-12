/**
 * Evaluates Community Engagement Authenticity vs Covert Self-Promotion
 * & Factual Lead Truthfulness vs False Leads / Exaggerated Claims
 */
class LeadVerifier {
  verifyLeadsAndEngagement(postData) {
    const text = `${postData.title || ''}\n\n${postData.body || ''}`;
    const links = postData.links || [];
    
    const engagementFlags = [];
    const leadFlags = [];

    let engagementScore = 80;
    let leadTruthfulnessScore = 75;

    // 1. Check for Covert Self-Promotion & Lead Capture (Community Engagement)
    const selfPromoRegex = /\b(dm me|pm me|link in bio|check out my|launching my|built a tool|my app|vibe coded|waitlist|pre-launch)\b/i;
    if (selfPromoRegex.test(text)) {
      engagementScore -= 25;
      engagementFlags.push('Contains self-promotional plug or product launch pitch');
    }

    const dmTrapRegex = /\b(dm me for|send me a message for|drop a comment and i'll send|comment below to get)\b/i;
    if (dmTrapRegex.test(text)) {
      engagementScore -= 30;
      engagementFlags.push('DM Lead Trap: Asks users to comment/DM to receive links or resources');
    }

    // 2. Check for False Leads & Exaggerated Claims (Factual Lead Truthfulness)
    const mrrBragRegex = /\$(\d{1,3}(?:,\d{3})*|\d+)\s*(?:mrr|arr|per month|\/mo|in \d+ (?:days|weeks|months))/i;
    const matchMrr = text.match(mrrBragRegex);
    if (matchMrr) {
      // Post claims specific MRR / revenue numbers
      const claimedAmountStr = matchMrr[1].replace(/,/g, '');
      const claimedAmount = parseInt(claimedAmountStr, 10);

      // Check if verifiable proof links exist (Stripe, Open Startup, GitHub, etc.)
      const hasProofLink = links.some(url => /stripe\.com|open\.spotify|github\.com|indiehackers\.com/i.test(url));
      
      if (!hasProofLink) {
        leadTruthfulnessScore -= 35;
        leadFlags.push(`Unverified Financial Metric: Claims $${claimedAmountStr} MRR without public proof link or open metrics`);
      } else {
        leadTruthfulnessScore += 10;
        leadFlags.push('Financial claim supported by third-party verification or open metric link');
      }
    }

    // Buzzword / Exaggerated "Get Users Quick" claims
    const hypeRegex = /\b(make \$|easy money|0 to \$\d+|guaranteed leads|secret growth hack|automate linkedin|passive income)\b/i;
    if (hypeRegex.test(text)) {
      leadTruthfulnessScore -= 25;
      leadFlags.push('Sensationalized marketing claims or "get users quick" growth hack pitch');
    }

    // Organic Community Discussion Indicators (Boosts)
    const questionRegex = /\?(?=\s|$)/g;
    const questionMatches = text.match(questionRegex) || [];
    if (questionMatches.length >= 2 && text.length > 100 && !selfPromoRegex.test(text)) {
      engagementScore += 15;
      engagementFlags.push('Organic community question asking for discussion & genuine advice');
    }

    const finalEngagementScore = Math.max(10, Math.min(100, engagementScore));
    const finalLeadTruthfulnessScore = Math.max(10, Math.min(100, leadTruthfulnessScore));

    return {
      engagementScore: finalEngagementScore,
      leadTruthfulnessScore: finalLeadTruthfulnessScore,
      engagementTrust: finalEngagementScore >= 75 ? 'ORGANIC COMMUNITY' : finalEngagementScore >= 50 ? 'MODERATE PROMO' : 'HIGH SPAM / LEAD TRAP',
      leadTrust: finalLeadTruthfulnessScore >= 75 ? 'GENUINE CONTENT' : finalLeadTruthfulnessScore >= 50 ? 'UNVERIFIED CLAIMS' : 'FALSE LEADS / MISLEADING',
      engagementFlags,
      leadFlags
    };
  }
}

module.exports = new LeadVerifier();
