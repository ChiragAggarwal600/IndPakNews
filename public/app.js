const { useState, useEffect } = React;

function App() {
    const [news, setNews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [darkMode, setDarkMode] = useState(false);
    const [activeFilter, setActiveFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (darkMode) {
            document.documentElement.setAttribute('data-bs-theme', 'dark');
        } else {
            document.documentElement.setAttribute('data-bs-theme', 'light');
        }
    }, [darkMode]);    const fetchNews = async () => {
        try {
            const response = await fetch('http://localhost:3000/api/news');
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to fetch news');
            }
            const data = await response.json();
            if (data.articles) {
                setNews(data.articles);
            } else {
                setError('No news articles found');
            }
        } catch (err) {
            setError('Failed to fetch news');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNews();
        const interval = setInterval(fetchNews, 300000); // 5 minutes
        return () => clearInterval(interval);
    }, []);

    const filteredNews = news.filter(article => {
        const matchesFilter = activeFilter === 'all' || article.category === activeFilter;
        const matchesSearch = article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            article.description.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesFilter && matchesSearch;
    });

    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center min-vh-100">
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="alert alert-danger m-4" role="alert">
                {error}
            </div>
        );
    }

    return (
        <div>
            <nav className="navbar navbar-expand-lg navbar-dark bg-primary fixed-top">
                <div className="container-fluid">
                    <span className="navbar-brand">News Analytics Dashboard</span>
                    <div className="d-flex align-items-center">
                        <span className="badge bg-danger me-3 live-indicator">
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
                    <div className="col-md-4">
                        <input
                            type="text"
                            className="form-control"
                            placeholder="Search news..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>                <div className="row">
                    {filteredNews.map((article, index) => (
                        <div key={index} className="col-md-6 col-lg-4 mb-4">
                            <div className="card news-card h-100">
                                {article.urlToImage && (
                                    <img
                                        src={article.urlToImage}
                                        className="card-img-top"
                                        alt={article.title}
                                        style={{ height: '200px', objectFit: 'cover' }}
                                    />
                                )}
                                <div className="card-body">
                                    <div className="d-flex justify-content-between align-items-start mb-2">
                                        <span className={`badge badge-${article.category || 'primary'}`}>
                                            {article.category || 'General'}
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
                                    <p className="card-text">
                                        <small className="text-muted">
                                            {new Date(article.publishedAt).toLocaleDateString()}
                                        </small>
                                    </p>
                                    <a
                                        href={article.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="btn btn-primary"
                                    >
                                        Read More
                                    </a>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

ReactDOM.render(<App />, document.getElementById('root'));