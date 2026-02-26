"""
Fictotum Pathfinder Module

Implements 'Six Degrees of Historiography' using Neo4j shortest path queries.
Finds connections between historical figures through:
- INTERACTED_WITH relationships (historical social connections)
- APPEARS_IN relationships (media portrayals)
- Bridges via FictionalCharacters and shared MediaWorks

Database: Neo4j Aura (c78564a4)
"""

import os
import json
from typing import Optional, Union
from dataclasses import dataclass, asdict
from enum import Enum
from dotenv import load_dotenv
from neo4j import GraphDatabase
from neo4j.exceptions import ServiceUnavailable, AuthError


class BridgeType(str, Enum):
    """Types of bridges in historiographic paths."""
    FICTIONAL_CHARACTER = "FictionalCharacter"
    SHARED_MEDIA = "SharedMediaWork"
    HISTORICAL_INTERACTION = "HistoricalInteraction"
    NONE = "None"


@dataclass
class PathNode:
    """Represents a node in the historiographic path."""
    node_type: str  # HistoricalFigure, MediaWork, FictionalCharacter
    node_id: str
    name: str
    properties: dict


@dataclass
class PathRelationship:
    """Represents a relationship in the historiographic path."""
    rel_type: str  # INTERACTED_WITH, APPEARS_IN, etc.
    from_node: str
    to_node: str
    bridge_type: BridgeType
    context: Optional[str] = None


@dataclass
class HistoriographicPath:
    """Complete path representation with bridge detection."""
    start_node: str
    end_node: str
    path_length: int
    nodes: list[PathNode]
    relationships: list[PathRelationship]
    bridges: list[dict]  # Highlighted bridge points
    total_bridges: int


