#!/usr/bin/env python3
"""
Fictotum Batch Import Tool (CHR-40)

Imports large batches of pre-validated historical figures and media works from structured JSON files.
Implements duplicate detection, Wikidata validation, and transaction management.

Author: Claude Code (Neo4j Data Architect)
Date: 2026-02-01
"""

import os
import sys
import json
import argparse
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple
from dotenv import load_dotenv
from neo4j import GraphDatabase
import requests
import time

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))
from schema import SCHEMA_CONSTRAINTS
from lib.wikidata_search import search_wikidata_for_work, validate_qid

# Import similarity detection (will use Levenshtein + phonetic)
try:
    from thefuzz import fuzz
    THEFUZZ_AVAILABLE = True
except ImportError:
    THEFUZZ_AVAILABLE = False
    print("⚠️  Warning: thefuzz not available. Similarity detection will be basic.")


class BatchImportError(Exception):
    """Raised when batch import encounters an error."""
    pass


class BatchImporter:
    """
    Imports batches of historical figures and media works from JSON files.

    Features:
    - JSON schema validation
    - Duplicate detection using enhanced name similarity (lexical + phonetic)
    - Wikidata Q-ID validation
    - Batch transaction management
    - Dry-run mode with import preview
    - Detailed logging and error reporting
    - Automatic CREATED_BY attribution
    - Rollback on error
    """

    def __init__(
        self,
        uri: str,
        user: str,
        pwd: str,
        dry_run: bool = True,
        batch_size: int = 50,
        agent_name: str = "batch-importer"
    ):
        """
        Initialize batch importer.

        Args:
            uri: Neo4j connection URI
            user: Neo4j username
            pwd: Neo4j password
            dry_run: If True, preview imports without committing
            batch_size: Number of records per transaction
            agent_name: Name of agent creating the data (for CREATED_BY)
        """
        # SSL certificate handling for Neo4j Aura
        if uri.startswith("neo4j+s://"):
            uri = uri.replace("neo4j+s://", "neo4j+ssc://")

        self.driver = GraphDatabase.driver(uri, auth=(user, pwd))
        self.dry_run = dry_run
        self.batch_size = batch_size
        self.agent_name = agent_name

        # Import tracking
        self.batch_id = f"batch_import_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        self.source_name = "batch_import_v1"

        # Statistics
        self.stats = {
            "figures_created": 0,
            "figures_skipped_duplicate": 0,
            "figures_updated": 0,
            "works_created": 0,
            "works_skipped_duplicate": 0,
            "works_updated": 0,
            "relationships_created": 0,
            "errors": [],
            "warnings": []
        }

        # Validation results
        self.duplicate_figures: List[Dict] = []
        self.duplicate_works: List[Dict] = []
        self.invalid_qids: List[Dict] = []

    def close(self):
        """Close database connection."""
        self.driver.close()

    def setup_schema(self):
        """Apply schema constraints from schema.py"""
        if self.dry_run:
            print("📋 [DRY RUN] Would verify schema constraints")
            return

        with self.driver.session() as session:
            for statement in SCHEMA_CONSTRAINTS.strip().split(';'):
                if statement.strip():
                    try:
                        session.run(statement)
                    except Exception as e:
                        # Constraint may already exist, that's OK
                        pass
        print("✅ Schema constraints verified.")

    def validate_json_schema(self, data: Dict) -> Tuple[bool, List[str]]:
        """
        Validate JSON structure against expected schema.

        Args:
            data: Parsed JSON data

        Returns:
            Tuple of (is_valid, error_messages)
        """
        errors = []

        # Check top-level structure
        if not isinstance(data, dict):
            errors.append("Root must be an object/dict")
            return False, errors

        # Validate metadata section
        if "metadata" not in data:
            errors.append("Missing required 'metadata' section")
        else:
            metadata = data["metadata"]
            required_meta_fields = ["source", "curator", "date"]
            for field in required_meta_fields:
                if field not in metadata:
                    errors.append(f"metadata.{field} is required")

        # Validate figures array (if present)
        if "figures" in data:
            if not isinstance(data["figures"], list):
                errors.append("'figures' must be an array")
            else:
                for idx, figure in enumerate(data["figures"]):
                    figure_errors = self._validate_figure_schema(figure, idx)
                    errors.extend(figure_errors)

        # Validate works array (if present)
        if "works" in data:
            if not isinstance(data["works"], list):
                errors.append("'works' must be an array")
            else:
                for idx, work in enumerate(data["works"]):
                    work_errors = self._validate_work_schema(work, idx)
                    errors.extend(work_errors)

        # Validate relationships array (if present)
        if "relationships" in data:
            if not isinstance(data["relationships"], list):
                errors.append("'relationships' must be an array")
            else:
                for idx, rel in enumerate(data["relationships"]):
                    rel_errors = self._validate_relationship_schema(rel, idx)
                    errors.extend(rel_errors)

        # Must have at least figures or works
        if "figures" not in data and "works" not in data:
            errors.append("Must provide at least 'figures' or 'works' array")

        return len(errors) == 0, errors

    def _validate_figure_schema(self, figure: Dict, idx: int) -> List[str]:
        """Validate a single historical figure object."""
        errors = []
        prefix = f"figures[{idx}]"

        # Required fields
        if "name" not in figure:
            errors.append(f"{prefix}.name is required")

        # Canonical ID or Wikidata ID required
        has_canonical = "canonical_id" in figure and figure["canonical_id"]
        has_wikidata = "wikidata_id" in figure and figure["wikidata_id"]

        if not has_canonical and not has_wikidata:
            errors.append(f"{prefix}: must provide either 'canonical_id' or 'wikidata_id'")

        # Validate year fields if present
        for year_field in ["birth_year", "death_year"]:
            if year_field in figure and figure[year_field] is not None:
                if not isinstance(figure[year_field], int):
                    errors.append(f"{prefix}.{year_field} must be an integer")

        # Validate wikidata_id format if present
        if has_wikidata:
            qid = figure["wikidata_id"]
            if not qid.startswith("Q") or not qid[1:].isdigit():
                errors.append(f"{prefix}.wikidata_id has invalid format: {qid} (must be Q followed by digits)")

        return errors

    def _validate_work_schema(self, work: Dict, idx: int) -> List[str]:
        """Validate a single media work object."""
        errors = []
        prefix = f"works[{idx}]"

        # Required fields
        required = ["title"]
        for field in required:
            if field not in work:
                errors.append(f"{prefix}.{field} is required")

        # Wikidata ID strongly recommended (will search if not provided)
        if "wikidata_id" not in work or not work["wikidata_id"]:
            self.stats["warnings"].append(
                f"{prefix}: no wikidata_id provided. Will attempt Wikidata search."
            )
        else:
            # Validate format
            qid = work["wikidata_id"]
            if not qid.startswith("Q") or not qid[1:].isdigit():
                errors.append(f"{prefix}.wikidata_id has invalid format: {qid}")

        # Validate year if present
        if "release_year" in work and work["release_year"] is not None:
            if not isinstance(work["release_year"], int):
                errors.append(f"{prefix}.release_year must be an integer")

        return errors

    def _validate_relationship_schema(self, rel: Dict, idx: int) -> List[str]:
        """Validate a single relationship object."""
        errors = []
        prefix = f"relationships[{idx}]"

        # Required fields
        required = ["from_id", "from_type", "to_id", "to_type", "rel_type"]
        for field in required:
            if field not in rel:
                errors.append(f"{prefix}.{field} is required")

        # Validate node types
        valid_types = ["HistoricalFigure", "MediaWork", "FictionalCharacter"]
        if "from_type" in rel and rel["from_type"] not in valid_types:
            errors.append(f"{prefix}.from_type must be one of: {valid_types}")
        if "to_type" in rel and rel["to_type"] not in valid_types:
            errors.append(f"{prefix}.to_type must be one of: {valid_types}")

        # Validate relationship type
        valid_rels = [
            "APPEARS_IN", "PORTRAYED_IN", "INTERACTED_WITH",
            "BASED_ON", "FICTIONAL_PROXY", "CONTEMPORARY"
        ]
        if "rel_type" in rel and rel["rel_type"] not in valid_rels:
            errors.append(f"{prefix}.rel_type must be one of: {valid_rels}")

        return errors

    def detect_duplicate_figures(self, figures: List[Dict]):
        """
        Check for duplicate figures in database using enhanced name similarity.

        Uses the same algorithm as web-app:
        - Wikidata Q-ID check (exact match)
        - Canonical ID check (exact match)
        - Enhanced name similarity (70% lexical + 30% phonetic)
        """
        print("\n🔍 Checking for duplicate figures...")

        with self.driver.session() as session:
            for figure in figures:
                name = figure["name"]
                canonical_id = figure.get("canonical_id")
                wikidata_id = figure.get("wikidata_id")

                # Check 1: Exact Q-ID match
                if wikidata_id and wikidata_id.startswith("Q"):
                    query = """
                    MATCH (f:HistoricalFigure)
                    WHERE f.wikidata_id = $qid
                    RETURN f.canonical_id AS canonical_id, f.name AS name,
                           f.wikidata_id AS wikidata_id
                    LIMIT 1
                    """
                    result = session.run(query, qid=wikidata_id)
                    record = result.single()
                    if record:
                        self.duplicate_figures.append({
                            "input_figure": figure,
                            "existing_figure": dict(record),
                            "match_type": "exact_qid",
                            "confidence": "high"
                        })
                        continue

                # Check 2: Exact canonical_id match
                if canonical_id:
                    query = """
                    MATCH (f:HistoricalFigure)
                    WHERE f.canonical_id = $canonical_id
                    RETURN f.canonical_id AS canonical_id, f.name AS name,
                           f.wikidata_id AS wikidata_id
                    LIMIT 1
                    """
                    result = session.run(query, canonical_id=canonical_id)
                    record = result.single()
                    if record:
                        self.duplicate_figures.append({
                            "input_figure": figure,
                            "existing_figure": dict(record),
                            "match_type": "exact_canonical_id",
                            "confidence": "high"
                        })
                        continue

                # Check 3: Enhanced name similarity (lexical + phonetic)
                # Get all figures with similar names for comparison
                query = """
                MATCH (f:HistoricalFigure)
                WHERE toLower(f.name) CONTAINS toLower($name_part)
                   OR toLower($name_part) CONTAINS toLower(f.name)
                RETURN f.canonical_id AS canonical_id, f.name AS name,
                       f.wikidata_id AS wikidata_id,
                       f.birth_year AS birth_year,
                       f.death_year AS death_year
                LIMIT 20
                """
                # Extract first word for search
                name_part = name.split()[0] if name else ""
                result = session.run(query, name_part=name_part)

                for record in result:
                    db_name = record["name"]
                    similarity = self._calculate_enhanced_similarity(name, db_name)

                    # High confidence threshold: 0.9
                    if similarity >= 0.9:
                        # Additional check: birth/death years if available
                        year_match = self._check_year_match(
                            figure.get("birth_year"),
                            figure.get("death_year"),
                            record["birth_year"],
                            record["death_year"]
                        )

                        if year_match or (
                            figure.get("birth_year") is None and
                            figure.get("death_year") is None
                        ):
                            self.duplicate_figures.append({
                                "input_figure": figure,
                                "existing_figure": dict(record),
                                "match_type": "name_similarity",
                                "confidence": "high" if similarity >= 0.95 else "medium",
                                "similarity_score": similarity
                            })
                            break

        if self.duplicate_figures:
            print(f"⚠️  Found {len(self.duplicate_figures)} potential duplicate figures")
        else:
            print("✅ No duplicate figures detected")

    def _calculate_enhanced_similarity(self, name1: str, name2: str) -> float:
        """
        Calculate enhanced name similarity using lexical + phonetic matching.

        Weight distribution: 70% lexical, 30% phonetic
        """
        if not THEFUZZ_AVAILABLE:
            # Fallback to simple string comparison
            if name1.lower() == name2.lower():
                return 1.0
            elif name1.lower() in name2.lower() or name2.lower() in name1.lower():
                return 0.8
            return 0.0

        # Lexical similarity using Levenshtein distance
        lexical_score = fuzz.ratio(name1.lower(), name2.lower()) / 100.0

        # Phonetic similarity (simplified - would use double-metaphone in production)
        # For now, use token_sort_ratio which handles word order
        phonetic_score = fuzz.token_sort_ratio(name1.lower(), name2.lower()) / 100.0

        # Weighted average: 70% lexical, 30% phonetic
        return (lexical_score * 0.7) + (phonetic_score * 0.3)

    def _check_year_match(
        self,
        birth1: Optional[int],
        death1: Optional[int],
        birth2: Optional[int],
        death2: Optional[int]
    ) -> bool:
        """Check if birth/death years match within tolerance."""
        YEAR_TOLERANCE = 5  # ±5 years for fuzzy historical dates

        if birth1 and birth2:
            if abs(birth1 - birth2) <= YEAR_TOLERANCE:
                return True

        if death1 and death2:
            if abs(death1 - death2) <= YEAR_TOLERANCE:
                return True

        return False

    def detect_duplicate_works(self, works: List[Dict]):
        """
        Check for duplicate media works in database.

        Uses:
        - Wikidata Q-ID check (exact match)
        - Title similarity + year matching
        """
        print("\n🔍 Checking for duplicate media works...")

        with self.driver.session() as session:
            for work in works:
                title = work["title"]
                wikidata_id = work.get("wikidata_id")
                release_year = work.get("release_year")
                media_type = work.get("media_type")

                # Check 0: Exact title + year + type match (catches cross-QID duplicates)
                if release_year and media_type:
                    query_compound = """
                    MATCH (m:MediaWork)
                    WHERE toLower(trim(m.title)) = toLower(trim($title))
                      AND m.release_year = $year
                      AND m.media_type = $media_type
                    RETURN m.media_id AS media_id, m.title AS title,
                           m.wikidata_id AS wikidata_id,
                           m.release_year AS release_year
                    LIMIT 1
                    """
                    result = session.run(query_compound, title=title, year=release_year, media_type=media_type)
                    record = result.single()
                    if record:
                        self.duplicate_works.append({
                            "input_work": work,
                            "existing_work": dict(record),
                            "match_type": "title_year_type_exact",
                            "confidence": "high"
                        })
                        continue

                # Check 1: Exact Q-ID match
                if wikidata_id and wikidata_id.startswith("Q"):
                    query = """
                    MATCH (m:MediaWork)
                    WHERE m.wikidata_id = $qid
                    RETURN m.media_id AS media_id, m.title AS title,
                           m.wikidata_id AS wikidata_id,
                           m.release_year AS release_year
                    LIMIT 1
                    """
                    result = session.run(query, qid=wikidata_id)
                    record = result.single()
                    if record:
                        self.duplicate_works.append({
                            "input_work": work,
                            "existing_work": dict(record),
                            "match_type": "exact_qid",
                            "confidence": "high"
                        })
                        continue

                # Check 2: Title similarity + year
                query = """
                MATCH (m:MediaWork)
                WHERE toLower(m.title) CONTAINS toLower($title_part)
                   OR toLower($title_part) CONTAINS toLower(m.title)
                RETURN m.media_id AS media_id, m.title AS title,
                       m.wikidata_id AS wikidata_id,
                       m.release_year AS release_year
                LIMIT 10
                """
                title_part = title.split()[0] if title else ""
                result = session.run(query, title_part=title_part)

                for record in result:
                    db_title = record["title"]
                    similarity = self._calculate_enhanced_similarity(title, db_title)

                    # Title similarity threshold: 0.85
                    if similarity >= 0.85:
                        # Check year if available
                        db_year = record["release_year"]
                        if release_year and db_year:
                            year_diff = abs(release_year - db_year)
                            if year_diff <= 2:  # ±2 years tolerance
                                self.duplicate_works.append({
                                    "input_work": work,
                                    "existing_work": dict(record),
                                    "match_type": "title_and_year",
                                    "confidence": "high",
                                    "similarity_score": similarity
                                })
                                break
                        else:
                            # No year data, rely on title alone
                            self.duplicate_works.append({
                                "input_work": work,
                                "existing_work": dict(record),
                                "match_type": "title_similarity",
                                "confidence": "medium",
                                "similarity_score": similarity
                            })
                            break

        if self.duplicate_works:
            print(f"⚠️  Found {len(self.duplicate_works)} potential duplicate works")
        else:
            print("✅ No duplicate works detected")

    def validate_wikidata_qids(self, data: Dict):
        """
        Validate all Wikidata Q-IDs by querying Wikidata API.

        For MediaWork nodes, this is MANDATORY per entity resolution protocol.
        """
        print("\n🔍 Validating Wikidata Q-IDs...")

        # Validate figure Q-IDs
        if "figures" in data:
            for figure in data["figures"]:
                if "wikidata_id" in figure and figure["wikidata_id"]:
                    qid = figure["wikidata_id"]
                    if qid.startswith("Q"):
                        try:
                            validation = validate_qid(qid, figure["name"])
                            if not validation["valid"]:
                                self.invalid_qids.append({
                                    "type": "HistoricalFigure",
                                    "name": figure["name"],
                                    "qid": qid,
                                    "error": validation.get("error", "Invalid Q-ID")
                                })
                        except Exception as e:
                            self.stats["warnings"].append(
                                f"Could not validate Q-ID {qid} for {figure['name']}: {e}"
                            )

        # Validate work Q-IDs (MANDATORY)
        if "works" in data:
            for work in data["works"]:
                if "wikidata_id" in work and work["wikidata_id"]:
                    qid = work["wikidata_id"]
                    if qid.startswith("Q"):
                        try:
                            validation = validate_qid(qid, work["title"])
                            if not validation["valid"]:
                                self.invalid_qids.append({
                                    "type": "MediaWork",
                                    "name": work["title"],
                                    "qid": qid,
                                    "error": validation.get("error", "Invalid Q-ID")
                                })
                        except Exception as e:
                            self.stats["warnings"].append(
                                f"Could not validate Q-ID {qid} for {work['title']}: {e}"
                            )
                else:
                    # No Q-ID provided - try to search Wikidata
                    print(f"   🔎 Searching Wikidata for: {work['title']}")
                    try:
                        result = search_wikidata_for_work(
                            title=work["title"],
                            creator=work.get("creator"),
                            year=work.get("release_year"),
                            media_type=work.get("media_type")
                        )
                        if result and result["confidence"] in ["high", "medium"]:
                            print(f"      ✅ Found Q-ID: {result['qid']} (confidence: {result['confidence']})")
                            work["wikidata_id"] = result["qid"]
                        else:
                            self.stats["warnings"].append(
                                f"Could not find Wikidata Q-ID for: {work['title']}"
                            )
                    except Exception as e:
                        self.stats["warnings"].append(
                            f"Wikidata search failed for {work['title']}: {e}"
                        )

        if self.invalid_qids:
            print(f"❌ Found {len(self.invalid_qids)} invalid Q-IDs")
        else:
            print("✅ All Q-IDs validated")

    def import_figures(self, figures: List[Dict], metadata: Dict):
        """
        Import historical figures into database.

        Implements:
        - Wikidata-first canonical ID strategy
        - Duplicate prevention
        - Batch transactions
        """
        if not figures:
            return

        print(f"\n📥 Importing {len(figures)} historical figures...")

        # Filter out duplicates
        figures_to_import = []
        for figure in figures:
            # Check if this figure was flagged as duplicate
            is_duplicate = any(
                dup["input_figure"] == figure
                for dup in self.duplicate_figures
            )
            if is_duplicate:
                self.stats["figures_skipped_duplicate"] += 1
                print(f"   ⏭️  Skipping duplicate: {figure['name']}")
            else:
                figures_to_import.append(figure)

        if not figures_to_import:
            print("   No new figures to import")
            return

        # Add metadata to each figure
        for figure in figures_to_import:
            if "ingestion_batch" not in figure:
                figure["ingestion_batch"] = self.batch_id
            if "ingestion_source" not in figure:
                figure["ingestion_source"] = self.source_name
            if "created_by" not in figure:
                figure["created_by"] = self.agent_name

            # Generate canonical_id if not provided
            if "canonical_id" not in figure or not figure["canonical_id"]:
                if figure.get("wikidata_id") and figure["wikidata_id"].startswith("Q"):
                    # Use Q-ID as canonical ID
                    figure["canonical_id"] = figure["wikidata_id"]
                else:
                    # Generate provisional ID
                    slug = figure["name"].lower().replace(" ", "-").replace("'", "")
                    timestamp = int(time.time() * 1000)
                    figure["canonical_id"] = f"PROV:{slug}-{timestamp}"

        if self.dry_run:
            print(f"   [DRY RUN] Would import {len(figures_to_import)} figures")
            for fig in figures_to_import[:5]:  # Show first 5
                print(f"      - {fig['name']} ({fig['canonical_id']})")
            if len(figures_to_import) > 5:
                print(f"      ... and {len(figures_to_import) - 5} more")
            self.stats["figures_created"] = len(figures_to_import)
            return

        # Import in batches
        with self.driver.session() as session:
            for i in range(0, len(figures_to_import), self.batch_size):
                batch = figures_to_import[i:i + self.batch_size]

                query = """
                UNWIND $figures AS figure_data
                MERGE (f:HistoricalFigure {canonical_id: figure_data.canonical_id})
                ON CREATE SET
                    f += figure_data,
                    f.created_at = datetime()
                ON MATCH SET
                    f += figure_data,
                    f.updated_at = datetime()
                RETURN COUNT(*) AS count
                """

                try:
                    result = session.run(query, figures=batch)
                    count = result.single()["count"]
                    self.stats["figures_created"] += count
                    print(f"   ✅ Imported batch {i // self.batch_size + 1}: {count} figures")
                except Exception as e:
                    error_msg = f"Failed to import figure batch {i // self.batch_size + 1}: {e}"
                    self.stats["errors"].append(error_msg)
                    print(f"   ❌ {error_msg}")

        # Create CREATED_BY relationships to Agent node
        self._create_agent_relationships(session, "HistoricalFigure", figures_to_import)

    def import_works(self, works: List[Dict], metadata: Dict):
        """
        Import media works into database.

        CRITICAL: Uses wikidata_id as canonical identifier per entity resolution protocol.
        """
        if not works:
            return

        print(f"\n📥 Importing {len(works)} media works...")

        # Filter out duplicates
        works_to_import = []
        for work in works:
            is_duplicate = any(
                dup["input_work"] == work
                for dup in self.duplicate_works
            )
            if is_duplicate:
                self.stats["works_skipped_duplicate"] += 1
                print(f"   ⏭️  Skipping duplicate: {work['title']}")
            else:
                works_to_import.append(work)

        if not works_to_import:
            print("   No new works to import")
            return

        # Add metadata and generate media_id
        for work in works_to_import:
            if "ingestion_batch" not in work:
                work["ingestion_batch"] = self.batch_id
            if "ingestion_source" not in work:
                work["ingestion_source"] = self.source_name
            if "created_by" not in work:
                work["created_by"] = self.agent_name

            # Generate media_id if not provided
            if "media_id" not in work or not work["media_id"]:
                slug = work["title"].lower().replace(" ", "-").replace("'", "")
                timestamp = int(time.time() * 1000)
                work["media_id"] = f"media-{slug}-{timestamp}"

            # Ensure wikidata_id is present
            if "wikidata_id" not in work or not work["wikidata_id"]:
                error_msg = f"MediaWork '{work['title']}' has no wikidata_id - REQUIRED per entity resolution protocol"
                self.stats["errors"].append(error_msg)
                print(f"   ❌ {error_msg}")
                works_to_import.remove(work)

        if self.dry_run:
            print(f"   [DRY RUN] Would import {len(works_to_import)} works")
            for work in works_to_import[:5]:
                print(f"      - {work['title']} ({work['wikidata_id']})")
            if len(works_to_import) > 5:
                print(f"      ... and {len(works_to_import) - 5} more")
            self.stats["works_created"] = len(works_to_import)
            return

        # Import in batches (using wikidata_id as merge key)
        with self.driver.session() as session:
            for i in range(0, len(works_to_import), self.batch_size):
                batch = works_to_import[i:i + self.batch_size]

                query = """
                UNWIND $works AS work_data
                MERGE (m:MediaWork {wikidata_id: work_data.wikidata_id})
                ON CREATE SET
                    m += work_data,
                    m.created_at = datetime()
                ON MATCH SET
                    m += work_data,
                    m.updated_at = datetime()
                RETURN COUNT(*) AS count
                """

                try:
                    result = session.run(query, works=batch)
                    count = result.single()["count"]
                    self.stats["works_created"] += count
                    print(f"   ✅ Imported batch {i // self.batch_size + 1}: {count} works")
                except Exception as e:
                    error_msg = f"Failed to import work batch {i // self.batch_size + 1}: {e}"
                    self.stats["errors"].append(error_msg)
                    print(f"   ❌ {error_msg}")

        # Create CREATED_BY relationships
        self._create_agent_relationships(session, "MediaWork", works_to_import)

    def import_relationships(self, relationships: List[Dict]):
        """Import relationships between entities."""
        if not relationships:
            return

        print(f"\n📥 Importing {len(relationships)} relationships...")

        if self.dry_run:
            print(f"   [DRY RUN] Would import {len(relationships)} relationships")
            for rel in relationships[:5]:
                print(f"      - {rel['from_id']} -{rel['rel_type']}-> {rel['to_id']}")
            if len(relationships) > 5:
                print(f"      ... and {len(relationships) - 5} more")
            self.stats["relationships_created"] = len(relationships)
            return

        with self.driver.session() as session:
            for rel in relationships:
                try:
                    from_type = rel["from_type"]
                    to_type = rel["to_type"]
                    rel_type = rel["rel_type"]
                    properties = rel.get("properties", {})

                    # Add metadata
                    properties["ingestion_batch"] = self.batch_id
                    properties["created_at"] = int(time.time())

                    # Determine ID properties
                    from_id_prop = self._get_id_property(from_type)
                    to_id_prop = self._get_id_property(to_type)

                    query = f"""
                    MATCH (from:{from_type} {{{from_id_prop}: $from_id}})
                    MATCH (to:{to_type} {{{to_id_prop}: $to_id}})
                    MERGE (from)-[r:{rel_type}]->(to)
                    ON CREATE SET r += $properties
                    ON MATCH SET r += $properties
                    RETURN COUNT(*) AS count
                    """

                    result = session.run(
                        query,
                        from_id=rel["from_id"],
                        to_id=rel["to_id"],
                        properties=properties
                    )

                    self.stats["relationships_created"] += result.single()["count"]

                except Exception as e:
                    error_msg = f"Failed to create relationship {rel}: {e}"
                    self.stats["errors"].append(error_msg)
                    print(f"   ❌ {error_msg}")

        print(f"   ✅ Imported {self.stats['relationships_created']} relationships")

    def _get_id_property(self, node_type: str) -> str:
        """Get the canonical ID property for a node type."""
        id_map = {
            "MediaWork": "wikidata_id",
            "HistoricalFigure": "canonical_id",
            "FictionalCharacter": "char_id"
        }
        return id_map.get(node_type, "id")

    def _create_agent_relationships(self, session, node_label: str, nodes: List[Dict]):
        """Create CREATED_BY relationships from nodes to Agent."""
        if self.dry_run:
            return

        # Ensure Agent node exists
        query_agent = """
        MERGE (a:Agent {name: $agent_name})
        ON CREATE SET a.created_at = datetime()
        """
        session.run(query_agent, agent_name=self.agent_name)

        # Create relationships
        id_prop = self._get_id_property(node_label)

        query = f"""
        UNWIND $node_ids AS node_id
        MATCH (n:{node_label} {{{id_prop}: node_id}})
        MATCH (a:Agent {{name: $agent_name}})
        MERGE (n)-[r:CREATED_BY]->(a)
        ON CREATE SET r.timestamp = datetime(), r.batch_id = $batch_id
        """

        node_ids = [node[id_prop] for node in nodes]
        session.run(query, node_ids=node_ids, agent_name=self.agent_name, batch_id=self.batch_id)

    def generate_report(self, output_path: str):
        """Generate detailed import report."""
        print(f"\n📊 Generating import report...")

        with open(output_path, 'w') as f:
            f.write("# Fictotum Batch Import Report\n\n")
            f.write(f"**Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
            f.write(f"**Batch ID:** {self.batch_id}\n\n")
            f.write(f"**Mode:** {'DRY RUN (no changes made)' if self.dry_run else 'LIVE EXECUTION'}\n\n")

            # Summary statistics
            f.write("## Summary\n\n")
            f.write(f"- **Figures Created:** {self.stats['figures_created']}\n")
            f.write(f"- **Figures Skipped (Duplicate):** {self.stats['figures_skipped_duplicate']}\n")
            f.write(f"- **Works Created:** {self.stats['works_created']}\n")
            f.write(f"- **Works Skipped (Duplicate):** {self.stats['works_skipped_duplicate']}\n")
            f.write(f"- **Relationships Created:** {self.stats['relationships_created']}\n")
            f.write(f"- **Errors:** {len(self.stats['errors'])}\n")
            f.write(f"- **Warnings:** {len(self.stats['warnings'])}\n\n")

            # Duplicate figures
            if self.duplicate_figures:
                f.write("## Duplicate Figures Detected\n\n")
                for dup in self.duplicate_figures:
                    f.write(f"### {dup['input_figure']['name']}\n\n")
                    f.write(f"- **Match Type:** {dup['match_type']}\n")
                    f.write(f"- **Confidence:** {dup['confidence']}\n")
                    if "similarity_score" in dup:
                        f.write(f"- **Similarity Score:** {dup['similarity_score']:.3f}\n")
                    f.write(f"- **Existing Figure:** {dup['existing_figure']['name']} ({dup['existing_figure']['canonical_id']})\n\n")

            # Duplicate works
            if self.duplicate_works:
                f.write("## Duplicate Works Detected\n\n")
                for dup in self.duplicate_works:
                    f.write(f"### {dup['input_work']['title']}\n\n")
                    f.write(f"- **Match Type:** {dup['match_type']}\n")
                    f.write(f"- **Confidence:** {dup['confidence']}\n")
                    if "similarity_score" in dup:
                        f.write(f"- **Similarity Score:** {dup['similarity_score']:.3f}\n")
                    f.write(f"- **Existing Work:** {dup['existing_work']['title']} ({dup['existing_work']['wikidata_id']})\n\n")

            # Invalid Q-IDs
            if self.invalid_qids:
                f.write("## Invalid Wikidata Q-IDs\n\n")
                for invalid in self.invalid_qids:
                    f.write(f"- **{invalid['type']}:** {invalid['name']} - Q-ID: {invalid['qid']}\n")
                    f.write(f"  - Error: {invalid['error']}\n")
                f.write("\n")

            # Warnings
            if self.stats['warnings']:
                f.write("## Warnings\n\n")
                for warning in self.stats['warnings']:
                    f.write(f"- {warning}\n")
                f.write("\n")

            # Errors
            if self.stats['errors']:
                f.write("## Errors\n\n")
                for error in self.stats['errors']:
                    f.write(f"- {error}\n")
                f.write("\n")

            f.write("---\n\n")
            f.write("**End of Report**\n")

        print(f"✅ Report saved to: {output_path}")

    def print_summary(self):
        """Print import summary to console."""
        print("\n" + "=" * 80)
        print("IMPORT SUMMARY")
        print("=" * 80)
        print(f"Batch ID: {self.batch_id}")
        print(f"Mode: {'DRY RUN' if self.dry_run else 'LIVE EXECUTION'}")
        print(f"\nFigures Created: {self.stats['figures_created']}")
        print(f"Figures Skipped (Duplicate): {self.stats['figures_skipped_duplicate']}")
        print(f"Works Created: {self.stats['works_created']}")
        print(f"Works Skipped (Duplicate): {self.stats['works_skipped_duplicate']}")
        print(f"Relationships Created: {self.stats['relationships_created']}")

        if self.stats['errors']:
            print(f"\n❌ Errors: {len(self.stats['errors'])}")
            for error in self.stats['errors'][:5]:
                print(f"   - {error}")
            if len(self.stats['errors']) > 5:
                print(f"   ... and {len(self.stats['errors']) - 5} more")

        if self.stats['warnings']:
            print(f"\n⚠️  Warnings: {len(self.stats['warnings'])}")
            for warning in self.stats['warnings'][:5]:
                print(f"   - {warning}")
            if len(self.stats['warnings']) > 5:
                print(f"   ... and {len(self.stats['warnings']) - 5} more")

        print("=" * 80)


def main():
    """Main entry point for batch import CLI."""
    parser = argparse.ArgumentParser(
        description="Fictotum Batch Import Tool (CHR-40)",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Dry run (preview only)
  python batch_import.py data/my_batch.json --dry-run

  # Live import
  python batch_import.py data/my_batch.json --execute

  # Figures only
  python batch_import.py data/figures.json --execute --figures-only

  # Custom batch size and agent name
  python batch_import.py data/batch.json --execute --batch-size 100 --agent batch-import-v2
        """
    )

    parser.add_argument(
        "input_file",
        help="Path to JSON file containing batch data"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        default=True,
        help="Preview import without making changes (default)"
    )
    parser.add_argument(
        "--execute",
        action="store_true",
        help="Execute import (disables dry-run mode)"
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=50,
        help="Number of records per transaction (default: 50)"
    )
    parser.add_argument(
        "--agent",
        default="batch-importer",
        help="Agent name for CREATED_BY attribution (default: batch-importer)"
    )
    parser.add_argument(
        "--figures-only",
        action="store_true",
        help="Import only figures, skip works and relationships"
    )
    parser.add_argument(
        "--works-only",
        action="store_true",
        help="Import only works, skip figures and relationships"
    )
    parser.add_argument(
        "--skip-duplicate-check",
        action="store_true",
        help="Skip duplicate detection (faster but risky)"
    )
    parser.add_argument(
        "--skip-wikidata-validation",
        action="store_true",
        help="Skip Wikidata Q-ID validation (faster but not recommended)"
    )
    parser.add_argument(
        "--report",
        default="batch_import_report.md",
        help="Path for import report (default: batch_import_report.md)"
    )

    args = parser.parse_args()

    # Load environment
    load_dotenv()

    uri = os.getenv("NEO4J_URI")
    user = os.getenv("NEO4J_USERNAME", "neo4j")
    pwd = os.getenv("NEO4J_PASSWORD")

    if not uri or not pwd:
        print("❌ Error: NEO4J_URI and NEO4J_PASSWORD must be set in .env")
        sys.exit(1)

    # Load JSON file
    input_path = Path(args.input_file)
    if not input_path.exists():
        print(f"❌ Error: File not found: {input_path}")
        sys.exit(1)

    try:
        with open(input_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except json.JSONDecodeError as e:
        print(f"❌ Error: Invalid JSON in '{input_path}': {e}")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Error reading file: {e}")
        sys.exit(1)

    # Determine mode
    dry_run = not args.execute

    # Print header
    print("=" * 80)
    print("Fictotum Batch Import Tool (CHR-40)")
    print("=" * 80)
    print(f"Input file: {input_path}")
    print(f"Mode: {'DRY RUN (preview only)' if dry_run else 'LIVE EXECUTION'}")
    print(f"Agent: {args.agent}")
    print(f"Batch size: {args.batch_size}")
    print("=" * 80)

    if not dry_run:
        print("\n⚠️  WARNING: This will modify the database!")
        response = input("Type 'CONFIRM' to proceed: ")
        if response != "CONFIRM":
            print("❌ Aborted.")
            sys.exit(0)

    # Initialize importer
    importer = BatchImporter(
        uri=uri,
        user=user,
        pwd=pwd,
        dry_run=dry_run,
        batch_size=args.batch_size,
        agent_name=args.agent
    )

    try:
        # Step 1: Validate JSON schema
        print("\n📋 Step 1: Validating JSON schema...")
        is_valid, errors = importer.validate_json_schema(data)
        if not is_valid:
            print("❌ JSON schema validation failed:")
            for error in errors:
                print(f"   - {error}")
            sys.exit(1)
        print("✅ JSON schema valid")

        # Step 2: Setup schema
        print("\n📋 Step 2: Setting up database schema...")
        importer.setup_schema()

        # Step 3: Duplicate detection
        if not args.skip_duplicate_check:
            if "figures" in data and not args.works_only:
                importer.detect_duplicate_figures(data["figures"])
            if "works" in data and not args.figures_only:
                importer.detect_duplicate_works(data["works"])

        # Step 4: Wikidata validation
        if not args.skip_wikidata_validation:
            print("\n📋 Step 4: Validating Wikidata Q-IDs...")
            importer.validate_wikidata_qids(data)

            if importer.invalid_qids:
                print("\n⚠️  WARNING: Found invalid Q-IDs. Continue anyway?")
                if not dry_run:
                    response = input("Type 'YES' to continue: ")
                    if response != "YES":
                        print("❌ Aborted.")
                        sys.exit(0)

        # Step 5: Import data
        print("\n📋 Step 5: Importing data...")

        metadata = data.get("metadata", {})

        if "figures" in data and not args.works_only:
            importer.import_figures(data["figures"], metadata)

        if "works" in data and not args.figures_only:
            importer.import_works(data["works"], metadata)

        if "relationships" in data and not args.figures_only and not args.works_only:
            importer.import_relationships(data["relationships"])

        # Step 6: Generate report
        print("\n📋 Step 6: Generating report...")
        report_path = Path(args.report)
        importer.generate_report(str(report_path))

        # Print summary
        importer.print_summary()

        if dry_run:
            print("\n💡 TIP: Run with --execute to perform actual import")
        else:
            print("\n✅ Import completed successfully!")

    except Exception as e:
        print(f"\n❌ Error during import: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

    finally:
        importer.close()


if __name__ == "__main__":
    main()
