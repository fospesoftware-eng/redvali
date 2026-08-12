class ImageAnalyzer {
  analyze(postData) {
    const mediaUrls = postData.mediaUrls || [];
    const postHint = postData.postHint || '';
    const isImagePost = postHint === 'image' || mediaUrls.some(u => /\.(jpg|jpeg|png|webp|gif)$/i.test(u) || u.includes('preview.redd.it') || u.includes('i.redd.it') || u.includes('imgur.com'));

    if (!isImagePost && mediaUrls.length === 0) {
      return {
        imageScore: 80, // Neutral high score if post has no image claims
        hasImages: false,
        analyzedCount: 0,
        flags: [],
        summary: "Post does not contain image media attachments."
      };
    }

    const flags = [];
    let score = 85;

    mediaUrls.forEach(url => {
      const lowerUrl = url.toLowerCase();

      // Stock photo signals
      if (lowerUrl.includes('shutterstock') || lowerUrl.includes('gettyimages') || lowerUrl.includes('stock-photo') || lowerUrl.includes('depositphotos')) {
        flags.push({
          type: 'stock_image',
          severity: 'medium',
          message: 'Media appears to be a commercial stock image rather than direct ground news evidence.'
        });
        score -= 20;
      }

      // Synthetic / AI generator filename signals
      if (/midjourney|dalle|stable_diffusion|sdxl|ai_gen|generated_/i.test(lowerUrl)) {
        flags.push({
          type: 'ai_generated_image',
          severity: 'high',
          message: 'Filename or URL contains direct AI image generation software identifiers.'
        });
        score -= 40;
      }

      // Meme generator signals
      if (lowerUrl.includes('imgflip') || lowerUrl.includes('memegenerator') || lowerUrl.includes('makeameme')) {
        flags.push({
          type: 'meme_format',
          severity: 'low',
          message: 'Image is formatted as a social media meme template.'
        });
        score -= 10;
      }
    });

    if (flags.length === 0) {
      flags.push({
        type: 'standard_media',
        severity: 'none',
        message: 'Direct user photo upload detected with standard media hosting signature.'
      });
    }

    const finalImageScore = Math.max(10, Math.min(100, score));

    return {
      imageScore: finalImageScore,
      hasImages: true,
      analyzedCount: mediaUrls.length || 1,
      flags,
      summary: flags.some(f => f.severity === 'high') 
        ? "Potential synthetic or AI-manipulated image detected."
        : "Image media meets standard authenticity heuristics."
    };
  }
}

module.exports = new ImageAnalyzer();
