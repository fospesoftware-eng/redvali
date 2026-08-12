class AccountAnalyzer {
  analyze(postData) {
    const author = postData.author || '[unknown]';
    const authorKarma = postData.authorKarma || { postKarma: null, commentKarma: null, total: null };
    const accountAgeDays = postData.authorAccountAgeDays || null;

    if (author === '[deleted]' || author === '[unknown]') {
      return {
        accountScore: 35,
        trustLevel: 'low',
        flags: ['Author account deleted or anonymized'],
        details: { author, totalKarma: 0, accountAgeDays: 0 },
        summary: 'Author account is deleted or unavailable.'
      };
    }

    let score = 75;
    const flags = [];

    const totalKarma = (authorKarma.total !== null && authorKarma.total !== undefined)
      ? authorKarma.total
      : ((authorKarma.postKarma || 0) + (authorKarma.commentKarma || 0));

    // High total karma boost
    if (totalKarma > 50000) {
      score += 15;
      flags.push('Established Reddit user with extensive account history (>50k karma)');
    } else if (totalKarma > 5000) {
      score += 10;
      flags.push('Active community member with established karma (>5k karma)');
    } else if (totalKarma < 100 && totalKarma > 0) {
      score -= 20;
      flags.push('Low overall account karma (<100 total karma)');
    } else if (totalKarma === 0) {
      score -= 30;
      flags.push('Zero karma account (potential burner or newly spawned bot)');
    }

    // Karma Ratio anomaly check (e.g., 20,000 post karma, 2 comment karma -> Content Farm Bot pattern)
    if (authorKarma.postKarma > 10000 && authorKarma.commentKarma < 50) {
      score -= 25;
      flags.push('Unusual Karma Ratio: Very high post karma with minimal comment karma (Automated Content Farm profile pattern)');
    }

    // Account Age check
    if (accountAgeDays !== null) {
      if (accountAgeDays < 7) {
        score -= 35;
        flags.push('Brand new Reddit account created within the last 7 days');
      } else if (accountAgeDays < 30) {
        score -= 15;
        flags.push('Recent account registered within the last 30 days');
      } else if (accountAgeDays > 365) {
        score += 10;
        flags.push('Account over 1 year old');
      }
    }

    const finalAccountScore = Math.max(10, Math.min(100, score));

    let trustLevel = 'moderate';
    if (finalAccountScore >= 80) trustLevel = 'high';
    if (finalAccountScore <= 45) trustLevel = 'low';

    return {
      accountScore: finalAccountScore,
      trustLevel,
      flags,
      details: {
        author,
        totalKarma,
        postKarma: authorKarma.postKarma,
        commentKarma: authorKarma.commentKarma,
        accountAgeDays
      },
      summary: `Account analysis for u/${author}: Trust level ${trustLevel.toUpperCase()} (${finalAccountScore}/100).`
    };
  }
}

module.exports = new AccountAnalyzer();
