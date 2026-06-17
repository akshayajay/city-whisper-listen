import asyncio
import tempfile
import unittest
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import main
from db.database import DatabaseManager


class AnalyticsContractTests(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.original_db_manager = main.db_manager

        test_db = DatabaseManager()
        test_db.db_path = Path(self.temp_dir.name) / "citypulse-test.db"
        test_db._initialize_db()
        main.db_manager = test_db

    def tearDown(self):
        main.db_manager = self.original_db_manager
        self.temp_dir.cleanup()

    def run_async(self, coro):
        return asyncio.run(coro)

    def seed_demo_data(self):
        self.run_async(main.seed_demo_data())

    def test_dashboard_totals_reconcile_with_chart_endpoints(self):
        self.seed_demo_data()

        summary = self.run_async(main.get_dashboard_summary())
        sentiment = self.run_async(main.get_sentiment_data())
        categories = self.run_async(main.get_category_data())
        platforms = self.run_async(main.get_platform_data())

        self.assertGreater(summary["total_signals"], 0)
        self.assertEqual(summary["total_signals"], sum(item["value"] for item in sentiment))
        self.assertEqual(summary["total_signals"], sum(item["value"] for item in categories))
        self.assertEqual(summary["total_signals"], sum(item["count"] for item in platforms))

    def test_geo_analytics_contract_is_consistent(self):
        self.seed_demo_data()

        geo = self.run_async(main.get_geo_analytics(limit=4))

        self.assertGreater(geo.total_signals, 0)
        self.assertEqual(geo.total_signals, geo.mapped_signals + geo.unmapped_signals)
        self.assertLessEqual(len(geo.hotspots), 4)
        self.assertTrue(geo.hotspots)
        self.assertEqual(geo.total_signals, sum(item["value"] for item in geo.category_totals))
        self.assertEqual(geo.total_signals, sum(item["value"] for item in geo.sentiment_totals))
        self.assertEqual(geo.total_signals, sum(item["count"] for item in geo.source_totals))

        for hotspot in geo.hotspots:
            self.assertEqual(hotspot.total, hotspot.positive + hotspot.neutral + hotspot.negative)
            self.assertGreaterEqual(hotspot.urgency_score, hotspot.total)
            self.assertTrue(hotspot.recent_posts)

    def test_analytics_overview_contract_is_consistent(self):
        self.seed_demo_data()

        overview = self.run_async(main.get_analytics_overview())

        self.assertGreater(overview.total_signals, 0)
        self.assertEqual(overview.total_signals, sum(item["value"] for item in overview.sentiment_totals))
        self.assertEqual(overview.total_signals, sum(item["total"] for item in overview.category_sentiment))
        self.assertEqual(overview.total_signals, sum(item["total"] for item in overview.source_sentiment))
        self.assertEqual(overview.total_signals, sum(item["total"] for item in overview.location_sentiment))
        self.assertEqual(overview.total_signals, sum(item["total"] for item in overview.issue_source_matrix))

    def test_submitted_grievance_is_stored_and_searchable(self):
        self.seed_demo_data()

        submitted = self.run_async(main.submit_grievance(main.GrievanceSubmission(
            content="Unit test report: unsafe streetlight near school",
            category="safety",
            area="Unit Test Nagar",
            district="chennai",
        )))
        matches = self.run_async(main.get_posts(limit=5, search="Unit Test Nagar"))

        self.assertEqual(submitted.platform, "Citizen Portal")
        self.assertEqual(submitted.category, "safety")
        self.assertTrue(any(post.id == submitted.id for post in matches))


if __name__ == "__main__":
    unittest.main()
