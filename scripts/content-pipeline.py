#!/usr/bin/env python3
"""
Real Traffic Pipeline — automated content generation & distribution

Generates:
  1. Blog post slugs for Google indexing (saved as sitemap entries)
  2. Social media posts (Reddit, Telegram templates)
  3. Comment reply templates for movie forums
  4. Trending roundup posts
  5. SEO keyword-targeted landing page content

Runs daily via cron. All output saved to traffic-toolkit/output/ for review.
"""
import json
import time
import random
import re
import os
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import quote_plus

# ═══ Config ═══
TARGET = os.environ.get("TARGET_URL", "https://cache-proxy.zainrana553.workers.dev")
CANONICAL = os.environ.get("CANONICAL_URL", "https://lumina-stream-omega.vercel.app")
OUTDIR = Path(__file__).parent.parent / "traffic-toolkit" / "output"
OUTDIR.mkdir(parents=True, exist_ok=True)

GENRE_MAP = {
    28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy",
    80: "Crime", 99: "Documentary", 18: "Drama", 10751: "Family",
    14: "Fantasy", 36: "History", 27: "Horror", 10402: "Music",
    9648: "Mystery", 10749: "Romance", 878: "Sci-Fi", 10770: "TV Movie",
    53: "Thriller", 10752: "War", 37: "Western",
}

import requests as req

def fetch_tmdb_popular():
    """Fetch popular movies from the site's browse API."""
    s = req.Session()
    s.headers.update({
        "User-Agent": "LuminaStreamBot/1.0",
        "Accept": "application/json",
    })
    shows = []
    endpoints = [
        f"{CANONICAL}/api/browse?category=popular&page=1",
        f"{CANONICAL}/api/browse?category=trending&page=1",
    ]
    for url in endpoints:
        try:
            resp = s.get(url, timeout=20)
            if resp.status_code == 200:
                data = resp.json()
                for r in (data.get("results") or [])[:20]:
                    shows.append(r)
        except Exception:
            pass
    return shows


def fetch_homepage_titles():
    """Scrape homepage for movie titles and IDs."""
    s = req.Session()
    s.headers.update({"User-Agent": "Mozilla/5.0"})
    try:
        resp = s.get(TARGET, timeout=30)
        html = resp.text
        # Extract detail IDs from hrefs
        ids = re.findall(r'/details/(\d+)', html)
        unique_ids = list(dict.fromkeys(ids))  # deduplicate, keep order
        
        # Extract titles from aria-labels (format: "Movie Name - Movie, rated X.X")
        aria_labels = re.findall(r'aria-label="([^"]+)"', html)
        
        # Filter: valid titles have " - Movie" or " - TV" in the label
        titles = []
        for label in aria_labels:
            if ' - Movie' in label or ' - TV' in label or 'rated' in label:
                name = label.split(' - ')[0].strip()
                if name and len(name) > 1:
                    titles.append(name)
        
        shows = []
        for i, d_id in enumerate(unique_ids[:40]):
            title = titles[i] if i < len(titles) else f"Show {d_id}"
            shows.append({
                "id": int(d_id),
                "title": title,
                "rating": "7+",
                "overview": "",
            })
        return shows
    except Exception as e:
        print(f"  ⚠️ Scrape error: {e}")
        return []


# ═══ 1. Blog Post Generator ═══
def generate_blog_posts(shows):
    """Generate blog-ready content for each movie."""
    posts = []
    for show in shows[:15]:
        title = show.get("title", "Movie")
        slug = re.sub(r'[^a-z0-9]+', '-', title.lower()).strip('-')[:80]

        year = (show.get("release_date") or show.get("first_air_date") or "")[:4]
        rating = show.get("vote_average", show.get("rating", "7.5"))
        overview = (show.get("overview") or "A must-watch title available for free streaming.")[:300]

        post = {
            "slug": slug,
            "title": f"Watch {title}{f' ({year})' if year else ''} Online Free — No Sign Up | Lumina Stream",
            "description": f"Stream {title} free on Lumina Stream. {overview[:120]}... No registration needed. Watch now!",
            "url": f"{CANONICAL}/blog/{slug}",
            "canonical": f"{CANONICAL}/blog/{slug}",
        }
        posts.append(post)
    return posts


# ═══ 2. Social Media Post Generator ═══
SOCIAL_TEMPLATES = [
    {
        "title": "Just finished {title} ({year}) — ⭐{rating}/10, absolutely {adj}",
        "body": "{overview}\n\nIf you like {genre}, don't miss this one.\n\nWatch free → {url}",
    },
    {
        "title": "Hidden gem: {title} ({year}) — {adj} from start to finish",
        "body": "{overview}\n\nFree streaming: {url}\n\nNo sign-up needed ✌️",
    },
    {
        "title": "Where to watch {title} ({year}) online free (working {current_year})",
        "body": "Found it on Lumina Stream — HD quality, no ads before video.\n\n{url}\n\n270+ movies, all free.",
    },
    {
        "title": "{title} ({year}) review — is it worth your time?",
        "body": "Short answer: Yes.\n\n{overview}\n\nStream here: {url}",
    },
    {
        "title": "Free movie alert 🎬 {title} ({year})",
        "body": "⭐{rating}/10 | {genre}\n\n{overview}\n\n{url}",
    },
]

ADJ = ["brilliant", "stunning", "incredible", "captivating", "masterful",
       "breathtaking", "phenomenal", "outstanding", "remarkable"]

