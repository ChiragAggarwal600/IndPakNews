const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const sentiment = require('sentiment');
const moment = require('moment');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Cache for news data to reduce API calls
let newsCache = {
  data: null,
  lastFetched: null,
};

// Helper function to categorize article
function categorizeArticle(text) {
  const categories = {
    military: [
      'military', 'army', 'defense', 'weapons', 'troops', 'soldier', 
      'war', 'combat', 'attack', 'missile', 'security force', 'border', 
      'terrorist', 'airforce', 'navy', 'artillery', 'ceasefire'
    ],
    diplomatic: [
      'diplomatic', 'talks', 'embassy', 'minister', 'peace', 'treaty',
      'negotiate', 'relation', 'dialogue', 'summit', 'delegation', 
      'diplomat', 'foreign', 'agreement', 'bilateral', 'cooperation'
    ],
    economic: [
      'trade', 'sanctions', 'economy', 'business', 'market', 'export',
      'import', 'investment', 'economic', 'finance', 'commerce',
      'tariff', 'stock', 'currency', 'inflation', 'gdp', 'fiscal'
    ],
    social: [
      'cultural', 'people', 'society', 'civilian', 'humanitarian',
      'refugee', 'education', 'health', 'religion', 'festival',
      'tradition', 'community', 'social', 'public', 'citizen'
    ]
  };

  const scores = {
    military: 0,
    diplomatic: 0,
    economic: 0,
    social: 0
  };

  const textLower = text.toLowerCase();
  
  // Weight each category based on keyword appearances
  for (const [category, keywords] of Object.entries(categories)) {
    scores[category] = keywords.reduce((score, keyword) => {
      const regex = new RegExp(keyword, 'gi');
      const matches = textLower.match(regex);
      return score + (matches ? matches.length : 0);
    }, 0);
  }
  
  // Find the category with the highest score
  let maxCategory = 'other';
  let maxScore = 0;
  
  for (const [category, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      maxCategory = category;
    }
  }
  
  // If no strong categorization found, return 'other'
  return maxScore > 0 ? maxCategory : 'other';
}

// Helper function to determine if article is high priority
function isPriorityArticle(text, category, sentiment) {
  const highPriorityKeywords = [
    'attack', 'war', 'missile', 'conflict', 'crisis', 'military', 
    'border', 'violated', 'threat', 'army', 'defense', 'security',
    'nuclear', 'weapon', 'terrorism', 'tension', 'dispute'
  ];
  
  const containsHighPriorityKeyword = highPriorityKeywords.some(keyword => 
    text.toLowerCase().includes(keyword)
  );
  
  return (
    (category === 'military' && containsHighPriorityKeyword) || 
    (category === 'diplomatic' && sentiment < -2) ||
    (containsHighPriorityKeyword && sentiment < -3)
  );
}

// Calculate analytics from articles
function calculateAnalytics(articles) {
  if (!articles || articles.length === 0) {
    return null;
  }
  
  // Category distribution
  const categories = {
    military: articles.filter(a => a.category === 'military').length,
    diplomatic: articles.filter(a => a.category === 'diplomatic').length,
    economic: articles.filter(a => a.category === 'economic').length,
    social: articles.filter(a => a.category === 'social').length,
    other: articles.filter(a => a.category === 'other').length
  };
  
  // Sentiment distribution
  const sentimentCounts = {
    positive: articles.filter(a => a.sentiment > 0).length,
    neutral: articles.filter(a => a.sentiment === 0).length,
    negative: articles.filter(a => a.sentiment < 0).length
  };
  
  // Timeline data - group articles by date
  const byDate = {};
  articles.forEach(article => {
    const date = moment(article.publishedAt).format('YYYY-MM-DD');
    if (!byDate[date]) {
      byDate[date] = { count: 0, military: 0, diplomatic: 0, economic: 0, social: 0 };
    }
    byDate[date].count++;
    byDate[date][article.category]++;
  });
  
  const timelineData = Object.entries(byDate)
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => moment(a.date).diff(moment(b.date)));
  
  // Trending keywords
  const keywords = {};
  const excludedWords = ['the', 'and', 'of', 'in', 'to', 'a', 'is', 'for', 'on', 'with', 'as', 'at', 'by'];
  
  articles.forEach(article => {
    const text = (article.title + ' ' + article.description).toLowerCase();
    const words = text.split(/\s+/).filter(word => 
      word.length > 3 && 
      !excludedWords.includes(word) && 
      !/^\d+$/.test(word)
    );
    
    words.forEach(word => {
      keywords[word] = (keywords[word] || 0) + 1;
    });
  });
  
  const trendingKeywords = Object.entries(keywords)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word, count]) => ({ word, count }));
  
  // Key insights
  const mostRecent = [...articles].sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))[0];
  const mostNegative = [...articles].sort((a, b) => a.sentiment - b.sentiment)[0];
  const mostPositive = [...articles].sort((a, b) => b.sentiment - a.sentiment)[0];
  
  // Crisis level
  const crisisLevel = assessCrisisLevel(articles);
  
  // Significant events detection
  const significantEvents = articles.filter(article => 
    (article.category === 'military' && article.sentiment < -3) || 
    (article.category === 'diplomatic' && article.sentiment < -4)
  ).map(article => ({
    title: article.title,
    date: article.publishedAt,
    category: article.category,
    sentiment: article.sentiment,
    source: article.source.name,
    url: article.url
  }));
  
  return {
    categories,
    sentimentCounts,
    timelineData,
    trendingKeywords,
    keyInsights: {
      mostRecent: mostRecent ? {
        title: mostRecent.title,
        date: mostRecent.publishedAt,
        source: mostRecent.source.name
      } : null,
      mostNegative: mostNegative ? {
        title: mostNegative.title,
        sentiment: mostNegative.sentiment,
        category: mostNegative.category
      } : null,
      mostPositive: mostPositive ? {
        title: mostPositive.title,
        sentiment: mostPositive.sentiment,
        category: mostPositive.category
      } : null
    },
    crisisLevel,
    significantEvents,
    lastUpdated: new Date()
  };
}

