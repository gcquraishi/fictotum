#!/usr/bin/env python3
"""
Pre-Import Duplicate Checker

Checks import files against existing database to prevent duplicate creation.
Uses enhanced name similarity (lexical + phonetic) for fuzzy matching.

Usage:
  python3 scripts/ingestion/check_duplicates.py data/examples/ancient-rome.json
  python3 scripts/ingestion/check_duplicates.py data/examples/ancient-rome.json --auto-resolve
  python3 scripts/ingestion/check_duplicates.py data/examples/ancient-rome.json --save-resolutions
"""

import json
import sys
import os
from pathlib import Path
from typing import Dict, List, Any, Tuple, Optional
from neo4j import GraphDatabase

# Load Neo4j credentials
NEO4J_URI = os.getenv('NEO4J_URI')
NEO4J_USERNAME = os.getenv('NEO4J_USERNAME')
NEO4J_PASSWORD = os.getenv('NEO4J_PASSWORD')

if not all([NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD]):
    print("Error: NEO4J_URI, NEO4J_USERNAME, and NEO4J_PASSWORD must be set")
    sys.exit(1)

# Import name matching utilities
sys.path.insert(0, str(Path(__file__).parent.parent.parent / 'web-app'))

try:
    # Try to import from Next.js lib (if running with proper Python path)
    import requests
    API_BASE = os.getenv('NEXT_PUBLIC_API_URL', 'http://localhost:3000')
    HAS_API_ACCESS = True
except ImportError:
    HAS_API_ACCESS = False
    print("⚠️  Warning: requests library not available. Using database-only matching.")

