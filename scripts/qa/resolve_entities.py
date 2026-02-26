"""
Fictotum: Duplicate Entity Resolver
Detects potential duplicate HistoricalFigure nodes using multi-pass detection.
"""

import os
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Set, Tuple
from collections import defaultdict
from dotenv import load_dotenv
from neo4j import GraphDatabase
from SPARQLWrapper import SPARQLWrapper, JSON
from thefuzz import fuzz

# SPARQL endpoint for Wikidata
WIKIDATA_SPARQL_ENDPOINT = "https://query.wikidata.org/sparql"

# Languages to fetch aliases for
ALIAS_LANGUAGES = ["en", "la", "it", "fr", "de", "es"]


class HistoricalFigureNode:
    """Represents a HistoricalFigure node from Neo4j."""

    def __init__(self, canonical_id: str, name: str, wikidata_id: str = None):
        self.canonical_id = canonical_id
        self.name = name
        self.wikidata_id = wikidata_id
        self.aliases: Set[str] = set()

    def add_aliases(self, aliases: List[str]):
        """Add aliases from Wikidata."""
        self.aliases.update(alias.lower() for alias in aliases if alias)

    def has_real_wikidata_id(self) -> bool:
        """Check if this figure has a real Wikidata ID (not provisional)."""
        return self.wikidata_id and not self.wikidata_id.startswith("PROV:")

    def __repr__(self):
        return f"Figure({self.canonical_id}, {self.name}, {self.wikidata_id})"


class DuplicateCluster:
    """Represents a cluster of potential duplicate nodes."""

    def __init__(self, primary_node: HistoricalFigureNode):
        self.primary = primary_node
        self.duplicates: List[Tuple[HistoricalFigureNode, str]] = []

    def add_duplicate(self, node: HistoricalFigureNode, reason: str):
        """Add a duplicate node with the reason for the match."""
        self.duplicates.append((node, reason))

    def __len__(self):
        return len(self.duplicates)


