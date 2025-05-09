const { useState, useEffect, useCallback } = React;

// Chart.js components
const { 
    Chart, 
    ArcElement, 
    LineElement, 
    BarElement, 
    PointElement, 
    LineController, 
    BarController, 
    ScatterController, 
    CategoryScale, 
    LinearScale, 
    TimeScale, 
    Title, 
    Tooltip, 
    Legend 
} = window.Chart;

// Register Chart.js components
Chart.register(
    ArcElement, 
    LineElement, 
    BarElement, 
    PointElement, 
    LineController, 
    BarController, 
    ScatterController, 
    CategoryScale, 
    LinearScale, 
    TimeScale, 
    Title, 
    Tooltip, 
    Legend
);

// Main App Component
function App() {
  // 1. All state declarations first - in the same order for every render
  const [news, setNews] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [darkMode, setDarkMode] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [timelineView, setTimelineView] = useState(false);
  const [notificationShown, setNotificationShown] = useState(false);
  const [bookmarks, setBookmarks] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);
  
  // 2. Define callbacks used in effects, so we can control their dependencies
  const showNotification = useCallback((message) => {
    if ('Notification' in window) {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          new Notification('India-Pakistan News Alert', {
            body: message,
            icon: 'https://flagcdn.com/w320/in.png'
          });
        }
      });
    }
  }, []);

  // 3. Define the fetch news function as a callback
  const fetchNews = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:3000/api/news');
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch news');
      }
      
      const data = await response.json();
      
      if (data.articles) {
        setNews(data.articles);
        setAnalytics(data.analytics);
        setLastUpdated(new Date());
        
        // Show notification for high priority articles
        const highPriorityArticles = data.articles.filter(article => article.isPriority);
        
        if (highPriorityArticles.length > 0 && !notificationShown) {
          showNotification(`${highPriorityArticles.length} high priority updates available`);
          setNotificationShown(true);
        }
      } else {
        setError('No news articles found');
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch news');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [notificationShown, showNotification]);

  // 4. All useEffects in a consistent order for every render
  
  // Dark mode effect
  useEffect(() => {
    if (darkMode) {
      document.documentElement.setAttribute('data-bs-theme', 'dark');
      document.body.classList.add('dark');
    } else {
      document.documentElement.setAttribute('data-bs-theme', 'light');
      document.body.classList.remove('dark');
    }
  }, [darkMode]);
  
  // Load bookmarks from localStorage
  useEffect(() => {
    const savedBookmarks = localStorage.getItem('newsBookmarks');
    if (savedBookmarks) {
      try {
        setBookmarks(JSON.parse(savedBookmarks));
      } catch (e) {
        console.error('Failed to parse bookmarks', e);
        // In case of corrupted data, reset bookmarks
        localStorage.removeItem('newsBookmarks');
      }
    }
  }, []);
  
  // Save bookmarks to localStorage when updated
  useEffect(() => {
    localStorage.setItem('newsBookmarks', JSON.stringify(bookmarks));
  }, [bookmarks]);
  
  // Fetch news data on load and periodically
  useEffect(() => {
    fetchNews();
    const interval = setInterval(fetchNews, 300000); // 5 minutes
    return () => clearInterval(interval);
  }, [fetchNews]);
  
  // Initialize dashboard charts
  useEffect(() => {
    if (activeTab === 'dashboard' && analytics) {
      const initCharts = setTimeout(() => {
        if (document.getElementById('categoryChart')) {
          renderCategoryChart('categoryChart', analytics);
        }
        if (document.getElementById('sentimentChart')) {
          renderSentimentChart('sentimentChart', analytics);
        }
        if (document.getElementById('timelineChart')) {
          renderTimelineChart('timelineChart', analytics);
        }
        if (document.getElementById('keywordChart')) {
          renderKeywordChart('keywordChart', analytics);
        }
      }, 200);
      return () => clearTimeout(initCharts);
    }
  }, [analytics, activeTab, darkMode]);
  
  // Initialize situation charts
  useEffect(() => {
    if (activeTab === 'situation' && analytics && analytics.timelineData) {
      const initSituationCharts = setTimeout(() => {
        if (document.getElementById('situationTimelineChart')) {
          renderTimelineChart('situationTimelineChart', analytics);
        }
      }, 200);
      return () => clearTimeout(initSituationCharts);
    }
  }, [analytics, activeTab, darkMode]);

  // 5. Helper functions
  const toggleBookmark = (article) => {
    setBookmarks(currentBookmarks => {
      const isBookmarked = currentBookmarks.some(bookmark => bookmark.url === article.url);
      
      if (isBookmarked) {
        return currentBookmarks.filter(bookmark => bookmark.url !== article.url);
      } else {
        return [...currentBookmarks, article];
      }
    });
  };
  
  const isBookmarked = (article) => {
    return bookmarks.some(bookmark => bookmark.url === article.url);
  };
  
  // Filter news based on active filter and search query
  const filteredNews = news.filter(article => {
    const matchesFilter = activeFilter === 'all' || article.category === activeFilter;
    const matchesSearch = !searchQuery || 
      (article.title && article.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (article.description && article.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesFilter && matchesSearch;
  });
  
  // Sort by published date (newest first)
  const sortedNews = [...filteredNews].sort((a, b) => 
    new Date(b.publishedAt) - new Date(a.publishedAt)
  );
  
  // Get priority articles
  const priorityArticles = news.filter(article => article.isPriority)
                              .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
  
  // Format date for display
  const formatDate = (dateString) => {
    const options = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };
  
  // Get crisis level class
  const getCrisisLevelClass = (level) => {
    switch(level) {
      case 'severe': return 'bg-danger';
      case 'elevated': return 'bg-warning';
      case 'moderate': return 'bg-info';
      default: return 'bg-success';
    }
  };
  
  // Get category class
  const getCategoryClass = (category) => {
    switch(category) {
      case 'military': return 'bg-danger';
      case 'diplomatic': return 'bg-primary';
      case 'economic': return 'bg-success';
      case 'social': return 'bg-info';
      default: return 'bg-secondary';
    }
  };

  // 6. Chart rendering functions
  function renderCategoryChart(containerId, analytics) {
    if (!analytics || !analytics.categories) return;
    
    const ctx = document.getElementById(containerId);
    if (!ctx) return;
    
    const { categories } = analytics;
    
    // Clear any existing chart
    if (window.categoryChart) {
      window.categoryChart.destroy();
    }
    
    window.categoryChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: Object.keys(categories).map(cat => cat.charAt(0).toUpperCase() + cat.slice(1)),
        datasets: [{
          data: Object.values(categories),
          backgroundColor: [
            '#dc3545', // Military - red
            '#0d6efd', // Diplomatic - blue
            '#198754', // Economic - green
            '#6f42c1', // Social - purple
            '#6c757d'  // Other - gray
          ],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'bottom',
          },
          title: {
            display: true,
            text: 'News Categories Distribution'
          }
        }
      }
    });
  }
  
  function renderSentimentChart(containerId, analytics) {
    if (!analytics || !analytics.sentimentCounts) return;
    
    const ctx = document.getElementById(containerId);
    if (!ctx) return;
    
    const { sentimentCounts } = analytics;
    
    // Clear any existing chart
    if (window.sentimentChart) {
      window.sentimentChart.destroy();
    }
    
    window.sentimentChart = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: ['Positive', 'Neutral', 'Negative'],
        datasets: [{
          data: [sentimentCounts.positive, sentimentCounts.neutral, sentimentCounts.negative],
          backgroundColor: [
            '#198754', // Positive - green
            '#6c757d', // Neutral - gray
            '#dc3545'  // Negative - red
          ],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'bottom',
          },
          title: {
            display: true,
            text: 'News Sentiment Analysis'
          }
        }
      }
    });
  }
  
  function renderTimelineChart(containerId, analytics) {
    if (!analytics || !analytics.timelineData) return;
    
    const ctx = document.getElementById(containerId);
    if (!ctx) return;
    
    const { timelineData } = analytics;
    
    // Clear any existing chart
    if (window[`${containerId}Instance`]) {
      window[`${containerId}Instance`].destroy();
    }
    
    const dates = timelineData.map(item => item.date);
    
    window[`${containerId}Instance`] = new Chart(ctx, {
      type: 'line',
      data: {
        labels: dates,
        datasets: [
          {
            label: 'All News',
            data: timelineData.map(item => item.count),
            fill: false,
            borderColor: '#0d6efd',
            tension: 0.1
          },
          {
            label: 'Military',
            data: timelineData.map(item => item.military || 0),
            fill: false,
            borderColor: '#dc3545',
            tension: 0.1,
            hidden: true
          },
          {
            label: 'Diplomatic',
            data: timelineData.map(item => item.diplomatic || 0),
            fill: false,
            borderColor: '#0dcaf0',
            tension: 0.1,
            hidden: true
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'News Coverage Timeline'
          },
          tooltip: {
            mode: 'index',
            intersect: false
          }
        },
        scales: {
          x: {
            title: {
              display: true,
              text: 'Date'
            }
          },
          y: {
            title: {
              display: true,
              text: 'Articles Count'
            },
            beginAtZero: true
          }
        }
      }
    });
  }
  
  function renderKeywordChart(containerId, analytics) {
    if (!analytics || !analytics.trendingKeywords) return;
    
    const ctx = document.getElementById(containerId);
    if (!ctx) return;
    
    const { trendingKeywords } = analytics;
    
    // Clear any existing chart
    if (window.keywordChart) {
      window.keywordChart.destroy();
    }
    
    window.keywordChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: trendingKeywords.map(item => item.word),
        datasets: [{
          label: 'Mentions',
          data: trendingKeywords.map(item => item.count),
          backgroundColor: '#6610f2',
          borderWidth: 1
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        plugins: {
          legend: {
            display: false
          },
          title: {
            display: true,
            text: 'Trending Keywords'
          }
        }
      }
    });
  }

  // 7. Component pieces (rendered in the main return)
  // Render crisis level badge
  const renderCrisisLevelBadge = () => {
    if (!analytics) return null;
    
    const level = analytics.crisisLevel;
    const badgeClass = getCrisisLevelClass(level);
    
    return (
      <span className={`badge ${badgeClass} d-flex align-items-center`}>
        {level === 'severe' && <i className="bi bi-exclamation-triangle-fill me-1"></i>}
        {level === 'elevated' && <i className="bi bi-exclamation-circle-fill me-1"></i>}
        {level === 'moderate' && <i className="bi bi-info-circle-fill me-1"></i>}
        {level === 'normal' && <i className="bi bi-check-circle-fill me-1"></i>}
        
        Situation Level: {level.charAt(0).toUpperCase() + level.slice(1)}
      </span>
    );
  };
  
  // News Card Component
  const NewsCard = ({ article }) => {
    const bookmarked = isBookmarked(article);
    const priorityArticle = article.isPriority;
    
    return (
      <div className={`card news-card h-100 ${priorityArticle ? 'border-danger' : ''}`}>
        {priorityArticle && (
          <div className="position-absolute top-0 start-0 m-2">
            <span className="badge bg-danger animate-pulse">
              <i className="bi bi-exclamation-triangle-fill me-1"></i>
              Priority
            </span>
          </div>
        )}
        
        <div className="position-absolute top-0 end-0 m-2">
          <button 
            className="btn btn-sm btn-light"
            onClick={(e) => {
              e.preventDefault();
              toggleBookmark(article);
            }}
          >
            <i className={`bi ${bookmarked ? 'bi-bookmark-fill text-primary' : 'bi-bookmark'}`}></i>
          </button>
        </div>
        
        {article.urlToImage && (
          <img
            src={article.urlToImage}
            className="card-img-top"
            alt={article.title}
            style={{ height: '200px', objectFit: 'cover' }}
            onError={(e) => {
              e.target.src = 'https://via.placeholder.com/360x200?text=No+Image+Available';
            }}
          />
        )}
        
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-start mb-2">
            <span className={`category-badge category-${article.category}`}>
              {article.category.charAt(0).toUpperCase() + article.category.slice(1)}
            </span>
            <span className={`badge ${
              article.sentiment > 0 ? 'bg-success' :
              article.sentiment < 0 ? 'bg-danger' : 'bg-secondary'
            }`}>
              {article.sentiment > 0 ? 'Positive' :
               article.sentiment < 0 ? 'Negative' : 'Neutral'}
            </span>
          </div>
          
          <h5 className="card-title">{article.title}</h5>
          <p className="card-text">{article.description}</p>
          
          <div className="d-flex justify-content-between align-items-center mt-2">
            <small className="text-muted">
              {article.source && article.source.name}
            </small>
            <small className="text-muted">
              {formatDate(article.publishedAt)}
            </small>
          </div>
        </div>
        
        <div className="card-footer">
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary w-100"
          >
            Read Full Article
          </a>
        </div>
      </div>
    );
  };
  
  // Timeline View Component
  const TimelineView = ({ articles }) => {
    if (!articles.length) {
      return (
        <div className="alert alert-info">
          No articles found for the selected filters.
        </div>
      );
    }
    
    // Group articles by date
    const groupedArticles = {};
    articles.forEach(article => {
      const date = new Date(article.publishedAt).toLocaleDateString();
      
      if (!groupedArticles[date]) {
        groupedArticles[date] = [];
      }
      
      groupedArticles[date].push(article);
    });
    
    return (
      <div className="timeline-container">
        {Object.entries(groupedArticles).sort((a, b) => {
          return new Date(b[0]) - new Date(a[0]);
        }).map(([date, dateArticles]) => (
          <div key={date} className="timeline-day mb-4">
            <h3 className="timeline-date bg-light p-2 rounded">{date}</h3>
            <div className="timeline-articles">
              {dateArticles.map((article, i) => (
                <div key={i} className="timeline-item">
                  <div className="timeline-item-content p-3 mb-3 border-start border-4 border-primary">
                    <span className={`timeline-dot ${getCategoryClass(article.category)}`}></span>
                    <time>{new Date(article.publishedAt).toLocaleTimeString()}</time>
                    <h5>{article.title}</h5>
                    <p>{article.description}</p>
                    <div className="d-flex justify-content-between align-items-center">
                      <span className={`category-badge category-${article.category}`}>
                        {article.category.charAt(0).toUpperCase() + article.category.slice(1)}
                      </span>
                      <a 
                        href={article.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="btn btn-sm btn-outline-primary"
                      >
                        Read More
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };
  
  // Situation Summary Component
  const SituationSummary = () => {
    if (!analytics) return <div className="skeleton p-4"></div>;
    
    const { keyInsights, crisisLevel } = analytics;
    const crisisLevelClass = getCrisisLevelClass(crisisLevel);
    
    return (
      <div className="card mb-4 border-0 shadow">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h5 className="mb-0">Current Situation Summary</h5>
          <span className={`badge ${crisisLevelClass}`}>
            {crisisLevel.toUpperCase()}
          </span>
        </div>
        <div className="card-body">
          <div className="alert alert-light">
            <h6>Latest Development</h6>
            {keyInsights.mostRecent && (
              <p>{keyInsights.mostRecent.title}</p>
            )}
          </div>
          
          <div className="row">
            <div className="col-md-6">
              <div className={`alert ${crisisLevel === 'severe' || crisisLevel === 'elevated' ? 'alert-danger' : 'alert-secondary'}`}>
                <h6>Most Concerning Development</h6>
                {keyInsights.mostNegative && (
                  <p>{keyInsights.mostNegative.title}</p>
                )}
              </div>
            </div>
            <div className="col-md-6">
              <div className="alert alert-success">
                <h6>Positive Development</h6>
                {keyInsights.mostPositive && (
                  <p>{keyInsights.mostPositive.title}</p>
                )}
              </div>
            </div>
          </div>
          
          <h6 className="mb-3">Significant Events</h6>
          {analytics.significantEvents && analytics.significantEvents.length > 0 ? (
            <ul className="list-group">
              {analytics.significantEvents.slice(0, 3).map((event, index) => (
                <li key={index} className="list-group-item">
                  <div className="d-flex justify-content-between align-items-center">
                    <span>{event.title}</span>
                    <span className={`badge ${getCategoryClass(event.category)}`}>
                      {event.category}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted">No significant events detected at this time.</p>
          )}
        </div>
      </div>
    );
  };

  // 8. Early returns for loading/error states
  if (loading && !news.length) {
    return (
      <div className="d-flex flex-column justify-content-center align-items-center min-vh-100">
        <div className="spinner-border text-primary mb-3" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <h5 className="text-center">Loading India-Pakistan News Analytics...</h5>
      </div>
    );
  }

  if (error && !news.length) {
    return (
      <div className="alert alert-danger m-4" role="alert">
        <h4 className="alert-heading">Error Loading Data</h4>
        <p>{error}</p>
        <hr />
        <p className="mb-0">Please check your internet connection and API key configuration.</p>
        <button 
          className="btn btn-primary mt-3"
          onClick={() => fetchNews()}
        >
          Retry
        </button>
      </div>
    );
  }

  // 9. Main render
  return (
    <div className={darkMode ? 'dark' : ''}>
      <nav className="navbar navbar-expand-lg fixed-top" style={{backgroundColor: 'rgba(13, 110, 253, 0.95)'}}>
        <div className="container-fluid">
          <span className="navbar-brand text-white d-flex align-items-center">
            <i className="bi bi-globe me-2"></i>
            India-Pakistan News Analytics
          </span>
          
          <div className="d-flex align-items-center">
            {analytics && renderCrisisLevelBadge()}
            
            <span className="badge bg-danger ms-3 me-3 live-indicator">
              <i className="bi bi-broadcast me-1"></i>
              Live Updates
            </span>
            
            <button
              className="btn btn-outline-light"
              onClick={() => setDarkMode(!darkMode)}
            >
              <i className={`bi bi-${darkMode ? 'sun' : 'moon'}`}></i>
            </button>
          </div>
        </div>
      </nav>

      <div className="container mt-5 pt-4">
        <ul className="nav nav-tabs mb-4" style={{marginTop: '60px'}}>
          <li className="nav-item">
            <a 
              className={`nav-link ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('dashboard')}
              href="#dashboard"
            >
              <i className="bi bi-speedometer2 me-1"></i>
              Dashboard
            </a>
          </li>
          <li className="nav-item">
            <a 
              className={`nav-link ${activeTab === 'news' ? 'active' : ''}`}
              onClick={() => setActiveTab('news')}
              href="#news"
            >
              <i className="bi bi-newspaper me-1"></i>
              News Feed
            </a>
          </li>
          <li className="nav-item">
            <a 
              className={`nav-link ${activeTab === 'situation' ? 'active' : ''}`}
              onClick={() => setActiveTab('situation')}
              href="#situation"
            >
              <i className="bi bi-exclamation-diamond me-1"></i>
              Situation Updates
            </a>
          </li>
          <li className="nav-item">
            <a 
              className={`nav-link ${activeTab === 'bookmarks' ? 'active' : ''}`}
              onClick={() => setActiveTab('bookmarks')}
              href="#bookmarks"
            >
              <i className="bi bi-bookmark me-1"></i>
              Bookmarks
            </a>
          </li>
          <li className="nav-item ms-auto">
            <div className="nav-link text-muted">
              <small>
                Last updated: {lastUpdated ? formatDate(lastUpdated) : 'Never'}
              </small>
            </div>
          </li>
        </ul>
        
        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="dashboard-tab">
            <div className="row mb-4">
              <div className="col-md-12">
                <SituationSummary />
              </div>
            </div>
            
            <div className="row mb-4">
              <div className="col-md-6">
                <div className="chart-container shadow-sm mb-4">
                  <canvas id="categoryChart"></canvas>
                </div>
              </div>
              <div className="col-md-6">
                <div className="chart-container shadow-sm mb-4">
                  <canvas id="sentimentChart"></canvas>
                </div>
              </div>
            </div>
            
            <div className="row mb-4">
              <div className="col-md-8">
                <div className="chart-container shadow-sm mb-4">
                  <canvas id="timelineChart"></canvas>
                </div>
              </div>
              <div className="col-md-4">
                <div className="chart-container shadow-sm mb-4">
                  <canvas id="keywordChart"></canvas>
                </div>
              </div>
            </div>
            
            <div className="row">
              <div className="col-12">
                <div className="card border-0 shadow-sm">
                  <div className="card-header bg-light">
                    <h5 className="mb-0">
                      <i className="bi bi-fire me-2 text-danger"></i>
                      Priority News
                    </h5>
                  </div>
                  <div className="card-body">
                    {priorityArticles.length > 0 ? (
                      <div className="list-group">
                        {priorityArticles.slice(0, 5).map((article, index) => (
                          <a 
                            key={index} 
                            href={article.url} 
                            target="_blank"
                            rel="noopener noreferrer"
                            className="list-group-item list-group-item-action"
                          >
                            <div className="d-flex w-100 justify-content-between">
                              <h6 className="mb-1">{article.title}</h6>
                              <small className={`text-${article.category === 'military' ? 'danger' : 'primary'}`}>
                                {article.category.toUpperCase()}
                              </small>
                            </div>
                            <small>{formatDate(article.publishedAt)}</small>
                          </a>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center my-3">No priority news at this time</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* News Feed Tab */}
        {activeTab === 'news' && (
          <div className="news-tab">
            <div className="row mb-4">
              <div className="col-md-8">
                <div className="btn-group" role="group">
                  {['all', 'military', 'diplomatic', 'economic', 'social'].map(filter => (
                    <button
                      key={filter}
                      className={`btn ${activeFilter === filter ? 'btn-primary' : 'btn-outline-primary'}`}
                      onClick={() => setActiveFilter(filter)}
                    >
                      {filter.charAt(0).toUpperCase() + filter.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="col-md-4 d-flex">
                <input
                  type="text"
                  className="form-control me-2"
                  placeholder="Search news..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button 
                  className="btn btn-outline-secondary"
                  onClick={() => setTimelineView(!timelineView)}
                  title={timelineView ? "Grid View" : "Timeline View"}
                >
                  <i className={`bi bi-${timelineView ? 'grid' : 'clock-history'}`}></i>
                </button>
              </div>
            </div>
            
            {timelineView ? (
              <TimelineView articles={sortedNews} />
            ) : (
              <div className="row">
                {sortedNews.length ? (
                  sortedNews.map((article, index) => (
                    <div key={index} className="col-md-6 col-lg-4 mb-4">
                      <NewsCard article={article} />
                    </div>
                  ))
                ) : (
                  <div className="col-12">
                    <div className="alert alert-info">
                      No news found matching your filters.
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        
        {/* Situation Updates Tab */}
        {activeTab === 'situation' && (
          <div className="situation-tab">
            <div className="row mb-4">
              <div className="col-md-12">
                <div className="card border-0 shadow">
                  <div className="card-body">
                    <h4 className="card-title mb-3">
                      India-Pakistan Current Situation
                      {analytics && analytics.crisisLevel !== 'normal' && (
                        <span className={`badge ms-2 ${getCrisisLevelClass(analytics.crisisLevel)}`}>
                          {analytics.crisisLevel.toUpperCase()} ALERT
                        </span>
                      )}
                    </h4>
                    
                    <div className="alert alert-info mb-4">
                      <h5 className="alert-heading">
                        <i className="bi bi-info-circle-fill me-2"></i>
                        About This Dashboard
                      </h5>
                      <p>This dashboard provides real-time monitoring of India-Pakistan relations through news analysis. The situation level is determined by algorithmic analysis of recent news sentiment and content.</p>
                    </div>
                    
                    <SituationSummary />
                    
                    <h5 className="mt-4 mb-3">Recent Military & Diplomatic Developments</h5>
                    <div className="mb-4">
                      {news.filter(a => 
                        (a.category === 'military' || a.category === 'diplomatic') &&
                        new Date(a.publishedAt) > new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // Last 3 days
                      ).sort((a, b) => 
                        new Date(b.publishedAt) - new Date(a.publishedAt)
                      ).slice(0, 5).map((article, index) => (
                        <div key={index} className={`card mb-3 border-${article.category === 'military' ? 'danger' : 'primary'}`}>
                          <div className="card-body">
                            <h6 className="card-title">{article.title}</h6>
                            <p className="card-text small">{article.description}</p>
                            <div className="d-flex justify-content-between">
                              <span className={`badge category-${article.category}`}>
                                {article.category.toUpperCase()}
                              </span>
                              <small className="text-muted">{formatDate(article.publishedAt)}</small>
                            </div>
                            <a 
                              href={article.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className={`btn btn-sm btn-outline-${article.category === 'military' ? 'danger' : 'primary'} mt-2`}
                            >
                              Read Full Article
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <h5 className="mt-4 mb-3">Timeline of Events</h5>
                    <div className="timeline-container">
                      {analytics && analytics.timelineData && (
                        <div className="chart-container">
                          <canvas id="situationTimelineChart"></canvas>
                        </div>
                      )}
                    </div>
                    
                    <div className="mt-4">
                      <h5 className="mb-3">Analysis & Predictions</h5>
                      <div className="card">
                        <div className="card-body">
                          <h6>Sentiment Trend</h6>
                          <p>The current news cycle shows a {
                            analytics && analytics.sentimentCounts ? 
                            (analytics.sentimentCounts.negative > analytics.sentimentCounts.positive ? 
                              'predominantly negative' : 'balanced to positive') : 'loading...'
                          } sentiment regarding India-Pakistan relations.</p>
                          
                          <h6>Category Focus</h6>
                          <p>Current reporting is focused primarily on {
                            analytics && analytics.categories ? 
                            Object.entries(analytics.categories)
                              .sort((a, b) => b[1] - a[1])[0][0] : 'loading...'
                          } aspects of the relationship.</p>
                          
                          <h6>Keywords Analysis</h6>
                          <p>Frequently mentioned terms suggest attention on {
                            analytics && analytics.trendingKeywords ? 
                            analytics.trendingKeywords.slice(0, 3).map(k => k.word).join(', ') : 'loading...'
                          }.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Bookmarks Tab */}
        {activeTab === 'bookmarks' && (
          <div className="bookmarks-tab">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h4>Your Bookmarked Articles</h4>
              {bookmarks.length > 0 && (
                <button 
                  className="btn btn-sm btn-outline-danger"
                  onClick={() => {
                    if (window.confirm("Are you sure you want to clear all bookmarks?")) {
                      setBookmarks([]);
                    }
                  }}
                >
                  <i className="bi bi-trash me-1"></i>
                  Clear All
                </button>
              )}
            </div>
            
            {bookmarks.length > 0 ? (
              <div className="row">
                {bookmarks.map((article, index) => (
                  <div key={index} className="col-md-6 col-lg-4 mb-4">
                    <NewsCard article={article} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="alert alert-info">
                <i className="bi bi-bookmark me-2"></i>
                No bookmarks added yet. Click the bookmark icon on any news article to save it here.
              </div>
            )}
          </div>
        )}
      </div>
      
      <footer className="bg-light mt-5 p-4 text-center">
        <div className="container">
          <p className="text-muted mb-0">
            <small>
              © {new Date().getFullYear()} India-Pakistan News Analytics Dashboard | 
              College Project | Data refreshes every 5 minutes
            </small>
          </p>
        </div>
      </footer>
    </div>
  );
}

// Render the React application
ReactDOM.render(<App />, document.getElementById('root'));