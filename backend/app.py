from flask import Flask, jsonify
import sqlite3

app = Flask(__name__)
from flask_cors import CORS

CORS(app)

DB_PATH = "articles_data.db"


def query_db(query, args=()):
    with sqlite3.connect(DB_PATH) as conn:
        cur = conn.execute(query, args)
        rows = cur.fetchall()
        col_names = [description[0] for description in cur.description]
        return [dict(zip(col_names, row)) for row in rows]


@app.route("/articles", methods=["GET"])
def get_articles():
    query = """
    SELECT id, date, headline, short_description, category, authors, link 
    FROM articles;
    """
    articles = query_db(query)
    return jsonify(articles)


@app.route("/ngrams", methods=["GET"])
def get_ngrams():
    query = """
    SELECT ngrams.id, ngrams.article_id, ngrams.ngram_type, ngrams.ngram_text, articles.date, articles.headline, articles.short_description, articles.category
    FROM ngrams
    JOIN articles ON ngrams.article_id = articles.id
    LIMIT 500000;
    """
    ngrams = query_db(query)
    return jsonify(ngrams)



if __name__ == "__main__":
    app.run(debug=True)
