"""
Deduplicate Batch 3 against existing Neo4j database.
"""
import os
import sys
import json
from pathlib import Path
from dotenv import load_dotenv
from neo4j import GraphDatabase

# Batch 3 raw data
batch3_raw = {
  "metadata": {
    "batch_id": 3,
    "focus_areas": ["Late Republic Power Blocks", "Naval Supremacy", "Gilded Age Innovation"],
    "status": "Ready for Ingestion"
  },
  "media_works": [
    {"media_id": "MW_201", "title": "I, Claudius", "wikidata_id": "Q1234450", "release_year": 1934, "creator": "Robert Graves"},
    {"media_id": "MW_202", "title": "The First Man in Rome", "wikidata_id": "Q1984284", "release_year": 1990, "creator": "Colleen McCullough"},
    {"media_id": "MW_203", "title": "Red Cliff", "wikidata_id": "Q815603", "release_year": 2008, "creator": "John Woo"},
    {"media_id": "MW_204", "title": "The Tudors", "wikidata_id": "Q326731", "release_year": 2007, "creator": "Michael Hirst"},
    {"media_id": "MW_205", "title": "Treasure Island", "wikidata_id": "Q185118", "release_year": 1883, "creator": "Robert Louis Stevenson"},
    {"media_id": "MW_206", "title": "War and Peace", "wikidata_id": "Q14773", "release_year": 1869, "creator": "Leo Tolstoy"},
    {"media_id": "MW_207", "title": "Gone with the Wind", "wikidata_id": "Q208359", "release_year": 1936, "creator": "Margaret Mitchell"},
    {"media_id": "MW_208", "title": "The Age of Innocence", "wikidata_id": "Q844621", "release_year": 1920, "creator": "Edith Wharton"},
    {"media_id": "MW_209", "title": "The Untouchables", "wikidata_id": "Q108525", "release_year": 1987, "creator": "Brian De Palma"},
    {"media_id": "MW_210", "title": "Hamilton", "wikidata_id": "Q19865145", "release_year": 2015, "creator": "Lin-Manuel Miranda"},
    {"media_id": "MW_211", "title": "Master and Commander", "wikidata_id": "Q768000", "release_year": 1969, "creator": "Patrick O'Brian"},
    {"media_id": "MW_212", "title": "Basara", "wikidata_id": "Q2333790", "release_year": 2005, "creator": "Capcom"}
  ],
  "historical_figures": [
    {"canonical_id": "HF_046", "name": "Pompey the Great", "wikidata_id": "Q12541", "birth_year": -106, "death_year": -48, "era": "Late Roman Republic", "title": "Triumvir"},
    {"canonical_id": "HF_047", "name": "Marcus Licinius Crassus", "wikidata_id": "Q175127", "birth_year": -115, "death_year": -53, "era": "Late Roman Republic", "title": "Triumvir"},
    {"canonical_id": "HF_048", "name": "Cicero", "wikidata_id": "Q1541", "birth_year": -106, "death_year": -43, "era": "Late Roman Republic", "title": "Orator / Senator"},
    {"canonical_id": "HF_049", "name": "Cato the Younger", "wikidata_id": "Q212624", "birth_year": -95, "death_year": -46, "era": "Late Roman Republic", "title": "Senator"},
    {"canonical_id": "HF_050", "name": "Sun Quan", "wikidata_id": "Q507111", "birth_year": 182, "death_year": 252, "era": "Three Kingdoms China", "title": "Emperor of Wu"},
    {"canonical_id": "HF_051", "name": "Zhou Yu", "wikidata_id": "Q31720", "birth_year": 175, "death_year": 210, "era": "Three Kingdoms China", "title": "Commander of Wu"},
    {"canonical_id": "HF_052", "name": "Sima Yi", "wikidata_id": "Q311357", "birth_year": 179, "death_year": 251, "era": "Three Kingdoms China", "title": "Chancellor of Wei"},
    {"canonical_id": "HF_053", "name": "Date Masamune", "wikidata_id": "Q311634", "birth_year": 1567, "death_year": 1636, "era": "Sengoku Japan", "title": "Daimyo"},
    {"canonical_id": "HF_054", "name": "Sanada Yukimura", "wikidata_id": "Q314051", "birth_year": 1567, "death_year": 1615, "era": "Sengoku Japan", "title": "Samurai"},
    {"canonical_id": "HF_055", "name": "Mary I of England", "wikidata_id": "Q82674", "birth_year": 1516, "death_year": 1558, "era": "Tudor England", "title": "Queen of England"},
    {"canonical_id": "HF_056", "name": "Stede Bonnet", "wikidata_id": "Q378776", "birth_year": 1688, "death_year": 1718, "era": "Golden Age of Piracy", "title": "Pirate Captain"},
    {"canonical_id": "HF_057", "name": "Mary Read", "wikidata_id": "Q229231", "birth_year": 1685, "death_year": 1721, "era": "Golden Age of Piracy", "title": "Pirate"},
    {"canonical_id": "HF_058", "name": "Charles-Maurice de Talleyrand", "wikidata_id": "Q161109", "birth_year": 1754, "death_year": 1838, "era": "Napoleonic Wars", "title": "Diplomat"},
    {"canonical_id": "HF_059", "name": "Joachim Murat", "wikidata_id": "Q142999", "birth_year": 1767, "death_year": 1815, "era": "Napoleonic Wars", "title": "Marshal / King of Naples"},
    {"canonical_id": "HF_060", "name": "Frederick Douglass", "wikidata_id": "Q171355", "birth_year": 1818, "death_year": 1895, "era": "US Civil War", "title": "Abolitionist"},
    {"canonical_id": "HF_061", "name": "Harriet Tubman", "wikidata_id": "Q102870", "birth_year": 1822, "death_year": 1913, "era": "US Civil War", "title": "Abolitionist / Conductor"},
    {"canonical_id": "HF_062", "name": "Thomas Edison", "wikidata_id": "Q3872", "birth_year": 1847, "death_year": 1931, "era": "The Gilded Age", "title": "Inventor"},
    {"canonical_id": "HF_063", "name": "Nikola Tesla", "wikidata_id": "Q11747", "birth_year": 1856, "death_year": 1943, "era": "The Gilded Age", "title": "Inventor / Engineer"},
    {"canonical_id": "HF_064", "name": "Alexander Hamilton", "wikidata_id": "Q178903", "birth_year": 1755, "death_year": 1804, "era": "American Revolutionary War", "title": "Founding Father"},
    {"canonical_id": "HF_065", "name": "Frank Costello", "wikidata_id": "Q503920", "birth_year": 1891, "death_year": 1973, "era": "Prohibition Era", "title": "Mob Boss"}
  ],
  "fictional_characters": [
    {"char_id": "FC_14", "name": "Long John Silver", "media_id": "MW_205", "role_type": "Antagonist", "creator": "Robert Louis Stevenson", "notes": "Era collider"},
    {"char_id": "FC_15", "name": "Pierre Bezukhov", "media_id": "MW_206", "role_type": "Protagonist", "creator": "Leo Tolstoy", "notes": "Era collider"},
    {"char_id": "FC_16", "name": "Rhett Butler", "media_id": "MW_207", "role_type": "Protagonist", "creator": "Margaret Mitchell", "notes": "Era collider"},
    {"char_id": "FC_17", "name": "Newland Archer", "media_id": "MW_208", "role_type": "Protagonist", "creator": "Edith Wharton", "notes": ""},
    {"char_id": "FC_18", "name": "Eliot Ness (Fictionalized)", "media_id": "MW_209", "role_type": "Protagonist", "creator": "Brian De Palma", "notes": "Proxy for Historical Eliot Ness"},
    {"char_id": "FC_19", "name": "Jack Aubrey", "media_id": "MW_211", "role_type": "Protagonist", "creator": "Patrick O'Brian", "notes": "Era collider; Naval proxy for Thomas Cochrane"},
    {"char_id": "FC_20", "name": "Stephen Maturin", "media_id": "MW_211", "role_type": "Supporting", "creator": "Patrick O'Brian", "notes": "Era collider"},
    {"char_id": "FC_21", "name": "Claudius (Graves Version)", "media_id": "MW_201", "role_type": "Protagonist", "creator": "Robert Graves", "notes": "Proxy for Emperor Claudius"},
    {"char_id": "FC_22", "name": "Sanada Yukimura (Basara)", "media_id": "MW_212", "role_type": "Protagonist", "creator": "Capcom", "notes": "Proxy for HF_054"}
  ],
  "interactions": [
    {"subject_id": "HF_046", "object_id": "HF_RM_001", "relationship_type": "INTERACTED_WITH", "sentiment": "Villainous", "notes": "Rival of Caesar"},
    {"subject_id": "HF_047", "object_id": "HF_RM_001", "relationship_type": "INTERACTED_WITH", "sentiment": "Complex", "notes": "First Triumvirate business partner"},
    {"subject_id": "FC_19", "object_id": "HF_NP_003", "relationship_type": "INTERACTED_WITH", "sentiment": "Heroic", "notes": "Aubrey admirer of Nelson"},
    {"subject_id": "HF_063", "object_id": "HF_062", "relationship_type": "INTERACTED_WITH", "sentiment": "Villainous", "notes": "War of the Currents rivalry"},
    {"subject_id": "FC_15", "object_id": "HF_FR_001", "relationship_type": "INTERACTED_WITH", "sentiment": "Complex", "notes": "Attempted assassination of Napoleon"},
    {"subject_id": "FC_18", "object_id": "HF_PE_001", "relationship_type": "INTERACTED_WITH", "sentiment": "Villainous", "notes": "Nemesis relationship"},
    {"subject_id": "FC_14", "object_id": "HF_PR_001", "relationship_type": "INTERACTED_WITH", "sentiment": "Complex", "notes": "Silver claims to have been quartermaster for Blackbeard"}
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
    print("Fictotum Batch 3 Deduplication")
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
    for fig in batch3_raw["historical_figures"]:
        if fig["wikidata_id"] in figure_ids:
            dup_figures.append(fig)
        else:
            new_figures.append(fig)

    new_media = []
    dup_media = []
    for media in batch3_raw["media_works"]:
        if media["wikidata_id"] in media_ids:
            dup_media.append(media)
        else:
            new_media.append(media)

    # All fictional characters are new (no deduplication needed)
    new_characters = batch3_raw["fictional_characters"]

    print(f"\nBatch 3 Analysis:")
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
            "project": "Fictotum Global MVP - Batch 3 (Deduplicated)",
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
        "interactions": batch3_raw["interactions"]
    }

    # Save deduplicated version
    output_path = Path(__file__).parent.parent / "data" / "global_mvp_batch3_deduplicated.json"
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