// Crisis level assessment
function assessCrisisLevel(articles) {
  if (!articles || articles.length === 0) return 'normal';
  
  // Count negative military/diplomatic articles in the last 48 hours
  const recentArticles = articles.filter(a => 
    moment().diff(moment(a.publishedAt), 'hours') < 48);
  
  const negativeMilitaryCount = recentArticles.filter(a => 
    a.category === 'military' && a.sentiment < -2).length;
  
  const negativeDiplomaticCount = recentArticles.filter(a => 
    a.category === 'diplomatic' && a.sentiment < -2).length;
  
  if (negativeMilitaryCount >= 5 || (negativeMilitaryCount + negativeDiplomaticCount) >= 8) {
    return 'severe';
  } else if (negativeMilitaryCount >= 3 || (negativeMilitaryCount + negativeDiplomaticCount) >= 5) {
    return 'elevated';
  } else if (negativeMilitaryCount >= 1 || negativeDiplomaticCount >= 2) {
    return 'moderate';
  }
  
  return 'normal';
}

// News API endpoint
app.get('/api/news', async (req, res) => {
  try {
    console.log('Checking news cache...');
    const now = new Date();
    
    // Return cached data if it's less than 15 minutes old
    if (newsCache.data && newsCache.lastFetched && 
        (now - newsCache.lastFetched) < 15 * 60 * 1000) {
      console.log('Returning cached news data');
      return res.json(newsCache.data);
    }
    
    console.log('Fetching fresh news data...');
    
    // Use GNews API (free tier available)
    const apiKey = process.env.GNEWS_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'API key not configured' });
    }
    
    const url = `https://gnews.io/api/v4/search?q=India%20Pakistan&lang=en&max=40&token=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (!data.articles) {
      console.error('No articles in API response:', data);
      return res.status(500).json({ error: 'Invalid API response' });
    }
    
    // Process and analyze articles
    const sentimentAnalyzer = new sentiment();
    const processedArticles = data.articles.map(article => {
      const description = article.description || '';
      const textToAnalyze = article.title + ' ' + description;
      const sentimentScore = sentimentAnalyzer.analyze(textToAnalyze);
      const category = categorizeArticle(textToAnalyze);
      
      return {
        ...article,
        urlToImage: article.image,
        publishedAt: article.publishedAt,
        sentiment: sentimentScore.score,
        sentimentDetail: {
          score: sentimentScore.score,
          comparative: sentimentScore.comparative,
          positive: sentimentScore.positive,
          negative: sentimentScore.negative
        },
        category,
        isPriority: isPriorityArticle(textToAnalyze, category, sentimentScore.score)
      };
    });
    
    const analytics = calculateAnalytics(processedArticles);
    const processedResponse = {
      articles: processedArticles,
      analytics: analytics
    };
    
    // Update cache
    newsCache.data = processedResponse;
    newsCache.lastFetched = now;
    
    console.log(`Successfully fetched ${processedArticles.length} articles`);
    return res.json(processedResponse);
  } catch (err) {
    console.error('Error details:', err);
    return res.status(500).json({ 
      error: 'Failed to fetch news data',
      details: err.message
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('GNews API Key status:', process.env.GNEWS_API_KEY ? 'Present' : 'Missing');
});
