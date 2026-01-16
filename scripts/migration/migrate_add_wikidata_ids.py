"""
Migration: Add Wikidata Q-IDs to existing MediaWork nodes

This script adds wikidata_id properties to all existing MediaWork nodes
and applies the new uniqueness constraint.
"""

import os
from dotenv import load_dotenv
from neo4j import GraphDatabase


# Wikidata Q-IDs for existing media works
WIKIDATA_IDS = {
    "hbo_rome": "Q165399",                          # Rome (TV series)
    "ac_origins": "Q23647136",                      # Assassin's Creed Origins
    "republic_of_rome": "Q7315066",                 # The Republic of Rome (board game)
    "masters_of_rome": "Q6784105",                  # Masters of Rome (book series)
    "spartacus_1960": "Q232000",                    # Spartacus (1960 film)
    "plutarch_lives": "Q192555",                    # Parallel Lives
    "cicero_trilogy": "Q5119959",                   # Cicero trilogy (Imperium)
    "spartacus_starz": "Q2085448",                  # Spartacus (TV series)
    "i_claudius_novel": "Q1344573",                 # I, Claudius (novel)
    "i_claudius_bbc": "Q1344599",                   # I, Claudius (TV series)
    "cleopatra_1963": "Q232000",                    # Cleopatra (1963 film) - CONFLICT with Spartacus!
}

# Note: There's a Q-ID conflict between spartacus_1960 and cleopatra_1963
# Need to verify correct IDs
CORRECTED_IDS = {
    "spartacus_1960": "Q232000",                    # Spartacus (1960 film)
    "cleopatra_1963": "Q229808",                    # Cleopatra (1963 film)
}


def migrate_wikidata_ids(uri: str, username: str, password: str):
    """Add wikidata_id to existing MediaWork nodes."""
    if uri.startswith("neo4j+s://"):
        uri = uri.replace("neo4j+s://", "neo4j+ssc://")

    driver = GraphDatabase.driver(uri, auth=(username, password))

    try:
        with driver.session() as session:
            # Apply corrected IDs
            ids_to_use = {**WIKIDATA_IDS, **CORRECTED_IDS}

            print("Updating MediaWork nodes with Wikidata Q-IDs...")
            for media_id, wikidata_id in ids_to_use.items():
                result = session.run("""
                    MATCH (m:MediaWork {media_id: $media_id})
                    SET m.wikidata_id = $wikidata_id
                    RETURN m.title AS title, m.wikidata_id AS qid
                """, media_id=media_id, wikidata_id=wikidata_id)

                record = result.single()
                if record:
                    print(f"  ✓ {record['title']}: {record['qid']}")
                else:
                    print(f"  ✗ {media_id}: not found in database")

            # Apply the new constraint
            print("\nApplying Wikidata uniqueness constraint...")
            try:
                session.run("""
                    CREATE CONSTRAINT media_wikidata_unique IF NOT EXISTS
                    FOR (m:MediaWork) REQUIRE m.wikidata_id IS UNIQUE
                """)
                print("  ✓ Constraint applied")
            except Exception as e:
                print(f"  Note: {e}")

            # Verify all nodes have wikidata_id
            print("\nVerifying migration...")
            result = session.run("""
                MATCH (m:MediaWork)
                RETURN m.media_id AS id, m.title AS title, m.wikidata_id AS qid
                ORDER BY m.title
            """)

            missing = []
            for record in result:
                if record["qid"]:
                    print(f"  ✓ {record['title']}: {record['qid']}")
                else:
                    print(f"  ✗ {record['title']}: MISSING wikidata_id")
                    missing.append(record["id"])

            if missing:
                print(f"\n⚠️  {len(missing)} nodes missing wikidata_id: {missing}")
            else:
                print("\n✅ All MediaWork nodes have Wikidata Q-IDs")

    finally:
        driver.close()


def main():
    load_dotenv()

    uri = os.getenv("NEO4J_URI")
    username = os.getenv("NEO4J_USERNAME", "neo4j")
    password = os.getenv("NEO4J_PASSWORD")

    if not password:
        raise ValueError("NEO4J_PASSWORD not found in environment")

    print("=" * 60)
    print("ChronosGraph: Wikidata Q-ID Migration")
    print("=" * 60)

    migrate_wikidata_ids(uri, username, password)

    print("\n" + "=" * 60)
    print("Migration complete!")
    print("=" * 60)


if __name__ == "__main__":
    main()