class FictotumPathfinder:
    """Neo4j pathfinding for Six Degrees of Historiography."""

    def __init__(self, uri: str, username: str, password: str):
        """Initialize Neo4j driver with SSL fallback."""
        if uri.startswith("neo4j+s://"):
            uri = uri.replace("neo4j+s://", "neo4j+ssc://")
        self.driver = GraphDatabase.driver(uri, auth=(username, password))

    def close(self):
        """Close the database connection."""
        self.driver.close()

    def find_shortest_path(self, start_id: str, end_id: str) -> Optional[dict]:
        """
        Find shortest path between two HistoricalFigures.

        Uses Neo4j's shortestPath function to traverse:
        - INTERACTED_WITH (Historical social connections)
        - APPEARS_IN (Fictional media portrayals)

        Args:
            start_id: canonical_id of starting HistoricalFigure
            end_id: canonical_id of ending HistoricalFigure

        Returns:
            JSON-formatted dictionary with path details and bridge highlights,
            or None if no path exists.
        """
        with self.driver.session() as session:
            try:
                result = session.run("""
                    MATCH (start:HistoricalFigure {canonical_id: $start_id}),
                          (end:HistoricalFigure {canonical_id: $end_id})
                    MATCH path = shortestPath(
                        (start)-[*..10]-(end)
                    )
                    WHERE ALL(rel IN relationships(path)
                        WHERE type(rel) IN ['INTERACTED_WITH', 'APPEARS_IN'])
                    RETURN path,
                           nodes(path) as path_nodes,
                           relationships(path) as path_rels,
                           length(path) as path_length
                    LIMIT 1
                """, start_id=start_id, end_id=end_id)

                record = result.single()
                if not record:
                    return None

                # Parse the path
                path_nodes = record["path_nodes"]
                path_rels = record["path_rels"]
                path_length = record["path_length"]

                # Build structured path representation
                nodes = []
                relationships = []
                bridges = []

                # Process nodes
                for idx, node in enumerate(path_nodes):
                    labels = list(node.labels)
                    node_type = labels[0] if labels else "Unknown"

                    # Extract node properties
                    props = dict(node)
                    node_id = props.get("canonical_id") or props.get("media_id") or props.get("char_id")
                    name = props.get("name") or props.get("title", "Unknown")

                    path_node = PathNode(
                        node_type=node_type,
                        node_id=node_id,
                        name=name,
                        properties=props
                    )
                    nodes.append(path_node)

                    # Detect bridges
                    if node_type == "FictionalCharacter":
                        bridges.append({
                            "position": idx,
                            "type": BridgeType.FICTIONAL_CHARACTER.value,
                            "node_id": node_id,
                            "name": name,
                            "description": f"Path bridged by fictional character '{name}'"
                        })
                    elif node_type == "MediaWork":
                        bridges.append({
                            "position": idx,
                            "type": BridgeType.SHARED_MEDIA.value,
                            "node_id": node_id,
                            "name": name,
                            "description": f"Path bridged by shared media work '{name}'"
                        })

                # Process relationships
                for idx, rel in enumerate(path_rels):
                    rel_type = rel.type
                    from_node = nodes[idx].node_id
                    to_node = nodes[idx + 1].node_id

                    # Determine bridge type
                    bridge_type = BridgeType.NONE
                    context = dict(rel).get("context") or dict(rel).get("sentiment")

                    if rel_type == "INTERACTED_WITH":
                        bridge_type = BridgeType.HISTORICAL_INTERACTION
                    elif rel_type == "APPEARS_IN":
                        # Check if next node is MediaWork (indicating fictional bridge)
                        if nodes[idx + 1].node_type == "MediaWork":
                            bridge_type = BridgeType.SHARED_MEDIA

                    path_rel = PathRelationship(
                        rel_type=rel_type,
                        from_node=from_node,
                        to_node=to_node,
                        bridge_type=bridge_type,
                        context=str(context) if context else None
                    )
                    relationships.append(path_rel)

                # Create final path object
                historiographic_path = HistoriographicPath(
                    start_node=start_id,
                    end_node=end_id,
                    path_length=path_length,
                    nodes=nodes,
                    relationships=relationships,
                    bridges=bridges,
                    total_bridges=len(bridges)
                )

                # Convert to JSON-serializable dict
                return self._to_json_dict(historiographic_path)

            except Exception as e:
                print(f"[ERROR] Failed to find path: {e}")
                return None

    def find_all_paths(self, start_id: str, end_id: str, max_paths: int = 5) -> list[dict]:
        """
        Find multiple paths between two HistoricalFigures.

        Args:
            start_id: canonical_id of starting HistoricalFigure
            end_id: canonical_id of ending HistoricalFigure
            max_paths: Maximum number of paths to return

        Returns:
            List of JSON-formatted path dictionaries
        """
        with self.driver.session() as session:
            try:
                result = session.run("""
                    MATCH (start:HistoricalFigure {canonical_id: $start_id}),
                          (end:HistoricalFigure {canonical_id: $end_id})
                    MATCH path = allShortestPaths(
                        (start)-[*..10]-(end)
                    )
                    WHERE ALL(rel IN relationships(path)
                        WHERE type(rel) IN ['INTERACTED_WITH', 'APPEARS_IN'])
                    RETURN path,
                           nodes(path) as path_nodes,
                           relationships(path) as path_rels,
                           length(path) as path_length
                    LIMIT $max_paths
                """, start_id=start_id, end_id=end_id, max_paths=max_paths)

                paths = []
                for record in result:
                    # Reuse single path parsing logic
                    # (simplified for brevity - would extract to shared method)
                    paths.append({
                        "path_length": record["path_length"],
                        "node_count": len(record["path_nodes"]),
                        "relationship_count": len(record["path_rels"])
                    })

                return paths

            except Exception as e:
                print(f"[ERROR] Failed to find all paths: {e}")
                return []

    def find_degrees_of_separation(self, start_id: str, end_id: str) -> Optional[int]:
        """
        Calculate degrees of separation between two figures.

        Returns:
            Number of hops in shortest path, or None if no path exists
        """
        path = self.find_shortest_path(start_id, end_id)
        if path:
            return path["path_length"]
        return None

    def get_node_info(self, node_id: str) -> Optional[dict]:
        """
        Retrieve information about a specific node.

        Args:
            node_id: canonical_id, media_id, or char_id

        Returns:
            Node properties and label
        """
        with self.driver.session() as session:
            try:
                result = session.run("""
                    MATCH (n)
                    WHERE n.canonical_id = $node_id
                       OR n.media_id = $node_id
                       OR n.char_id = $node_id
                    RETURN n, labels(n) as node_labels
                """, node_id=node_id)

                record = result.single()
                if not record:
                    return None

                node = record["n"]
                labels = record["node_labels"]

                return {
                    "node_type": labels[0] if labels else "Unknown",
                    "labels": labels,
                    "properties": dict(node)
                }

            except Exception as e:
                print(f"[ERROR] Failed to get node info: {e}")
                return None

    def _to_json_dict(self, path: HistoriographicPath) -> dict:
        """Convert HistoriographicPath to JSON-serializable dictionary."""
        return {
            "start_node": path.start_node,
            "end_node": path.end_node,
            "path_length": path.path_length,
            "nodes": [
                {
                    "node_type": node.node_type,
                    "node_id": node.node_id,
                    "name": node.name,
                    "properties": node.properties
                }
                for node in path.nodes
            ],
            "relationships": [
                {
                    "rel_type": rel.rel_type,
                    "from_node": rel.from_node,
                    "to_node": rel.to_node,
                    "bridge_type": rel.bridge_type.value,
                    "context": rel.context
                }
                for rel in path.relationships
            ],
            "bridges": path.bridges,
            "total_bridges": path.total_bridges
        }


