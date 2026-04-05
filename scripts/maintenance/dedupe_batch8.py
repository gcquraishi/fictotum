"""
Deduplicate Batch 8 against existing Neo4j database.
"""
import os
import sys
import json
from pathlib import Path
from dotenv import load_dotenv
from neo4j import GraphDatabase

# Batch 8 raw data
batch8_raw = {
  "metadata": {
    "batch_id": 8,
    "focus_areas": ["Greco-Persian Wars", "The Conquests of Alexander", "The Trojan War (Myth-History)"],
    "status": "Ready for Ingestion"
  },
  "media_works": [
    {"media_id": "MW_701", "title": "300 (Graphic Novel)", "wikidata_id": "Q223191", "release_year": 1998, "creator": "Frank Miller", "creator_wikidata_id": "Q211188"},
    {"media_id": "MW_702", "title": "Alexander (Film)", "wikidata_id": "Q162277", "release_year": 2004, "creator": "Oliver Stone", "creator_wikidata_id": "Q179495"},
    {"media_id": "MW_703", "title": "Assassin's Creed Odyssey", "wikidata_id": "Q54617566", "release_year": 2018, "creator": "Ubisoft", "creator_wikidata_id": "Q190163"},
    {"media_id": "MW_704", "title": "Gates of Fire", "wikidata_id": "Q1495764", "release_year": 1998, "creator": "Steven Pressfield", "creator_wikidata_id": "Q1379133"},
    {"media_id": "MW_705", "title": "Song of Achilles", "wikidata_id": "Q7561057", "release_year": 2011, "creator": "Madeline Miller", "creator_wikidata_id": "Q6727043"},
    {"media_id": "MW_706", "title": "Troy (Film)", "wikidata_id": "Q186587", "release_year": 2004, "creator": "Wolfgang Petersen", "creator_wikidata_id": "Q57416"},
    {"media_id": "MW_707", "title": "The Iliad", "wikidata_id": "Q8275", "release_year": -750, "creator": "Homer", "creator_wikidata_id": "Q6691"}
  ],
  "historical_figures": [
    {"canonical_id": "HF_107", "name": "Leonidas I", "wikidata_id": "Q44228", "birth_year": -540, "death_year": -480, "title": "King of Sparta", "era": "Greco-Persian Wars"},
    {"canonical_id": "HF_108", "name": "Xerxes I", "wikidata_id": "Q129165", "birth_year": -519, "death_year": -465, "title": "King of Kings (Persia)", "era": "Greco-Persian Wars"},
    {"canonical_id": "HF_109", "name": "Alexander the Great", "wikidata_id": "Q8409", "birth_year": -356, "death_year": -323, "title": "King of Macedon", "era": "Hellenistic Period"},
    {"canonical_id": "HF_110", "name": "Socrates", "wikidata_id": "Q913", "birth_year": -470, "death_year": -399, "title": "Philosopher", "era": "Classical Greece"},
    {"canonical_id": "HF_111", "name": "Pericles", "wikidata_id": "Q35498", "birth_year": -495, "death_year": -429, "title": "General of Athens", "era": "Classical Greece"},
    {"canonical_id": "HF_112", "name": "Aristotle", "wikidata_id": "Q868", "birth_year": -384, "death_year": -322, "title": "Philosopher / Tutor to Alexander", "era": "Hellenistic Period"},
    {"canonical_id": "HF_113", "name": "Aspasia", "wikidata_id": "Q228564", "birth_year": -470, "death_year": -400, "title": "Metics / Partner of Pericles", "era": "Classical Greece"},
    {"canonical_id": "HF_114", "name": "Darius III", "wikidata_id": "Q174244", "birth_year": -380, "death_year": -330, "title": "Last King of Achaemenid Persia", "era": "Hellenistic Period"},
    {"canonical_id": "HF_115", "name": "Themistocles", "wikidata_id": "Q179555", "birth_year": -524, "death_year": -459, "title": "Archon of Athens", "era": "Greco-Persian Wars"}
  ],
  "fictional_characters": [
    {"char_id": "FC_053", "name": "Kassandra / Alexios", "media_id": "MW_703", "role_type": "Protagonist", "creator": "Ubisoft", "notes": "Era collider; Interacts with Socrates, Pericles, and Herodotus"},
    {"char_id": "FC_054", "name": "Achilles", "media_id": "MW_707", "role_type": "Protagonist", "creator": "Homer", "notes": "Era collider; Semi-historical/Mythological node of the Trojan War"},
    {"char_id": "FC_055", "name": "Xeones", "media_id": "MW_704", "role_type": "Protagonist", "creator": "Steven Pressfield", "notes": "Spartan squire and narrator of the battle of Thermopylae"},
    {"char_id": "FC_056", "name": "Hephaestion (Film Version)", "media_id": "MW_702", "role_type": "Supporting", "creator": "Oliver Stone", "notes": "Proxy for Historical Hephaestion"},
    {"char_id": "FC_057", "name": "Hector", "media_id": "MW_706", "role_type": "Antagonist", "creator": "Wolfgang Petersen", "notes": "Era collider"},
    {"char_id": "FC_058", "name": "Barnabas", "media_id": "MW_703", "role_type": "Supporting", "creator": "Ubisoft", "notes": "Fictional ship captain aiding the Eagle Bearer"},
    {"char_id": "FC_059", "name": "Patroclus", "media_id": "MW_705", "role_type": "Protagonist", "creator": "Madeline Miller", "notes": "Redefined as the romantic center of the Trojan narrative"}
  ],
  "interactions": [
    {"subject_id": "HF_107", "object_id": "HF_108", "relationship_type": "INTERACTED_WITH", "sentiment": "Villainous", "notes": "The Battle of Thermopylae (480 BC)"},
    {"subject_id": "FC_053", "object_id": "HF_110", "relationship_type": "INTERACTED_WITH", "sentiment": "Complex", "notes": "Philosophical debates during the Peloponnesian War"},
    {"subject_id": "HF_112", "object_id": "HF_109", "relationship_type": "INTERACTED_WITH", "sentiment": "Heroic", "notes": "Tutor to Alexander the Great"},
    {"subject_id": "FC_055", "object_id": "HF_107", "relationship_type": "INTERACTED_WITH", "sentiment": "Heroic", "notes": "Soldier for Leonidas"},
    {"subject_id": "FC_054", "object_id": "FC_057", "relationship_type": "INTERACTED_WITH", "sentiment": "Villainous", "notes": "Central collision of the Iliad - Achilles kills Hector"},
    {"subject_id": "HF_109", "object_id": "HF_114", "relationship_type": "INTERACTED_WITH", "sentiment": "Villainous", "notes": "Conquest of the Persian Empire"},
    {"subject_id": "FC_053", "object_id": "HF_111", "relationship_type": "INTERACTED_WITH", "sentiment": "Complex", "notes": "Assistance during the Plague of Athens"}
  ]
}

