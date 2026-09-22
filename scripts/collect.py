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
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from html.parser import HTMLParser
from pathlib import Path


SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
SERVICE_KEY = os.environ.get("SUPABASE_SECRET_KEY") or os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
SOURCE_FILE = Path(os.environ.get("SOURCE_CONFIG", "config/sources.json"))
BROWSER_USER_AGENT = "Mozilla/5.0 (compatible; MonthlyKnowCollector/2.0; +https://2878196104-cmd.github.io/Liliiii/)"
API_USER_AGENT = "MonthlyKnowCollector/2.0"
SOURCE_COLUMNS = {
    "name", "base_url", "platform", "feed_url", "trust_level",
    "enabled", "collection_interval_minutes"
}
FORCE_COLLECT = os.environ.get("FORCE_COLLECT", "").lower() in {"1", "true", "yes"}
CORE_TERMS = {
    "家居", "家具", "床垫", "沙发", "睡眠", "整家", "定制", "软体", "材料",
    "品牌", "消费", "零售", "电商", "门店", "出海", "生活方式",
}
ACTION_TERMS = {
    "发布", "推出", "上线", "开店", "联名", "升级", "增长", "报告", "趋势",
    "战略", "渠道", "用户", "消费者", "销量", "营收", "融资", "营销", "案例", "新品", "展会", "ai",
}
NOISE_TERMS = {"招聘", "招标", "联系我们", "隐私政策", "用户协议", "登录", "注册", "下载app"}
PREFERENCE_PROFILE = {"terms": {}, "sources": {}, "decisions": 0}


def fetch_bytes(url: str) -> bytes:
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": BROWSER_USER_AGENT,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
    )
    with urllib.request.urlopen(req, timeout=12) as response:
        return response.read()


def request(url: str, *, method: str = "GET", body=None, headers=None):
    merged = {"User-Agent": API_USER_AGENT, **(headers or {})}
    data = None if body is None else json.dumps(body).encode("utf-8")
    req = urllib.request.Request(url, data=data, method=method, headers=merged)
    with urllib.request.urlopen(req, timeout=12) as response:
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


def load_review_preferences():
    """Build a small, auditable preference profile from explicit human decisions only."""
    rows = supabase(
        "raw_documents?select=processing_status,raw_payload,sources(name)"
        "&processing_status=in.(accepted,ignored)&limit=1000"
    ) or []
    profile = {"terms": {}, "sources": {}, "decisions": 0}
    for row in rows:
        feedback = (row.get("raw_payload") or {}).get("review_feedback") or {}
        decision = feedback.get("decision")
        if decision not in {"accepted", "ignored"}:
            continue
        profile["decisions"] += 1
        delta = 2.0 if decision == "accepted" else -1.5
        features = feedback.get("features") or {}
        for term in set((features.get("topics") or []) + (features.get("values") or [])):
            profile["terms"][term] = profile["terms"].get(term, 0) + delta
        source_name = feedback.get("source") or (row.get("sources") or {}).get("name")
        if source_name:
            profile["sources"][source_name] = profile["sources"].get(source_name, 0) + delta
    return profile


def preference_adjustment(source, haystack):
    if not PREFERENCE_PROFILE["decisions"]:
        return 0, []
    signals = []
    value = 0.0
    for term, weight in PREFERENCE_PROFILE["terms"].items():
        if term.lower() in haystack:
            value += weight
            signals.append(term)
    source_weight = PREFERENCE_PROFILE["sources"].get(source.get("name"), 0)
    value += source_weight
    return max(-15, min(20, round(value))), sorted(signals)


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


def score_item(source, item):
    """Score before an item reaches the human inbox; keep the rationale for audit."""
    haystack = clean(f"{item.get('title', '')} {item.get('body', '')}").lower()
    core_hits = sorted(term for term in CORE_TERMS if term.lower() in haystack)
    action_hits = sorted(term for term in ACTION_TERMS if term.lower() in haystack)
    noise_hits = sorted(term for term in NOISE_TERMS if term.lower() in haystack)

    topic_score = min(30, len(core_hits) * 6)
    value_score = min(25, len(action_hits) * 4)
    trust_score = {1: 5, 2: 10, 3: 15}.get(int(source.get("trust_level", 2)), 10)
    completeness_score = 4
    if len(item.get("title", "")) >= 8:
        completeness_score += 2
    if len(item.get("body", "")) >= 80:
        completeness_score += 2
    if item.get("url"):
        completeness_score += 1
    if item.get("published"):
        completeness_score += 1

    freshness_score = 4
    published = item.get("published")
    if published:
        try:
            parsed = datetime.fromisoformat(published.replace("Z", "+00:00"))
            if parsed.tzinfo is None:
                parsed = parsed.replace(tzinfo=timezone.utc)
            age_days = max(0, (datetime.now(timezone.utc) - parsed).days)
            freshness_score = 15 if age_days <= 7 else 12 if age_days <= 30 else 8 if age_days <= 90 else 0
        except (TypeError, ValueError):
            pass

    penalty = 30 if noise_hits else 0
    preference_score, preference_hits = preference_adjustment(source, haystack)
    score = max(0, min(100, topic_score + value_score + trust_score + completeness_score + freshness_score + preference_score - penalty))
    status = "new" if score >= 60 else "needs_review" if score >= 45 else "ignored"
    return {
        "score": score,
        "status": status,
        "topic_hits": core_hits,
        "value_hits": action_hits,
        "noise_hits": noise_hits,
        "breakdown": {
            "topic": topic_score,
            "strategic_value": value_score,
            "source_trust": trust_score,
            "completeness": completeness_score,
            "freshness": freshness_score,
            "human_preference": preference_score,
            "penalty": penalty,
        },
        "preference_hits": preference_hits,
        "preference_decisions": PREFERENCE_PROFILE["decisions"],
        "version": "prefilter-v2-human-feedback",
    }


