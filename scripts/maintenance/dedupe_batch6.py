"""
Deduplicate Batch 6 against existing Neo4j database.
"""
import os
import sys
import json
from pathlib import Path
from dotenv import load_dotenv
from neo4j import GraphDatabase

# Batch 6 raw data
batch6_raw = {
  "metadata": {
    "batch_id": 6,
    "focus_areas": ["World War II", "Bletchley Park", "The Manhattan Project", "The Intelligence Nexus"],
    "status": "Ready for Ingestion"
  },
  "media_works": [
    {"media_id": "MW_501", "title": "The Imitation Game", "wikidata_id": "Q14914459", "release_year": 2014, "creator": "Graham Moore", "creator_wikidata_id": "Q16213009"},
    {"media_id": "MW_502", "title": "Oppenheimer", "wikidata_id": "Q108837266", "release_year": 2023, "creator": "Christopher Nolan", "creator_wikidata_id": "Q25191"},
    {"media_id": "MW_503", "title": "Inglourious Basterds", "wikidata_id": "Q153723", "release_year": 2009, "creator": "Quentin Tarantino", "creator_wikidata_id": "Q3772"},
    {"media_id": "MW_504", "title": "Band of Brothers", "wikidata_id": "Q208048", "release_year": 2001, "creator": "Stephen E. Ambrose", "creator_wikidata_id": "Q335193"},
    {"media_id": "MW_505", "title": "Saving Private Ryan", "wikidata_id": "Q165817", "release_year": 1998, "creator": "Steven Spielberg", "creator_wikidata_id": "Q8877"},
    {"media_id": "MW_506", "title": "The Man in the High Castle", "wikidata_id": "Q1195435", "release_year": 1962, "creator": "Philip K. Dick", "creator_wikidata_id": "Q171091"},
    {"media_id": "MW_507", "title": "Casino Royale (Novel)", "wikidata_id": "Q1047915", "release_year": 1953, "creator": "Ian Fleming", "creator_wikidata_id": "Q82104"}
  ],
  "historical_figures": [
    {"canonical_id": "HF_088", "name": "Alan Turing", "wikidata_id": "Q7251", "birth_year": 1912, "death_year": 1954, "title": "Mathematician / Codebreaker", "era": "World War II"},
    {"canonical_id": "HF_089", "name": "J. Robert Oppenheimer", "wikidata_id": "Q127308", "birth_year": 1904, "death_year": 1967, "title": "Physicist / 'Father of the Atomic Bomb'", "era": "World War II"},
    {"canonical_id": "HF_090", "name": "Winston Churchill", "wikidata_id": "Q8016", "birth_year": 1874, "death_year": 1965, "title": "Prime Minister of the UK", "era": "World War II"},
    {"canonical_id": "HF_091", "name": "Albert Einstein", "wikidata_id": "Q937", "birth_year": 1879, "death_year": 1955, "title": "Theoretical Physicist", "era": "World War II"},
    {"canonical_id": "HF_092", "name": "Joan Clarke", "wikidata_id": "Q16015146", "birth_year": 1917, "death_year": 1996, "title": "Cryptanalyst", "era": "World War II"},
    {"canonical_id": "HF_093", "name": "Ian Fleming", "wikidata_id": "Q82104", "birth_year": 1908, "death_year": 1964, "title": "Intelligence Officer / Author", "era": "World War II"},
    {"canonical_id": "HF_094", "name": "Leslie Groves", "wikidata_id": "Q434241", "birth_year": 1896, "death_year": 1970, "title": "General / Director of Manhattan Project", "era": "World War II"},
    {"canonical_id": "HF_095", "name": "Adolf Hitler", "wikidata_id": "Q352", "birth_year": 1889, "death_year": 1945, "title": "Dictator of Germany", "era": "World War II"},
    {"canonical_id": "HF_096", "name": "Jean Moulin", "wikidata_id": "Q214829", "birth_year": 1899, "death_year": 1943, "title": "French Resistance Leader", "era": "World War II"},
    {"canonical_id": "HF_097", "name": "Dwight D. Eisenhower", "wikidata_id": "Q9916", "birth_year": 1890, "death_year": 1969, "title": "Supreme Allied Commander", "era": "World War II"}
  ],
  "fictional_characters": [
    {"char_id": "FC_039", "name": "Aldo Raine", "media_id": "MW_503", "role_type": "Protagonist", "creator": "Quentin Tarantino", "notes": "Era collider"},
    {"char_id": "FC_040", "name": "Captain John H. Miller", "media_id": "MW_505", "role_type": "Protagonist", "creator": "Steven Spielberg", "notes": "Era collider"},
    {"char_id": "FC_041", "name": "James Bond (Fleming Era)", "media_id": "MW_507", "role_type": "Protagonist", "creator": "Ian Fleming", "notes": "Era collider; Fictional proxy for Fleming's own naval intelligence experience"},
    {"char_id": "FC_042", "name": "Juliana Crain", "media_id": "MW_506", "role_type": "Protagonist", "creator": "Philip K. Dick", "notes": "Alternate history navigator"},
    {"char_id": "FC_043", "name": "Alan Turing (Fictionalized)", "media_id": "MW_501", "role_type": "Protagonist", "creator": "Graham Moore", "notes": "Proxy for HF_088"},
    {"char_id": "FC_044", "name": "J. Robert Oppenheimer (Nolan Version)", "media_id": "MW_502", "role_type": "Protagonist", "creator": "Christopher Nolan", "notes": "Proxy for HF_089"},
    {"char_id": "FC_045", "name": "Lieutenant Archie Hicox", "media_id": "MW_503", "role_type": "Supporting", "creator": "Quentin Tarantino", "notes": "Commando and film critic; interacts with Churchill and Raine"}
  ],
  "interactions": [
    {"subject_id": "HF_088", "object_id": "HF_090", "relationship_type": "INTERACTED_WITH", "sentiment": "Complex", "notes": "Turing wrote directly to Churchill to bypass Bletchley Park bureaucracy for funding"},
    {"subject_id": "HF_089", "object_id": "HF_091", "relationship_type": "INTERACTED_WITH", "sentiment": "Complex", "notes": "Consulted Einstein on the feasibility of atmospheric ignition"},
    {"subject_id": "FC_039", "object_id": "HF_095", "relationship_type": "INTERACTED_WITH", "sentiment": "Villainous", "notes": "Alternate history assassination event in Inglourious Basterds"},
    {"subject_id": "HF_093", "object_id": "FC_041", "relationship_type": "INTERACTED_WITH", "sentiment": "Heroic", "notes": "Bond is the idealized composite of commandos Fleming knew in 30 Assault Unit"},
    {"subject_id": "HF_094", "object_id": "HF_089", "relationship_type": "INTERACTED_WITH", "sentiment": "Complex", "notes": "Military/Scientific friction within the Manhattan Project"},
    {"subject_id": "FC_045", "object_id": "HF_090", "relationship_type": "INTERACTED_WITH", "sentiment": "Heroic", "notes": "Churchill briefs Hicox for Operation Kino in the fictional timeline"},
    {"subject_id": "FC_040", "object_id": "HF_097", "relationship_type": "INTERACTED_WITH", "sentiment": "Heroic", "notes": "Miller's mission (Saving Ryan) is sanctioned by Marshall, operating under Eisenhower's command structure"}
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
    print("Fictotum Batch 6 Deduplication")
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
    for fig in batch6_raw["historical_figures"]:
        if fig["wikidata_id"] in figure_ids:
            dup_figures.append(fig)
        else:
            new_figures.append(fig)

    new_media = []
    dup_media = []
    for media in batch6_raw["media_works"]:
        if media["wikidata_id"] in media_ids:
            dup_media.append(media)
        else:
            new_media.append(media)

    # All fictional characters are new (no deduplication needed)
    new_characters = batch6_raw["fictional_characters"]

    print(f"\nBatch 6 Analysis:")
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
            "project": "Fictotum Global MVP - Batch 6 (Deduplicated)",
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
        "interactions": batch6_raw["interactions"]
    }

    # Save deduplicated version
    output_path = Path(__file__).parent.parent / "data" / "global_mvp_batch6_deduplicated.json"
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
