const scoringEngine = require('../services/scoringEngine');

async function testBackendEngine() {
  console.log('Testing Reddit Validator Backend Scoring Engine...\n');

  const testPayload = {
    id: 't3_sample123',
    title: 'New study shows breakthrough 95% cure rate in clinical trials according to Reuters report',
    body: 'In summary, this pivotal research provides a testament to scientific innovation. Delve into the details of the tapestry of modern medicine. Learn more at https://reuters.com/article/sample-health and http://bit.ly/suspicious-shortener',
    author: 'RedditFactChecker',
    authorKarma: { postKarma: 4500, commentKarma: 8200, total: 12700 },
    authorAccountAgeDays: 450,
    links: ['https://reuters.com/article/sample-health', 'http://bit.ly/suspicious-shortener'],
    mediaUrls: ['https://i.redd.it/sample_photo.jpg']
  };

  const report = await scoringEngine.evaluatePost(testPayload);
  console.log('==================================================');
  console.log('EVALUATION REPORT RESULT:');
  console.log('==================================================');
  console.log(`Title: "${report.title}"`);
  console.log(`Overall Authenticity Score: ${report.overallScore}/100`);
  console.log(`Trust Rating: ${report.trustRating}`);
  console.log(`Risk Level: ${report.riskLevel}`);
  console.log('\nVector Breakdown:');
  console.dir(report.vectorBreakdown, { depth: 3 });
  console.log('\nKey Flags:', report.keyFlags);
}

testBackendEngine().catch(console.error);
