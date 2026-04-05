"""
Deduplicate Batch 4 against existing Neo4j database.
"""
import os
import sys
import json
from pathlib import Path
from dotenv import load_dotenv
from neo4j import GraphDatabase

# Batch 4 raw data
batch4_raw = {
  "metadata": {
    "batch_id": 4,
    "focus_areas": ["The Terror", "The Crusades (Levant)", "Saxon/Danish Collision"],
    "status": "Ready for Ingestion"
  },
  "media_works": [
    {"media_id": "MW_301", "title": "A Tale of Two Cities", "wikidata_id": "Q208931", "release_year": 1859, "creator": "Charles Dickens", "creator_wikidata_id": "Q1589"},
    {"media_id": "MW_302", "title": "The Scarlet Pimpernel", "wikidata_id": "Q1196726", "release_year": 1905, "creator": "Baroness Orczy", "creator_wikidata_id": "Q234568"},
    {"media_id": "MW_303", "title": "Kingdom of Heaven", "wikidata_id": "Q207675", "release_year": 2005, "creator": "Ridley Scott", "creator_wikidata_id": "Q47715"},
    {"media_id": "MW_304", "title": "The Last Kingdom", "wikidata_id": "Q18085820", "release_year": 2015, "creator": "Bernard Cornwell", "creator_wikidata_id": "Q352516"},
    {"media_id": "MW_305", "title": "Assassin's Creed", "wikidata_id": "Q1056580", "release_year": 2007, "creator": "Patrice Désilets", "creator_wikidata_id": "Q3368916"},
    {"media_id": "MW_306", "title": "Assassin's Creed II", "wikidata_id": "Q214152", "release_year": 2009, "creator": "Ubisoft", "creator_wikidata_id": "Q190163"},
    {"media_id": "MW_307", "title": "The Pillars of the Earth", "wikidata_id": "Q1133333", "release_year": 1989, "creator": "Ken Follett", "creator_wikidata_id": "Q210669"},
    {"media_id": "MW_308", "title": "The Name of the Rose", "wikidata_id": "Q171558", "release_year": 1980, "creator": "Umberto Eco", "creator_wikidata_id": "Q12807"}
  ],
  "historical_figures": [
    {"canonical_id": "HF_066", "name": "Georges Danton", "wikidata_id": "Q184623", "birth_year": 1759, "death_year": 1794, "title": "Jacobin Leader", "era": "French Revolution"},
    {"canonical_id": "HF_067", "name": "Jean-Paul Marat", "wikidata_id": "Q122234", "birth_year": 1743, "death_year": 1793, "title": "Journalist / Radical", "era": "French Revolution"},
    {"canonical_id": "HF_068", "name": "Charlotte Corday", "wikidata_id": "Q161866", "birth_year": 1768, "death_year": 1793, "title": "Assassin of Marat", "era": "French Revolution"},
    {"canonical_id": "HF_069", "name": "Louis XVI", "wikidata_id": "Q7732", "birth_year": 1754, "death_year": 1793, "title": "King of France", "era": "French Revolution"},
    {"canonical_id": "HF_070", "name": "Saladin", "wikidata_id": "Q8581", "birth_year": 1137, "death_year": 1193, "title": "Sultan of Egypt and Syria", "era": "High Middle Ages"},
    {"canonical_id": "HF_071", "name": "Richard the Lionheart", "wikidata_id": "Q42305", "birth_year": 1157, "death_year": 1199, "title": "King of England", "era": "High Middle Ages"},
    {"canonical_id": "HF_072", "name": "Baldwin IV", "wikidata_id": "Q296452", "birth_year": 1161, "death_year": 1185, "title": "Leper King of Jerusalem", "era": "High Middle Ages"},
    {"canonical_id": "HF_073", "name": "Balian of Ibelin", "wikidata_id": "Q334802", "birth_year": 1143, "death_year": 1193, "title": "Crusader Noble", "era": "High Middle Ages"},
    {"canonical_id": "HF_074", "name": "Alfred the Great", "wikidata_id": "Q10344", "birth_year": 849, "death_year": 899, "title": "King of Wessex", "era": "Saxon Era"},
    {"canonical_id": "HF_075", "name": "Guthrum", "wikidata_id": "Q312411", "birth_year": 835, "death_year": 890, "title": "Danish King", "era": "Saxon Era"},
    {"canonical_id": "HF_076", "name": "Lorenzo de' Medici", "wikidata_id": "Q177854", "birth_year": 1449, "death_year": 1492, "title": "Lord of Florence", "era": "Renaissance Italy"},
    {"canonical_id": "HF_077", "name": "Leonardo da Vinci", "wikidata_id": "Q762", "birth_year": 1452, "death_year": 1519, "title": "Polymath", "era": "Renaissance Italy"}
  ],
  "fictional_characters": [
    {"char_id": "FC_023", "name": "Sydney Carton", "media_id": "MW_301", "creator": "Charles Dickens", "role_type": "Protagonist", "notes": ""},
    {"char_id": "FC_024", "name": "Sir Percy Blakeney", "media_id": "MW_302", "creator": "Baroness Orczy", "role_type": "Protagonist", "notes": ""},
    {"char_id": "FC_025", "name": "Balian (Scott Version)", "media_id": "MW_303", "creator": "Ridley Scott", "role_type": "Protagonist", "notes": "Fictionalized proxy for HF_073"},
    {"char_id": "FC_026", "name": "Uhtred of Bebbanburg", "media_id": "MW_304", "creator": "Bernard Cornwell", "role_type": "Protagonist", "notes": "Based on Uhtred the Bold (later historical figure)"},
    {"char_id": "FC_027", "name": "Altaïr Ibn-La'Ahad", "media_id": "MW_305", "creator": "Patrice Désilets", "role_type": "Protagonist", "notes": ""},
    {"char_id": "FC_028", "name": "Ezio Auditore da Firenze", "media_id": "MW_306", "creator": "Ubisoft", "role_type": "Protagonist", "notes": ""},
    {"char_id": "FC_029", "name": "William of Baskerville", "media_id": "MW_308", "creator": "Umberto Eco", "role_type": "Protagonist", "notes": ""},
    {"char_id": "FC_030", "name": "Jack Jackson", "media_id": "MW_307", "creator": "Ken Follett", "role_type": "Protagonist", "notes": ""}
  ],
  "interactions": [
    {"subject_id": "FC_024", "object_id": "HF_066", "relationship_type": "INTERACTED_WITH", "sentiment": "Villainous", "notes": "Blakeney rescues aristocrats from Danton's jurisdiction"},
    {"subject_id": "HF_068", "object_id": "HF_067", "relationship_type": "INTERACTED_WITH", "sentiment": "Villainous", "notes": "Charlotte Corday assassinated Marat"},
    {"subject_id": "FC_027", "object_id": "HF_071", "relationship_type": "INTERACTED_WITH", "sentiment": "Complex", "notes": "Battle of Arsuf interaction"},
    {"subject_id": "FC_026", "object_id": "HF_074", "relationship_type": "INTERACTED_WITH", "sentiment": "Complex", "notes": "Secular warrior serving a pious king"},
    {"subject_id": "FC_028", "object_id": "HF_077", "relationship_type": "INTERACTED_WITH", "sentiment": "Heroic", "notes": "Leonardo builds Ezio's hidden blades and gadgets"},
    {"subject_id": "FC_025", "object_id": "HF_070", "relationship_type": "INTERACTED_WITH", "sentiment": "Heroic", "notes": "Surrender of Jerusalem (1187)"},
    {"subject_id": "FC_023", "object_id": "HF_069", "relationship_type": "INTERACTED_WITH", "sentiment": "Complex", "notes": "Carton dies on the guillotine during the Reign of Terror"}
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
    print("Fictotum Batch 4 Deduplication")
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
    for fig in batch4_raw["historical_figures"]:
        if fig["wikidata_id"] in figure_ids:
            dup_figures.append(fig)
        else:
            new_figures.append(fig)

    new_media = []
    dup_media = []
    for media in batch4_raw["media_works"]:
        if media["wikidata_id"] in media_ids:
            dup_media.append(media)
        else:
            new_media.append(media)

    # All fictional characters are new (no deduplication needed)
    new_characters = batch4_raw["fictional_characters"]

    print(f"\nBatch 4 Analysis:")
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
            "project": "Fictotum Global MVP - Batch 4 (Deduplicated)",
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
        "interactions": batch4_raw["interactions"]
    }

    # Save deduplicated version
    output_path = Path(__file__).parent.parent / "data" / "global_mvp_batch4_deduplicated.json"
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
