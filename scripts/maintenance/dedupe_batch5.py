"""
Deduplicate Batch 5 against existing Neo4j database.
"""
import os
import sys
import json
from pathlib import Path
from dotenv import load_dotenv
from neo4j import GraphDatabase

# Batch 5 raw data
batch5_raw = {
  "metadata": {
    "batch_id": 5,
    "focus_areas": ["American Revolution", "Victorian London", "The Shadow History"],
    "status": "Ready for Ingestion"
  },
  "media_works": [
    {"media_id": "MW_401", "title": "Hamilton", "wikidata_id": "Q19865145", "release_year": 2015, "creator": "Lin-Manuel Miranda", "creator_wikidata_id": "Q1346426"},
    {"media_id": "MW_402", "title": "The Adventures of Sherlock Holmes", "wikidata_id": "Q331300", "release_year": 1892, "creator": "Arthur Conan Doyle", "creator_wikidata_id": "Q35610"},
    {"media_id": "MW_403", "title": "Assassin's Creed III", "wikidata_id": "Q171401", "release_year": 2012, "creator": "Ubisoft", "creator_wikidata_id": "Q190163"},
    {"media_id": "MW_404", "title": "Turn: Washington's Spies", "wikidata_id": "Q15072803", "release_year": 2014, "creator": "Craig Silverstein", "creator_wikidata_id": None},
    {"media_id": "MW_405", "title": "Penny Dreadful", "wikidata_id": "Q13512243", "release_year": 2014, "creator": "John Logan", "creator_wikidata_id": "Q546545"},
    {"media_id": "MW_406", "title": "The Alienist", "wikidata_id": "Q27988182", "release_year": 2018, "creator": "Caleb Carr", "creator_wikidata_id": "Q709961"},
    {"media_id": "MW_407", "title": "Abraham Lincoln: Vampire Hunter", "wikidata_id": "Q32520", "release_year": 2012, "creator": "Seth Grahame-Smith", "creator_wikidata_id": "Q372863"}
  ],
  "historical_figures": [
    {"canonical_id": "HF_078", "name": "George Washington", "wikidata_id": "Q23", "birth_year": 1732, "death_year": 1799, "title": "1st US President", "era": "American Revolutionary War"},
    {"canonical_id": "HF_079", "name": "Alexander Hamilton", "wikidata_id": "Q178903", "birth_year": 1755, "death_year": 1804, "title": "1st US Secretary of the Treasury", "era": "American Revolutionary War"},
    {"canonical_id": "HF_080", "name": "Benjamin Franklin", "wikidata_id": "Q34969", "birth_year": 1706, "death_year": 1790, "title": "Founding Father / Polymath", "era": "American Revolutionary War"},
    {"canonical_id": "HF_081", "name": "Lafayette", "wikidata_id": "Q186652", "birth_year": 1757, "death_year": 1834, "title": "Marquis de Lafayette", "era": "American Revolutionary War"},
    {"canonical_id": "HF_082", "name": "Queen Victoria", "wikidata_id": "Q448", "birth_year": 1819, "death_year": 1901, "title": "Queen of the United Kingdom", "era": "Victorian Era"},
    {"canonical_id": "HF_083", "name": "Prince Albert", "wikidata_id": "Q152212", "birth_year": 1819, "death_year": 1861, "title": "Prince Consort", "era": "Victorian Era"},
    {"canonical_id": "HF_084", "name": "Charles Darwin", "wikidata_id": "Q1035", "birth_year": 1809, "death_year": 1882, "title": "Naturalist", "era": "Victorian Era"},
    {"canonical_id": "HF_085", "name": "Theodore Roosevelt", "wikidata_id": "Q33866", "birth_year": 1858, "death_year": 1919, "title": "26th US President", "era": "The Gilded Age"},
    {"canonical_id": "HF_086", "name": "Jack the Ripper", "wikidata_id": "Q35241", "birth_year": None, "death_year": None, "title": "Unidentified Serial Killer", "era": "Victorian Era"},
    {"canonical_id": "HF_087", "name": "Aaron Burr", "wikidata_id": "Q179090", "birth_year": 1756, "death_year": 1836, "title": "3rd US Vice President", "era": "American Revolutionary War"}
  ],
  "fictional_characters": [
    {"char_id": "FC_031", "name": "Connor Kenway", "media_id": "MW_403", "role_type": "Protagonist", "creator": "Ubisoft", "notes": "Era collider"},
    {"char_id": "FC_032", "name": "Sherlock Holmes", "media_id": "MW_402", "role_type": "Protagonist", "creator": "Arthur Conan Doyle", "notes": "Era collider"},
    {"char_id": "FC_033", "name": "Dr. John Watson", "media_id": "MW_402", "role_type": "Supporting", "creator": "Arthur Conan Doyle", "notes": "Era collider"},
    {"char_id": "FC_034", "name": "Abraham Van Helsing", "media_id": "MW_405", "role_type": "Supporting", "creator": "John Logan", "notes": "Era collider"},
    {"char_id": "FC_035", "name": "Abe Woodhull (Fictionalized)", "media_id": "MW_404", "role_type": "Protagonist", "creator": "Craig Silverstein", "notes": "Proxy for Historical Abraham Woodhull"},
    {"char_id": "FC_036", "name": "Alexander Hamilton (Musical Version)", "media_id": "MW_401", "role_type": "Protagonist", "creator": "Lin-Manuel Miranda", "notes": "Proxy for HF_079"},
    {"char_id": "FC_037", "name": "Laszlo Kreizler", "media_id": "MW_406", "role_type": "Protagonist", "creator": "Caleb Carr", "notes": "Psychologist in 1890s NY; interacts with Teddy Roosevelt"},
    {"char_id": "FC_038", "name": "Abraham Lincoln (Vampire Hunter)", "media_id": "MW_407", "role_type": "Protagonist", "creator": "Seth Grahame-Smith", "notes": "Proxy for Historical Abraham Lincoln"}
  ],
  "interactions": [
    {"subject_id": "FC_036", "object_id": "HF_078", "relationship_type": "INTERACTED_WITH", "sentiment": "Heroic", "notes": "Aide-de-camp relationship"},
    {"subject_id": "FC_031", "object_id": "HF_078", "relationship_type": "INTERACTED_WITH", "sentiment": "Complex", "notes": "Interacts via the Continental Army; also in the 'Tyranny of King Washington' DLC"},
    {"subject_id": "FC_032", "object_id": "HF_082", "relationship_type": "INTERACTED_WITH", "sentiment": "Heroic", "notes": "The Bruce-Partington Plans; Victoria rewards Holmes with an emerald tie-pin"},
    {"subject_id": "FC_037", "object_id": "HF_085", "relationship_type": "INTERACTED_WITH", "sentiment": "Complex", "notes": "Roosevelt is Police Commissioner of NYC in this timeframe"},
    {"subject_id": "FC_032", "object_id": "HF_086", "relationship_type": "INTERACTED_WITH", "sentiment": "Villainous", "notes": "Common fictional trope (e.g., A Study in Terror)"},
    {"subject_id": "FC_036", "object_id": "HF_087", "relationship_type": "INTERACTED_WITH", "sentiment": "Villainous", "notes": "Mapping the duel of 1804"},
    {"subject_id": "FC_031", "object_id": "HF_081", "relationship_type": "INTERACTED_WITH", "sentiment": "Heroic", "notes": "Close ally"}
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
    print("Fictotum Batch 5 Deduplication")
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
    for fig in batch5_raw["historical_figures"]:
        if fig["wikidata_id"] in figure_ids:
            dup_figures.append(fig)
        else:
            new_figures.append(fig)

    new_media = []
    dup_media = []
    for media in batch5_raw["media_works"]:
        if media["wikidata_id"] in media_ids:
            dup_media.append(media)
        else:
            new_media.append(media)

    # All fictional characters are new (no deduplication needed)
    new_characters = batch5_raw["fictional_characters"]

    print(f"\nBatch 5 Analysis:")
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
            "project": "Fictotum Global MVP - Batch 5 (Deduplicated)",
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
        "interactions": batch5_raw["interactions"]
    }

    # Save deduplicated version
    output_path = Path(__file__).parent.parent / "data" / "global_mvp_batch5_deduplicated.json"
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
