"""
Deduplicate Batch 11 against existing Neo4j database.
"""
import os
import sys
import json
from pathlib import Path
from dotenv import load_dotenv
from neo4j import GraphDatabase

# Batch 11 raw data
batch11_raw = {
  "metadata": {
    "batch_id": 11,
    "focus_areas": ["The Peninsular War (Spain/Portugal)", "The Hundred Days", "Napoleonic Naval Supremacy", "Magical Napoleonic Realism"],
    "status": "Batch Finalized"
  },
  "media_works": [
    {"media_id": "MW_1001", "title": "Horatio Hornblower (Series)", "wikidata_id": "Q1628178", "release_year": 1937, "creator": "C.S. Forester", "creator_wikidata_id": "Q366113"},
    {"media_id": "MW_1002", "title": "Jonathan Strange & Mr Norrell", "wikidata_id": "Q1531086", "release_year": 2004, "creator": "Susanna Clarke", "creator_wikidata_id": "Q231771"},
    {"media_id": "MW_1003", "title": "Les Misérables", "wikidata_id": "Q180736", "release_year": 1862, "creator": "Victor Hugo", "creator_wikidata_id": "Q535"},
    {"media_id": "MW_1004", "title": "Napoleon (Film)", "wikidata_id": "Q105806948", "release_year": 2023, "creator": "Ridley Scott", "creator_wikidata_id": "Q47715"},
    {"media_id": "MW_1005", "title": "The Duelists", "wikidata_id": "Q1212051", "release_year": 1977, "creator": "Joseph Conrad / Ridley Scott", "creator_wikidata_id": "Q47715"},
    {"media_id": "MW_1006", "title": "Vanity Fair", "wikidata_id": "Q737821", "release_year": 1848, "creator": "William Makepeace Thackeray", "creator_wikidata_id": "Q167544"}
  ],
  "historical_figures": [
    {"canonical_id": "HF_134", "name": "Michel Ney", "wikidata_id": "Q40432", "birth_year": 1769, "death_year": 1815, "title": "Marshal of the Empire / Bravest of the Brave", "era": "Napoleonic Wars"},
    {"canonical_id": "HF_135", "name": "Jean-de-Dieu Soult", "wikidata_id": "Q212646", "birth_year": 1769, "death_year": 1851, "title": "Marshal of France / Duke of Dalmatia", "era": "Napoleonic Wars"},
    {"canonical_id": "HF_136", "name": "Sir John Moore", "wikidata_id": "Q450371", "birth_year": 1761, "death_year": 1809, "title": "General (Corunna)", "era": "Napoleonic Wars"},
    {"canonical_id": "HF_137", "name": "Gebhard Leberecht von Blücher", "wikidata_id": "Q153522", "birth_year": 1742, "death_year": 1819, "title": "Prussian Field Marshal", "era": "Napoleonic Wars"},
    {"canonical_id": "HF_138", "name": "Augustina de Aragón", "wikidata_id": "Q285641", "birth_year": 1786, "death_year": 1857, "title": "Maid of Saragossa / Guerrilla", "era": "Napoleonic Wars"},
    {"canonical_id": "HF_139", "name": "Marie-Henri Beyle (Stendhal)", "wikidata_id": "Q504", "birth_year": 1783, "death_year": 1842, "title": "Writer / Soldier", "era": "Napoleonic Wars"},
    {"canonical_id": "HF_140", "name": "Thomas Cochrane", "wikidata_id": "Q334994", "birth_year": 1775, "death_year": 1860, "title": "10th Earl of Dundonald / 'Sea Wolf'", "era": "Napoleonic Wars"},
    {"canonical_id": "HF_141", "name": "Marie-Louise of Austria", "wikidata_id": "Q157491", "birth_year": 1791, "death_year": 1847, "title": "Empress of the French", "era": "Napoleonic Wars"}
  ],
  "fictional_characters": [
    {"char_id": "FC_074", "name": "Patrick Harper", "media_id": "MW_07", "role_type": "Supporting", "creator": "Bernard Cornwell", "notes": "Sharpe's Irish NCO and best friend."},
    {"char_id": "FC_075", "name": "Horatio Hornblower", "media_id": "MW_1001", "role_type": "Protagonist", "creator": "C.S. Forester", "notes": "Era collider; Naval officer rising from midshipman to admiral."},
    {"char_id": "FC_076", "name": "Jonathan Strange", "media_id": "MW_1002", "role_type": "Protagonist", "creator": "Susanna Clarke", "notes": "Magical advisor to Wellington during the Peninsular War."},
    {"char_id": "FC_077", "name": "Marius Pontmercy", "media_id": "MW_1003", "role_type": "Protagonist", "creator": "Victor Hugo", "notes": "Grandson of a Napoleonic colonel; struggles with the Empire's legacy."},
    {"char_id": "FC_078", "name": "Becky Sharp", "media_id": "MW_1006", "role_type": "Protagonist", "creator": "William Makepeace Thackeray", "notes": "Social climber at the eve of Waterloo."},
    {"char_id": "FC_079", "name": "Lieutenant Gabriel Feraud", "media_id": "MW_1005", "role_type": "Antagonist", "creator": "Joseph Conrad", "notes": "French hussar obsessed with honor/dueling."},
    {"char_id": "FC_080", "name": "Obadiah Hakeswill", "media_id": "MW_07", "role_type": "Antagonist", "creator": "Bernard Cornwell", "notes": "The immortal villain of the Sharpe series."}
  ],
  "interactions": [
    {"subject_id": "FC_076", "object_id": "HF_027", "relationship_type": "INTERACTED_WITH", "sentiment": "Complex", "notes": "Strange uses magic to build roads and illusions for Wellington's campaign."},
    {"subject_id": "FC_075", "object_id": "HF_140", "relationship_type": "INTERACTED_WITH", "sentiment": "Heroic", "notes": "Historical Cochrane is the primary naval inspiration for Hornblower and Aubrey."},
    {"subject_id": "FC_08", "object_id": "HF_135", "relationship_type": "INTERACTED_WITH", "sentiment": "Villainous", "notes": "Soult is a recurring strategic adversary in the Peninsular books."},
    {"subject_id": "HF_134", "object_id": "HF_026", "relationship_type": "INTERACTED_WITH", "sentiment": "Complex", "notes": "Ney's fatal charge at Waterloo and subsequent execution."},
    {"subject_id": "HF_137", "object_id": "HF_027", "relationship_type": "INTERACTED_WITH", "sentiment": "Heroic", "notes": "The meeting at La Belle Alliance to seal the victory at Waterloo."},
    {"subject_id": "FC_078", "object_id": "HF_026", "relationship_type": "INTERACTED_WITH", "sentiment": "Complex", "notes": "The societal panic in Brussels before Waterloo."},
    {"subject_id": "FC_074", "object_id": "FC_08", "relationship_type": "INTERACTED_WITH", "sentiment": "Heroic", "notes": "Harper is Sharpe's loyal Irish sergeant and closest ally."}
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
    print("Fictotum Batch 11 Deduplication")
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
    for fig in batch11_raw["historical_figures"]:
        if fig["wikidata_id"] in figure_ids:
            dup_figures.append(fig)
        else:
            new_figures.append(fig)

    new_media = []
    dup_media = []
    for media in batch11_raw["media_works"]:
        if media["wikidata_id"] in media_ids:
            dup_media.append(media)
        else:
            new_media.append(media)

    # All fictional characters are new (no deduplication needed)
    new_characters = batch11_raw["fictional_characters"]

    print(f"\nBatch 11 Analysis:")
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
            "project": "Fictotum Global MVP - Batch 11 (Deduplicated)",
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
        "interactions": batch11_raw["interactions"]
    }

    # Save deduplicated version
    output_path = Path(__file__).parent.parent / "data" / "global_mvp_batch11_deduplicated.json"
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
