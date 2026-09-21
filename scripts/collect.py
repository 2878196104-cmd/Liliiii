#!/usr/bin/env python3
"""Collect RSS/Atom items and upsert immutable source documents into Supabase."""

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
from pathlib import Path


SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
SOURCE_FILE = Path(os.environ.get("SOURCE_CONFIG", "config/sources.json"))


def request(url: str, *, method: str = "GET", body=None, headers=None):
    merged = {"User-Agent": "MonthlyKnowCollector/1.0", **(headers or {})}
    data = None if body is None else json.dumps(body).encode("utf-8")
    req = urllib.request.Request(url, data=data, method=method, headers=merged)
    with urllib.request.urlopen(req, timeout=30) as response:
        payload = response.read()
        return json.loads(payload) if payload else None


def supabase(path: str, *, method="GET", body=None, prefer=None):
    headers = {
        "apikey": SERVICE_KEY,
        "Authorization": f"Bearer {SERVICE_KEY}",
        "Content-Type": "application/json",
    }
    if prefer:
        headers["Prefer"] = prefer
    return request(f"{SUPABASE_URL}/rest/v1/{path}", method=method, body=body, headers=headers)


def text(node, names):
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
    except (TypeError, ValueError):
        return value


def parse_feed(payload: bytes):
    root = ET.fromstring(payload)
    nodes = root.findall(".//item")
    if not nodes:
        nodes = root.findall(".//{http://www.w3.org/2005/Atom}entry")
    for node in nodes:
        title = clean(text(node, ["title", "{http://www.w3.org/2005/Atom}title"]))
        link = text(node, ["link"])
        if not link:
            link_node = node.find("{http://www.w3.org/2005/Atom}link")
            link = link_node.attrib.get("href", "") if link_node is not None else ""
        body = clean(text(node, ["description", "summary", "{http://www.w3.org/2005/Atom}summary", "{http://www.w3.org/2005/Atom}content"]))
        published = text(node, ["pubDate", "published", "updated", "{http://www.w3.org/2005/Atom}published", "{http://www.w3.org/2005/Atom}updated"])
        if title and link:
            yield {"title": title, "url": link, "body": body, "published": normalized_date(published)}


def main():
    if not SUPABASE_URL or not SERVICE_KEY:
        raise SystemExit("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required")
    if not SOURCE_FILE.exists():
        raise SystemExit(f"Missing {SOURCE_FILE}; copy config/sources.example.json to config/sources.json")

    sources = [item for item in json.loads(SOURCE_FILE.read_text("utf-8")) if item.get("enabled")]
    inserted = skipped = failed = 0
    for source in sources:
        try:
            with urllib.request.urlopen(
                urllib.request.Request(source["feed_url"], headers={"User-Agent": "MonthlyKnowCollector/1.0"}),
                timeout=30,
            ) as response:
                items = list(parse_feed(response.read()))
            source_rows = supabase(
                "sources?on_conflict=name",
                method="POST",
                body=[source],
                prefer="resolution=merge-duplicates,return=representation",
            )
            source_id = source_rows[0]["id"]
            for item in items:
                digest = hashlib.sha256((item["title"] + "\n" + item["body"]).encode()).hexdigest()
                row = {
                    "source_id": source_id,
                    "canonical_url": item["url"],
                    "title": item["title"],
                    "body_text": item["body"],
                    "published_at": item["published"],
                    "content_hash": digest,
                    "kind": "rss_item",
                    "raw_payload": item,
                }
                try:
                    supabase(
                        "raw_documents?on_conflict=canonical_url,content_hash",
                        method="POST",
                        body=[row],
                        prefer="resolution=ignore-duplicates,return=minimal",
                    )
                    inserted += 1
                except urllib.error.HTTPError as error:
                    if error.code == 409:
                        skipped += 1
                    else:
                        raise
        except Exception as error:  # continue other sources and fail the job at the end
            failed += 1
            print(f"collector error [{source.get('name')}]: {error}", file=sys.stderr)

    print(json.dumps({"inserted": inserted, "skipped": skipped, "failed_sources": failed}, ensure_ascii=False))
    if failed:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