def main():
    load_dotenv()

    uri = os.getenv("NEO4J_URI", "bolt://localhost:7687")
    if uri.startswith("neo4j+s://"):
        uri = uri.replace("neo4j+s://", "neo4j+ssc://")
    username = os.getenv("NEO4J_USERNAME", "neo4j")
    password = os.getenv("NEO4J_PASSWORD")

    driver = GraphDatabase.driver(uri, auth=(username, password))

    print("=" * 70)
    print("Fictotum Batch 8 Deduplication")
    print("=" * 70)

    # Get existing Wikidata IDs
    with driver.session() as session:
        figure_ids = session.run(
            "MATCH (f:HistoricalFigure) WHERE f.wikidata_id IS NOT NULL RETURN collect(f.wikidata_id) as ids"
        ).single()["ids"]

        media_ids = session.run(
            "MATCH (m:MediaWork) WHERE m.wikidata_id IS NOT NULL RETURN collect(m.wikidata_id) as ids"
        ).single()["ids"]

    driver.close()

    print(f"\nExisting in database:")
    print(f"  Historical Figure Wikidata IDs: {len(figure_ids)}")
    print(f"  Media Work Wikidata IDs: {len(media_ids)}")

    # Deduplicate
    new_figures = []
    dup_figures = []
    for fig in batch8_raw["historical_figures"]:
        if fig["wikidata_id"] in figure_ids:
            dup_figures.append(fig)
        else:
            new_figures.append(fig)

    new_media = []
    dup_media = []
    for media in batch8_raw["media_works"]:
        if media["wikidata_id"] in media_ids:
            dup_media.append(media)
        else:
            new_media.append(media)

    # All fictional characters are new (no deduplication needed)
    new_characters = batch8_raw["fictional_characters"]

    print(f"\nBatch 8 Analysis:")
    print(f"  Historical Figures: {len(dup_figures)} duplicates removed, {len(new_figures)} new")
    print(f"  Media Works: {len(dup_media)} duplicates removed, {len(new_media)} new")
    print(f"  Fictional Characters: 0 duplicates removed, {len(new_characters)} new")

    if dup_figures:
        print(f"\n  Duplicate Figures Removed:")
        for fig in dup_figures:
            print(f"    - {fig['name']} ({fig['wikidata_id']})")

    if dup_media:
        print(f"\n  Duplicate Media Removed:")
        for media in dup_media:
            print(f"    - {media['title']} ({media['wikidata_id']})")

    # Create deduplicated dataset
    deduplicated = {
        "metadata": {
            "project": "Fictotum Global MVP - Batch 8 (Deduplicated)",
            "description": "Expansion dataset with NEW figures, media, and characters only. Duplicates removed by Wikidata Q-ID matching.",
            "deduplication_summary": {
                "media_works": f"{len(dup_media)} duplicates removed, {len(new_media)} new added",
                "historical_figures": f"{len(dup_figures)} duplicates removed, {len(new_figures)} new added",
                "fictional_characters": f"0 duplicates removed, {len(new_characters)} new added"
            }
        },
        "media_works": new_media,
        "historical_figures": new_figures,
        "fictional_characters": new_characters,
        "interactions": batch8_raw["interactions"]
    }

    # Save deduplicated version
    output_path = Path(__file__).parent.parent / "data" / "global_mvp_batch8_deduplicated.json"
    with open(output_path, 'w') as f:
        json.dump(deduplicated, f, indent=2)

    print(f"\n✓ Deduplicated data saved to: {output_path}")
    print("=" * 70)

    return deduplicated

if __name__ == "__main__":
    result = main()
    print(f"\nReady for ingestion:")
    print(f"  {len(result['historical_figures'])} new historical figures")
    print(f"  {len(result['media_works'])} new media works")
    print(f"  {len(result['fictional_characters'])} new fictional characters")
    print(f"  {len(result['interactions'])} interactions")
