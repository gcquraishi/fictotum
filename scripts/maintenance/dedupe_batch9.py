"""
Deduplicate Batch 9 against existing Neo4j database.
"""
import os
import sys
import json
from pathlib import Path
from dotenv import load_dotenv
from neo4j import GraphDatabase

# Batch 9 raw data
batch9_raw = {
  "metadata": {
    "batch_id": 9,
    "focus_areas": ["Sengoku Jidai", "The Unification of Japan", "Shinobi/Ninja Folklore", "The Duelists"],
    "status": "Ready for Ingestion"
  },
  "media_works": [
    {"media_id": "MW_801", "title": "Kagemusha", "wikidata_id": "Q854990", "release_year": 1980, "creator": "Akira Kurosawa", "creator_wikidata_id": "Q8006"},
    {"media_id": "MW_802", "title": "Sekiro: Shadows Die Twice", "wikidata_id": "Q54942485", "release_year": 2019, "creator": "Hidetaka Miyazaki", "creator_wikidata_id": "Q21694639"},
    {"media_id": "MW_803", "title": "Nioh", "wikidata_id": "Q21646788", "release_year": 2017, "creator": "Fumihiko Yasuda", "creator_wikidata_id": None},
    {"media_id": "MW_804", "title": "Vagabond", "wikidata_id": "Q1197472", "release_year": 1998, "creator": "Takehiko Inoue", "creator_wikidata_id": "Q353400"},
    {"media_id": "MW_805", "title": "Ran", "wikidata_id": "Q185951", "release_year": 1985, "creator": "Akira Kurosawa", "creator_wikidata_id": "Q8006"},
    {"media_id": "MW_806", "title": "Inuyasha", "wikidata_id": "Q181283", "release_year": 1996, "creator": "Rumiko Takahashi", "creator_wikidata_id": "Q231145"},
    {"media_id": "MW_807", "title": "Blue Eye Samurai", "wikidata_id": "Q123015926", "release_year": 2023, "creator": "Michael Green", "creator_wikidata_id": "Q6830743"},
    {"media_id": "MW_808", "title": "Onimusha: Warlords", "wikidata_id": "Q1371536", "release_year": 2001, "creator": "Keiji Inafune", "creator_wikidata_id": "Q552253"}
  ],
  "historical_figures": [
    {"canonical_id": "HF_116", "name": "Takeda Shingen", "wikidata_id": "Q222830", "birth_year": 1521, "death_year": 1573, "title": "The Tiger of Kai", "era": "Sengoku Japan"},
    {"canonical_id": "HF_117", "name": "Uesugi Kenshin", "wikidata_id": "Q311306", "birth_year": 1530, "death_year": 1578, "title": "The Dragon of Echigo", "era": "Sengoku Japan"},
    {"canonical_id": "HF_118", "name": "Hattori Hanzo", "wikidata_id": "Q312415", "birth_year": 1542, "death_year": 1596, "title": "Shinobi / Tokugawa General", "era": "Sengoku Japan"},
    {"canonical_id": "HF_119", "name": "Miyamoto Musashi", "wikidata_id": "Q193361", "birth_year": 1584, "death_year": 1645, "title": "Swordsman / Author of Five Rings", "era": "Early Edo Transition"},
    {"canonical_id": "HF_120", "name": "Sasaki Kojiro", "wikidata_id": "Q509935", "birth_year": 1585, "death_year": 1612, "title": "Master of the Ganryu Style", "era": "Early Edo Transition"},
    {"canonical_id": "HF_121", "name": "Ishida Mitsunari", "wikidata_id": "Q312673", "birth_year": 1559, "death_year": 1600, "title": "Commander of the Western Army", "era": "Sengoku Japan"},
    {"canonical_id": "HF_122", "name": "Yodo-dono (Lady Chacha)", "wikidata_id": "Q1141369", "birth_year": 1569, "death_year": 1615, "title": "Concubine of Hideyoshi", "era": "Sengoku Japan"},
    {"canonical_id": "HF_123", "name": "Honda Tadakatsu", "wikidata_id": "Q1060424", "birth_year": 1548, "death_year": 1610, "title": "The Warrior Who Surpassed Death", "era": "Sengoku Japan"},
    {"canonical_id": "HF_124", "name": "Sanada Masayuki", "wikidata_id": "Q1140924", "birth_year": 1547, "death_year": 1611, "title": "Daimyo / Strategist", "era": "Sengoku Japan"}
  ],
  "fictional_characters": [
    {"char_id": "FC_060", "name": "Sekiro (Wolf)", "media_id": "MW_802", "role_type": "Protagonist", "creator": "Hidetaka Miyazaki", "notes": "Era collider; Fictional shinobi operating in a fantastical Ashina (vassal to Takeda/Tokugawa era)"},
    {"char_id": "FC_061", "name": "William (Nioh)", "media_id": "MW_803", "role_type": "Protagonist", "creator": "Fumihiko Yasuda", "notes": "Proxy for William Adams; Fictionalized version of the first Western Samurai fighting Yokai"},
    {"char_id": "FC_062", "name": "Takezo (Musashi)", "media_id": "MW_804", "role_type": "Protagonist", "creator": "Takehiko Inoue", "notes": "Proxy for HF_119; Highly psychological portrayal in Vagabond"},
    {"char_id": "FC_063", "name": "The Kagemusha (Shadow Warrior)", "media_id": "MW_801", "role_type": "Protagonist", "creator": "Akira Kurosawa", "notes": "Proxy for Takeda Shingen; A thief serving as a decoy for the dead Lord Takeda"},
    {"char_id": "FC_064", "name": "Mizu", "media_id": "MW_807", "role_type": "Protagonist", "creator": "Michael Green", "notes": "Biracial swordmaster in Edo-period Japan seeking revenge on Westerners"},
    {"char_id": "FC_065", "name": "Samanosuke Akechi", "media_id": "MW_808", "role_type": "Protagonist", "creator": "Keiji Inafune", "notes": "Fictional relative of Mitsuhide fighting Nobunaga's demon army"},
    {"char_id": "FC_066", "name": "Lord Isshin Ashina", "media_id": "MW_802", "role_type": "Supporting", "creator": "Hidetaka Miyazaki", "notes": "Fictionalized 'Saint of Sword' proxy for late-era Sengoku lords"},
    {"char_id": "FC_067", "name": "Inuyasha", "media_id": "MW_806", "role_type": "Protagonist", "creator": "Rumiko Takahashi", "notes": "Half-demon era collider bridging the modern era and feudal Japan"}
  ],
  "interactions": [
    {"subject_id": "HF_116", "object_id": "HF_117", "relationship_type": "INTERACTED_WITH", "sentiment": "Heroic", "notes": "The legendary five battles of Kawanakajima"},
    {"subject_id": "FC_061", "object_id": "HF_118", "relationship_type": "INTERACTED_WITH", "sentiment": "Heroic", "notes": "Hanzo guides William through the Yokai-infested Sengoku landscape"},
    {"subject_id": "FC_063", "object_id": "HF_116", "relationship_type": "INTERACTED_WITH", "sentiment": "Complex", "notes": "Fictional proxy - The Kagemusha impersonates Takeda Shingen"},
    {"subject_id": "HF_118", "object_id": "HF_JP_002", "relationship_type": "INTERACTED_WITH", "sentiment": "Heroic", "notes": "Historical service as Ieyasu's most trusted ninja general"},
    {"subject_id": "HF_119", "object_id": "HF_120", "relationship_type": "INTERACTED_WITH", "sentiment": "Villainous", "notes": "The Duel at Ganryu Island (1612)"},
    {"subject_id": "HF_121", "object_id": "HF_JP_002", "relationship_type": "INTERACTED_WITH", "sentiment": "Villainous", "notes": "Opposing commanders at the Battle of Sekigahara"},
    {"subject_id": "FC_060", "object_id": "FC_066", "relationship_type": "INTERACTED_WITH", "sentiment": "Complex", "notes": "Sekiro serves Lord Isshin Ashina"},
    {"subject_id": "HF_122", "object_id": "HF_121", "relationship_type": "INTERACTED_WITH", "sentiment": "Complex", "notes": "Allied against Ieyasu to protect her son Hideyori's inheritance"}
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
    print("Fictotum Batch 9 Deduplication")
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
    for fig in batch9_raw["historical_figures"]:
        if fig["wikidata_id"] in figure_ids:
            dup_figures.append(fig)
        else:
            new_figures.append(fig)

    new_media = []
    dup_media = []
    for media in batch9_raw["media_works"]:
        if media["wikidata_id"] in media_ids:
            dup_media.append(media)
        else:
            new_media.append(media)

    # All fictional characters are new (no deduplication needed)
    new_characters = batch9_raw["fictional_characters"]

    print(f"\nBatch 9 Analysis:")
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
            "project": "Fictotum Global MVP - Batch 9 (Deduplicated)",
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
        "interactions": batch9_raw["interactions"]
    }

    # Save deduplicated version
    output_path = Path(__file__).parent.parent / "data" / "global_mvp_batch9_deduplicated.json"
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
