const URL = require('url').URL;

class SourceVerifier {
  verifySources(postData) {
    const links = postData.links || [];
    const text = `${postData.title || ''} ${postData.body || ''}`;
    
    // Extract any additional URLs in text if not explicitly provided
    const extractedUrls = this.extractUrlsFromText(text);
    const allUrls = Array.from(new Set([...links, ...extractedUrls]));

    if (allUrls.length === 0) {
      // Dynamic non-link evaluation based on post intent
      let sourceScore = 75; // Default clean internal discussion
      let summary = "Clean internal discussion post without external links.";

      const dmTrapRegex = /\b(dm me|message me|send me a dm|drop a comment for link|link in bio|check my profile)\b/i;
      const questionRegex = /\b(how to|ideas|advice|tips|help|seeking|question|anyone know|what is|why does)\b/i;

      if (dmTrapRegex.test(text)) {
        sourceScore = 40;
        summary = "No links in post, but directs users to DMs/profile for hidden lead capture.";
      } else if (questionRegex.test(text)) {
        sourceScore = 82;
        summary = "Organic question post seeking community input (no external links needed).";
      } else if (postData.mediaUrls && postData.mediaUrls.length > 0) {
        sourceScore = 80;
        summary = "Includes direct Reddit media/image attachments.";
      }

      return {
        sourceScore,
        linkCount: 0,
        trustedCount: 0,
        suspiciousCount: 0,
        details: [],
        summary
      };
    }

    const details = [];
    let trustedCount = 0;
    let suspiciousCount = 0;
    let totalScorePoints = 0;

    const highTrustDomains = [
      'reuters.com', 'apnews.com', 'bbc.com', 'bbc.co.uk', 'nature.com',
      'sciencemag.org', 'science.org', 'wikipedia.org', 'arxiv.org',
      'bloomberg.com', 'wsj.com', 'nytimes.com', 'theguardian.com',
      'npr.org', 'nih.gov', 'cdc.gov', 'who.int', 'nasa.gov', 'github.com'
    ];

    const lowTrustPatterns = [
      /bit\.ly/, /tinyurl\.com/, /t\.co/, /is\.gd/, /goo\.gl/,
      /free-money/i, /crypto-gain/i, /miracle-cure/i, /truth-exposed/i,
      /telegram\.me/, /t\.me/, /typeform\.com/, /calendly\.com/
    ];

    allUrls.forEach(urlStr => {
      try {
        const parsed = new URL(urlStr);
        const domain = parsed.hostname.toLowerCase().replace(/^www\./, '');
        const isHttps = parsed.protocol === 'https:';

        let rating = 'neutral';
        let trustValue = 65;
        let note = 'Standard external link';

        // Check TLD
        if (domain.endsWith('.gov') || domain.endsWith('.edu')) {
          rating = 'high';
          trustValue = 95;
          note = 'Official government or educational institution domain';
          trustedCount++;
        } else if (highTrustDomains.some(d => domain === d || domain.endsWith('.' + d))) {
          rating = 'high';
          trustValue = 90;
          note = 'Verified high-credibility news/research organization';
          trustedCount++;
        } else if (lowTrustPatterns.some(pattern => pattern.test(urlStr))) {
          rating = 'suspicious';
          trustValue = 25;
          note = 'URL shortener, lead form, or suspicious domain pattern';
          suspiciousCount++;
        } else if (!isHttps) {
          rating = 'caution';
          trustValue = 45;
          note = 'Insecure HTTP connection';
        }

        totalScorePoints += trustValue;
        details.push({
          url: urlStr,
          domain,
          rating,
          trustValue,
          note
        });
      } catch (err) {
        details.push({
          url: urlStr,
          domain: 'invalid',
          rating: 'suspicious',
          trustValue: 20,
          note: 'Malformed URL structure'
        });
        suspiciousCount++;
        totalScorePoints += 20;
      }
    });

    const averageTrust = Math.round(totalScorePoints / allUrls.length);
    let finalSourceScore = averageTrust;

    // Bonus for high ratio of trusted links
    if (trustedCount > 0 && suspiciousCount === 0) {
      finalSourceScore = Math.min(100, finalSourceScore + 10);
    } else if (suspiciousCount > 0) {
      finalSourceScore = Math.max(10, finalSourceScore - (suspiciousCount * 15));
    }

    return {
      sourceScore: finalSourceScore,
      linkCount: allUrls.length,
      trustedCount,
      suspiciousCount,
      details,
      summary: `Analyzed ${allUrls.length} external source link(s). ${trustedCount} high-trust, ${suspiciousCount} flagged.`
    };
  }

  extractUrlsFromText(text) {
    const urlRegex = /(https?:\/\/[^\s<>"{}|\\^`]+)/gi;
    const matches = text.match(urlRegex) || [];
    return matches;
  }
}

module.exports = new SourceVerifier();
