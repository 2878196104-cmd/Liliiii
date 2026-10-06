"""Offline checks for the research collector; no production writes."""
import unittest
from unittest.mock import patch
import collect


class ResearchPoolTests(unittest.TestCase):
    def test_seed_summaries_have_evidence_and_dates(self):
        rows = collect.collect_source({"mode": "curated", "data_file": "config/research-cases.json"})
        self.assertEqual(len(rows), 16)
        self.assertEqual(len({row["url"] for row in rows}), 16)
        for row in rows:
            self.assertTrue(row["url"].startswith("https://"))
            self.assertTrue(row["published"])
            self.assertIn("待验证", row["body"])
            self.assertIn("边界", row["body"])

    def test_same_url_adds_pool_without_new_document(self):
        document = {"id": "test", "canonical_url": "https://example.com/case", "raw_payload": {"pools": ["competitor"], "duplicate_sources": [{"url": "https://example.com/case"}]}}
        item = {"url": "https://example.com/case", "title": "案例"}
        with patch.object(collect, "supabase") as api:
            collect.attach_duplicate_source(document, item, {"name": "专题", "pools": ["research"]}, "same_url")
            api.assert_called_once()
            self.assertEqual(document["raw_payload"]["pools"], ["competitor", "research"])
            self.assertEqual(api.call_args.kwargs["method"], "PATCH")

    def test_article_date_can_be_outside_paragraph(self):
        parser = collect.ArticleParser()
        parser.feed('<script>2001-01-01</script><div>2025-03-25</div><p>睡眠节点营销案例正文</p>')
        self.assertNotIn("2001-01-01", parser.visible_parts)
        self.assertTrue(collect.normalized_date(" ".join(parser.visible_parts)).startswith("2025-03-25"))


if __name__ == "__main__":
    unittest.main()