def format_path_human_readable(path_dict: dict) -> str:
    """
    Format a path dictionary into human-readable text.

    Args:
        path_dict: Output from find_shortest_path()

    Returns:
        Formatted string representation
    """
    if not path_dict:
        return "No path found."

    lines = []
    lines.append("=" * 70)
    lines.append("SIX DEGREES OF HISTORIOGRAPHY")
    lines.append("=" * 70)
    lines.append(f"From: {path_dict['start_node']}")
    lines.append(f"To:   {path_dict['end_node']}")
    lines.append(f"Path Length: {path_dict['path_length']} hops")
    lines.append(f"Bridges: {path_dict['total_bridges']}")
    lines.append("")

    # Display path
    lines.append("PATH:")
    lines.append("-" * 70)

    nodes = path_dict["nodes"]
    rels = path_dict["relationships"]

    for i, node in enumerate(nodes):
        # Node info
        bridge_marker = ""
        for bridge in path_dict["bridges"]:
            if bridge["position"] == i:
                bridge_marker = f" [🌉 {bridge['type']}]"

        lines.append(f"{i+1}. [{node['node_type']}] {node['name']}{bridge_marker}")

        # Relationship info (if not last node)
        if i < len(rels):
            rel = rels[i]
            rel_display = f"   --[{rel['rel_type']}]-->"
            if rel["context"]:
                rel_display += f" ({rel['context']})"
            lines.append(rel_display)

    # Bridge summary
    if path_dict["bridges"]:
        lines.append("")
        lines.append("BRIDGE SUMMARY:")
        lines.append("-" * 70)
        for bridge in path_dict["bridges"]:
            lines.append(f"• {bridge['description']}")

    lines.append("=" * 70)

    return "\n".join(lines)


def main():
    """CLI interface for pathfinding."""
    load_dotenv()

    uri = os.getenv("NEO4J_URI", "bolt://localhost:7687")
    username = os.getenv("NEO4J_USERNAME", "neo4j")
    password = os.getenv("NEO4J_PASSWORD")

    if not password:
        raise ValueError("NEO4J_PASSWORD not found in environment variables")

    print("=" * 70)
    print("Fictotum Pathfinder - Six Degrees of Historiography")
    print("=" * 70)
    print(f"Connected to: Neo4j Aura (c78564a4)")
    print()

    pathfinder = FictotumPathfinder(uri, username, password)

    try:
        # Example: Find path between Julius Caesar and Cleopatra
        print("Example: Finding path between Julius Caesar and Cleopatra VII")
        print("-" * 70)

        path = pathfinder.find_shortest_path("julius_caesar", "cleopatra_vii")

        if path:
            print(format_path_human_readable(path))

            # Also print JSON
            print("\nJSON OUTPUT:")
            print(json.dumps(path, indent=2))
        else:
            print("No path found between these figures.")

        # Example: Get degrees of separation
        print("\n" + "=" * 70)
        print("Degrees of Separation:")
        degrees = pathfinder.find_degrees_of_separation("julius_caesar", "cleopatra_vii")
        print(f"Julius Caesar <-> Cleopatra VII: {degrees} degrees")

    except (ServiceUnavailable, AuthError) as e:
        print(f"\n[ERROR] Database connection failed: {e}")
    except Exception as e:
        print(f"\n[ERROR] Unexpected error: {e}")
    finally:
        pathfinder.close()


if __name__ == "__main__":
    main()
