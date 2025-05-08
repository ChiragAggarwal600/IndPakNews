const express = require("express");
const NewsAPI = require('newsapi');
const cors = require("cors");
const sentiment = require('sentiment');
require('dotenv').config();

const app = express();
const PORT = 3000;

// Initialize NewsAPI
const newsapi = new NewsAPI(process.env.NEWS_API_KEY);
const sentimentAnalyzer = new sentiment();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Simple cache
let newsCache = {
    data: null,
    lastFetched: null
};

app.get("/api/news", async (req, res) => {
    try {
        console.log('Checking news cache...');
        const now = new Date();
        
        // Return cached data if valid
        if (newsCache.data && newsCache.lastFetched && 
            (now - newsCache.lastFetched) < 30 * 60 * 1000) {
            console.log('Returning cached news data');
            return res.json(newsCache.data);
        }

        console.log('Fetching fresh news data...');
        const response = await newsapi.v2.everything({
            q: 'India Pakistan',
            language: 'en',
            sortBy: 'publishedAt',
            pageSize: 20
        });

        if (!response.articles) {
            console.error('No articles in API response:', response);
            return res.status(500).json({ error: "Invalid API response" });
        }

        // Process articles
        const processedArticles = response.articles.map(article => {
            const sentimentScore = sentimentAnalyzer.analyze(article.title + ' ' + article.description);
            const category = categorizeArticle(article.title + ' ' + article.description);
            
            return {
                ...article,
                sentiment: sentimentScore.score,
                category
            };
        });

        const processedResponse = {
            ...response,
            articles: processedArticles
        };

        // Update cache
        newsCache.data = processedResponse;
        newsCache.lastFetched = now;

        console.log(`Successfully fetched ${processedArticles.length} articles`);
        res.json(processedResponse);

    } catch (err) {
        console.error('Error details:', err);
        res.status(500).json({ 
            error: "Failed to fetch news data",
            details: err.message
        });
    }
});

// Helper function to categorize articles
function categorizeArticle(text) {
    const categories = {
        military: ['military', 'army', 'defense', 'weapons', 'troops'],
        diplomatic: ['diplomatic', 'talks', 'embassy', 'minister', 'peace'],
        economic: ['trade', 'sanctions', 'economy', 'business', 'market'],
        social: ['cultural', 'people', 'society', 'civilian', 'humanitarian']
    };

    let maxCategory = 'other';
    let maxCount = 0;

    for (const [category, keywords] of Object.entries(categories)) {
        const count = keywords.filter(keyword => 
            text.toLowerCase().includes(keyword)).length;
        if (count > maxCount) {
            maxCount = count;
            maxCategory = category;
        }
    }

    return maxCategory;
}

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Global error handler:', err);
    res.status(500).json({
        error: "Internal server error",
        details: err.message
    });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log('API Key status:', process.env.NEWS_API_KEY ? 'Present' : 'Missing');
});