def is_due(source_row):
    if FORCE_COLLECT or not source_row.get("last_collected_at"):
        return True
    try:
        last = datetime.fromisoformat(source_row["last_collected_at"].replace("Z", "+00:00"))
        interval = int(source_row.get("collection_interval_minutes") or 360)
        return (datetime.now(timezone.utc) - last).total_seconds() >= interval * 60
    except (TypeError, ValueError):
        return True


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


def prepare_source(source):
    encoded = urllib.parse.quote(source["name"], safe="")
    existing = supabase(f"sources?select=*&name=eq.{encoded}&limit=1") or []
    if existing:
        current = existing[0]
        payload = source_row(source)
        # Database values are operator controls; config remains the discovery registry.
        payload["enabled"] = current.get("enabled", payload.get("enabled", True))
        payload["collection_interval_minutes"] = current.get(
            "collection_interval_minutes", payload.get("collection_interval_minutes", 360)
        )
    else:
        current = None
        payload = source_row(source)
    rows = supabase(
        "sources?on_conflict=name",
        method="POST",
        body=[payload],
        prefer="resolution=merge-duplicates,return=representation",
    )
    return rows[0]


def rescore_existing():
    rows = supabase(
        "raw_documents?select=id,title,body_text,canonical_url,published_at,kind,raw_payload,processing_status,"
        "sources(name,platform,trust_level)&processing_status=in.(new,needs_review)&limit=1000"
    ) or []
    changed = 0
    for row in rows:
        source = row.get("sources") or {}
        item = {
            "title": row.get("title") or "",
            "body": row.get("body_text") or "",
            "url": row.get("canonical_url") or "",
            "published": row.get("published_at"),
            "kind": row.get("kind") or "article",
        }
        prefilter = score_item(source, item)
        raw_payload = row.get("raw_payload") or {}
        if row.get("processing_status") != prefilter["status"] or raw_payload.get("prefilter") != prefilter:
            raw_payload["prefilter"] = prefilter
            supabase(
                f"raw_documents?id=eq.{row['id']}", method="PATCH",
                body={"processing_status": prefilter["status"], "raw_payload": raw_payload},
                prefer="return=minimal",
            )
            changed += 1
    return changed


def status_snapshot():
    rows = supabase("raw_documents?select=processing_status&limit=1000") or []
    counts = {}
    for row in rows:
        status = row.get("processing_status") or "new"
        counts[status] = counts.get(status, 0) + 1
    return {"total": len(rows), **counts}


def infer_event_type(title, body):
    text_value = f"{title or ''} {body or ''}"
    rules = [
        (r"联名|合作", "品牌联名"),
        (r"新品|发布|推出|上市", "新品发布"),
        (r"门店|开业|开店", "渠道动作"),
        (r"报告|趋势|数据", "行业趋势"),
        (r"营销|广告|案例|campaign", "营销案例"),
    ]
    for pattern, label in rules:
        if re.search(pattern, text_value, re.I):
            return label
    return "行业动态"


def backfill_accepted_events():
    documents = supabase(
        "raw_documents?select=id,title,body_text,published_at,raw_payload,sources(name)"
        "&processing_status=eq.accepted&limit=1000"
    ) or []
    evidence_rows = supabase("event_evidence?select=document_id&limit=5000") or []
    linked = {row["document_id"] for row in evidence_rows}
    created = 0
    for document in documents:
        if document["id"] in linked:
            continue
        score = ((document.get("raw_payload") or {}).get("prefilter") or {}).get("score", 50)
        summary = clean(document.get("body_text") or "")[:360] or "正文摘要待补充"
        source_name = (document.get("sources") or {}).get("name") or "待归类"
        events = supabase(
            "events", method="POST",
            body=[{
                "title": document["title"],
                "event_type": infer_event_type(document["title"], document.get("body_text")),
                "theme": source_name,
                "summary": summary,
                "happened_at": document.get("published_at"),
                "status": "pending",
                "confidence": max(0, min(1, float(score) / 100)),
                "created_by": "accepted-document-backfill",
            }],
            prefer="return=representation",
        )
        supabase(
            "event_evidence", method="POST",
            body=[{
                "event_id": events[0]["id"],
                "document_id": document["id"],
                "quote_text": summary[:500],
                "evidence_role": "primary",
            }],
            prefer="return=minimal",
        )
        created += 1
    return created