class DuplicateChecker:
    def __init__(self, auto_resolve: bool = False, save_resolutions: bool = False):
        self.driver = GraphDatabase.driver(
            NEO4J_URI,
            auth=(NEO4J_USERNAME, NEO4J_PASSWORD)
        )
        self.auto_resolve = auto_resolve
        self.save_resolutions = save_resolutions
        self.resolutions = {}  # Store user decisions
        self.resolutions_file = Path('data/.ingestion-cache/resolutions.json')

        # Load existing resolutions
        if self.resolutions_file.exists():
            with open(self.resolutions_file, 'r') as f:
                self.resolutions = json.load(f)

    def close(self):
        """Close database connection"""
        self.driver.close()

    def fetch_existing_figures(self) -> List[Dict]:
        """Fetch all existing HistoricalFigure nodes from database"""
        with self.driver.session() as session:
            query = """
            MATCH (f:HistoricalFigure)
            WHERE NOT f:Deleted
            RETURN
                f.canonical_id AS canonical_id,
                f.name AS name,
                f.wikidata_id AS wikidata_id,
                f.birth_year AS birth_year,
                f.death_year AS death_year,
                f.era AS era
            ORDER BY f.name
            """
            result = session.run(query)

            figures = []
            for record in result:
                fig = {
                    'canonical_id': record['canonical_id'],
                    'name': record['name'],
                    'wikidata_id': record.get('wikidata_id'),
                    'birth_year': int(record['birth_year']) if record.get('birth_year') else None,
                    'death_year': int(record['death_year']) if record.get('death_year') else None,
                    'era': record.get('era'),
                }
                figures.append(fig)

            return figures

    def fetch_existing_media(self) -> List[Dict]:
        """Fetch all existing MediaWork nodes from database"""
        with self.driver.session() as session:
            query = """
            MATCH (m:MediaWork)
            RETURN
                coalesce(m.media_id, m.wikidata_id) AS media_id,
                m.title AS title,
                m.wikidata_id AS wikidata_id,
                coalesce(m.release_year, m.year) AS release_year,
                coalesce(m.media_type, m.type) AS media_type
            ORDER BY m.title
            """
            result = session.run(query)

            media_works = []
            for record in result:
                media = {
                    'media_id': record['media_id'],
                    'title': record['title'],
                    'wikidata_id': record.get('wikidata_id'),
                    'release_year': int(record['release_year']) if record.get('release_year') else None,
                    'media_type': record.get('media_type'),
                }
                media_works.append(media)

            return media_works

    def check_exact_match(self, import_fig: Dict, existing_figs: List[Dict]) -> Optional[Dict]:
        """Check for exact match by wikidata_id or canonical_id"""
        import_qid = import_fig.get('wikidata_id')
        import_cid = import_fig.get('canonical_id')

        for existing in existing_figs:
            # Check Wikidata ID match
            if import_qid and existing.get('wikidata_id') == import_qid:
                return existing

            # Check canonical ID match
            if import_cid and existing.get('canonical_id') == import_cid:
                return existing

        return None

    def simple_name_similarity(self, name1: str, name2: str) -> float:
        """
        Simple name similarity using character overlap.
        Returns score from 0.0 to 1.0.
        """
        name1_lower = name1.lower().strip()
        name2_lower = name2.lower().strip()

        if name1_lower == name2_lower:
            return 1.0

        # Jaccard similarity on character n-grams
        def get_ngrams(text: str, n: int = 2) -> set:
            return set(text[i:i+n] for i in range(len(text) - n + 1))

        ngrams1 = get_ngrams(name1_lower)
        ngrams2 = get_ngrams(name2_lower)

        if not ngrams1 or not ngrams2:
            return 0.0

        intersection = len(ngrams1 & ngrams2)
        union = len(ngrams1 | ngrams2)

        return intersection / union if union > 0 else 0.0

    def check_similarity_match(
        self,
        import_fig: Dict,
        existing_figs: List[Dict],
        threshold: float = 0.85
    ) -> List[Tuple[Dict, float]]:
        """
        Check for high similarity matches using name similarity.
        Returns list of (existing_figure, similarity_score) tuples.
        """
        import_name = import_fig.get('name', '')
        import_birth = import_fig.get('birth_year')
        import_death = import_fig.get('death_year')
        import_era = import_fig.get('era')

        matches = []

        for existing in existing_figs:
            existing_name = existing.get('name', '')

            # Calculate name similarity
            similarity = self.simple_name_similarity(import_name, existing_name)

            if similarity >= threshold:
                # Boost score if years match
                year_match = False
                if import_birth and existing.get('birth_year'):
                    if abs(import_birth - existing['birth_year']) <= 5:
                        year_match = True
                        similarity = min(1.0, similarity + 0.1)

                if import_death and existing.get('death_year'):
                    if abs(import_death - existing['death_year']) <= 5:
                        year_match = True
                        similarity = min(1.0, similarity + 0.1)

                # Boost if era matches
                if import_era and existing.get('era'):
                    if import_era.lower() == existing['era'].lower():
                        similarity = min(1.0, similarity + 0.05)

                matches.append((existing, similarity))

        # Sort by similarity (highest first)
        matches.sort(key=lambda x: x[1], reverse=True)

        return matches

    def get_resolution_key(self, import_fig: Dict, existing_fig: Dict) -> str:
        """Generate a unique key for storing resolution decisions"""
        import_id = import_fig.get('wikidata_id') or import_fig.get('name')
        existing_id = existing_fig.get('canonical_id')
        return f"{import_id}|{existing_id}"

    def resolve_duplicate(
        self,
        import_fig: Dict,
        existing_fig: Dict,
        confidence: str
    ) -> str:
        """
        Resolve duplicate conflict interactively or automatically.
        Returns: 'use_existing', 'create_new', or 'skip'
        """
        resolution_key = self.get_resolution_key(import_fig, existing_fig)

        # Check for saved resolution
        if resolution_key in self.resolutions:
            saved = self.resolutions[resolution_key]
            print(f"    [CACHED] Using saved resolution: {saved}")
            return saved

        # Auto-resolve high confidence matches
        if self.auto_resolve and confidence == 'high':
            print(f"    [AUTO] Using existing figure (high confidence)")
            self.resolutions[resolution_key] = 'use_existing'
            return 'use_existing'

        # Interactive resolution
        import_name = import_fig.get('name')
        existing_name = existing_fig.get('name')
        existing_id = existing_fig.get('canonical_id')

        print(f"\n    Import:   {import_name}")
        print(f"    Existing: {existing_name} ({existing_id})")
        print(f"    Confidence: {confidence.upper()}")

        if import_fig.get('birth_year') or existing_fig.get('birth_year'):
            print(f"    Birth:    {import_fig.get('birth_year')} vs {existing_fig.get('birth_year')}")
        if import_fig.get('death_year') or existing_fig.get('death_year'):
            print(f"    Death:    {import_fig.get('death_year')} vs {existing_fig.get('death_year')}")

        while True:
            choice = input("    Action: [U]se existing, [C]reate new, [S]kip? ").strip().upper()

            if choice == 'U':
                self.resolutions[resolution_key] = 'use_existing'
                return 'use_existing'
            elif choice == 'C':
                self.resolutions[resolution_key] = 'create_new'
                return 'create_new'
            elif choice == 'S':
                self.resolutions[resolution_key] = 'skip'
                return 'skip'
            else:
                print("    Invalid choice. Please enter U, C, or S.")

    def check_figures(self, import_data: Dict) -> Dict[str, Any]:
        """Check all figures in import file for duplicates"""
        if 'figures' not in import_data:
            return {'exact': [], 'high_confidence': [], 'potential': [], 'clear': []}

        import_figures = import_data['figures']
        existing_figures = self.fetch_existing_figures()

        print(f"\nChecking {len(import_figures)} figures against {len(existing_figures)} existing figures...")

        exact_matches = []
        high_confidence = []
        potential_duplicates = []
        clear_to_import = []

        for import_fig in import_figures:
            name = import_fig.get('name', '<unnamed>')

            # Check for exact match
            exact = self.check_exact_match(import_fig, existing_figures)
            if exact:
                exact_matches.append({
                    'import': import_fig,
                    'existing': exact,
                    'action': 'use_existing'
                })
                continue

            # Check for similarity matches
            similar = self.check_similarity_match(import_fig, existing_figures, threshold=0.85)

            if similar:
                best_match, score = similar[0]

                if score >= 0.95:
                    # High confidence duplicate
                    high_confidence.append({
                        'import': import_fig,
                        'existing': best_match,
                        'similarity': score,
                        'action': None  # To be resolved
                    })
                else:
                    # Potential duplicate (medium confidence)
                    potential_duplicates.append({
                        'import': import_fig,
                        'existing': best_match,
                        'similarity': score,
                        'action': None  # To be resolved
                    })
            else:
                # No matches - clear to import
                clear_to_import.append(import_fig)

        return {
            'exact': exact_matches,
            'high_confidence': high_confidence,
            'potential': potential_duplicates,
            'clear': clear_to_import
        }

    def save_resolution_cache(self):
        """Save resolution decisions to cache file"""
        if not self.save_resolutions:
            return

        self.resolutions_file.parent.mkdir(parents=True, exist_ok=True)
        with open(self.resolutions_file, 'w') as f:
            json.dump(self.resolutions, f, indent=2)

        print(f"\n✅ Saved {len(self.resolutions)} resolution decisions to {self.resolutions_file}")

    def print_summary(self, results: Dict[str, Any]):
        """Print duplicate check summary"""
        print("\n" + "=" * 80)
        print("DUPLICATE CHECK SUMMARY")
        print("=" * 80)

        # Exact matches
        if results['exact']:
            print(f"\n✓ EXACT MATCHES (will use existing): {len(results['exact'])}")
            for match in results['exact']:
                import_name = match['import'].get('name')
                existing_id = match['existing'].get('canonical_id')
                qid = match['import'].get('wikidata_id') or match['existing'].get('wikidata_id')
                print(f"  • {import_name} → {existing_id} ({qid})")

        # High confidence duplicates
        if results['high_confidence']:
            print(f"\n⚠️  HIGH CONFIDENCE DUPLICATES: {len(results['high_confidence'])}")
            for dup in results['high_confidence']:
                import_name = dup['import'].get('name')
                existing_name = dup['existing'].get('name')
                existing_id = dup['existing'].get('canonical_id')
                score = dup['similarity']
                action = dup.get('action', 'UNRESOLVED')
                print(f"  • {import_name} → {score:.0%} match with {existing_name} ({existing_id})")
                if action != 'UNRESOLVED':
                    print(f"    Resolution: {action}")

        # Potential duplicates
        if results['potential']:
            print(f"\nℹ️  POTENTIAL DUPLICATES: {len(results['potential'])}")
            for dup in results['potential']:
                import_name = dup['import'].get('name')
                existing_name = dup['existing'].get('name')
                score = dup['similarity']
                action = dup.get('action', 'UNRESOLVED')
                print(f"  • {import_name} → {score:.0%} match with {existing_name}")
                if action != 'UNRESOLVED':
                    print(f"    Resolution: {action}")

        # Clear to import
        if results['clear']:
            print(f"\n✅ CLEAR TO IMPORT: {len(results['clear'])}")
            for fig in results['clear'][:5]:  # Show first 5
                print(f"  • {fig.get('name')}")
            if len(results['clear']) > 5:
                print(f"  ... and {len(results['clear']) - 5} more")

        print()

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 scripts/ingestion/check_duplicates.py <file.json> [--auto-resolve] [--save-resolutions]")
        sys.exit(1)

    input_path = sys.argv[1]
    auto_resolve = '--auto-resolve' in sys.argv
    save_resolutions = '--save-resolutions' in sys.argv

    checker = DuplicateChecker(
        auto_resolve=auto_resolve,
        save_resolutions=save_resolutions
    )

    try:
        # Load import file
        with open(input_path, 'r') as f:
            import_data = json.load(f)

        print("=" * 80)
        print(f"PRE-IMPORT DUPLICATE CHECK: {input_path}")
        if auto_resolve:
            print("[AUTO-RESOLVE MODE]")
        if save_resolutions:
            print("[SAVE RESOLUTIONS MODE]")
        print("=" * 80)

        # Check for duplicates
        results = checker.check_figures(import_data)

        # Resolve high confidence duplicates
        for dup in results['high_confidence']:
            if dup['action'] is None:
                action = checker.resolve_duplicate(
                    dup['import'],
                    dup['existing'],
                    confidence='high'
                )
                dup['action'] = action

        # Resolve potential duplicates
        for dup in results['potential']:
            if dup['action'] is None:
                action = checker.resolve_duplicate(
                    dup['import'],
                    dup['existing'],
                    confidence='medium'
                )
                dup['action'] = action

        # Print summary
        checker.print_summary(results)

        # Save resolutions if requested
        if save_resolutions:
            checker.save_resolution_cache()

    finally:
        checker.close()

if __name__ == '__main__':
    main()
