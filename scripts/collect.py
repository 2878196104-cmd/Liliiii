#!/usr/bin/env python3
"""Collect RSS/Atom feeds and public index pages into Supabase."""

from __future__ import annotations

import hashlib
import html
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from email.utils import parsedate_to_datetime
from html.parser import HTMLParser
from pathlib import Path


SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
SERVICE_KEY = os.environ.get("SUPABASE_SECRET_KEY") or os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
SOURCE_FILE = Path(os.environ.get("SOURCE_CONFIG", "config/sources.json"))
USER_AGENT = "Mozilla/5.0 (compatible; MonthlyKnowCollector/2.0; +https://2878196104-cmd.github.io/Liliiii/)"
SOURCE_COLUMNS = {
    "name", "base_url", "platform", "feed_url", "trust_level",
    "enabled", "collection_interval_minutes"
}


def fetch_bytes(url: str) -> bytes:
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": USER_AGENT,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
    )
    with urllib.request.urlopen(req, timeout=30) as response:
        return response.read()


def request(url: str, *, method: str = "GET", body=None, headers=None):
    merged = {"User-Agent": USER_AGENT, **(headers or {})}
    data = None if body is None else json.dumps(body).encode("utf-8")
    req = urllib.request.Request(url, data=data, method=method, headers=merged)
    with urllib.request.urlopen(req, timeout=30) as response:
        payload = response.read()
        return json.loads(payload) if payload else None


def supabase(path: str, *, method="GET", body=None, prefer=None):
    headers = {"apikey": SERVICE_KEY, "Content-Type": "application/json"}
    if prefer:
        headers["Prefer"] = prefer
    return request(f"{SUPABASE_URL}/rest/v1/{path}", method=method, body=body, headers=headers)


def xml_text(node, names):
    for name in names:
        found = node.find(name)
        if found is not None and found.text:
            return found.text.strip()
    return ""


def clean(value: str) -> str:
    value = re.sub(r"<[^>]+>", " ", value or "")
    return re.sub(r"\s+", " ", html.unescape(value)).strip()


def normalized_date(value: str | None):
    if not value:
        return None
    try:
        return parsedate_to_datetime(value).isoformat()
    except (TypeError, ValueError, OverflowError):
        pass
    value = value.strip()
    match = re.search(r"(20\d{2})[-/.年](\d{1,2})[-/.月](\d{1,2})", value)
    if match:
        return f"{match.group(1)}-{int(match.group(2)):02d}-{int(match.group(3)):02d}T00:00:00+00:00"
    return None


def parse_feed(payload: bytes):
    root = ET.fromstring(payload)
    nodes = root.findall(".//item")
    if not nodes:
        nodes = root.findall(".//{http://www.w3.org/2005/Atom}entry")
    for node in nodes:
        title = clean(xml_text(node, ["title", "{http://www.w3.org/2005/Atom}title"]))
        link = xml_text(node, ["link"])
        if not link:
            link_node = node.find("{http://www.w3.org/2005/Atom}link")
            link = link_node.attrib.get("href", "") if link_node is not None else ""
        body = clean(xml_text(node, [
            "description", "summary",
            "{http://www.w3.org/2005/Atom}summary",
            "{http://www.w3.org/2005/Atom}content",
        ]))
        published = xml_text(node, [
            "pubDate", "published", "updated",
            "{http://www.w3.org/2005/Atom}published",
            "{http://www.w3.org/2005/Atom}updated",
        ])
        if title and link:
            yield {
                "title": title,
                "url": link,
                "body": body,
                "published": normalized_date(published),
                "kind": "rss_item",
            }


class LinkParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.current_href = None
        self.current_text = []
        self.links = []

    def handle_starttag(self, tag, attrs):
        if tag.lower() == "a":
            self.current_href = dict(attrs).get("href")
            self.current_text = []

    def handle_data(self, data):
        if self.current_href:
            self.current_text.append(data)

    def handle_endtag(self, tag):
        if tag.lower() == "a" and self.current_href:
            label = clean(" ".join(self.current_text))
            self.links.append((self.current_href, label))
            self.current_href = None
            self.current_text = []


class ArticleParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.meta = {}
        self.in_title = False
        self.in_h1 = False
        self.capture_text = False
        self.suppressed = 0
        self.title_parts = []
        self.h1_parts = []
        self.body_parts = []

    def handle_starttag(self, tag, attrs):
        tag = tag.lower()
        attr = dict(attrs)
        if tag in {"script", "style", "noscript", "svg"}:
            self.suppressed += 1
            return
        if tag == "meta":
            key = (attr.get("property") or attr.get("name") or "").lower()
            content = attr.get("content", "")
            if key and content:
                self.meta[key] = content
        elif tag == "title":
            self.in_title = True
        elif tag == "h1":
            self.in_h1 = True
        elif tag in {"p", "article"}:
            self.capture_text = True

    def handle_endtag(self, tag):
        tag = tag.lower()
        if tag in {"script", "style", "noscript", "svg"} and self.suppressed:
            self.suppressed -= 1
        elif tag == "title":
            self.in_title = False
        elif tag == "h1":
            self.in_h1 = False
        elif tag in {"p", "article"}:
            self.capture_text = False

    def handle_data(self, data):
        if self.suppressed:
            return
        value = clean(data)
        if not value:
            return
        if self.in_title:
            self.title_parts.append(value)
        if self.in_h1:
            self.h1_parts.append(value)
        if self.capture_text and len(value) > 8:
            self.body_parts.append(value)


