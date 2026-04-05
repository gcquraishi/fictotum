"""
Deduplicate Batch 10 against existing Neo4j database.
"""
import os
import sys
import json
from pathlib import Path
from dotenv import load_dotenv
from neo4j import GraphDatabase

# Batch 10 raw data
batch10_raw = {
  "metadata": {
    "batch_id": 10,
    "focus_areas": ["The Fall of the Han Dynasty", "Three Kingdoms (Wei, Shu, Wu)", "Red Cliff Strategic Axis"],
    "status": "Ready for Ingestion"
  },
  "media_works": [
    {"media_id": "MW_901", "title": "The Ravages of Time", "wikidata_id": "Q709088", "release_year": 2001, "creator": "Chan Mou", "creator_wikidata_id": None},
    {"media_id": "MW_902", "title": "Dynasty Warriors (Series)", "wikidata_id": "Q1194203", "release_year": 1997, "creator": "Omega Force / Koei Tecmo", "creator_wikidata_id": "Q1134007"},
    {"media_id": "MW_903", "title": "Total War: Three Kingdoms", "wikidata_id": "Q47214532", "release_year": 2019, "creator": "Creative Assembly", "creator_wikidata_id": "Q1139363"},
    {"media_id": "MW_904", "title": "The Lost Bladesman", "wikidata_id": "Q714030", "release_year": 2011, "creator": "Felix Chong", "creator_wikidata_id": "Q702170"},
    {"media_id": "MW_905", "title": "Sōten Kōro (Beyond the Heavens)", "wikidata_id": "Q1087818", "release_year": 1994, "creator": "King Gonta", "creator_wikidata_id": None},
    {"media_id": "MW_906", "title": "Three Kingdoms (TV Series)", "wikidata_id": "Q710497", "release_year": 2010, "creator": "Gao Xixi", "creator_wikidata_id": "Q5521634"}
  ],
  "historical_figures": [
    {"canonical_id": "HF_125", "name": "Zhang Fei", "wikidata_id": "Q311395", "birth_year": 167, "death_year": 221, "title": "General of Shu / The Brave", "era": "Three Kingdoms China"},
    {"canonical_id": "HF_126", "name": "Zhao Yun", "wikidata_id": "Q311370", "birth_year": 168, "death_year": 229, "title": "General of Shu / Zilong", "era": "Three Kingdoms China"},
    {"canonical_id": "HF_127", "name": "Dong Zhuo", "wikidata_id": "Q312384", "birth_year": 138, "death_year": 192, "title": "Tyrant / Chancellor", "era": "Three Kingdoms China"},
    {"canonical_id": "HF_128", "name": "Sun Ce", "wikidata_id": "Q317409", "birth_year": 175, "death_year": 200, "title": "The Little Conqueror / Lord of Wu", "era": "Three Kingdoms China"},
    {"canonical_id": "HF_129", "name": "Ma Chao", "wikidata_id": "Q380211", "birth_year": 176, "death_year": 222, "title": "General of the West / The Splendid", "era": "Three Kingdoms China"},
    {"canonical_id": "HF_130", "name": "Huang Zhong", "wikidata_id": "Q350645", "birth_year": 147, "death_year": 220, "title": "Veteran General / Archer", "era": "Three Kingdoms China"},
    {"canonical_id": "HF_131", "name": "Gan Ning", "wikidata_id": "Q442301", "birth_year": 175, "death_year": 220, "title": "Pirate General of Wu", "era": "Three Kingdoms China"},
    {"canonical_id": "HF_132", "name": "Pang Tong", "wikidata_id": "Q1191060", "birth_year": 179, "death_year": 214, "title": "Fledgling Phoenix / Strategist", "era": "Three Kingdoms China"},
    {"canonical_id": "HF_133", "name": "Zhong Hui", "wikidata_id": "Q197873", "birth_year": 225, "death_year": 264, "title": "General of Wei", "era": "Three Kingdoms China"}
  ],
  "fictional_characters": [
    {"char_id": "FC_068", "name": "Guan Yu (Deified)", "media_id": "MW_002", "role_type": "Protagonist", "creator": "Luo Guanzhong", "notes": "Era collider; Fictionalized version of HF_CN_004; possesses supernatural strength and the Green Dragon Crescent Blade"},
    {"char_id": "FC_069", "name": "Diaochan", "media_id": "MW_906", "role_type": "Protagonist", "creator": "Gao Xixi", "notes": "Purely fictional creation in the novel; used to drive the conflict between Dong Zhuo and Lu Bu"},
    {"char_id": "FC_070", "name": "Liao Hua (Ravages Version)", "media_id": "MW_901", "role_type": "Supporting", "creator": "Chan Mou", "notes": "Fictionalized as a 'hand of the handicapped' assassin"},
    {"char_id": "FC_071", "name": "Zhao Yun (Dynasty Warriors)", "media_id": "MW_902", "role_type": "Protagonist", "creator": "Omega Force / Koei Tecmo", "notes": "Represented as the face of the series; superhuman spear techniques"},
    {"char_id": "FC_072", "name": "Lady Sun (Sun Shangxiang)", "media_id": "MW_203", "role_type": "Protagonist", "creator": "John Woo", "notes": "Fictionalized as a warrior princess and spy in the Red Cliff film"},
    {"char_id": "FC_073", "name": "Zhuge Liang (Legendary Version)", "media_id": "MW_002", "role_type": "Protagonist", "creator": "Luo Guanzhong", "notes": "Era collider; The fictionalized 'God of Wisdom' capable of summoning the wind"}
  ],
  "interactions": [
    {"subject_id": "HF_CN_002", "object_id": "HF_CN_004", "relationship_type": "INTERACTED_WITH", "sentiment": "Heroic", "notes": "The Oath of the Peach Garden - sworn brothers"},
    {"subject_id": "HF_CN_002", "object_id": "HF_125", "relationship_type": "INTERACTED_WITH", "sentiment": "Heroic", "notes": "Sworn brothers - Oath of the Peach Garden"},
    {"subject_id": "FC_069", "object_id": "HF_127", "relationship_type": "INTERACTED_WITH", "sentiment": "Villainous", "notes": "Plot to sow discord with Lu Bu"},
    {"subject_id": "HF_CN_003", "object_id": "HF_052", "relationship_type": "INTERACTED_WITH", "sentiment": "Complex", "notes": "The Northern Expeditions; the ultimate battle of wits"},
    {"subject_id": "HF_126", "object_id": "HF_CN_001", "relationship_type": "INTERACTED_WITH", "sentiment": "Heroic", "notes": "Battle of Changban; Zhao Yun rescues Liu Bei's son through Cao Cao's army"},
    {"subject_id": "HF_051", "object_id": "HF_132", "relationship_type": "INTERACTED_WITH", "sentiment": "Heroic", "notes": "Planning the fire attack at Red Cliff"},
    {"subject_id": "FC_072", "object_id": "HF_CN_002", "relationship_type": "INTERACTED_WITH", "sentiment": "Complex", "notes": "A political marriage that became a pillar of the Shu-Wu alliance"}
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
    print("Fictotum Batch 10 Deduplication")
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
    for fig in batch10_raw["historical_figures"]:
        if fig["wikidata_id"] in figure_ids:
            dup_figures.append(fig)
        else:
            new_figures.append(fig)

    new_media = []
    dup_media = []
    for media in batch10_raw["media_works"]:
        if media["wikidata_id"] in media_ids:
            dup_media.append(media)
        else:
            new_media.append(media)

    # All fictional characters are new (no deduplication needed)
    new_characters = batch10_raw["fictional_characters"]

    print(f"\nBatch 10 Analysis:")
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
            "project": "Fictotum Global MVP - Batch 10 (Deduplicated)",
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
        "interactions": batch10_raw["interactions"]
    }

    # Save deduplicated version
    output_path = Path(__file__).parent.parent / "data" / "global_mvp_batch10_deduplicated.json"
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
