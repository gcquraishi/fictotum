#!/usr/bin/env python3
"""
Wikidata Enrichment Script

Auto-fetches missing data from Wikidata before bulk import.
Enriches figures and media works with birth/death dates, occupations, etc.

Usage:
  python3 scripts/ingestion/enrich_from_wikidata.py data/examples/ancient-rome.json
  python3 scripts/ingestion/enrich_from_wikidata.py data/examples/ancient-rome.json --output data/ancient-rome-enriched.json
  python3 scripts/ingestion/enrich_from_wikidata.py data/examples/ancient-rome.json --dry-run
"""

import json
import sys
import os
import requests
from pathlib import Path
from typing import Dict, List, Any, Optional

# API endpoint for batch Wikidata lookup
API_BASE = os.getenv('NEXT_PUBLIC_API_URL', 'http://localhost:3000')
BATCH_LOOKUP_URL = f"{API_BASE}/api/wikidata/batch-lookup"

class WikidataEnricher:
    def __init__(self, dry_run: bool = False):
        self.dry_run = dry_run
        self.enriched_count = 0
        self.skipped_count = 0
        self.failed_count = 0

    def fetch_batch_data(self, qids: List[str], entity_type: str = 'figure') -> Dict[str, Any]:
        """Fetch enriched data for multiple Q-IDs from API"""
        if not qids:
            return {}

        try:
            response = requests.post(
                BATCH_LOOKUP_URL,
                json={'ids': qids, 'type': entity_type},
                timeout=30
            )

            if response.status_code == 200:
                return response.json()
            else:
                print(f"⚠️  API error: HTTP {response.status_code}")
                return {}

        except requests.exceptions.ConnectionError:
            print(f"❌ Connection error: Is the Next.js server running at {API_BASE}?")
            return {}
        except Exception as e:
            print(f"❌ Error fetching from API: {e}")
            return {}

    def enrich_figure(self, figure: Dict, enriched_data: Dict) -> bool:
        """
        Enrich a single figure with Wikidata data.
        Returns True if any fields were enriched.
        """
        qid = figure.get('wikidata_id')
        if not qid or qid not in enriched_data:
            return False

        wikidata = enriched_data[qid]
        enriched = False

        # Only fill missing fields (don't overwrite existing data)
        if not figure.get('birth_year') and wikidata.get('birth_year'):
            figure['birth_year'] = wikidata['birth_year']
            enriched = True

        if not figure.get('death_year') and wikidata.get('death_year'):
            figure['death_year'] = wikidata['death_year']
            enriched = True

        if not figure.get('occupation') and wikidata.get('occupation'):
            # For now, occupation is a Q-ID. Could fetch label in future.
            figure['occupation'] = wikidata['occupation']
            enriched = True

        if not figure.get('title') and wikidata.get('title'):
            figure['title'] = wikidata['title']
            enriched = True

        if not figure.get('description') and wikidata.get('description'):
            figure['description'] = wikidata['description']
            enriched = True

        if not figure.get('image_url') and wikidata.get('image_url'):
            figure['image_url'] = wikidata['image_url']
            enriched = True

        return enriched

    def enrich_media(self, media: Dict, enriched_data: Dict) -> bool:
        """
        Enrich a single media work with Wikidata data.
        Returns True if any fields were enriched.
        """
        qid = media.get('wikidata_id')
        if not qid or qid not in enriched_data:
            return False

        wikidata = enriched_data[qid]
        enriched = False

        if not media.get('release_year') and wikidata.get('release_year'):
            media['release_year'] = wikidata['release_year']
            enriched = True

        if not media.get('creator') and wikidata.get('creator'):
            # Creator is currently a Q-ID. Could fetch label in future.
            media['creator'] = wikidata['creator']
            enriched = True

        if not media.get('genre') and wikidata.get('genre'):
            media['genre'] = wikidata['genre']
            enriched = True

        if not media.get('runtime_minutes') and wikidata.get('runtime_minutes'):
            media['runtime_minutes'] = wikidata['runtime_minutes']
            enriched = True

        if not media.get('description') and wikidata.get('description'):
            media['description'] = wikidata['description']
            enriched = True

        return enriched

    def enrich_figures(self, figures: List[Dict]) -> int:
        """Enrich all figures with Wikidata data"""
        # Collect Q-IDs that need enrichment
        qids = [f.get('wikidata_id') for f in figures if f.get('wikidata_id')]

        if not qids:
            print("ℹ️  No figures with Wikidata IDs to enrich")
            return 0

        print(f"\nEnriching {len(qids)} figures from Wikidata...")

        if self.dry_run:
            print("  [DRY RUN] Would fetch data for:", ', '.join(qids))
            return 0

        # Fetch batch data
        enriched_data = self.fetch_batch_data(qids, entity_type='figure')

        if not enriched_data:
            print("⚠️  No data returned from Wikidata")
            return 0

        # Enrich each figure
        enriched_count = 0
        for figure in figures:
            if self.enrich_figure(figure, enriched_data):
                enriched_count += 1
                name = figure.get('name', 'Unknown')
                qid = figure.get('wikidata_id')
                print(f"  ✓ Enriched: {name} ({qid})")
            else:
                qid = figure.get('wikidata_id')
                if qid:
                    name = figure.get('name', 'Unknown')
                    print(f"  - Skipped: {name} ({qid}) - no new data or missing Q-ID")
                    self.skipped_count += 1

        return enriched_count

    def enrich_media_works(self, media_works: List[Dict]) -> int:
        """Enrich all media works with Wikidata data"""
        qids = [m.get('wikidata_id') for m in media_works if m.get('wikidata_id')]

        if not qids:
            print("ℹ️  No media works with Wikidata IDs to enrich")
            return 0

        print(f"\nEnriching {len(qids)} media works from Wikidata...")

        if self.dry_run:
            print("  [DRY RUN] Would fetch data for:", ', '.join(qids))
            return 0

        # Fetch batch data
        enriched_data = self.fetch_batch_data(qids, entity_type='media')

        if not enriched_data:
            print("⚠️  No data returned from Wikidata")
            return 0

        # Enrich each media work
        enriched_count = 0
        for media in media_works:
            if self.enrich_media(media, enriched_data):
                enriched_count += 1
                title = media.get('title', 'Unknown')
                qid = media.get('wikidata_id')
                print(f"  ✓ Enriched: {title} ({qid})")
            else:
                qid = media.get('wikidata_id')
                if qid:
                    title = media.get('title', 'Unknown')
                    print(f"  - Skipped: {title} ({qid}) - no new data or missing Q-ID")
                    self.skipped_count += 1

        return enriched_count

    def enrich_file(
        self,
        input_path: str,
        output_path: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Enrich an import file with Wikidata data

        Args:
          input_path: Path to input JSON file
          output_path: Path to output file (defaults to input_path if not specified)

        Returns:
          Enriched data dictionary
        """
        # Load input file
        try:
            with open(input_path, 'r') as f:
                data = json.load(f)
        except FileNotFoundError:
            print(f"❌ File not found: {input_path}")
            sys.exit(1)
        except json.JSONDecodeError as e:
            print(f"❌ Invalid JSON: {e}")
            sys.exit(1)

        # Enrich figures
        figures_enriched = 0
        if 'figures' in data:
            figures_enriched = self.enrich_figures(data['figures'])
            self.enriched_count += figures_enriched

        # Enrich media works
        media_enriched = 0
        if 'media_works' in data:
            media_enriched = self.enrich_media_works(data['media_works'])
            self.enriched_count += media_enriched

        # Save enriched file
        if not self.dry_run:
            output = output_path or input_path
            with open(output, 'w') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            print(f"\n✅ Enriched file saved to: {output}")
        else:
            print(f"\n[DRY RUN] Would save enriched file to: {output_path or input_path}")

        return data

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 scripts/ingestion/enrich_from_wikidata.py <file.json> [--output <output.json>] [--dry-run]")
        sys.exit(1)

    input_path = sys.argv[1]
    output_path = None
    dry_run = '--dry-run' in sys.argv

    # Parse --output argument
    if '--output' in sys.argv:
        idx = sys.argv.index('--output')
        if idx + 1 < len(sys.argv):
            output_path = sys.argv[idx + 1]

    enricher = WikidataEnricher(dry_run=dry_run)

    print("=" * 80)
    print(f"WIKIDATA ENRICHMENT: {input_path}")
    if dry_run:
        print("[DRY RUN MODE]")
    print("=" * 80)

    enricher.enrich_file(input_path, output_path)

    # Print summary
    print("\n" + "=" * 80)
    print("ENRICHMENT SUMMARY")
    print("=" * 80)
    print(f"  Enriched: {enricher.enriched_count}")
    print(f"  Skipped:  {enricher.skipped_count}")
    if enricher.failed_count > 0:
        print(f"  Failed:   {enricher.failed_count}")
    print()

if __name__ == '__main__':
    main()