def main():
    global PREFERENCE_PROFILE
    if not SUPABASE_URL or not SERVICE_KEY:
        raise SystemExit("SUPABASE_URL and SUPABASE_SECRET_KEY are required")
    if not SOURCE_FILE.exists():
        raise SystemExit(f"Missing {SOURCE_FILE}")

    sources = [item for item in json.loads(SOURCE_FILE.read_text("utf-8")) if item.get("enabled")]
    print(json.dumps({
        "preflight": "starting",
        "secret_key_format": "sb_secret" if SERVICE_KEY.startswith("sb_secret_") else "legacy_or_unknown",
        "source_count": len(sources),
    }, ensure_ascii=False))
    try:
        supabase("sources?select=id&limit=1")
        print(json.dumps({"preflight": "supabase_ok"}, ensure_ascii=False))
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", errors="ignore")[:500]
        print(json.dumps({
            "preflight": "supabase_failed",
            "status": error.code,
            "detail": detail,
        }, ensure_ascii=False), file=sys.stderr)
        raise SystemExit(1)

    PREFERENCE_PROFILE = load_review_preferences()
    print(json.dumps({
        "preference_learning": "active" if PREFERENCE_PROFILE["decisions"] else "waiting_for_human_decisions",
        "human_decisions": PREFERENCE_PROFILE["decisions"],
        "learned_terms": len(PREFERENCE_PROFILE["terms"]),
        "learned_sources": len(PREFERENCE_PROFILE["sources"]),
    }, ensure_ascii=False))

    inserted = skipped = failed = successful_sources = not_due_sources = paused_sources = 0
    for source in sources:
        try:
            database_source = prepare_source(source)
            if not database_source.get("enabled", True):
                paused_sources += 1
                print(json.dumps({"source": source["name"], "status": "paused"}, ensure_ascii=False))
                continue
            if not is_due(database_source):
                not_due_sources += 1
                print(json.dumps({"source": source["name"], "status": "not_due"}, ensure_ascii=False))
                continue
            items = collect_source(source)
            source_id = database_source["id"]
            for item in items:
                digest = hashlib.sha256((item["title"] + "\n" + item["body"]).encode()).hexdigest()
                prefilter = score_item(source, item)
                row = {
                    "source_id": source_id,
                    "canonical_url": item["url"],
                    "title": item["title"],
                    "body_text": item["body"],
                    "published_at": item["published"],
                    "content_hash": digest,
                    "kind": item["kind"],
                    "raw_payload": {**item, "prefilter": prefilter},
                    "processing_status": prefilter["status"],
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
            supabase(
                f"sources?id=eq.{source_id}",
                method="PATCH",
                body={"last_collected_at": __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat()},
                prefer="return=minimal",
            )
            successful_sources += 1
            print(json.dumps({
                "source": source["name"],
                "discovered": len(items),
                "high_value": sum(score_item(source, item)["status"] == "new" for item in items),
                "needs_review": sum(score_item(source, item)["status"] == "needs_review" for item in items),
                "auto_ignored": sum(score_item(source, item)["status"] == "ignored" for item in items),
                "status": "ok",
            }, ensure_ascii=False))
        except urllib.error.HTTPError as error:
            failed += 1
            failing_host = urllib.parse.urlparse(getattr(error, "url", "")).netloc
            detail = error.read().decode("utf-8", errors="ignore")[:300]
            print(json.dumps({
                "source": source.get("name"),
                "status": "http_error",
                "host": failing_host,
                "http_status": error.code,
                "detail": detail,
            }, ensure_ascii=False), file=sys.stderr)
        except Exception as error:
            failed += 1
            print(json.dumps({
                "source": source.get("name"),
                "status": "error",
                "detail": str(error),
            }, ensure_ascii=False), file=sys.stderr)

    rescored = rescore_existing()
    candidate_events_created = backfill_accepted_events()
    queue_snapshot = status_snapshot()
    print(json.dumps({
        "inserted": inserted,
        "skipped": skipped,
        "successful_sources": successful_sources,
        "failed_sources": failed,
        "not_due_sources": not_due_sources,
        "paused_sources": paused_sources,
        "rescored_existing": rescored,
        "queue_snapshot": queue_snapshot,
        "candidate_events_created": candidate_events_created,
    }, ensure_ascii=False))
    # A run is healthy when registered sources are simply waiting for their own interval.
    if sources and successful_sources == 0 and not_due_sources == 0 and paused_sources == 0:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
