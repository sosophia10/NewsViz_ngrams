import React, { useState, useEffect } from "react";

const ArticleViewer = ({
  data,
  selectedEntities,
  visibleTimeframe,
  activeBar,
  activeSegment,
}) => {
  const [filteredArticles, setFilteredArticles] = useState([]);

  useEffect(() => {
    // Ensure the article viewer remains empty until entities are added
    if (!data || !data.articles || !data.ngrams || selectedEntities.length === 0) {
      setFilteredArticles([]); // Clear articles when no entities are selected
      return;
    }

    let relevantArticles = [...data.articles];

    const isWithinDateRange = (articleDate, start, end) => {
      const date = new Date(articleDate);
      return date >= new Date(start) && date <= new Date(end);
    };

    // Filter by entities
    if (selectedEntities.length > 0) {
      const relevantArticleIds = new Set(
        data.ngrams
          .filter((ngram) =>
            selectedEntities.includes(ngram.ngram_text.toLowerCase())
          )
          .map((ngram) => ngram.article_id)
      );
      relevantArticles = relevantArticles.filter((article) =>
        relevantArticleIds.has(article.id)
      );
    }

    // Filter by active bar timeframe
    if (activeBar && activeBar.start && activeBar.end) {
      relevantArticles = relevantArticles.filter((article) =>
        isWithinDateRange(article.date, activeBar.start, activeBar.end)
      );
    }

    // Filter by active segment within the active bar timeframe
    if (activeSegment && activeSegment.key && activeBar) {
      const segmentEntity = activeSegment.key.toLowerCase();

      const relevantArticleIds = new Set(
        data.ngrams
          .filter(
            (ngram) =>
              ngram.ngram_text.toLowerCase() === segmentEntity &&
              isWithinDateRange(ngram.date, activeBar.start, activeBar.end)
          )
          .map((ngram) => ngram.article_id)
      );

      relevantArticles = relevantArticles.filter((article) =>
        relevantArticleIds.has(article.id)
      );
    }

    // Fallback to visible timeframe
    if (!activeBar && !activeSegment && visibleTimeframe) {
      relevantArticles = relevantArticles.filter((article) =>
        isWithinDateRange(
          article.date,
          visibleTimeframe.start,
          visibleTimeframe.end
        )
      );
    }

    setFilteredArticles(relevantArticles);
  }, [data, selectedEntities, visibleTimeframe, activeBar, activeSegment]);

  const formatReadableDate = (dateString) => {
    const options = { year: "numeric", month: "long", day: "numeric" };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  return (
    <div>
      <h3>Relevant Articles</h3>
      {filteredArticles.length === 0 ? (
        <p>
          {selectedEntities.length === 0
            ? "Select entities to view relevant articles."
            : "No articles match the current filters."}
        </p>
      ) : (
        <div>
          {filteredArticles.map((article, index) => (
            <div
              key={`${article.id}-${index}`}
              style={{
                border: "1px solid #ddd",
                padding: "15px",
                margin: "10px 0",
                borderRadius: "8px",
                backgroundColor: "#fafafa",
              }}
            >
              <h4>
                <a
                  href={article.link || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "#007BFF", textDecoration: "none" }}
                >
                  {article.headline || "Untitled Article"}
                </a>
              </h4>
              <p style={{ fontSize: "0.9em", color: "#555" }}>
                Published on: {formatReadableDate(article.date)}
              </p>
              <p style={{ fontSize: "0.9em", color: "#555" }}>
                {article.short_description || "No description available."}
              </p>
              {article.category && (
                <p style={{ fontStyle: "italic", color: "#666" }}>
                  Category: {article.category}
                </p>
              )}
              {article.authors && (
                <p style={{ fontStyle: "italic", color: "#555" }}>
                  Author: {article.authors}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ArticleViewer;