class EntityResolver:
    """Main resolver class for detecting duplicate entities."""

    def __init__(self, uri: str, user: str, pwd: str):
        """Initialize Neo4j connection."""
        if uri.startswith("neo4j+s://"):
            uri = uri.replace("neo4j+s://", "neo4j+ssc://")
        self.driver = GraphDatabase.driver(uri, auth=(user, pwd))
        self.figures: Dict[str, HistoricalFigureNode] = {}

    def close(self):
        """Close Neo4j connection."""
        self.driver.close()

    def fetch_figures(self):
        """Fetch all HistoricalFigure nodes from Neo4j."""
        print("📊 Fetching HistoricalFigure nodes from Neo4j...")

        with self.driver.session() as session:
            result = session.run("""
                MATCH (f:HistoricalFigure)
                RETURN f.canonical_id AS canonical_id,
                       f.name AS name,
                       f.wikidata_id AS wikidata_id
                ORDER BY f.canonical_id
            """)

            for record in result:
                fig = HistoricalFigureNode(
                    canonical_id=record["canonical_id"],
                    name=record["name"],
                    wikidata_id=record.get("wikidata_id")
                )
                self.figures[fig.canonical_id] = fig

        print(f"✅ Fetched {len(self.figures)} HistoricalFigure nodes.")

    def enrich_with_wikidata_aliases(self):
        """Fetch Wikidata aliases for all figures with real Wikidata IDs."""
        print("🌍 Enriching figures with Wikidata aliases...")

        sparql = SPARQLWrapper(WIKIDATA_SPARQL_ENDPOINT)
        sparql.setReturnFormat(JSON)

        figures_with_qids = [fig for fig in self.figures.values() if fig.has_real_wikidata_id()]

        for idx, fig in enumerate(figures_with_qids, 1):
            if idx % 10 == 0:
                print(f"  Progress: {idx}/{len(figures_with_qids)} figures processed...")

            try:
                query = self._build_alias_query(fig.wikidata_id)
                sparql.setQuery(query)
                results = sparql.query().convert()

                aliases = []
                for result in results["results"]["bindings"]:
                    if "altLabel" in result:
                        aliases.append(result["altLabel"]["value"])

                fig.add_aliases(aliases)

            except Exception as e:
                print(f"⚠️  Warning: Could not fetch aliases for {fig.canonical_id} ({fig.wikidata_id}): {e}")

        print(f"✅ Alias enrichment complete.")

    def _build_alias_query(self, wikidata_id: str) -> str:
        """Build SPARQL query to fetch aliases for a Wikidata entity."""
        lang_filter = " || ".join([f'lang(?altLabel) = "{lang}"' for lang in ALIAS_LANGUAGES])

        return f"""
        SELECT ?altLabel WHERE {{
          wd:{wikidata_id} skos:altLabel ?altLabel .
          FILTER({lang_filter})
        }}
        """

    def detect_duplicates(self) -> List[DuplicateCluster]:
        """Run three-pass duplicate detection and return clusters."""
        print("🔍 Running three-pass duplicate detection...")

        clusters = []
        processed_ids = set()

        # Pass 1: Perfect Wikidata ID Match
        print("  Pass 1: Perfect Wikidata ID match...")
        wikidata_clusters = self._pass1_wikidata_match(processed_ids)
        clusters.extend(wikidata_clusters)
        print(f"    Found {len(wikidata_clusters)} clusters with shared Wikidata IDs.")

        # Pass 2: Alias Match
        print("  Pass 2: Alias and name exact match...")
        alias_clusters = self._pass2_alias_match(processed_ids)
        clusters.extend(alias_clusters)
        print(f"    Found {len(alias_clusters)} clusters with alias matches.")

        # Pass 3: Fuzzy Match
        print("  Pass 3: Fuzzy name match (>90% similarity)...")
        fuzzy_clusters = self._pass3_fuzzy_match(processed_ids)
        clusters.extend(fuzzy_clusters)
        print(f"    Found {len(fuzzy_clusters)} clusters with fuzzy matches.")

        print(f"✅ Detection complete. Total clusters: {len(clusters)}")
        return clusters

    def _pass1_wikidata_match(self, processed_ids: Set[str]) -> List[DuplicateCluster]:
        """Pass 1: Find figures with same real Wikidata ID but different canonical IDs."""
        clusters = []
        qid_to_figures = defaultdict(list)

        # Group figures by Wikidata ID
        for fig in self.figures.values():
            if fig.has_real_wikidata_id():
                qid_to_figures[fig.wikidata_id].append(fig)

        # Find groups with multiple figures
        for qid, figures in qid_to_figures.items():
            if len(figures) > 1:
                # Sort by canonical_id to ensure consistent primary selection
                figures.sort(key=lambda f: f.canonical_id)
                primary = figures[0]
                cluster = DuplicateCluster(primary)

                for fig in figures[1:]:
                    cluster.add_duplicate(fig, f"Shared Wikidata ID: {qid}")
                    processed_ids.add(fig.canonical_id)

                processed_ids.add(primary.canonical_id)
                clusters.append(cluster)

        return clusters

    def _pass2_alias_match(self, processed_ids: Set[str]) -> List[DuplicateCluster]:
        """Pass 2: Find figures where name/aliases match other figures' primary names."""
        clusters = []

        # Build a lookup: name (lowercased) -> list of figures with that name
        name_to_figures = defaultdict(list)
        for fig in self.figures.values():
            if fig.canonical_id not in processed_ids:
                name_to_figures[fig.name.lower()].append(fig)

        # Check each unprocessed figure
        for fig in self.figures.values():
            if fig.canonical_id in processed_ids:
                continue

            matches = []

            # Check if any of this figure's aliases match another figure's primary name
            for alias in fig.aliases:
                if alias in name_to_figures:
                    for other_fig in name_to_figures[alias]:
                        if other_fig.canonical_id != fig.canonical_id and other_fig.canonical_id not in processed_ids:
                            matches.append((other_fig, f"Matched Wikidata Alias '{alias.title()}'"))

            if matches:
                cluster = DuplicateCluster(fig)
                for matched_fig, reason in matches:
                    cluster.add_duplicate(matched_fig, reason)
                    processed_ids.add(matched_fig.canonical_id)

                processed_ids.add(fig.canonical_id)
                clusters.append(cluster)

        return clusters

    def _pass3_fuzzy_match(self, processed_ids: Set[str]) -> List[DuplicateCluster]:
        """Pass 3: Find figures with fuzzy name similarity > 90%."""
        clusters = []
        unprocessed = [fig for fig in self.figures.values() if fig.canonical_id not in processed_ids]

        for i, fig1 in enumerate(unprocessed):
            if fig1.canonical_id in processed_ids:
                continue

            cluster = None

            for fig2 in unprocessed[i+1:]:
                if fig2.canonical_id in processed_ids:
                    continue

                similarity = fuzz.ratio(fig1.name.lower(), fig2.name.lower())

                if similarity > 90:
                    if cluster is None:
                        cluster = DuplicateCluster(fig1)
                        processed_ids.add(fig1.canonical_id)

                    cluster.add_duplicate(fig2, f"Fuzzy Match Score: {similarity}%")
                    processed_ids.add(fig2.canonical_id)

            if cluster:
                clusters.append(cluster)

        return clusters

    def generate_report(self, clusters: List[DuplicateCluster], output_path: str):
        """Generate markdown report of merge proposals."""
        print(f"📝 Generating merge proposals report...")

        with open(output_path, 'w') as f:
            f.write("# Fictotum: Entity Merge Proposals\n\n")
            f.write(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
            f.write(f"**Total Clusters Found:** {len(clusters)}\n\n")
            f.write("---\n\n")

            if not clusters:
                f.write("✅ No duplicate entities detected.\n")
            else:
                for idx, cluster in enumerate(clusters, 1):
                    f.write(f"## Merge Proposal {idx}: `{cluster.primary.canonical_id}`\n\n")

                    # Primary node info
                    f.write(f"- **Primary Node:** `{cluster.primary.canonical_id}`\n")
                    f.write(f"  - Name: {cluster.primary.name}\n")
                    if cluster.primary.wikidata_id:
                        f.write(f"  - QID: {cluster.primary.wikidata_id}\n")
                    f.write("\n")

                    # Duplicate nodes
                    f.write(f"- **Duplicate Nodes:** ({len(cluster.duplicates)} found)\n")
                    for dup_fig, reason in cluster.duplicates:
                        f.write(f"  - `{dup_fig.canonical_id}` (Name: {dup_fig.name}")
                        if dup_fig.wikidata_id:
                            f.write(f", QID: {dup_fig.wikidata_id}")
                        f.write(")\n")
                        f.write(f"    - **Reason:** {reason}\n")

                    f.write("\n---\n\n")

        print(f"✅ Report saved to: {output_path}")


def main():
    """Main entry point for the duplicate entity resolver."""
    load_dotenv()

    # Check Neo4j credentials
    uri = os.getenv("NEO4J_URI")
    user = os.getenv("NEO4J_USERNAME", "neo4j")
    pwd = os.getenv("NEO4J_PASSWORD")

    if not uri or not pwd:
        print("❌ Error: NEO4J_URI and NEO4J_PASSWORD environment variables must be set.")
        sys.exit(1)

    # Initialize resolver
    resolver = EntityResolver(uri, user, pwd)

    try:
        print(f"--- Fictotum Duplicate Entity Resolver: {datetime.now()} ---\n")

        # Step 1: Fetch all figures from Neo4j
        resolver.fetch_figures()

        # Step 2: Enrich with Wikidata aliases
        resolver.enrich_with_wikidata_aliases()

        # Step 3: Run three-pass detection
        clusters = resolver.detect_duplicates()

        # Step 4: Generate report
        output_path = Path(__file__).parent.parent.parent / "merge_proposals.md"
        resolver.generate_report(clusters, str(output_path))

        print(f"\n✅ Process complete. Review merge proposals in: {output_path}")

    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

    finally:
        resolver.close()


if __name__ == "__main__":
    main()
