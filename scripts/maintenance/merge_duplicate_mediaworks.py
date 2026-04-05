#!/usr/bin/env python3
"""
Fictotum MediaWork Cross-QID Deduplication

Merges duplicate MediaWork nodes that share the same title+release_year+media_type
but have different Wikidata Q-IDs. This happens because Wikidata assigns different
Q-IDs to editions/translations of the same work.

Strategy:
1. Find duplicate groups by toLower(trim(title)) + release_year + media_type
2. Score each node: relationship count > property completeness > lowest wikidata_id
3. Merge duplicates into primary (redirect rels, coalesce props, store alternate Q-IDs)
4. Generate markdown report

CRITICAL: This script performs DESTRUCTIVE operations (deletes duplicate nodes).
Always run in dry-run mode first and review the report before executing.

Author: Claude Code (Data Architect)
Date: 2026-02-12
"""

import os
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any
from dotenv import load_dotenv
from neo4j import GraphDatabase


class MediaWorkMerger:
    """Merges duplicate MediaWork nodes across different Wikidata Q-IDs."""

    def __init__(self, uri: str, user: str, pwd: str, dry_run: bool = True):
        if uri.startswith("neo4j+s://"):
            uri = uri.replace("neo4j+s://", "neo4j+ssc://")
        self.driver = GraphDatabase.driver(uri, auth=(user, pwd))
        self.dry_run = dry_run
        self.merge_log: List[Dict[str, Any]] = []
        self.manual_review: List[Dict[str, Any]] = []

    def close(self):
        self.driver.close()

    def find_duplicate_groups(self) -> List[Dict[str, Any]]:
        """Find MediaWork nodes grouped by title + release_year + media_type."""
        print("\n" + "=" * 80)
        print("STEP 1: Finding Duplicate MediaWork Groups")
        print("=" * 80)

        with self.driver.session() as session:
            # Find groups with matching title+year+type
            query = """
            MATCH (m:MediaWork)
            WHERE m.release_year IS NOT NULL AND m.media_type IS NOT NULL
            WITH toLower(trim(m.title)) AS norm_title,
                 m.release_year AS year,
                 m.media_type AS media_type,
                 COLLECT(m) AS works
            WHERE SIZE(works) > 1
            RETURN norm_title, year, media_type, works
            ORDER BY norm_title
            """
            result = session.run(query)
            groups = []
            for record in result:
                works_data = []
                for w in record["works"]:
                    works_data.append(dict(w))
                groups.append({
                    "norm_title": record["norm_title"],
                    "year": record["year"],
                    "media_type": record["media_type"],
                    "works": works_data,
                })

            # Also find works with null year or type and flag for manual review
            query_nulls = """
            MATCH (m:MediaWork)
            WHERE m.release_year IS NULL OR m.media_type IS NULL
            WITH toLower(trim(m.title)) AS norm_title, COLLECT(m) AS works
            WHERE SIZE(works) > 1
            RETURN norm_title, works
            ORDER BY norm_title
            """
            result_nulls = session.run(query_nulls)
            for record in result_nulls:
                works_data = []
                for w in record["works"]:
                    works_data.append(dict(w))
                self.manual_review.append({
                    "norm_title": record["norm_title"],
                    "reason": "Null release_year or media_type",
                    "works": works_data,
                })

            if groups:
                total_dupes = sum(len(g["works"]) - 1 for g in groups)
                print(f"\n  Found {len(groups)} duplicate groups ({total_dupes} nodes to merge)")
                for g in groups:
                    count = len(g["works"])
                    label = "quadruplicate" if count == 4 else "triplicate" if count == 3 else "duplicate"
                    print(f"    {label}: \"{g['works'][0].get('title', g['norm_title'])}\" ({g['year']}, {g['media_type']}) — {count} nodes")
            else:
                print("\n  No auto-mergeable duplicate groups found.")

            if self.manual_review:
                print(f"\n  {len(self.manual_review)} group(s) flagged for manual review (null year/type)")

            return groups

    def score_node(self, node: Dict[str, Any], session) -> tuple:
        """
        Score a MediaWork node for primary selection.
        Returns (rel_count, prop_count, qid_sort_key) — higher is better for first two,
        lower is better for qid tiebreak.
        """
        media_id = node.get("media_id")

        # Count relationships
        query_rels = """
        MATCH (m:MediaWork {media_id: $media_id})-[r]-()
        RETURN COUNT(r) AS rel_count
        """
        result = session.run(query_rels, media_id=media_id)
        rel_count = result.single()["rel_count"]

        # Count non-null properties
        prop_count = sum(1 for v in node.values() if v is not None)

        # Q-ID tiebreak: lower Q-number is preferred (extract numeric part)
        qid = node.get("wikidata_id", "")
        try:
            qid_num = int(qid[1:]) if qid and qid.startswith("Q") else 999999999
        except (ValueError, IndexError):
            qid_num = 999999999

        return (rel_count, prop_count, -qid_num)

    def select_primary(self, works: List[Dict[str, Any]], session) -> tuple:
        """
        Select the primary node from a duplicate group.
        Returns (primary_node, duplicate_nodes).
        """
        scored = [(self.score_node(w, session), w) for w in works]
        # Sort descending by score tuple
        scored.sort(key=lambda x: x[0], reverse=True)
        primary = scored[0][1]
        duplicates = [s[1] for s in scored[1:]]
        return primary, duplicates

    def merge_group(self, group: Dict[str, Any]):
        """Merge a single duplicate group into its primary node."""
        works = group["works"]

        with self.driver.session() as session:
            primary, duplicates = self.select_primary(works, session)

            primary_id = primary.get("media_id")
            primary_title = primary.get("title", "Unknown")
            primary_qid = primary.get("wikidata_id", "N/A")

            print(f"\n  Primary: {primary_title} [{primary_id}] (Q-ID: {primary_qid})")

            for dup in duplicates:
                dup_id = dup.get("media_id")
                dup_qid = dup.get("wikidata_id", "N/A")
                print(f"  Merging: {dup.get('title')} [{dup_id}] (Q-ID: {dup_qid}) → {primary_id}")

                if self.dry_run:
                    self._dry_run_merge(session, primary_id, dup_id, dup_qid, primary_title)
                else:
                    self._execute_merge(session, primary_id, dup_id, dup_qid, primary_title)

    def _dry_run_merge(self, session, primary_id: str, dup_id: str, dup_qid: str, title: str):
        """Preview what a merge would do without modifying the database."""
        # Count relationships individually to avoid Cartesian product
        count_queries = {
            "appears_in_count": "MATCH (:HistoricalFigure)-[r:APPEARS_IN]->(:MediaWork {media_id: $dup_id}) RETURN COUNT(r) AS c",
            "part_of_children": "MATCH ()-[r:PART_OF]->(:MediaWork {media_id: $dup_id}) RETURN COUNT(r) AS c",
            "part_of_parents": "MATCH (:MediaWork {media_id: $dup_id})-[r:PART_OF]->() RETURN COUNT(r) AS c",
            "set_in_count": "MATCH (:MediaWork {media_id: $dup_id})-[r:SET_IN]->() RETURN COUNT(r) AS c",
            "set_in_era_count": "MATCH (:MediaWork {media_id: $dup_id})-[r:SET_IN_ERA]->() RETURN COUNT(r) AS c",
            "scholarly_count": "MATCH (:MediaWork {media_id: $dup_id})-[r:HAS_SCHOLARLY_BASIS]->() RETURN COUNT(r) AS c",
            "fc_count": "MATCH (fc:FictionalCharacter) WHERE fc.media_id = $dup_id RETURN COUNT(fc) AS c",
        }
        counts = {}
        for key, q in count_queries.items():
            counts[key] = session.run(q, dup_id=dup_id).single()["c"]

        print(f"      [DRY RUN] Would redirect {counts['appears_in_count']} APPEARS_IN relationships")
        print(f"      [DRY RUN] Would redirect {counts['part_of_children']} PART_OF children, {counts['part_of_parents']} PART_OF parents")
        print(f"      [DRY RUN] Would redirect {counts['set_in_count']} SET_IN, {counts['set_in_era_count']} SET_IN_ERA relationships")
        print(f"      [DRY RUN] Would redirect {counts['scholarly_count']} HAS_SCHOLARLY_BASIS relationships")
        print(f"      [DRY RUN] Would update {counts['fc_count']} FictionalCharacter.media_id references")
        if dup_qid and dup_qid.startswith("Q"):
            print(f"      [DRY RUN] Would store alternate Q-ID: {dup_qid}")
        else:
            print(f"      [DRY RUN] Skipping non-Wikidata ID: {dup_qid}")
        print(f"      [DRY RUN] Would DETACH DELETE duplicate node")

        self.merge_log.append({
            "title": title,
            "primary_id": primary_id,
            "duplicate_id": dup_id,
            "duplicate_qid": dup_qid,
            "status": "DRY_RUN",
            "appears_in": counts["appears_in_count"],
            "part_of": counts["part_of_children"] + counts["part_of_parents"],
            "set_in": counts["set_in_count"],
            "set_in_era": counts["set_in_era_count"],
            "scholarly": counts["scholarly_count"],
            "fc_refs": counts["fc_count"],
        })

    def _execute_merge(self, session, primary_id: str, dup_id: str, dup_qid: str, title: str):
        """Execute the actual merge of a duplicate into the primary within a single transaction."""
        try:
            def _do_merge(tx):
                stats = {}

                # Step 1: Redirect APPEARS_IN (figure -> mediawork)
                # Handle conflicts: if figure already linked to primary, merge properties
                result = tx.run("""
                MATCH (f:HistoricalFigure)-[r:APPEARS_IN]->(dup:MediaWork {media_id: $dup_id})
                MATCH (primary:MediaWork {media_id: $primary_id})
                WITH f, r, dup, primary
                OPTIONAL MATCH (f)-[existing:APPEARS_IN]->(primary)
                WITH f, r, dup, primary, existing
                FOREACH (_ IN CASE WHEN existing IS NULL THEN [1] ELSE [] END |
                    MERGE (f)-[new_r:APPEARS_IN]->(primary)
                    ON CREATE SET
                        new_r.sentiment_tags = r.sentiment_tags,
                        new_r.tag_metadata = r.tag_metadata,
                        new_r.sentiment = r.sentiment,
                        new_r.role_description = r.role_description,
                        new_r.is_protagonist = r.is_protagonist,
                        new_r.actor_name = r.actor_name,
                        new_r.created_at = r.created_at,
                        new_r.created_by = r.created_by,
                        new_r.created_by_name = r.created_by_name
                )
                FOREACH (_ IN CASE WHEN existing IS NOT NULL THEN [1] ELSE [] END |
                    SET existing.role_description = COALESCE(existing.role_description, r.role_description),
                        existing.actor_name = COALESCE(existing.actor_name, r.actor_name),
                        existing.is_protagonist = COALESCE(existing.is_protagonist, r.is_protagonist),
                        existing.sentiment_tags = COALESCE(existing.sentiment_tags, r.sentiment_tags),
                        existing.tag_metadata = COALESCE(existing.tag_metadata, r.tag_metadata),
                        existing.sentiment = COALESCE(existing.sentiment, r.sentiment)
                )
                DELETE r
                RETURN COUNT(*) AS count
                """, dup_id=dup_id, primary_id=primary_id)
                stats["appears_in"] = result.single()["count"]

                # Step 2: Redirect PART_OF (children of duplicate -> primary)
                result = tx.run("""
                MATCH (child)-[r:PART_OF]->(dup:MediaWork {media_id: $dup_id})
                MATCH (primary:MediaWork {media_id: $primary_id})
                WHERE child <> primary
                MERGE (child)-[new_r:PART_OF]->(primary)
                ON CREATE SET new_r = properties(r)
                DELETE r
                RETURN COUNT(*) AS count
                """, dup_id=dup_id, primary_id=primary_id)
                stats["part_of_children"] = result.single()["count"]

                # Redirect PART_OF (duplicate's parent -> primary)
                result = tx.run("""
                MATCH (dup:MediaWork {media_id: $dup_id})-[r:PART_OF]->(parent)
                MATCH (primary:MediaWork {media_id: $primary_id})
                WHERE parent <> primary
                MERGE (primary)-[new_r:PART_OF]->(parent)
                ON CREATE SET new_r = properties(r)
                DELETE r
                RETURN COUNT(*) AS count
                """, dup_id=dup_id, primary_id=primary_id)
                stats["part_of_parents"] = result.single()["count"]

                # Step 3: Redirect SET_IN
                result = tx.run("""
                MATCH (dup:MediaWork {media_id: $dup_id})-[r:SET_IN]->(loc)
                MATCH (primary:MediaWork {media_id: $primary_id})
                MERGE (primary)-[new_r:SET_IN]->(loc)
                ON CREATE SET new_r = properties(r)
                DELETE r
                RETURN COUNT(*) AS count
                """, dup_id=dup_id, primary_id=primary_id)
                stats["set_in"] = result.single()["count"]

                # Step 4: Redirect SET_IN_ERA
                result = tx.run("""
                MATCH (dup:MediaWork {media_id: $dup_id})-[r:SET_IN_ERA]->(era)
                MATCH (primary:MediaWork {media_id: $primary_id})
                MERGE (primary)-[new_r:SET_IN_ERA]->(era)
                ON CREATE SET new_r = properties(r)
                DELETE r
                RETURN COUNT(*) AS count
                """, dup_id=dup_id, primary_id=primary_id)
                stats["set_in_era"] = result.single()["count"]

                # Step 5: Redirect HAS_SCHOLARLY_BASIS
                result = tx.run("""
                MATCH (dup:MediaWork {media_id: $dup_id})-[r:HAS_SCHOLARLY_BASIS]->(sw)
                MATCH (primary:MediaWork {media_id: $primary_id})
                MERGE (primary)-[new_r:HAS_SCHOLARLY_BASIS]->(sw)
                ON CREATE SET new_r = properties(r)
                DELETE r
                RETURN COUNT(*) AS count
                """, dup_id=dup_id, primary_id=primary_id)
                stats["scholarly"] = result.single()["count"]

                # Step 6: Update FictionalCharacter.media_id references
                result = tx.run("""
                MATCH (fc:FictionalCharacter)
                WHERE fc.media_id = $dup_id
                SET fc.media_id = $primary_id
                RETURN COUNT(fc) AS count
                """, dup_id=dup_id, primary_id=primary_id)
                stats["fc_refs"] = result.single()["count"]

                # Step 7: Fill missing properties on primary via COALESCE
                tx.run("""
                MATCH (dup:MediaWork {media_id: $dup_id})
                MATCH (primary:MediaWork {media_id: $primary_id})
                SET primary.creator = COALESCE(primary.creator, dup.creator),
                    primary.publisher = COALESCE(primary.publisher, dup.publisher),
                    primary.image_url = COALESCE(primary.image_url, dup.image_url),
                    primary.description = COALESCE(primary.description, dup.description),
                    primary.genre = COALESCE(primary.genre, dup.genre),
                    primary.language = COALESCE(primary.language, dup.language),
                    primary.country_of_origin = COALESCE(primary.country_of_origin, dup.country_of_origin),
                    primary.wikidata_label = COALESCE(primary.wikidata_label, dup.wikidata_label),
                    primary.wikidata_description = COALESCE(primary.wikidata_description, dup.wikidata_description)
                """, dup_id=dup_id, primary_id=primary_id)

                # Step 8: Store alternate Q-ID (deduplicated)
                if dup_qid and dup_qid.startswith("Q"):
                    result = tx.run("""
                    MATCH (primary:MediaWork {media_id: $primary_id})
                    SET primary.alternate_qids =
                        CASE WHEN $dup_qid IN COALESCE(primary.alternate_qids, [])
                            THEN primary.alternate_qids
                            ELSE COALESCE(primary.alternate_qids, []) + $dup_qid
                        END
                    RETURN primary.alternate_qids AS alt_qids
                    """, primary_id=primary_id, dup_qid=dup_qid)
                    stats["alt_qids"] = result.single()["alt_qids"]

                # Step 9: DETACH DELETE the duplicate node
                tx.run("""
                MATCH (dup:MediaWork {media_id: $dup_id})
                DETACH DELETE dup
                """, dup_id=dup_id)

                return stats

            stats = session.execute_write(_do_merge)

            print(f"      Redirected {stats['appears_in']} APPEARS_IN relationships")
            print(f"      Redirected {stats['part_of_children']} PART_OF children, {stats['part_of_parents']} PART_OF parents")
            print(f"      Redirected {stats['set_in']} SET_IN, {stats['set_in_era']} SET_IN_ERA relationships")
            if stats["scholarly"] > 0:
                print(f"      Redirected {stats['scholarly']} HAS_SCHOLARLY_BASIS relationships")
            if stats["fc_refs"] > 0:
                print(f"      Updated {stats['fc_refs']} FictionalCharacter.media_id references")
            print(f"      Filled missing properties via COALESCE")
            if "alt_qids" in stats:
                print(f"      Stored alternate Q-ID: {dup_qid} (total: {stats['alt_qids']})")
            print(f"      Deleted duplicate node: {dup_id}")

            self.merge_log.append({
                "title": title,
                "primary_id": primary_id,
                "duplicate_id": dup_id,
                "duplicate_qid": dup_qid,
                "status": "MERGED",
                "appears_in": stats["appears_in"],
                "part_of": stats["part_of_children"] + stats["part_of_parents"],
                "set_in": stats["set_in"],
                "set_in_era": stats["set_in_era"],
                "scholarly": stats["scholarly"],
                "fc_refs": stats["fc_refs"],
            })

        except Exception as e:
            print(f"      ERROR (transaction rolled back): {e}")
            self.merge_log.append({
                "title": title,
                "primary_id": primary_id,
                "duplicate_id": dup_id,
                "duplicate_qid": dup_qid,
                "status": "FAILED",
                "error": str(e),
            })

    def run(self):
        """Execute the full deduplication pipeline."""
        groups = self.find_duplicate_groups()

        if not groups and not self.manual_review:
            print("\nNo duplicates found. Database is clean.")
            return

        if groups:
            print("\n" + "=" * 80)
            print("STEP 2-3: Selecting Primaries & Merging Duplicates")
            print("=" * 80)

            for group in groups:
                title = group["works"][0].get("title", group["norm_title"])
                count = len(group["works"])
                print(f"\n  Group: \"{title}\" ({group['year']}, {group['media_type']}) — {count} nodes")
                self.merge_group(group)

    def generate_report(self, output_path: str):
        """Generate markdown report of all merge operations."""
        print("\n" + "=" * 80)
        print("STEP 4: Generating Report")
        print("=" * 80)

        with open(output_path, 'w') as f:
            f.write("# MediaWork Cross-QID Deduplication Report\n\n")
            f.write(f"**Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
            f.write(f"**Mode:** {'DRY RUN (no changes made)' if self.dry_run else 'LIVE EXECUTION'}\n\n")

            # Summary stats
            total = len(self.merge_log)
            successful = len([m for m in self.merge_log if m["status"] in ("MERGED", "DRY_RUN")])
            failed = len([m for m in self.merge_log if m["status"] == "FAILED"])

            f.write("## Summary\n\n")
            f.write(f"| Metric | Count |\n")
            f.write(f"|--------|-------|\n")
            f.write(f"| Duplicate nodes processed | {total} |\n")
            f.write(f"| Successful merges | {successful} |\n")
            f.write(f"| Failed merges | {failed} |\n")
            f.write(f"| Manual review items | {len(self.manual_review)} |\n\n")

            # Per-group details
            if self.merge_log:
                f.write("## Merge Details\n\n")

                # Group by title for readability
                seen_titles = {}
                for entry in self.merge_log:
                    title = entry["title"]
                    if title not in seen_titles:
                        seen_titles[title] = []
                    seen_titles[title].append(entry)

                for title, entries in seen_titles.items():
                    status_icon = "+" if all(e["status"] in ("MERGED", "DRY_RUN") for e in entries) else "!"
                    f.write(f"### [{status_icon}] {title}\n\n")

                    for entry in entries:
                        f.write(f"- **{entry['duplicate_id']}** (Q-ID: {entry['duplicate_qid']}) → **{entry['primary_id']}**\n")
                        f.write(f"  - Status: {entry['status']}\n")
                        if "error" not in entry:
                            f.write(f"  - APPEARS_IN redirected: {entry.get('appears_in', 0)}\n")
                            f.write(f"  - PART_OF redirected: {entry.get('part_of', 0)}\n")
                            f.write(f"  - SET_IN redirected: {entry.get('set_in', 0)}\n")
                            f.write(f"  - SET_IN_ERA redirected: {entry.get('set_in_era', 0)}\n")
                            f.write(f"  - HAS_SCHOLARLY_BASIS redirected: {entry.get('scholarly', 0)}\n")
                            f.write(f"  - FictionalCharacter refs updated: {entry.get('fc_refs', 0)}\n")
                        else:
                            f.write(f"  - Error: {entry['error']}\n")
                    f.write("\n")

            # Manual review section
            if self.manual_review:
                f.write("## Manual Review Required\n\n")
                f.write("The following groups have null `release_year` or `media_type` and were excluded from auto-merge:\n\n")
                for item in self.manual_review:
                    f.write(f"### \"{item['norm_title']}\"\n\n")
                    f.write(f"- **Reason:** {item['reason']}\n")
                    f.write(f"- **Nodes:**\n")
                    for w in item["works"]:
                        f.write(f"  - `{w.get('media_id', 'N/A')}` — Q-ID: {w.get('wikidata_id', 'N/A')}, "
                                f"year: {w.get('release_year', 'NULL')}, type: {w.get('media_type', 'NULL')}\n")
                    f.write("\n")

            f.write("---\n\n")
            f.write("**End of Report**\n")

        print(f"  Report saved to: {output_path}")


def main():
    load_dotenv()

    uri = os.getenv("NEO4J_URI")
    user = os.getenv("NEO4J_USERNAME", "neo4j")
    pwd = os.getenv("NEO4J_PASSWORD")

    if not uri or not pwd:
        print("Error: NEO4J_URI and NEO4J_PASSWORD must be set in .env")
        sys.exit(1)

    dry_run = "--execute" not in sys.argv

    if dry_run:
        print("\n" + "=" * 80)
        print("DRY RUN MODE — No changes will be made to the database")
        print("Run with --execute flag to perform actual merges")
        print("=" * 80)
    else:
        print("\n" + "=" * 80)
        print("LIVE EXECUTION MODE — Database will be modified")
        print("This is a DESTRUCTIVE operation. Ensure you have a backup.")
        print("=" * 80)
        response = input("\nType 'CONFIRM' to proceed: ")
        if response != "CONFIRM":
            print("Aborted.")
            sys.exit(0)

    merger = MediaWorkMerger(uri, user, pwd, dry_run=dry_run)

    try:
        print(f"\nMediaWork Cross-QID Deduplication")
        print(f"Timestamp: {datetime.now().isoformat()}")

        merger.run()

        report_path = Path(__file__).parent.parent.parent / "mediawork_merge_report.md"
        merger.generate_report(str(report_path))

        print("\n" + "=" * 80)
        print("Deduplication Complete")
        print("=" * 80)
        print(f"\nReport: {report_path}")

        if dry_run:
            print("\nTIP: Run with --execute flag to apply these merges.")

    except Exception as e:
        print(f"\nError during merge: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

    finally:
        merger.close()


if __name__ == "__main__":
    main()
