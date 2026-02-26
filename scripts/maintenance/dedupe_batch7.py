"""
Deduplicate Batch 7 against existing Neo4j database.
"""
import os
import sys
import json
from pathlib import Path
from dotenv import load_dotenv
from neo4j import GraphDatabase

# Batch 7 raw data
batch7_raw = {
  "metadata": {
    "batch_id": 7,
    "focus_areas": ["The Cold War", "Espionage (Smiley vs. Bond)", "The Space Race", "The Civil Rights Era"],
    "status": "Ready for Ingestion"
  },
  "media_works": [
    {"media_id": "MW_601", "title": "Tinker Tailor Soldier Spy", "wikidata_id": "Q1133333", "release_year": 1974, "creator": "John le Carré", "creator_wikidata_id": "Q209627"},
    {"media_id": "MW_602", "title": "The Right Stuff", "wikidata_id": "Q2015525", "release_year": 1979, "creator": "Tom Wolfe", "creator_wikidata_id": "Q312470"},
    {"media_id": "MW_603", "title": "Watchmen", "wikidata_id": "Q128338", "release_year": 1986, "creator": "Alan Moore", "creator_wikidata_id": "Q209228"},
    {"media_id": "MW_604", "title": "Dr. Strangelove", "wikidata_id": "Q105702", "release_year": 1964, "creator": "Stanley Kubrick", "creator_wikidata_id": "Q2001"},
    {"media_id": "MW_605", "title": "Mad Men", "wikidata_id": "Q223920", "release_year": 2007, "creator": "Matthew Weiner", "creator_wikidata_id": "Q934892"},
    {"media_id": "MW_606", "title": "Bridge of Spies", "wikidata_id": "Q18067135", "release_year": 2015, "creator": "Steven Spielberg", "creator_wikidata_id": "Q8877"},
    {"media_id": "MW_607", "title": "Hidden Figures", "wikidata_id": "Q23755544", "release_year": 2016, "creator": "Margot Lee Shetterly", "creator_wikidata_id": "Q26821215"}
  ],
  "historical_figures": [
    {"canonical_id": "HF_098", "name": "John F. Kennedy", "wikidata_id": "Q9696", "birth_year": 1917, "death_year": 1963, "title": "35th US President", "era": "Cold War"},
    {"canonical_id": "HF_099", "name": "Nikita Khrushchev", "wikidata_id": "Q35314", "birth_year": 1894, "death_year": 1971, "title": "First Secretary of the CPSU", "era": "Cold War"},
    {"canonical_id": "HF_100", "name": "Kim Philby", "wikidata_id": "Q209506", "birth_year": 1912, "death_year": 1988, "title": "Double Agent / Cambridge Five", "era": "Cold War"},
    {"canonical_id": "HF_101", "name": "Wernher von Braun", "wikidata_id": "Q57384", "birth_year": 1912, "death_year": 1977, "title": "Aerospace Engineer / NASA Director", "era": "Space Race"},
    {"canonical_id": "HF_102", "name": "Martin Luther King Jr.", "wikidata_id": "Q8027", "birth_year": 1929, "death_year": 1968, "title": "Civil Rights Leader", "era": "Civil Rights Movement"},
    {"canonical_id": "HF_103", "name": "J. Edgar Hoover", "wikidata_id": "Q210329", "birth_year": 1895, "death_year": 1972, "title": "Director of the FBI", "era": "Cold War"},
    {"canonical_id": "HF_104", "name": "Yuri Gagarin", "wikidata_id": "Q7358", "birth_year": 1934, "death_year": 1968, "title": "Cosmonaut / First Human in Space", "era": "Space Race"},
    {"canonical_id": "HF_105", "name": "Katherine Johnson", "wikidata_id": "Q11740", "birth_year": 1918, "death_year": 2020, "title": "Mathematician / NASA", "era": "Space Race"},
    {"canonical_id": "HF_106", "name": "Fidel Castro", "wikidata_id": "Q11256", "birth_year": 1926, "death_year": 2016, "title": "Leader of Cuba", "era": "Cold War"}
  ],
  "fictional_characters": [
    {"char_id": "FC_046", "name": "George Smiley", "media_id": "MW_601", "role_type": "Protagonist", "creator": "John le Carré", "notes": "Era collider; The intellectual antithesis to James Bond; professional hunter of double agents"},
    {"char_id": "FC_047", "name": "Bill Haydon", "media_id": "MW_601", "role_type": "Antagonist", "creator": "John le Carré", "notes": "Proxy for HF_100; The 'mole' in the Circus based on Kim Philby"},
    {"char_id": "FC_048", "name": "Edward Blake (The Comedian)", "media_id": "MW_603", "role_type": "Supporting", "creator": "Alan Moore", "notes": "Era collider; Fictional figure who assassinated JFK in the Watchmen timeline"},
    {"char_id": "FC_049", "name": "Don Draper", "media_id": "MW_605", "role_type": "Protagonist", "creator": "Matthew Weiner", "notes": "Corporate proxy for the 1960s societal shift"},
    {"char_id": "FC_050", "name": "Dr. Strangelove", "media_id": "MW_604", "role_type": "Protagonist", "creator": "Stanley Kubrick", "notes": "Proxy for HF_101; Satirical composite of Von Braun, Edward Teller, and Herman Kahn"},
    {"char_id": "FC_051", "name": "James Donovan (Fictionalized)", "media_id": "MW_606", "role_type": "Protagonist", "creator": "Steven Spielberg", "notes": "Proxy for Historical James B. Donovan"},
    {"char_id": "FC_052", "name": "Adrian Veidt (Ozymandias)", "media_id": "MW_603", "role_type": "Antagonist", "creator": "Alan Moore", "notes": "Era collider"}
  ],
  "interactions": [
    {"subject_id": "FC_046", "object_id": "FC_047", "relationship_type": "INTERACTED_WITH", "sentiment": "Complex", "notes": "The hunt for the Russian mole at the top of British Intelligence"},
    {"subject_id": "FC_047", "object_id": "HF_100", "relationship_type": "INTERACTED_WITH", "sentiment": "Villainous", "notes": "Based on Kim Philby"},
    {"subject_id": "FC_048", "object_id": "HF_098", "relationship_type": "INTERACTED_WITH", "sentiment": "Villainous", "notes": "Watchmen alternate history assassination"},
    {"subject_id": "HF_101", "object_id": "FC_050", "relationship_type": "INTERACTED_WITH", "sentiment": "Villainous", "notes": "Von Braun inspiration for Dr. Strangelove"},
    {"subject_id": "HF_103", "object_id": "HF_102", "relationship_type": "INTERACTED_WITH", "sentiment": "Villainous", "notes": "Historical FBI surveillance and harassment of MLK"},
    {"subject_id": "HF_105", "object_id": "HF_104", "relationship_type": "INTERACTED_WITH", "sentiment": "Complex", "notes": "The trajectory calculations required to catch up with the Soviet lead"},
    {"subject_id": "HF_098", "object_id": "HF_099", "relationship_type": "INTERACTED_WITH", "sentiment": "Villainous", "notes": "Cuban Missile Crisis interaction"},
    {"subject_id": "FC_049", "object_id": "HF_098", "relationship_type": "INTERACTED_WITH", "sentiment": "Complex", "notes": "Narrative reaction to the JFK assassination as a cultural pivot"}
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
    print("Fictotum Batch 7 Deduplication")
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
    for fig in batch7_raw["historical_figures"]:
        if fig["wikidata_id"] in figure_ids:
            dup_figures.append(fig)
        else:
            new_figures.append(fig)

    new_media = []
    dup_media = []
    for media in batch7_raw["media_works"]:
        if media["wikidata_id"] in media_ids:
            dup_media.append(media)
        else:
            new_media.append(media)

    # All fictional characters are new (no deduplication needed)
    new_characters = batch7_raw["fictional_characters"]

    print(f"\nBatch 7 Analysis:")
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
            "project": "Fictotum Global MVP - Batch 7 (Deduplicated)",
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
        "interactions": batch7_raw["interactions"]
    }

    # Save deduplicated version
    output_path = Path(__file__).parent.parent / "data" / "global_mvp_batch7_deduplicated.json"
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