def same_site(url: str, base_url: str) -> bool:
    host = urllib.parse.urlparse(url).netloc.lower().split(":")[0]
    base_host = urllib.parse.urlparse(base_url).netloc.lower().split(":")[0]
    return host == base_host or host.endswith("." + base_host) or base_host.endswith("." + host)


def parse_public_index(source):
    entry_url = source.get("entry_url") or source["base_url"]
    payload = fetch_bytes(entry_url)
    parser = LinkParser()
    parser.feed(payload.decode("utf-8", errors="ignore"))
    patterns = [re.compile(value, re.I) for value in source.get("include_patterns", [])]
    seen = set()
    candidates = []
    for href, label in parser.links:
        url = urllib.parse.urljoin(entry_url, href)
        url, _ = urllib.parse.urldefrag(url)
        parsed = urllib.parse.urlparse(url)
        if parsed.scheme not in {"http", "https"} or not same_site(url, source["base_url"]):
            continue
        if patterns and not any(pattern.search(parsed.path + ("?" + parsed.query if parsed.query else "")) for pattern in patterns):
            continue
        if url in seen or len(label) < 6 or label.lower() in {"read more", "查看更多", "更多", "详情"}:
            continue
        seen.add(url)
        candidates.append((url, label))
        if len(candidates) >= int(source.get("max_items", 8)):
            break

    for url, fallback_title in candidates:
        try:
            article = ArticleParser()
            article.feed(fetch_bytes(url).decode("utf-8", errors="ignore"))
            title = clean(
                article.meta.get("og:title")
                or article.meta.get("twitter:title")
                or " ".join(article.h1_parts)
                or fallback_title
                or " ".join(article.title_parts)
            )
            body = clean(
                article.meta.get("description")
                or article.meta.get("og:description")
                or " ".join(article.body_parts[:80])
            )[:12000]
            published = normalized_date(
                article.meta.get("article:published_time")
                or article.meta.get("pubdate")
                or article.meta.get("publishdate")
                or article.meta.get("date")
                or body[:300]
            )
            keywords = source.get("keywords", [])
            haystack = f"{title} {body}"
            if keywords and not any(keyword.lower() in haystack.lower() for keyword in keywords):
                continue
            if title:
                yield {
                    "title": title[:500],
                    "url": url,
                    "body": body,
                    "published": published,
                    "kind": "article",
                }
        except Exception as error:
            print(f"article error [{source.get('name')}] {url}: {error}", file=sys.stderr)


def collect_source(source):
    mode = source.get("mode", "rss")
    if mode == "rss":
        return list(parse_feed(fetch_bytes(source["feed_url"])))
    if mode == "html":
        return list(parse_public_index(source))
    raise ValueError(f"Unsupported source mode: {mode}")


def source_row(source):
    return {key: value for key, value in source.items() if key in SOURCE_COLUMNS}


def main():
    if not SUPABASE_URL or not SERVICE_KEY:
        raise SystemExit("SUPABASE_URL and SUPABASE_SECRET_KEY are required")
    if not SOURCE_FILE.exists():
        raise SystemExit(f"Missing {SOURCE_FILE}")

    sources = [item for item in json.loads(SOURCE_FILE.read_text("utf-8")) if item.get("enabled")]
    inserted = skipped = failed = successful_sources = 0
    for source in sources:
        try:
            items = collect_source(source)
            rows = supabase(
                "sources?on_conflict=name",
                method="POST",
                body=[source_row(source)],
                prefer="resolution=merge-duplicates,return=representation",
            )
            source_id = rows[0]["id"]
            for item in items:
                digest = hashlib.sha256((item["title"] + "\n" + item["body"]).encode()).hexdigest()
                row = {
                    "source_id": source_id,
                    "canonical_url": item["url"],
                    "title": item["title"],
                    "body_text": item["body"],
                    "published_at": item["published"],
                    "content_hash": digest,
                    "kind": item["kind"],
                    "raw_payload": item,
                }
                result = supabase(
                    "raw_documents?on_conflict=canonical_url,content_hash",
                    method="POST",
                    body=[row],
                    prefer="resolution=ignore-duplicates,return=representation",
                )
                if result:
                    inserted += 1
                else:
                    skipped += 1
            successful_sources += 1
            print(json.dumps({
                "source": source["name"],
                "discovered": len(items),
                "status": "ok",
            }, ensure_ascii=False))
        except Exception as error:
            failed += 1
            print(f"collector error [{source.get('name')}]: {error}", file=sys.stderr)

    print(json.dumps({
        "inserted": inserted,
        "skipped": skipped,
        "successful_sources": successful_sources,
        "failed_sources": failed,
    }, ensure_ascii=False))
    if sources and successful_sources == 0:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