def generate_social_posts(shows):
    """Generate Reddit/Twitter-ready posts."""
    posts = []
    for show in shows[:12]:
        template = random.choice(SOCIAL_TEMPLATES)
        title = show.get("title", "Movie")
        year = (show.get("release_date") or show.get("first_air_date") or "")[:4]
        rating = show.get("vote_average", show.get("rating", "7+"))
        overview = (show.get("overview") or "A must-watch.")[:250]
        genre = "Various"

        post = template
        for key, val in {
            "{title}": title,
            "{year}": year,
            "{rating}": str(rating),
            "{overview}": overview,
            "{genre}": genre,
            "{url}": f"{TARGET}/details/{show['id']}",
            "{adj}": random.choice(ADJ),
            "{current_year}": str(datetime.now().year),
        }.items():
            post = {k: v.replace(key, val) for k, v in post.items()}

        posts.append({**post, "show_id": show["id"]})
    return posts


# ═══ 3. Comment Reply Generator ═══
COMMENT_TEMPLATES = [
    "I've been using Lumina Stream for {genre} movies — {url} works great, no sign-up needed.",
    "Check out {url} — free {genre} streaming, {count}+ titles. Found some gems there.",
    "Not sure about other sites but {url} has been reliable for me. HD quality, no account.",
    "Try {url} — free movies & TV, been using it for weeks. Has {title} in good quality.",
    "Lumina Stream ({url}) — {count}+ movies/shows, all free. Way better than those popup-ridden sites.",
]

def generate_comments(shows):
    """Generate forum comment templates with links."""
    comments = []
    for show in shows[:10]:
        template = random.choice(COMMENT_TEMPLATES)
        genre = "movie" if show.get("type", "movie") == "movie" else "TV"

        comment = template.format(
            genre=genre,
            url=TARGET,
            count="270",
            title=show.get("title", "this"),
        )
        comments.append({"show": show.get("title"), "comment": comment})
    return comments


# ═══ 4. Trending Roundup ═══
def generate_roundup(shows):
    """Generate a weekly trending roundup post."""
    top5 = shows[:5]
    items = []
    for i, show in enumerate(top5):
        title = show.get("title", f"Movie {i+1}")
        rating = show.get("vote_average", show.get("rating", "7+"))
        link = f"{TARGET}/details/{show['id']}"
        items.append(f"**{i+1}. {title}** — ⭐{rating} — [Watch here]({link})")

    return f"""# 🎬 Trending Movies & Shows This Week

{chr(10).join(items)}

---

*All titles stream free on [Lumina Stream]({TARGET}). Updated weekly. No registration needed.*
"""


# ═══ 5. Sitemap Generator ═══
def generate_blog_sitemap(posts):
    """Generate a sitemap for the blog pages."""
    entries = []
    for post in posts:
        entries.append(f"""  <url>
    <loc>{post['url']}</loc>
    <lastmod>{datetime.now(timezone.utc).strftime('%Y-%m-%d')}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>""")

    return f"""<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
{chr(10).join(entries)}
</urlset>"""


# ═══ 6. SEO Keywords Page ═══
def generate_seo_keywords():
    """Generate keyword-targeted landing page content."""
    keywords = [
        "watch free movies online no sign up",
        "best free movie streaming sites that actually work",
        "free HD movies streaming without registration",
        "watch TV shows online free full episodes",
        "anime streaming free no account",
        "best sites like netflix but free",
    ]

    pages = []
    for kw in keywords:
        slug = re.sub(r'[^a-z0-9]+', '-', kw).strip('-')[:60]
        pages.append({
            "slug": f"guide-{slug}",
            "keyword": kw,
            "title": kw.title() + " — Lumina Stream Guide",
            "url": f"{CANONICAL}/blog/guide-{slug}",
        })
    return pages


# ═══ Main Pipeline ═══
def run():
    print(f"[{datetime.now().strftime('%H:%M:%S')}] Starting real-traffic pipeline...")

    # Fetch data
    shows = fetch_homepage_titles()
    print(f"  Fetched {len(shows)} titles from homepage")

    # Generate content
    blog_posts = generate_blog_posts(shows)
    social_posts = generate_social_posts(shows)
    comments = generate_comments(shows)
    roundup = generate_roundup(shows)
    sitemap = generate_blog_sitemap(blog_posts)
    seo_pages = generate_seo_keywords()

    # Save output
    timestamp = datetime.now().strftime('%Y%m%d_%H%M')

    (OUTDIR / f"blog_posts_{timestamp}.json").write_text(
        json.dumps(blog_posts, indent=2, default=str))
    (OUTDIR / f"social_posts_{timestamp}.json").write_text(
        json.dumps(social_posts, indent=2, default=str))
    (OUTDIR / f"comments_{timestamp}.json").write_text(
        json.dumps(comments, indent=2, default=str))
    (OUTDIR / f"roundup_{timestamp}.md").write_text(roundup)
    (OUTDIR / f"blog_sitemap.xml").write_text(sitemap)
    (OUTDIR / f"seo_keywords.json").write_text(
        json.dumps(seo_pages, indent=2))

    print(f"  ✅ Blog posts: {len(blog_posts)}")
    print(f"  ✅ Social posts: {len(social_posts)}")
    print(f"  ✅ Comment templates: {len(comments)}")
    print(f"  ✅ Roundup: saved")
    print(f"  ✅ Sitemap: saved")
    print(f"  ✅ SEO keywords: {len(seo_pages)}")
    print(f"  📁 Output: {OUTDIR}")


if __name__ == "__main__":
    run()
